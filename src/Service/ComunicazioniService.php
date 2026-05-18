<?php

namespace App\Service;

use App\Entity\Allegato;
use App\Entity\Avviso;
use App\Entity\Circolare;
use App\Entity\ComunicazioneUtente;
use App\Entity\Utente;
use App\Util\ComunicazioniUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

class ComunicazioniService
{
    public function __construct(
        private EntityManagerInterface $em,
        private ComunicazioniUtil $comunicazioniUtil,
    ) {}

    public function listCircolari(Utente $utente, array $filters): array
    {
        $criteri = [
            'visualizza' => $filters['visualizza'] ?? ($this->isStaff($utente) ? 'T' : 'P'),
            'mese' => $this->normalizeMonth($filters['mese'] ?? null),
            'oggetto' => trim((string) ($filters['oggetto'] ?? '')),
            'anno' => 0,
        ];
        $pagina = max(1, (int) ($filters['pagina'] ?? 1));
        $result = $this->em->getRepository(Circolare::class)->lista($criteri, $pagina, $utente);

        return [
            'items' => array_map(
                fn (array $row) => $this->serializeCircolareRow($row, $utente),
                iterator_to_array($result['lista']),
            ),
            'pagination' => [
                'page' => $pagina,
                'maxPages' => (int) $result['maxPagine'],
            ],
            'filters' => [
                'visualizza' => $criteri['visualizza'],
                'mese' => $criteri['mese'],
                'oggetto' => $criteri['oggetto'],
            ],
        ];
    }

    public function getCircolare(Utente $utente, int $id, bool $markAsRead = true): array
    {
        $circolare = $this->em->getRepository(Circolare::class)->find($id);
        if (!$circolare || !$this->comunicazioniUtil->permessoLettura($utente, $circolare)) {
            throw new \RuntimeException('Circolare non trovata.');
        }

        if ($markAsRead) {
            $this->comunicazioniUtil->leggeUtente($utente, $circolare);
            $this->em->flush();
        }

        return $this->serializeCircolareDetail($circolare, $utente);
    }

    public function signCircolare(Utente $utente, int $id): array
    {
        $circolare = $this->em->getRepository(Circolare::class)->find($id);
        if (!$circolare || !$this->comunicazioniUtil->permessoLettura($utente, $circolare)) {
            throw new \RuntimeException('Circolare non trovata.');
        }

        $this->em->getRepository(ComunicazioneUtente::class)->firma($circolare, $utente);

        return [
            'message' => 'Presa visione registrata.',
            'data' => $this->serializeCircolareStatus($circolare, $utente),
        ];
    }

    public function getCircolareAttachment(Utente $utente, int $id, int $attachmentId): array
    {
        $circolare = $this->em->getRepository(Circolare::class)->find($id);
        if (!$circolare || !$this->comunicazioniUtil->permessoLettura($utente, $circolare)) {
            throw new \RuntimeException('Circolare non trovata.');
        }

        $attachment = $this->resolveAttachment($circolare->getAllegati()?->toArray() ?? [], $attachmentId);
        $this->comunicazioniUtil->leggeUtente($utente, $circolare);
        $this->em->flush();

        return [
            'comunicazione' => $circolare,
            'attachment' => $attachment,
        ];
    }

    public function listAvvisi(Utente $utente, array $filters): array
    {
        $criteri = [
            'visualizza' => $filters['visualizza'] ?? 'P',
            'mese' => $this->normalizeMonth($filters['mese'] ?? null),
            'oggetto' => trim((string) ($filters['oggetto'] ?? '')),
        ];
        $pagina = max(1, (int) ($filters['pagina'] ?? 1));
        $result = $this->em->getRepository(Avviso::class)->listaBacheca($criteri, $pagina, $utente);

        return [
            'items' => array_map(
                fn (array $row) => $this->serializeAvvisoRow($row),
                iterator_to_array($result['lista']),
            ),
            'pagination' => [
                'page' => $pagina,
                'maxPages' => (int) $result['maxPagine'],
            ],
            'filters' => [
                'visualizza' => $criteri['visualizza'],
                'mese' => $criteri['mese'],
                'oggetto' => $criteri['oggetto'],
            ],
        ];
    }

    public function getAvviso(Utente $utente, int $id, bool $markAsRead = true): array
    {
        $avviso = $this->em->getRepository(Avviso::class)->find($id);
        if (!$avviso || !$this->comunicazioniUtil->permessoLettura($utente, $avviso)) {
            throw new \RuntimeException('Avviso non trovato.');
        }

        if ($markAsRead) {
            $this->em->getRepository(ComunicazioneUtente::class)->legge($avviso, $utente);
        }

        return $this->serializeAvvisoDetail($avviso, $utente);
    }

    public function markAvvisoRead(Utente $utente, int $id): array
    {
        $avviso = $this->em->getRepository(Avviso::class)->find($id);
        if (!$avviso || !$this->comunicazioniUtil->permessoLettura($utente, $avviso)) {
            throw new \RuntimeException('Avviso non trovato.');
        }

        $this->em->getRepository(ComunicazioneUtente::class)->legge($avviso, $utente);

        return [
            'message' => 'Avviso segnato come letto.',
            'data' => $this->serializeComunicazioneStatus($avviso, $utente),
        ];
    }

