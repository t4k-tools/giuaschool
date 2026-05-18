<?php

namespace App\Controller\Api;

use App\Entity\Alunno;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Documento;
use App\Entity\Materia;
use App\Repository\DocumentoRepository;
use App\Util\ComunicazioniUtil;
use DateTime;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/documenti')]
#[IsGranted('ROLE_DOCENTE')]
class DocumentiApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private ComunicazioniUtil $com,
    ) {}

    #[Route(path: '/piani', name: 'api_documenti_piani', methods: ['GET'])]
    public function piani(): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        /** @var DocumentoRepository $repo */
        $repo = $this->em->getRepository(Documento::class);
        $rows = $repo->piani($docente);

        return $this->json(['data' => array_map(fn($r) => $this->serializeSlot($r, $docente->getId()), $rows)]);
    }

    #[Route(path: '/programmi', name: 'api_documenti_programmi', methods: ['GET'])]
    public function programmi(): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        /** @var DocumentoRepository $repo */
        $repo = $this->em->getRepository(Documento::class);
        $rows = $repo->programmi($docente, true);

        return $this->json(['data' => array_map(fn($r) => $this->serializeSlot($r, $docente->getId()), $rows)]);
    }

    #[Route(path: '/relazioni', name: 'api_documenti_relazioni', methods: ['GET'])]
    public function relazioni(): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        /** @var DocumentoRepository $repo */
        $repo = $this->em->getRepository(Documento::class);
        $rows = $repo->relazioni($docente);

        return $this->json(['data' => array_map(fn($r) => $this->serializeSlot($r, $docente->getId(), true), $rows)]);
    }

    #[Route(path: '/maggio', name: 'api_documenti_maggio', methods: ['GET'])]
    public function maggio(): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        /** @var DocumentoRepository $repo */
        $repo = $this->em->getRepository(Documento::class);
        $rows = $repo->maggio($docente);

        return $this->json(['data' => array_map(fn($r) => [
            'classeId' => $r['classe_id'],
            'classeName' => $r['anno'] . 'ª' . $r['sezione'] . ($r['gruppo'] ? '-' . $r['gruppo'] : ''),
            'classeAnno' => $r['anno'],
            'sedeNome' => $r['sede'],
            'documento' => $r['documento'] ? $this->serializeDocumento($r['documento'], $docente->getId()) : null,
        ], $rows)]);
    }

    #[Route(path: '/bes', name: 'api_documenti_bes', methods: ['GET'])]
    public function bes(): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        $isStaff = $this->isGranted('ROLE_STAFF');
        $isResponsabileBes = $docente->getResponsabileBes();
        $isCoordinatore = false;

        if (!$isStaff && !$isResponsabileBes) {
            $isCoordinatore = (bool) ((int) $this->em->getRepository(Classe::class)->createQueryBuilder('c')
                ->select('COUNT(c.id)')
                ->where('c.coordinatore = :docente')
                ->setParameter('docente', $docente)
                ->getQuery()->getSingleScalarResult() > 0);

            if (!$isCoordinatore) {
                return $this->json(['error' => 'Accesso non consentito.'], 403);
            }
        }

        $qb = $this->em->getRepository(Documento::class)->createQueryBuilder('d')
            ->select('d.id, d.tipo, IDENTITY(d.alunno) AS alunnoId, a.cognome AS alunnoCognome, a.nome AS alunnoNome, cl.id AS classeId, cl.anno, cl.sezione, cl.gruppo')
            ->join('d.alunno', 'a')
            ->join('a.classe', 'cl')
            ->where("d.stato = 'P' AND d.tipo IN ('B', 'H', 'D', 'C') AND a.abilitato = 1")
            ->orderBy('cl.anno', 'ASC')
            ->addOrderBy('cl.sezione', 'ASC')
            ->addOrderBy('a.cognome', 'ASC')
            ->addOrderBy('a.nome', 'ASC');

        if ($isCoordinatore && !$isStaff && !$isResponsabileBes) {
            $qb->andWhere('cl.coordinatore = :docente')->setParameter('docente', $docente);
        } elseif ($isResponsabileBes && !$isStaff && $docente->getResponsabileBesSede()) {
            $qb->join('cl.sede', 'sede')->andWhere('sede.id = :sede')->setParameter('sede', $docente->getResponsabileBesSede());
        }

        $rows = $qb->getQuery()->getArrayResult();

        $byAlunno = [];
        foreach ($rows as $r) {
            $aid = $r['alunnoId'];
            if (!isset($byAlunno[$aid])) {
                $byAlunno[$aid] = [
                    'alunnoId' => $aid,
                    'alunnoName' => trim($r['alunnoCognome'] . ' ' . $r['alunnoNome']),
                    'classeId' => $r['classeId'],
                    'classeName' => $r['anno'] . 'ª' . $r['sezione'] . ($r['gruppo'] ? '-' . $r['gruppo'] : ''),
                    'documenti' => [],
                ];
            }
            $doc = $this->em->find(Documento::class, $r['id']);
            if ($doc) {
                $byAlunno[$aid]['documenti'][] = $this->serializeDocumento($doc, $docente->getId());
            }
        }

        return $this->json(['data' => array_values($byAlunno)]);
    }

    #[Route(path: '/upload', name: 'api_documenti_upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        $tipo = $request->request->get('tipo');
        if (!in_array($tipo, ['L', 'P', 'R', 'M', 'B', 'H', 'D', 'C'], true)) {
            return $this->json(['error' => 'Tipo documento non valido.'], 400);
        }

        $uploadedFile = $request->files->get('file');
        if (!$uploadedFile) {
            return $this->json(['error' => 'File mancante.'], 400);
        }

        if ($uploadedFile->getSize() > 10 * 1024 * 1024) {
            return $this->json(['error' => 'File troppo grande (max 10 MB).'], 400);
        }
        $ext = strtolower($uploadedFile->getClientOriginalExtension() ?: 'bin');
        if (!in_array($ext, ['pdf', 'doc', 'docx', 'odt', 'rtf'], true)) {
            return $this->json(['error' => 'Formato non consentito (pdf, doc, docx, odt, rtf).'], 400);
        }

        $classeId = $request->request->getInt('classeId');
        $materiaId = $request->request->getInt('materiaId');
        $alunnoId = $request->request->getInt('alunnoId');

        $classe = $classeId ? $this->em->find(Classe::class, $classeId) : null;
        $materia = $materiaId ? $this->em->find(Materia::class, $materiaId) : null;
        $alunno = $alunnoId ? $this->em->find(Alunno::class, $alunnoId) : null;

        if (in_array($tipo, ['L', 'P', 'R']) && (!$classe || !$materia)) {
            return $this->json(['error' => 'Classe e materia obbligatorie per questo tipo.'], 400);
        }
        if ($tipo === 'M' && !$classe) {
            return $this->json(['error' => 'Classe obbligatoria per il documento 15 maggio.'], 400);
        }
        if (in_array($tipo, ['B', 'H', 'D', 'C'])) {
            if (!$alunno) {
                return $this->json(['error' => 'Alunno obbligatorio per documenti BES.'], 400);
            }
            if (!$this->isGranted('ROLE_STAFF') && !$docente->getResponsabileBes()) {
                return $this->json(['error' => 'Accesso non consentito per documenti BES.'], 403);
            }
        }

        // Check for existing document
        if (in_array($tipo, ['L', 'P', 'M'])) {
            $qb = $this->em->getRepository(Documento::class)->createQueryBuilder('d')
                ->where("d.tipo = :tipo AND d.classe = :classe AND d.stato = 'P'")
                ->setParameter('tipo', $tipo)
                ->setParameter('classe', $classe);
            if ($materia) {
                $qb->andWhere('d.materia = :materia')->setParameter('materia', $materia);
            }
            if ($qb->getQuery()->getOneOrNullResult()) {
                return $this->json(['error' => 'Documento già presente. Eliminare prima quello esistente.'], 409);
            }
        }

        $dirTemp = $this->getParameter('dir_tmp');
        $tempName = uniqid('api_doc_');
        $uploadedFile->move($dirTemp, $tempName . '.' . $ext);
        $fileSize = (int) filesize($dirTemp . '/' . $tempName . '.' . $ext);

        $month = (int) date('n');
        $year = (int) date('Y');
        $anno = $month >= 9 ? $year : $year - 1;

        $documento = (new Documento())
            ->setTipo($tipo)
            ->setStato('P')
            ->setAutore($docente)
            ->setAnno($anno)
            ->setData(new DateTime())
            ->setTitolo('');

        if ($classe) $documento->setClasse($classe);
        if ($materia) $documento->setMateria($materia);
        if ($alunno) $documento->setAlunno($alunno);

        $this->em->persist($documento);
        $this->com->destinatariDocumento($documento);
        [$file, $extFinal] = $this->com->convertePdf($tempName . '.' . $ext);
        $this->com->allegatoDocumento($documento, $file, $extFinal, $fileSize);
        $documento->setTitolo($documento->getAllegati()[0]->getTitolo());
        $this->em->flush();

        return $this->json([
            'message' => 'Documento caricato con successo.',
            'data' => $this->serializeDocumento($documento, $docente->getId()),
        ]);
    }

    #[Route(path: '/{id}/download', name: 'api_documenti_download', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function download(Request $request, int $id): Response|JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        $documento = $this->em->find(Documento::class, $id);
        if (!$documento) {
            return $this->json(['error' => 'Documento non trovato.'], 404);
        }

        if (!$this->com->permessoLettura($docente, $documento)) {
            return $this->json(['error' => 'Accesso non consentito.'], 403);
        }

        $allegati = $documento->getAllegati();
        if ($allegati->isEmpty()) {
            return $this->json(['error' => 'Nessun allegato presente.'], 404);
        }

        $allegato = $allegati->first();
        $dir = $this->com->dirDocumento($documento);
        $path = $dir . '/' . $allegato->getFile() . '.' . $allegato->getEstensione();

        if (!file_exists($path)) {
            return $this->json(['error' => 'File non trovato sul server.'], 404);
        }

        $disposition = $request->query->get('mode') === 'open'
            ? ResponseHeaderBag::DISPOSITION_INLINE
            : ResponseHeaderBag::DISPOSITION_ATTACHMENT;

        return $this->file($path, $allegato->getNome() . '.' . $allegato->getEstensione(), $disposition);
    }

    #[Route(path: '/{id}', name: 'api_documenti_delete', requirements: ['id' => '\d+'], methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $docente = $this->requireDocente();
        if ($docente instanceof JsonResponse) return $docente;

        $documento = $this->em->find(Documento::class, $id);
        if (!$documento) {
            return $this->json(['error' => 'Documento non trovato.'], 404);
        }

        if (!$this->isGranted('ROLE_STAFF') && $documento->getAutore()->getId() !== $docente->getId()) {
            return $this->json(['error' => 'Accesso non consentito.'], 403);
        }

        foreach ($documento->getAllegati() as $allegato) {
            $dir = $this->com->dirDocumento($documento);
            $path = $dir . '/' . $allegato->getFile() . '.' . $allegato->getEstensione();
            if (file_exists($path)) {
                unlink($path);
            }
            $this->em->remove($allegato);
        }

        $this->com->cancellaDestinatari($documento);
        $this->em->remove($documento);
        $this->em->flush();

        return $this->json(['message' => 'Documento eliminato con successo.']);
    }

    private function serializeSlot(array $row, int $docenteId, bool $includeAlunno = false): array
    {
        $result = [
            'classeId' => $row['classe_id'],
            'classeName' => $row['anno'] . 'ª' . $row['sezione'] . ($row['gruppo'] ? '-' . $row['gruppo'] : ''),
            'classeAnno' => $row['anno'],
            'sedeNome' => $row['sede'],
            'materiaId' => $row['materia_id'],
            'materiaNome' => $row['materiaBreve'],
            'documento' => $row['documento'] ? $this->serializeDocumento($row['documento'], $docenteId) : null,
        ];
        if ($includeAlunno) {
            $alunnoId = $row['alunno_id'] ?? null;
            $result['alunnoId'] = $alunnoId;
            $result['alunnoName'] = $alunnoId
                ? trim(($row['alunnoCognome'] ?? '') . ' ' . ($row['alunnoNome'] ?? ''))
                : null;
        }
        return $result;
    }

    private function serializeDocumento(Documento $doc, int $docenteId): array
    {
        $canDelete = $doc->getAutore()->getId() === $docenteId || $this->isGranted('ROLE_STAFF');
        return [
            'id' => $doc->getId(),
            'tipo' => $doc->getTipo(),
            'titolo' => $doc->getTitolo(),
            'data' => $doc->getData()?->format('Y-m-d'),
            'canDelete' => $canDelete,
            'allegati' => array_map(fn($a) => [
                'id' => $a->getId(),
                'titolo' => $a->getTitolo(),
                'nome' => $a->getNome(),
                'estensione' => $a->getEstensione(),
                'dimensione' => $a->getDimensione(),
            ], $doc->getAllegati()->toArray()),
        ];
    }

    private function requireDocente(): Docente|JsonResponse
    {
        $user = $this->getUser();
        if (!$user instanceof Docente) {
            return $this->json(['error' => 'Accesso riservato ai docenti.'], 403);
        }
        return $user;
    }
}
