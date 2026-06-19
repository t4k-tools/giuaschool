<?php
/*
 * SPDX-FileCopyrightText: 2017 I.I.S. Michele Giua - Cagliari - Assemini
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */


namespace App\Controller;

use Symfony\Component\Security\Http\Attribute\IsGranted;
use DateTime;
use App\Entity\Utente;
use Exception;
use App\Entity\Alunno;
use App\Entity\Amministratore;
use App\Entity\Ata;
use App\Entity\Docente;
use App\Entity\Genitore;
use App\Service\RecuperoPasswordService;
use App\Util\ConfigLoader;
use App\Util\LogHandler;
use App\Util\NotificheUtil;
use App\Util\StaffUtil;
use Psr\Log\LoggerInterface;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\FormType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\UsernamePasswordToken;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;
use Symfony\Component\Security\Http\Event\InteractiveLoginEvent;
use Symfony\Component\Security\Http\SecurityEvents;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;


/**
 * LoginController - gestione del login degli utenti
 *
 * @author Antonello Dessì
 */
class LoginController extends BaseController {

  /**
   * Login dell'utente attraverso username e password
   *
   * @param ConfigLoader $config Gestore della configurazione su database
   * @param AuthenticationUtils $auth Gestore delle procedure di autenticazione
   *
   * @return Response Pagina di risposta
   */
  #[Route(path: '/login/form/', name: 'login_form', methods: ['GET', 'POST'])]
  public function form(AuthenticationUtils $auth, ConfigLoader $config): Response {
    if ($this->isGranted('ROLE_UTENTE')) {
      // reindirizza a pagina HOME
      return $this->redirectToRoute('login_home');
    }
    // carica configurazione di sistema
    $config->carica();
    // modalità manutenzione
    $ora = (new DateTime())->format('Y-m-d H:i');
    $manutenzione = (!empty($this->reqstack->getSession()->get('/CONFIG/SISTEMA/manutenzione_inizio')) &&
      $ora >= $this->reqstack->getSession()->get('/CONFIG/SISTEMA/manutenzione_inizio') &&
      $ora <= $this->reqstack->getSession()->get('/CONFIG/SISTEMA/manutenzione_fine'));
    // conserva ultimo errore del login, se presente
    $errore = $auth->getLastAuthenticationError();
    // conserva ultimo username inserito
    $username = $auth->getLastUsername();
    // mostra la pagina di risposta
    return $this->render('login/form.html.twig', [
      'pagina_titolo' => 'page.login',
      'username' => $username,
      'errore' => $errore,
      'manutenzione' => $manutenzione]);
  }

  /**
   * Disconnessione dell'utente
   *
   */
  #[Route(path: '/logout/', name: 'logout', methods: ['GET'])]
  public function logout(): void {
  }

  /**
   * Alias legacy per URL storici della home.
   */
  #[Route(path: '/index', name: 'login_home_legacy_no_slash', methods: ['GET'])]
  #[Route(path: '/index/', name: 'login_home_legacy', methods: ['GET'])]
  public function legacyHome(): Response {
    return $this->redirectToRoute('login_home');
  }

  /**
   * Home page
   *
   * @param Request $request Pagina richiesta
   * @param ConfigLoader $config Gestore della configurazione su database
   * @param NotificheUtil $notifiche Classe di utilità per la gestione delle notifiche
   * @param LoggerInterface $logger Gestore dei log su file
   *
   * @return Response Pagina di risposta
   *
   */
  #[Route(path: '/', name: 'login_home', methods: ['GET'])]
  #[IsGranted('ROLE_UTENTE')]
  public function home(Request $request, ConfigLoader $config, NotificheUtil $notifiche,
                       LoggerInterface $logger): Response {
    if ($request->query->get('reload') == 'yes') {
      // ricarica configurazione di sistema
      $config->carica();
    }
    if ($request->getSession()->get('/APP/UTENTE/lista_profili') && !$request->query->get('user')) {
      // redirezione alla scelta profilo
      return $this->redirectToRoute('login_profilo');
    }
    // legge dati
    $dati = $notifiche->notificheHome($this->getUser());
    // cerca di identificare l'app GiuaApp
    if ($request->server->get('HTTP_HOST') === 'registro.giua.edu.it' &&
        $request->headers->get('user-agent') === 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36') {
      // connesso tramite GiuaApp: blocca accesso
      $logger->warning('GiuaApp: blocked FORM login');
      // dd('ERRORE: GiuaApp non è più supportata.');
    }
    // visualizza pagina
    return $this->renderHtml('login', 'home', $dati);
  }

