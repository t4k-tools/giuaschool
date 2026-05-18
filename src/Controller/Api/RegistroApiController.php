<?php

namespace App\Controller\Api;

use App\Entity\Docente;
use App\Service\RegistroAssenzeService;
use App\Service\RegistroFirmeService;
use App\Service\RegistroLezioneCreateService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/registro')]
#[IsGranted('ROLE_DOCENTE')]
class RegistroApiController extends AbstractController
{
    public function __construct(
        private RegistroFirmeService $registroFirmeService,
        private RegistroLezioneCreateService $registroLezioneCreateService,
        private RegistroAssenzeService $registroAssenzeService,
    ) {}

    #[Route(path: '/firme', name: 'api_registro_firme', methods: ['GET'])]
    public function firme(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $cattedraId = $request->query->get('cattedraId');
        $classeId = $request->query->get('classeId');
        $data = (string) $request->query->get('data', date('Y-m-d'));
        $vista = strtoupper((string) $request->query->get('vista', 'G'));

        if (!in_array($vista, ['G', 'M'], true)) {
            return $this->json(['error' => 'Vista non valida.'], 400);
        }

        try {
            $payload = $this->registroFirmeService->build(
                $user,
                $cattedraId !== null && $cattedraId !== '' ? (int) $cattedraId : null,
                $classeId !== null && $classeId !== '' ? (int) $classeId : null,
                $data,
                $vista,
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        return $this->json(['data' => $payload]);
    }

    #[Route(path: '/lezioni/creazione', name: 'api_registro_lezioni_create_context', methods: ['GET'])]
    public function createContext(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        try {
            $payload = $this->registroLezioneCreateService->getContext(
                $user,
                $request->query->get('cattedraId') ? (int) $request->query->get('cattedraId') : null,
                $request->query->get('classeId') ? (int) $request->query->get('classeId') : null,
                (string) $request->query->get('data', date('Y-m-d')),
                (int) $request->query->get('ora', 1),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        return $this->json(['data' => $payload]);
    }

    #[Route(path: '/lezioni', name: 'api_registro_lezioni_create', methods: ['POST'])]
    public function createLezione(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload JSON non valido.'], 400);
        }

        foreach (['data', 'ora', 'fineOra'] as $requiredField) {
            if (empty($data[$requiredField]) && $data[$requiredField] !== 0) {
                return $this->json(['error' => "Campo obbligatorio mancante: {$requiredField}."], 400);
            }
        }

        try {
            $payload = $this->registroLezioneCreateService->create(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['ora'],
                (int) $data['fineOra'],
                trim((string) ($data['argomento'] ?? '')),
                trim((string) ($data['attivita'] ?? '')),
                isset($data['moduloFormativoId']) && $data['moduloFormativoId'] !== '' ? (int) $data['moduloFormativoId'] : null,
                isset($data['materiaId']) && $data['materiaId'] !== '' ? (int) $data['materiaId'] : null,
                isset($data['tipoSostituzione']) && $data['tipoSostituzione'] !== '' ? (string) $data['tipoSostituzione'] : null,
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload, 201);
    }

    #[Route(path: '/lezioni/cancella', name: 'api_registro_lezioni_delete_context', methods: ['GET'])]
    public function deleteContext(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        try {
            $payload = $this->registroLezioneCreateService->getDeleteContext(
                $user,
                $request->query->get('cattedraId') ? (int) $request->query->get('cattedraId') : null,
                $request->query->get('classeId') ? (int) $request->query->get('classeId') : null,
                (string) $request->query->get('data', date('Y-m-d')),
                (int) $request->query->get('ora', 1),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $payload]);
    }

    #[Route(path: '/lezioni/modifica', name: 'api_registro_lezioni_edit_context', methods: ['GET'])]
    public function editContext(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        try {
            $payload = $this->registroLezioneCreateService->getEditContext(
                $user,
                $request->query->get('cattedraId') ? (int) $request->query->get('cattedraId') : null,
                $request->query->get('classeId') ? (int) $request->query->get('classeId') : null,
                (string) $request->query->get('data', date('Y-m-d')),
                (int) $request->query->get('ora', 1),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $payload]);
    }

    #[Route(path: '/lezioni', name: 'api_registro_lezioni_update', methods: ['PUT'])]
    public function updateLezione(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload JSON non valido.'], 400);
        }

        foreach (['data', 'ora'] as $requiredField) {
            if (empty($data[$requiredField]) && $data[$requiredField] !== 0) {
                return $this->json(['error' => "Campo obbligatorio mancante: {$requiredField}."], 400);
            }
        }

        try {
            $payload = $this->registroLezioneCreateService->update(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['ora'],
                trim((string) ($data['argomento'] ?? '')),
                trim((string) ($data['attivita'] ?? '')),
                isset($data['moduloFormativoId']) && $data['moduloFormativoId'] !== '' ? (int) $data['moduloFormativoId'] : null,
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/lezioni', name: 'api_registro_lezioni_delete', methods: ['DELETE'])]
    public function deleteLezione(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload JSON non valido.'], 400);
        }

        foreach (['data', 'ora'] as $requiredField) {
            if (empty($data[$requiredField]) && $data[$requiredField] !== 0) {
                return $this->json(['error' => "Campo obbligatorio mancante: {$requiredField}."], 400);
            }
        }

        try {
            $payload = $this->registroLezioneCreateService->delete(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['ora'],
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/quadro', name: 'api_registro_assenze_quadro', methods: ['GET'])]
    public function assenzeQuadro(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        try {
            $payload = $this->registroAssenzeService->buildDaily(
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

    #[Route(path: '/assenze/appello', name: 'api_registro_assenze_appello', methods: ['POST'])]
    public function assenzeAppello(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['error' => 'Payload JSON non valido.'], 400);
        }

        if (empty($data['data']) || !isset($data['entries']) || !is_array($data['entries'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, entries.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->saveAppello(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                $data['entries'],
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload, 201);
    }

    #[Route(path: '/assenze/assenza', name: 'api_registro_assenze_toggle', methods: ['POST'])]
    public function assenzeToggle(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, alunnoId.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->toggleAssenza(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/entrata', name: 'api_registro_assenze_entrata_upsert', methods: ['POST', 'PUT'])]
    public function assenzeEntrataUpsert(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId']) || empty($data['ora'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, alunnoId, ora.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->upsertEntrata(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
                (string) $data['ora'],
                (bool) ($data['valido'] ?? false),
                trim((string) ($data['note'] ?? '')),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/entrata', name: 'api_registro_assenze_entrata_delete', methods: ['DELETE'])]
    public function assenzeEntrataDelete(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, alunnoId.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->deleteEntrata(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/uscita', name: 'api_registro_assenze_uscita_upsert', methods: ['POST', 'PUT'])]
    public function assenzeUscitaUpsert(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId']) || empty($data['ora'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, alunnoId, ora.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->upsertUscita(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
                (string) $data['ora'],
                (bool) ($data['valido'] ?? false),
                trim((string) ($data['note'] ?? '')),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/uscita', name: 'api_registro_assenze_uscita_delete', methods: ['DELETE'])]
    public function assenzeUscitaDelete(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, alunnoId.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->deleteUscita(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/fuori-classe', name: 'api_registro_assenze_fc_upsert', methods: ['POST', 'PUT'])]
    public function assenzeFuoriClasseUpsert(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId']) || empty($data['oraTipo']) || empty($data['tipo']) || !isset($data['descrizione'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti per il fuori classe.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->upsertFuoriClasse(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
                (string) $data['oraTipo'],
                isset($data['oraInizio']) ? (string) $data['oraInizio'] : null,
                isset($data['oraFine']) ? (string) $data['oraFine'] : null,
                (string) $data['tipo'],
                trim((string) $data['descrizione']),
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }

    #[Route(path: '/assenze/fuori-classe', name: 'api_registro_assenze_fc_delete', methods: ['DELETE'])]
    public function assenzeFuoriClasseDelete(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Utente non abilitato alla gestione del registro.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || empty($data['data']) || empty($data['alunnoId'])) {
            return $this->json(['error' => 'Campi obbligatori mancanti: data, alunnoId.'], 400);
        }

        try {
            $payload = $this->registroAssenzeService->deleteFuoriClasse(
                $user,
                isset($data['cattedraId']) ? (int) $data['cattedraId'] : null,
                isset($data['classeId']) ? (int) $data['classeId'] : null,
                (string) $data['data'],
                (int) $data['alunnoId'],
            );
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json($payload);
    }
}