    public function getAvvisoAttachment(Utente $utente, int $id, int $attachmentId): array
    {
        $avviso = $this->em->getRepository(Avviso::class)->find($id);
        if (!$avviso || !$this->comunicazioniUtil->permessoLettura($utente, $avviso)) {
            throw new \RuntimeException('Avviso non trovato.');
        }

        $attachment = $this->resolveAttachment($avviso->getAllegati()?->toArray() ?? [], $attachmentId);
        $this->em->getRepository(ComunicazioneUtente::class)->legge($avviso, $utente);

        return [
            'comunicazione' => $avviso,
            'attachment' => $attachment,
        ];
    }

    public function getAgenda(Utente $utente, string $month): array
    {
        $mese = DateTime::createFromFormat('Y-m-d', $month.'-01');
        if (!$mese) {
            throw new \RuntimeException('Mese agenda non valido.');
        }

        $raw = $this->em->getRepository(Avviso::class)->agendaEventi($utente, $mese);
        $days = [];
        foreach ($raw as $day => $flags) {
            if (!is_numeric($day)) {
                continue;
            }
            $days[] = [
                'day' => (int) $day,
                'flags' => [
                    'attivita' => isset($flags['A']),
                    'verifiche' => isset($flags['V']),
                    'compiti' => isset($flags['P']),
                    'colloqui' => isset($flags['Q']),
                ],
            ];
        }

        usort($days, static fn (array $a, array $b) => $a['day'] <=> $b['day']);

        return [
            'month' => $mese->format('Y-m'),
            'label' => $this->formatMonthLabel($mese),
            'days' => $days,
        ];
    }

    public function getAgendaDay(Utente $utente, string $date, string $type): array
    {
        $data = DateTime::createFromFormat('Y-m-d', $date);
        if (!$data) {
            throw new \RuntimeException('Data agenda non valida.');
        }
        if (!in_array($type, ['A', 'V', 'P', 'Q'], true)) {
            throw new \RuntimeException('Tipo agenda non supportato.');
        }

        $result = $this->em->getRepository(Avviso::class)->listaAgendaEventi($data, $type, $utente, null);
        $items = [];
        if ($type === 'Q') {
            foreach ($result['eventi'] as $row) {
                $items[] = [
                    'kind' => 'colloquio',
                    'id' => (int) $row['id'],
                    'time' => $row['appuntamento']?->format('H:i'),
                    'location' => (string) ($row['luogo'] ?? ''),
                    'message' => (string) ($row['messaggio'] ?? ''),
                    'student' => trim($row['cognome'].' '.$row['nome']),
                    'teacher' => trim($row['cognomeDocente'].' '.$row['nomeDocente']),
                    'className' => trim($row['anno'].$row['sezione'].' '.($row['gruppo'] ?? '')),
                ];
            }
        } else {
            foreach ($result['eventi'] as $index => $evento) {
                $items[] = [
                    'kind' => 'avviso',
                    'id' => $evento->getId(),
                    'title' => (string) $evento->getTitolo(),
                    'text' => $evento->testoPersonalizzato(),
                    'type' => (string) $evento->getTipo(),
                    'className' => $evento->getClasse() ? (string) $evento->getClasse() : null,
                    'subject' => $evento->getMateria()?->getNomeBreve(),
                    'destinatari' => $result['destinatari'][$index] ?? '',
                    'classFilters' => $result['classi'][$index] ?? '',
                ];
                $this->em->getRepository(ComunicazioneUtente::class)->legge($evento, $utente);
            }
        }

        return [
            'date' => $data->format('Y-m-d'),
            'type' => $type,
            'items' => $items,
        ];
    }

    private function serializeCircolareRow(array $row, Utente $utente): array
    {
        /** @var Circolare $circolare */
        $circolare = $row['circolare'];
        $recipient = $this->resolveRecipient($circolare, $utente);

        return [
            'id' => $circolare->getId(),
            'numero' => $circolare->getNumero(),
            'title' => (string) $circolare->getTitolo(),
            'data' => $circolare->getData()?->format('Y-m-d'),
            'displayDate' => $circolare->getData()?->format('d/m/Y'),
            'firma' => $circolare->getFirma(),
            'status' => [
                'isRead' => $row['letto'] !== null,
                'isSigned' => $recipient?->getFirmato() !== null,
            ],
        ];
    }

