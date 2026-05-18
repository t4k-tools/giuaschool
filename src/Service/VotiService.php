<?php

namespace App\Service;

use App\Entity\Alunno;
use App\Entity\Cattedra;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Materia;
use App\Entity\Valutazione;
use App\Util\GenitoriUtil;
use App\Util\LogHandler;
use App\Util\RegistroUtil;
use App\Util\StaffUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;

class VotiService
{
    public function __construct(
        private EntityManagerInterface $em,
        private RegistroUtil $registroUtil,
        private StaffUtil $staffUtil,
        private GenitoriUtil $genitoriUtil,
        private LogHandler $logHandler,
    ) {}

    public function buildQuadro(Docente $docente, int $cattedraId, ?int $periodo = null, ?int $materiaId = null): array
    {
        $cattedra = $this->resolveCattedra($docente, $cattedraId);
        $periodi = $this->registroUtil->infoPeriodi();
        $periodoSelezionato = $periodo ?: ($this->registroUtil->periodo(new DateTime())['periodo'] ?? 1);
        if (!isset($periodi[$periodoSelezionato])) {
            throw new \RuntimeException('Periodo non valido.');
        }

        $inizio = DateTime::createFromFormat('Y-m-d', $periodi[$periodoSelezionato]['inizio']);
        $fine = DateTime::createFromFormat('Y-m-d', $periodi[$periodoSelezionato]['fine']);
        if ($cattedra->getMateria()->getTipo() === 'S') {
            return $this->buildSupportQuadro($docente, $cattedra, $periodoSelezionato, $periodi, $materiaId);
        }
        $quadro = $this->registroUtil->quadroVoti($inizio, $fine, $docente, $cattedra);

        $students = [];
        foreach ($quadro['alunni'] as $alunnoId => $alunno) {
            $votes = ['S' => [], 'O' => [], 'P' => []];
            foreach (['S', 'O', 'P'] as $tipo) {
                foreach ($quadro['voti'][$alunnoId][$tipo] ?? [] as $vote) {
                    $votes[$tipo][] = [
                        'id' => (int) $vote['id'],
                        'tipo' => $tipo,
                        'displayTipo' => $this->labelTipo($tipo),
                        'data' => $vote['data']->format('Y-m-d'),
                        'displayDate' => $vote['data']->format('d/m/Y'),
                        'ordine' => (int) $vote['ordine'],
                        'argomento' => (string) ($vote['argomento'] ?? ''),
                        'visibile' => (bool) $vote['visibile'],
                        'media' => (bool) $vote['media'],
                        'voto' => $vote['voto'] !== null ? (float) $vote['voto'] : null,
                        'votoText' => $vote['voto_str'] ?? null,
                        'giudizio' => (string) ($vote['giudizio'] ?? ''),
                    ];
                }
            }

            $students[] = [
                'alunnoId' => (int) $alunnoId,
                'displayName' => trim($alunno['cognome'].' '.$alunno['nome']),
                'dataNascita' => $alunno['dataNascita']?->format('Y-m-d'),
                'bes' => (string) ($alunno['bes'] ?? ''),
                'note' => (string) ($alunno['note'] ?? ''),
                'trasferito' => (bool) ($quadro['trasferiti'][$alunnoId] ?? false),
                'averages' => [
                    'S' => $quadro['medie'][$alunnoId]['S'],
                    'O' => $quadro['medie'][$alunnoId]['O'],
                    'P' => $quadro['medie'][$alunnoId]['P'],
                    'T' => $quadro['medie'][$alunnoId]['T'],
                ],
                'votes' => $votes,
            ];
        }

        return [
            'info' => [
                'mode' => 'standard',
                'classe' => [
                    'id' => $cattedra->getClasse()->getId(),
                    'nome' => (string) $cattedra->getClasse(),
                ],
                'cattedra' => [
                    'id' => $cattedra->getId(),
                    'tipo' => $cattedra->getTipo(),
                ],
                'materia' => [
                    'id' => $cattedra->getMateria()->getId(),
                    'nomeBreve' => $cattedra->getMateria()->getNomeBreve(),
                    'tipo' => $cattedra->getMateria()->getTipo(),
                ],
                'periodo' => $periodoSelezionato,
                'canEdit' => $this->registroUtil->azioneVoti(
                    $inizio,
                    $docente,
                    $cattedra->getClasse(),
                    $cattedra->getMateria(),
                    null,
                ),
            ],
            'periods' => array_map(
                static fn (int $key, array $item) => [
                    'id' => $key,
                    'nome' => $item['nome'],
                    'inizio' => $item['inizio'],
                    'fine' => $item['fine'],
                ],
                array_keys($periodi),
                $periodi,
            ),
            'students' => $students,
        ];
    }

