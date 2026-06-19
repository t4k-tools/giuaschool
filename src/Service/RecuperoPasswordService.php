<?php
/*
 * SPDX-FileCopyrightText: 2017 I.I.S. Michele Giua - Cagliari - Assemini
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */


namespace App\Service;

use App\Entity\Alunno;
use App\Entity\Amministratore;
use App\Entity\Ata;
use App\Entity\Configurazione;
use App\Entity\Docente;
use App\Entity\Genitore;
use App\Entity\Istituto;
use App\Entity\Utente;
use App\Util\StaffUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Twig\Environment;


/**
 * RecuperoPasswordService - gestione sicura del recupero password.
 *
 * Il recupero avviene in due passi: la richiesta genera un token monouso con
 * scadenza e invia per email un link di conferma (senza cambiare la password);
 * la conferma esplicita (via POST sulla pagina del link) genera e invia la nuova
 * password. In questo modo una richiesta non autenticata non può più bloccare
 * l'account di un utente di cui si conosca solo l'email.
 *
 * @author Antonello Dessì
 */
class RecuperoPasswordService {

  // minuti di attesa tra due richieste di recupero per lo stesso account (anti-abuso)
  private const COOLDOWN_MINUTI = 5;
  // validità del link di conferma (minuti)
  private const SCADENZA_MINUTI = 120;

  public function __construct(
      private readonly EntityManagerInterface $em,
      private readonly UserPasswordHasherInterface $hasher,
      private readonly MailerInterface $mailer,
      private readonly StaffUtil $staffUtil,
      private readonly Environment $tpl,
      private readonly UrlGeneratorInterface $router)
  {
  }

  /**
   * Richiede il recupero password per un indirizzo email: genera un token monouso
   * e invia il link di conferma. Non cambia la password e non rivela se l'email esiste.
   *
   * @param string $email Indirizzo email per cui richiedere il recupero
   */
  public function richiedi(string $email): void {
    $utente = $this->em->getRepository(Utente::class)->findOneBy(['email' => $email, 'abilitato' => 1]);
    if (!$utente) {
      // nessun utente: esce silenziosamente (nessuna enumeration)
      return;
    }
    // utenti su identity provider (SPID/CIE) non usano la password: niente recupero
    $idProvider = $this->em->getRepository(Configurazione::class)->getParametro('id_provider');
    $idProviderTipo = $this->em->getRepository(Configurazione::class)->getParametro('id_provider_tipo');
    if ($idProvider && $utente->controllaRuolo($idProviderTipo)) {
      return;
    }
    // cooldown: non riemette un token se ne esiste uno recente
    $cooldown = (new DateTime())->modify('-'.self::COOLDOWN_MINUTI.' minutes');
    if ($utente->getTokenCreato() && $utente->getTokenCreato() > $cooldown) {
      return;
    }
    // genera token monouso e invia il link di conferma
    $utente->creaToken();
    $this->em->flush();
    $istituto = $this->em->getRepository(Istituto::class)->findOneBy([]);
    $link = rtrim((string) $istituto?->getUrlRegistro(), '/').
      $this->router->generate('login_recovery_confirm', ['token' => $utente->getToken()]);
    $this->inviaEmail($utente->getEmail(), $istituto, 'Conferma recupero password',
      'email/recupero_link', ['utente' => $utente, 'link' => $link, 'minuti' => self::SCADENZA_MINUTI]);
  }

  /**
   * Restituisce l'utente associato a un token valido e non scaduto, senza consumarlo.
   *
   * @param string $token Token di recupero
   *
   * @return Utente|null Utente associato, o null se token mancante/invalido/scaduto
   */
  public function utenteDaToken(string $token): ?Utente {
    if ($token === '') {
      return null;
    }
    $utente = $this->em->getRepository(Utente::class)->findOneBy(['token' => $token, 'abilitato' => 1]);
    if (!$utente) {
      return null;
    }
    $scadenza = (new DateTime())->modify('-'.self::SCADENZA_MINUTI.' minutes');
    if (!$utente->getTokenCreato() || $utente->getTokenCreato() < $scadenza) {
      return null;
    }
    return $utente;
  }

