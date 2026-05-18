<?php

namespace App\Controller\Api;

use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Staff;
use App\Entity\Preside;
use App\Entity\Sede;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class DocentiApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {}

    #[Route(path: '/docenti', name: 'api_docenti_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(10, (int) $request->query->get('limit', 20)));

        $qb = $this->em->createQueryBuilder()
            ->select('d')
            ->from(Docente::class, 'd')
            ->orderBy('d.cognome', 'ASC')
            ->addOrderBy('d.nome', 'ASC');

        if ($search !== '') {
            $qb->andWhere('d.cognome LIKE :search OR d.nome LIKE :search OR d.username LIKE :search OR d.codiceFiscale LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        // conta totali
        $countQb = clone $qb;
        $countQb->select('COUNT(d.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        // pagina
        $qb->setFirstResult(($page - 1) * $limit)
           ->setMaxResults($limit);

        $docenti = $qb->getQuery()->getResult();

        return $this->json([
            'data' => array_map([$this, 'serializeDocente'], $docenti),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    #[Route(path: '/docenti/{id}', name: 'api_docenti_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function get(int $id): JsonResponse
    {
        $docente = $this->em->getRepository(Docente::class)->find($id);
        if (!$docente) {
            return $this->json(['error' => 'Docente non trovato.'], 404);
        }

        return $this->json(['data' => $this->serializeDocente($docente)]);
    }

    #[Route(path: '/docenti', name: 'api_docenti_create', methods: ['POST'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // validazione
        $required = ['nome', 'cognome', 'sesso', 'username', 'email'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return $this->json(['error' => "Il campo '$field' è obbligatorio."], 400);
            }
        }

        // controlla unicità username
        $existing = $this->em->getRepository(Docente::class)->findOneBy(['username' => $data['username']]);
        if ($existing) {
            return $this->json(['error' => 'Username già in uso.'], 409);
        }

        // controlla unicità email
        $existing = $this->em->getRepository(Docente::class)->findOneBy(['email' => $data['email']]);
        if ($existing) {
            return $this->json(['error' => 'Email già in uso.'], 409);
        }

        $docente = new Docente();
        $this->hydrateDocente($docente, $data);

        // password
        $password = $data['password'] ?? $this->generatePassword();
        $docente->setPassword($this->hasher->hashPassword($docente, $password));
        $docente->setAbilitato(true);

        $this->em->persist($docente);
        $this->em->flush();

        return $this->json([
            'data' => $this->serializeDocente($docente),
            'generatedPassword' => isset($data['password']) ? null : $password,
        ], 201);
    }

    #[Route(path: '/docenti/{id}', name: 'api_docenti_update', methods: ['PUT'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function update(int $id, Request $request): JsonResponse
    {
        $docente = $this->em->getRepository(Docente::class)->find($id);
        if (!$docente) {
            return $this->json(['error' => 'Docente non trovato.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $this->hydrateDocente($docente, $data);

        if (!empty($data['password'])) {
            $docente->setPassword($this->hasher->hashPassword($docente, $data['password']));
        }

        $this->em->flush();

        return $this->json(['data' => $this->serializeDocente($docente)]);
    }

    #[Route(path: '/docenti/{id}/abilita', name: 'api_docenti_toggle', methods: ['PATCH'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function toggleAbilita(int $id): JsonResponse
    {
        $docente = $this->em->getRepository(Docente::class)->find($id);
        if (!$docente) {
            return $this->json(['error' => 'Docente non trovato.'], 404);
        }

        $docente->setAbilitato(!$docente->getAbilitato());
        $this->em->flush();

        return $this->json([
            'data' => $this->serializeDocente($docente),
            'message' => $docente->getAbilitato() ? 'Docente abilitato.' : 'Docente disabilitato.',
        ]);
    }

    // ──── STAFF ────

    #[Route(path: '/docenti/staff', name: 'api_docenti_staff', methods: ['GET'])]
    public function staffList(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        $qb = $this->em->createQueryBuilder()
            ->select('s')->from(Staff::class, 's')
            ->orderBy('s.cognome', 'ASC');
        if ($search !== '') {
            $qb->andWhere('s.cognome LIKE :s OR s.nome LIKE :s')->setParameter('s', "%$search%");
        }
        $staff = $qb->getQuery()->getResult();
        return $this->json(['data' => array_map([$this, 'serializeDocente'], $staff)]);
    }

    // ──── COORDINATORI ────

    #[Route(path: '/docenti/coordinatori', name: 'api_docenti_coordinatori', methods: ['GET'])]
    public function coordinatoriList(): JsonResponse
    {
        $classi = $this->em->getRepository(Classe::class)->findBy([], ['anno' => 'ASC', 'sezione' => 'ASC']);
        $result = [];
        foreach ($classi as $c) {
            $coord = $c->getCoordinatore();
            $result[] = [
                'classe' => ['id' => $c->getId(), 'nome' => $c->getAnno() . 'ª' . $c->getSezione() . ($c->getGruppo() ? '-' . $c->getGruppo() : '')],
                'coordinatore' => $coord ? ['id' => $coord->getId(), 'cognome' => $coord->getCognome(), 'nome' => $coord->getNome()] : null,
            ];
        }
        return $this->json(['data' => $result]);
    }

    #[Route(path: '/docenti/coordinatori/{classeId}', name: 'api_docenti_coordinatori_set', methods: ['PUT'], requirements: ['classeId' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function coordinatoriSet(int $classeId, Request $request): JsonResponse
    {
        $classe = $this->em->getRepository(Classe::class)->find($classeId);
        if (!$classe) return $this->json(['error' => 'Classe non trovata.'], 404);
        $data = json_decode($request->getContent(), true);
        $docente = ($data['docenteId'] ?? null) ? $this->em->getRepository(Docente::class)->find($data['docenteId']) : null;
        $classe->setCoordinatore($docente);
        $this->em->flush();
        return $this->json(['message' => 'Coordinatore aggiornato.']);
    }

    // ──── SEGRETARI ────

    #[Route(path: '/docenti/segretari', name: 'api_docenti_segretari', methods: ['GET'])]
    public function segretariList(): JsonResponse
    {
        $classi = $this->em->getRepository(Classe::class)->findBy([], ['anno' => 'ASC', 'sezione' => 'ASC']);
        $result = [];
        foreach ($classi as $c) {
            $segr = $c->getSegretario();
            $result[] = [
                'classe' => ['id' => $c->getId(), 'nome' => $c->getAnno() . 'ª' . $c->getSezione() . ($c->getGruppo() ? '-' . $c->getGruppo() : '')],
                'segretario' => $segr ? ['id' => $segr->getId(), 'cognome' => $segr->getCognome(), 'nome' => $segr->getNome()] : null,
            ];
        }
        return $this->json(['data' => $result]);
    }

    #[Route(path: '/docenti/segretari/{classeId}', name: 'api_docenti_segretari_set', methods: ['PUT'], requirements: ['classeId' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function segretariSet(int $classeId, Request $request): JsonResponse
    {
        $classe = $this->em->getRepository(Classe::class)->find($classeId);
        if (!$classe) return $this->json(['error' => 'Classe non trovata.'], 404);
        $data = json_decode($request->getContent(), true);
        $docente = ($data['docenteId'] ?? null) ? $this->em->getRepository(Docente::class)->find($data['docenteId']) : null;
        $classe->setSegretario($docente);
        $this->em->flush();
        return $this->json(['message' => 'Segretario aggiornato.']);
    }

    // ──── RESPONSABILI BES ────

    #[Route(path: '/docenti/responsabili-bes', name: 'api_docenti_bes', methods: ['GET'])]
    public function responsabiliBes(): JsonResponse
    {
        $docenti = $this->em->getRepository(Docente::class)->findBy(['responsabileBes' => true], ['cognome' => 'ASC']);
        return $this->json(['data' => array_map(function(Docente $d) {
            $s = $this->serializeDocente($d);
            $s['responsabileBesSede'] = $d->getResponsabileBesSede() ? [
                'id' => $d->getResponsabileBesSede()->getId(),
                'nomeBreve' => $d->getResponsabileBesSede()->getNomeBreve(),
            ] : null;
            return $s;
        }, $docenti)]);
    }

    #[Route(path: '/docenti/responsabili-bes/{id}', name: 'api_docenti_bes_toggle', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function responsabiliBesToggle(int $id, Request $request): JsonResponse
    {
        $docente = $this->em->getRepository(Docente::class)->find($id);
        if (!$docente) return $this->json(['error' => 'Docente non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        $docente->setResponsabileBes($data['responsabileBes'] ?? !$docente->getResponsabileBes());
        if (isset($data['sedeId'])) {
            $sede = $data['sedeId'] ? $this->em->getRepository(Sede::class)->find($data['sedeId']) : null;
            $docente->setResponsabileBesSede($sede);
        }
        $this->em->flush();
        return $this->json(['message' => 'Responsabile BES aggiornato.']);
    }

    // ──── RSPP ────

    #[Route(path: '/docenti/rspp', name: 'api_docenti_rspp', methods: ['GET'])]
    public function rspp(): JsonResponse
    {
        $docenti = $this->em->getRepository(Docente::class)->findBy(['rspp' => true], ['cognome' => 'ASC']);
        return $this->json(['data' => array_map([$this, 'serializeDocente'], $docenti)]);
    }

    #[Route(path: '/docenti/rspp/{id}', name: 'api_docenti_rspp_toggle', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function rsppToggle(int $id): JsonResponse
    {
        $docente = $this->em->getRepository(Docente::class)->find($id);
        if (!$docente) return $this->json(['error' => 'Docente non trovato.'], 404);
        $docente->setRspp(!$docente->getRspp());
        $this->em->flush();
        return $this->json(['message' => $docente->getRspp() ? 'RSPP assegnato.' : 'RSPP rimosso.']);
    }

    // ──── RAPPRESENTANTI DOCENTI ────

    #[Route(path: '/docenti/rappresentanti', name: 'api_docenti_rappresentanti', methods: ['GET'])]
    public function rappresentanti(Request $request): JsonResponse
    {
        $tipo = $request->query->get('tipo', '');
        $docenti = $this->em->getRepository(Docente::class)->findBy(['abilitato' => true], ['cognome' => 'ASC']);
        $result = [];
        foreach ($docenti as $d) {
            $rapp = $d->getRappresentante() ?? [''];
            if ($tipo && !in_array($tipo, $rapp)) continue;
            if (!$tipo && $rapp === ['']) continue;
            $s = $this->serializeDocente($d);
            $s['rappresentante'] = $rapp;
            $result[] = $s;
        }
        return $this->json(['data' => $result]);
    }

    #[Route(path: '/docenti/rappresentanti/{id}', name: 'api_docenti_rappresentanti_set', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function rappresentantiSet(int $id, Request $request): JsonResponse
    {
        $docente = $this->em->getRepository(Docente::class)->find($id);
        if (!$docente) return $this->json(['error' => 'Docente non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        $docente->setRappresentante($data['rappresentante'] ?? ['']);
        $this->em->flush();
        return $this->json(['message' => 'Rappresentante aggiornato.']);
    }

    // ──── LISTA DOCENTI (per select) ────

    #[Route(path: '/docenti/options', name: 'api_docenti_options', methods: ['GET'])]
    public function options(): JsonResponse
    {
        $docenti = $this->em->getRepository(Docente::class)->findBy(['abilitato' => true], ['cognome' => 'ASC']);
        return $this->json(['data' => array_map(fn(Docente $d) => [
            'id' => $d->getId(), 'label' => $d->getCognome() . ' ' . $d->getNome(),
        ], $docenti)]);
    }

    private function hydrateDocente(Docente $docente, array $data): void
    {
        if (isset($data['nome'])) $docente->setNome(ucwords(strtolower(trim($data['nome']))));
        if (isset($data['cognome'])) $docente->setCognome(ucwords(strtolower(trim($data['cognome']))));
        if (isset($data['sesso'])) $docente->setSesso(strtoupper($data['sesso']));
        if (isset($data['username'])) $docente->setUsername(strtolower(trim($data['username'])));
        if (isset($data['email'])) $docente->setEmail(strtolower(trim($data['email'])));
        if (isset($data['codiceFiscale'])) $docente->setCodiceFiscale(strtoupper(trim($data['codiceFiscale'])));
        if (isset($data['spid'])) $docente->setSpid((bool) $data['spid']);
        if (isset($data['dataNascita'])) $docente->setDataNascita($data['dataNascita'] ? new \DateTime($data['dataNascita']) : null);
        if (isset($data['comuneNascita'])) $docente->setComuneNascita($data['comuneNascita']);
        if (isset($data['provinciaNascita'])) $docente->setProvinciaNascita($data['provinciaNascita']);
        if (isset($data['citta'])) $docente->setCitta($data['citta']);
        if (isset($data['provincia'])) $docente->setProvincia($data['provincia']);
        if (isset($data['indirizzo'])) $docente->setIndirizzo($data['indirizzo']);
        if (isset($data['numeriTelefono'])) $docente->setNumeriTelefono($data['numeriTelefono']);

        if (isset($data['responsabileBes'])) $docente->setResponsabileBes((bool) $data['responsabileBes']);
        if (isset($data['rspp'])) $docente->setRspp((bool) $data['rspp']);

        if (isset($data['responsabileBesSede'])) {
            $sede = $data['responsabileBesSede'] ? $this->em->getRepository(Sede::class)->find($data['responsabileBesSede']) : null;
            $docente->setResponsabileBesSede($sede);
        }

        if (array_key_exists('fotoUrl', $data)) $docente->setFotoUrl($data['fotoUrl'] ?: null);
    }

    private function serializeDocente(Docente $docente): array
    {
        return [
            'id' => $docente->getId(),
            'nome' => $docente->getNome(),
            'cognome' => $docente->getCognome(),
            'sesso' => $docente->getSesso(),
            'username' => $docente->getUsername(),
            'email' => $docente->getEmail(),
            'codiceFiscale' => $docente->getCodiceFiscale(),
            'abilitato' => $docente->getAbilitato(),
            'spid' => $docente->getSpid(),
            'dataNascita' => $docente->getDataNascita()?->format('Y-m-d'),
            'comuneNascita' => $docente->getComuneNascita(),
            'provinciaNascita' => $docente->getProvinciaNascita(),
            'citta' => $docente->getCitta(),
            'provincia' => $docente->getProvincia(),
            'indirizzo' => $docente->getIndirizzo(),
            'numeriTelefono' => $docente->getNumeriTelefono(),
            'ultimoAccesso' => $docente->getUltimoAccesso()?->format('Y-m-d H:i:s'),
            'responsabileBes' => $docente->getResponsabileBes(),
            'rspp' => $docente->getRspp(),
            'responsabileBesSede' => $docente->getResponsabileBesSede()?->getId(),
            'ruolo' => match(true) {
                $docente instanceof Preside => 'Dirigente',
                $docente instanceof Staff => 'Staff',
                default => 'Docente',
            },
            'fotoUrl' => $docente->getFotoUrl(),
        ];
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
}