  /**
   * Recupero della password per gli utenti abilitati
   *
   * @param Request $request Pagina richiesta
   * @param ConfigLoader $config Gestore della configurazione su database
   * @param UserPasswordHasherInterface $hasher Gestore della codifica delle password
   * @param StaffUtil $staff Funzioni disponibili allo staff
   * @param MailerInterface $mailer Gestore della spedizione delle email
   * @param LoggerInterface $logger Gestore dei log su file
   *
   * @return Response Pagina di risposta
   */
  #[Route(path: '/login/recovery/', name: 'login_recovery', methods: ['GET', 'POST'])]
  public function recovery(Request $request, ConfigLoader $config,
                           RecuperoPasswordService $recupero): Response {
    // carica configurazione di sistema
    $config->carica();
    // modalità manutenzione
    $ora = (new DateTime())->format('Y-m-d H:i');
    $manutenzione = (!empty($this->reqstack->getSession()->get('/CONFIG/SISTEMA/manutenzione_inizio')) &&
      $ora >= $this->reqstack->getSession()->get('/CONFIG/SISTEMA/manutenzione_inizio') &&
      $ora <= $this->reqstack->getSession()->get('/CONFIG/SISTEMA/manutenzione_fine'));
    $errore = null;
    $successo = null;
    // crea form inserimento email
    $form = $this->container->get('form.factory')->createNamedBuilder('login_recovery', FormType::class)
      ->add('email', TextType::class, ['label' => 'label.email',
      'required' => true,
      'trim' => true,
      'attr' => ['placeholder' => 'label.email']])
      ->add('submit', SubmitType::class, ['label' => 'label.submit',
      'attr' => ['class' => 'btn-primary']])
      ->getForm();
    $form->handleRequest($request);
    if ($form->isSubmitted() && $form->isValid()) {
      // genera un token monouso e invia il link di conferma; la password NON viene cambiata
      // finché l'utente non conferma dal link ricevuto via email (evita lock-out di terzi)
      $recupero->richiedi($form->get('email')->getData());
      // risposta sempre generica (nessuna enumeration degli indirizzi registrati)
      $successo = 'message.recovery_link_ok';
    }
    // mostra la pagina di risposta
    return $this->render('login/recovery.html.twig', [
      'pagina_titolo' => 'page.recovery',
      'form' => $form->createView(),
      'errore' => $errore,
      'successo' => $successo,
      'manutenzione' => $manutenzione]);
  }

  /**
   * Conferma del recupero password tramite il token ricevuto via email.
   * La password viene reimpostata solo con una conferma esplicita dell'utente (POST),
   * così l'apertura automatica del link da parte degli scanner email non resetta nulla.
   *
   * @param Request $request Pagina richiesta
   * @param ConfigLoader $config Gestore della configurazione su file
   * @param RecuperoPasswordService $recupero Gestore del recupero password
   * @param string $token Token di recupero ricevuto via email
   *
   * @return Response Pagina di risposta
   *
   */
  #[Route(path: '/login/recovery/{token}', name: 'login_recovery_confirm', requirements: ['token' => '[a-f0-9]{32}'], methods: ['GET', 'POST'])]
  public function recoveryConfirm(Request $request, ConfigLoader $config,
                                  RecuperoPasswordService $recupero, string $token): Response {
    // carica configurazione di sistema (serve ai template delle credenziali)
    $config->carica();
    $errore = null;
    $successo = null;
    // form con il solo pulsante di conferma (protetto da CSRF)
    $form = $this->container->get('form.factory')->createNamedBuilder('recovery_confirm', FormType::class)
      ->add('submit', SubmitType::class, ['label' => 'label.submit', 'attr' => ['class' => 'btn-primary']])
      ->getForm();
    $form->handleRequest($request);
    if ($form->isSubmitted() && $form->isValid()) {
      // conferma esplicita: reimposta la password e invia le nuove credenziali via email
      $utente = $recupero->conferma($token);
      $errore = $utente ? null : 'exception.recovery_token_invalid';
      $successo = $utente ? 'message.recovery_confirm_ok' : null;
    } elseif (!$recupero->utenteDaToken($token)) {
      // token mancante, già usato o scaduto
      $errore = 'exception.recovery_token_invalid';
    }
    // mostra la pagina di conferma
    return $this->render('login/recovery_confirm.html.twig', [
      'pagina_titolo' => 'page.recovery',
      'form' => $form->createView(),
      'errore' => $errore,
      'successo' => $successo,
      'mostraConferma' => ($errore === null && $successo === null)]);
  }

