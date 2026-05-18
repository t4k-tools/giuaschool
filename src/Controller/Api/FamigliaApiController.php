<?php

namespace App\Controller\Api;

use App\Entity\Utente;
use App\Service\FamigliaService;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('ROLE_UTENTE')]
class FamigliaApiController extends AbstractController
{
    public function __construct(
        private FamigliaService $famigliaService,
    ) {}

    #[Route(path: '/famiglia/dashboard', name: 'api_famiglia_dashboard', methods: ['GET'])]
    public function dashboard(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            return $this->json([
                'data' => $this->famigliaService->getDashboard($user),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/famiglia/pagelle', name: 'api_famiglia_pagelle', methods: ['GET'])]
    public function pagelle(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            return $this->json([
                'data' => $this->famigliaService->getPagelle(
                    $user,
                    $request->query->get('periodo') ?: null,
                ),
            ]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }
}
