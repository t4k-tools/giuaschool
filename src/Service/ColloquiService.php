<?php

namespace App\Service;

use App\Entity\Cattedra;
use App\Entity\Colloquio;
use App\Entity\Docente;
use App\Entity\Festivita;
use App\Entity\Genitore;
use App\Entity\RichiestaColloquio;
use App\Entity\Utente;
use App\Util\ColloquiUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class ColloquiService
{
    public function __construct(
        private EntityManagerInterface $em,
        private ColloquiUtil $colloquiUtil,
        private RequestStack $requestStack,
    ) {}

    public function getDashboard(Utente $utente): array
    {
        if ($utente instanceof Genitore) {
            return $this->getGenitoreDashboard($utente);
        }
        if ($utente instanceof Docente) {
            return $this->getDocenteDashboard($utente);
        }

        throw new \RuntimeException('Ruolo non abilitato per i colloqui.');
    }

    public function getTeacherSlots(Utente $utente, int $teacherId): array
    {
        $genitore = $this->requireGenitore($utente);
        $alunno = $this->requireActiveAlunno($genitore);
        $classe = $alunno->getClasse();
        if (!$classe) {
            throw new \RuntimeException('Classe alunno non disponibile.');
        }

        /** @var Docente|null $docente */
        $docente = $this->em->getRepository(Docente::class)->findOneBy([
            'id' => $teacherId,
            'abilitato' => 1,
        ]);
        if (!$docente) {
            throw new \RuntimeException('Docente non trovato.');
        }

        $cattedre = $this->em->getRepository(Cattedra::class)->cattedreClasse($classe, false);
        $teachesClass = false;
        $subjects = [];
        foreach ($cattedre as $cattedra) {
            if ($cattedra->getDocente()?->getId() !== $docente->getId()) {
                continue;
            }
            $teachesClass = true;
            $prefix = $cattedra->getTipo() === 'I' ? 'Lab. ' : '';
            $label = $prefix.($cattedra->getMateria()?->getNome() ?? 'Materia');
            $subjects[$label] = $label;
        }
        if (!$teachesClass) {
            throw new \RuntimeException('Docente non disponibile per la classe dell’alunno.');
        }

        $data = $this->colloquiUtil->dateRicevimento($docente);

        return [
            'teacher' => $this->serializeTeacher($docente, array_values($subjects)),
            'slots' => array_map(
                fn (array $slot) => $this->serializeSlotRow($slot),
                array_values($data['validi'] ?? []),
            ),
            'exhausted' => array_map(
                fn (array $slot) => $this->serializeSlotRow($slot),
                array_values($data['esauriti'] ?? []),
            ),
            'upcoming' => array_map(
                fn (array $slot) => $this->serializeSlotRow($slot),
                array_values($data['prossimi'] ?? []),
            ),
        ];
    }

    public function createBooking(Utente $utente, int $teacherId, int $slotId): array
    {
        $genitore = $this->requireGenitore($utente);
        $alunno = $this->requireActiveAlunno($genitore);

        /** @var Docente|null $docente */
        $docente = $this->em->getRepository(Docente::class)->findOneBy([
            'id' => $teacherId,
            'abilitato' => 1,
        ]);
        if (!$docente) {
            throw new \RuntimeException('Docente non trovato.');
        }

        /** @var Colloquio|null $colloquio */
        $colloquio = $this->em->getRepository(Colloquio::class)->find($slotId);
        if (!$colloquio || $colloquio->getDocente()?->getId() !== $docente->getId() || !$colloquio->getAbilitato()) {
            throw new \RuntimeException('Slot colloquio non disponibile.');
        }
        if (($colloquio->getData()?->format('Y-m-d') ?? '') < (new DateTime('today'))->format('Y-m-d')) {
            throw new \RuntimeException('Non puoi prenotare un colloquio passato.');
        }
        if ($this->em->getRepository(RichiestaColloquio::class)->findOneBy([
            'colloquio' => $colloquio,
            'alunno' => $alunno,
            'stato' => ['R', 'C'],
        ])) {
            throw new \RuntimeException('Esiste già una prenotazione attiva per questo colloquio.');
        }
        $numeroRichieste = $this->em->getRepository(Colloquio::class)->numeroRichieste($colloquio);
        if ($numeroRichieste >= $colloquio->getNumero()) {
            throw new \RuntimeException('Lo slot selezionato è esaurito.');
        }

        $appuntamento = $this->em->getRepository(Colloquio::class)->nuovoAppuntamento($colloquio);
        $richiesta = (new RichiestaColloquio())
            ->setColloquio($colloquio)
            ->setAppuntamento($appuntamento)
            ->setAlunno($alunno)
            ->setGenitore($genitore)
            ->setStato('R')
            ->setMessaggio('');
        $this->em->persist($richiesta);
        $this->em->flush();

        return [
            'message' => 'Prenotazione registrata.',
            'data' => $this->serializeFamilyRequest($richiesta),
        ];
    }

    public function cancelBooking(Utente $utente, int $requestId): array
    {
        $genitore = $this->requireGenitore($utente);
        $alunno = $this->requireActiveAlunno($genitore);

        /** @var RichiestaColloquio|null $richiesta */
        $richiesta = $this->em->getRepository(RichiestaColloquio::class)->findOneBy([
            'id' => $requestId,
            'alunno' => $alunno,
            'stato' => ['R', 'C'],
        ]);
        if (!$richiesta) {
            throw new \RuntimeException('Prenotazione non trovata.');
        }

        $richiesta
            ->setStato('A')
            ->setMessaggio('')
            ->setGenitoreAnnulla($genitore);
        $this->em->flush();

        return [
            'message' => 'Prenotazione annullata.',
            'data' => $this->serializeFamilyRequest($richiesta),
        ];
    }

    public function confirmRequest(Utente $utente, int $requestId): array
    {
        $docente = $this->requireDocente($utente);
        $richiesta = $this->resolveTeacherRequest($docente, $requestId);
        if ($richiesta->getStato() !== 'R') {
            throw new \RuntimeException('La richiesta non è più in attesa.');
        }

        $richiesta->setStato('C');
        $this->em->flush();

        return [
            'message' => 'Richiesta confermata.',
            'data' => $this->serializeTeacherRequest($richiesta),
        ];
    }

    public function rejectRequest(Utente $utente, int $requestId, string $message): array
    {
        $docente = $this->requireDocente($utente);
        $richiesta = $this->resolveTeacherRequest($docente, $requestId);
        if ($richiesta->getStato() !== 'R') {
            throw new \RuntimeException('La richiesta non è più in attesa.');
        }
        if ($message === '') {
            throw new \RuntimeException('Il messaggio di rifiuto è obbligatorio.');
        }

        $richiesta
            ->setStato('N')
            ->setMessaggio($message);
        $this->em->flush();

        return [
            'message' => 'Richiesta rifiutata.',
            'data' => $this->serializeTeacherRequest($richiesta),
        ];
    }

    public function updateResponse(Utente $utente, int $requestId, string $status, string $message): array
    {
        $docente = $this->requireDocente($utente);
        $richiesta = $this->resolveTeacherRequest($docente, $requestId);
        if (!in_array($richiesta->getStato(), ['C', 'N'], true)) {
            throw new \RuntimeException('La risposta può essere aggiornata solo per richieste già lavorate.');
        }
        if (!in_array($status, ['C', 'N'], true)) {
            throw new \RuntimeException('Stato colloquio non supportato.');
        }
        if ($status === 'N' && $message === '') {
            throw new \RuntimeException('Il messaggio di rifiuto è obbligatorio.');
        }

        $richiesta
            ->setStato($status)
            ->setMessaggio($message);
        $this->em->flush();

        return [
            'message' => 'Risposta aggiornata.',
            'data' => $this->serializeTeacherRequest($richiesta),
        ];
    }

    public function getManagementData(Utente $utente): array
    {
        $docente = $this->requireDocente($utente);
        $inizio = $this->schoolYearStart();
        $ricevimenti = $this->em->getRepository(Colloquio::class)->ricevimenti($docente, $inizio);
        $cancellabiliDisabilitati = $this->em->getRepository(Colloquio::class)->cancellabili($docente, false);
        $cancellabiliTutti = $this->em->getRepository(Colloquio::class)->cancellabili($docente);

        return [
            'window' => [
                'start' => $inizio->format('Y-m-d'),
                'end' => $this->colloquiEnd()->format('Y-m-d'),
            ],
            'items' => array_map(
                fn (array $row, int $id) => $this->serializeManagementItem($id, $row),
                $ricevimenti,
                array_keys($ricevimenti),
            ),
            'deleteOptions' => [
                'disabledCount' => count($cancellabiliDisabilitati),
                'allCount' => count($cancellabiliTutti),
            ],
        ];
    }

    public function saveSingleManagement(Utente $utente, array $payload, ?int $id = null): array
    {
        $docente = $this->requireDocente($utente);
        $colloquio = $id ? $this->resolveManagementColloquio($docente, $id) : new Colloquio();
        $oggi = new DateTime('today');

        $data = $this->parseDate((string) ($payload['date'] ?? ''));
        $inizio = $this->parseTime((string) ($payload['startTime'] ?? ''));
        $fine = $this->parseTime((string) ($payload['endTime'] ?? ''));
        $durata = max(5, (int) ($payload['duration'] ?? 10));
        $tipo = (string) ($payload['type'] ?? 'P');
        $luogo = $this->normalizeLocation($tipo, trim((string) ($payload['location'] ?? '')));

        if ($data < $oggi || $data > $this->colloquiEnd()) {
            throw new \RuntimeException('La data del ricevimento non è valida.');
        }
        if ($this->em->getRepository(Festivita::class)->giornoFestivo($data)) {
            throw new \RuntimeException('Il giorno selezionato è festivo.');
        }
        if (!in_array($tipo, ['P', 'D'], true)) {
            throw new \RuntimeException('Tipo colloquio non supportato.');
        }
        if ($fine <= $inizio) {
            throw new \RuntimeException('L’orario finale deve essere successivo a quello iniziale.');
        }
        if ($this->em->getRepository(Colloquio::class)->sovrapposizione($docente, $data, $inizio, $fine, $id ?? 0)) {
            throw new \RuntimeException('Esiste già un ricevimento sovrapposto.');
        }

        $colloquio
            ->setDocente($docente)
            ->setData($data)
            ->setInizio($inizio)
            ->setFine($fine)
            ->setDurata($durata)
            ->setTipo($tipo)
            ->setLuogo($luogo)
            ->setAbilitato((bool) ($payload['enabled'] ?? true));
        $colloquio->setNumero($this->colloquiUtil->numeroColloqui($colloquio));

        if (!$id) {
            $this->em->persist($colloquio);
        }
        $this->em->flush();

        return [
            'message' => $id ? 'Ricevimento aggiornato.' : 'Ricevimento creato.',
            'data' => $this->serializeManagementEntity($colloquio),
        ];
    }

    public function createRecurringManagement(Utente $utente, array $payload): array
    {
        $docente = $this->requireDocente($utente);
        $tipo = (string) ($payload['type'] ?? 'P');
        $frequenza = (string) ($payload['frequency'] ?? 'S');
        $durata = max(5, (int) ($payload['duration'] ?? 10));
        $giorno = (int) ($payload['weekday'] ?? -1);
        $inizio = $this->parseTime((string) ($payload['startTime'] ?? ''));
        $fine = $this->parseTime((string) ($payload['endTime'] ?? ''));
        $luogo = $this->normalizeLocation($tipo, trim((string) ($payload['location'] ?? '')));

        if (!in_array($tipo, ['P', 'D'], true)) {
            throw new \RuntimeException('Tipo colloquio non supportato.');
        }
        if (!in_array($frequenza, ['S', '1', '2', '3', '4'], true)) {
            throw new \RuntimeException('Frequenza colloquio non supportata.');
        }
        if ($giorno < 1 || $giorno > 6) {
            throw new \RuntimeException('Giorno della settimana non valido.');
        }
        if ($fine <= $inizio) {
            throw new \RuntimeException('L’orario finale deve essere successivo a quello iniziale.');
        }

        $warning = $this->colloquiUtil->generaDate($docente, $tipo, $frequenza, $durata, $giorno, $inizio, $fine, $luogo);

        return [
            'message' => $warning ? 'Ricevimenti periodici creati con avvisi.' : 'Ricevimenti periodici creati.',
            'warning' => $warning,
        ];
    }

    public function setManagementEnabled(Utente $utente, int $id, bool $enabled): array
    {
        $docente = $this->requireDocente($utente);
        $colloquio = $this->resolveManagementColloquio($docente, $id);
        if ($colloquio->getData() < new DateTime('today')) {
            throw new \RuntimeException('Non puoi modificare un ricevimento passato.');
        }
        if ($this->em->getRepository(Colloquio::class)->numeroRichieste($colloquio) > 0) {
            throw new \RuntimeException('Non puoi abilitare o disabilitare un ricevimento con richieste.');
        }

        $colloquio->setAbilitato($enabled);
        $this->em->flush();

        return [
            'message' => $enabled ? 'Ricevimento abilitato.' : 'Ricevimento disabilitato.',
            'data' => $this->serializeManagementEntity($colloquio),
        ];
    }

    public function deleteManagement(Utente $utente, string $mode): array
    {
        $docente = $this->requireDocente($utente);
        if (!in_array($mode, ['D', 'T'], true)) {
            throw new \RuntimeException('Modalità cancellazione non supportata.');
        }

        $ricevimenti = $this->em->getRepository(Colloquio::class)->cancellabili($docente, $mode === 'D' ? false : null);
        $deleted = 0;
        foreach ($ricevimenti as $ricevimento) {
            $this->em->remove($ricevimento);
            $deleted++;
        }
        $this->em->flush();

        return [
            'message' => 'Ricevimenti cancellati.',
            'data' => ['deleted' => $deleted],
        ];
    }

    private function getGenitoreDashboard(Genitore $genitore): array
    {
        $alunno = $this->requireActiveAlunno($genitore);
        $classe = $alunno->getClasse();
        if (!$classe) {
            throw new \RuntimeException('Classe alunno non disponibile.');
        }

        $dati = $this->colloquiUtil->colloquiGenitori($classe, $alunno, $genitore);
        $teachers = [];
        foreach ($dati['docenti'] ?? [] as $cattedra) {
            $docente = $cattedra->getDocente();
            if (!$docente) {
                continue;
            }
            $id = $docente->getId();
            if (!isset($teachers[$id])) {
                $teachers[$id] = $this->serializeTeacher($docente, []);
            }
            $prefix = $cattedra->getTipo() === 'I' ? 'Lab. ' : '';
            $label = $prefix.($cattedra->getMateria()?->getNome() ?? 'Materia');
            if (!in_array($label, $teachers[$id]['subjects'], true)) {
                $teachers[$id]['subjects'][] = $label;
            }
        }

        return [
            'role' => 'genitore',
            'student' => [
                'id' => $alunno->getId(),
                'name' => trim($alunno->getCognome().' '.$alunno->getNome()),
                'className' => $classe ? (string) $classe : null,
            ],
            'teachers' => array_values($teachers),
            'requests' => array_map(
                fn (array $row) => $this->serializeFamilyRequestRow($row),
                $dati['richieste'] ?? [],
            ),
        ];
    }

    private function getDocenteDashboard(Docente $docente): array
    {
        $richieste = $this->em->getRepository(Colloquio::class)->richiesteValide($docente);
        $storico = $this->em->getRepository(RichiestaColloquio::class)->storico($docente);

        return [
            'role' => 'docente',
            'pendingCount' => (int) ($richieste['inAttesa'] ?? 0),
            'appointments' => array_map(
                fn (array $ricevimento, int $id) => $this->serializeTeacherAppointment($id, $ricevimento),
                $richieste['ricevimenti'] ?? [],
                array_keys($richieste['ricevimenti'] ?? []),
            ),
            'history' => array_map(
                fn (array $ricevimento, int $id) => $this->serializeTeacherHistory($id, $ricevimento),
                $storico,
                array_keys($storico),
            ),
        ];
    }

    private function resolveManagementColloquio(Docente $docente, int $id): Colloquio
    {
        /** @var Colloquio|null $colloquio */
        $colloquio = $this->em->getRepository(Colloquio::class)->findOneBy([
            'id' => $id,
            'docente' => $docente,
        ]);
        if (!$colloquio) {
            throw new \RuntimeException('Ricevimento non trovato.');
        }

        return $colloquio;
    }

    private function resolveTeacherRequest(Docente $docente, int $requestId): RichiestaColloquio
    {
        /** @var RichiestaColloquio|null $richiesta */
        $richiesta = $this->em->getRepository(RichiestaColloquio::class)->find($requestId);
        if (!$richiesta || $richiesta->getColloquio()?->getDocente()?->getId() !== $docente->getId()) {
            throw new \RuntimeException('Richiesta colloquio non trovata.');
        }
        if (!$richiesta->getColloquio()?->getAbilitato()) {
            throw new \RuntimeException('Il colloquio non è più abilitato.');
        }

        return $richiesta;
    }

    private function requireDocente(Utente $utente): Docente
    {
        if (!$utente instanceof Docente) {
            throw new \RuntimeException('Utente non docente.');
        }

        return $utente;
    }

    private function requireGenitore(Utente $utente): Genitore
    {
        if (!$utente instanceof Genitore) {
            throw new \RuntimeException('Utente non genitore.');
        }

        return $utente;
    }

    private function requireActiveAlunno(Genitore $genitore)
    {
        $alunno = $genitore->getAlunno();
        if (!$alunno || !$alunno->getAbilitato()) {
            throw new \RuntimeException('Alunno non disponibile per i colloqui.');
        }

        return $alunno;
    }

    private function serializeTeacher(Docente $docente, array $subjects): array
    {
        return [
            'id' => $docente->getId(),
            'name' => (string) $docente,
            'subjects' => array_values($subjects),
        ];
    }

    private function serializeFamilyRequestRow(array $row): array
    {
        /** @var Docente|null $docente */
        $docente = $this->em->getRepository(Docente::class)->find($row['docente_id'] ?? 0);

        return [
            'id' => (int) $row['id'],
            'slotId' => (int) $row['colloquio_id'],
            'appointmentAt' => $row['appuntamento']?->format('H:i'),
            'status' => (string) $row['stato'],
            'statusLabel' => $this->statusLabel((string) $row['stato']),
            'message' => (string) ($row['messaggio'] ?? ''),
            'date' => $row['data']?->format('Y-m-d'),
            'displayDate' => $row['data']?->format('d/m/Y'),
            'mode' => $this->tipoLabel((string) $row['tipo']),
            'location' => (string) ($row['luogo'] ?? ''),
            'teacher' => $docente ? (string) $docente : 'Docente',
        ];
    }

    private function serializeFamilyRequest(RichiestaColloquio $richiesta): array
    {
        return [
            'id' => $richiesta->getId(),
            'slotId' => $richiesta->getColloquio()?->getId(),
            'appointmentAt' => $richiesta->getAppuntamento()?->format('H:i'),
            'status' => $richiesta->getStato(),
            'statusLabel' => $this->statusLabel((string) $richiesta->getStato()),
            'message' => (string) ($richiesta->getMessaggio() ?? ''),
            'date' => $richiesta->getColloquio()?->getData()?->format('Y-m-d'),
            'displayDate' => $richiesta->getColloquio()?->getData()?->format('d/m/Y'),
            'mode' => $this->tipoLabel((string) $richiesta->getColloquio()?->getTipo()),
            'location' => (string) ($richiesta->getColloquio()?->getLuogo() ?? ''),
            'teacher' => (string) ($richiesta->getColloquio()?->getDocente() ?? 'Docente'),
        ];
    }

    private function serializeSlotRow(array $row): array
    {
        /** @var Colloquio $colloquio */
        $colloquio = $row['ricevimento'];

        return [
            'id' => $colloquio->getId(),
            'date' => $colloquio->getData()?->format('Y-m-d'),
            'displayDate' => $colloquio->getData()?->format('d/m/Y'),
            'startTime' => $colloquio->getInizio()?->format('H:i'),
            'endTime' => $colloquio->getFine()?->format('H:i'),
            'mode' => $this->tipoLabel($colloquio->getTipo()),
            'location' => (string) ($colloquio->getLuogo() ?? ''),
            'capacity' => (int) $colloquio->getNumero(),
            'booked' => (int) $row['richieste'],
            'available' => max(0, (int) $colloquio->getNumero() - (int) $row['richieste']),
        ];
    }

    private function serializeTeacherAppointment(int $id, array $ricevimento): array
    {
        return [
            'id' => $id,
            'mode' => $this->tipoLabel((string) $ricevimento['tipo']),
            'date' => $ricevimento['data']?->format('Y-m-d'),
            'displayDate' => $ricevimento['data']?->format('d/m/Y'),
            'startTime' => $ricevimento['inizio']?->format('H:i'),
            'endTime' => $ricevimento['fine']?->format('H:i'),
            'location' => (string) ($ricevimento['luogo'] ?? ''),
            'capacity' => (int) $ricevimento['numero'],
            'booked' => (int) $ricevimento['valide'],
            'requests' => array_map(
                fn (array $row) => [
                    'id' => (int) $row['id'],
                    'appointmentAt' => $row['appuntamento']?->format('H:i'),
                    'status' => (string) $row['stato'],
                    'statusLabel' => $this->statusLabel((string) $row['stato']),
                    'message' => (string) ($row['messaggio'] ?? ''),
                    'student' => (string) $row['alunno'],
                    'className' => (string) ($row['classe'] ?? ''),
                ],
                $ricevimento['prenotazioni'] ?? [],
            ),
        ];
    }

    private function serializeTeacherHistory(int $id, array $ricevimento): array
    {
        return [
            'id' => $id,
            'enabled' => (bool) $ricevimento['abilitato'],
            'mode' => $this->tipoLabel((string) $ricevimento['tipo']),
            'date' => $ricevimento['data']?->format('Y-m-d'),
            'displayDate' => $ricevimento['data']?->format('d/m/Y'),
            'startTime' => $ricevimento['inizio']?->format('H:i'),
            'endTime' => $ricevimento['fine']?->format('H:i'),
            'location' => (string) ($ricevimento['luogo'] ?? ''),
            'requests' => array_map(
                fn (array $row) => [
                    'appointmentAt' => $row['appuntamento']?->format('H:i'),
                    'status' => (string) $row['stato'],
                    'statusLabel' => $this->statusLabel((string) $row['stato']),
                    'student' => (string) $row['alunno'],
                    'className' => (string) ($row['classe'] ?? ''),
                ],
                $ricevimento['prenotazioni'] ?? [],
            ),
        ];
    }

    private function serializeTeacherRequest(RichiestaColloquio $richiesta): array
    {
        return [
            'id' => $richiesta->getId(),
            'appointmentAt' => $richiesta->getAppuntamento()?->format('H:i'),
            'status' => $richiesta->getStato(),
            'statusLabel' => $this->statusLabel((string) $richiesta->getStato()),
            'message' => (string) ($richiesta->getMessaggio() ?? ''),
            'student' => trim(($richiesta->getAlunno()?->getCognome() ?? '').' '.($richiesta->getAlunno()?->getNome() ?? '')),
            'className' => $richiesta->getAlunno()?->getClasse() ? (string) $richiesta->getAlunno()?->getClasse() : '',
            'date' => $richiesta->getColloquio()?->getData()?->format('Y-m-d'),
            'displayDate' => $richiesta->getColloquio()?->getData()?->format('d/m/Y'),
            'mode' => $this->tipoLabel((string) $richiesta->getColloquio()?->getTipo()),
            'location' => (string) ($richiesta->getColloquio()?->getLuogo() ?? ''),
        ];
    }

    private function serializeManagementItem(int $id, array $row): array
    {
        /** @var Colloquio $colloquio */
        $colloquio = $row['ricevimento'];
        $today = new DateTime('today');

        return [
            'id' => $id,
            'date' => $colloquio->getData()?->format('Y-m-d'),
            'displayDate' => $colloquio->getData()?->format('d/m/Y'),
            'startTime' => $colloquio->getInizio()?->format('H:i'),
            'endTime' => $colloquio->getFine()?->format('H:i'),
            'type' => $colloquio->getTipo(),
            'mode' => $this->tipoLabel($colloquio->getTipo()),
            'location' => (string) ($colloquio->getLuogo() ?? ''),
            'duration' => (int) $colloquio->getDurata(),
            'capacity' => (int) $colloquio->getNumero(),
            'requestCount' => (int) $row['richieste'],
            'enabled' => (bool) $colloquio->getAbilitato(),
            'canEdit' => $colloquio->getData() >= $today,
            'canToggle' => $colloquio->getData() >= $today && (int) $row['richieste'] === 0,
        ];
    }

    private function serializeManagementEntity(Colloquio $colloquio): array
    {
        return [
            'id' => $colloquio->getId(),
            'date' => $colloquio->getData()?->format('Y-m-d'),
            'displayDate' => $colloquio->getData()?->format('d/m/Y'),
            'startTime' => $colloquio->getInizio()?->format('H:i'),
            'endTime' => $colloquio->getFine()?->format('H:i'),
            'type' => $colloquio->getTipo(),
            'mode' => $this->tipoLabel($colloquio->getTipo()),
            'location' => (string) ($colloquio->getLuogo() ?? ''),
            'duration' => (int) $colloquio->getDurata(),
            'capacity' => (int) $colloquio->getNumero(),
            'enabled' => (bool) $colloquio->getAbilitato(),
        ];
    }

    private function schoolYearStart(): DateTime
    {
        $value = (string) $this->requestStack->getSession()->get('/CONFIG/SCUOLA/anno_inizio');
        return DateTime::createFromFormat('Y-m-d', $value) ?: new DateTime('today');
    }

    private function colloquiEnd(): DateTime
    {
        $value = (string) $this->requestStack->getSession()->get('/CONFIG/SCUOLA/fine_colloqui');
        return DateTime::createFromFormat('Y-m-d', $value) ?: new DateTime('today');
    }

    private function parseDate(string $value): DateTime
    {
        $data = DateTime::createFromFormat('Y-m-d', $value);
        if (!$data) {
            throw new \RuntimeException('Data non valida.');
        }

        return $data;
    }

    private function parseTime(string $value): DateTime
    {
        $time = DateTime::createFromFormat('H:i', $value);
        if (!$time) {
            throw new \RuntimeException('Orario non valido.');
        }

        return $time;
    }

    private function normalizeLocation(string $tipo, string $luogo): string
    {
        if ($tipo !== 'D') {
            return $luogo;
        }
        if ($luogo === '' || str_ends_with($luogo, 'meet.google.com/') || str_ends_with($luogo, 'meet.google.com')) {
            throw new \RuntimeException('Link colloquio non valido.');
        }
        if (!str_starts_with($luogo, 'https://') && !str_starts_with($luogo, 'http://')) {
            return 'https://'.$luogo;
        }

        return $luogo;
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'R' => 'In attesa',
            'C' => 'Confermato',
            'N' => 'Rifiutato',
            'A' => 'Annullato',
            default => $status,
        };
    }

    private function tipoLabel(string $tipo): string
    {
        return $tipo === 'D' ? 'A distanza' : 'In presenza';
    }
}
