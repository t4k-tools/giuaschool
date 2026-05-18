<?php

namespace App\Controller\Api;

use App\Entity\Configurazione;
use App\Entity\Istituto;
use App\Entity\Sede;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * PublicController - endpoint pubblici senza autenticazione
 * Utilizzati dalla landing page per mostrare dati della scuola
 */
#[Route(path: '/api/public')]
class PublicController extends AbstractController {

  public function __construct(
    private EntityManagerInterface $em
  ) {}

  /**
   * Restituisce le informazioni pubbliche della scuola:
   * dati istituto, sede principale, anno scolastico
   */
  #[Route(path: '/info', name: 'api_public_info', methods: ['GET'])]
  public function info(): JsonResponse {
    // Carica dati istituto
    $istituto = $this->em->getRepository(Istituto::class)->findOneBy([]);

    // Carica sede principale (quella con ordinamento più basso)
    $sedePrincipale = $this->em->getRepository(Sede::class)->findOneBy(
      [],
      ['ordinamento' => 'ASC']
    );

    // Carica anno scolastico
    $annoScolastico = $this->em->getRepository(Configurazione::class)
      ->getParametro('anno_scolastico', '');

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
      'sedePrincipale' => $sedePrincipale ? [
        'nome' => $sedePrincipale->getNome(),
        'citta' => $sedePrincipale->getCitta(),
        'indirizzo' => $sedePrincipale->getIndirizzo1(),
        'cap' => $sedePrincipale->getIndirizzo2(),
        'telefono' => $sedePrincipale->getTelefono(),
      ] : null,
      'annoScolastico' => $annoScolastico,
    ];

    return $this->json($data);
  }
}
