<?php

namespace App\Controller\Api;

use App\Entity\Docente;
use App\Service\RegistroNoteService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/registro/note')]
#[IsGranted('ROLE_DOCENTE')]
class RegistroNoteApiController extends AbstractController
{
    public function __construct(private RegistroNoteService $registroNoteService) {}

    #[Route(path: '', name: 'api_registro_note_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione note.'], 403);
        }

        try {
            $payload = $this->registroNoteService->buildDaily(
                $user,
                $request->query->get('cattedraId') ? (int) $request->query->get('cattedraId') : null,
                $request->query->get('classeId') ? (int) $request->query->get('classeId') : null,
                (string) $request->query->get('data', date('Y-m-d')),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $payload]);
    }

    #[Route(path: '', name: 'api_registro_note_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione note.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['tipo']) || !isset($data['testo'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, tipo, testo.'], 400);
        }

        try {
            $payload = $this->registroNoteService->createNote(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (string) $data['tipo'],
                (string) $data['testo'],
                array_map('intval', $data['alunnoIds'] ?? []),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload, 201);
    }

    #[Route(path: '', name: 'api_registro_note_update', methods: ['PUT'])]
    public function update(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione note.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['id']) || empty($data['tipo']) || !isset($data['testo'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: id, tipo, testo.'], 400);
        }

        try {
            $payload = $this->registroNoteService->updateNote(
                $user,
                (int) $data['id'],
                (string) $data['testo'],
                (string) $data['tipo'],
                array_map('intval', $data['alunnoIds'] ?? []),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '', name: 'api_registro_note_delete', methods: ['DELETE'])]
    public function delete(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione note.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['id'])) {
            return $this->json(['error' => 'Campo obbligatorio mancante: id.'], 400);
        }

        try {
            $payload = $this->registroNoteService->deleteNote($user, (int) $data['id']);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/{id}/annulla', name: 'api_registro_note_cancel', methods: ['PATCH'])]
    public function cancel(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione note.'], 403);
        }

        try {
            $payload = $this->registroNoteService->cancelNote($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/{id}/provvedimento', name: 'api_registro_note_provvedimento', methods: ['PATCH'])]
    public function provvedimento(Request $request, int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione note.'], 403);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['provvedimento'])) {
            return $this->json(['error' => 'Campo obbligatorio mancante: provvedimento.'], 400);
        }

        try {
            $payload = $this->registroNoteService->setProvvedimento($user, $id, (string) $data['provvedimento']);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }
}
