<?php

namespace App\Controller\Api;

use App\Entity\Avviso;
use App\Entity\Circolare;
use App\Entity\Utente;
use App\Service\ComunicazioniService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api')]
#[IsGranted('ROLE_UTENTE')]
class ComunicazioniApiController extends AbstractController
{
    public function __construct(
        private ComunicazioniService $comunicazioniService,
    ) {}

    #[Route(path: '/circolari', name: 'api_circolari_list', methods: ['GET'])]
    public function listCircolari(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->json([
            'data' => $this->comunicazioniService->listCircolari($user, [
                'visualizza' => $request->query->get('visualizza'),
                'mese' => $request->query->get('mese'),
                'oggetto' => $request->query->get('oggetto'),
                'pagina' => $request->query->get('pagina'),
            ]),
        ]);
    }

    #[Route(path: '/circolari/{id}', name: 'api_circolari_detail', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function getCircolare(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $data = $this->comunicazioniService->getCircolare($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        return $this->json(['data' => $data]);
    }

    #[Route(path: '/circolari/{id}/firma', name: 'api_circolari_sign', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function signCircolare(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $payload = $this->comunicazioniService->signCircolare($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        return $this->json($payload);
    }

    #[Route(path: '/circolari/{id}/attachments/{attachmentId}', name: 'api_circolari_attachment', requirements: ['id' => '\d+', 'attachmentId' => '\d+'], methods: ['GET'])]
    public function downloadCircolareAttachment(Request $request, int $id, int $attachmentId): Response|JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $payload = $this->comunicazioniService->getCircolareAttachment($user, $id, $attachmentId);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        /** @var Circolare $circolare */
        $circolare = $payload['comunicazione'];
        $attachment = $payload['attachment'];
        $dir = $this->getParameter('dir_circolari').($circolare->getStato() === 'A' ? '/'.$circolare->getAnno() : '');
        $path = $dir.'/'.$attachment->getFile().'.'.$attachment->getEstensione();
        $disposition = $request->query->get('mode') === 'open'
            ? ResponseHeaderBag::DISPOSITION_INLINE
            : ResponseHeaderBag::DISPOSITION_ATTACHMENT;

        return $this->file(
            $path,
            $attachment->getNome().'.'.$attachment->getEstensione(),
            $disposition,
        );
    }

    #[Route(path: '/avvisi', name: 'api_avvisi_list', methods: ['GET'])]
    public function listAvvisi(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        return $this->json([
            'data' => $this->comunicazioniService->listAvvisi($user, [
                'visualizza' => $request->query->get('visualizza'),
                'mese' => $request->query->get('mese'),
                'oggetto' => $request->query->get('oggetto'),
                'pagina' => $request->query->get('pagina'),
            ]),
        ]);
    }

    #[Route(path: '/avvisi/{id}', name: 'api_avvisi_detail', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function getAvviso(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $data = $this->comunicazioniService->getAvviso($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        return $this->json(['data' => $data]);
    }

    #[Route(path: '/avvisi/{id}/read', name: 'api_avvisi_read', requirements: ['id' => '\d+'], methods: ['PATCH'])]
    public function markAvvisoRead(int $id): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $payload = $this->comunicazioniService->markAvvisoRead($user, $id);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        return $this->json($payload);
    }

    #[Route(path: '/avvisi/{id}/attachments/{attachmentId}', name: 'api_avvisi_attachment', requirements: ['id' => '\d+', 'attachmentId' => '\d+'], methods: ['GET'])]
    public function downloadAvvisoAttachment(Request $request, int $id, int $attachmentId): Response|JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $payload = $this->comunicazioniService->getAvvisoAttachment($user, $id, $attachmentId);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 404);
        }

        /** @var Avviso $avviso */
        $avviso = $payload['comunicazione'];
        $attachment = $payload['attachment'];
        $dir = $this->getParameter('dir_avvisi').($avviso->getStato() === 'A' ? '/'.$avviso->getAnno() : '');
        $path = $dir.'/'.$attachment->getFile().'.'.$attachment->getEstensione();
        $disposition = $request->query->get('mode') === 'open'
            ? ResponseHeaderBag::DISPOSITION_INLINE
            : ResponseHeaderBag::DISPOSITION_ATTACHMENT;

        return $this->file(
            $path,
            $attachment->getNome().'.'.$attachment->getEstensione(),
            $disposition,
        );
    }

    #[Route(path: '/agenda', name: 'api_agenda_month', methods: ['GET'])]
    public function agendaMonth(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $month = (string) ($request->query->get('mese') ?: date('Y-m'));
        try {
            $data = $this->comunicazioniService->getAgenda($user, $month);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $data]);
    }

    #[Route(path: '/agenda/{date}/{type}', name: 'api_agenda_day', requirements: ['date' => '\d{4}-\d{2}-\d{2}', 'type' => 'A|V|P|Q'], methods: ['GET'])]
    public function agendaDay(string $date, string $type): JsonResponse
    {
        $user = $this->requireUser();
        if ($user instanceof JsonResponse) {
            return $user;
        }

        try {
            $data = $this->comunicazioniService->getAgendaDay($user, $date, $type);
        } catch (\RuntimeException $e) {
            return $this->json(['error' => $e->getMessage()], 400);
        }

        return $this->json(['data' => $data]);
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
