<?php

namespace App\Service;

use App\Entity\Alunno;
use App\Entity\Cattedra;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Materia;
use App\Entity\Nota;
use App\Util\HtmlSanitizer;
use App\Util\LogHandler;
use App\Util\RegistroUtil;
use DateTime;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\ORM\EntityManagerInterface;

class RegistroNoteService
{
    public function __construct(
        private EntityManagerInterface $em,
        private RegistroUtil $registroUtil,
        private LogHandler $logHandler,
    ) {}

    public function buildDaily(Docente $docente, ?int $cattedraId, ?int $classeId, string $data): array
    {
        [$cattedra, $classe, $materia, $dataObj] = $this->resolveContext($docente, $cattedraId, $classeId, $data);
        $error = $this->registroUtil->controlloData($dataObj, $classe->getSede());

        $notes = $this->em->getRepository(Nota::class)->createQueryBuilder('n')
            ->join('n.classe', 'c')
            ->where('n.data=:data AND c.anno=:anno AND c.sezione=:sezione')
            ->setParameter('data', $dataObj->format('Y-m-d'))
            ->setParameter('anno', $classe->getAnno())
            ->setParameter('sezione', $classe->getSezione())
            ->orderBy('n.modificato', 'DESC')
            ->getQuery()
            ->getResult();

        $studentIds = $this->registroUtil->presentiInData($dataObj, $classe);
        foreach ($notes as $note) {
            foreach ($note->getAlunni() as $alunno) {
                $studentIds[] = $alunno->getId();
            }
        }
        $studentIds = array_values(array_unique($studentIds));
        $studentOptions = [];
        if (!empty($studentIds)) {
            $students = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
                ->select('a.id,a.cognome,a.nome,a.dataNascita')
                ->where('a.id IN (:ids)')
                ->setParameter('ids', $studentIds)
                ->orderBy('a.cognome,a.nome,a.dataNascita', 'ASC')
                ->getQuery()
                ->getArrayResult();

            foreach ($students as $student) {
                $studentOptions[] = [
                    'id' => (int) $student['id'],
                    'label' => $student['cognome'].' '.$student['nome'].' ('.$student['dataNascita']->format('d/m/Y').')',
                ];
            }
        }

        return [
            'info' => [
                'data' => $dataObj->format('Y-m-d'),
                'errore' => $error,
                'classe' => [
                    'id' => $classe->getId(),
                    'nome' => (string) $classe,
                ],
                'cattedra' => $cattedra ? [
                    'id' => $cattedra->getId(),
                    'tipo' => $cattedra->getTipo(),
                ] : null,
                'materia' => [
                    'id' => $materia->getId(),
                    'nomeBreve' => $materia->getNomeBreve(),
                    'tipo' => $materia->getTipo(),
                ],
                'permissions' => [
                    'canAdd' => !$error && $this->registroUtil->azioneNota('add', $dataObj, $docente, $classe),
                ],
            ],
            'studentOptions' => $studentOptions,
            'notes' => array_map(
                fn (Nota $note) => $this->serializeNote($docente, $classe, $note, $cattedra),
                $notes,
            ),
        ];
    }

    public function createNote(
        Docente $docente,
        ?int $cattedraId,
        ?int $classeId,
        string $data,
        string $tipo,
        string $testo,
        array $alunnoIds,
    ): array {
        [$cattedra, $classe, $materia, $dataObj] = $this->resolveContext($docente, $cattedraId, $classeId, $data);
        $note = (new Nota())
            ->setTipo($this->normalizeTipo($tipo))
            ->setData($dataObj)
            ->setClasse($classe)
            ->setDocente($docente);
        $this->em->persist($note);

        $this->validateAndHydrateNote($docente, $classe, $materia, $dataObj, $note, $testo, $alunnoIds, 'add');

        $this->em->flush();
        $this->logHandler->logAzione('REGISTRO', 'Crea nota API');

        return [
            'message' => 'Nota creata con successo.',
            'data' => ['id' => $note->getId()],
        ];
    }

