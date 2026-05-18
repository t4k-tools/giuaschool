<?php

namespace App\Controller\Api;

use App\Entity\Alunno;
use App\Entity\Ata;
use App\Entity\Classe;
use App\Entity\Docente;
use App\Entity\Genitore;
use App\Entity\Sede;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route(path: '/api/import')]
#[IsGranted('IS_AUTHENTICATED_FULLY')]
class ImportApiController extends AbstractController
{
    public function __construct(
        private EntityManagerInterface $em,
        private UserPasswordHasherInterface $hasher,
    ) {}

    // ──── IMPORT DOCENTI ────

    #[Route(path: '/docenti', name: 'api_import_docenti', methods: ['POST'])]
    public function importDocenti(Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file) {
            return $this->json(['error' => 'Nessun file caricato.'], 400);
        }

        $filtro = $request->request->get('filtro', 'T'); // T=tutti, N=solo nuovi, E=solo esistenti

        $expectedHeader = ['cognome', 'nome', 'sesso', 'codicefiscale', 'username', 'email'];
        $result = ['nuovi' => 0, 'modificati' => 0, 'invariati' => 0, 'errori' => []];

        $fh = fopen($file->getPathname(), 'r');
        if (!$fh) {
            return $this->json(['error' => 'Impossibile aprire il file.'], 400);
        }

        // Leggi header
        $headerLine = fgetcsv($fh, 0, ';');
        if (!$headerLine) {
            fclose($fh);
            return $this->json(['error' => 'File CSV vuoto.'], 400);
        }
        $header = array_map(fn($h) => strtolower(trim(str_replace("\xEF\xBB\xBF", '', $h))), $headerLine);

        // Verifica che contenga almeno cognome, nome, sesso
        if (!in_array('cognome', $header) || !in_array('nome', $header) || !in_array('sesso', $header)) {
            fclose($fh);
            return $this->json(['error' => 'Header CSV non valido. Campi obbligatori: cognome;nome;sesso. Campi opzionali: codicefiscale;username;email'], 400);
        }

        $colMap = array_flip($header);
        $riga = 1;

        while (($row = fgetcsv($fh, 0, ';')) !== false) {
            $riga++;
            if (count($row) < 3) {
                $result['errori'][] = "Riga $riga: campi insufficienti.";
                continue;
            }

            $cognome = ucwords(strtolower(trim($row[$colMap['cognome']] ?? '')));
            $nome = ucwords(strtolower(trim($row[$colMap['nome']] ?? '')));
            $sesso = strtoupper(trim($row[$colMap['sesso']] ?? ''));

            if (empty($cognome) || empty($nome) || !in_array($sesso, ['M', 'F'])) {
                $result['errori'][] = "Riga $riga: cognome, nome o sesso mancante/non valido.";
                continue;
            }

            $cf = isset($colMap['codicefiscale']) ? strtoupper(trim($row[$colMap['codicefiscale']] ?? '')) : '';
            $username = isset($colMap['username']) ? strtolower(trim($row[$colMap['username']] ?? '')) : '';
            $email = isset($colMap['email']) ? strtolower(trim($row[$colMap['email']] ?? '')) : '';

            // Auto-genera username se vuoto
            if (empty($username)) {
                $base = $this->transliterate(strtolower($nome)) . '.' . $this->transliterate(strtolower($cognome));
                $username = $base;
                $n = 1;
                while ($this->em->getRepository(Docente::class)->findOneBy(['username' => $username])) {
                    $username = $base . $n;
                    $n++;
                }
            }

            // Auto-genera email se vuota
            if (empty($email)) {
                $email = $username . '@noemail.local';
            }

            // Cerca docente esistente per username o codice fiscale
            $existing = $this->em->getRepository(Docente::class)->findOneBy(['username' => $username]);
            if (!$existing && !empty($cf)) {
                $existing = $this->em->getRepository(Docente::class)->findOneBy(['codiceFiscale' => $cf]);
            }

            if ($existing) {
                if ($filtro === 'N') {
                    $result['invariati']++;
                    continue;
                }
                $existing->setCognome($cognome);
                $existing->setNome($nome);
                $existing->setSesso($sesso);
                if (!empty($cf)) $existing->setCodiceFiscale($cf);
                if (!empty($email) && $email !== $username . '@noemail.local') $existing->setEmail($email);
                $result['modificati']++;
            } else {
                if ($filtro === 'E') {
                    $result['invariati']++;
                    continue;
                }
                $docente = new Docente();
                $docente->setCognome($cognome);
                $docente->setNome($nome);
                $docente->setSesso($sesso);
                $docente->setUsername($username);
                $docente->setEmail($email);
                if (!empty($cf)) $docente->setCodiceFiscale($cf);
                $docente->setAbilitato(true);
                $password = $this->generatePassword();
                $docente->setPassword($this->hasher->hashPassword($docente, $password));
                $this->em->persist($docente);
                $result['nuovi']++;
            }
        }

