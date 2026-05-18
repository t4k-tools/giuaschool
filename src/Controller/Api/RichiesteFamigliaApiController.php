<?php

namespace App\Controller\Api;

use App\Entity\Richiesta;
use App\Entity\Utente;
use App\Service\RichiesteFamigliaService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('ROLE_UTENTE')]
class RichiesteFamigliaApiController extends AbstractController
{
    public function __construct(
        private RichiesteFamigliaService $service,
    ) {}

    #[Route(path: '/richieste', name: 'api_richieste_famiglia_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            return $this->json(['data' => $this->service->list($user)]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste/{id}', name: 'api_richieste_famiglia_detail', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function detail(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            return $this->json(['data' => $this->service->detail($user, $id)]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste', name: 'api_richieste_famiglia_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        $moduleId = (int) $request->request->get('moduleId', 0);
        $payload = json_decode((string) $request->request->get('payload', '{}'), true);
        if (!is_array($payload)) {
            return $this->json(['error' => 'Payload richiesta non valido.'], 400);
        }

        $rawAttachments = $request->files->all('attachments');
        if ($rawAttachments === []) {
            $rawAttachments = (array) $request->files->get('attachments', []);
        }
        if ($rawAttachments === []) {
            $rawAttachments = (array) $request->files->get('attachments[]', []);
        }

        /** @var array<int, UploadedFile> $attachments */
        $attachments = array_values(array_filter(
            (array) $rawAttachments,
            static fn (mixed $file) => $file instanceof UploadedFile,
        ));

        try {
            return $this->json($this->service->create($user, $moduleId, $payload, $attachments));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste/{id}/annulla', name: 'api_richieste_famiglia_cancel', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function cancel(int $id): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            return $this->json($this->service->cancel($user, $id));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste/gestione', name: 'api_richieste_gestione_list', methods: ['GET'])]
    public function gestioneList(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            return $this->json(['data' => $this->service->listGestione($user, [
                'stato' => $request->query->get('stato'),
                'classe' => $request->query->get('classe'),
                'pagina' => $request->query->get('pagina', 1),
            ])]);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste/{id}/gestisci', name: 'api_richieste_gestisci', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function gestisci(int $id, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        $body = json_decode((string) $request->getContent(), true) ?? [];

        try {
            return $this->json($this->service->gestisci($user, $id, $body['messaggio'] ?? null));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste/{id}/rimuovi', name: 'api_richieste_rimuovi', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function rimuovi(int $id, Request $request): JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        $body = json_decode((string) $request->getContent(), true) ?? [];

        try {
            return $this->json($this->service->rimuovi($user, $id, $body['messaggio'] ?? null));
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }
    }

    #[Route(path: '/richieste/{id}/download/{documento}', name: 'api_richieste_famiglia_download', requirements: ['id' => '\d+', 'documento' => '\d+'], defaults: ['documento' => '0'], methods: ['GET'])]
    public function download(int $id, int $documento): Response|JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Utente) {
            return $this->json(['error' => 'Utente non abilitato.'], 403);
        }

        try {
            /** @var Richiesta $request */
            $request = $this->service->resolveAccessibleRequest($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        if ($documento > count($request->getAllegati())) {
            return $this->json(['error' => 'Documento richiesto non valido.'], 404);
        }

        $base = $this->getParameter('kernel.project_dir').'/FILES/archivio/classi/'.
            $request->getClasse()->getAnno().$request->getClasse()->getSezione().
            $request->getClasse()->getGruppo().'/documenti/';
        $filename = $documento === 0
            ? $request->getDocumento()
            : $request->getAllegati()[$documento - 1];

        return $this->file($base.$filename, $filename, ResponseHeaderBag::DISPOSITION_ATTACHMENT);
    }
}
