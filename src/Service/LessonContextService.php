<?php

namespace App\Service;

use App\Entity\Cattedra;
use App\Entity\Classe;
use App\Entity\Docente;
use Doctrine\ORM\EntityManagerInterface;

class LessonContextService
{
    public function __construct(
        private EntityManagerInterface $em,
    ) {}

    public function buildForDocente(Docente $docente): array
    {
        $cattedre = $this->em->getRepository(Cattedra::class)->createQueryBuilder('c')
            ->join('c.classe', 'cl')
            ->join('c.materia', 'm')
            ->where('c.docente = :docente AND c.attiva = :attiva')
            ->orderBy('cl.sede, cl.anno, cl.sezione, cl.gruppo, m.nomeBreve', 'ASC')
            ->setParameter('docente', $docente)
            ->setParameter('attiva', true)
            ->getQuery()
            ->getResult();

        $classi = $this->em->getRepository(Classe::class)->createQueryBuilder('cl')
            ->orderBy('cl.sede, cl.sezione, cl.anno, cl.gruppo', 'ASC')
            ->getQuery()
            ->getResult();

        $serializedCattedre = array_map([$this, 'serializeCattedra'], $cattedre);
        $serializedClassi = array_map([$this, 'serializeClasse'], $classi);

        $defaultSelection = [
            'mode' => null,
            'cattedraId' => null,
            'classeId' => null,
        ];

        if (!empty($serializedCattedre)) {
            $defaultSelection = [
                'mode' => 'cattedra',
                'cattedraId' => $serializedCattedre[0]['id'],
                'classeId' => null,
            ];
        } elseif (!empty($serializedClassi)) {
            $defaultSelection = [
                'mode' => 'classe',
                'cattedraId' => null,
                'classeId' => $serializedClassi[0]['id'],
            ];
        }

        return [
            'cattedre' => $serializedCattedre,
            'classiSostituzione' => $serializedClassi,
            'defaultSelection' => $defaultSelection,
        ];
    }

    private function serializeCattedra(Cattedra $cattedra): array
    {
        $classe = $cattedra->getClasse();
        $materia = $cattedra->getMateria();
        $alunno = $cattedra->getAlunno();
        $isSostegno = ($cattedra->getTipo() === 'S' || $materia?->getTipo() === 'S');
        $isReligione = ($materia?->getTipo() === 'R');

        $label = sprintf('%s · %s', (string) $classe, $materia?->getNomeBreve() ?? 'Materia');
        if ($alunno) {
            $label .= sprintf(' · %s %s', $alunno->getCognome(), $alunno->getNome());
        }

        return [
            'id' => $cattedra->getId(),
            'label' => $label,
            'tipo' => $cattedra->getTipo(),
            'supplenza' => $cattedra->getSupplenza(),
            'classe' => [
                'id' => $classe?->getId(),
                'nome' => (string) $classe,
            ],
            'materia' => [
                'id' => $materia?->getId(),
                'nomeBreve' => $materia?->getNomeBreve(),
                'tipo' => $materia?->getTipo(),
            ],
            'alunnoSostegno' => $alunno ? [
                'id' => $alunno->getId(),
                'cognome' => $alunno->getCognome(),
                'nome' => $alunno->getNome(),
            ] : null,
            'flags' => [
                'isSostegno' => $isSostegno,
                'isReligione' => $isReligione,
            ],
        ];
    }

    private function serializeClasse(Classe $classe): array
    {
        $sede = $classe->getSede();

        return [
            'id' => $classe->getId(),
            'label' => (string) $classe,
            'anno' => $classe->getAnno(),
            'sezione' => $classe->getSezione(),
            'gruppo' => $classe->getGruppo(),
            'sede' => $sede ? [
                'id' => $sede->getId(),
                'nome' => $sede->getNome(),
                'nomeBreve' => $sede->getNomeBreve(),
            ] : null,
        ];
    }
}
