<?php

namespace App\Controller\Api;

use App\Entity\Configurazione;
use App\Entity\Istituto;
use App\Entity\Sede;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;


#[Route(path: '/api')]
class ConfigController extends AbstractController {

  public function __construct(
    private EntityManagerInterface $em
  ) {}

  #[Route(path: '/config/istituto', name: 'api_config_istituto', methods: ['GET'])]
  #[IsGranted('IS_AUTHENTICATED_FULLY')]
  public function istituto(): JsonResponse {
    // carica dati istituto
    $istituto = $this->em->getRepository(Istituto::class)->findOneBy([]);

    // carica parametri scuola
    $annoScolastico = $this->em->getRepository(Configurazione::class)->getParametro('anno_scolastico', '');
    $annoInizio = $this->em->getRepository(Configurazione::class)->getParametro('anno_inizio', '');
    $annoFine = $this->em->getRepository(Configurazione::class)->getParametro('anno_fine', '');

    $data = [
      'istituto' => $istituto ? [
        'tipo' => $istituto->getTipo(),
        'tipoSigla' => $istituto->getTipoSigla(),
        'nome' => $istituto->getNome(),
        'nomeBreve' => $istituto->getNomeBreve(),
        'email' => $istituto->getEmail(),
        'pec' => $istituto->getPec(),
        'urlSito' => $istituto->getUrlSito(),
        'urlRegistro' => $istituto->getUrlRegistro(),
      ] : null,
      'annoScolastico' => $annoScolastico,
      'annoInizio' => $annoInizio,
      'annoFine' => $annoFine,
    ];

    return $this->json($data);
  }
}
