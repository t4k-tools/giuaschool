<?php

namespace App\Service;

use App\Entity\DefinizioneRichiesta;
use App\Entity\Genitore;
use App\Entity\Richiesta;
use App\Entity\Utente;
use App\Util\RichiesteUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\RequestStack;

class RichiesteFamigliaService
{
    public function __construct(
        private EntityManagerInterface $em,
        private RichiesteUtil $richiesteUtil,
        private RequestStack $requestStack,
        private string $dirTemp,
    ) {}

    public function list(Utente $utente): array
    {
        $dati = $this->em->getRepository(DefinizioneRichiesta::class)->lista($utente);

        $modules = [];
        foreach (['uniche', 'multiple'] as $bucket) {
            foreach ($dati[$bucket] ?? [] as $id => $module) {
                $currentRequests = array_map(
                    fn (array $request) => $this->serializeRequestRow((int) $id, $request, true),
                    $dati['richieste'][$id]['nuove'] ?? [],
                );
                $historyRequests = array_map(
                    fn (array $request) => $this->serializeRequestRow((int) $id, $request, false),
                    $dati['richieste'][$id]['vecchie'] ?? [],
                );
                $modules[] = [
                    'id' => (int) $id,
                    'name' => (string) $module['nome'],
                    'kind' => $bucket === 'uniche' ? 'single' : 'multiple',
                    'gestione' => (bool) $module['gestione'],
                    'create' => $this->serializeModuleDefinition(
                        (int) $id,
                        !($bucket === 'uniche' && count($currentRequests) > 0),
                    ),
                    'requests' => [
                        'current' => $currentRequests,
                        'history' => $historyRequests,
                    ],
                ];
            }
        }

        usort($modules, static fn (array $a, array $b) => strcmp($a['name'], $b['name']));

        return [
            'modules' => $modules,
            'summary' => [
                'modules' => count($modules),
                'currentRequests' => array_sum(array_map(
                    static fn (array $module) => count($module['requests']['current']),
                    $modules,
                )),
                'historyRequests' => array_sum(array_map(
                    static fn (array $module) => count($module['requests']['history']),
                    $modules,
                )),
            ],
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<int, UploadedFile> $attachments
     */
    public function create(Utente $utente, int $moduleId, array $payload, array $attachments = []): array
    {
        $module = $this->resolveAccessibleModule($utente, $moduleId);
        $actualUser = $this->resolveActualUser($utente);
        if ($module->getUnica()) {
            $existing = $this->em->getRepository(Richiesta::class)->findOneBy([
                'definizioneRichiesta' => $module,
                'utente' => $actualUser,
                'stato' => ['I', 'G'],
            ]);
            if ($existing) {
                throw new \RuntimeException('Esiste già una richiesta attiva per questo modulo.');
            }
        }

        $requestDate = null;
        if (!$module->getUnica()) {
            $requestDate = $this->parseRequestDate($payload['requestDate'] ?? null);
            if (!$requestDate) {
                throw new \RuntimeException('La data della richiesta è obbligatoria.');
            }
            $duplicate = $this->em->getRepository(Richiesta::class)->findOneBy([
                'definizioneRichiesta' => $module,
                'utente' => $actualUser,
                'stato' => ['I', 'G'],
                'data' => $requestDate,
            ]);
            if ($duplicate) {
                throw new \RuntimeException('Esiste già una richiesta attiva per la data indicata.');
            }
        }

        $values = $this->normalizeSubmittedValues($module, $payload['values'] ?? []);
        if (count($attachments) < $module->getAllegati()) {
            throw new \RuntimeException('Mancano gli allegati richiesti dal modulo.');
        }

        $submittedAt = new DateTime();
        if (!$module->getUnica() && $module->getGestione()) {
            $this->validateSubmissionDeadline($submittedAt, $requestDate);
        }

        $stagedAttachments = $this->stageAttachments($attachments);
        try {
            [$documentName, $documentId] = $this->richiesteUtil->creaPdf(
                $module,
                $actualUser,
                $actualUser->getClasse(),
                $values,
                $requestDate,
                $submittedAt,
            );
            $storedAttachments = $this->richiesteUtil->impostaAllegati(
                $actualUser,
                $actualUser->getClasse(),
                $documentId,
                $stagedAttachments,
            );
        } catch (\Throwable $e) {
            $this->cleanupStagedAttachments($stagedAttachments);
            throw $e;
        }

        $request = (new Richiesta())
            ->setDefinizioneRichiesta($module)
            ->setUtente($actualUser)
            ->setClasse($actualUser->getClasse())
            ->setValori($values)
            ->setDocumento($documentName)
            ->setAllegati($storedAttachments)
            ->setInviata($submittedAt)
            ->setGestita(null)
            ->setData($requestDate)
            ->setStato('I')
            ->setMessaggio('');
        $this->em->persist($request);
        $this->em->flush();

        return [
            'message' => 'Richiesta inviata.',
            'data' => [
                'id' => $request->getId(),
                'status' => $this->statusPayload($request->getStato()),
            ],
        ];
    }

    public function detail(Utente $utente, int $id): array
    {
        $request = $this->resolveAccessibleRequest($utente, $id);

        return [
            'id' => $request->getId(),
            'module' => [
                'id' => $request->getDefinizioneRichiesta()?->getId(),
                'name' => (string) $request->getDefinizioneRichiesta()?->getNome(),
                'kind' => $request->getDefinizioneRichiesta()?->getUnica() ? 'single' : 'multiple',
                'gestione' => (bool) $request->getDefinizioneRichiesta()?->getGestione(),
            ],
            'status' => $this->statusPayload($request->getStato()),
            'sentAt' => $request->getInviata()?->format(DATE_ATOM),
            'handledAt' => $request->getGestita()?->format(DATE_ATOM),
            'requestDate' => $request->getData()?->format('Y-m-d'),
            'message' => (string) $request->getMessaggio(),
            'document' => [
                'filename' => (string) $request->getDocumento(),
            ],
            'attachments' => array_map(
                static fn (string $filename, int $index) => [
                    'index' => $index + 1,
                    'filename' => $filename,
                ],
                $request->getAllegati(),
                array_keys($request->getAllegati()),
            ),
            'values' => $this->normalizeValues($request->getValori()),
            'canCancel' => $this->canCancel($request),
        ];
    }

    public function cancel(Utente $utente, int $id): array
    {
        $request = $this->resolveAccessibleRequest($utente, $id);
        if (!$this->canCancel($request)) {
            throw new \RuntimeException('La richiesta non è più annullabile.');
        }

        $request
            ->setInviata(new DateTime())
            ->setGestita(null)
            ->setStato('A');
        $this->em->flush();

        return [
            'message' => 'Richiesta annullata.',
            'data' => [
                'id' => $request->getId(),
                'status' => $this->statusPayload($request->getStato()),
            ],
        ];
    }

    public function listGestione(Utente $utente, array $filters): array
    {
        $ruolo = $utente->getCodiceRuolo();
        $funzioni = $utente->getCodiceFunzioni();
        if (empty($funzioni)) {
            return ['items' => [], 'pagination' => ['page' => 1, 'maxPages' => 1, 'total' => 0]];
        }

        $conditions = array_map(
            fn (string $f) => "FIND_IN_SET('" . $ruolo . $f . "', dr.destinatari) > 0",
            $funzioni,
        );

        $qb = $this->em->createQueryBuilder()
            ->select('r', 'dr', 'a', 'c')
            ->from(Richiesta::class, 'r')
            ->join('r.definizioneRichiesta', 'dr')
            ->join(\App\Entity\Alunno::class, 'a', 'WITH', 'a.id = r.utente')
            ->join('r.classe', 'c')
            ->where('dr.abilitata = :abilitata AND dr.gestione = 1')
            ->andWhere(implode(' OR ', $conditions))
            ->setParameter('abilitata', 1)
            ->orderBy('r.inviata', 'DESC');

        $stato = $filters['stato'] ?? null;
        if ($stato && in_array($stato, ['I', 'G', 'A', 'C'], true)) {
            $qb->andWhere('r.stato = :stato')->setParameter('stato', $stato);
        }

        $classeId = isset($filters['classe']) ? (int) $filters['classe'] : 0;
        if ($classeId > 0) {
            $qb->andWhere('c.id = :classe')->setParameter('classe', $classeId);
        }

        $pagina = max(1, (int) ($filters['pagina'] ?? 1));
        $limit = 20;
        $total = (int) (clone $qb)->select('COUNT(r.id)')->getQuery()->getSingleScalarResult();
        $maxPages = max(1, (int) ceil($total / $limit));
        $requests = $qb->setFirstResult(($pagina - 1) * $limit)->setMaxResults($limit)->getQuery()->getResult();

        return [
            'items' => array_map(fn (Richiesta $r) => $this->serializeGestioneRow($r), $requests),
            'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total],
        ];
    }

    public function gestisci(Utente $utente, int $id, ?string $messaggio): array
    {
        $request = $this->resolveGestioneRequest($utente, $id);
        if ($request->getStato() !== 'I') {
            throw new \RuntimeException('La richiesta non è nello stato corretto per essere gestita.');
        }

        $request->setStato('G')->setGestita(new DateTime())->setMessaggio($messaggio ?? '');
        $this->em->flush();

        return [
            'message' => 'Richiesta gestita.',
            'data' => ['id' => $request->getId(), 'status' => $this->statusPayload('G')],
        ];
    }

    public function rimuovi(Utente $utente, int $id, ?string $messaggio): array
    {
        $request = $this->resolveGestioneRequest($utente, $id);
        if (!in_array($request->getStato(), ['I', 'G'], true)) {
            throw new \RuntimeException('La richiesta non può essere rimossa in questo stato.');
        }

        $request->setStato('C')->setGestita(new DateTime())->setMessaggio($messaggio ?? '');
        $this->em->flush();

        return [
            'message' => 'Richiesta rimossa.',
            'data' => ['id' => $request->getId(), 'status' => $this->statusPayload('C')],
        ];
    }

    public function resolveGestioneRequest(Utente $utente, int $id): Richiesta
    {
        $request = $this->em->getRepository(Richiesta::class)->find($id);
        if (!$request) {
            throw new \RuntimeException('Richiesta non trovata.');
        }

        $ruolo = $utente->getCodiceRuolo();
        $funzioni = $utente->getCodiceFunzioni();
        $destinatari = $request->getDefinizioneRichiesta()?->getDestinatari() ?? '';
        $hasAccess = false;
        foreach ($funzioni as $f) {
            if (str_contains(',' . $destinatari . ',', ',' . $ruolo . $f . ',')) {
                $hasAccess = true;
                break;
            }
        }

        if (!$hasAccess) {
            throw new \RuntimeException('Accesso alla richiesta non consentito.');
        }

        return $request;
    }

    private function serializeGestioneRow(Richiesta $r): array
    {
        $dr = $r->getDefinizioneRichiesta();
        $utente = $r->getUtente();

        return [
            'id' => $r->getId(),
            'moduleName' => $dr ? (string) $dr->getNome() : '',
            'moduleId' => $dr?->getId(),
            'student' => $utente ? trim($utente->getCognome() . ' ' . $utente->getNome()) : '',
            'classe' => $r->getClasse() ? (string) $r->getClasse() : '',
            'sentAt' => $r->getInviata()?->format(DATE_ATOM),
            'handledAt' => $r->getGestita()?->format(DATE_ATOM),
            'requestDate' => $r->getData()?->format('Y-m-d'),
            'status' => $this->statusPayload($r->getStato()),
            'message' => (string) $r->getMessaggio(),
            'attachmentsCount' => count($r->getAllegati()),
            'canGestire' => $r->getStato() === 'I',
            'canRimuovere' => in_array($r->getStato(), ['I', 'G'], true),
        ];
    }

    public function resolveAccessibleModule(Utente $utente, int $moduleId): DefinizioneRichiesta
    {
        /** @var DefinizioneRichiesta|null $module */
        $module = $this->em->getRepository(DefinizioneRichiesta::class)->findOneBy([
            'id' => $moduleId,
            'abilitata' => 1,
        ]);
        if (!$module) {
            throw new \RuntimeException('Modulo richiesta non trovato.');
        }
        if (!$utente->controllaRuoloFunzione($module->getRichiedenti())) {
            throw new \RuntimeException('Modulo richiesta non accessibile.');
        }

        $actualUser = $this->resolveActualUser($utente);
        $allowedSede = $module->getSede();
        if ($allowedSede && $actualUser->getClasse()?->getSede()?->getId() !== $allowedSede->getId()) {
            throw new \RuntimeException('Modulo richiesta non accessibile.');
        }

        return $module;
    }

    public function resolveAccessibleRequest(Utente $utente, int $id): Richiesta
    {
        /** @var Richiesta|null $request */
        $request = $this->em->getRepository(Richiesta::class)->find($id);
        if (!$request) {
            throw new \RuntimeException('Richiesta non trovata.');
        }
        if (!$utente->controllaRuoloFunzione($request->getDefinizioneRichiesta()->getRichiedenti())) {
            throw new \RuntimeException('Richiesta non accessibile.');
        }
        $actualUser = $utente instanceof Genitore ? $utente->getAlunno() : $utente;
        if ($request->getUtente() !== $actualUser && !$utente->controllaRuolo('DS')) {
            throw new \RuntimeException('Richiesta non accessibile.');
        }

        return $request;
    }

    private function resolveActualUser(Utente $utente): Utente
    {
        return $utente instanceof Genitore ? $utente->getAlunno() : $utente;
    }

    private function serializeModuleDefinition(int $moduleId, bool $canCreate = true): array
    {
        /** @var DefinizioneRichiesta|null $module */
        $module = $this->em->getRepository(DefinizioneRichiesta::class)->find($moduleId);
        if (!$module) {
            return [
                'canCreate' => false,
                'attachmentsRequired' => 0,
                'showRequestDate' => false,
                'gestione' => false,
                'fields' => [],
            ];
        }

        $fields = [];
        foreach ($module->getCampi() as $name => $field) {
            $fields[] = [
                'name' => (string) $name,
                'label' => $this->humanizeFieldName((string) $name),
                'type' => (string) ($field[0] ?? 'string'),
                'required' => (bool) ($field[1] ?? false),
            ];
        }

        return [
            'canCreate' => $canCreate,
            'attachmentsRequired' => $module->getAllegati(),
            'showRequestDate' => !$module->getUnica(),
            'gestione' => $module->getGestione(),
            'fields' => $fields,
        ];
    }

    private function serializeRequestRow(int $moduleId, array $request, bool $current): array
    {
        return [
            'id' => (int) $request['id'],
            'moduleId' => $moduleId,
            'sentAt' => $request['inviata']?->format(DATE_ATOM),
            'handledAt' => $request['gestita']?->format(DATE_ATOM),
            'requestDate' => $request['data']?->format('Y-m-d'),
            'document' => (string) ($request['documento'] ?? ''),
            'attachmentsCount' => count($request['allegati'] ?? []),
            'status' => $this->statusPayload((string) $request['stato']),
            'message' => (string) ($request['messaggio'] ?? ''),
            'current' => $current,
            'canCancel' => $current && in_array((string) $request['stato'], ['I', 'G'], true),
        ];
    }

    private function statusPayload(string $status): array
    {
        return [
            'code' => $status,
            'label' => match ($status) {
                'I' => 'Inviata',
                'G' => 'Gestita',
                'A' => 'Annullata',
                'C' => 'Cancellata',
                default => $status,
            },
        ];
    }

    private function normalizeValues(array $values): array
    {
        $normalized = [];
        foreach ($values as $key => $value) {
            $normalized[] = [
                'key' => (string) $key,
                'value' => is_scalar($value) || $value === null
                    ? (string) ($value ?? '')
                    : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ];
        }

        return $normalized;
    }

    private function canCancel(Richiesta $request): bool
    {
        if (!in_array($request->getStato(), ['I', 'G'], true)) {
            return false;
        }
        if (!$request->getDefinizioneRichiesta()->getUnica() &&
            $request->getStato() === 'G') {
            return false;
        }

        return true;
    }

    /**
     * @param mixed $submitted
     *
     * @return array<string, mixed>
     */
    private function normalizeSubmittedValues(DefinizioneRichiesta $module, mixed $submitted): array
    {
        $submittedValues = is_array($submitted) ? $submitted : [];
        $values = [];
        foreach ($module->getCampi() as $name => $field) {
            $type = (string) ($field[0] ?? 'string');
            $required = (bool) ($field[1] ?? false);
            $raw = $submittedValues[$name] ?? null;
            $value = match ($type) {
                'int' => $this->normalizeIntegerValue($raw),
                'float' => $this->normalizeFloatValue($raw),
                'bool' => $this->normalizeBooleanValue($raw),
                'date' => $this->normalizeDateValue($raw),
                'time' => $this->normalizeTimeValue($raw),
                default => $this->normalizeStringValue($raw),
            };

            if ($required && $value === null) {
                throw new \RuntimeException(sprintf('Il campo "%s" è obbligatorio.', $this->humanizeFieldName((string) $name)));
            }
            $values[(string) $name] = $value;
        }

        return $values;
    }

    private function normalizeStringValue(mixed $value): ?string
    {
        if (!is_scalar($value) && $value !== null) {
            return null;
        }
        $text = trim((string) ($value ?? ''));

        return $text !== '' ? $text : null;
    }

    private function normalizeIntegerValue(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw new \RuntimeException('Uno dei campi numerici non contiene un valore valido.');
        }

        return (int) $value;
    }

    private function normalizeFloatValue(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw new \RuntimeException('Uno dei campi numerici non contiene un valore valido.');
        }

        return (float) $value;
    }

