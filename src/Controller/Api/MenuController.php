<?php

namespace App\Controller\Api;

use App\Entity\Menu;
use App\Entity\MenuOpzione;
use App\Entity\Utente;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;


#[Route(path: '/api')]
class MenuController extends AbstractController {

  public function __construct(
    private EntityManagerInterface $em
  ) {}

  #[Route(path: '/menu', name: 'api_menu', methods: ['GET'])]
  #[IsGranted('IS_AUTHENTICATED_FULLY')]
  public function index(): JsonResponse {
    /** @var Utente $user */
    $user = $this->getUser();
    $ruolo = $user->getCodiceRuolo();

    // carica menu principale con sotto-menu
    $menu = $this->em->createQueryBuilder()
      ->select('m.selettore, m.nome, m.descrizione, o.nome AS opzione_nome, o.descrizione AS opzione_desc, o.url, o.abilitato, o.icona, o.ordinamento, IDENTITY(o.sottoMenu) AS sotto_menu_id')
      ->from(MenuOpzione::class, 'o')
      ->join('o.menu', 'm')
      ->where('m.selettore = :sel')
      ->andWhere('LOCATE(:ruolo, o.ruolo) > 0')
      ->setParameter('sel', 'main')
      ->setParameter('ruolo', $ruolo)
      ->orderBy('o.ordinamento', 'ASC')
      ->getQuery()
      ->getArrayResult();

    $result = [];
    foreach ($menu as $item) {
      $entry = [
        'nome' => $item['opzione_nome'],
        'descrizione' => $item['opzione_desc'],
        'url' => $item['url'],
        'icona' => $item['icona'] ?: null,
        'abilitato' => (bool) $item['abilitato'],
        'sottoMenu' => null,
      ];

      // se ha un sotto-menu, carica le opzioni
      if ($item['sotto_menu_id']) {
        $subItems = $this->em->createQueryBuilder()
          ->select('o2.nome, o2.descrizione, o2.url, o2.abilitato, o2.icona, o2.ordinamento')
          ->from(MenuOpzione::class, 'o2')
          ->where('o2.menu = :menuId')
          ->andWhere('LOCATE(:ruolo, o2.ruolo) > 0')
          ->setParameter('menuId', $item['sotto_menu_id'])
          ->setParameter('ruolo', $ruolo)
          ->orderBy('o2.ordinamento', 'ASC')
          ->getQuery()
          ->getArrayResult();

        $entry['sottoMenu'] = array_values(array_filter(
          array_map(fn($s) => [
            'nome' => $s['nome'],
            'descrizione' => $s['descrizione'],
            'url' => $s['url'],
            'icona' => $s['icona'] ?: null,
            'abilitato' => (bool) $s['abilitato'],
          ], $subItems),
          fn($s) => $s['nome'] !== '__SEPARATORE__'
        ));
      }

      $result[] = $entry;
    }

    return $this->json(['menu' => $result]);
  }
}