    public function createVote(
        Docente $docente,
        int $cattedraId,
        int $alunnoId,
        string $tipo,
        string $data,
        bool $visibile,
        bool $media,
        ?float $voto,
        string $giudizio,
        string $argomento,
        bool $confirmAbsent,
        ?int $materiaId = null,
    ): array {
        [$cattedra, $classe, $alunno, $dataObj, $lezione] = $this->resolveVoteContext(
            $docente,
            $cattedraId,
            $alunnoId,
            $data,
        );
        $tipo = $this->normalizeTipo($tipo);

        $materia = $cattedra->getMateria();
        if ($materia->getTipo() === 'S' && $materiaId !== null) {
            $materiaOverride = $this->em->getRepository(Materia::class)->find($materiaId);
            if ($materiaOverride) {
                $materia = $materiaOverride;
            }
        }

        $this->validateVoteRequest(
            $docente,
            $classe,
            $cattedra,
            $alunno,
            $dataObj,
            $tipo,
            $voto,
            $giudizio,
            $confirmAbsent,
            $lezione,
            $materia,
        );

        $vote = (new Valutazione())
            ->setTipo($tipo)
            ->setDocente($docente)
            ->setAlunno($alunno)
            ->setMateria($materia)
            ->setLezione($lezione)
            ->setVisibile($visibile)
            ->setMedia($visibile ? $media : false)
            ->setArgomento(trim($argomento))
            ->setVoto($this->normalizeVote($voto))
            ->setGiudizio(trim($giudizio))
            ->setOrdine(
                $this->em->getRepository(Valutazione::class)->numeroOrdine(
                    $materia,
                    $alunno,
                    $tipo,
                    $dataObj,
                ),
            );

        $this->em->persist($vote);
        $this->em->flush();
        $this->logHandler->logAzione('VOTI', 'Crea voto API');

        return [
            'message' => 'Voto creato con successo.',
            'data' => ['id' => $vote->getId()],
        ];
    }

    public function updateVote(
        Docente $docente,
        int $voteId,
        string $data,
        bool $visibile,
        bool $media,
        ?float $voto,
        string $giudizio,
        string $argomento,
        bool $confirmAbsent,
    ): array {
        $vote = $this->em->getRepository(Valutazione::class)->findOneBy([
            'id' => $voteId,
            'docente' => $docente,
        ]);
        if (!$vote) {
            throw new \RuntimeException('Voto non trovato.');
        }

        $dataObj = DateTime::createFromFormat('Y-m-d', $data);
        if (!$dataObj) {
            throw new \RuntimeException('Data voto non valida.');
        }

        $classe = $vote->getLezione()->getClasse();
        $alunno = $vote->getAlunno();
        $materia = $vote->getMateria();
        $cattedra = $this->findTeacherCattedraOrSostegno($docente, $classe, $materia);
        $materiaLezione = $cattedra->getMateria()->getTipo() === 'S' ? $cattedra->getMateria() : $materia;
        $lezione = $this->em->getRepository(\App\Entity\Lezione::class)->lezioneVoto($dataObj, $docente, $classe, $materiaLezione);
        $this->validateVoteRequest(
            $docente,
            $classe,
            $cattedra,
            $alunno,
            $dataObj,
            $vote->getTipo(),
            $voto,
            $giudizio,
            $confirmAbsent,
            $lezione,
            $materia,
        );

        if ($vote->getLezione()->getData()->format('Y-m-d') !== $dataObj->format('Y-m-d')) {
            $vote->setOrdine(
                $this->em->getRepository(Valutazione::class)->numeroOrdine(
                    $materia,
                    $alunno,
                    $vote->getTipo(),
                    $dataObj,
                ),
            );
        }

        $vote
            ->setLezione($lezione)
            ->setVisibile($visibile)
            ->setMedia($visibile ? $media : false)
            ->setArgomento(trim($argomento))
            ->setVoto($this->normalizeVote($voto))
            ->setGiudizio(trim($giudizio));

        $this->em->flush();
        $this->logHandler->logAzione('VOTI', 'Modifica voto API');

        return [
            'message' => 'Voto aggiornato con successo.',
            'data' => ['id' => $vote->getId()],
        ];
    }

