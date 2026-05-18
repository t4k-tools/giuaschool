<?php

namespace App\Controller\Api;

use App\Entity\Docente;
use App\Service\LessonContextService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/lezioni')]
#[IsGranted('ROLE_DOCENTE')]
class LezioniApiController extends AbstractController
{
    public function __construct(
        private LessonContextService $lessonContextService,
    ) {}

    #[Route(path: '/contesto', name: 'api_lezioni_contesto', methods: ['GET'])]
    public function contesto(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione lezioni.'], 403);
        }

        return $this->json([
            'data' => $this->lessonContextService->buildForDocente($user),
        ]);
    }
}