    private function normalizeBooleanValue(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return $value;
        }
        $normalized = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($normalized === null && in_array($value, ['0', '1', 0, 1], true)) {
            return (bool) $value;
        }

        return $normalized;
    }

    private function normalizeDateValue(mixed $value): ?DateTime
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $date = DateTime::createFromFormat('Y-m-d', $value);
        if (!$date) {
            throw new \RuntimeException('Uno dei campi data non ha un formato valido.');
        }
        $date->setTime(0, 0, 0);

        return $date;
    }

    private function normalizeTimeValue(mixed $value): ?DateTime
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $time = DateTime::createFromFormat('H:i', $value) ?: DateTime::createFromFormat('H:i:s', $value);
        if (!$time) {
            throw new \RuntimeException('Uno dei campi orario non ha un formato valido.');
        }

        return $time;
    }

    private function parseRequestDate(mixed $value): ?DateTime
    {
        return $this->normalizeDateValue($value);
    }

    private function validateSubmissionDeadline(DateTime $submittedAt, ?DateTime $requestDate): void
    {
        if (!$requestDate) {
            return;
        }
        $deadlineTime = (string) $this->requestStack->getSession()->get('/CONFIG/SCUOLA/scadenza_invio_richiesta', '');
        if ($deadlineTime === '' || !str_contains($deadlineTime, ':')) {
            return;
        }

        $deadline = clone $requestDate;
        $deadline->modify('-1 day');
        [$hour, $minute] = array_map('intval', explode(':', $deadlineTime));
        $deadline->setTime($hour, $minute, 0);
        if ($submittedAt > $deadline) {
            throw new \RuntimeException(sprintf('La richiesta è fuori termine. Orario limite: %s.', $deadlineTime));
        }
    }

    /**
     * @param array<int, UploadedFile> $attachments
     *
     * @return array<int, array{type: string, temp: string, name: string, ext: string, size: int}>
     */
    private function stageAttachments(array $attachments): array
    {
        $filesystem = new Filesystem();
        if (!$filesystem->exists($this->dirTemp)) {
            $filesystem->mkdir($this->dirTemp, 0775);
        }

        $staged = [];
        foreach ($attachments as $attachment) {
            $originalName = $attachment->getClientOriginalName();
            $extension = strtolower((string) $attachment->getClientOriginalExtension());
            if (!in_array($extension, ['pdf', 'jpg', 'jpeg'], true)) {
                throw new \RuntimeException('Sono ammessi solo allegati PDF o immagini JPEG.');
            }
            $tempName = date('Ymd_His').'_'.bin2hex(random_bytes(8));
            $attachment->move($this->dirTemp, $tempName.'.'.$extension);
            $staged[] = [
                'type' => 'uploaded',
                'temp' => $tempName,
                'name' => pathinfo($originalName, PATHINFO_FILENAME),
                'ext' => $extension,
                'size' => (int) filesize($this->dirTemp.'/'.$tempName.'.'.$extension),
            ];
        }

        return $staged;
    }

    /**
     * @param array<int, array{temp: string, ext: string}> $attachments
     */
    private function cleanupStagedAttachments(array $attachments): void
    {
        $filesystem = new Filesystem();
        foreach ($attachments as $attachment) {
            $path = $this->dirTemp.'/'.$attachment['temp'].'.'.$attachment['ext'];
            if ($filesystem->exists($path)) {
                $filesystem->remove($path);
            }
        }
    }

    private function humanizeFieldName(string $name): string
    {
        return ucfirst(str_replace('_', ' ', $name));
    }
}