    public function deleteVote(Docente $docente, int $voteId): array
    {
        $vote = $this->em->getRepository(Valutazione::class)->findOneBy([
            'id' => $voteId,
            'docente' => $docente,
        ]);
        if (!$vote) {
            throw new \RuntimeException('Voto non trovato.');
        }

        $classe = $vote->getLezione()->getClasse();
        $isSostegno = $vote->getMateria()->getTipo() === 'S';
        $canEdit = $isSostegno
            ? $this->canEditVotiSostegno($vote->getLezione()->getData(), $docente, $classe, $vote->getAlunno())
            : $this->registroUtil->azioneVoti($vote->getLezione()->getData(), $docente, $classe, $vote->getMateria(), $vote->getAlunno());
        if (!$canEdit) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $this->em->remove($vote);
        $this->em->flush();
        $this->logHandler->logAzione('VOTI', 'Cancella voto API');

        return [
            'message' => 'Voto rimosso.',
            'data' => ['id' => $voteId],
        ];
    }

    private function resolveCattedra(Docente $docente, int $cattedraId): Cattedra
    {
        $cattedra = $this->em->getRepository(Cattedra::class)->findOneBy([
            'id' => $cattedraId,
            'docente' => $docente,
            'attiva' => true,
        ]);
        if (!$cattedra) {
            throw new \RuntimeException('Cattedra non trovata.');
        }

        return $cattedra;
    }

    private function resolveVoteContext(
        Docente $docente,
        int $cattedraId,
        int $alunnoId,
        string $data,
    ): array {
        $cattedra = $this->resolveCattedra($docente, $cattedraId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data);
        if (!$dataObj) {
            throw new \RuntimeException('Data voto non valida.');
        }
        $alunno = $this->em->getRepository(Alunno::class)->find($alunnoId);
        if (!$alunno) {
            throw new \RuntimeException('Alunno non trovato.');
        }
        $lezione = $this->em->getRepository(\App\Entity\Lezione::class)->lezioneVoto(
            $dataObj,
            $docente,
            $cattedra->getClasse(),
            $cattedra->getMateria(),
        );

        return [$cattedra, $cattedra->getClasse(), $alunno, $dataObj, $lezione];
    }