        fclose($fh);
        $this->em->flush();

        return $this->json([
            'message' => "Importazione completata: {$result['nuovi']} nuovi, {$result['modificati']} modificati, {$result['invariati']} invariati.",
            'result' => $result,
        ]);
    }

    // ──── IMPORT ALUNNI ────

    #[Route(path: '/alunni', name: 'api_import_alunni', methods: ['POST'])]
    public function importAlunni(Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file) {
            return $this->json(['error' => 'Nessun file caricato.'], 400);
        }

        $filtro = $request->request->get('filtro', 'T');

        $result = ['nuovi' => 0, 'modificati' => 0, 'invariati' => 0, 'errori' => []];

        $fh = fopen($file->getPathname(), 'r');
        if (!$fh) {
            return $this->json(['error' => 'Impossibile aprire il file.'], 400);
        }

        $headerLine = fgetcsv($fh, 0, ';');
        if (!$headerLine) {
            fclose($fh);
            return $this->json(['error' => 'File CSV vuoto.'], 400);
        }
        $header = array_map(fn($h) => strtolower(trim(str_replace("\xEF\xBB\xBF", '', $h))), $headerLine);

        if (!in_array('cognome', $header) || !in_array('nome', $header) || !in_array('sesso', $header)) {
            fclose($fh);
            return $this->json(['error' => 'Header CSV non valido. Campi obbligatori: cognome;nome;sesso. Campi opzionali: datanascita;comunenascita;codicefiscale;classe;username;email'], 400);
        }

        $colMap = array_flip($header);
        $riga = 1;

        while (($row = fgetcsv($fh, 0, ';')) !== false) {
            $riga++;
            if (count($row) < 3) {
                $result['errori'][] = "Riga $riga: campi insufficienti.";
                continue;
            }

            $cognome = ucwords(strtolower(trim($row[$colMap['cognome']] ?? '')));
            $nome = ucwords(strtolower(trim($row[$colMap['nome']] ?? '')));
            $sesso = strtoupper(trim($row[$colMap['sesso']] ?? ''));

            if (empty($cognome) || empty($nome) || !in_array($sesso, ['M', 'F'])) {
                $result['errori'][] = "Riga $riga: cognome, nome o sesso mancante/non valido.";
                continue;
            }

            $cf = isset($colMap['codicefiscale']) ? strtoupper(trim($row[$colMap['codicefiscale']] ?? '')) : '';
            $username = isset($colMap['username']) ? strtolower(trim($row[$colMap['username']] ?? '')) : '';
            $email = isset($colMap['email']) ? strtolower(trim($row[$colMap['email']] ?? '')) : '';
            $dataNascitaStr = isset($colMap['datanascita']) ? trim($row[$colMap['datanascita']] ?? '') : '';
            $comuneNascita = isset($colMap['comunenascita']) ? trim($row[$colMap['comunenascita']] ?? '') : '';
            $classeStr = isset($colMap['classe']) ? strtoupper(trim($row[$colMap['classe']] ?? '')) : '';

            // Auto-genera username
            if (empty($username)) {
                $base = $this->transliterate(strtolower($nome)) . '.' . $this->transliterate(strtolower($cognome));
                $username = $base;
                $n = 1;
                while ($this->em->getRepository(Alunno::class)->findOneBy(['username' => $username])) {
                    $username = $base . $n;
                    $n++;
                }
            }

            if (empty($email)) {
                $email = $username . '@noemail.local';
            }

            // Cerca classe
            $classe = null;
            if (!empty($classeStr) && preg_match('/^(\d)([A-Z])(.*)$/', $classeStr, $m)) {
                $classe = $this->em->getRepository(Classe::class)->findOneBy([
                    'anno' => (int)$m[1],
                    'sezione' => $m[2],
                    'gruppo' => !empty($m[3]) ? ltrim($m[3], '-') : '',
                ]);
                if (!$classe) {
                    $result['errori'][] = "Riga $riga: classe '$classeStr' non trovata.";
                    continue;
                }
            }

            // Parse data nascita
            $dataNascita = null;
            if (!empty($dataNascitaStr)) {
                $dataNascita = \DateTime::createFromFormat('d/m/Y', $dataNascitaStr)
                    ?: \DateTime::createFromFormat('Y-m-d', $dataNascitaStr);
                if (!$dataNascita) {
                    $result['errori'][] = "Riga $riga: formato data nascita non valido (usare gg/mm/aaaa).";
                    continue;
                }
            }

            // Cerca alunno esistente
            $existing = null;
            if (!empty($cf)) {
                $existing = $this->em->getRepository(Alunno::class)->findOneBy(['codiceFiscale' => $cf]);
            }
            if (!$existing) {
                $existing = $this->em->getRepository(Alunno::class)->findOneBy(['username' => $username]);
            }

            if ($existing) {
                if ($filtro === 'N') {
                    $result['invariati']++;
                    continue;
                }
                $existing->setCognome($cognome);
                $existing->setNome($nome);
                $existing->setSesso($sesso);
                if (!empty($cf)) $existing->setCodiceFiscale($cf);
                if ($dataNascita) $existing->setDataNascita($dataNascita);
                if (!empty($comuneNascita)) $existing->setComuneNascita($comuneNascita);
                if ($classe) $existing->setClasse($classe);
                $result['modificati']++;
            } else {
                if ($filtro === 'E') {
                    $result['invariati']++;
                    continue;
                }
                $alunno = new Alunno();
                $alunno->setCognome($cognome);
                $alunno->setNome($nome);
                $alunno->setSesso($sesso);
                $alunno->setUsername($username);
                $alunno->setEmail($email);
                if (!empty($cf)) $alunno->setCodiceFiscale($cf);
                if ($dataNascita) $alunno->setDataNascita($dataNascita);
                if (!empty($comuneNascita)) $alunno->setComuneNascita($comuneNascita);
                if ($classe) $alunno->setClasse($classe);
                $alunno->setAbilitato(true);
                $alunno->setBes('N');
                $alunno->setReligione('S');
                $password = $this->generatePassword();
                $alunno->setPassword($this->hasher->hashPassword($alunno, $password));
                $this->em->persist($alunno);
                $result['nuovi']++;
            }
        }

        fclose($fh);
        $this->em->flush();

        return $this->json([
            'message' => "Importazione completata: {$result['nuovi']} nuovi, {$result['modificati']} modificati, {$result['invariati']} invariati.",
            'result' => $result,
        ]);
    }

    // ──── IMPORT ATA ────

    #[Route(path: '/ata', name: 'api_import_ata', methods: ['POST'])]
    public function importAta(Request $request): JsonResponse
    {
        $file = $request->files->get('file');
        if (!$file) {
            return $this->json(['error' => 'Nessun file caricato.'], 400);
        }

        $filtro = $request->request->get('filtro', 'T');

        $result = ['nuovi' => 0, 'modificati' => 0, 'invariati' => 0, 'errori' => []];

        $fh = fopen($file->getPathname(), 'r');
        if (!$fh) {
            return $this->json(['error' => 'Impossibile aprire il file.'], 400);
        }

        $headerLine = fgetcsv($fh, 0, ';');
        if (!$headerLine) {
            fclose($fh);
            return $this->json(['error' => 'File CSV vuoto.'], 400);
        }
        $header = array_map(fn($h) => strtolower(trim(str_replace("\xEF\xBB\xBF", '', $h))), $headerLine);

        if (!in_array('cognome', $header) || !in_array('nome', $header) || !in_array('sesso', $header)) {
            fclose($fh);
            return $this->json(['error' => 'Header CSV non valido. Campi obbligatori: cognome;nome;sesso. Campi opzionali: codicefiscale;username;email;tipo;segreteria;sede'], 400);
        }

        $colMap = array_flip($header);
        $riga = 1;

        while (($row = fgetcsv($fh, 0, ';')) !== false) {
            $riga++;
            if (count($row) < 3) {
                $result['errori'][] = "Riga $riga: campi insufficienti.";
                continue;
            }

            $cognome = ucwords(strtolower(trim($row[$colMap['cognome']] ?? '')));
            $nome = ucwords(strtolower(trim($row[$colMap['nome']] ?? '')));
            $sesso = strtoupper(trim($row[$colMap['sesso']] ?? ''));

            if (empty($cognome) || empty($nome) || !in_array($sesso, ['M', 'F'])) {
                $result['errori'][] = "Riga $riga: cognome, nome o sesso mancante/non valido.";
                continue;
            }

            $cf = isset($colMap['codicefiscale']) ? strtoupper(trim($row[$colMap['codicefiscale']] ?? '')) : '';
            $username = isset($colMap['username']) ? strtolower(trim($row[$colMap['username']] ?? '')) : '';
            $email = isset($colMap['email']) ? strtolower(trim($row[$colMap['email']] ?? '')) : '';
            $tipo = isset($colMap['tipo']) ? strtoupper(trim($row[$colMap['tipo']] ?? '')) : 'A';
            $segreteria = isset($colMap['segreteria']) ? strtoupper(trim($row[$colMap['segreteria']] ?? '')) === 'S' : false;
            $sedeBreve = isset($colMap['sede']) ? trim($row[$colMap['sede']] ?? '') : '';

            if (!in_array($tipo, ['A', 'T', 'C', 'U', 'D'])) $tipo = 'A';

            // Auto-genera username
            if (empty($username)) {
                $base = $this->transliterate(strtolower($nome)) . '.' . $this->transliterate(strtolower($cognome));
                $username = $base;
                $n = 1;
                while ($this->em->getRepository(Ata::class)->findOneBy(['username' => $username])) {
                    $username = $base . $n;
                    $n++;
                }
            }

            if (empty($email)) {
                $email = $username . '@noemail.local';
            }

            // Sede
            $sede = null;
            if (!empty($sedeBreve)) {
                $sede = $this->em->getRepository(Sede::class)->findOneBy(['nomeBreve' => $sedeBreve]);
            }

            // Cerca ATA esistente
            $existing = $this->em->getRepository(Ata::class)->findOneBy(['username' => $username]);
            if (!$existing && !empty($cf)) {
                $existing = $this->em->getRepository(Ata::class)->findOneBy(['codiceFiscale' => $cf]);
            }

            if ($existing) {
                if ($filtro === 'N') {
                    $result['invariati']++;
                    continue;
                }
                $existing->setCognome($cognome);
                $existing->setNome($nome);
                $existing->setSesso($sesso);
                if (!empty($cf)) $existing->setCodiceFiscale($cf);
                $existing->setTipo($tipo);
                $existing->setSegreteria($segreteria);
                if ($sede) $existing->setSede($sede);
                $result['modificati']++;
            } else {
                if ($filtro === 'E') {
                    $result['invariati']++;
                    continue;
                }
                $ata = new Ata();
                $ata->setCognome($cognome);
                $ata->setNome($nome);
                $ata->setSesso($sesso);
                $ata->setUsername($username);
                $ata->setEmail($email);
                if (!empty($cf)) $ata->setCodiceFiscale($cf);
                $ata->setTipo($tipo);
                $ata->setSegreteria($segreteria);
                if ($sede) $ata->setSede($sede);
                $ata->setAbilitato(true);
                $password = $this->generatePassword();
                $ata->setPassword($this->hasher->hashPassword($ata, $password));
                $this->em->persist($ata);
                $result['nuovi']++;
            }
        }

        fclose($fh);
        $this->em->flush();

        return $this->json([
            'message' => "Importazione completata: {$result['nuovi']} nuovi, {$result['modificati']} modificati, {$result['invariati']} invariati.",
            'result' => $result,
        ]);
    }

    // ──── CSV TEMPLATE DOWNLOAD ────

    #[Route(path: '/template/{tipo}', name: 'api_import_template', methods: ['GET'])]
    public function template(string $tipo): JsonResponse
    {
        $templates = [
            'docenti' => "cognome;nome;sesso;codiceFiscale;username;email\nRossi;Mario;M;RSSMRA80A01H501Z;mario.rossi;mario.rossi@scuola.it",
            'alunni' => "cognome;nome;sesso;dataNascita;comuneNascita;codiceFiscale;classe\nBianchi;Luca;M;15/03/2008;Roma;BNCLCU08C15H501X;1A",
            'ata' => "cognome;nome;sesso;codiceFiscale;username;email;tipo;segreteria;sede\nVerdi;Anna;F;VRDNNA70A01H501Z;anna.verdi;anna.verdi@scuola.it;A;S;ACIIEF",
        ];

        if (!isset($templates[$tipo])) {
            return $this->json(['error' => 'Tipo non valido. Usa: docenti, alunni, ata'], 400);
        }

        return $this->json(['template' => $templates[$tipo], 'tipo' => $tipo]);
    }

    // ──── HELPERS ────

    private function generatePassword(int $length = 10): string
    {
        $chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
        $password = '';
        for ($i = 0; $i < $length; $i++) {
            $password .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $password;
    }

    private function transliterate(string $str): string
    {
        $str = preg_replace('/[^a-z0-9]/', '', iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $str) ?: $str);
        return $str ?: 'utente';
    }
}