  /**
   * Scelta del profilo tra quelli di uno stesso utente
   *
   * @param Request $request Pagina richiesta
   * @param EventDispatcherInterface $disp Gestore degli eventi
   * @param TokenStorageInterface $tokenStorage Gestore dei token di autenticazione
   * @param LogHandler $dblogger Gestore dei log su database
   *
   * @return Response Pagina di risposta
   *
   */
  #[Route(path: '/login/profilo', name: 'login_profilo', methods: ['GET', 'POST'])]
  #[IsGranted('ROLE_UTENTE')]
  public function profilo(Request $request, EventDispatcherInterface $disp,
                          TokenStorageInterface $tokenStorage, LogHandler $dblogger): Response {
    // imposta profili
    $lista = [];
    foreach ($this->reqstack->getSession()->get('/APP/UTENTE/lista_profili', []) as $ruolo=>$profili) {
      foreach ($profili as $id) {
        $utente = $this->em->getRepository(Utente::class)->find($id);
        $nome = $ruolo.' ';
        if ($ruolo == 'GENITORE') {
          // profilo genitore
          $nome .= 'DI '.$utente->getAlunno()->getNome().' '.$utente->getAlunno()->getCognome();
        } else {
          // altri profili
          $nome .= $utente->getNome().' '.$utente->getCognome();
        }
        $nome .= ' ('.$utente->getUserIdentifier().')';
        $lista[] = [$nome => $utente->getId()];
      }
    }
    // crea form scelta profilo
    $form = $this->container->get('form.factory')->createNamedBuilder('login_profilo', FormType::class)
      ->add('profilo', ChoiceType::class, ['label' => 'label.profilo',
        'data' => $request->getSession()->get('/APP/UTENTE/profilo_usato'),
        'choices' => $lista,
        'expanded' => true,
        'multiple' => false,
        'label_attr' => ['class' => 'gs-checkbox'],
        'choice_translation_domain' => false,
        'required' => true])
      ->add('submit', SubmitType::class, ['label' => 'label.submit',
        'attr' => ['class' => 'btn-primary']])
      ->getForm();
    $form->handleRequest($request);
    if ($form->isSubmitted() && $form->isValid()) {
      $profiloId = (int) $form->get('profilo')->getData();
      $queryUrl = ['user' => $profiloId];
      if ($profiloId && (!$this->reqstack->getSession()->get('/APP/UTENTE/profilo_usato') ||
          $this->reqstack->getSession()->get('/APP/UTENTE/profilo_usato') != $profiloId)) {
        // legge utente selezionato
        $utente = $this->em->getRepository(Utente::class)->find($profiloId);
        // imposta ultimo accesso
        $accesso = $utente->getUltimoAccesso();
        $this->reqstack->getSession()->set('/APP/UTENTE/ultimo_accesso', ($accesso ? $accesso->format('d/m/Y H:i:s') : null));
        $utente->setUltimoAccesso(new DateTime());
        // log azione
        $dblogger->logAzione('ACCESSO', 'Cambio profilo', [
          'Username' => $utente->getUserIdentifier(),
          'Ruolo' => $utente->getRoles()[0]]);
        // crea token di autenticazione
        $token = new UsernamePasswordToken($utente, 'main', $utente->getRoles());
        // autentica con nuovo token
        $tokenStorage->setToken($token);
        $event = new InteractiveLoginEvent($request, $token);
        $disp->dispatch($event, SecurityEvents::INTERACTIVE_LOGIN);
        // memorizza profilo in uso
        $this->reqstack->getSession()->set('/APP/UTENTE/profilo_usato', $profiloId);
        // richiede caricamento dati
        $queryUrl['reload'] = 'yes';
      }
      // redirezione alla pagina iniziale
      return $this->redirectToRoute('login_home', $queryUrl);
    }
    // visualizza pagina
    return $this->render('login/profilo.html.twig', [
      'pagina_titolo' => 'page.login_profilo',
      'form' => $form->createView()]);
  }

  /**
   * Esegue il login tramite token
   *
   */
  #[Route(path: '/login/token/', name: 'login_token', methods: ['POST'])]
  public function token(): void {
  }

  /**
   * Connette utente tramite token OTP, dopo aver eseguito la procedura di autenticazione con token
   *
   */
  #[Route(path: '/login/connect/{token}', name: 'login_connect', methods: ['GET'])]
  public function connect(): void {
  }

}
