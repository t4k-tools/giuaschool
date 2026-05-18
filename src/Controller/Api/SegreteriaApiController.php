<?php

namespace App\Controller\Api;

use App\Entity\Alunno;
use App\Entity\Assenza;
use App\Entity\Ata;
use App\Entity\CambioClasse;
use App\Entity\Classe;
use App\Entity\Entrata;
use App\Entity\Genitore;
use App\Entity\Scrutinio;
use App\Entity\StoricoEsito;
use App\Entity\Uscita;
use App\Entity\Utente;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/segreteria')]
#[IsGranted('ROLE_UTENTE')]
class SegreteriaApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {}

    #[Route(path: '/assenze', name: 'api_segreteria_assenze', methods: ['GET'])]
    public function assenze(Request $request): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $classeId = $request->query->getInt('classe');
        $cognome = trim($request->query->get('cognome', ''));
        $nome = trim($request->query->get('nome', ''));
        $pagina = max(1, $request->query->getInt('pagina', 1));
        $limit = 20;
        $offset = ($pagina - 1) * $limit;

        $qb = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id, a.cognome, a.nome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->join('a.classe', 'cl')
            ->where('a.abilitato = 1')
            ->orderBy('cl.anno', 'ASC')
            ->addOrderBy('cl.sezione', 'ASC')
            ->addOrderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC');

        if ($classeId > 0) {
            $qb->andWhere('cl.id = :classe')->setParameter('classe', $classeId);
        }
        if ($cognome !== '') {
            $qb->andWhere('a.cognome LIKE :cognome')->setParameter('cognome', $cognome . '%');
        }
        if ($nome !== '') {
            $qb->andWhere('a.nome LIKE :nome')->setParameter('nome', $nome . '%');
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();
        $maxPages = max(1, (int) ceil($total / $limit));

        $alunni = $qb->select('a.id, a.cognome, a.nome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();

        if (empty($alunni)) {
            return $this->json(['data' => ['items' => [], 'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total]]]);
        }

        $ids = array_column($alunni, 'id');
        $stats = [];
        foreach ($ids as $id) {
            $stats[$id] = ['assenze' => 0, 'assenzeNonGiust' => 0, 'ritardi' => 0, 'ritardiNonGiust' => 0, 'uscite' => 0];
        }

        $assenzeRows = $this->em->getRepository(Assenza::class)->createQueryBuilder('a')
            ->select('IDENTITY(a.alunno) AS id, COUNT(a.id) AS tot, SUM(CASE WHEN a.giustificato IS NULL THEN 1 ELSE 0 END) AS nonGiust')
            ->where('a.alunno IN (:ids)')->setParameter('ids', $ids)
            ->groupBy('a.alunno')->getQuery()->getArrayResult();
        foreach ($assenzeRows as $r) {
            $stats[$r['id']]['assenze'] = (int) $r['tot'];
            $stats[$r['id']]['assenzeNonGiust'] = (int) $r['nonGiust'];
        }

        $entrateRows = $this->em->getRepository(Entrata::class)->createQueryBuilder('e')
            ->select('IDENTITY(e.alunno) AS id, COUNT(e.id) AS tot, SUM(CASE WHEN e.giustificato IS NULL THEN 1 ELSE 0 END) AS nonGiust')
            ->where('e.alunno IN (:ids)')->setParameter('ids', $ids)
            ->groupBy('e.alunno')->getQuery()->getArrayResult();
        foreach ($entrateRows as $r) {
            $stats[$r['id']]['ritardi'] = (int) $r['tot'];
            $stats[$r['id']]['ritardiNonGiust'] = (int) $r['nonGiust'];
        }

        $usciteRows = $this->em->getRepository(Uscita::class)->createQueryBuilder('u')
            ->select('IDENTITY(u.alunno) AS id, COUNT(u.id) AS tot')
            ->where('u.alunno IN (:ids)')->setParameter('ids', $ids)
            ->groupBy('u.alunno')->getQuery()->getArrayResult();
        foreach ($usciteRows as $r) {
            $stats[$r['id']]['uscite'] = (int) $r['tot'];
        }

        $items = array_map(fn(array $a) => [
            'id' => $a['id'],
            'displayName' => trim($a['cognome'] . ' ' . $a['nome']),
            'classeId' => $a['classeId'],
            'classeName' => $a['anno'] . 'ª' . $a['sezione'] . ($a['gruppo'] ? '-' . $a['gruppo'] : ''),
            'assenze' => $stats[$a['id']]['assenze'],
            'assenzeNonGiust' => $stats[$a['id']]['assenzeNonGiust'],
            'ritardi' => $stats[$a['id']]['ritardi'],
            'ritardiNonGiust' => $stats[$a['id']]['ritardiNonGiust'],
            'uscite' => $stats[$a['id']]['uscite'],
        ], $alunni);

        return $this->json(['data' => [
            'items' => $items,
            'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total],
        ]]);
    }

    #[Route(path: '/alunni/{id}/assenze', name: 'api_segreteria_alunno_assenze', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function alunnoAssenze(int $id): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $alunno = $this->em->getRepository(Alunno::class)->findOneBy(['id' => $id, 'abilitato' => 1]);
        if (!$alunno) {
            return $this->json(['error' => 'Alunno non trovato.'], 404);
        }

        $classe = $alunno->getClasse();
        $classeName = $classe
            ? $classe->getAnno() . 'ª' . $classe->getSezione() . ($classe->getGruppo() ? '-' . $classe->getGruppo() : '')
            : null;

        $assenzeRows = $this->em->getRepository(Assenza::class)->createQueryBuilder('a')
            ->select('a.data, a.giustificato')
            ->where('a.alunno = :alunno')->setParameter('alunno', $alunno)
            ->orderBy('a.data', 'ASC')
            ->getQuery()->getArrayResult();

        $entrateRows = $this->em->getRepository(Entrata::class)->createQueryBuilder('e')
            ->select('e.data, e.giustificato, e.ritardoBreve')
            ->where('e.alunno = :alunno')->setParameter('alunno', $alunno)
            ->orderBy('e.data', 'ASC')
            ->getQuery()->getArrayResult();

        $usciteRows = $this->em->getRepository(Uscita::class)->createQueryBuilder('u')
            ->select('u.data')
            ->where('u.alunno = :alunno')->setParameter('alunno', $alunno)
            ->orderBy('u.data', 'ASC')
            ->getQuery()->getArrayResult();

        // Aggregate by month
        $mesi = [];
        foreach ($assenzeRows as $r) {
            $key = $r['data']->format('Y-m');
            $label = $this->mesiLabel($r['data']);
            if (!isset($mesi[$key])) {
                $mesi[$key] = ['mese' => $label, 'assenze' => 0, 'assenzeNonGiust' => 0, 'ritardi' => 0, 'ritardiNonGiust' => 0, 'uscite' => 0];
            }
            $mesi[$key]['assenze']++;
            if ($r['giustificato'] === null) $mesi[$key]['assenzeNonGiust']++;
        }
        foreach ($entrateRows as $r) {
            if ($r['ritardoBreve']) continue;
            $key = $r['data']->format('Y-m');
            $label = $this->mesiLabel($r['data']);
            if (!isset($mesi[$key])) {
                $mesi[$key] = ['mese' => $label, 'assenze' => 0, 'assenzeNonGiust' => 0, 'ritardi' => 0, 'ritardiNonGiust' => 0, 'uscite' => 0];
            }
            $mesi[$key]['ritardi']++;
            if ($r['giustificato'] === null) $mesi[$key]['ritardiNonGiust']++;
        }
        foreach ($usciteRows as $r) {
            $key = $r['data']->format('Y-m');
            $label = $this->mesiLabel($r['data']);
            if (!isset($mesi[$key])) {
                $mesi[$key] = ['mese' => $label, 'assenze' => 0, 'assenzeNonGiust' => 0, 'ritardi' => 0, 'ritardiNonGiust' => 0, 'uscite' => 0];
            }
            $mesi[$key]['uscite']++;
        }

        ksort($mesi);

        $totAssenze = count($assenzeRows);
        $totNonGiust = count(array_filter($assenzeRows, fn($r) => $r['giustificato'] === null));
        $totRitardi = count(array_filter($entrateRows, fn($r) => !$r['ritardoBreve']));
        $totRitardiNonGiust = count(array_filter($entrateRows, fn($r) => !$r['ritardoBreve'] && $r['giustificato'] === null));
        $totUscite = count($usciteRows);

        return $this->json(['data' => [
            'alunno' => [
                'id' => $alunno->getId(),
                'displayName' => trim($alunno->getCognome() . ' ' . $alunno->getNome()),
                'classeName' => $classeName,
            ],
            'totali' => [
                'assenze' => $totAssenze,
                'assenzeNonGiust' => $totNonGiust,
                'ritardi' => $totRitardi,
                'ritardiNonGiust' => $totRitardiNonGiust,
                'uscite' => $totUscite,
            ],
            'mesi' => array_values($mesi),
        ]]);
    }

    #[Route(path: '/genitori', name: 'api_segreteria_genitori', methods: ['GET'])]
    public function genitori(Request $request): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $classeId = $request->query->getInt('classe');
        $cognome = trim($request->query->get('cognome', ''));
        $nome = trim($request->query->get('nome', ''));
        $pagina = max(1, $request->query->getInt('pagina', 1));
        $limit = 20;
        $offset = ($pagina - 1) * $limit;

        $qb = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id, a.cognome, a.nome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->join('a.classe', 'cl')
            ->where('a.abilitato = 1')
            ->orderBy('cl.anno', 'ASC')
            ->addOrderBy('cl.sezione', 'ASC')
            ->addOrderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC');

        if ($classeId > 0) {
            $qb->andWhere('cl.id = :classe')->setParameter('classe', $classeId);
        }
        if ($cognome !== '') {
            $qb->andWhere('a.cognome LIKE :cognome')->setParameter('cognome', $cognome . '%');
        }
        if ($nome !== '') {
            $qb->andWhere('a.nome LIKE :nome')->setParameter('nome', $nome . '%');
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();
        $maxPages = max(1, (int) ceil($total / $limit));

        $alunni = $qb->select('a.id, a.cognome, a.nome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();

        if (empty($alunni)) {
            return $this->json(['data' => ['items' => [], 'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total]]]);
        }

        $ids = array_column($alunni, 'id');
        $genitoriRows = $this->em->getRepository(Genitore::class)->createQueryBuilder('g')
            ->select('IDENTITY(g.alunno) AS alunnoId, g.id, g.cognome, g.nome, g.email, g.numeriTelefono, g.spid, g.username, g.ultimoAccesso')
            ->where('g.alunno IN (:ids) AND g.abilitato = 1')
            ->setParameter('ids', $ids)
            ->orderBy('g.username', 'ASC')
            ->getQuery()->getArrayResult();

        $genitori = [];
        foreach ($genitoriRows as $r) {
            $genitori[$r['alunnoId']][] = [
                'id' => $r['id'],
                'displayName' => trim($r['cognome'] . ' ' . $r['nome']),
                'email' => $r['email'],
                'telefoni' => $r['numeriTelefono'] ?? [],
                'spid' => (bool) $r['spid'],
                'ultimoAccesso' => $r['ultimoAccesso'] ? $r['ultimoAccesso']->format('d/m/Y') : null,
            ];
        }

        $items = array_map(fn(array $a) => [
            'id' => $a['id'],
            'displayName' => trim($a['cognome'] . ' ' . $a['nome']),
            'classeName' => $a['anno'] . 'ª' . $a['sezione'] . ($a['gruppo'] ? '-' . $a['gruppo'] : ''),
            'genitori' => $genitori[$a['id']] ?? [],
        ], $alunni);

        return $this->json(['data' => [
            'items' => $items,
            'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total],
        ]]);
    }

    #[Route(path: '/genitori/{id}', name: 'api_segreteria_genitore_edit', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function genitoreEdit(Request $request, int $id): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $genitore = $this->em->getRepository(Genitore::class)->findOneBy(['id' => $id, 'abilitato' => 1]);
        if (!$genitore) {
            return $this->json(['error' => 'Genitore non trovato.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $email = trim($data['email'] ?? '');
        $telefoni = $data['telefoni'] ?? null;

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Indirizzo email non valido.'], 422);
        }

        $genitore->setEmail($email !== '' ? $email : null);
        if (is_array($telefoni)) {
            $telefoni = array_values(array_filter(array_map('trim', $telefoni), fn($t) => $t !== ''));
            $genitore->setNumeriTelefono($telefoni);
        }

        $this->em->flush();

        return $this->json(['data' => [
            'id' => $genitore->getId(),
            'email' => $genitore->getEmail(),
            'telefoni' => $genitore->getNumeriTelefono() ?? [],
        ]]);
    }

    #[Route(path: '/genitori/{id}/abilita', name: 'api_segreteria_genitore_toggle', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function genitoreToggleAbilita(int $id): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $genitore = $this->em->getRepository(Genitore::class)->find($id);
        if (!$genitore) {
            return $this->json(['error' => 'Genitore non trovato.'], 404);
        }

        $genitore->setAbilitato(!$genitore->getAbilitato());
        $this->em->flush();

        return $this->json([
            'data' => [
                'id' => $genitore->getId(),
                'abilitato' => $genitore->getAbilitato(),
            ],
            'message' => $genitore->getAbilitato() ? 'Genitore abilitato.' : 'Genitore disabilitato.',
        ]);
    }

    #[Route(path: '/alunni/{id}/genitori', name: 'api_segreteria_genitore_create', requirements: ['id' => '\d+'], methods: ['POST'])]
    public function genitoreCreate(Request $request, int $id): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $alunno = $this->em->getRepository(Alunno::class)->findOneBy(['id' => $id, 'abilitato' => 1]);
        if (!$alunno) {
            return $this->json(['error' => 'Alunno non trovato.'], 404);
        }
        $genitoriAttivi = (int) $this->em->getRepository(Genitore::class)->createQueryBuilder('g')
            ->select('COUNT(g.id)')
            ->where('g.alunno = :alunno')
            ->andWhere('g.abilitato = 1')
            ->setParameter('alunno', $alunno)
            ->getQuery()
            ->getSingleScalarResult();
        if ($genitoriAttivi >= 2) {
            return $this->json(['error' => 'Per questo alunno sono già presenti due genitori attivi.'], 409);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $nome = trim((string) ($data['nome'] ?? ''));
        $cognome = trim((string) ($data['cognome'] ?? ''));
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $sesso = strtoupper(trim((string) ($data['sesso'] ?? 'F')));
        $username = !empty($data['username']) ? strtolower(trim((string) $data['username'])) : null;
        $telefoni = is_array($data['telefoni'] ?? null) ? $data['telefoni'] : [];

        if ($nome === '' || $cognome === '' || $email === '') {
            return $this->json(['error' => 'Nome, cognome ed email sono obbligatori.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Indirizzo email non valido.'], 422);
        }
        if (!in_array($sesso, ['M', 'F'], true)) {
            return $this->json(['error' => 'Il sesso deve essere M o F.'], 422);
        }

        if ($username) {
            $existing = $this->em->getRepository(Utente::class)->findOneBy(['username' => $username]);
            if ($existing) {
                return $this->json(['error' => "Username '$username' già in uso."], 409);
            }
        } else {
            $base = $this->transliterate(strtolower($nome) . '.' . strtolower($cognome));
            $base = trim($base, '.');
            $base = $base !== '' ? $base : 'genitore';
            $username = $base;
            $suffix = 1;
            while ($this->em->getRepository(Utente::class)->findOneBy(['username' => $username])) {
                $username = $base . $suffix;
                $suffix++;
            }
        }

        $existingEmail = $this->em->getRepository(Utente::class)->findOneBy(['email' => $email]);
        if ($existingEmail) {
            return $this->json(['error' => 'Email già in uso.'], 409);
        }

        $password = $this->generatePassword();
        $genitore = (new Genitore())
            ->setNome(ucwords(strtolower($nome)))
            ->setCognome(ucwords(strtolower($cognome)))
            ->setSesso($sesso)
            ->setUsername($username)
            ->setEmail($email)
            ->setAlunno($alunno)
            ->setAbilitato(true);
        $genitore->setPassword($this->hasher->hashPassword($genitore, $password));

        $telefoni = array_values(array_filter(array_map(
            static fn ($telefono) => trim((string) $telefono),
            $telefoni,
        )));
        $genitore->setNumeriTelefono($telefoni);

        $this->em->persist($genitore);
        $this->em->flush();

        return $this->json(['data' => [
            'genitore' => [
                'id' => $genitore->getId(),
                'displayName' => trim($genitore->getCognome() . ' ' . $genitore->getNome()),
                'username' => $genitore->getUsername(),
                'email' => $genitore->getEmail(),
                'telefoni' => $genitore->getNumeriTelefono() ?? [],
                'spid' => (bool) $genitore->getSpid(),
                'ultimoAccesso' => $genitore->getUltimoAccesso()?->format('d/m/Y'),
            ],
            'generatedPassword' => $password,
        ]], 201);
    }

    #[Route(path: '/scrutini', name: 'api_segreteria_scrutini', methods: ['GET'])]
    public function scrutini(Request $request): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $classeId = $request->query->getInt('classe');
        $cognome = trim($request->query->get('cognome', ''));
        $nome = trim($request->query->get('nome', ''));
        $pagina = max(1, $request->query->getInt('pagina', 1));
        $limit = 20;
        $offset = ($pagina - 1) * $limit;

        $qb = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
            ->select('a.id, a.cognome, a.nome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->join('a.classe', 'cl')
            ->where('a.abilitato = 1')
            ->orderBy('cl.anno', 'ASC')
            ->addOrderBy('cl.sezione', 'ASC')
            ->addOrderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC');

        if ($classeId > 0) {
            $qb->andWhere('cl.id = :classe')->setParameter('classe', $classeId);
        }
        if ($cognome !== '') {
            $qb->andWhere('a.cognome LIKE :cognome')->setParameter('cognome', $cognome . '%');
        }
        if ($nome !== '') {
            $qb->andWhere('a.nome LIKE :nome')->setParameter('nome', $nome . '%');
        }

        $countQb = clone $qb;
        $total = (int) $countQb->select('COUNT(a.id)')->getQuery()->getSingleScalarResult();
        $maxPages = max(1, (int) ceil($total / $limit));

        $alunniRows = $qb->select('a.id, a.cognome, a.nome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->setFirstResult($offset)
            ->setMaxResults($limit)
            ->getQuery()
            ->getArrayResult();

        if (empty($alunniRows)) {
            return $this->json(['data' => ['items' => [], 'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total]]]);
        }

        $ids = array_column($alunniRows, 'id');
        $periodi = $this->periodoLabel();

        // scrutini chiusi per classe corrente o classi di cambio
        $scrutiniRows = $this->em->getRepository(Scrutinio::class)->createQueryBuilder('s')
            ->select('s.id, s.periodo, s.data, IDENTITY(s.classe) AS classeId, s.dati')
            ->join('s.classe', 'c')
            ->leftJoin(CambioClasse::class, 'cc', 'WITH', 'cc.classe = s.classe AND cc.alunno IN (:ids)')
            ->where('s.stato = :stato AND s.periodo NOT IN (:esclusi) AND (IDENTITY(s.classe) IN (:classiIds) OR cc.id IS NOT NULL)')
            ->setParameter('stato', 'C')
            ->setParameter('esclusi', ['R', 'X'])
            ->setParameter('ids', $ids)
            ->setParameter('classiIds', array_column($alunniRows, 'classeId'))
            ->orderBy('s.data', 'DESC')
            ->getQuery()->getArrayResult();

        // storico A.S. precedente
        $storicoRows = $this->em->getRepository(StoricoEsito::class)->createQueryBuilder('se')
            ->select('IDENTITY(se.alunno) AS alunnoId, se.id')
            ->where('se.alunno IN (:ids)')
            ->setParameter('ids', $ids)
            ->getQuery()->getArrayResult();

        $storicoPerAlunno = [];
        foreach ($storicoRows as $r) {
            $storicoPerAlunno[$r['alunnoId']] = $r['id'];
        }

        $items = [];
        foreach ($alunniRows as $a) {
            $alunnoPeriodi = [];
            foreach ($scrutiniRows as $sc) {
                $alunniInScrutinio = $sc['dati']['alunni'] ?? ($sc['dati']['sospesi'] ?? []);
                if (!in_array($a['id'], $alunniInScrutinio, true)) {
                    continue;
                }
                $alunnoPeriodi[] = [
                    'scrutinioId' => $sc['id'],
                    'periodo' => $sc['periodo'],
                    'label' => $periodi[$sc['periodo']] ?? $sc['periodo'],
                    'data' => $sc['data'] ? $sc['data']->format('d/m/Y') : null,
                ];
            }
            if (isset($storicoPerAlunno[$a['id']])) {
                $alunnoPeriodi[] = [
                    'scrutinioId' => $storicoPerAlunno[$a['id']],
                    'periodo' => 'A',
                    'label' => 'Anno precedente',
                    'data' => null,
                ];
            }
            $items[] = [
                'id' => $a['id'],
                'displayName' => trim($a['cognome'] . ' ' . $a['nome']),
                'classeName' => $a['anno'] . 'ª' . $a['sezione'] . ($a['gruppo'] ? '-' . $a['gruppo'] : ''),
                'scrutini' => $alunnoPeriodi,
            ];
        }

        return $this->json(['data' => [
            'items' => $items,
            'pagination' => ['page' => $pagina, 'maxPages' => $maxPages, 'total' => $total],
        ]]);
    }

    #[Route(path: '/classi', name: 'api_segreteria_classi', methods: ['GET'])]
    public function classi(): JsonResponse
    {
        if (!$this->canAccess()) {
            return $this->json(['error' => 'Accesso riservato alla segreteria.'], 403);
        }

        $classi = $this->em->getRepository(Classe::class)->createQueryBuilder('c')
            ->join('c.sede', 's')
            ->orderBy('c.anno', 'ASC')
            ->addOrderBy('c.sezione', 'ASC')
            ->getQuery()->getResult();

        return $this->json(['data' => array_map(fn($c) => [
            'id' => $c->getId(),
            'nome' => $c->getAnno() . 'ª' . $c->getSezione() . ($c->getGruppo() ? '-' . $c->getGruppo() : ''),
        ], $classi)]);
    }

    private function canAccess(): bool
    {
        if ($this->isGranted('ROLE_STAFF') || $this->isGranted('ROLE_AMMINISTRATORE')) {
            return true;
        }
        $user = $this->getUser();
        if ($user instanceof Ata && $user->getSegreteria()) {
            return true;
        }
        return false;
    }

    private function periodoLabel(): array
    {
        return [
            'P' => 'Primo trimestre',
            'S' => 'Secondo periodo',
            'F' => 'Scrutinio finale',
            'G' => 'Giudizio sospeso',
            'R' => 'Rinviato',
            'X' => 'Rinviato (prec. A.S.)',
            'A' => 'Anno precedente',
        ];
    }

    private function mesiLabel(DateTime $data): string
    {
        $nomi = ['', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        return $nomi[(int) $data->format('n')] . ' ' . $data->format('Y');
    }

    private function generatePassword(int $length = 10): string
    {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $password = '';
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $password;
    }

    private function transliterate(string $text): string
    {
        $map = ['à' => 'a', 'è' => 'e', 'é' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
                'á' => 'a', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n', 'ü' => 'u',
                "'" => '', ' ' => '', '-' => ''];
        return strtr($text, $map);
    }
}
