<?php

namespace App\Controller\Api;

use App\Entity\Alunno;
use App\Entity\Classe;
use App\Entity\Genitore;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\ExpressionLanguage\Expression;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class AlunniApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {}

    #[Route(path: '/alunni', name: 'api_alunni_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        $classeId = $request->query->get('classe');
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(10, (int) $request->query->get('limit', 20)));

        $qb = $this->em->createQueryBuilder()
            ->select('a', 'c')
            ->from(Alunno::class, 'a')
            ->leftJoin('a.classe', 'c')
            ->orderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC');

        if ($search !== '') {
            $qb->andWhere('a.cognome LIKE :search OR a.nome LIKE :search OR a.username LIKE :search OR a.codiceFiscale LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        if ($classeId) {
            $qb->andWhere('a.classe = :classe')
               ->setParameter('classe', (int) $classeId);
        }

        // conta
        $countQb = clone $qb;
        $countQb->select('COUNT(a.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        $qb->setFirstResult(($page - 1) * $limit)
           ->setMaxResults($limit);

        $alunni = $qb->getQuery()->getResult();

        return $this->json([
            'data' => array_map([$this, 'serializeAlunno'], $alunni),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    #[Route(path: '/alunni/{id}', name: 'api_alunni_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function get(int $id): JsonResponse
    {
        $alunno = $this->em->getRepository(Alunno::class)->find($id);
        if (!$alunno) {
            return $this->json(['error' => 'Alunno non trovato.'], 404);
        }

        return $this->json(['data' => $this->serializeAlunno($alunno)]);
    }

    #[Route(path: '/alunni', name: 'api_alunni_create', methods: ['POST'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['cognome']) || empty($data['nome']) || empty($data['sesso'])) {
            return $this->json(['error' => 'Cognome, nome e sesso sono obbligatori.'], 400);
        }

        // Generate username if not provided
        $username = !empty($data['username']) ? strtolower(trim($data['username'])) : null;
        if (!$username) {
            $base = $this->transliterate(strtolower(trim($data['nome'])) . '.' . strtolower(trim($data['cognome'])));
            $username = $base;
            $suffix = 1;
            while ($this->em->getRepository(Alunno::class)->findOneBy(['username' => $username])) {
                $username = $base . $suffix;
                $suffix++;
            }
        } else {
            // Check uniqueness
            $existing = $this->em->getRepository(Alunno::class)->findOneBy(['username' => $username]);
            if ($existing) {
                return $this->json(['error' => "Username '$username' già in uso."], 409);
            }
        }

        $email = !empty($data['email']) ? strtolower(trim($data['email'])) : $username . '@noemail.local';

        $alunno = new Alunno();
        $alunno->setCognome(ucwords(strtolower(trim($data['cognome']))));
        $alunno->setNome(ucwords(strtolower(trim($data['nome']))));
        $alunno->setSesso(strtoupper($data['sesso']));
        $alunno->setUsername($username);
        $alunno->setEmail($email);
        $alunno->setAbilitato(true);
        $alunno->setBes($data['bes'] ?? 'N');
        $alunno->setReligione($data['religione'] ?? 'S');

        if (!empty($data['codiceFiscale'])) $alunno->setCodiceFiscale(strtoupper(trim($data['codiceFiscale'])));
        if (!empty($data['dataNascita'])) $alunno->setDataNascita(new \DateTime($data['dataNascita']));
        if (!empty($data['comuneNascita'])) $alunno->setComuneNascita($data['comuneNascita']);
        if (!empty($data['citta'])) $alunno->setCitta($data['citta']);
        if (!empty($data['indirizzo'])) $alunno->setIndirizzo($data['indirizzo']);
        if (array_key_exists('fotoUrl', $data)) $alunno->setFotoUrl($data['fotoUrl'] ?: null);

        if (!empty($data['classe'])) {
            $classe = $this->em->getRepository(Classe::class)->find($data['classe']);
            if ($classe) $alunno->setClasse($classe);
        }

        // Generate password: use provided or auto-generate
        $password = !empty($data['password']) ? $data['password'] : $this->generatePassword();
        $alunno->setPassword($this->hasher->hashPassword($alunno, $password));

        $this->em->persist($alunno);
        $this->em->flush();

        return $this->json(['data' => $this->serializeAlunno($alunno)], 201);
    }

    #[Route(path: '/alunni/{id}', name: 'api_alunni_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function update(int $id, Request $request): JsonResponse
    {
        $alunno = $this->em->getRepository(Alunno::class)->find($id);
        if (!$alunno) {
            return $this->json(['error' => 'Alunno non trovato.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $this->hydrateAlunno($alunno, $data);

        if (!empty($data['password'])) {
            $alunno->setPassword($this->hasher->hashPassword($alunno, $data['password']));
        }

        $this->em->flush();

        return $this->json(['data' => $this->serializeAlunno($alunno)]);
    }

    #[Route(path: '/alunni/{id}/abilita', name: 'api_alunni_toggle', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function toggleAbilita(int $id): JsonResponse
    {
        $alunno = $this->em->getRepository(Alunno::class)->find($id);
        if (!$alunno) {
            return $this->json(['error' => 'Alunno non trovato.'], 404);
        }

        $alunno->setAbilitato(!$alunno->getAbilitato());
        $this->em->flush();

        return $this->json([
            'data' => $this->serializeAlunno($alunno),
            'message' => $alunno->getAbilitato() ? 'Alunno abilitato.' : 'Alunno disabilitato.',
        ]);
    }

    // ──── CAMBIO CLASSE ────

    #[Route(path: '/alunni/{id}/classe', name: 'api_alunni_cambio_classe', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function cambioClasse(int $id, Request $request): JsonResponse
    {
        $alunno = $this->em->getRepository(Alunno::class)->find($id);
        if (!$alunno) return $this->json(['error' => 'Alunno non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        $classe = ($data['classeId'] ?? null) ? $this->em->getRepository(Classe::class)->find($data['classeId']) : null;
        $alunno->setClasse($classe);
        $this->em->flush();
        return $this->json(['message' => 'Classe aggiornata.', 'data' => $this->serializeAlunno($alunno)]);
    }

    // ──── RAPPRESENTANTI ALUNNI ────

    #[Route(path: '/alunni/rappresentanti', name: 'api_alunni_rappresentanti', methods: ['GET'])]
    public function rappresentanti(): JsonResponse
    {
        $alunni = $this->em->getRepository(Alunno::class)->findBy(['abilitato' => true], ['cognome' => 'ASC']);
        $result = [];
        foreach ($alunni as $a) {
            $rapp = $a->getRappresentante() ?? [''];
            if ($rapp === ['']) continue;
            $result[] = array_merge($this->serializeAlunno($a), ['rappresentante' => $rapp]);
        }
        return $this->json(['data' => $result]);
    }

    #[Route(path: '/alunni/{id}/rappresentante', name: 'api_alunni_set_rappresentante', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function setRappresentante(int $id, Request $request): JsonResponse
    {
        $alunno = $this->em->getRepository(Alunno::class)->find($id);
        if (!$alunno) return $this->json(['error' => 'Alunno non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        $alunno->setRappresentante($data['rappresentante'] ?? ['']);
        $this->em->flush();
        return $this->json(['message' => 'Rappresentante aggiornato.']);
    }

    // ──── RAPPRESENTANTI GENITORI ────

    #[Route(path: '/alunni/rappresentanti-genitori', name: 'api_alunni_rappresentanti_genitori', methods: ['GET'])]
    public function rappresentantiGenitori(): JsonResponse
    {
        $genitori = $this->em->getRepository(Genitore::class)->findBy(['abilitato' => true], ['cognome' => 'ASC']);
        $result = [];
        foreach ($genitori as $g) {
            $rapp = $g->getRappresentante() ?? [''];
            if ($rapp === ['']) continue;
            $alunno = $g->getAlunno();
            $result[] = [
                'id' => $g->getId(), 'nome' => $g->getNome(), 'cognome' => $g->getCognome(),
                'email' => $g->getEmail(), 'rappresentante' => $rapp,
                'alunno' => $alunno ? [
                    'id' => $alunno->getId(), 'cognome' => $alunno->getCognome(), 'nome' => $alunno->getNome(),
                    'classe' => $alunno->getClasse() ? [
                        'id' => $alunno->getClasse()->getId(),
                        'nome' => $alunno->getClasse()->getAnno() . 'ª' . $alunno->getClasse()->getSezione(),
                    ] : null,
                ] : null,
            ];
        }
        return $this->json(['data' => $result]);
    }

    #[Route(path: '/alunni/rappresentanti-genitori/{id}', name: 'api_alunni_rappresentanti_genitori_set', methods: ['PUT'], requirements: ['id' => '\d+'])]
    #[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
    public function setRappresentanteGenitore(int $id, Request $request): JsonResponse
    {
        $genitore = $this->em->getRepository(Genitore::class)->find($id);
        if (!$genitore) return $this->json(['error' => 'Genitore non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        $genitore->setRappresentante($data['rappresentante'] ?? ['']);
        $this->em->flush();
        return $this->json(['message' => 'Rappresentante aggiornato.']);
    }

    private function hydrateAlunno(Alunno $alunno, array $data): void
    {
        if (isset($data['nome'])) $alunno->setNome(ucwords(strtolower(trim($data['nome']))));
        if (isset($data['cognome'])) $alunno->setCognome(ucwords(strtolower(trim($data['cognome']))));
        if (isset($data['sesso'])) $alunno->setSesso(strtoupper($data['sesso']));
        if (isset($data['username'])) $alunno->setUsername(strtolower(trim($data['username'])));
        if (isset($data['email'])) $alunno->setEmail(strtolower(trim($data['email'])));
        if (isset($data['codiceFiscale'])) $alunno->setCodiceFiscale(strtoupper(trim($data['codiceFiscale'])));
        if (isset($data['dataNascita'])) $alunno->setDataNascita($data['dataNascita'] ? new \DateTime($data['dataNascita']) : null);
        if (isset($data['comuneNascita'])) $alunno->setComuneNascita($data['comuneNascita']);
        if (isset($data['citta'])) $alunno->setCitta($data['citta']);
        if (isset($data['indirizzo'])) $alunno->setIndirizzo($data['indirizzo']);
        if (isset($data['bes'])) $alunno->setBes($data['bes']);
        if (isset($data['religione'])) $alunno->setReligione($data['religione']);
        if (isset($data['frequenzaEstero'])) $alunno->setFrequenzaEstero((bool) $data['frequenzaEstero']);
        if (isset($data['giustificaOnline'])) $alunno->setGiustificaOnline((bool) $data['giustificaOnline']);

        if (array_key_exists('classe', $data)) {
            $classe = $data['classe'] ? $this->em->getRepository(Classe::class)->find($data['classe']) : null;
            $alunno->setClasse($classe);
        }

        if (array_key_exists('fotoUrl', $data)) $alunno->setFotoUrl($data['fotoUrl'] ?: null);
    }

    private function serializeAlunno(Alunno $alunno): array
    {
        $classe = $alunno->getClasse();
        return [
            'id' => $alunno->getId(),
            'nome' => $alunno->getNome(),
            'cognome' => $alunno->getCognome(),
            'sesso' => $alunno->getSesso(),
            'username' => $alunno->getUsername(),
            'email' => $alunno->getEmail(),
            'codiceFiscale' => $alunno->getCodiceFiscale(),
            'abilitato' => $alunno->getAbilitato(),
            'dataNascita' => $alunno->getDataNascita()?->format('Y-m-d'),
            'comuneNascita' => $alunno->getComuneNascita(),
            'citta' => $alunno->getCitta(),
            'indirizzo' => $alunno->getIndirizzo(),
            'bes' => $alunno->getBes(),
            'religione' => $alunno->getReligione(),
            'frequenzaEstero' => $alunno->getFrequenzaEstero(),
            'giustificaOnline' => $alunno->getGiustificaOnline(),
            'ultimoAccesso' => $alunno->getUltimoAccesso()?->format('Y-m-d H:i:s'),
            'fotoUrl' => $alunno->getFotoUrl(),
            'classe' => $classe ? [
                'id' => $classe->getId(),
                'nome' => $classe->getAnno() . 'ª' . $classe->getSezione() . ($classe->getGruppo() ? '-' . $classe->getGruppo() : ''),
            ] : null,
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

    private function transliterate(string $text): string
    {
        $map = ['à' => 'a', 'è' => 'e', 'é' => 'e', 'ì' => 'i', 'ò' => 'o', 'ù' => 'u',
                'á' => 'a', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ñ' => 'n', 'ü' => 'u',
                "'" => '', ' ' => '', '-' => ''];
        return strtr($text, $map);
    }
}