    public function updateNote(
        Docente $docente,
        int $noteId,
        string $testo,
        string $tipo,
        array $alunnoIds,
    ): array {
        $note = $this->em->getRepository(Nota::class)->find($noteId);
        if (!$note) {
            throw new \RuntimeException('Nota non trovata.');
        }

        $classe = $note->getClasse();
        $materia = $this->guessMateriaForNote($docente, $classe);
        $this->validateAndHydrateNote(
            $docente,
            $classe,
            $materia,
            $note->getData(),
            $note,
            $testo,
            $alunnoIds,
            'edit',
            $this->normalizeTipo($tipo),
        );

        $this->em->flush();
        $this->logHandler->logAzione('REGISTRO', 'Modifica nota API');

        return [
            'message' => 'Nota aggiornata con successo.',
            'data' => ['id' => $note->getId()],
        ];
    }

    public function setProvvedimento(Docente $docente, int $noteId, string $provvedimento): array
    {
        $note = $this->em->getRepository(Nota::class)->find($noteId);
        if (!$note) {
            throw new \RuntimeException('Nota non trovata.');
        }
        if (!$this->registroUtil->azioneNota('extra', $note->getData(), $docente, $note->getClasse(), $note)) {
            throw new \RuntimeException('Azione non consentita per questa nota.');
        }
        if (trim($provvedimento) === '') {
            throw new \RuntimeException('Il provvedimento non può essere vuoto.');
        }

        $note
            ->setDocenteProvvedimento($docente)
            ->setProvvedimento(HtmlSanitizer::sanitizeMessage(trim($provvedimento)));

        $this->em->flush();
        $this->logHandler->logAzione('REGISTRO', 'Provvedimento nota API');

        return [
            'message' => 'Provvedimento salvato.',
            'data' => ['id' => $note->getId()],
        ];
    }

    public function deleteNote(Docente $docente, int $noteId): array
    {
        $note = $this->em->getRepository(Nota::class)->find($noteId);
        if (!$note) {
            throw new \RuntimeException('Nota non trovata.');
        }
        if (!$this->registroUtil->azioneNota('delete', $note->getData(), $docente, $note->getClasse(), $note)) {
            throw new \RuntimeException('Azione non consentita per questa nota.');
        }

        $this->em->remove($note);
        $this->em->flush();
        $this->logHandler->logAzione('REGISTRO', 'Cancella nota API');

        return [
            'message' => 'Nota rimossa.',
            'data' => ['id' => $noteId],
        ];
    }

    public function cancelNote(Docente $docente, int $noteId): array
    {
        $note = $this->em->getRepository(Nota::class)->find($noteId);
        if (!$note) {
            throw new \RuntimeException('Nota non trovata.');
        }
        if (!$this->registroUtil->azioneNota('cancel', $note->getData(), $docente, $note->getClasse(), $note)) {
            throw new \RuntimeException('Azione non consentita per questa nota.');
        }

        $note->setAnnullata(new DateTime());
        $this->em->flush();
        $this->logHandler->logAzione('REGISTRO', 'Annulla nota API');

        return [
            'message' => 'Nota annullata.',
            'data' => ['id' => $noteId],
        ];
    }

    private function resolveContext(Docente $docente, ?int $cattedraId, ?int $classeId, string $data): array
    {
        $dataObj = DateTime::createFromFormat('Y-m-d', $data);
        if (!$dataObj) {
            throw new \RuntimeException('Data non valida.');
        }

        if ($cattedraId) {
            $cattedra = $this->em->getRepository(Cattedra::class)->findOneBy([
                'id' => $cattedraId,
                'docente' => $docente,
                'attiva' => true,
            ]);
            if (!$cattedra) {
                throw new \RuntimeException('Cattedra non trovata.');
            }

            return [$cattedra, $cattedra->getClasse(), $cattedra->getMateria(), $dataObj];
        }

        if (!$classeId) {
            throw new \RuntimeException('Classe non specificata.');
        }

        $classe = $this->em->getRepository(Classe::class)->find($classeId);
        if (!$classe) {
            throw new \RuntimeException('Classe non trovata.');
        }
        $materia = $this->em->getRepository(Materia::class)->findOneByTipo('U');
        if (!$materia) {
            throw new \RuntimeException('Materia sostituzione non trovata.');
        }

        return [null, $classe, $materia, $dataObj];
    }

