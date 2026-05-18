<?php

namespace App\Controller\Api;

use App\Entity\Docente;
use App\Service\VotiService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/voti')]
#[IsGranted('ROLE_DOCENTE')]
class VotiApiController extends AbstractController
{
    public function __construct(private VotiService $votiService) {}

    #[Route(path: '/quadro', name: 'api_voti_quadro', methods: ['GET'])]
    public function quadro(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione voti.'], 403);
        }
        if (!$request->query->get('cattedraId')) {
            return $this->json(['error' => 'Campo obbligatorio mancante: cattedraId.'], 400);
        }

        try {
            $payload = $this->votiService->buildQuadro(
                $user,
                (int) $request->query->get('cattedraId'),
                $request->query->get('periodo') ? (int) $request->query->get('periodo') : null,
                $request->query->get('materiaId') ? (int) $request->query->get('materiaId') : null,
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $payload]);
    }

    #[Route(path: '', name: 'api_voti_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione voti.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload JSON non valido.'], 400);
        }

        foreach (['cattedraId', 'alunnoId', 'tipo', 'data'] as $requiredField) {
            if (empty($data[$requiredField]) && $data[$requiredField] !== 0) {
                return $this->json(['error' => "Campo obbligatorio mancante: {$requiredField}."], 400);
            }
        }

        try {
            $payload = $this->votiService->createVote(
                $user,
                (int) $data['cattedraId'],
                (int) $data['alunnoId'],
                (string) $data['tipo'],
                (string) $data['data'],
                (bool) ($data['visibile'] ?? true),
                (bool) ($data['media'] ?? true),
                isset($data['voto']) && $data['voto'] !== '' ? (float) $data['voto'] : null,
                trim((string) ($data['giudizio'] ?? '')),
                trim((string) ($data['argomento'] ?? '')),
                (bool) ($data['confirmAbsent'] ?? false),
                isset($data['materiaId']) ? (int) $data['materiaId'] : null,
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload, 201);
    }

    #[Route(path: '', name: 'api_voti_update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione voti.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['id']) || empty($data['data'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: id, data.'], 400);
        }

        try {
            $payload = $this->votiService->updateVote(
                $user,
                (int) $data['id'],
                (string) $data['data'],
                (bool) ($data['visibile'] ?? true),
                (bool) ($data['media'] ?? true),
                isset($data['voto']) && $data['voto'] !== '' ? (float) $data['voto'] : null,
                trim((string) ($data['giudizio'] ?? '')),
                trim((string) ($data['argomento'] ?? '')),
                (bool) ($data['confirmAbsent'] ?? false),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '', name: 'api_voti_delete', methods: ['DELETE'])]
    public function delete(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione voti.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['id'])) {
            return $this->json(['error' => 'Campo obbligatorio mancante: id.'], 400);
        }

        try {
            $payload = $this->votiService->deleteVote($user, (int) $data['id']);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }
}
