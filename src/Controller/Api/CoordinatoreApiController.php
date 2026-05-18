<?php

namespace App\Controller\Api;

use App\Entity\Alunno;
use App\Entity\Assenza;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Entrata;
use App\Entity\Uscita;
use App\Entity\Valutazione;
use App\Util\StaffUtil;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/coordinatore')]
#[IsGranted('ROLE_DOCENTE')]
class CoordinatoreApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private StaffUtil $staffUtil,
    ) {}

    #[Route(path: '/classi', name: 'api_coordinatore_classi', methods: ['GET'])]
    public function classi(): JsonResponse
    {
        $docente = $this->getUser();
        if (!$docente instanceof Docente) {
            return $this->json(['error' => 'Docente non trovato.'], 403);
        }

        $classi = $this->em->getRepository(Classe::class)->createQueryBuilder('c')
            ->join('c.sede', 's')
            ->where('c.coordinatore = :docente')
            ->setParameter('docente', $docente)
            ->orderBy('c.anno', 'ASC')
            ->addOrderBy('c.sezione', 'ASC')
            ->getQuery()
            ->getResult();

        return $this->json([
            'data' => array_map(fn (Classe $c) => [
                'id' => $c->getId(),
                'nome' => $c->getAnno() . 'ª' . $c->getSezione() . ($c->getGruppo() ? '-' . $c->getGruppo() : ''),
                'sede' => $c->getSede()->getNomeBreve(),
            ], $classi),
        ]);
    }

    #[Route(path: '/{classeId}/situazione', name: 'api_coordinatore_situazione', requirements: ['classeId' => '\d+'], methods: ['GET'])]
    public function situazione(int $classeId): JsonResponse
    {
        $docente = $this->getUser();
        if (!$docente instanceof Docente) {
            return $this->json(['error' => 'Docente non trovato.'], 403);
        }

        $classe = $this->resolveClasse($classeId, $docente);
        if ($classe instanceof JsonResponse) {
            return $classe;
        }

        $alunniData = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id, a.cognome, a.nome, a.dataNascita, a.sesso, a.bes, a.noteBes, a.religione, a.note')
            ->join('a.classe', 'c')
            ->where('c.id = :classe AND a.abilitato = 1')
            ->setParameter('classe', $classeId)
            ->orderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC')
            ->getQuery()
            ->getArrayResult();

        return $this->json([
            'data' => [
                'classe' => [
                    'id' => $classe->getId(),
                    'nome' => $classe->getAnno() . 'ª' . $classe->getSezione() . ($classe->getGruppo() ? '-' . $classe->getGruppo() : ''),
                    'sede' => $classe->getSede()->getNomeBreve(),
                    'oreSettimanali' => $classe->getOreSettimanali(),
                ],
                'alunni' => array_map(fn (array $a) => [
                    'id' => $a['id'],
                    'displayName' => trim($a['cognome'] . ' ' . $a['nome']),
                    'dataNascita' => $a['dataNascita']?->format('Y-m-d'),
                    'sesso' => $a['sesso'],
                    'bes' => $a['bes'],
                    'noteBes' => $a['noteBes'],
                    'religione' => (bool) $a['religione'],
                    'note' => $a['note'],
                ], $alunniData),
            ],
        ]);
    }

    #[Route(path: '/{classeId}/assenze', name: 'api_coordinatore_assenze', requirements: ['classeId' => '\d+'], methods: ['GET'])]
    public function assenze(int $classeId): JsonResponse
    {
        $docente = $this->getUser();
        if (!$docente instanceof Docente) {
            return $this->json(['error' => 'Docente non trovato.'], 403);
        }

        $classe = $this->resolveClasse($classeId, $docente);
        if ($classe instanceof JsonResponse) {
            return $classe;
        }

        $alunniIds = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id')
            ->join('a.classe', 'c')
            ->where('c.id = :classe AND a.abilitato = 1')
            ->setParameter('classe', $classeId)
            ->getQuery()
            ->getSingleColumnResult();

        if (empty($alunniIds)) {
            return $this->json(['data' => ['items' => []]]);
        }

        $stats = [];
        foreach ($alunniIds as $id) {
            $stats[$id] = ['assenze' => 0, 'assenzeNonGiust' => 0, 'ritardi' => 0, 'ritardiNonGiust' => 0, 'uscite' => 0];
        }

        $assenze = $this->em->getRepository(Assenza::class)->createQueryBuilder('a')
            ->select('IDENTITY(a.alunno) AS id, COUNT(a.id) AS totale, SUM(CASE WHEN a.giustificato IS NULL THEN 1 ELSE 0 END) AS nonGiust')
            ->where('a.alunno IN (:lista)')
            ->setParameter('lista', $alunniIds)
            ->groupBy('a.alunno')
            ->getQuery()->getArrayResult();
        foreach ($assenze as $row) {
            $stats[$row['id']]['assenze'] = (int) $row['totale'];
            $stats[$row['id']]['assenzeNonGiust'] = (int) $row['nonGiust'];
        }

        $entrate = $this->em->getRepository(Entrata::class)->createQueryBuilder('e')
            ->select('IDENTITY(e.alunno) AS id, COUNT(e.id) AS totale, SUM(CASE WHEN e.giustificato IS NULL THEN 1 ELSE 0 END) AS nonGiust')
            ->where('e.alunno IN (:lista)')
            ->setParameter('lista', $alunniIds)
            ->groupBy('e.alunno')
            ->getQuery()->getArrayResult();
        foreach ($entrate as $row) {
            $stats[$row['id']]['ritardi'] = (int) $row['totale'];
            $stats[$row['id']]['ritardiNonGiust'] = (int) $row['nonGiust'];
        }

        $uscite = $this->em->getRepository(Uscita::class)->createQueryBuilder('u')
            ->select('IDENTITY(u.alunno) AS id, COUNT(u.id) AS totale')
            ->where('u.alunno IN (:lista)')
            ->setParameter('lista', $alunniIds)
            ->groupBy('u.alunno')
            ->getQuery()->getArrayResult();
        foreach ($uscite as $row) {
            $stats[$row['id']]['uscite'] = (int) $row['totale'];
        }

        $alunni = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id, a.cognome, a.nome')
            ->where('a.id IN (:lista)')
            ->setParameter('lista', $alunniIds)
            ->orderBy('a.cognome', 'ASC')->addOrderBy('a.nome', 'ASC')
            ->getQuery()->getArrayResult();

        return $this->json([
            'data' => [
                'items' => array_map(fn (array $a) => [
                    'id' => $a['id'],
                    'displayName' => trim($a['cognome'] . ' ' . $a['nome']),
                    'assenze' => $stats[$a['id']]['assenze'],
                    'assenzeNonGiust' => $stats[$a['id']]['assenzeNonGiust'],
                    'ritardi' => $stats[$a['id']]['ritardi'],
                    'ritardiNonGiust' => $stats[$a['id']]['ritardiNonGiust'],
                    'uscite' => $stats[$a['id']]['uscite'],
                ], $alunni),
            ],
        ]);
    }

    #[Route(path: '/{classeId}/voti', name: 'api_coordinatore_voti', requirements: ['classeId' => '\d+'], methods: ['GET'])]
    public function voti(int $classeId): JsonResponse
    {
        $docente = $this->getUser();
        if (!$docente instanceof Docente) {
            return $this->json(['error' => 'Docente non trovato.'], 403);
        }

        $classe = $this->resolveClasse($classeId, $docente);
        if ($classe instanceof JsonResponse) {
            return $classe;
        }

        $voti = $this->em->getRepository(Valutazione::class)->createQueryBuilder('v')
            ->select('IDENTITY(v.alunno) AS alunnoId, IDENTITY(v.materia) AS materiaId, m.nomeBreve AS materia, v.voto, v.giudizio')
            ->join('v.materia', 'm')
            ->join('v.lezione', 'l')
            ->where('l.classe = :classe AND v.visibile = 1')
            ->setParameter('classe', $classeId)
            ->orderBy('m.nomeBreve', 'ASC')
            ->getQuery()->getArrayResult();

        $byAlunno = [];
        foreach ($voti as $v) {
            $aid = $v['alunnoId'];
            $mid = $v['materiaId'];
            if (!isset($byAlunno[$aid][$mid])) {
                $byAlunno[$aid][$mid] = ['materia' => $v['materia'], 'voti' => [], 'media' => null];
            }
            if ($v['voto'] !== null) {
                $byAlunno[$aid][$mid]['voti'][] = (float) $v['voto'];
            }
        }

        foreach ($byAlunno as $aid => &$materie) {
            foreach ($materie as &$m) {
                $m['media'] = count($m['voti']) > 0
                    ? round(array_sum($m['voti']) / count($m['voti']), 2)
                    : null;
                $m['count'] = count($m['voti']);
                unset($m['voti']);
            }
        }

        $alunni = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id, a.cognome, a.nome')
            ->join('a.classe', 'c')
            ->where('c.id = :classe AND a.abilitato = 1')
            ->setParameter('classe', $classeId)
            ->orderBy('a.cognome', 'ASC')->addOrderBy('a.nome', 'ASC')
            ->getQuery()->getArrayResult();

        return $this->json([
            'data' => [
                'items' => array_map(fn (array $a) => [
                    'id' => $a['id'],
                    'displayName' => trim($a['cognome'] . ' ' . $a['nome']),
                    'materie' => array_values($byAlunno[$a['id']] ?? []),
                ], $alunni),
            ],
        ]);
    }

    private function resolveClasse(int $classeId, Docente $docente): Classe|JsonResponse
    {
        $classe = $this->em->getRepository(Classe::class)->find($classeId);
        if (!$classe) {
            return $this->json(['error' => 'Classe non trovata.'], 404);
        }

        $isCoordinatore = $classe->getCoordinatore()?->getId() === $docente->getId();
        $isStaff = $this->isGranted('ROLE_STAFF');
        if (!$isCoordinatore && !$isStaff) {
            return $this->json(['error' => 'Accesso non consentito.'], 403);
        }

        return $classe;
    }
}
