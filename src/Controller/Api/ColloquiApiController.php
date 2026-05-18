<?php

namespace App\Controller\Api;

use App\Entity\Utente;
use App\Service\ColloquiService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('ROLE_UTENTE')]
class ColloquiApiController extends AbstractController
{
    public function __construct(
        private ColloquiService $colloquiService,
    ) {}

    #[Route(path: '/colloqui', name: 'api_colloqui_dashboard', methods: ['GET'])]
    public function dashboard(): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $data = $this->colloquiService->getDashboard($user);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $data]);
    }

    #[Route(path: '/colloqui/docenti/{id}/slots', name: 'api_colloqui_teacher_slots', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function teacherSlots(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $data = $this->colloquiService->getTeacherSlots($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $data]);
    }

    #[Route(path: '/colloqui/prenotazioni', name: 'api_colloqui_book', methods: ['POST'])]
    public function createBooking(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->createBooking(
                $user,
                (int) ($payload['docenteId'] ?? 0),
                (int) ($payload['colloquioId'] ?? 0),
            ));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/prenotazioni/{id}/annulla', name: 'api_colloqui_cancel', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function cancelBooking(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            return $this->json($this->colloquiService->cancelBooking($user, $id));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/richieste/{id}/conferma', name: 'api_colloqui_confirm', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function confirm(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            return $this->json($this->colloquiService->confirmRequest($user, $id));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/richieste/{id}/rifiuta', name: 'api_colloqui_reject', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function reject(Request $request, int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->rejectRequest(
                $user,
                $id,
                trim((string) ($payload['message'] ?? '')),
            ));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/richieste/{id}', name: 'api_colloqui_update_response', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function updateResponse(Request $request, int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->updateResponse(
                $user,
                $id,
                (string) ($payload['status'] ?? ''),
                trim((string) ($payload['message'] ?? '')),
            ));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/gestione', name: 'api_colloqui_management', methods: ['GET'])]
    public function management(): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            return $this->json(['data' => $this->colloquiService->getManagementData($user)]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/gestione/single', name: 'api_colloqui_management_create_single', methods: ['POST'])]
    public function createSingle(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->saveSingleManagement($user, $payload));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/gestione/single/{id}', name: 'api_colloqui_management_update_single', requirements: ['id' => '\d+'], methods: ['PUT'])]
    public function updateSingle(Request $request, int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->saveSingleManagement($user, $payload, $id));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/gestione/periodic', name: 'api_colloqui_management_create_periodic', methods: ['POST'])]
    public function createPeriodic(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->createRecurringManagement($user, $payload));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/gestione/{id}/enabled', name: 'api_colloqui_management_enabled', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function setEnabled(Request $request, int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $payload = json_decode((string) $request->getContent(), true) ?? [];
        try {
            return $this->json($this->colloquiService->setManagementEnabled(
                $user,
                $id,
                (bool) ($payload['enabled'] ?? false),
            ));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/colloqui/gestione', name: 'api_colloqui_management_delete', methods: ['DELETE'])]
    public function deleteManagement(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            return $this->json($this->colloquiService->deleteManagement(
                $user,
                (string) ($request->query->get('mode') ?? 'D'),
            ));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    private function requireUser(): Utente|JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        return $user;
    }
}
