<?php

namespace App\Service;

use App\Entity\Alunno;
use App\Entity\Assenza;
use App\Entity\Cattedra;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Entrata;
use App\Entity\Materia;
use App\Entity\Presenza;
use App\Entity\Uscita;
use App\Util\LogHandler;
use App\Util\RegistroUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use IntlDateFormatter;
use Symfony\Component\HttpFoundation\RequestStack;

class RegistroAssenzeService
{
    public function __construct(
        private EntityManagerInterface $em,
        private RegistroUtil $registroUtil,
        private LogHandler $logHandler,
        private RequestStack $requestStack,
    ) {}

    public function buildDaily(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
    ): array {
        [$cattedra, $classe, $materia] = $this->resolveContext($docente, $cattedraId, $classeId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();
        $formatter = new IntlDateFormatter('it_IT', IntlDateFormatter::SHORT, IntlDateFormatter::SHORT);
        $formatter->setPattern('EEEE d MMMM yyyy');

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        $quadro = $this->registroUtil->quadroAssenzeVista($dataObj, $dataObj, $docente, $classe, $cattedra);
        $day = $quadro[$dataObj->format('Y-m-d')] ?? [];

        $religione = $this->resolveReligioneGruppo($cattedra);
        [$appelloList, $listaFC, $noAppello] = $this->registroUtil->elencoAppello($dataObj, $classe, $religione);

        return [
            'info' => [
                'data' => $dataObj->format('Y-m-d'),
                'dataLabel' => $formatter->format($dataObj),
                'errore' => $errore,
                'classe' => [
                    'id' => $classe->getId(),
                    'nome' => (string) $classe,
                ],
                'cattedra' => $cattedra ? [
                    'id' => $cattedra->getId(),
                    'tipo' => $cattedra->getTipo(),
                ] : null,
                'materia' => [
                    'id' => $materia?->getId(),
                    'nomeBreve' => $materia?->getNomeBreve(),
                    'tipo' => $materia?->getTipo(),
                ],
                'appello' => [
                    'enabled' => !$errore && !$noAppello && $this->registroUtil->azioneAssenze($dataObj, $docente, null, $classe, $materia),
                    'reason' => $noAppello ? 'L\'appello non è disponibile se sono già presenti entrate o uscite.' : null,
                ],
            ],
            'students' => $this->serializeStudentRows($day['lista'] ?? [], $listaFC),
            'attendanceDraft' => $this->serializeAppelloDraft($appelloList),
        ];
    }

    public function saveAppello(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        array $entries,
    ): array {
        [$cattedra, $classe, $materia] = $this->resolveContext($docente, $cattedraId, $classeId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        if ($errore) {
            throw new \RuntimeException($errore);
        }

        if (!$this->registroUtil->azioneAssenze($dataObj, $docente, null, $classe, $materia)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $religione = $this->resolveReligioneGruppo($cattedra);
        [$appelloList, $listaFC, $noAppello] = $this->registroUtil->elencoAppello($dataObj, $classe, $religione);
        if ($noAppello) {
            throw new \RuntimeException('L\'appello non è disponibile se sono già presenti entrate o uscite.');
        }

        $validIds = array_map(static fn (array $row) => (int) $row['alunnoId'], $this->serializeAppelloDraft($appelloList));
        $alunniRicalcolo = [];

        foreach ($entries as $entry) {
            $alunnoId = (int) ($entry['alunnoId'] ?? 0);
            $presenza = strtoupper(trim((string) ($entry['presenza'] ?? '')));
            if (!in_array($alunnoId, $validIds, true)) {
                throw new \RuntimeException('Alunno non valido per il contesto selezionato.');
            }
            if (!in_array($presenza, ['P', 'A'], true)) {
                throw new \RuntimeException('Stato presenza non valido.');
            }

            $alunno = $this->em->getRepository(Alunno::class)->find($alunnoId);
            if (!$alunno) {
                continue;
            }

            $alunniRicalcolo[$alunnoId] = $alunno;

            $assenza = $this->em->getRepository(Assenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
            $entrata = $this->em->getRepository(Entrata::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
            $uscita = $this->em->getRepository(Uscita::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
            $presenzaFc = $this->em->getRepository(Presenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);

            if ($presenza === 'A') {
                if ($presenzaFc || isset($listaFC[$alunnoId])) {
                    throw new \RuntimeException('Non è possibile segnare assente un alunno fuori classe.');
                }
                if (!$assenza) {
                    $assenza = (new Assenza())
                        ->setData(clone $dataObj)
                        ->setAlunno($alunno)
                        ->setDocente($docente);
                    $this->em->persist($assenza);
                }
                if ($entrata) {
                    $this->em->remove($entrata);
                }
                if ($uscita) {
                    $this->em->remove($uscita);
                }
            } else {
                if ($assenza) {
                    $this->em->remove($assenza);
                }
                if ($entrata) {
                    $this->em->remove($entrata);
                }
                if ($uscita) {
                    $this->em->remove($uscita);
                }
            }
        }

        $this->em->flush();

        foreach ($alunniRicalcolo as $alunno) {
            $this->registroUtil->ricalcolaOreAlunno($dataObj, $alunno);
        }

        $this->logHandler->logAzione('ASSENZE', 'Appello API');

        return [
            'message' => 'Appello salvato con successo.',
            'data' => [
                'updated' => count($alunniRicalcolo),
            ],
        ];
    }

    public function toggleAssenza(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
    ): array {
        [$cattedra, $classe, $materia, $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);

        if (!$this->registroUtil->azioneAssenze($dataObj, $docente, $alunno, $classe, $materia)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $presenza = $this->em->getRepository(Presenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if ($presenza) {
            throw new \RuntimeException('Non è possibile impostare l\'assenza se esiste una presenza fuori classe.');
        }

        $assenza = $this->em->getRepository(Assenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        $entrata = $this->em->getRepository(Entrata::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        $uscita = $this->em->getRepository(Uscita::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);

        if ($assenza) {
            $this->em->remove($assenza);
            $action = 'Cancella assenza API';
            $message = 'Assenza rimossa.';
        } else {
            $assenza = (new Assenza())
                ->setData(clone $dataObj)
                ->setAlunno($alunno)
                ->setDocente($docente);
            $this->em->persist($assenza);
            if ($entrata) {
                $this->em->remove($entrata);
            }
            if ($uscita) {
                $this->em->remove($uscita);
            }
            $action = 'Crea assenza API';
            $message = 'Assenza registrata.';
        }

        $this->em->flush();
        $this->registroUtil->ricalcolaOreAlunno($dataObj, $alunno);
        $this->logHandler->logAzione('ASSENZE', $action);

        return [
            'message' => $message,
            'data' => [
                'alunnoId' => $alunnoId,
            ],
        ];
    }

    public function upsertEntrata(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
        string $ora,
        bool $valido,
        string $note,
    ): array {
        [$cattedra, $classe, $materia, $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);
        if (!$this->registroUtil->azioneAssenze($dataObj, $docente, $alunno, $classe, $materia)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $orario = $this->registroUtil->orarioInData($dataObj, $classe->getSede());
        $oraObj = $this->parseTime($ora);
        if (!$oraObj || $oraObj->format('H:i:00') <= $orario[0]['inizio'] || $oraObj->format('H:i:00') > $orario[count($orario) - 1]['fine']) {
            throw new \RuntimeException('Ora di entrata fuori dai limiti di orario.');
        }

        $presenza = $this->em->getRepository(Presenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if ($presenza && !$presenza->getOraInizio()) {
            throw new \RuntimeException('La presenza fuori classe non è coerente con un ritardo.');
        }
        if ($presenza && $presenza->getOraInizio() && $presenza->getOraInizio() < $oraObj) {
            throw new \RuntimeException('L\'orario di entrata è successivo all\'inizio del fuori classe.');
        }

        $entrata = $this->em->getRepository(Entrata::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        $isNew = !$entrata;
        if (!$entrata) {
            $entrata = (new Entrata())
                ->setData(clone $dataObj)
                ->setAlunno($alunno)
                ->setDocente($docente);
            $this->em->persist($entrata);
        }

        $entrata
            ->setOra($oraObj)
            ->setNote($note)
            ->setValido($valido)
            ->setDocente($docente)
            ->setRitardoBreve(false)
            ->setGiustificato(null)
            ->setDocenteGiustifica(null);

        $inizio = DateTime::createFromFormat('Y-m-d H:i:s', '1970-01-01 '.$orario[0]['inizio']);
        $inizio->modify('+' . $this->requestStack->getSession()->get('/CONFIG/SCUOLA/ritardo_breve', 0) . 'minutes');
        if ($oraObj <= $inizio) {
            $entrata
                ->setRitardoBreve(true)
                ->setGiustificato(clone $dataObj)
                ->setDocenteGiustifica(null)
                ->setValido(false);
        }

        $assenza = $this->em->getRepository(Assenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if ($assenza) {
            $this->em->remove($assenza);
        }

        $this->em->flush();
        $this->registroUtil->ricalcolaOreAlunno($dataObj, $alunno);
        $this->logHandler->logAzione('ASSENZE', $isNew ? 'Crea entrata API' : 'Modifica entrata API');

        return [
            'message' => 'Entrata registrata con successo.',
            'data' => [
                'alunnoId' => $alunnoId,
            ],
        ];
    }

    public function deleteEntrata(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
    ): array {
        [, $classe, $materia, $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);
        if (!$this->registroUtil->azioneAssenze($dataObj, $docente, $alunno, $classe, $materia)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $entrata = $this->em->getRepository(Entrata::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if (!$entrata) {
            throw new \RuntimeException('Entrata non trovata.');
        }

        $this->em->remove($entrata);
        $this->em->flush();
        $this->registroUtil->ricalcolaOreAlunno($dataObj, $alunno);
        $this->logHandler->logAzione('ASSENZE', 'Cancella entrata API');

        return [
            'message' => 'Entrata rimossa.',
            'data' => ['alunnoId' => $alunnoId],
        ];
    }

    public function upsertUscita(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
        string $ora,
        bool $valido,
        string $note,
    ): array {
        [, $classe, $materia, $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);
        if (!$this->registroUtil->azioneAssenze($dataObj, $docente, $alunno, $classe, $materia)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $orario = $this->registroUtil->orarioInData($dataObj, $classe->getSede());
        $oraObj = $this->parseTime($ora);
        if (!$oraObj || $oraObj->format('H:i:00') < $orario[0]['inizio'] || $oraObj->format('H:i:00') >= $orario[count($orario) - 1]['fine']) {
            throw new \RuntimeException('Ora di uscita fuori dai limiti di orario.');
        }

        $presenza = $this->em->getRepository(Presenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if ($presenza && !$presenza->getOraFine()) {
            throw new \RuntimeException('La presenza fuori classe non è coerente con un\'uscita.');
        }
        if ($presenza && $presenza->getOraFine() && $presenza->getOraFine() > $oraObj) {
            throw new \RuntimeException('L\'orario di uscita è precedente alla fine del fuori classe.');
        }

        $uscita = $this->em->getRepository(Uscita::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        $isNew = !$uscita;
        if (!$uscita) {
            $uscita = (new Uscita())
                ->setData(clone $dataObj)
                ->setAlunno($alunno)
                ->setDocente($docente);
            $this->em->persist($uscita);
        }

        $uscita
            ->setOra($oraObj)
            ->setNote($note)
            ->setValido($valido)
            ->setDocente($docente)
            ->setGiustificato(null)
            ->setDocenteGiustifica(null);

        $assenza = $this->em->getRepository(Assenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if ($assenza) {
            $this->em->remove($assenza);
        }

        $this->em->flush();
        $this->registroUtil->ricalcolaOreAlunno($dataObj, $alunno);
        $this->logHandler->logAzione('ASSENZE', $isNew ? 'Crea uscita API' : 'Modifica uscita API');

        return [
            'message' => 'Uscita registrata con successo.',
            'data' => [
                'alunnoId' => $alunnoId,
            ],
        ];
    }

    public function deleteUscita(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
    ): array {
        [, $classe, $materia, $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);
        if (!$this->registroUtil->azioneAssenze($dataObj, $docente, $alunno, $classe, $materia)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $uscita = $this->em->getRepository(Uscita::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if (!$uscita) {
            throw new \RuntimeException('Uscita non trovata.');
        }

        $this->em->remove($uscita);
        $this->em->flush();
        $this->registroUtil->ricalcolaOreAlunno($dataObj, $alunno);
        $this->logHandler->logAzione('ASSENZE', 'Cancella uscita API');

        return [
            'message' => 'Uscita rimossa.',
            'data' => ['alunnoId' => $alunnoId],
        ];
    }

    public function upsertFuoriClasse(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
        string $oraTipo,
        ?string $oraInizio,
        ?string $oraFine,
        string $tipo,
        string $descrizione,
    ): array {
        [, $classe, , $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);
        if (!$this->registroUtil->azionePresenze($dataObj, $docente, $alunno, $classe)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $assenza = $this->em->getRepository(Assenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if ($assenza) {
            throw new \RuntimeException('Non è possibile impostare il fuori classe se l\'alunno risulta assente.');
        }

        $entrata = $this->em->getRepository(Entrata::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        $uscita = $this->em->getRepository(Uscita::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);

        $oraInizioObj = $oraInizio ? $this->parseTime($oraInizio) : null;
        $oraFineObj = $oraFine ? $this->parseTime($oraFine) : null;
        if ($oraTipo === 'G' && ($oraInizioObj || $oraFineObj)) {
            throw new \RuntimeException('Il tipo giornata intera non ammette orari specifici.');
        }
        if ($oraTipo === 'F' && (!$oraInizioObj || $oraFineObj)) {
            throw new \RuntimeException('Per il tipo fino a fine giornata serve solo l\'ora di inizio.');
        }
        if ($oraTipo === 'I' && (!$oraInizioObj || !$oraFineObj || $oraInizioObj > $oraFineObj)) {
            throw new \RuntimeException('Intervallo fuori classe non valido.');
        }
        if ($oraTipo === 'G' && ($entrata || $uscita)) {
            throw new \RuntimeException('Il fuori classe giornaliero non è compatibile con entrate o uscite presenti.');
        }
        if ($entrata && $oraInizioObj && $entrata->getOra() > $oraInizioObj) {
            throw new \RuntimeException('L\'orario di entrata è successivo all\'inizio del fuori classe.');
        }
        if ($uscita && $oraFineObj && $uscita->getOra() < $oraFineObj) {
            throw new \RuntimeException('L\'orario di uscita è precedente alla fine del fuori classe.');
        }

        $presenza = $this->em->getRepository(Presenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        $isNew = !$presenza;
        if (!$presenza) {
            $presenza = (new Presenza())
                ->setData(clone $dataObj)
                ->setAlunno($alunno);
            $this->em->persist($presenza);
        }

        $presenza
            ->setOraInizio(match ($oraTipo) {
                'G' => null,
                'F' => $oraInizioObj,
                default => $oraInizioObj,
            })
            ->setOraFine(match ($oraTipo) {
                'I' => $oraFineObj,
                default => null,
            })
            ->setTipo($tipo)
            ->setDescrizione($descrizione);

        $this->em->flush();
        $this->logHandler->logAzione('PRESENZE', $isNew ? 'Aggiunge presenza API' : 'Modifica presenza API');

        return [
            'message' => 'Fuori classe registrato con successo.',
            'data' => ['alunnoId' => $alunnoId],
        ];
    }

    public function deleteFuoriClasse(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
    ): array {
        [, $classe, , $dataObj, $alunno] = $this->resolveStudentContext($docente, $cattedraId, $classeId, $data, $alunnoId);
        if (!$this->registroUtil->azionePresenze($dataObj, $docente, $alunno, $classe)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $presenza = $this->em->getRepository(Presenza::class)->findOneBy(['alunno' => $alunno, 'data' => $dataObj]);
        if (!$presenza) {
            throw new \RuntimeException('Presenza fuori classe non trovata.');
        }

        $this->em->remove($presenza);
        $this->em->flush();
        $this->logHandler->logAzione('PRESENZE', 'Cancella presenza API');

        return [
            'message' => 'Fuori classe rimosso.',
            'data' => ['alunnoId' => $alunnoId],
        ];
    }

    private function resolveContext(Docente $docente, ?int $cattedraId, ?int $classeId): array
    {
        if ($cattedraId) {
            $cattedra = $this->em->getRepository(Cattedra::class)->findOneBy([
                'id' => $cattedraId,
                'docente' => $docente,
                'attiva' => 1,
            ]);
            if (!$cattedra) {
                throw new \RuntimeException('Cattedra non trovata.');
            }

            return [$cattedra, $cattedra->getClasse(), $cattedra->getMateria()];
        }

        if ($classeId) {
            $classe = $this->em->getRepository(Classe::class)->find($classeId);
            if (!$classe) {
                throw new \RuntimeException('Classe non trovata.');
            }

            $materia = $this->em->getRepository(Materia::class)->findOneByTipo('U');
            if (!$materia) {
                throw new \RuntimeException('Materia di sostituzione non trovata.');
            }

            return [null, $classe, $materia];
        }

        throw new \RuntimeException('Contesto lezioni mancante.');
    }

    private function resolveStudentContext(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $alunnoId,
    ): array {
        [$cattedra, $classe, $materia] = $this->resolveContext($docente, $cattedraId, $classeId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        if ($errore) {
            throw new \RuntimeException($errore);
        }

        $alunno = $this->em->getRepository(Alunno::class)->findOneBy([
            'id' => $alunnoId,
            'classe' => $classe,
        ]);
        if (!$alunno) {
            throw new \RuntimeException('Alunno non trovato nella classe selezionata.');
        }

        return [$cattedra, $classe, $materia, $dataObj, $alunno];
    }

    private function parseTime(?string $value): ?DateTime
    {
        if (!$value) {
            return null;
        }

        return DateTime::createFromFormat('H:i', $value)
            ?: DateTime::createFromFormat('H:i:s', $value)
            ?: null;
    }

    private function resolveReligioneGruppo(?Cattedra $cattedra): string
    {
        if (!$cattedra || $cattedra->getMateria()->getTipo() !== 'R') {
            return '';
        }

        return $cattedra->getTipo() === 'A' ? 'A' : 'S';
    }

    private function serializeStudentRows(array $students, array $listaFC): array
    {
        return array_map(static function (array $student) use ($listaFC) {
            $alunnoId = (int) $student['id_alunno'];
            $fuoriClasse = isset($listaFC[$alunnoId]) ? [
                'oraInizio' => $listaFC[$alunnoId]['oraInizio']?->format('H:i'),
                'oraFine' => $listaFC[$alunnoId]['oraFine']?->format('H:i'),
                'tipo' => $listaFC[$alunnoId]['tipo'],
                'descrizione' => $listaFC[$alunnoId]['descrizione'],
            ] : null;

            return [
                'alunnoId' => $alunnoId,
                'cognome' => $student['cognome'],
                'nome' => $student['nome'],
                'displayName' => trim($student['cognome'].' '.$student['nome']),
                'assenzaId' => $student['id_assenza'] ? (int) $student['id_assenza'] : null,
                'entrataId' => $student['id_entrata'] ? (int) $student['id_entrata'] : null,
                'uscitaId' => $student['id_uscita'] ? (int) $student['id_uscita'] : null,
                'presenzaId' => $student['id_presenza'] ? (int) $student['id_presenza'] : null,
                'status' => $student['id_assenza'] ? 'ASSENTE' : ($student['id_presenza'] ? 'FUORI_CLASSE' : 'PRESENTE'),
                'giustificazioni' => [
                    'assenze' => (int) ($student['giustifica_assenze'] ?? 0),
                    'ritardi' => (int) ($student['giustifica_ritardi'] ?? 0),
                    'uscite' => (int) ($student['giustifica_uscite'] ?? 0),
                    'convalide' => (int) ($student['convalide'] ?? 0),
                ],
                'ritardiPeriodo' => (int) ($student['ritardi'] ?? 0),
                'uscitePeriodo' => (int) ($student['uscite'] ?? 0),
                'entrata' => $student['ora_entrata'] ? [
                    'ora' => $student['ora_entrata']->format('H:i'),
                    'note' => (string) ($student['note_entrata'] ?? ''),
                    'valido' => (bool) ($student['valido_entrata'] ?? false),
                    'ritardoBreve' => (bool) ($student['ritardoBreve'] ?? false),
                ] : null,
                'uscita' => $student['ora_uscita'] ? [
                    'ora' => $student['ora_uscita']->format('H:i'),
                    'note' => (string) ($student['note_uscita'] ?? ''),
                    'valido' => (bool) ($student['valido_uscita'] ?? false),
                ] : null,
                'fuoriClasse' => $fuoriClasse,
            ];
        }, $students);
    }

    private function serializeAppelloDraft(array $appelloList): array
    {
        $draft = [];
        foreach ($appelloList as $id => $appello) {
            $draft[] = [
                'alunnoId' => (int) $id,
                'displayName' => $appello->getAlunno(),
                'presenza' => $appello->getPresenza(),
                'ora' => $appello->getOra()?->format('H:i'),
            ];
        }

        return $draft;
    }
}