    private function validateAndHydrateNote(
        Docente $docente,
        Classe $classe,
        Materia $materia,
        DateTime $dataObj,
        Nota $note,
        string $testo,
        array $alunnoIds,
        string $azione,
        ?string $tipo = null,
    ): void {
        if ($this->registroUtil->controlloData($dataObj, $classe->getSede())) {
            throw new \RuntimeException('Data festiva non consentita.');
        }
        if (!$this->registroUtil->azioneNota($azione, $dataObj, $docente, $classe, $azione === 'add' ? null : $note)) {
            throw new \RuntimeException('Azione non consentita per questa nota.');
        }

        $tipo = $tipo ?: $note->getTipo();
        $tipo = $this->normalizeTipo($tipo);
        $testo = trim($testo);
        if ($testo === '') {
            throw new \RuntimeException('Il testo della nota non può essere vuoto.');
        }

        $note
            ->setTipo($tipo)
            ->setTesto(HtmlSanitizer::sanitizeMessage($testo));

        if ($tipo === 'I') {
            if (empty($alunnoIds)) {
                throw new \RuntimeException('Selezionare almeno un alunno per la nota individuale.');
            }

            $presenti = $this->registroUtil->presentiInData($dataObj, $classe);
            $selected = array_values(array_unique(array_map('intval', $alunnoIds)));
            foreach ($selected as $studentId) {
                if (!in_array($studentId, $presenti, true)) {
                    throw new \RuntimeException('Uno o più alunni selezionati non risultano presenti nella data indicata.');
                }
            }
            $students = $this->em->getRepository(Alunno::class)->createQueryBuilder('a')
                ->where('a.id IN (:ids)')
                ->setParameter('ids', $selected)
                ->getQuery()
                ->getResult();
            $note->setAlunni(new ArrayCollection($students));
        } else {
            if ($materia->getTipo() === 'R') {
                throw new \RuntimeException('La nota di classe non è prevista per religione.');
            }
            $foundName = $this->registroUtil->contieneNomiAlunni($dataObj, $classe, $testo);
            if ($foundName) {
                throw new \RuntimeException("Il testo della nota di classe contiene il nome '{$foundName}'.");
            }
            $note->setAlunni(new ArrayCollection());
        }
    }

    private function guessMateriaForNote(Docente $docente, Classe $classe): Materia
    {
        $cattedra = $this->em->getRepository(Cattedra::class)->findOneBy([
            'docente' => $docente,
            'classe' => $classe,
            'attiva' => true,
        ]);

        return $cattedra?->getMateria() ?? $this->em->getRepository(Materia::class)->findOneByTipo('U');
    }

    private function serializeNote(Docente $docente, Classe $classe, Nota $note, ?Cattedra $cattedra): array
    {
        $alunni = [];
        $alunniIds = [];
        foreach ($note->getAlunni() as $alunno) {
            $alunni[] = $alunno->getCognome().' '.$alunno->getNome();
            $alunniIds[] = $alunno->getId();
        }
        sort($alunni);

        return [
            'id' => $note->getId(),
            'tipo' => $note->getTipo(),
            'data' => $note->getData()->format('Y-m-d'),
            'testo' => $note->getTesto(),
            'provvedimento' => $note->getProvvedimento(),
            'annullata' => $note->getAnnullata()?->format('Y-m-d'),
            'docente' => $note->getDocente()->getNome().' '.$note->getDocente()->getCognome(),
            'docenteProvvedimento' => $note->getDocenteProvvedimento()
                ? $note->getDocenteProvvedimento()->getNome().' '.$note->getDocenteProvvedimento()->getCognome()
                : null,
            'alunni' => $alunni,
            'alunniIds' => $alunniIds,
            'permissions' => [
                'canEdit' => $this->registroUtil->azioneNota('edit', $note->getData(), $docente, $classe, $note),
                'canDelete' => $this->registroUtil->azioneNota('delete', $note->getData(), $docente, $classe, $note),
                'canCancel' => $this->registroUtil->azioneNota('cancel', $note->getData(), $docente, $classe, $note),
                'canProvvedimento' => $this->registroUtil->azioneNota('extra', $note->getData(), $docente, $classe, $note),
            ],
            'context' => [
                'cattedraId' => $cattedra?->getId(),
                'classeId' => $classe->getId(),
            ],
        ];
    }

    private function normalizeTipo(string $tipo): string
    {
        $tipo = strtoupper(trim($tipo));
        if (!in_array($tipo, ['C', 'I'], true)) {
            throw new \RuntimeException('Tipo nota non valido.');
        }

        return $tipo;
    }
}
