<?php

namespace App\Service;

use App\Entity\Cattedra;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Firma;
use App\Entity\FirmaSostegno;
use App\Entity\Lezione;
use App\Entity\Materia;
use App\Entity\ModuloFormativo;
use App\Entity\AssenzaLezione;
use App\Entity\Valutazione;
use App\Util\HtmlSanitizer;
use App\Util\LogHandler;
use App\Util\RegistroUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\Translation\TranslatorInterface;

class RegistroLezioneCreateService
{
    public function __construct(
        private EntityManagerInterface $em,
        private RegistroUtil $registroUtil,
        private TranslatorInterface $translator,
        private LogHandler $logHandler,
    ) {}

    public function getContext(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
    ): array {
        [$cattedra, $classe, $materia] = $this->resolveContext($docente, $cattedraId, $classeId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        if ($errore) {
            return [
                'supported' => false,
                'action' => [
                    'type' => 'create',
                    'label' => 'Nuova lezione',
                ],
                'reason' => $errore,
                'endOptions' => [],
                'moduliFormativi' => [],
                'materiaOptions' => [],
                'substitutionOptions' => [],
            ];
        }

        $lezioni = $this->findLezioniInOra($classe, $data, $ora);
        [$docentiId, $firmeLezioni] = $this->buildLessonSignatureState($lezioni);
        $controllo = $this->registroUtil->controllaNuovaLezione(
            $cattedra,
            $docente,
            $classe,
            $materia,
            $dataObj,
            $ora,
            $lezioni,
            $firmeLezioni,
        );
        if (!empty($controllo['errore'])) {
            return [
                'supported' => false,
                'action' => [
                    'type' => 'create',
                    'label' => 'Nuova lezione',
                ],
                'reason' => $controllo['errore'],
                'endOptions' => [],
                'moduliFormativi' => [],
                'materiaOptions' => [],
                'substitutionOptions' => [],
            ];
        }

        $endOptions = [];
        $rawEndOptions = $this->registroUtil->lezioneOreConsecutive($dataObj, $ora, $docente, $classe, $materia)['fine'] ?? [];
        foreach ($rawEndOptions as $label => $endOra) {
            $endOptions[] = [
                'label' => $label,
                'ora' => $endOra,
            ];
        }

        return [
            'supported' => true,
            'action' => $this->buildCreateContextAction($lezioni, $controllo),
            'reason' => $this->buildCreateContextNotice($lezioni, $controllo),
            'argomentoDefault' => !empty($controllo['compresenza']) ? ($controllo['compresenza']->getArgomento() ?? '') : '',
            'attivitaDefault' => !empty($controllo['compresenza']) ? ($controllo['compresenza']->getAttivita() ?? '') : '',
            'moduloFormativoDefaultId' => ($cattedra && !empty($controllo['compresenza'])) ? $controllo['compresenza']->getModuloFormativo()?->getId() : null,
            'moduliFormativi' => $cattedra ? $this->serializeModuliFormativi($classe, $materia) : [],
            'materiaOptions' => $cattedra ? [] : $this->serializeMateriaOptions($classe, $materia, $controllo),
            'substitutionOptions' => $cattedra ? [] : $this->serializeSubstitutionOptions($controllo),
            'endOptions' => $endOptions,
            'context' => [
                'classe' => [
                    'id' => $classe->getId(),
                    'nome' => (string) $classe,
                ],
                'cattedra' => $cattedra ? [
                    'id' => $cattedra->getId(),
                    'tipo' => $cattedra->getTipo(),
                ] : null,
                'materia' => [
                    'id' => $materia->getId(),
                    'nomeBreve' => $materia->getNomeBreve(),
                    'tipo' => $materia->getTipo(),
                ],
                'data' => $dataObj->format('Y-m-d'),
                'ora' => $ora,
                'sostituzioneSostegno' => !empty($controllo['sostituzioneSostegno']),
            ],
        ];
    }

    public function create(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
        int $fineOra,
        string $argomento,
        string $attivita,
        ?int $moduloFormativoId = null,
        ?int $materiaId = null,
        ?string $tipoSostituzione = null,
    ): array {
        // sanifica il testo libero: rimuove l'HTML e rende sicuri i link (reso poi con |raw)
        $argomento = HtmlSanitizer::sanitizeMessage($argomento);
        $attivita = HtmlSanitizer::sanitizeMessage($attivita);
        [$cattedra, $classe, $materia] = $this->resolveContext($docente, $cattedraId, $classeId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        if ($errore) {
            throw new \RuntimeException($errore);
        }

        $lezioni = $this->findLezioniInOra($classe, $data, $ora);

        [$docentiId, $firmeLezioni] = $this->buildLessonSignatureState($lezioni);

        if (!$this->registroUtil->azioneLezione('add', $dataObj, $docente, $classe, $docentiId)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        $controllo = $this->registroUtil->controllaNuovaLezione(
            $cattedra,
            $docente,
            $classe,
            $materia,
            $dataObj,
            $ora,
            $lezioni,
            $firmeLezioni,
        );

        if (!empty($controllo['errore'])) {
            throw new \RuntimeException($controllo['errore']);
        }

        if (!$cattedra) {
            [$materia, $tipoGruppo, $gruppo, $classeLezione] = $this->resolveSubstitutionCreateContext(
                $classe,
                $materia,
                $controllo,
                $materiaId,
                $tipoSostituzione,
            );
        } else {
            [$tipoGruppo, $gruppo, $classeLezione] = $this->resolveGroupContext($cattedra, $classe, $materia);
        }

        $trasformazione = count($lezioni) > 0
            ? $this->registroUtil->trasformaNuovaLezione(
                $cattedra,
                $materia,
                $tipoGruppo,
                $gruppo,
                $controllo,
                $lezioni,
                $firmeLezioni,
            )
            : [];

        $validOraSet = array_map(
            static fn (array $item) => (int) $item['ora'],
            $this->getContext($docente, $cattedraId, $classeId, $data, $ora)['endOptions']
        );
        if (!in_array($fineOra, $validOraSet, true)) {
            throw new \RuntimeException('Ora fine non valida per il contesto selezionato.');
        }

        $moduloFormativo = null;
        if ($cattedra && $moduloFormativoId !== null) {
            $moduloFormativo = $this->em->getRepository(ModuloFormativo::class)->find($moduloFormativoId);
        }

        if (!$cattedra && !empty($controllo['sostituzioneMultipla'])) {
            $materia = $controllo['sostituzioneMultipla'];
        }

        $createdLessons = [];
        for ($numOra = $ora; $numOra <= $fineOra; $numOra++) {
            if ($numOra > $ora || empty($trasformazione['lezione'])) {
                $lezione = (new Lezione())
                    ->setData(clone $dataObj)
                    ->setOra($numOra)
                    ->setClasse($classeLezione)
                    ->setGruppo($gruppo)
                    ->setTipoGruppo($tipoGruppo)
                    ->setMateria($materia)
                    ->setSostituzione(!$cattedra);

                if ($materia->getTipo() === 'S') {
                    $lezione
                        ->setArgomento('')
                        ->setAttivita('');
                } else {
                    $lezione
                        ->setArgomento($argomento)
                        ->setAttivita($attivita)
                        ->setModuloFormativo($moduloFormativo);
                }

                $this->em->persist($lezione);

                if ($numOra === $ora && !empty($trasformazione['modifica'])) {
                    foreach ($trasformazione['modifica'] as $prop => $val) {
                        $lezione->{'set'.$prop}($val);
                    }
                }

                $createdLessons[] = $lezione;
            } else {
                $lezione = $trasformazione['lezione'];
                if ($materia->getTipo() !== 'S') {
                    $lezione
                        ->setArgomento($argomento)
                        ->setAttivita($attivita)
                        ->setMateria($materia)
                        ->setModuloFormativo($cattedra ? $moduloFormativo : null);
                }
            }

            if ($materia->getTipo() === 'S') {
                $firma = (new FirmaSostegno())
                    ->setLezione($lezione)
                    ->setDocente($docente)
                    ->setAlunno(empty($controllo['sostituzioneSostegno']) ? $cattedra->getAlunno() : null)
                    ->setArgomento($argomento)
                    ->setAttivita($attivita);
            } else {
                $firma = (new Firma())
                    ->setLezione($lezione)
                    ->setDocente($docente);
            }

            $this->em->persist($firma);
        }

        // persist the lesson(s)/firma and recalculate the absence hours atomically: a failure
        // in the recalculation must roll back the lesson too, otherwise a retry would double
        // the gs_assenza_lezione rows (ricalcolaOreLezione only inserts, it is not idempotent)
        $this->em->wrapInTransaction(function () use ($createdLessons, $trasformazione, $dataObj): void {
            $this->em->flush();

            foreach ($createdLessons as $lezione) {
                $this->registroUtil->ricalcolaOreLezione($dataObj, $lezione);
            }

            if (!empty($trasformazione['assenze'])) {
                foreach ($trasformazione['assenze'] as $lezioneAssenze) {
                    $this->registroUtil->ricalcolaOreLezione($dataObj, $lezioneAssenze);
                }
            }
        });

        $this->logHandler->logAzione('REGISTRO', 'Crea lezione API');

        return [
            'message' => 'Lezione creata con successo.',
            'data' => [
                'created' => count($createdLessons),
                'lessonIds' => array_map(static fn (Lezione $lezione) => $lezione->getId(), $createdLessons),
            ],
        ];
    }

    public function getEditContext(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
    ): array {
        $state = $this->resolveOwnedLessonState($docente, $cattedraId, $classeId, $data, $ora, 'edit');
        $firmaDocente = $state['firmaDocente'];
        $lezioneDocente = $state['lezioneDocente'];
        $firmeStessaLezione = $state['firmeStessaLezione'];
        $isSostegno = $firmaDocente instanceof FirmaSostegno;

        $canUseModuloFormativo = !$isSostegno && $state['cattedra'] !== null;
        $isSharedLesson = count($firmeStessaLezione) > 1;

        return [
            'supported' => true,
            'reason' => $isSharedLesson
                ? 'Lezione condivisa: le modifiche su argomento, attività e modulo formativo si applicano alla lezione comune.'
                : null,
            'argomento' => $isSostegno ? ($firmaDocente->getArgomento() ?? '') : ($lezioneDocente->getArgomento() ?? ''),
            'attivita' => $isSostegno ? ($firmaDocente->getAttivita() ?? '') : ($lezioneDocente->getAttivita() ?? ''),
            'moduloFormativoId' => $canUseModuloFormativo ? $lezioneDocente->getModuloFormativo()?->getId() : null,
            'moduliFormativi' => $canUseModuloFormativo ? $this->serializeModuliFormativi($state['classe'], $lezioneDocente->getMateria()) : [],
            'context' => [
                'classe' => [
                    'id' => $lezioneDocente->getClasse()->getId(),
                    'nome' => (string) $lezioneDocente->getClasse(),
                ],
                'materia' => [
                    'id' => $lezioneDocente->getMateria()->getId(),
                    'nomeBreve' => $lezioneDocente->getMateria()->getNomeBreve(),
                    'tipo' => $lezioneDocente->getMateria()->getTipo(),
                ],
                'data' => $data,
                'ora' => $ora,
            ],
        ];
    }

    public function update(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
        string $argomento,
        string $attivita,
        ?int $moduloFormativoId = null,
    ): array {
        // sanifica il testo libero: rimuove l'HTML e rende sicuri i link (reso poi con |raw)
        $argomento = HtmlSanitizer::sanitizeMessage($argomento);
        $attivita = HtmlSanitizer::sanitizeMessage($attivita);
        $state = $this->resolveOwnedLessonState($docente, $cattedraId, $classeId, $data, $ora, 'edit');
        $firmaDocente = $state['firmaDocente'];
        $lezioneDocente = $state['lezioneDocente'];
        $isSharedLesson = count($state['firmeStessaLezione']) > 1;

        if ($firmaDocente instanceof FirmaSostegno) {
            $firmaDocente
                ->setArgomento($argomento)
                ->setAttivita($attivita);
        } else {
            $lezioneDocente
                ->setArgomento($argomento)
                ->setAttivita($attivita)
                ->setModuloFormativo(null);

            if ($state['cattedra'] !== null && $moduloFormativoId !== null) {
                $modulo = $this->em->getRepository(ModuloFormativo::class)->find($moduloFormativoId);
                if (!$modulo) {
                    throw new \RuntimeException('Modulo formativo non trovato.');
                }
                $lezioneDocente->setModuloFormativo($modulo);
            }
        }

        $this->em->flush();
        $this->logHandler->logAzione('REGISTRO', 'Modifica lezione API');

        return [
            'message' => $isSharedLesson
                ? 'Lezione condivisa aggiornata con successo.'
                : 'Lezione aggiornata con successo.',
            'data' => [
                'lessonId' => $lezioneDocente->getId(),
                'sharedLesson' => $isSharedLesson,
            ],
        ];
    }

    public function getDeleteContext(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
    ): array {
        $state = $this->resolveOwnedLessonState($docente, $cattedraId, $classeId, $data, $ora, 'delete');
        $firmeStessaLezione = $state['firmeStessaLezione'];
        $lezioneDocente = $state['lezioneDocente'];
        $isShared = count($firmeStessaLezione) > 1;

        return [
            'supported' => true,
            'isShared' => $isShared,
            'message' => $isShared
                ? 'Lezione condivisa: verrà rimossa solo la tua firma. La lezione resterà con gli altri docenti.'
                : 'La lezione e le relative assenze verranno eliminate definitivamente.',
            'context' => [
                'classe' => ['nome' => (string) $lezioneDocente->getClasse()],
                'materia' => ['nomeBreve' => $lezioneDocente->getMateria()->getNomeBreve()],
                'data' => $data,
                'ora' => $ora,
            ],
        ];
    }

    public function delete(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
    ): array {
        $state = $this->resolveOwnedLessonState($docente, $cattedraId, $classeId, $data, $ora, 'delete');
        $firmaDocente = $state['firmaDocente'];
        $lezioneDocente = $state['lezioneDocente'];
        $firmeStessaLezione = $state['firmeStessaLezione'];
        $firmeLezioni = $state['firmeLezioni'];
        $lezioni = $state['lezioni'];
        $tipoLezione = $lezioneDocente->getTipoGruppo().':'.$lezioneDocente->getGruppo();

        $voti = $this->em->getRepository(Valutazione::class)->findBy([
            'lezione' => $lezioneDocente,
            'docente' => $docente,
        ]);
        if (count($voti) > 0) {
            $altraLezione = $this->findAlternativeLessonForTeacherVotes($docente, $state['classe'], $data, $lezioneDocente);
            if (!$altraLezione) {
                throw new \RuntimeException('La lezione contiene voti collegati e non può essere cancellata dal refactor.');
            }
            foreach ($voti as $voto) {
                $voto->setLezione($altraLezione);
            }
        }

        $firmeSostegno = 0;
        $firmeNoSostegno = 0;
        foreach ($firmeLezioni as $firme) {
            foreach ($firme as $firma) {
                if ($firma->getId() === $firmaDocente->getId()) {
                    continue;
                }
                if ($firma instanceof FirmaSostegno) {
                    $firmeSostegno++;
                } else {
                    $firmeNoSostegno++;
                }
            }
        }

        $recalculateLesson = null;
        $deleteAssenzeLessonIds = [];
        $this->em->remove($firmaDocente);

        if (count($firmeStessaLezione) === 1) {
            $deleteAssenzeLessonIds[] = $lezioneDocente->getId();
            $this->em->remove($lezioneDocente);
        } elseif ($firmaDocente instanceof FirmaSostegno) {
            if ($tipoLezione[0] !== 'N' && count($firmeLezioni[$tipoLezione] ?? []) === 1) {
                $deleteAssenzeLessonIds[] = $lezioneDocente->getId();
                $this->em->remove($lezioneDocente);
            }
        } else {
            $sostegno = $this->em->getRepository(Materia::class)->findOneByTipo('S');
            if (!$sostegno) {
                throw new \RuntimeException('Materia sostegno non trovata.');
            }

            if ($tipoLezione === 'N:') {
                if ($firmeNoSostegno === 0) {
                    $lezioneDocente
                        ->setMateria($sostegno)
                        ->setArgomento('')
                        ->setAttivita('');
                    $recalculateLesson = $lezioneDocente;
                }
            } else {
                if ($firmeNoSostegno > 0 && count($firmeLezioni[$tipoLezione] ?? []) === 1) {
                    $deleteAssenzeLessonIds[] = $lezioneDocente->getId();
                    $this->em->remove($lezioneDocente);
                } elseif ($firmeNoSostegno > 0) {
                    $soloSostegno = true;
                    foreach ($firmeLezioni[$tipoLezione] ?? [] as $firma) {
                        if (!($firma instanceof FirmaSostegno) && $firma->getId() !== $firmaDocente->getId()) {
                            $soloSostegno = false;
                            break;
                        }
                    }
                    if ($soloSostegno) {
                        $lezioneDocente
                            ->setMateria($sostegno)
                            ->setArgomento('')
                            ->setAttivita('');
                    }
                } elseif ($firmeNoSostegno === 0) {
                    $nuovaClasse = $this->findCommonClass($state['classe']);
                    $lezioneDocente
                        ->setClasse($nuovaClasse)
                        ->setTipoGruppo('N')
                        ->setGruppo('')
                        ->setMateria($sostegno)
                        ->setArgomento('')
                        ->setAttivita('');
                    $recalculateLesson = $lezioneDocente;
                    $deleteAssenzeLessonIds = array_map(
                        static fn (Lezione $lezione) => $lezione->getId(),
                        $lezioni,
                    );

                    foreach ($firmeLezioni as $tipoGruppo => $firme) {
                        if ($tipoGruppo === $tipoLezione) {
                            continue;
                        }
                        $vecchiaLezione = $firme[0]->getLezione();
                        foreach ($firme as $firma) {
                            $firma->setLezione($lezioneDocente);
                        }
                        $this->em->remove($vecchiaLezione);
                    }
                }
            }
        }

        // delete the orphaned absence-hour rows, persist the changes and recalculate
        // atomically: the DQL delete writes immediately, so without the transaction a later
        // failure would leave those rows gone and the recalculation half-done
        $this->em->wrapInTransaction(function () use ($deleteAssenzeLessonIds, $recalculateLesson, $data): void {
            if (count($deleteAssenzeLessonIds) > 0) {
                $this->em->getRepository(AssenzaLezione::class)->createQueryBuilder('al')
                    ->delete()
                    ->where('al.lezione IN (:lezioni)')
                    ->setParameter('lezioni', array_values(array_unique($deleteAssenzeLessonIds)))
                    ->getQuery()
                    ->execute();
            }

            $this->em->flush();

            if ($recalculateLesson) {
                $this->registroUtil->ricalcolaOreLezione(DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime(), $recalculateLesson);
            }
        });
        $this->logHandler->logAzione('REGISTRO', 'Cancella lezione API');

        return [
            'message' => count($firmeStessaLezione) > 1
                ? 'Firma rimossa dalla lezione condivisa.'
                : 'Lezione cancellata con successo.',
            'data' => [
                'deletedLessonId' => $lezioneDocente->getId(),
                'deletedOnlySignature' => count($firmeStessaLezione) > 1,
            ],
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

        throw new \RuntimeException('Contesto lezione non valido.');
    }

    private function findLezioniInOra(Classe $classe, string $data, int $ora): array
    {
        return $this->em->getRepository(Lezione::class)->createQueryBuilder('l')
            ->join('l.classe', 'c')
            ->where('l.data = :data AND l.ora = :ora AND c.anno = :anno AND c.sezione = :sezione')
            ->setParameter('data', $data)
            ->setParameter('ora', $ora)
            ->setParameter('anno', $classe->getAnno())
            ->setParameter('sezione', $classe->getSezione())
            ->orderBy('l.gruppo')
            ->getQuery()
            ->getResult();
    }

    private function resolveOwnedLessonState(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        int $ora,
        string $azione,
    ): array {
        [$cattedra, $classe] = $this->resolveContext($docente, $cattedraId, $classeId);
        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        if ($errore) {
            throw new \RuntimeException($errore);
        }

        $lezioni = $this->findLezioniInOra($classe, $data, $ora);
        if (count($lezioni) === 0) {
            throw new \RuntimeException('Nessuna lezione trovata nello slot selezionato.');
        }

        $docentiId = [];
        $firmaDocente = null;
        $lezioneDocente = null;
        $firmeStessaLezione = [];
        $firmeLezioni = [];

        foreach ($lezioni as $lezione) {
            $gruppo = $lezione->getTipoGruppo().':'.$lezione->getGruppo();
            $firme = $this->em->getRepository(Firma::class)->createQueryBuilder('f')
                ->join('f.docente', 'd')
                ->where('f.lezione = :lezione')
                ->setParameter('lezione', $lezione)
                ->getQuery()
                ->getResult();
            $firmeLezioni[$gruppo] = $firme;

            foreach ($firme as $firma) {
                $docentiId[$gruppo][] = $firma->getDocente()->getId();
                if ($firma->getDocente()->getId() === $docente->getId()) {
                    $firmaDocente = $firma;
                    $lezioneDocente = $lezione;
                    $firmeStessaLezione = $firme;
                }
            }
        }

        if (!$firmaDocente || !$lezioneDocente) {
            throw new \RuntimeException('La firma del docente non è presente nello slot selezionato.');
        }

        if (!$this->registroUtil->azioneLezione($azione, $dataObj, $docente, $classe, $docentiId)) {
            throw new \RuntimeException('Azione non consentita per questa data.');
        }

        return [
            'cattedra' => $cattedra,
            'classe' => $classe,
            'lezioni' => $lezioni,
            'firmeLezioni' => $firmeLezioni,
            'firmaDocente' => $firmaDocente,
            'lezioneDocente' => $lezioneDocente,
            'firmeStessaLezione' => $firmeStessaLezione,
        ];
    }

    private function findAlternativeLessonForTeacherVotes(
        Docente $docente,
        Classe $classe,
        string $data,
        Lezione $lezioneDocente,
    ): ?Lezione {
        return $this->em->getRepository(Lezione::class)->createQueryBuilder('l')
            ->join(Firma::class, 'f', 'WITH', 'l.id = f.lezione')
            ->where('l.id != :id AND l.data = :data AND l.classe = :classe AND l.gruppo = :gruppo AND l.tipoGruppo = :tipoGruppo AND l.materia = :materia AND f.docente = :docente')
            ->setParameter('id', $lezioneDocente)
            ->setParameter('data', $data)
            ->setParameter('classe', $classe)
            ->setParameter('gruppo', $lezioneDocente->getGruppo())
            ->setParameter('tipoGruppo', $lezioneDocente->getTipoGruppo())
            ->setParameter('materia', $lezioneDocente->getMateria())
            ->setParameter('docente', $docente)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    private function findCommonClass(Classe $classe): Classe
    {
        if (empty($classe->getGruppo())) {
            return $classe;
        }

        return $this->em->getRepository(Classe::class)->createQueryBuilder('c')
            ->where("c.anno = :anno AND c.sezione = :sezione AND (c.gruppo = '' OR c.gruppo IS NULL)")
            ->setParameter('anno', $classe->getAnno())
            ->setParameter('sezione', $classe->getSezione())
            ->getQuery()
            ->setMaxResults(1)
            ->getOneOrNullResult() ?? $classe;
    }

    private function serializeModuliFormativi(Classe $classe, Materia $materia): array
    {
        if ($materia->getTipo() === 'S') {
            return [];
        }

        $options = [];
        foreach ($this->em->getRepository(ModuloFormativo::class)->opzioni($classe->getAnno()) as $label => $modulo) {
            if ($modulo instanceof ModuloFormativo) {
                $options[] = [
                    'id' => $modulo->getId(),
                    'label' => $label,
                ];
            }
        }

        return $options;
    }

    private function buildCreateContextNotice(array $lezioni, array $controllo): ?string
    {
        if (count($lezioni) === 0) {
            return null;
        }

        if (!empty($controllo['compresenza'])) {
            return 'Lo slot contiene già una lezione compatibile: il refactor firmerà la lezione esistente in compresenza.';
        }

        if (!empty($controllo['trasforma'])) {
            return 'Lo slot contiene già una lezione compatibile: il refactor applicherà una trasformazione sullo slot prima di aggiungere la firma.';
        }

        return null;
    }

    private function buildCreateContextAction(array $lezioni, array $controllo): array
    {
        if (count($lezioni) === 0) {
            return [
                'type' => 'create',
                'label' => 'Nuova lezione',
            ];
        }

        if (!empty($controllo['compresenza'])) {
            return [
                'type' => 'co_sign',
                'label' => 'Firma in compresenza',
            ];
        }

        return [
            'type' => 'transform',
            'label' => 'Trasformazione slot',
        ];
    }

    private function buildLessonSignatureState(array $lezioni): array
    {
        $docentiId = [];
        $firmeLezioni = [];

        foreach ($lezioni as $lezione) {
            $gruppoLezione = $lezione->getTipoGruppo().':'.$lezione->getGruppo();
            $firme = $this->em->getRepository(Firma::class)->createQueryBuilder('f')
                ->join('f.docente', 'd')
                ->where('f.lezione = :lezione')
                ->setParameter('lezione', $lezione)
                ->getQuery()
                ->getResult();
            $firmeLezioni[$gruppoLezione] = $firme;
            foreach ($firme as $firma) {
                $docentiId[$gruppoLezione][] = $firma->getDocente()->getId();
            }
        }

        return [$docentiId, $firmeLezioni];
    }

    private function serializeMateriaOptions(Classe $classe, Materia $defaultMateria, array $controllo): array
    {
        if (!empty($controllo['sostituzioneSostegno'])) {
            $sostegno = $this->em->getRepository(Materia::class)->findOneByTipo('S');
            if (!$sostegno) {
                return [];
            }

            return [[
                'id' => $sostegno->getId(),
                'label' => $sostegno->getNome(),
            ]];
        }

        if (!empty($controllo['sostituzioneNA']) || !empty($controllo['sostituzioneMultipla'])) {
            return [[
                'id' => $defaultMateria->getId(),
                'label' => $defaultMateria->getNome(),
            ]];
        }

        $options = [[
            'id' => $defaultMateria->getId(),
            'label' => $defaultMateria->getNome(),
        ]];
        foreach ($this->em->getRepository(Materia::class)->materieClasse($classe, true, true, 'V')['lista'] ?? [] as $materia) {
            if ((int) $materia['id'] === $defaultMateria->getId()) {
                continue;
            }
            $options[] = [
                'id' => (int) $materia['id'],
                'label' => (string) $materia['nome'],
            ];
        }

        return $options;
    }

    private function serializeSubstitutionOptions(array $controllo): array
    {
        $options = [];
        foreach (($controllo['sostituzione'] ?? []) as $label => $value) {
            $options[] = [
                'value' => (string) $value,
                'label' => (string) $label,
            ];
        }

        return $options;
    }

    private function resolveSubstitutionCreateContext(
        Classe $classe,
        Materia $defaultMateria,
        array $controllo,
        ?int $materiaId,
        ?string $tipoSostituzione,
    ): array {
        if (!empty($controllo['sostituzioneSostegno'])) {
            $sostegno = $this->em->getRepository(Materia::class)->findOneByTipo('S');
            if (!$sostegno) {
                throw new \RuntimeException('Materia sostegno non trovata.');
            }
            $tipoGruppo = empty($classe->getGruppo()) ? 'N' : 'C';
            $gruppo = empty($classe->getGruppo()) ? '' : ($classe->getGruppo() ?? '');

            return [$sostegno, $tipoGruppo, $gruppo, $classe];
        }

        $materia = $defaultMateria;
        if ($materiaId !== null && empty($controllo['sostituzioneNA']) && empty($controllo['sostituzioneMultipla'])) {
            $materiaEntity = $this->em->getRepository(Materia::class)->find($materiaId);
            if (!$materiaEntity) {
                throw new \RuntimeException('Materia non trovata.');
            }
            $materia = $materiaEntity;
        }

        if (empty($classe->getGruppo())) {
            $availableTypes = array_map(
                static fn (array $item) => (string) $item['value'],
                $this->serializeSubstitutionOptions($controllo),
            );
            $selectedType = $tipoSostituzione ?: ($availableTypes[0] ?? 'T');
            if (!in_array($selectedType, $availableTypes, true)) {
                throw new \RuntimeException('Tipo sostituzione non valido.');
            }

            if ($selectedType === 'T') {
                return [$materia, 'N', '', $classe];
            }

            return [$materia, 'R', $selectedType, $classe];
        }

        return [$materia, 'C', $classe->getGruppo() ?? '', $classe];
    }

    private function resolveGroupContext(?Cattedra $cattedra, Classe $classe, Materia $materia): array
    {
        if ($cattedra && $materia->getTipo() === 'R') {
            return ['R', $cattedra->getTipo() === 'N' ? 'S' : 'A', $classe];
        }

        if ($materia->getTipo() === 'S') {
            $classeComune = $classe;
            if (!empty($classe->getGruppo())) {
                $classeComune = $this->em->getRepository(Classe::class)->createQueryBuilder('c')
                    ->where("c.anno = :anno AND c.sezione = :sezione AND (c.gruppo = '' OR c.gruppo IS NULL)")
                    ->setParameter('anno', $classe->getAnno())
                    ->setParameter('sezione', $classe->getSezione())
                    ->getQuery()
                    ->setMaxResults(1)
                    ->getOneOrNullResult() ?? $classe;
            }

            return ['N', '', $classeComune];
        }

        return [$classe->getGruppo() ? 'C' : 'N', $classe->getGruppo() ?? '', $classe];
    }
}
