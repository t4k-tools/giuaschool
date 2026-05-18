<?php

namespace App\Service;

use App\Entity\Alunno;
use App\Entity\Classe;
use App\Entity\Esito;
use App\Entity\Genitore;
use App\Entity\Scrutinio;
use App\Entity\Utente;
use App\Util\GenitoriUtil;
use App\Util\RegistroUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class FamigliaService
{
    public function __construct(
        private GenitoriUtil $genitoriUtil,
        private RegistroUtil $registroUtil,
        private EntityManagerInterface $em,
        private RequestStack $requestStack,
    ) {}

    public function getDashboard(Utente $utente): array
    {
        $alunno = $this->resolveAlunno($utente);
        $classe = $this->registroUtil->classeInData(new DateTime(), $alunno);
        if (!$classe) {
            throw new \RuntimeException('Classe alunno non disponibile.');
        }

        $lezioni = $this->genitoriUtil->lezioni(new DateTime(), $classe, $alunno);
        $voti = $this->genitoriUtil->voti($classe, null, $alunno);
        $assenze = $this->genitoriUtil->assenze($classe, $alunno);
        $note = $this->genitoriUtil->note($classe, $alunno);
        $osservazioni = $utente instanceof Genitore
            ? $this->genitoriUtil->osservazioni($alunno)
            : [];

        return [
            'student' => [
                'id' => $alunno->getId(),
                'name' => trim($alunno->getCognome().' '.$alunno->getNome()),
                'className' => (string) $classe,
                'supportsJustification' => $this->genitoriUtil->giusticazioneOnline($utente),
            ],
            'overview' => [
                'lessonsToday' => count($lezioni['lezioni'] ?? []),
                'recentVotes' => count($this->flattenVotes($voti)),
                'absenceHours' => (float) ($assenze['stat']['ore'] ?? 0),
                'notesCount' => count($this->flattenNotes($note)),
                'pendingJustifications' => count($assenze['evidenza']['assenza'] ?? [])
                    + count($assenze['evidenza']['ritardo'] ?? [])
                    + count($assenze['evidenza']['uscita'] ?? []),
            ],
            'lessons' => $this->serializeLessons($lezioni),
            'votes' => [
                'groups' => $this->serializeVotes($voti),
                'recent' => array_slice($this->flattenVotes($voti), 0, 12),
            ],
            'absences' => $this->serializeAbsences($assenze),
            'notes' => [
                'groups' => $this->serializeNotes($note),
                'recent' => array_slice($this->flattenNotes($note), 0, 12),
            ],
            'observations' => [
                'groups' => $this->serializeObservations($osservazioni),
                'recent' => array_slice($this->flattenObservations($osservazioni), 0, 12),
            ],
        ];
    }

    public function getPagelle(Utente $utente, ?string $periodo = null): array
    {
        $alunno = $this->resolveAlunno($utente);
        $classe = $alunno->getClasse();
        $periodi = $this->genitoriUtil->pagelleAlunno($alunno, $classe);
        if (count($periodi) === 0) {
            throw new \RuntimeException('Nessuna pagella disponibile.');
        }

        $selected = $periodi[0];
        if ($periodo) {
            foreach ($periodi as $item) {
                if ($item[0] === $periodo) {
                    $selected = $item;
                    break;
                }
            }
        }

        $selectedCode = (string) $selected[0];
        $selectedData = $selectedCode === 'A'
            ? $this->genitoriUtil->pagellePrecedenti($alunno)
            : $this->genitoriUtil->pagelle($selected[1]->getClasse(), $alunno, $selectedCode);

        if (($selectedData['esito'] ?? null) instanceof Esito &&
            $this->requestStack->getSession()->get('/APP/UTENTE/tipo_accesso', '') !== 'alias') {
            $this->em->getRepository(Esito::class)->presaVisione($selectedData['esito'], $utente);
        }

        return [
            'student' => [
                'id' => $alunno->getId(),
                'name' => trim($alunno->getCognome().' '.$alunno->getNome()),
                'className' => $classe ? (string) $classe : null,
            ],
            'periods' => array_map(
                fn (array $item) => $this->serializePagellaPeriod($item[0], $item[1], $selectedCode === $item[0]),
                $periodi,
            ),
            'selectedPeriod' => $selectedCode,
            'detail' => $this->serializePagellaDetail($selectedCode, $selectedData),
        ];
    }

    private function resolveAlunno(Utente $utente): Alunno
    {
        if ($utente instanceof Alunno) {
            return $utente;
        }
        if ($utente instanceof Genitore) {
            $alunno = $this->genitoriUtil->alunno($utente);
            if ($alunno instanceof Alunno) {
                return $alunno;
            }
        }

        throw new \RuntimeException('Utente non abilitato per l’area famiglia.');
    }

    private function serializeLessons(array $lezioni): array
    {
        $items = [];
        foreach ($lezioni['lezioni'] ?? [] as $ora => $row) {
            $groups = [];
            foreach ($row['materia'] ?? [] as $key => $materia) {
                $groups[] = [
                    'key' => (string) $key,
                    'subject' => (string) $materia,
                    'argomento' => (string) (($row['argomenti'][$key] ?? '')),
                    'attivita' => (string) (($row['attivita'][$key] ?? '')),
                    'sostegno' => (string) (($row['sostegno'][$key] ?? '')),
                ];
            }
            $items[] = [
                'ora' => (int) $ora,
                'startTime' => (string) ($row['inizio'] ?? ''),
                'endTime' => (string) ($row['fine'] ?? ''),
                'groups' => $groups,
            ];
        }

        return [
            'items' => $items,
            'annotations' => array_values($lezioni['annotazioni'] ?? []),
        ];
    }

    private function serializeVotes(array $voti): array
    {
        $groups = [];
        foreach ($voti as $periodo => $materie) {
            $subjects = [];
            foreach ($materie as $materia => $dates) {
                $entries = [];
                foreach ($dates as $date => $rows) {
                    foreach ($rows as $row) {
                        $entries[] = [
                            'date' => $date,
                            'displayDate' => (string) ($row['data'] ?? ''),
                            'teacher' => (string) ($row['docente'] ?? ''),
                            'type' => (string) ($row['tipo'] ?? ''),
                            'argomento' => (string) ($row['argomento'] ?? ''),
                            'voto' => $row['voto'] !== null ? (float) $row['voto'] : null,
                            'votoLabel' => (string) ($row['voto_str'] ?? ''),
                            'giudizio' => (string) ($row['giudizio'] ?? ''),
                            'media' => (bool) ($row['media'] ?? false),
                        ];
                    }
                }
                $subjects[] = [
                    'subject' => (string) $materia,
                    'entries' => $entries,
                ];
            }
            $groups[] = [
                'period' => (string) $periodo,
                'subjects' => $subjects,
            ];
        }

        return $groups;
    }

    private function serializeAbsences(array $assenze): array
    {
        $periods = [];
        foreach ($assenze['lista'] ?? [] as $periodo => $dates) {
            $entries = [];
            foreach ($dates as $key => $row) {
                $entries[] = [
                    'date' => (string) $key,
                    'assenza' => $row['assenza'] ?? null,
                    'ritardo' => $row['ritardo'] ?? null,
                    'uscita' => $row['uscita'] ?? null,
                    'fuoriClasse' => $row['fc'] ?? null,
                ];
            }
            $periods[] = [
                'period' => (string) $periodo,
                'entries' => $entries,
            ];
        }

        return [
            'stats' => [
                'assenze' => (int) ($assenze['stat']['assenze'] ?? 0),
                'brevi' => (int) ($assenze['stat']['brevi'] ?? 0),
                'ritardi' => (int) ($assenze['stat']['ritardi'] ?? 0),
                'ritardiValidi' => (int) ($assenze['stat']['ritardi_validi'] ?? 0),
                'uscite' => (int) ($assenze['stat']['uscite'] ?? 0),
                'usciteValide' => (int) ($assenze['stat']['uscite_valide'] ?? 0),
                'ore' => (float) ($assenze['stat']['ore'] ?? 0),
                'orePerc' => (float) ($assenze['stat']['ore_perc'] ?? 0),
                'livello' => (string) ($assenze['stat']['livello'] ?? 'default'),
            ],
            'highlights' => [
                'assenza' => array_values($assenze['evidenza']['assenza'] ?? []),
                'ritardo' => array_values($assenze['evidenza']['ritardo'] ?? []),
                'uscita' => array_values($assenze['evidenza']['uscita'] ?? []),
            ],
            'periods' => $periods,
        ];
    }

    private function serializeNotes(array $note): array
    {
        $groups = [];
        foreach ($note as $periodo => $dates) {
            $entries = [];
            foreach ($dates as $date => $types) {
                foreach (['classe', 'individuale'] as $tipo) {
                    foreach ($types[$tipo] ?? [] as $item) {
                        $entries[] = [
                            'date' => $date,
                            'displayDate' => (string) ($item['data'] ?? ''),
                            'type' => $tipo,
                            'text' => (string) ($item['nota'] ?? ''),
                            'teacher' => (string) ($item['nota_doc'] ?? ''),
                            'provvedimento' => (string) ($item['provvedimento'] ?? ''),
                            'provvedimentoDoc' => (string) ($item['provvedimento_doc'] ?? ''),
                        ];
                    }
                }
            }
            $groups[] = [
                'period' => (string) $periodo,
                'entries' => $entries,
            ];
        }

        return $groups;
    }

    private function serializeObservations(array $osservazioni): array
    {
        $groups = [];
        foreach ($osservazioni as $periodo => $dates) {
            $entries = [];
            foreach ($dates as $date => $items) {
                foreach ($items as $item) {
                    $entries[] = [
                        'date' => $date,
                        'displayDate' => (string) ($item['data'] ?? ''),
                        'subject' => (string) ($item['materia'] ?? ''),
                        'teacher' => (string) ($item['docente'] ?? ''),
                        'text' => (string) ($item['testo'] ?? ''),
                    ];
                }
            }
            $groups[] = [
                'period' => (string) $periodo,
                'entries' => $entries,
            ];
        }

        return $groups;
    }

    private function flattenVotes(array $groups): array
    {
        $items = [];
        foreach ($this->serializeVotes($groups) as $period) {
            foreach ($period['subjects'] as $subject) {
                foreach ($subject['entries'] as $entry) {
                    $items[] = [
                        'period' => $period['period'],
                        'subject' => $subject['subject'],
                        ...$entry,
                    ];
                }
            }
        }
        usort($items, static fn (array $a, array $b) => strcmp((string) $b['date'], (string) $a['date']));

        return $items;
    }

    private function flattenNotes(array $groups): array
    {
        $items = [];
        foreach ($this->serializeNotes($groups) as $period) {
            foreach ($period['entries'] as $entry) {
                $items[] = [
                    'period' => $period['period'],
                    ...$entry,
                ];
            }
        }
        usort($items, static fn (array $a, array $b) => strcmp((string) $b['date'], (string) $a['date']));

        return $items;
    }

    private function flattenObservations(array $groups): array
    {
        $items = [];
        foreach ($this->serializeObservations($groups) as $period) {
            foreach ($period['entries'] as $entry) {
                $items[] = [
                    'period' => $period['period'],
                    ...$entry,
                ];
            }
        }
        usort($items, static fn (array $a, array $b) => strcmp((string) $b['date'], (string) $a['date']));

        return $items;
    }

    private function serializePagellaPeriod(string $code, object $raw, bool $selected): array
    {
        $label = match ($code) {
            'A' => 'Anno precedente',
            'P' => 'Primo periodo',
            'S' => 'Secondo periodo',
            'F' => 'Finale',
            'G' => 'Giudizio sospesi',
            'R' => 'Recupero',
            'X' => 'Rinvio scrutinio',
            default => $code,
        };

        return [
            'code' => $code,
            'label' => $label,
            'selected' => $selected,
            'className' => $raw instanceof Scrutinio ? (string) $raw->getClasse() : null,
        ];
    }

    private function serializePagellaDetail(string $periodo, array $data): array
    {
        $subjects = [];
        if (isset($data['voti']) && is_array($data['voti'])) {
            foreach ($data['voti'] as $key => $value) {
                if (is_array($value) && isset($value['unico'])) {
                    $subjects[] = [
                        'subjectId' => is_numeric((string) $key) ? (int) $key : null,
                        'subject' => (string) ($data['materie'][$key]['nome'] ?? $data['materie'][$key]['nomeBreve'] ?? 'Materia'),
                        'tipo' => (string) ($data['materie'][$key]['tipo'] ?? ''),
                        'grade' => $value['unico'],
                        'assenze' => $value['assenze'] ?? null,
                        'debito' => $data['debiti'][$key] ?? null,
                    ];
                } elseif (is_object($value) && method_exists($value, 'getMateria')) {
                    $subjects[] = [
                        'subjectId' => $value->getMateria()?->getId(),
                        'subject' => (string) $value->getMateria()?->getNome(),
                        'tipo' => (string) $value->getMateria()?->getTipo(),
                        'grade' => method_exists($value, 'getUnico') ? $value->getUnico() : null,
                        'assenze' => method_exists($value, 'getAssenze') ? $value->getAssenze() : null,
                        'debito' => method_exists($value, 'getCarenze') ? $value->getCarenze() : null,
                    ];
                }
            }
        }

        $esito = $data['esito'] ?? null;
        $esitoLabel = $esito instanceof Esito ? $this->mapEsito($esito->getEsito()) : null;

        return [
            'period' => $periodo,
            'hasHistoricalData' => $periodo === 'A',
            'esito' => [
                'code' => $esito instanceof Esito ? $esito->getEsito() : null,
                'label' => $esitoLabel,
                'media' => $esito instanceof Esito ? $esito->getMedia() : null,
                'credito' => $esito instanceof Esito ? $esito->getCredito() : null,
                'creditoPrecedente' => $esito instanceof Esito ? $esito->getCreditoPrecedente() : null,
            ],
            'flags' => [
                'carenze' => !empty($data['carenze']),
                'noscrutinato' => !empty($data['noscrutinato']),
                'estero' => !empty($data['estero']),
                'rinviato' => !empty($data['rinviato']),
                'cittadinanza' => !empty($data['cittadinanza']),
            ],
            'subjects' => $subjects,
        ];
    }

    private function mapEsito(?string $code): ?string
    {
        return match ($code) {
            'A' => 'Ammesso',
            'N' => 'Non ammesso',
            'S' => 'Sospeso',
            'R' => 'Ritirato',
            'L' => 'Superamento limite assenze',
            'E' => 'Anno all’estero',
            'X' => 'Scrutinio rimandato',
            default => $code,
        };
    }
}