    private function validateVoteRequest(
        Docente $docente,
        Classe $classe,
        Cattedra $cattedra,
        Alunno $alunno,
        DateTime $dataObj,
        string $tipo,
        ?float $voto,
        string $giudizio,
        bool $confirmAbsent,
        mixed $lezione,
        ?Materia $materiaCheck = null,
    ): void {
        if ($this->registroUtil->controlloData($dataObj, null)) {
            throw new \RuntimeException('Data festiva non consentita.');
        }
        if (!$lezione) {
            throw new \RuntimeException('Lezione non trovata per la data selezionata.');
        }
        $isSostegno = $cattedra->getMateria()->getTipo() === 'S';
        $canEdit = $isSostegno
            ? $this->canEditVotiSostegno($dataObj, $docente, $classe, $alunno)
            : $this->registroUtil->azioneVoti($dataObj, $docente, $classe, $materiaCheck ?? $cattedra->getMateria(), $alunno);
        if (!$canEdit) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }
        if (!in_array($alunno->getId(), $this->registroUtil->alunniInData($dataObj, $classe), true)) {
            throw new \RuntimeException('L\'alunno non appartiene alla classe nella data selezionata.');
        }
        if ($this->normalizeVote($voto) === null && trim($giudizio) === '') {
            throw new \RuntimeException('Inserire almeno un voto o un giudizio.');
        }
        if ($this->em->getRepository(\App\Entity\Lezione::class)->alunnoAssente($lezione, $alunno) && !$confirmAbsent) {
            throw new \RuntimeException('L\'alunno risulta assente nella lezione selezionata. Confermare esplicitamente per proseguire.');
        }
    }

    private function canEditVotiSostegno(DateTime $dataObj, Docente $docente, Classe $classe, ?Alunno $alunno = null): bool
    {
        if ($this->registroUtil->bloccoScrutinio($dataObj, $classe)) {
            return false;
        }
        $oggi = new DateTime();
        if ($dataObj->format('Y-m-d') > $oggi->format('Y-m-d')) {
            return false;
        }
        if ($alunno !== null) {
            if (!in_array($alunno->getId(), $this->registroUtil->alunniInData($dataObj, $classe), true)) {
                return false;
            }
        }

        return (int) $this->em->getRepository(Cattedra::class)->createQueryBuilder('c')
            ->join('c.materia', 'm')
            ->select('COUNT(c.id)')
            ->where('c.docente = :docente AND c.classe = :classe AND c.attiva = true AND m.tipo = :tipo')
            ->setParameter('docente', $docente)
            ->setParameter('classe', $classe)
            ->setParameter('tipo', 'S')
            ->getQuery()
            ->getSingleScalarResult() > 0;
    }

    private function findTeacherCattedraOrSostegno(Docente $docente, Classe $classe, \App\Entity\Materia $materia): Cattedra
    {
        $cattedra = $this->em->getRepository(Cattedra::class)->findOneBy([
            'docente' => $docente,
            'classe' => $classe,
            'materia' => $materia,
            'attiva' => true,
        ]);
        if ($cattedra) {
            return $cattedra;
        }

        $cattedra = $this->em->getRepository(Cattedra::class)->createQueryBuilder('c')
            ->join('c.materia', 'm')
            ->where('c.docente = :docente AND c.classe = :classe AND c.attiva = true AND m.tipo = :tipo')
            ->setParameter('docente', $docente)
            ->setParameter('classe', $classe)
            ->setParameter('tipo', 'S')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if (!$cattedra) {
            throw new \RuntimeException('Cattedra non trovata.');
        }

        return $cattedra;
    }

    private function buildSupportQuadro(
        Docente $docente,
        Cattedra $cattedra,
        int $periodoSelezionato,
        array $periodi,
        ?int $materiaId = null,
    ): array {
        $alunno = $cattedra->getAlunno();
        if (!$alunno) {
            throw new \RuntimeException('La cattedra di sostegno non ha un alunno associato.');
        }

        $classe = $cattedra->getClasse();
        $periodo = $periodi[$periodoSelezionato];
        $materie = $this->genitoriUtil->materie($classe, false);
        $materia = $this->resolveSupportMateria($materie, $materiaId);
        $quadroClasse = $this->staffUtil->voti($classe, $periodo);
        $dettaglioAlunno = $this->genitoriUtil->voti($classe, $materia, $alunno);

        $subjectOptions = array_map(
            static fn (array $item) => [
                'id' => (int) $item['id'],
                'label' => (string) $item['nomeBreve'],
            ],
            $materie,
        );

        $students = [];
        foreach ($quadroClasse['alunni'] as $alunnoId => $row) {
            $bySubject = [];
            foreach ($quadroClasse['materie'] as $materiaRow) {
                $subjectId = (int) $materiaRow['id'];
                $value = $quadroClasse['medie'][$alunnoId][$subjectId] ?? '';
                $bySubject[] = [
                    'subjectId' => $subjectId,
                    'label' => (string) $materiaRow['nomeBreve'],
                    'value' => is_numeric($value) ? round((float) $value, 2) : '',
                ];
            }

            $students[] = [
                'alunnoId' => (int) $alunnoId,
                'displayName' => trim($row['cognome'].' '.$row['nome']),
                'totalAverage' => isset($quadroClasse['medie'][$alunnoId][0]) ? round((float) $quadroClasse['medie'][$alunnoId][0], 2) : '',
                'subjectAverages' => $bySubject,
            ];
        }

        $votePeriods = [];
        foreach ($dettaglioAlunno as $periodName => $subjects) {
            $subjectGroups = [];
            foreach ($subjects as $subjectName => $days) {
                $entries = [];
                foreach ($days as $votes) {
                    foreach ($votes as $vote) {
                        $entries[] = [
                            'id' => (int) $vote['id'],
                            'tipo' => (string) $vote['tipo'],
                            'displayTipo' => $this->labelTipo((string) $vote['tipo']),
                            'docente' => (string) $vote['docente'],
                            'data' => (string) $vote['data'],
                            'displayDate' => (string) $vote['data'],
                            'argomento' => (string) ($vote['argomento'] ?? ''),
                            'voto' => isset($vote['voto']) ? (float) $vote['voto'] : null,
                            'votoText' => ($vote['voto_str'] ?? '') !== '' ? (string) $vote['voto_str'] : null,
                            'giudizio' => (string) ($vote['giudizio'] ?? ''),
                            'media' => (bool) ($vote['media'] ?? false),
                        ];
                    }
                }
                $subjectGroups[] = [
                    'label' => (string) $subjectName,
                    'entries' => $entries,
                ];
            }

            $votePeriods[] = [
                'label' => (string) $periodName,
                'subjects' => $subjectGroups,
            ];
        }

        return [
            'info' => [
                'mode' => 'support',
                'classe' => [
                    'id' => $classe->getId(),
                    'nome' => (string) $classe,
                ],
                'cattedra' => [
                    'id' => $cattedra->getId(),
                    'tipo' => $cattedra->getTipo(),
                ],
                'materia' => [
                    'id' => $cattedra->getMateria()->getId(),
                    'nomeBreve' => $cattedra->getMateria()->getNomeBreve(),
                    'tipo' => $cattedra->getMateria()->getTipo(),
                ],
                'periodo' => $periodoSelezionato,
                'canEdit' => $materia !== null && $this->canEditVotiSostegno(
                    DateTime::createFromFormat('Y-m-d', $periodo['inizio']),
                    $docente,
                    $classe,
                    $alunno,
                ),
            ],
            'periods' => array_map(
                static fn (int $key, array $item) => [
                    'id' => $key,
                    'nome' => $item['nome'],
                    'inizio' => $item['inizio'],
                    'fine' => $item['fine'],
                ],
                array_keys($periodi),
                $periodi,
            ),
            'support' => [
                'alunno' => [
                    'id' => $alunno->getId(),
                    'displayName' => trim($alunno->getCognome().' '.$alunno->getNome()),
                    'bes' => (string) ($alunno->getBes() ?? ''),
                    'note' => (string) ($alunno->getNote() ?? ''),
                ],
                'subjectOptions' => $subjectOptions,
                'selectedSubjectId' => $materia?->getId(),
                'selectedSubjectLabel' => $materia?->getNomeBreve(),
                'classAverages' => [
                    'subjects' => array_map(
                        static fn (array $item) => [
                            'id' => (int) $item['id'],
                            'label' => (string) $item['nomeBreve'],
                        ],
                        $quadroClasse['materie'],
                    ),
                    'students' => $students,
                ],
                'votePeriods' => $votePeriods,
            ],
        ];
    }

    private function resolveSupportMateria(array $materie, ?int $materiaId): ?Materia
    {
        if ($materiaId) {
            foreach ($materie as $materia) {
                if ((int) $materia['id'] === $materiaId) {
                    return $this->em->getRepository(Materia::class)->find($materiaId);
                }
            }

            throw new \RuntimeException('Materia del sostegno non valida.');
        }

        if (empty($materie)) {
            return null;
        }

        return $this->em->getRepository(Materia::class)->find((int) $materie[0]['id']);
    }

    private function normalizeTipo(string $tipo): string
    {
        $tipo = strtoupper(trim($tipo));
        if (!in_array($tipo, ['S', 'O', 'P'], true)) {
            throw new \RuntimeException('Tipo voto non valido.');
        }

        return $tipo;
    }

    private function normalizeVote(?float $voto): ?float
    {
        if ($voto === null || $voto <= 0) {
            return null;
        }

        return max(1, min(10, $voto));
    }

    private function labelTipo(string $tipo): string
    {
        return match ($tipo) {
            'S' => 'Scritto',
            'O' => 'Orale',
            'P' => 'Pratico',
            default => $tipo,
        };
    }
}