  /**
   * Conferma il recupero: valida e consuma il token, genera e imposta una nuova
   * password e la invia per email all'utente.
   *
   * @param string $token Token di recupero
   *
   * @return Utente|null Utente di cui è stata reimpostata la password, o null se token invalido
   */
  public function conferma(string $token): ?Utente {
    $utente = $this->utenteDaToken($token);
    if (!$utente) {
      return null;
    }
    // parametri per ruolo: lunghezza password, template email, destinatario, formula
    [$lunghezza, $template, $utenteMail, $sesso, $ruolo] = $this->datiPerRuolo($utente);
    // genera e imposta la nuova password
    $password = $this->staffUtil->creaPassword($lunghezza);
    $utente->setPasswordNonCifrata($password);
    $utente->setPassword($this->hasher->hashPassword($utente, $password));
    // consuma il token (monouso)
    $utente->cancellaToken();
    $this->em->flush();
    // invia le nuove credenziali
    $istituto = $this->em->getRepository(Istituto::class)->findOneBy([]);
    $this->inviaEmail($utente->getEmail(), $istituto, 'Recupero credenziali del Registro Elettronico',
      $template, ['ruolo' => $ruolo, 'utente' => $utenteMail, 'username' => $utente->getUsername(),
        'password' => $password, 'sesso' => $sesso]);
    return $utente;
  }

  /**
   * Restituisce i parametri di invio credenziali in base al ruolo dell'utente.
   *
   * @param Utente $utente Utente di cui generare le credenziali
   *
   * @return array [lunghezza, template, utenteMail, sesso, ruolo]
   */
  private function datiPerRuolo(Utente $utente): array {
    if ($utente instanceof Amministratore) {
      return [12, 'email/credenziali_recupero_ata', $utente, ($utente->getSesso() == 'M' ? 'o' : 'a'), ''];
    }
    if ($utente instanceof Docente) {
      return [10, 'email/credenziali_recupero_docenti', $utente, ($utente->getSesso() == 'M' ? 'Prof.' : 'Prof.ssa'), ''];
    }
    if ($utente instanceof Ata) {
      return [8, 'email/credenziali_recupero_ata', $utente, ($utente->getSesso() == 'M' ? 'o' : 'a'), ''];
    }
    if ($utente instanceof Genitore) {
      return [8, 'email/credenziali_alunni', $utente->getAlunno(),
        ($utente->getAlunno()->getSesso() == 'M' ? 'o' : 'a'), 'GENITORE'];
    }
    // alunno
    return [8, 'email/credenziali_alunni', $utente, ($utente->getSesso() == 'M' ? 'o' : 'a'), 'ALUNNO'];
  }

  /**
   * Compone e invia un'email (parte testo e html dai template indicati).
   *
   * @param string $a Indirizzo destinatario
   * @param Istituto|null $istituto Istituto (mittente)
   * @param string $oggetto Oggetto dell'email
   * @param string $template Prefisso dei template (.txt.twig e .html.twig)
   * @param array $dati Dati per i template
   */
  private function inviaEmail(string $a, ?Istituto $istituto, string $oggetto, string $template, array $dati): void {
    $fromEmail = $istituto?->getEmailNotifiche() ?: 'noreply@registro.local';
    $fromName = $istituto?->getIntestazioneBreve() ?: 'Registro Elettronico';
    $message = (new Email())
      ->from(new Address($fromEmail, $fromName))
      ->to($a)
      ->subject($fromName.' - '.$oggetto)
      ->text($this->tpl->render($template.'.txt.twig', $dati))
      ->html($this->tpl->render($template.'.html.twig', $dati));
    try {
      $this->mailer->send($message);
    } catch (\Exception) {
      // invio fallito: log a carico dell'infrastruttura mail; non si rivela nulla al chiamante
    }
  }

}
