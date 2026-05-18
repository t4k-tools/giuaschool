<?php

namespace App\Controller\Api;

use App\Entity\Amministratore;
use App\Entity\Cattedra;
use App\Entity\Classe;
use App\Entity\Configurazione;
use App\Entity\Corso;
use App\Entity\DefinizioneRichiesta;
use App\Entity\DefinizioneScrutinio;
use App\Entity\Docente;
use App\Entity\Festivita;
use App\Entity\Istituto;
use App\Entity\Materia;
use App\Entity\ModuloFormativo;
use App\Entity\Orario;
use App\Entity\OrarioDocente;
use App\Entity\Preside;
use App\Entity\ScansioneOraria;
use App\Entity\Scrutinio;
use App\Entity\Sede;
use App\Entity\Staff;
use App\Entity\Utente;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class ScuolaApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {}

    // ──── CLASSI ────

    #[Route(path: '/classi', name: 'api_classi_list', methods: ['GET'])]
    public function classiList(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        $sedeId = $request->query->get('sede');
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(10, (int) $request->query->get('limit', 20)));

        $qb = $this->em->createQueryBuilder()
            ->select('c', 's', 'co', 'coord', 'segr')
            ->from(Classe::class, 'c')
            ->join('c.sede', 's')
            ->join('c.corso', 'co')
            ->leftJoin('c.coordinatore', 'coord')
            ->leftJoin('c.segretario', 'segr')
            ->orderBy('c.anno', 'ASC')
            ->addOrderBy('c.sezione', 'ASC');

        if ($search !== '') {
            $qb->andWhere('c.sezione LIKE :search OR co.nomeBreve LIKE :search OR s.nomeBreve LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        if ($sedeId) {
            $qb->andWhere('c.sede = :sede')
               ->setParameter('sede', (int) $sedeId);
        }

        $countQb = clone $qb;
        $countQb->select('COUNT(c.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        $classi = $qb->getQuery()->getResult();

        return $this->json([
            'data' => array_map([$this, 'serializeClasse'], $classi),
            'pagination' => [
                'page' => $page, 'limit' => $limit,
                'total' => $total, 'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    #[Route(path: '/classi/{id}', name: 'api_classi_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function classiGet(int $id): JsonResponse
    {
        $classe = $this->em->getRepository(Classe::class)->find($id);
        if (!$classe) {
            return $this->json(['error' => 'Classe non trovata.'], 404);
        }
        return $this->json(['data' => $this->serializeClasse($classe)]);
    }

    // ──── SEDI ────

    #[Route(path: '/sedi', name: 'api_sedi_list', methods: ['GET'])]
    public function sediList(): JsonResponse
    {
        $sedi = $this->em->getRepository(Sede::class)->findBy([], ['ordinamento' => 'ASC']);
        return $this->json([
            'data' => array_map(fn(Sede $s) => [
                'id' => $s->getId(),
                'nome' => $s->getNome(),
                'nomeBreve' => $s->getNomeBreve(),
                'citta' => $s->getCitta(),
                'indirizzo1' => $s->getIndirizzo1(),
                'indirizzo2' => $s->getIndirizzo2(),
                'telefono' => $s->getTelefono(),
                'ordinamento' => $s->getOrdinamento(),
            ], $sedi),
        ]);
    }

    #[Route(path: '/sedi/{id}', name: 'api_sedi_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function sediGet(int $id): JsonResponse
    {
        $sede = $this->em->getRepository(Sede::class)->find($id);
        if (!$sede) {
            return $this->json(['error' => 'Sede non trovata.'], 404);
        }
        return $this->json(['data' => [
            'id' => $sede->getId(),
            'nome' => $sede->getNome(),
            'nomeBreve' => $sede->getNomeBreve(),
            'citta' => $sede->getCitta(),
            'indirizzo1' => $sede->getIndirizzo1(),
            'indirizzo2' => $sede->getIndirizzo2(),
            'telefono' => $sede->getTelefono(),
            'ordinamento' => $sede->getOrdinamento(),
        ]]);
    }

    #[Route(path: '/sedi', name: 'api_sedi_create', methods: ['POST'])]
    public function sediCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (empty($data['nome']) || empty($data['nomeBreve'])) {
            return $this->json(['error' => 'Nome e nome breve sono obbligatori.'], 400);
        }

        $sede = new Sede();
        $sede->setNome($data['nome']);
        $sede->setNomeBreve($data['nomeBreve']);
        if (isset($data['citta'])) $sede->setCitta($data['citta']);
        if (isset($data['indirizzo1'])) $sede->setIndirizzo1($data['indirizzo1']);
        if (isset($data['indirizzo2'])) $sede->setIndirizzo2($data['indirizzo2']);
        if (isset($data['telefono'])) $sede->setTelefono($data['telefono']);
        if (isset($data['ordinamento'])) $sede->setOrdinamento((int) $data['ordinamento']);

        $this->em->persist($sede);
        $this->em->flush();

        return $this->json(['data' => [
            'id' => $sede->getId(),
            'nome' => $sede->getNome(),
            'nomeBreve' => $sede->getNomeBreve(),
        ]], 201);
    }

    #[Route(path: '/sedi/{id}', name: 'api_sedi_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function sediUpdate(int $id, Request $request): JsonResponse
    {
        $sede = $this->em->getRepository(Sede::class)->find($id);
        if (!$sede) {
            return $this->json(['error' => 'Sede non trovata.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['nome'])) $sede->setNome($data['nome']);
        if (isset($data['nomeBreve'])) $sede->setNomeBreve($data['nomeBreve']);
        if (isset($data['citta'])) $sede->setCitta($data['citta']);
        if (isset($data['indirizzo1'])) $sede->setIndirizzo1($data['indirizzo1']);
        if (isset($data['indirizzo2'])) $sede->setIndirizzo2($data['indirizzo2']);
        if (isset($data['telefono'])) $sede->setTelefono($data['telefono']);
        if (isset($data['ordinamento'])) $sede->setOrdinamento((int) $data['ordinamento']);

        $this->em->flush();

        return $this->json(['data' => [
            'id' => $sede->getId(),
            'nome' => $sede->getNome(),
            'nomeBreve' => $sede->getNomeBreve(),
        ]]);
    }

    // ──── MATERIE ────

    #[Route(path: '/materie', name: 'api_materie_list', methods: ['GET'])]
    public function materieList(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));

        $qb = $this->em->createQueryBuilder()
            ->select('m')
            ->from(Materia::class, 'm')
            ->orderBy('m.ordinamento', 'ASC');

        if ($search !== '') {
            $qb->andWhere('m.nome LIKE :search OR m.nomeBreve LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        $materie = $qb->getQuery()->getResult();

        return $this->json([
            'data' => array_map(fn(Materia $m) => [
                'id' => $m->getId(),
                'nome' => $m->getNome(),
                'nomeBreve' => $m->getNomeBreve(),
                'tipo' => $m->getTipo(),
                'tipoLabel' => match($m->getTipo()) {
                    'N' => 'Normale', 'R' => 'Religione', 'S' => 'Sostegno',
                    'C' => 'Condotta', 'E' => 'Ed. Civica', 'U' => 'Supplenza',
                    default => $m->getTipo(),
                },
                'valutazione' => $m->getValutazione(),
                'media' => $m->getMedia(),
                'ordinamento' => $m->getOrdinamento(),
            ], $materie),
        ]);
    }

    #[Route(path: '/materie', name: 'api_materie_create', methods: ['POST'])]
    public function materieCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (empty($data['nome']) || empty($data['nomeBreve'])) {
            return $this->json(['error' => 'Nome e nome breve sono obbligatori.'], 400);
        }

        $materia = new Materia();
        $materia->setNome(trim($data['nome']));
        $materia->setNomeBreve(trim($data['nomeBreve']));
        $materia->setTipo($data['tipo'] ?? 'N');
        $materia->setValutazione($data['valutazione'] ?? 'N');
        $materia->setMedia(isset($data['media']) ? (bool) $data['media'] : true);
        $materia->setOrdinamento(isset($data['ordinamento']) ? (int) $data['ordinamento'] : 0);

        $this->em->persist($materia);
        $this->em->flush();

        return $this->json(['data' => [
            'id' => $materia->getId(),
            'nome' => $materia->getNome(),
            'nomeBreve' => $materia->getNomeBreve(),
            'tipo' => $materia->getTipo(),
            'tipoLabel' => match($materia->getTipo()) {
                'N' => 'Normale', 'R' => 'Religione', 'S' => 'Sostegno',
                'C' => 'Condotta', 'E' => 'Ed. Civica', 'U' => 'Supplenza',
                default => $materia->getTipo(),
            },
            'valutazione' => $materia->getValutazione(),
            'media' => $materia->getMedia(),
            'ordinamento' => $materia->getOrdinamento(),
        ]], 201);
    }

    #[Route(path: '/materie/{id}', name: 'api_materie_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function materieUpdate(int $id, Request $request): JsonResponse
    {
        $materia = $this->em->getRepository(Materia::class)->find($id);
        if (!$materia) {
            return $this->json(['error' => 'Materia non trovata.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        if (isset($data['nome'])) $materia->setNome($data['nome']);
        if (isset($data['nomeBreve'])) $materia->setNomeBreve($data['nomeBreve']);
        if (isset($data['tipo'])) $materia->setTipo($data['tipo']);
        if (isset($data['valutazione'])) $materia->setValutazione($data['valutazione']);
        if (isset($data['media'])) $materia->setMedia((bool) $data['media']);
        if (isset($data['ordinamento'])) $materia->setOrdinamento((int) $data['ordinamento']);

        $this->em->flush();

        return $this->json(['data' => [
            'id' => $materia->getId(),
            'nome' => $materia->getNome(),
        ]]);
    }

    // ──── CORSI ────

    #[Route(path: '/corsi', name: 'api_corsi_list', methods: ['GET'])]
    public function corsiList(): JsonResponse
    {
        $corsi = $this->em->getRepository(Corso::class)->findBy([], ['nome' => 'ASC']);
        return $this->json([
            'data' => array_map(fn(Corso $c) => [
                'id' => $c->getId(),
                'nome' => $c->getNome(),
                'nomeBreve' => $c->getNomeBreve(),
            ], $corsi),
        ]);
    }

    #[Route(path: '/corsi', name: 'api_corsi_create', methods: ['POST'])]
    public function corsiCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (empty($data['nome']) || empty($data['nomeBreve'])) {
            return $this->json(['error' => 'Nome e nome breve sono obbligatori.'], 400);
        }
        $corso = new Corso();
        $corso->setNome($data['nome']);
        $corso->setNomeBreve($data['nomeBreve']);
        $this->em->persist($corso);
        $this->em->flush();
        return $this->json(['data' => ['id' => $corso->getId(), 'nome' => $corso->getNome(), 'nomeBreve' => $corso->getNomeBreve()]], 201);
    }

    #[Route(path: '/corsi/{id}', name: 'api_corsi_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function corsiUpdate(int $id, Request $request): JsonResponse
    {
        $corso = $this->em->getRepository(Corso::class)->find($id);
        if (!$corso) return $this->json(['error' => 'Corso non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        if (isset($data['nome'])) $corso->setNome($data['nome']);
        if (isset($data['nomeBreve'])) $corso->setNomeBreve($data['nomeBreve']);
        $this->em->flush();
        return $this->json(['data' => ['id' => $corso->getId(), 'nome' => $corso->getNome(), 'nomeBreve' => $corso->getNomeBreve()]]);
    }

    #[Route(path: '/corsi/{id}', name: 'api_corsi_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function corsiDelete(int $id): JsonResponse
    {
        $corso = $this->em->getRepository(Corso::class)->find($id);
        if (!$corso) return $this->json(['error' => 'Corso non trovato.'], 404);
        $this->em->remove($corso);
        $this->em->flush();
        return $this->json(['message' => 'Corso eliminato.']);
    }

    // ──── MODULI FORMATIVI ────

    #[Route(path: '/moduli-formativi', name: 'api_moduli_formativi_list', methods: ['GET'])]
    public function moduliFormativiList(): JsonResponse
    {
        $moduli = $this->em->getRepository(ModuloFormativo::class)->findBy([], ['tipo' => 'ASC', 'nomeBreve' => 'ASC']);

        return $this->json([
            'data' => array_map([$this, 'serializeModuloFormativo'], $moduli),
        ]);
    }

    #[Route(path: '/moduli-formativi', name: 'api_moduli_formativi_create', methods: ['POST'])]
    public function moduliFormativiCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $nome = trim((string) ($data['nome'] ?? ''));
        $nomeBreve = trim((string) ($data['nomeBreve'] ?? ''));
        $tipo = strtoupper(trim((string) ($data['tipo'] ?? 'O')));
        $classi = array_values(array_unique(array_map('intval', $data['classi'] ?? [])));
        sort($classi);

        if ($nome === '' || $nomeBreve === '') {
            return $this->json(['error' => 'Nome e nome breve sono obbligatori.'], 400);
        }
        if (!in_array($tipo, ['O', 'P'], true)) {
            return $this->json(['error' => 'Tipo modulo non valido.'], 400);
        }
        if (count($classi) === 0) {
            return $this->json(['error' => 'Seleziona almeno una classe.'], 400);
        }

        $modulo = new ModuloFormativo();
        $modulo->setNome($nome);
        $modulo->setNomeBreve($nomeBreve);
        $modulo->setTipo($tipo);
        $modulo->setClassi($classi);

        $this->em->persist($modulo);
        $this->em->flush();

        return $this->json(['data' => $this->serializeModuloFormativo($modulo)], 201);
    }

    #[Route(path: '/moduli-formativi/{id}', name: 'api_moduli_formativi_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function moduliFormativiUpdate(int $id, Request $request): JsonResponse
    {
        $modulo = $this->em->getRepository(ModuloFormativo::class)->find($id);
        if (!$modulo) {
            return $this->json(['error' => 'Modulo formativo non trovato.'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['nome'])) {
            $nome = trim((string) $data['nome']);
            if ($nome === '') {
                return $this->json(['error' => 'Il nome non può essere vuoto.'], 400);
            }
            $modulo->setNome($nome);
        }
        if (isset($data['nomeBreve'])) {
            $nomeBreve = trim((string) $data['nomeBreve']);
            if ($nomeBreve === '') {
                return $this->json(['error' => 'Il nome breve non può essere vuoto.'], 400);
            }
            $modulo->setNomeBreve($nomeBreve);
        }
        if (isset($data['tipo'])) {
            $tipo = strtoupper(trim((string) $data['tipo']));
            if (!in_array($tipo, ['O', 'P'], true)) {
                return $this->json(['error' => 'Tipo modulo non valido.'], 400);
            }
            $modulo->setTipo($tipo);
        }
        if (isset($data['classi'])) {
            $classi = array_values(array_unique(array_map('intval', $data['classi'] ?? [])));
            sort($classi);
            if (count($classi) === 0) {
                return $this->json(['error' => 'Seleziona almeno una classe.'], 400);
            }
            $modulo->setClassi($classi);
        }

        $this->em->flush();

        return $this->json(['data' => $this->serializeModuloFormativo($modulo)]);
    }

    #[Route(path: '/moduli-formativi/{id}', name: 'api_moduli_formativi_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function moduliFormativiDelete(int $id): JsonResponse
    {
        $modulo = $this->em->getRepository(ModuloFormativo::class)->find($id);
        if (!$modulo) {
            return $this->json(['error' => 'Modulo formativo non trovato.'], 404);
        }

        try {
            $this->em->remove($modulo);
            $this->em->flush();
        } catch (\Throwable) {
            return $this->json(['error' => 'Impossibile eliminare il modulo formativo perché risulta utilizzato.'], 409);
        }

        return $this->json(['message' => 'Modulo formativo eliminato.']);
    }

    // ──── CLASSI CRUD ────

    #[Route(path: '/classi', name: 'api_classi_create', methods: ['POST'])]
    public function classiCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (empty($data['anno']) || empty($data['sezione']) || empty($data['sedeId']) || empty($data['corsoId'])) {
            return $this->json(['error' => 'Anno, sezione, sede e corso sono obbligatori.'], 400);
        }
        $sede = $this->em->getRepository(Sede::class)->find($data['sedeId']);
        $corso = $this->em->getRepository(Corso::class)->find($data['corsoId']);
        if (!$sede || !$corso) return $this->json(['error' => 'Sede o corso non trovato.'], 404);
        $classe = new Classe();
        $classe->setAnno((int)$data['anno']);
        $classe->setSezione(strtoupper($data['sezione']));
        $classe->setGruppo($data['gruppo'] ?? '');
        $classe->setOreSettimanali((int)($data['oreSettimanali'] ?? 27));
        $classe->setSede($sede);
        $classe->setCorso($corso);
        $this->em->persist($classe);
        $this->em->flush();
        return $this->json(['data' => $this->serializeClasse($classe)], 201);
    }

    #[Route(path: '/classi/{id}', name: 'api_classi_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function classiUpdate(int $id, Request $request): JsonResponse
    {
        $classe = $this->em->getRepository(Classe::class)->find($id);
        if (!$classe) return $this->json(['error' => 'Classe non trovata.'], 404);
        $data = json_decode($request->getContent(), true);
        if (isset($data['anno'])) $classe->setAnno((int)$data['anno']);
        if (isset($data['sezione'])) $classe->setSezione(strtoupper($data['sezione']));
        if (isset($data['gruppo'])) $classe->setGruppo($data['gruppo']);
        if (isset($data['oreSettimanali'])) $classe->setOreSettimanali((int)$data['oreSettimanali']);
        if (isset($data['sedeId'])) {
            $sede = $this->em->getRepository(Sede::class)->find($data['sedeId']);
            if ($sede) $classe->setSede($sede);
        }
        if (isset($data['corsoId'])) {
            $corso = $this->em->getRepository(Corso::class)->find($data['corsoId']);
            if ($corso) $classe->setCorso($corso);
        }
        $this->em->flush();
        return $this->json(['data' => $this->serializeClasse($classe)]);
    }

    #[Route(path: '/classi/{id}', name: 'api_classi_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function classiDelete(int $id): JsonResponse
    {
        $classe = $this->em->getRepository(Classe::class)->find($id);
        if (!$classe) return $this->json(['error' => 'Classe non trovata.'], 404);
        $this->em->remove($classe);
        $this->em->flush();
        return $this->json(['message' => 'Classe eliminata.']);
    }

    // ──── AMMINISTRATORE UPDATE ────

    #[Route(path: '/amministratore', name: 'api_amministratore_update', methods: ['PUT'])]
    public function amministratoreUpdate(Request $request): JsonResponse
    {
        $admin = $this->em->getRepository(Amministratore::class)->findOneBy([]);
        if (!$admin) return $this->json(['error' => 'Amministratore non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        if (isset($data['nome'])) $admin->setNome(ucwords(strtolower(trim($data['nome']))));
        if (isset($data['cognome'])) $admin->setCognome(ucwords(strtolower(trim($data['cognome']))));
        if (isset($data['email'])) $admin->setEmail(strtolower(trim($data['email'])));
        if (isset($data['sesso'])) $admin->setSesso(strtoupper($data['sesso']));
        if (array_key_exists('fotoUrl', $data)) $admin->setFotoUrl($data['fotoUrl'] ?: null);
        if (!empty($data['password'])) $admin->setPassword($this->hasher->hashPassword($admin, $data['password']));
        $this->em->flush();
        return $this->json(['message' => 'Amministratore aggiornato.']);
    }

    // ──── DIRIGENTE UPDATE ────

    #[Route(path: '/dirigente', name: 'api_dirigente_create', methods: ['POST'])]
    public function dirigenteCreate(Request $request): JsonResponse
    {
        $existingDirigente = $this->em->getRepository(Preside::class)->findOneBy([]);
        if ($existingDirigente) {
            return $this->json(['error' => 'Dirigente già configurato.'], 409);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $required = ['nome', 'cognome', 'sesso', 'username', 'email', 'password'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return $this->json(['error' => "Il campo '$field' è obbligatorio."], 400);
            }
        }

        $username = strtolower(trim($data['username']));
        $email = strtolower(trim($data['email']));

        if ($this->em->getRepository(Utente::class)->findOneBy(['username' => $username])) {
            return $this->json(['error' => 'Username già in uso.'], 409);
        }
        if ($this->em->getRepository(Utente::class)->findOneBy(['email' => $email])) {
            return $this->json(['error' => 'Email già in uso.'], 409);
        }

        $dir = new Preside();
        $dir->setNome(ucwords(strtolower(trim($data['nome']))));
        $dir->setCognome(ucwords(strtolower(trim($data['cognome']))));
        $dir->setSesso(strtoupper(trim($data['sesso'])));
        $dir->setUsername($username);
        $dir->setEmail($email);
        $dir->setPassword($this->hasher->hashPassword($dir, $data['password']));
        $dir->setAbilitato(true);
        if (!empty($data['fotoUrl'])) $dir->setFotoUrl($data['fotoUrl']);

        $this->em->persist($dir);
        $this->em->flush();

        return $this->json([
            'message' => 'Dirigente creato.',
            'data' => [
                'id' => $dir->getId(),
                'nome' => $dir->getNome(),
                'cognome' => $dir->getCognome(),
                'username' => $dir->getUsername(),
                'email' => $dir->getEmail(),
                'sesso' => $dir->getSesso(),
                'fotoUrl' => $dir->getFotoUrl(),
            ],
        ], 201);
    }

    #[Route(path: '/dirigente', name: 'api_dirigente_update', methods: ['PUT'])]
    public function dirigenteUpdate(Request $request): JsonResponse
    {
        $dir = $this->em->getRepository(Preside::class)->findOneBy([]);
        if (!$dir) $dir = $this->em->getRepository(Staff::class)->findOneBy([]);
        if (!$dir) return $this->json(['error' => 'Dirigente non trovato.'], 404);
        $data = json_decode($request->getContent(), true);
        if (isset($data['nome'])) $dir->setNome(ucwords(strtolower(trim($data['nome']))));
        if (isset($data['cognome'])) $dir->setCognome(ucwords(strtolower(trim($data['cognome']))));
        if (isset($data['email'])) $dir->setEmail(strtolower(trim($data['email'])));
        if (isset($data['sesso'])) $dir->setSesso(strtoupper($data['sesso']));
        if (!empty($data['password'])) $dir->setPassword($this->hasher->hashPassword($dir, $data['password']));
        if (array_key_exists('fotoUrl', $data)) $dir->setFotoUrl($data['fotoUrl'] ?: null);
        $this->em->flush();
        return $this->json(['message' => 'Dirigente aggiornato.']);
    }

    // ──── MODULI TOGGLE ────

    #[Route(path: '/moduli/{id}/toggle', name: 'api_moduli_toggle', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function moduliToggle(int $id): JsonResponse
    {
        $modulo = $this->em->getRepository(DefinizioneRichiesta::class)->find($id);
        if (!$modulo) {
            return $this->json(['error' => 'Modulo non trovato.'], 404);
        }
        $modulo->setAbilitata(!$modulo->getAbilitata());
        $this->em->flush();

        return $this->json([
            'message' => $modulo->getAbilitata() ? 'Modulo abilitato.' : 'Modulo disabilitato.',
            'data' => $this->serializeModulo($modulo),
        ]);
    }

    // ──── CATTEDRE ────

    #[Route(path: '/cattedre', name: 'api_cattedre_list', methods: ['GET'])]
    public function cattedreList(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        $classeId = $request->query->get('classe');
        $docenteId = $request->query->get('docente');
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(10, (int) $request->query->get('limit', 20)));

        $qb = $this->em->createQueryBuilder()
            ->select('cat', 'd', 'cl', 'm')
            ->from(Cattedra::class, 'cat')
            ->join('cat.docente', 'd')
            ->join('cat.classe', 'cl')
            ->join('cat.materia', 'm')
            ->orderBy('d.cognome', 'ASC')
            ->addOrderBy('cl.anno', 'ASC')
            ->addOrderBy('cl.sezione', 'ASC');

        if ($search !== '') {
            $qb->andWhere('d.cognome LIKE :search OR d.nome LIKE :search OR m.nomeBreve LIKE :search')
               ->setParameter('search', '%' . $search . '%');
        }

        if ($classeId) {
            $qb->andWhere('cat.classe = :classe')->setParameter('classe', (int) $classeId);
        }

        if ($docenteId) {
            $qb->andWhere('cat.docente = :docente')->setParameter('docente', (int) $docenteId);
        }

        $countQb = clone $qb;
        $countQb->select('COUNT(cat.id)');
        $total = (int) $countQb->getQuery()->getSingleScalarResult();

        $qb->setFirstResult(($page - 1) * $limit)->setMaxResults($limit);
        $cattedre = $qb->getQuery()->getResult();

        return $this->json([
            'data' => array_map([$this, 'serializeCattedra'], $cattedre),
            'pagination' => [
                'page' => $page, 'limit' => $limit,
                'total' => $total, 'pages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    #[Route(path: '/cattedre', name: 'api_cattedre_create', methods: ['POST'])]
    public function cattedreCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['docenteId']) || empty($data['materiaId']) || empty($data['classeId'])) {
            return $this->json(['error' => 'Docente, materia e classe sono obbligatori.'], 400);
        }

        $docente = $this->em->getRepository(Docente::class)->find($data['docenteId']);
        if (!$docente) return $this->json(['error' => 'Docente non trovato.'], 404);

        $materia = $this->em->getRepository(Materia::class)->find($data['materiaId']);
        if (!$materia) return $this->json(['error' => 'Materia non trovata.'], 404);

        $classe = $this->em->getRepository(Classe::class)->find($data['classeId']);
        if (!$classe) return $this->json(['error' => 'Classe non trovata.'], 404);

        // Check duplicate
        $existing = $this->em->getRepository(Cattedra::class)->findOneBy([
            'docente' => $docente, 'materia' => $materia, 'classe' => $classe,
        ]);
        if ($existing) {
            return $this->json(['error' => 'Questa cattedra esiste già.'], 409);
        }

        $cattedra = new Cattedra();
        $cattedra->setDocente($docente);
        $cattedra->setMateria($materia);
        $cattedra->setClasse($classe);
        $cattedra->setTipo($data['tipo'] ?? 'N');
        $cattedra->setAttiva(true);
        $cattedra->setSupplenza(!empty($data['supplenza']));

        $this->em->persist($cattedra);
        $this->em->flush();

        return $this->json(['data' => $this->serializeCattedra($cattedra)], 201);
    }

    #[Route(path: '/cattedre/{id}', name: 'api_cattedre_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function cattedreUpdate(int $id, Request $request): JsonResponse
    {
        $cattedra = $this->em->getRepository(Cattedra::class)->find($id);
        if (!$cattedra) return $this->json(['error' => 'Cattedra non trovata.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['docenteId'])) {
            $docente = $this->em->getRepository(Docente::class)->find($data['docenteId']);
            if (!$docente) return $this->json(['error' => 'Docente non trovato.'], 404);
            $cattedra->setDocente($docente);
        }
        if (isset($data['materiaId'])) {
            $materia = $this->em->getRepository(Materia::class)->find($data['materiaId']);
            if (!$materia) return $this->json(['error' => 'Materia non trovata.'], 404);
            $cattedra->setMateria($materia);
        }
        if (isset($data['classeId'])) {
            $classe = $this->em->getRepository(Classe::class)->find($data['classeId']);
            if (!$classe) return $this->json(['error' => 'Classe non trovata.'], 404);
            $cattedra->setClasse($classe);
        }
        if (isset($data['tipo'])) $cattedra->setTipo($data['tipo']);
        if (isset($data['attiva'])) $cattedra->setAttiva((bool) $data['attiva']);
        if (isset($data['supplenza'])) $cattedra->setSupplenza((bool) $data['supplenza']);

        $this->em->flush();

        return $this->json(['data' => $this->serializeCattedra($cattedra)]);
    }

    #[Route(path: '/cattedre/{id}', name: 'api_cattedre_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function cattedreDelete(int $id): JsonResponse
    {
        $cattedra = $this->em->getRepository(Cattedra::class)->find($id);
        if (!$cattedra) return $this->json(['error' => 'Cattedra non trovata.'], 404);

        $this->em->remove($cattedra);
        $this->em->flush();

        return $this->json(['message' => 'Cattedra eliminata.']);
    }

    private function serializeCattedra(Cattedra $c): array
    {
        $cl = $c->getClasse();
        return [
            'id' => $c->getId(),
            'docente' => [
                'id' => $c->getDocente()->getId(),
                'nome' => $c->getDocente()->getNome(),
                'cognome' => $c->getDocente()->getCognome(),
            ],
            'classe' => [
                'id' => $cl->getId(),
                'nome' => $cl->getAnno() . 'ª' . $cl->getSezione() . ($cl->getGruppo() ? '-' . $cl->getGruppo() : ''),
            ],
            'materia' => [
                'id' => $c->getMateria()->getId(),
                'nome' => $c->getMateria()->getNome(),
                'nomeBreve' => $c->getMateria()->getNomeBreve(),
            ],
            'attiva' => $c->getAttiva(),
            'supplenza' => $c->getSupplenza(),
            'tipo' => $c->getTipo(),
            'tipoLabel' => match($c->getTipo()) {
                'N' => 'Normale', 'I' => 'ITP', 'P' => 'Potenziamento', 'A' => 'Att. Alternativa',
                default => $c->getTipo(),
            },
        ];
    }

    // ──── ISTITUTO ────

    #[Route(path: '/istituto', name: 'api_istituto_detail', methods: ['GET'])]
    public function istitutoDetail(): JsonResponse
    {
        $ist = $this->em->getRepository(Istituto::class)->findOneBy([]);
        if (!$ist) return $this->json(['data' => null]);
        return $this->json(['data' => $this->serializeIstituto($ist)]);
    }

    #[Route(path: '/istituto', name: 'api_istituto_update', methods: ['PUT'])]
    public function istitutoUpdate(Request $request): JsonResponse
    {
        $ist = $this->em->getRepository(Istituto::class)->findOneBy([]);
        $isNew = false;
        if (!$ist) {
            $ist = new Istituto();
            $this->em->persist($ist);
            $isNew = true;
        }
        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['tipo'])) $ist->setTipo($data['tipo']);
        if (isset($data['tipoSigla'])) $ist->setTipoSigla($data['tipoSigla']);
        if (isset($data['nome'])) $ist->setNome($data['nome']);
        if (isset($data['nomeBreve'])) $ist->setNomeBreve($data['nomeBreve']);
        if (isset($data['email'])) $ist->setEmail($data['email']);
        if (isset($data['pec'])) $ist->setPec($data['pec']);
        if (isset($data['urlSito'])) $ist->setUrlSito($data['urlSito']);
        if (isset($data['urlRegistro'])) $ist->setUrlRegistro($data['urlRegistro']);
        if (isset($data['firmaPreside'])) $ist->setFirmaPreside($data['firmaPreside']);
        if (isset($data['emailAmministratore'])) $ist->setEmailAmministratore($data['emailAmministratore']);
        if (isset($data['emailNotifiche'])) $ist->setEmailNotifiche($data['emailNotifiche']);
        if (array_key_exists('logoUrl', $data)) $ist->setLogoUrl($data['logoUrl'] ?: null);
        if (array_key_exists('indirizzo', $data)) $ist->setIndirizzo($data['indirizzo'] ?: null);
        if (array_key_exists('cap', $data)) $ist->setCap($data['cap'] ?: null);
        if (array_key_exists('citta', $data)) $ist->setCitta($data['citta'] ?: null);
        if (array_key_exists('provincia', $data)) $ist->setProvincia($data['provincia'] ?: null);
        if (array_key_exists('telefono', $data)) $ist->setTelefono($data['telefono'] ?: null);
        if (array_key_exists('codiceMeccanografico', $data)) $ist->setCodiceMeccanografico($data['codiceMeccanografico'] ?: null);
        $this->em->flush();
        return $this->json([
            'message' => $isNew ? 'Istituto creato.' : 'Istituto aggiornato.',
            'data' => $this->serializeIstituto($ist),
        ]);
    }

    private function serializeIstituto(Istituto $ist): array
    {
        return [
            'id' => $ist->getId(),
            'tipo' => $ist->getTipo(),
            'tipoSigla' => $ist->getTipoSigla(),
            'nome' => $ist->getNome(),
            'nomeBreve' => $ist->getNomeBreve(),
            'email' => $ist->getEmail(),
            'pec' => $ist->getPec(),
            'urlSito' => $ist->getUrlSito(),
            'urlRegistro' => $ist->getUrlRegistro(),
            'firmaPreside' => $ist->getFirmaPreside(),
            'emailAmministratore' => $ist->getEmailAmministratore(),
            'emailNotifiche' => $ist->getEmailNotifiche(),
            'logoUrl' => $ist->getLogoUrl(),
            'indirizzo' => $ist->getIndirizzo(),
            'cap' => $ist->getCap(),
            'citta' => $ist->getCitta(),
            'provincia' => $ist->getProvincia(),
            'telefono' => $ist->getTelefono(),
            'codiceMeccanografico' => $ist->getCodiceMeccanografico(),
        ];
    }

    // ──── AMMINISTRATORE ────

    #[Route(path: '/amministratore', name: 'api_amministratore_detail', methods: ['GET'])]
    public function amministratoreDetail(): JsonResponse
    {
        $admin = $this->em->getRepository(Amministratore::class)->findOneBy([]);
        if (!$admin) return $this->json(['data' => null]);
        return $this->json(['data' => [
            'id' => $admin->getId(), 'nome' => $admin->getNome(), 'cognome' => $admin->getCognome(),
            'username' => $admin->getUsername(), 'email' => $admin->getEmail(), 'sesso' => $admin->getSesso(),
            'fotoUrl' => $admin->getFotoUrl(),
        ]]);
    }

    // ──── DIRIGENTE ────

    #[Route(path: '/dirigente', name: 'api_dirigente_detail', methods: ['GET'])]
    public function dirigenteDetail(): JsonResponse
    {
        $dir = $this->em->getRepository(Preside::class)->findOneBy([]);
        if (!$dir) {
            $dir = $this->em->getRepository(Staff::class)->findOneBy([]);
        }
        if (!$dir) return $this->json(['data' => null]);
        return $this->json(['data' => [
            'id' => $dir->getId(), 'nome' => $dir->getNome(), 'cognome' => $dir->getCognome(),
            'username' => $dir->getUsername(), 'email' => $dir->getEmail(), 'sesso' => $dir->getSesso(),
            'fotoUrl' => $dir->getFotoUrl(),
        ]]);
    }

    // ──── FESTIVITA ────

    #[Route(path: '/festivita', name: 'api_festivita_list', methods: ['GET'])]
    public function festivitaList(): JsonResponse
    {
        $feste = $this->em->getRepository(Festivita::class)->findBy([], ['data' => 'ASC']);
        return $this->json(['data' => array_map(fn(Festivita $f) => [
            'id' => $f->getId(),
            'data' => $f->getData()->format('Y-m-d'),
            'descrizione' => $f->getDescrizione(),
            'tipo' => $f->getTipo(),
            'tipoLabel' => $f->getTipo() === 'F' ? 'Festività' : 'Assemblea',
            'sede' => $f->getSede() ? ['id' => $f->getSede()->getId(), 'nomeBreve' => $f->getSede()->getNomeBreve()] : null,
        ], $feste)]);
    }

    #[Route(path: '/festivita', name: 'api_festivita_create', methods: ['POST'])]
    public function festivitaCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $f = new Festivita();
        $f->setData(new \DateTime($data['data']));
        $f->setDescrizione($data['descrizione'] ?? '');
        $f->setTipo($data['tipo'] ?? 'F');
        if (!empty($data['sede'])) $f->setSede($this->em->getRepository(Sede::class)->find($data['sede']));
        $this->em->persist($f);
        $this->em->flush();
        return $this->json(['message' => 'Festività creata.'], 201);
    }

    #[Route(path: '/festivita/{id}', name: 'api_festivita_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function festivitaUpdate(int $id, Request $request): JsonResponse
    {
        $f = $this->em->getRepository(Festivita::class)->find($id);
        if (!$f) return $this->json(['error' => 'Festività non trovata.'], 404);
        $data = json_decode($request->getContent(), true);
        if (isset($data['data'])) $f->setData(new \DateTime($data['data']));
        if (isset($data['descrizione'])) $f->setDescrizione($data['descrizione']);
        if (isset($data['tipo'])) $f->setTipo($data['tipo']);
        if (array_key_exists('sede', $data)) $f->setSede($data['sede'] ? $this->em->getRepository(Sede::class)->find($data['sede']) : null);
        $this->em->flush();
        return $this->json(['message' => 'Festività aggiornata.']);
    }

    #[Route(path: '/festivita/{id}', name: 'api_festivita_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function festivitaDelete(int $id): JsonResponse
    {
        $f = $this->em->getRepository(Festivita::class)->find($id);
        if (!$f) return $this->json(['error' => 'Festività non trovata.'], 404);
        $this->em->remove($f);
        $this->em->flush();
        return $this->json(['message' => 'Festività eliminata.']);
    }

    // ──── ORARIO ────

    #[Route(path: '/orario', name: 'api_orario_list', methods: ['GET'])]
    public function orarioList(): JsonResponse
    {
        $orari = $this->em->getRepository(Orario::class)->findBy([], ['inizio' => 'ASC']);
        $result = [];
        foreach ($orari as $o) {
            $scansioni = $this->em->getRepository(ScansioneOraria::class)->findBy(
                ['orario' => $o], ['giorno' => 'ASC', 'ora' => 'ASC']
            );
            $result[] = [
                'id' => $o->getId(), 'nome' => $o->getNome(),
                'inizio' => $o->getInizio()->format('Y-m-d'), 'fine' => $o->getFine()->format('Y-m-d'),
                'sede' => ['id' => $o->getSede()->getId(), 'nomeBreve' => $o->getSede()->getNomeBreve()],
                'scansioni' => array_map(fn(ScansioneOraria $s) => [
                    'id' => $s->getId(), 'giorno' => $s->getGiorno(), 'ora' => $s->getOra(),
                    'inizio' => $s->getInizio()->format('H:i'), 'fine' => $s->getFine()->format('H:i'),
                    'durata' => $s->getDurata(),
                ], $scansioni),
            ];
        }
        return $this->json(['data' => $result]);
    }

    #[Route(path: '/orario', name: 'api_orario_create', methods: ['POST'])]
    public function orarioCreate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['nome']) || empty($data['inizio']) || empty($data['fine']) || empty($data['sedeId'])) {
            return $this->json(['error' => 'Nome, inizio, fine e sede sono obbligatori.'], 400);
        }
        $sede = $this->em->getRepository(Sede::class)->find($data['sedeId']);
        if (!$sede) return $this->json(['error' => 'Sede non trovata.'], 404);
        $o = new Orario();
        $o->setNome($data['nome']);
        $o->setInizio(new \DateTime($data['inizio']));
        $o->setFine(new \DateTime($data['fine']));
        $o->setSede($sede);
        $this->em->persist($o);
        $this->em->flush();
        return $this->json(['data' => $this->serializeOrario($o, [])], 201);
    }

    #[Route(path: '/orario/{id}', name: 'api_orario_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function orarioUpdate(int $id, Request $request): JsonResponse
    {
        $o = $this->em->getRepository(Orario::class)->find($id);
        if (!$o) return $this->json(['error' => 'Orario non trovato.'], 404);
        $data = json_decode($request->getContent(), true) ?? [];
        if (isset($data['nome'])) $o->setNome($data['nome']);
        if (isset($data['inizio'])) $o->setInizio(new \DateTime($data['inizio']));
        if (isset($data['fine'])) $o->setFine(new \DateTime($data['fine']));
        if (!empty($data['sedeId'])) {
            $sede = $this->em->getRepository(Sede::class)->find($data['sedeId']);
            if ($sede) $o->setSede($sede);
        }
        $this->em->flush();
        $scansioni = $this->em->getRepository(ScansioneOraria::class)->findBy(['orario' => $o], ['giorno' => 'ASC', 'ora' => 'ASC']);
        return $this->json(['data' => $this->serializeOrario($o, $scansioni)]);
    }

    #[Route(path: '/orario/{id}', name: 'api_orario_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function orarioDelete(int $id): JsonResponse
    {
        $o = $this->em->getRepository(Orario::class)->find($id);
        if (!$o) return $this->json(['error' => 'Orario non trovato.'], 404);
        $scansioni = $this->em->getRepository(ScansioneOraria::class)->findBy(['orario' => $o]);
        foreach ($scansioni as $s) {
            $this->em->remove($s);
        }
        $this->em->remove($o);
        $this->em->flush();
        return $this->json(['message' => 'Orario eliminato.']);
    }

    #[Route(path: '/orario/{id}/scansioni', name: 'api_orario_scansioni', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function orarioScansioniUpdate(int $id, Request $request): JsonResponse
    {
        $o = $this->em->getRepository(Orario::class)->find($id);
        if (!$o) return $this->json(['error' => 'Orario non trovato.'], 404);
        $data = json_decode($request->getContent(), true) ?? [];
        $items = $data['scansioni'] ?? [];
        // Remove all existing scansioni
        $existing = $this->em->getRepository(ScansioneOraria::class)->findBy(['orario' => $o]);
        foreach ($existing as $s) {
            $this->em->remove($s);
        }
        $this->em->flush();
        // Insert new scansioni
        foreach ($items as $item) {
            $s = new ScansioneOraria();
            $s->setGiorno((int) $item['giorno']);
            $s->setOra((int) $item['ora']);
            $s->setInizio(new \DateTime($item['inizio']));
            $s->setFine(new \DateTime($item['fine']));
            $s->setDurata((float) ($item['durata'] ?? 1.0));
            $s->setOrario($o);
            $this->em->persist($s);
        }
        $this->em->flush();
        $scansioni = $this->em->getRepository(ScansioneOraria::class)->findBy(['orario' => $o], ['giorno' => 'ASC', 'ora' => 'ASC']);
        return $this->json(['data' => $this->serializeOrario($o, $scansioni)]);
    }

    private function serializeOrario(Orario $o, array $scansioni): array
    {
        return [
            'id' => $o->getId(),
            'nome' => $o->getNome(),
            'inizio' => $o->getInizio()->format('Y-m-d'),
            'fine' => $o->getFine()->format('Y-m-d'),
            'sede' => ['id' => $o->getSede()->getId(), 'nomeBreve' => $o->getSede()->getNomeBreve()],
            'scansioni' => array_map(fn(ScansioneOraria $s) => [
                'id' => $s->getId(), 'giorno' => $s->getGiorno(), 'ora' => $s->getOra(),
                'inizio' => $s->getInizio()->format('H:i'), 'fine' => $s->getFine()->format('H:i'),
                'durata' => $s->getDurata(),
            ], $scansioni),
        ];
    }

    // ──── ORARIO LEZIONI (OrarioDocente) ────

    #[Route(path: '/orario/{id}/lezioni', name: 'api_orario_lezioni_list', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function orarioLezioniList(int $id, Request $request): JsonResponse
    {
        $o = $this->em->getRepository(Orario::class)->find($id);
        if (!$o) return $this->json(['error' => 'Orario non trovato.'], 404);

        $qb = $this->em->createQueryBuilder()
            ->select('od', 'cat', 'd', 'm', 'cl')
            ->from(OrarioDocente::class, 'od')
            ->join('od.cattedra', 'cat')
            ->join('cat.docente', 'd')
            ->join('cat.materia', 'm')
            ->join('cat.classe', 'cl')
            ->where('od.orario = :orario')
            ->setParameter('orario', $o)
            ->orderBy('od.giorno', 'ASC')
            ->addOrderBy('od.ora', 'ASC');

        $classeId = $request->query->get('classe');
        if ($classeId) {
            $qb->andWhere('cat.classe = :classe')
               ->setParameter('classe', (int) $classeId);
        }

        $entries = $qb->getQuery()->getResult();
        return $this->json(['data' => array_map([$this, 'serializeOrarioLezione'], $entries)]);
    }

    #[Route(path: '/orario/{id}/lezioni', name: 'api_orario_lezioni_add', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function orarioLezioniAdd(int $id, Request $request): JsonResponse
    {
        $o = $this->em->getRepository(Orario::class)->find($id);
        if (!$o) return $this->json(['error' => 'Orario non trovato.'], 404);

        $data = json_decode($request->getContent(), true) ?? [];
        if (!isset($data['giorno']) || !isset($data['ora']) || empty($data['cattedraId'])) {
            return $this->json(['error' => 'Giorno, ora e cattedra sono obbligatori.'], 400);
        }

        $cattedra = $this->em->getRepository(Cattedra::class)->find($data['cattedraId']);
        if (!$cattedra) return $this->json(['error' => 'Cattedra non trovata.'], 404);

        // Prevent duplicate
        $existing = $this->em->getRepository(OrarioDocente::class)->findOneBy([
            'orario' => $o, 'giorno' => (int) $data['giorno'],
            'ora' => (int) $data['ora'], 'cattedra' => $cattedra,
        ]);
        if ($existing) {
            return $this->json(['error' => 'Questa assegnazione esiste già.'], 409);
        }

        // Check docente conflict: same docente, same day+hour, different class
        $docente = $cattedra->getDocente();
        $conflict = $this->em->createQueryBuilder()
            ->select('od')
            ->from(OrarioDocente::class, 'od')
            ->join('od.cattedra', 'cat')
            ->where('od.orario = :orario')
            ->andWhere('od.giorno = :giorno')
            ->andWhere('od.ora = :ora')
            ->andWhere('cat.docente = :docente')
            ->setParameter('orario', $o)
            ->setParameter('giorno', (int) $data['giorno'])
            ->setParameter('ora', (int) $data['ora'])
            ->setParameter('docente', $docente)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();

        if ($conflict) {
            $conflictClasse = $conflict->getCattedra()->getClasse();
            $conflictMateria = $conflict->getCattedra()->getMateria();
            return $this->json([
                'error' => sprintf(
                    'Il docente %s %s è già assegnato in questa ora nella classe %s%s (%s).',
                    $docente->getCognome(),
                    $docente->getNome(),
                    $conflictClasse->getAnno() . 'ª' . $conflictClasse->getSezione(),
                    $conflictClasse->getGruppo() ? '-' . $conflictClasse->getGruppo() : '',
                    $conflictMateria->getNomeBreve()
                ),
            ], 409);
        }

        $od = new OrarioDocente();
        $od->setOrario($o);
        $od->setGiorno((int) $data['giorno']);
        $od->setOra((int) $data['ora']);
        $od->setCattedra($cattedra);
        $this->em->persist($od);
        $this->em->flush();

        return $this->json(['data' => $this->serializeOrarioLezione($od)], 201);
    }

    #[Route(path: '/orario/{orarioId}/lezioni/{id}', name: 'api_orario_lezioni_delete', methods: ['DELETE'], requirements: ['orarioId' => '\d+', 'id' => '\d+'])]
    public function orarioLezioniDelete(int $orarioId, int $id): JsonResponse
    {
        $od = $this->em->getRepository(OrarioDocente::class)->find($id);
        if (!$od || $od->getOrario()->getId() !== $orarioId) {
            return $this->json(['error' => 'Lezione non trovata.'], 404);
        }
        $this->em->remove($od);
        $this->em->flush();
        return $this->json(['message' => 'Lezione rimossa.']);
    }

    private function serializeOrarioLezione(OrarioDocente $od): array
    {
        $cat = $od->getCattedra();
        return [
            'id' => $od->getId(),
            'giorno' => $od->getGiorno(),
            'ora' => $od->getOra(),
            'cattedra' => [
                'id' => $cat->getId(),
                'docente' => [
                    'id' => $cat->getDocente()->getId(),
                    'cognome' => $cat->getDocente()->getCognome(),
                    'nome' => $cat->getDocente()->getNome(),
                ],
                'materia' => [
                    'id' => $cat->getMateria()->getId(),
                    'nomeBreve' => $cat->getMateria()->getNomeBreve(),
                    'nome' => $cat->getMateria()->getNome(),
                ],
            ],
        ];
    }

    // ──── SCRUTINI (definizioni) ────

    #[Route(path: '/scrutini', name: 'api_scrutini_list', methods: ['GET'])]
    public function scrutiniList(): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        $periodi = $repo->infoScrutini();
        $periodi['G'] = 'Giudizio Sospeso';
        $periodi['R'] = 'Rinviato';
        $periodi['X'] = 'Rinviato A.S. prec.';

        $defs = [];
        foreach ($periodi as $periodo => $label) {
            $def = $this->em->getRepository(DefinizioneScrutinio::class)->findOneBy(['periodo' => $periodo]);
            $defs[] = $this->serializeScrutinio($periodo, $label, $def);
        }

        return $this->json(['data' => $defs]);
    }

    #[Route(path: '/scrutini/{periodo}', name: 'api_scrutini_update', methods: ['PUT'], requirements: ['periodo' => 'P|S|F|G|R|X'])]
    public function scrutiniUpdate(string $periodo, Request $request): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        $periodi = $repo->infoScrutini();
        $periodi['G'] = 'Giudizio Sospeso';
        $periodi['R'] = 'Rinviato';
        $periodi['X'] = 'Rinviato A.S. prec.';

        if (!isset($periodi[$periodo])) {
            return $this->json(['error' => 'Periodo di scrutinio non valido.'], 400);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['data']) || empty($data['dataProposte'])) {
            return $this->json(['error' => 'Data scrutinio e data proposte sono obbligatorie.'], 400);
        }

        $def = $this->em->getRepository(DefinizioneScrutinio::class)->findOneBy(['periodo' => $periodo]);
        if (!$def) {
            $defaultStructure = $this->buildDefaultScrutinioStructure($periodo, $periodi[$periodo]);
            $def = (new DefinizioneScrutinio())
                ->setPeriodo($periodo)
                ->setArgomenti($defaultStructure['argomenti'])
                ->setStruttura($defaultStructure['struttura']);
            $this->em->persist($def);
        }

        $def->setData(new DateTime($data['data']));
        $def->setDataProposte(new DateTime($data['dataProposte']));

        $classiVisibili = $def->getClassiVisibili();
        foreach (range(1, 5) as $anno) {
            $value = $data['classiVisibili'][(string) $anno] ?? $data['classiVisibili'][$anno] ?? null;
            $classiVisibili[$anno] = $value ? new DateTime($value) : null;
        }
        $def->setClassiVisibili($classiVisibili);

        $subquery = $this->em->getRepository(Classe::class)->createQueryBuilder('c')
            ->select('c.id')
            ->where('c.anno = :anno')
            ->getDQL();

        foreach (range(1, 5) as $anno) {
            $this->em->getRepository(Scrutinio::class)->createQueryBuilder('s')
                ->update()
                ->set('s.modificato', ':modificato')
                ->set('s.visibile', ':visibile')
                ->where('s.periodo = :periodo AND s.classe IN (' . $subquery . ')')
                ->setParameter('modificato', new DateTime())
                ->setParameter('visibile', $classiVisibili[$anno])
                ->setParameter('periodo', $periodo)
                ->setParameter('anno', $anno)
                ->getQuery()
                ->execute();
        }

        $this->em->flush();

        return $this->json([
            'message' => 'Definizione scrutinio aggiornata.',
            'data' => $this->serializeScrutinio($periodo, $periodi[$periodo], $def),
        ]);
    }

    // ──── MODULI DI RICHIESTA ────

    #[Route(path: '/moduli', name: 'api_moduli_list', methods: ['GET'])]
    public function moduliList(): JsonResponse
    {
        $moduli = $this->em->getRepository(DefinizioneRichiesta::class)->findBy([], ['nome' => 'ASC']);
        return $this->json(['data' => array_map([$this, 'serializeModulo'], $moduli)]);
    }

    #[Route(path: '/moduli/{id}', name: 'api_moduli_update', methods: ['PUT'], requirements: ['id' => '\d+'])]
    public function moduliUpdate(int $id, Request $request): JsonResponse
    {
        $modulo = $this->em->getRepository(DefinizioneRichiesta::class)->find($id);
        if (!$modulo) {
            return $this->json(['error' => 'Modulo non trovato.'], 404);
        }

        $body = json_decode((string) $request->getContent(), true) ?? [];

        if (array_key_exists('unica', $body)) {
            $modulo->setUnica((bool) $body['unica']);
        }
        if (array_key_exists('gestione', $body)) {
            $modulo->setGestione((bool) $body['gestione']);
        }
        if (array_key_exists('allegati', $body)) {
            $allegati = max(0, (int) $body['allegati']);
            $modulo->setAllegati($allegati);
        }
        if (array_key_exists('abilitata', $body)) {
            $modulo->setAbilitata((bool) $body['abilitata']);
        }

        $this->em->flush();

        return $this->json([
            'message' => 'Modulo aggiornato.',
            'data' => $this->serializeModulo($modulo),
        ]);
    }

    // ──── SERIALIZERS ────

    private function serializeModulo(DefinizioneRichiesta $m): array
    {
        $toArray = static fn (string $s): array => array_values(array_filter(array_map('trim', explode(',', $s))));

        return [
            'id' => $m->getId(),
            'nome' => $m->getNome(),
            'abilitata' => $m->getAbilitata(),
            'unica' => $m->getUnica(),
            'gestione' => $m->getGestione(),
            'tipo' => $m->getTipo(),
            'allegati' => $m->getAllegati(),
            'richiedenti' => $toArray($m->getRichiedenti()),
            'destinatari' => $toArray($m->getDestinatari()),
            'sede' => $m->getSede() ? ['id' => $m->getSede()->getId(), 'nomeBreve' => $m->getSede()->getNomeBreve()] : null,
        ];
    }

    private function serializeClasse(Classe $c): array
    {
        $coord = $c->getCoordinatore();
        $segr = $c->getSegretario();
        return [
            'id' => $c->getId(),
            'anno' => $c->getAnno(),
            'sezione' => $c->getSezione(),
            'gruppo' => $c->getGruppo(),
            'nome' => $c->getAnno() . 'ª' . $c->getSezione() . ($c->getGruppo() ? '-' . $c->getGruppo() : ''),
            'oreSettimanali' => $c->getOreSettimanali(),
            'sede' => [
                'id' => $c->getSede()->getId(),
                'nome' => $c->getSede()->getNome(),
                'nomeBreve' => $c->getSede()->getNomeBreve(),
            ],
            'corso' => [
                'id' => $c->getCorso()->getId(),
                'nome' => $c->getCorso()->getNome(),
                'nomeBreve' => $c->getCorso()->getNomeBreve(),
            ],
            'coordinatore' => $coord ? [
                'id' => $coord->getId(),
                'nome' => $coord->getNome(),
                'cognome' => $coord->getCognome(),
            ] : null,
            'segretario' => $segr ? [
                'id' => $segr->getId(),
                'nome' => $segr->getNome(),
                'cognome' => $segr->getCognome(),
            ] : null,
        ];
    }

    private function serializeModuloFormativo(ModuloFormativo $modulo): array
    {
        return [
            'id' => $modulo->getId(),
            'nome' => $modulo->getNome(),
            'nomeBreve' => $modulo->getNomeBreve(),
            'tipo' => $modulo->getTipo(),
            'tipoLabel' => $modulo->getTipo() === 'P' ? 'PCTO' : 'Orientamento',
            'classi' => array_map('intval', $modulo->getClassi()),
        ];
    }

    private function serializeScrutinio(string $periodo, string $label, ?DefinizioneScrutinio $def): array
    {
        $classiVisibili = [];
        foreach (range(1, 5) as $anno) {
            $classiVisibili[(string) $anno] = $def?->getClassiVisibili()[$anno]?->format('Y-m-d\TH:i');
        }

        return [
            'id' => $def?->getId(),
            'periodo' => $periodo,
            'periodoLabel' => $label,
            'data' => $def?->getData()?->format('Y-m-d'),
            'dataProposte' => $def?->getDataProposte()?->format('Y-m-d'),
            'classiVisibili' => $classiVisibili,
        ];
    }

    private function buildDefaultScrutinioStructure(string $periodo, string $periodoLabel): array
    {
        $argomenti = [
            1 => $periodo === 'P' || $periodo === 'S'
                ? 'Verbale scrutinio ' . $periodoLabel
                : 'Verbale scrutinio',
            2 => 'Situazioni particolari',
        ];

        $struttura = [
            1 => ['ScrutinioInizio', false, []],
            2 => ['ScrutinioSvolgimento', false, ['sezione' => 'Punto primo', 'argomento' => 1]],
            3 => ['Argomento', true, [
                'sezione' => 'Punto secondo',
                'argomento' => 2,
                'obbligatorio' => false,
                'inizio' => '',
                'seVuoto' => '',
                'default' => '',
                'fine' => '',
            ]],
            4 => ['ScrutinioFine', false, []],
        ];

        return [
            'argomenti' => $argomenti,
            'struttura' => $struttura,
        ];
    }
}
