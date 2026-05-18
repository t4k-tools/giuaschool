<?php

namespace App\Controller\Api;

use App\Entity\Configurazione;
use App\Entity\Log;
use App\Entity\Utente;
use App\Entity\Docente;
use App\Entity\Alunno;
use App\Entity\Ata;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/sistema')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class SistemaApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
        private JWTTokenManagerInterface $jwtManager,
    ) {}

    // ──── PARAMETRI ────

    #[Route(path: '/parametri', name: 'api_sistema_parametri', methods: ['GET'])]
    public function parametriList(): JsonResponse
    {
        $params = $this->em->getRepository(Configurazione::class)->findBy(
            ['gestito' => false],
            ['categoria' => 'ASC', 'parametro' => 'ASC']
        );
        $grouped = [];
        foreach ($params as $p) {
            $cat = $p->getCategoria() ?: 'ALTRO';
            $grouped[$cat][] = [
                'id' => $p->getId(),
                'parametro' => $p->getParametro(),
                'valore' => $p->getValore(),
                'categoria' => $cat,
                'descrizione' => $p->getDescrizione(),
            ];
        }
        return $this->json(['data' => $grouped]);
    }

    #[Route(path: '/parametri', name: 'api_sistema_parametri_update', methods: ['PUT'])]
    public function parametriUpdate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $updated = 0;
        foreach ($data['parametri'] ?? [] as $item) {
            $param = $this->em->getRepository(Configurazione::class)->find($item['id']);
            if ($param && !$param->getGestito()) {
                $param->setValore($item['valore'] ?? '');
                $updated++;
            }
        }
        $this->em->flush();
        return $this->json(['message' => "$updated parametri aggiornati."]);
    }

    // ──── BANNER ────

    #[Route(path: '/banner', name: 'api_sistema_banner', methods: ['GET'])]
    public function bannerGet(): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        return $this->json([
            'banner_login' => $repo->getParametro('banner_login', ''),
            'banner_home' => $repo->getParametro('banner_home', ''),
        ]);
    }

    #[Route(path: '/banner', name: 'api_sistema_banner_update', methods: ['PUT'])]
    public function bannerUpdate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $repo = $this->em->getRepository(Configurazione::class);
        if (isset($data['banner_login'])) $repo->setParametro('banner_login', $data['banner_login']);
        if (isset($data['banner_home'])) $repo->setParametro('banner_home', $data['banner_home']);
        return $this->json(['message' => 'Banner aggiornati.']);
    }

    // ──── MANUTENZIONE ────

    #[Route(path: '/manutenzione', name: 'api_sistema_manutenzione', methods: ['GET'])]
    public function manutenzioneGet(): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        return $this->json([
            'inizio' => $repo->getParametro('manutenzione_inizio', ''),
            'fine' => $repo->getParametro('manutenzione_fine', ''),
        ]);
    }

    #[Route(path: '/manutenzione', name: 'api_sistema_manutenzione_update', methods: ['PUT'])]
    public function manutenzioneUpdate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $repo = $this->em->getRepository(Configurazione::class);
        $repo->setParametro('manutenzione_inizio', $data['inizio'] ?? '');
        $repo->setParametro('manutenzione_fine', $data['fine'] ?? '');
        return $this->json(['message' => 'Manutenzione aggiornata.']);
    }

    // ──── EMAIL CONFIG ────

    #[Route(path: '/email', name: 'api_sistema_email', methods: ['GET'])]
    public function emailGet(): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        return $this->json([
            'server' => $repo->getParametro('email_server', ''),
            'porta' => $repo->getParametro('email_porta', ''),
            'username' => $repo->getParametro('email_username', ''),
            'password' => $repo->getParametro('email_password', ''),
            'mittente' => $repo->getParametro('email_mittente', ''),
        ]);
    }

    #[Route(path: '/email', name: 'api_sistema_email_update', methods: ['PUT'])]
    public function emailUpdate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $repo = $this->em->getRepository(Configurazione::class);
        foreach (['server', 'porta', 'username', 'password', 'mittente'] as $k) {
            if (isset($data[$k])) $repo->setParametro('email_' . $k, $data[$k]);
        }
        return $this->json(['message' => 'Configurazione email aggiornata.']);
    }

    // ──── TELEGRAM CONFIG ────

    #[Route(path: '/telegram', name: 'api_sistema_telegram', methods: ['GET'])]
    public function telegramGet(): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        return $this->json([
            'bot_token' => $repo->getParametro('telegram_bot_token', ''),
            'webhook' => $repo->getParametro('telegram_webhook', ''),
            'abilitato' => $repo->getParametro('telegram_abilitato', '0'),
        ]);
    }

    #[Route(path: '/telegram', name: 'api_sistema_telegram_update', methods: ['PUT'])]
    public function telegramUpdate(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $repo = $this->em->getRepository(Configurazione::class);
        foreach (['bot_token', 'webhook', 'abilitato'] as $k) {
            if (isset($data[$k])) $repo->setParametro('telegram_' . $k, $data[$k]);
        }
        return $this->json(['message' => 'Configurazione Telegram aggiornata.']);
    }

    // ──── CAMBIO PASSWORD UTENTE ────

    #[Route(path: '/password', name: 'api_sistema_password', methods: ['POST'])]
    public function cambiaPassword(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $userId = $data['userId'] ?? null;
        $newPassword = $data['password'] ?? '';

        if (!$userId || strlen($newPassword) < 8) {
            return $this->json(['error' => 'Utente e password (min 8 caratteri) obbligatori.'], 400);
        }

        $user = $this->em->getRepository(Utente::class)->find($userId);
        if (!$user) {
            return $this->json(['error' => 'Utente non trovato.'], 404);
        }

        $user->setPassword($this->hasher->hashPassword($user, $newPassword));
        $this->em->flush();

        return $this->json(['message' => "Password aggiornata per {$user->getCognome()} {$user->getNome()}."]);
    }

    // ──── CERCA UTENTI (per alias/password) ────

    #[Route(path: '/utenti', name: 'api_sistema_utenti_search', methods: ['GET'])]
    public function utentiSearch(Request $request): JsonResponse
    {
        $search = trim($request->query->get('search', ''));
        if (strlen($search) < 2) {
            return $this->json(['data' => []]);
        }

        $users = $this->em->createQueryBuilder()
            ->select('u.id, u.username, u.nome, u.cognome, u.email')
            ->from(Utente::class, 'u')
            ->where('u.cognome LIKE :s OR u.nome LIKE :s OR u.username LIKE :s')
            ->andWhere('u.abilitato = 1')
            ->setParameter('s', '%' . $search . '%')
            ->orderBy('u.cognome', 'ASC')
            ->setMaxResults(20)
            ->getQuery()
            ->getArrayResult();

        // aggiungi ruolo
        foreach ($users as &$u) {
            $entity = $this->em->getRepository(Utente::class)->find($u['id']);
            $u['ruolo'] = match(true) {
                $entity instanceof \App\Entity\Preside => 'Dirigente',
                $entity instanceof \App\Entity\Staff => 'Staff',
                $entity instanceof Docente => 'Docente',
                $entity instanceof Alunno => 'Alunno',
                $entity instanceof Ata => 'ATA',
                $entity instanceof \App\Entity\Genitore => 'Genitore',
                $entity instanceof \App\Entity\Amministratore => 'Amministratore',
                default => 'Utente',
            };
        }

        return $this->json(['data' => $users]);
    }

    // ──── ALIAS API (JWT impersonation for refactor frontend) ────

    #[Route(path: '/alias', name: 'api_sistema_alias_start', methods: ['POST'])]
    #[IsGranted('ROLE_AMMINISTRATORE')]
    public function aliasStart(Request $request): JsonResponse
    {
        /** @var Utente $admin */
        $admin = $this->getUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $userId = $data['userId'] ?? null;
        $username = trim((string) ($data['username'] ?? ''));

        if (!$userId && $username === '') {
            return $this->json(['error' => 'Utente da impersonare obbligatorio.'], 400);
        }

        $target = $userId
            ? $this->em->getRepository(Utente::class)->find((int) $userId)
            : $this->em->getRepository(Utente::class)->findOneBy(['username' => $username]);

        if (!$target || !$target->getAbilitato()) {
            return $this->json(['error' => 'Utente non trovato o non abilitato.'], 404);
        }

        if ($target->getId() === $admin->getId()) {
            return $this->json(['error' => 'Sei già autenticato come questo utente.'], 400);
        }

        $token = $this->jwtManager->create($target);
        $target->setUltimoAccesso(new DateTime());

        $log = (new Log())
            ->setUtente($target)
            ->setUsername($target->getUserIdentifier())
            ->setRuolo($target->getRoles()[0] ?? 'ROLE_USER')
            ->setAlias($admin->getUserIdentifier())
            ->setIp($request->getClientIp())
            ->setOrigine('App\\Controller\\Api\\SistemaApiController::aliasStart')
            ->setTipo('A')
            ->setCategoria('ACCESSO')
            ->setAzione('Login API Alias')
            ->setDati([
                'Login' => 'api/jwt/alias',
                'Username reale' => $admin->getUserIdentifier(),
                'Ruolo reale' => $admin->getRoles()[0] ?? 'ROLE_USER',
            ]);

        $this->em->persist($log);
        $this->em->flush();

        return $this->json([
            'token' => $token,
            'user' => $this->serializeUser($target),
            'aliasedBy' => $this->serializeUser($admin),
        ]);
    }

    #[Route(path: '/alias/exit', name: 'api_sistema_alias_exit', methods: ['POST'])]
    public function aliasExit(Request $request): JsonResponse
    {
        /** @var Utente $current */
        $current = $this->getUser();
        $data = json_decode($request->getContent(), true) ?? [];
        $originalUsername = trim((string) ($data['originalUsername'] ?? ''));
        $originalRole = trim((string) ($data['originalRole'] ?? ''));

        $log = (new Log())
            ->setUtente($current)
            ->setUsername($current->getUserIdentifier())
            ->setRuolo($current->getRoles()[0] ?? 'ROLE_USER')
            ->setAlias($originalUsername !== '' ? $originalUsername : null)
            ->setIp($request->getClientIp())
            ->setOrigine('App\\Controller\\Api\\SistemaApiController::aliasExit')
            ->setTipo('A')
            ->setCategoria('ACCESSO')
            ->setAzione('Login API Alias Exit')
            ->setDati(array_filter([
                'Login' => 'api/jwt/alias-exit',
                'Username reale' => $originalUsername !== '' ? $originalUsername : null,
                'Ruolo reale' => $originalRole !== '' ? $originalRole : null,
            ], static fn ($value) => $value !== null));

        $this->em->persist($log);
        $this->em->flush();

        return $this->json(['message' => 'Alias terminato.']);
    }

    // ──── INFO SISTEMA ────

    #[Route(path: '/info', name: 'api_sistema_info', methods: ['GET'])]
    public function info(): JsonResponse
    {
        $repo = $this->em->getRepository(Configurazione::class);
        return $this->json([
            'versione' => $repo->getParametro('versione', ''),
            'anno_scolastico' => $repo->getParametro('anno_scolastico', ''),
            'anno_inizio' => $repo->getParametro('anno_inizio', ''),
            'anno_fine' => $repo->getParametro('anno_fine', ''),
        ]);
    }

    private function serializeUser(Utente $user): array
    {
        $roles = $user->getRoles();
        $ruoloLabel = match(true) {
            in_array('ROLE_AMMINISTRATORE', $roles) => 'Amministratore',
            in_array('ROLE_PRESIDE', $roles) => 'Dirigente',
            in_array('ROLE_STAFF', $roles) => 'Staff',
            in_array('ROLE_DOCENTE', $roles) => 'Docente',
            in_array('ROLE_ALUNNO', $roles) => 'Alunno',
            in_array('ROLE_GENITORE', $roles) => 'Genitore',
            in_array('ROLE_ATA', $roles) => 'ATA',
            default => 'Utente',
        };

        return [
            'id' => $user->getId(),
            'username' => $user->getUsername(),
            'nome' => $user->getNome(),
            'cognome' => $user->getCognome(),
            'email' => $user->getEmail(),
            'sesso' => $user->getSesso(),
            'roles' => $roles,
            'ruoloLabel' => $ruoloLabel,
        ];
    }
}
