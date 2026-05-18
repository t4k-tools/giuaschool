<?php

namespace App\Controller\Api;

use App\Entity\Istituto;
use App\Entity\Log;
use App\Entity\Utente;
use App\Util\StaffUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;


#[Route(path: '/api')]
class AuthController extends AbstractController {

  public function __construct(
    private EntityManagerInterface $em,
    private JWTTokenManagerInterface $jwtManager,
    private UserPasswordHasherInterface $hasher,
    private StaffUtil $staffUtil,
    private MailerInterface $mailer,
  ) {}

  #[Route(path: '/auth/login', name: 'api_auth_login', methods: ['POST'])]
  public function login(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), true);
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';

    if (!$username || !$password) {
      return $this->json(['error' => 'Username e password sono obbligatori.'], 400);
    }

    // cerca utente abilitato
    $user = $this->em->getRepository(Utente::class)->findOneBy([
      'username' => $username,
      'abilitato' => 1
    ]);

    if (!$user) {
      return $this->json(['error' => 'Utente sconosciuto.'], 401);
    }

    // verifica password
    if (!$this->hasher->isPasswordValid($user, $password)) {
      return $this->json(['error' => 'Credenziali non valide.'], 401);
    }

    // genera token JWT
    $token = $this->jwtManager->create($user);

    // aggiorna ultimo accesso
    $user->setUltimoAccesso(new DateTime());

    // log accesso diretto (senza LogHandler, perché in stateless non c'è token storage)
    $log = (new Log())
      ->setUtente($user)
      ->setUsername($user->getUserIdentifier())
      ->setRuolo($user->getRoles()[0])
      ->setAlias(null)
      ->setIp($request->getClientIp())
      ->setOrigine('App\\Controller\\Api\\AuthController::login')
      ->setTipo('A')
      ->setCategoria('ACCESSO')
      ->setAzione('Login API')
      ->setDati(['Login' => 'api/jwt']);
    $this->em->persist($log);
    $this->em->flush();

    return $this->json([
      'token' => $token,
      'user' => $this->serializeUser($user),
    ]);
  }

  #[Route(path: '/auth/me', name: 'api_auth_me', methods: ['GET'])]
  #[IsGranted('IS_AUTHENTICATED_FULLY')]
  public function me(): JsonResponse {
    /** @var Utente $user */
    $user = $this->getUser();
    return $this->json(['user' => $this->serializeUser($user)]);
  }

  #[Route(path: '/auth/recovery', name: 'api_auth_recovery', methods: ['POST'])]
  public function recovery(Request $request): JsonResponse {
    $data = json_decode($request->getContent(), true);
    $email = trim($data['email'] ?? '');

    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      return $this->json(['error' => 'Indirizzo email non valido.'], 400);
    }

    $utente = $this->em->getRepository(Utente::class)->findOneBy(['email' => $email, 'abilitato' => 1]);
    $genericOk = ['message' => 'Se l\'indirizzo è registrato, riceverai un\'email con le nuove credenziali.'];

    if (!$utente) {
      return $this->json($genericOk);
    }

    $password = $this->staffUtil->creaPassword(10);
    $utente->setPasswordNonCifrata($password);
    $utente->setPassword($this->hasher->hashPassword($utente, $password));
    $this->em->flush();

    $istituto = $this->em->getRepository(Istituto::class)->findOneBy([]);
    $fromEmail = $istituto?->getEmailNotifiche() ?: 'noreply@registro.local';
    $fromName = $istituto?->getIntestazioneBreve() ?: 'Registro Elettronico';

    $message = (new Email())
      ->from(new Address($fromEmail, $fromName))
      ->to($email)
      ->subject($fromName . ' - Recupero credenziali')
      ->text(
        "Gentile utente,\n\n" .
        "A seguito della tua richiesta le credenziali di accesso al Registro Elettronico sono state aggiornate:\n\n" .
        "Username: " . $utente->getUsername() . "\n" .
        "Password: " . $password . "\n\n" .
        "Ti invitiamo a modificare la password al primo accesso.\n\n" .
        "-- " . $fromName
      );

    try {
      $this->mailer->send($message);
    } catch (\Exception) {
      // Log silently; user still gets generic success
    }

    return $this->json($genericOk);
  }

  private function serializeUser(Utente $user): array {
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