    private function serializeCircolareDetail(Circolare $circolare, Utente $utente): array
    {
        $recipient = $this->resolveRecipient($circolare, $utente);

        return [
            'id' => $circolare->getId(),
            'numero' => $circolare->getNumero(),
            'title' => (string) $circolare->getTitolo(),
            'data' => $circolare->getData()?->format('Y-m-d'),
            'displayDate' => $circolare->getData()?->format('d/m/Y'),
            'firma' => $circolare->getFirma(),
            'author' => trim(($circolare->getAutore()?->getNome() ?? '').' '.($circolare->getAutore()?->getCognome() ?? '')),
            'status' => $this->serializeCircolareStatus($circolare, $utente),
            'attachments' => array_map(
                static fn ($allegato) => [
                    'id' => $allegato->getId(),
                    'title' => (string) $allegato->getTitolo(),
                    'filename' => (string) $allegato->getNome(),
                    'extension' => (string) $allegato->getEstensione(),
                    'size' => (int) $allegato->getDimensione(),
                ],
                $circolare->getAllegati()?->toArray() ?? [],
            ),
            'recipient' => [
                'readAt' => $recipient?->getLetto()?->format(DATE_ATOM),
                'signedAt' => $recipient?->getFirmato()?->format(DATE_ATOM),
            ],
        ];
    }

    private function serializeCircolareStatus(Circolare $circolare, Utente $utente): array
    {
        $recipient = $this->resolveRecipient($circolare, $utente);

        return [
            'isRead' => $recipient?->getLetto() !== null,
            'isSigned' => $recipient?->getFirmato() !== null,
            'readAt' => $recipient?->getLetto()?->format(DATE_ATOM),
            'signedAt' => $recipient?->getFirmato()?->format(DATE_ATOM),
        ];
    }

    private function serializeAvvisoRow(array $row): array
    {
        /** @var Avviso $avviso */
        $avviso = $row['avviso'];

        return [
            'id' => $avviso->getId(),
            'title' => (string) $avviso->getTitolo(),
            'data' => $avviso->getData()?->format('Y-m-d'),
            'displayDate' => $avviso->getData()?->format('d/m/Y'),
            'type' => (string) $avviso->getTipo(),
            'isRead' => $row['letto'] !== null,
        ];
    }

    private function serializeAvvisoDetail(Avviso $avviso, Utente $utente): array
    {
        return [
            'id' => $avviso->getId(),
            'title' => (string) $avviso->getTitolo(),
            'data' => $avviso->getData()?->format('Y-m-d'),
            'displayDate' => $avviso->getData()?->format('d/m/Y'),
            'type' => (string) $avviso->getTipo(),
            'text' => $avviso->testoPersonalizzato(),
            'author' => trim(($avviso->getAutore()?->getNome() ?? '').' '.($avviso->getAutore()?->getCognome() ?? '')),
            'className' => $avviso->getClasse() ? (string) $avviso->getClasse() : null,
            'subject' => $avviso->getMateria()?->getNomeBreve(),
            'status' => $this->serializeComunicazioneStatus($avviso, $utente),
            'attachments' => array_map(
                static fn ($allegato) => [
                    'id' => $allegato->getId(),
                    'title' => (string) $allegato->getTitolo(),
                    'filename' => (string) $allegato->getNome(),
                    'extension' => (string) $allegato->getEstensione(),
                    'size' => (int) $allegato->getDimensione(),
                ],
                $avviso->getAllegati()?->toArray() ?? [],
            ),
        ];
    }

    private function serializeComunicazioneStatus(object $comunicazione, Utente $utente): array
    {
        $recipient = $this->resolveRecipient($comunicazione, $utente);

        return [
            'isRead' => $recipient?->getLetto() !== null,
            'readAt' => $recipient?->getLetto()?->format(DATE_ATOM),
        ];
    }

    private function resolveRecipient(object $comunicazione, ?Utente $utente): ?ComunicazioneUtente
    {
        if (!$utente) {
            return null;
        }

        return $this->em->getRepository(ComunicazioneUtente::class)->findOneBy([
            'comunicazione' => $comunicazione,
            'utente' => $utente,
        ]);
    }

    /**
     * @param array<int, mixed> $attachments
     */
    private function resolveAttachment(array $attachments, int $attachmentId): Allegato
    {
        foreach ($attachments as $attachment) {
            if ($attachment instanceof Allegato && $attachment->getId() === $attachmentId) {
                return $attachment;
            }
        }

        throw new \RuntimeException('Allegato non trovato.');
    }

    private function normalizeMonth(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === '0') {
            return null;
        }

        $month = (int) $value;
        return $month >= 1 && $month <= 12 ? $month : null;
    }

    private function isStaff(Utente $utente): bool
    {
        return in_array('ROLE_STAFF', $utente->getRoles(), true);
    }

    private function formatMonthLabel(DateTime $mese): string
    {
        $months = [
            1 => 'Gennaio',
            2 => 'Febbraio',
            3 => 'Marzo',
            4 => 'Aprile',
            5 => 'Maggio',
            6 => 'Giugno',
            7 => 'Luglio',
            8 => 'Agosto',
            9 => 'Settembre',
            10 => 'Ottobre',
            11 => 'Novembre',
            12 => 'Dicembre',
        ];

        return ($months[(int) $mese->format('n')] ?? $mese->format('m')).' '.$mese->format('Y');
    }
}
