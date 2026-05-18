<?php

namespace App\Service;

use App\Entity\Avviso;
use App\Entity\Cattedra;
use App\Entity\Circolare;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Festivita;
use App\Entity\Materia;
use App\Entity\ScansioneOraria;
use App\Util\RegistroUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use IntlDateFormatter;

class RegistroFirmeService
{
    public function __construct(
        private EntityManagerInterface $em,
        private RegistroUtil $registroUtil,
    ) {}

    public function build(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        string $vista,
    ): array {
        [$cattedra, $classe, $materia] = $this->resolveContext($docente, $cattedraId, $classeId);

        $dataObj = DateTime::createFromFormat('Y-m-d', $data) ?: new DateTime();
        $formatter = new IntlDateFormatter('it_IT', IntlDateFormatter::SHORT, IntlDateFormatter::SHORT);
        $formatter->setPattern('EEEE d MMMM yyyy');

        if ($vista === 'M') {
            $dataInizio = DateTime::createFromFormat('Y-m-d', $dataObj->format('Y-m-01'));
            $dataFine = clone $dataInizio;
            $dataFine->modify('last day of this month');
        } else {
            $dataInizio = clone $dataObj;
            $dataFine = clone $dataObj;
        }

        $errore = $this->registroUtil->controlloData($dataObj, $classe->getSede());
        $festiviRaw = $this->registroUtil->listaFestivi($classe->getSede());
        $tabella = $this->registroUtil->tabellaFirmeVista($dataInizio, $dataFine, $docente, $classe, $cattedra);
        $assenti = $vista === 'G' ? $this->registroUtil->listaAssenti($dataObj, $classe) : [];

        $dataSucc = $this->em->getRepository(Festivita::class)->giornoSuccessivo(clone $dataFine);
        $dataPrec = $this->em->getRepository(Festivita::class)->giornoPrecedente(clone $dataInizio);

        $alerts = $this->buildAlerts($classe);

        return [
            'info' => [
                'data' => $dataObj->format('Y-m-d'),
                'dataLabel' => $formatter->format($dataObj),
                'vista' => $vista,
                'errore' => $errore,
                'dataInizio' => $dataInizio->format('Y-m-d'),
                'dataFine' => $dataFine->format('Y-m-d'),
                'dataPrec' => $dataPrec ? $dataPrec->format('Y-m-d') : null,
                'dataSucc' => $dataSucc ? $dataSucc->format('Y-m-d') : null,
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
                'alunnoSostegno' => $cattedra?->getAlunno() ? [
                    'id' => $cattedra->getAlunno()->getId(),
                    'cognome' => $cattedra->getAlunno()->getCognome(),
                    'nome' => $cattedra->getAlunno()->getNome(),
                ] : null,
            ],
            'calendar' => [
                'festivi' => json_decode($festiviRaw, true) ?: [],
            ],
            'alerts' => $alerts,
            'rows' => $this->serializeRows($tabella),
            'assenti' => $this->serializeAssenti($assenti),
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

    private function buildAlerts(Classe $classe): array
    {
        $oggi = new DateTime();
        $adesso = $oggi->format('H:i');

        if ($oggi->format('w') === '0') {
            return ['avvisi' => 0, 'circolari' => []];
        }

        $inizio = $this->em->getRepository(ScansioneOraria::class)->inizioLezioni($oggi, $classe->getSede());
        $fine = $this->em->getRepository(ScansioneOraria::class)->fineLezioni($oggi, $classe->getSede());

        if (!$inizio || !$fine || $adesso < $inizio || $adesso > $fine) {
            return ['avvisi' => 0, 'circolari' => []];
        }

        $circolari = $this->em->getRepository(Circolare::class)->listaCircolariClasse($classe);

        return [
            'avvisi' => $this->em->getRepository(Avviso::class)->numeroClasse($classe),
            'circolari' => array_map(fn (Circolare $circolare) => [
                'id' => $circolare->getId(),
                'titolo' => method_exists($circolare, 'getTitolo') ? $circolare->getTitolo() : (string) $circolare,
            ], $circolari),
        ];
    }

    private function serializeRows(array $tabella): array
    {
        $rows = [];
        foreach ($tabella as $key => $day) {
            $lessons = [];
            foreach (($day['lezioni'] ?? []) as $ora => $lesson) {
                $groups = [];
                foreach (($lesson['materia'] ?? []) as $gruppo => $materia) {
                    $groups[] = [
                        'groupKey' => $gruppo,
                        'materia' => $materia,
                        'argomento' => $lesson['argomenti'][$gruppo] ?? '',
                        'docenti' => $lesson['docenti'][$gruppo] ?? [],
                        'docentiId' => $lesson['docentiId'][$gruppo] ?? [],
                    ];
                }

                $lessons[] = [
                    'ora' => (int) $ora,
                    'inizio' => $lesson['inizio'] ?? null,
                    'fine' => $lesson['fine'] ?? null,
                    'groups' => $groups,
                    'permissions' => [
                        'canAdd' => isset($lesson['add']),
                        'canEdit' => isset($lesson['edit']),
                        'canDelete' => isset($lesson['delete']),
                    ],
                ];
            }

            $rows[] = [
                'date' => $key,
                'error' => $day['errore'] ?? null,
                'lessons' => $lessons,
                'annotazioniCount' => count($day['annotazioni']['lista'] ?? []),
                'noteCount' => count($day['note']['lista'] ?? []),
            ];
        }

        return $rows;
    }

    private function serializeAssenti(array $assenti): array
    {
        $fuoriClasse = array_map(static fn (array $item) => [
            'alunno' => $item['alunno'],
            'oraInizio' => $item['oraInizio']?->format('H:i'),
            'oraFine' => $item['oraFine']?->format('H:i'),
            'tipo' => $item['tipo'],
            'descrizione' => $item['descrizione'],
        ], $assenti['fc'] ?? []);

        return [
            'assenze' => $assenti['assenze'] ?? [],
            'entrate' => $assenti['entrate'] ?? [],
            'uscite' => $assenti['uscite'] ?? [],
            'fuoriClasse' => $fuoriClasse,
        ];
    }
}
