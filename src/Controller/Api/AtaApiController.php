<?php

namespace App\Controller\Api;

use App\Entity\Ata;
use App\Entity\Sede;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/ata')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class AtaApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {}

    #[Route(path: '', name: 'api_ata_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(10, (int) $request->query->get('limit', 20)));

        $qb = $this->em->createQueryBuilder()
            ->select('a')
            ->from(Ata::class, 'a')
            ->orderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC');

        if ($search !== '') {
            $qb->andWhere('a.cognome LIKE :s OR a.nome LIKE :s OR a.username LIKE :s OR a.email LIKE :s OR a.codiceFiscale LIKE :s')
               ->setParameter('s', '%' . $search . '%');
        }

        $countQb = clone $qb;
        $countQb->select('COUNT(a.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        $ataList = $qb->getQuery()->getResult();

        return $this->json([
            'data' => array_map([$this, 'serialize'], $ataList),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    #[Route(path: '', name: 'api_ata_create', methods: ['POST'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload non valido.'], 400);
        }

        $required = ['nome', 'cognome', 'sesso', 'tipo', 'username', 'email'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return $this->json(['error' => "Il campo '$field' è obbligatorio."], 400);
            }
        }

        if ($this->em->getRepository(Ata::class)->findOneBy(['username' => strtolower(trim($data['username']))])) {
            return $this->json(['error' => 'Username già in uso.'], 409);
        }

        if ($this->em->getRepository(Ata::class)->findOneBy(['email' => strtolower(trim($data['email']))])) {
            return $this->json(['error' => 'Email già in uso.'], 409);
        }

        $ata = new Ata();
        $this->hydrateAta($ata, $data);

        $password = $data['password'] ?? $this->generatePassword();
        $ata->setPassword($this->hasher->hashPassword($ata, $password));
        $ata->setAbilitato(isset($data['abilitato']) ? (bool) $data['abilitato'] : true);

        $this->em->persist($ata);
        $this->em->flush();

        return $this->json([
            'data' => $this->serialize($ata),
            'generatedPassword' => empty($data['password']) ? $password : null,
        ], 201);
    }

    #[Route(path: '/{id}', name: 'api_ata_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function update(int $id, Request $request): JsonResponse
    {
        $ata = $this->em->getRepository(Ata::class)->find($id);
        if (!$ata) {
            return $this->json(['error' => 'ATA non trovato.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload non valido.'], 400);
        }

        $this->hydrateAta($ata, $data);

        if (!empty($data['password'])) {
            $ata->setPassword($this->hasher->hashPassword($ata, $data['password']));
        }

        $this->em->flush();

        return $this->json(['data' => $this->serialize($ata)]);
    }

    #[Route(path: '/{id}/abilita', name: 'api_ata_toggle', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function toggleAbilita(int $id): JsonResponse
    {
        $ata = $this->em->getRepository(Ata::class)->find($id);
        if (!$ata) {
            return $this->json(['error' => 'ATA non trovato.'], 404);
        }

        $ata->setAbilitato(!$ata->getAbilitato());
        $this->em->flush();

        return $this->json([
            'data' => $this->serialize($ata),
            'message' => $ata->getAbilitato() ? 'Abilitato.' : 'Disabilitato.',
        ]);
    }

    #[Route(path: '/rappresentanti', name: 'api_ata_rappresentanti', methods: ['GET'])]
    public function rappresentanti(Request $request): JsonResponse
    {
        $tipo = $request->query->get('tipo', '');
        $ataList = $this->em->getRepository(Ata::class)->findBy(['abilitato' => true], ['cognome' => 'ASC']);
        $result = [];
        foreach ($ataList as $a) {
            $rapp = $a->getRappresentante() ?? [''];
            if ($tipo && !in_array($tipo, $rapp, true)) {
                continue;
            }
            if (!$tipo && $rapp === ['']) {
                continue;
            }
            $result[] = array_merge($this->serialize($a), ['rappresentante' => $rapp]);
        }

        return $this->json(['data' => $result]);
    }

    #[Route(path: '/{id}/rappresentante', name: 'api_ata_set_rappresentante', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function setRappresentante(int $id, Request $request): JsonResponse
    {
        $ata = $this->em->getRepository(Ata::class)->find($id);
        if (!$ata) {
            return $this->json(['error' => 'ATA non trovato.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $ata->setRappresentante($data['rappresentante'] ?? ['']);
        $this->em->flush();

        return $this->json(['message' => 'Rappresentante aggiornato.']);
    }

    private function hydrateAta(Ata $ata, array $data): void
    {
        if (isset($data['nome'])) {
            $ata->setNome(ucwords(strtolower(trim($data['nome']))));
        }
        if (isset($data['cognome'])) {
            $ata->setCognome(ucwords(strtolower(trim($data['cognome']))));
        }
        if (isset($data['sesso'])) {
            $ata->setSesso(strtoupper(trim($data['sesso'])));
        }
        if (isset($data['tipo'])) {
            $ata->setTipo(strtoupper(trim($data['tipo'])));
        }
        if (isset($data['username'])) {
            $ata->setUsername(strtolower(trim($data['username'])));
        }
        if (isset($data['email'])) {
            $ata->setEmail(strtolower(trim($data['email'])));
        }
        if (isset($data['codiceFiscale'])) {
            $ata->setCodiceFiscale(strtoupper(trim((string) $data['codiceFiscale'])));
        }
        if (isset($data['dataNascita'])) {
            $ata->setDataNascita($data['dataNascita'] ? new \DateTime($data['dataNascita']) : null);
        }
        if (isset($data['comuneNascita'])) {
            $ata->setComuneNascita(trim((string) $data['comuneNascita']));
        }
        if (isset($data['provinciaNascita'])) {
            $ata->setProvinciaNascita(strtoupper(trim((string) $data['provinciaNascita'])));
        }
        if (isset($data['citta'])) {
            $ata->setCitta(trim((string) $data['citta']));
        }
        if (isset($data['provincia'])) {
            $ata->setProvincia(strtoupper(trim((string) $data['provincia'])));
        }
        if (isset($data['indirizzo'])) {
            $ata->setIndirizzo(trim((string) $data['indirizzo']));
        }
        if (isset($data['numeriTelefono'])) {
            $numeriTelefono = is_array($data['numeriTelefono']) ? $data['numeriTelefono'] : [];
            $ata->setNumeriTelefono(array_values(array_filter(array_map(
                static fn ($numero) => trim((string) $numero),
                $numeriTelefono,
            ))));
        }
        if (isset($data['segreteria'])) {
            $ata->setSegreteria((bool) $data['segreteria']);
        }
        if (array_key_exists('sedeId', $data)) {
            $sede = $data['sedeId'] ? $this->em->getRepository(Sede::class)->find((int) $data['sedeId']) : null;
            $ata->setSede($sede);
        }
        if (array_key_exists('fotoUrl', $data)) {
            $ata->setFotoUrl($data['fotoUrl'] ? trim((string) $data['fotoUrl']) : null);
        }
    }

    private function serialize(Ata $a): array
    {
        return [
            'id' => $a->getId(),
            'nome' => $a->getNome(),
            'cognome' => $a->getCognome(),
            'sesso' => $a->getSesso(),
            'username' => $a->getUsername(),
            'email' => $a->getEmail(),
            'codiceFiscale' => $a->getCodiceFiscale(),
            'dataNascita' => $a->getDataNascita()?->format('Y-m-d'),
            'comuneNascita' => $a->getComuneNascita(),
            'provinciaNascita' => $a->getProvinciaNascita(),
            'citta' => $a->getCitta(),
            'provincia' => $a->getProvincia(),
            'indirizzo' => $a->getIndirizzo(),
            'numeriTelefono' => $a->getNumeriTelefono(),
            'abilitato' => $a->getAbilitato(),
            'tipo' => $a->getTipo(),
            'tipoLabel' => match ($a->getTipo()) {
                'A' => 'Amministrativo',
                'T' => 'Tecnico',
                'C' => 'Collaboratore',
                'U' => 'Autista',
                'D' => 'DSGA',
                default => $a->getTipo(),
            },
            'segreteria' => $a->getSegreteria(),
            'sede' => $a->getSede() ? [
                'id' => $a->getSede()->getId(),
                'nomeBreve' => $a->getSede()->getNomeBreve(),
            ] : null,
            'ultimoAccesso' => $a->getUltimoAccesso()?->format('Y-m-d H:i:s'),
            'fotoUrl' => $a->getFotoUrl(),
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
