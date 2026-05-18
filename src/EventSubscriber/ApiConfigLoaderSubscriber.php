<?php

namespace App\EventSubscriber;

use App\Util\ConfigLoader;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ControllerEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Popola la session con la configurazione di sistema (/CONFIG/*) per le richieste API.
 *
 * Il firewall ^/api/ è stateless e non passa dagli authenticator legacy
 * (FormAuthenticator, GSuiteAuthenticator) che caricano la config via ConfigLoader.
 * Senza questo subscriber, gli Util legacy (RegistroUtil, ScrutinioUtil, ecc.) che
 * leggono /CONFIG/SCUOLA/* dalla session ricevono null e crashano (es. infoPeriodi
 * → DateTime::createFromFormat su null → 500 "Call to a member function modify() on bool").
 *
 * Esclusioni:
 *  - /api/auth/*    : prima del login non serve (e su /login l'utente non è ancora autenticato)
 *  - /api/public/*  : rotte pubbliche, senza session
 */
class ApiConfigLoaderSubscriber implements EventSubscriberInterface
{
    public function __construct(private readonly ConfigLoader $configLoader) {}

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::CONTROLLER => ['onController', 10],
        ];
    }

    public function onController(ControllerEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $path = $event->getRequest()->getPathInfo();
        if (!str_starts_with($path, '/api/')) {
            return;
        }
        if (str_starts_with($path, '/api/auth/') || str_starts_with($path, '/api/public/')) {
            return;
        }

        $session = $event->getRequest()->getSession();
        if ($session->get('/CONFIG/SCUOLA/anno_inizio')) {
            return;
        }

        $this->configLoader->caricaApi();
    }
}
