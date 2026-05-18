# Manuale Amministratore

## Per chi è questo manuale

Questo manuale è per il **referente tecnico** dell'istituto (ruolo `ROLE_AMMINISTRATORE`): la persona che configura il sistema, gestisce le anagrafiche, carica orari e calendario, mantiene operativo il registro.

L'amministratore ha **pieno accesso** a tutte le aree del sistema, comprese quelle riservate al Dirigente. Ha la responsabilità del funzionamento tecnico e di un'attenta gestione dei dati personali.

**Prerequisiti:**
- Account con `ROLE_AMMINISTRATORE`
- Conoscenze base di anagrafica scolastica
- Possibilità di accesso al server o di interlocuzione col gestore

## Indice

1. [Accesso al registro](#1-accesso)
2. [Dashboard amministratore](#2-dashboard-amministratore)
3. [Setup iniziale dell'istituto](#3-setup-iniziale)
4. [Anagrafiche scolastiche](#4-anagrafiche-scolastiche)
5. [Calendario e orario](#5-calendario-e-orario)
6. [Gestione utenti](#6-gestione-utenti)
7. [Cattedre e incarichi](#7-cattedre-e-incarichi)
8. [Sistema](#8-sistema)
9. [Operazioni periodiche](#9-operazioni-periodiche)
10. [FAQ ed errori comuni](#10-faq-ed-errori-comuni)

---

## 1. Accesso

Stessa procedura del [Manuale Docente § 1](manuale_docente.md#1-accesso-al-registro). Ricorda che l'account amministratore è particolarmente sensibile: usalo solo per le operazioni che lo richiedono e proteggi bene la password.

## 2. Dashboard amministratore

In `/dashboard` vedi tutte e tre le card di accesso rapido:

- **Gestione Utenti** → `/utenti` (hub Docenti, Alunni, ATA)
- **Registro Classe** → `/lezioni`
- **Calendario** → `/agenda`

Dal menu laterale hai inoltre accesso completo a **Sistema**, **Scuola**, **Sezioni utente** (Docenti, Alunni, ATA), **Richieste**, **Segreteria**.

## 3. Setup iniziale

Nuova installazione, nuovo anno scolastico, ripristino da backup: l'ordine corretto è:

```
Istituto → Sedi → Corsi → Materie → Classi → Festività → Orario → Scansione oraria → Cattedre → Lezioni orario
```

### 3.1 Istituto

> **Pagina:** `Scuola → Istituto` (`/scuola/istituto`)

Imposta: nome ufficiale, nome breve, intestazione (per documenti), email, PEC, URL sito, dati del Dirigente, firme, email mittente notifiche.

### 3.2 Sedi

> **Pagina:** `Scuola → Sedi` (`/scuola/sedi`)

Una riga per ogni sede fisica (o virtuale, se serve separare orario mattutino e serale come sedi distinte). Campi: nome, nome breve, città, indirizzo, telefono, ordinamento.

### 3.3 Anno scolastico

> **Pagina:** `Sistema → Parametri` (`/sistema/parametri`)

Imposta `anno_inizio` (es. `2025-09-15`) e `anno_fine` (es. `2026-06-10`), nomi e fine dei periodi (`periodo1_nome`, `periodo1_fine`, `periodo2_fine`, eventualmente `periodo3_*`).

> **Importante**: senza questi parametri, il Registro voti dà errore 500 ("infoPeriodi") perché non riesce a calcolare i periodi.

## 4. Anagrafiche scolastiche

### 4.1 Corsi

> **Pagina:** `Scuola → Corsi` (`/scuola/corsi`)

I corsi di studio (es. ITAF — Amministrazione Finanza Marketing, IP19 — Servizi Socio-Sanitari, SIA — Sistemi Informativi Aziendali). Ogni corso ha: nome, nome breve, sezione tipo, durata.

### 4.2 Materie

> **Pagina:** `Scuola → Materie` (`/scuola/materie`)

Tutte le discipline con: nome, nome breve, tipo (`N` Normale, `R` Religione, `E` Educazione Civica, `S` Sostegno, `U` Sostituzione), valutazione, ordinamento, se entra in media.

### 4.3 Classi

> **Pagina:** `Scuola → Classi` (`/scuola/classi`)

Per ogni classe: anno (1-5), sezione (A, B, ...), gruppo (es. ITAF, IP19, SIA), corso, sede, coordinatore, segretario.

### 4.4 Moduli formativi

> **Pagina:** `Scuola → Moduli formativi` (`/scuola/moduliFormativi`)

PCTO, moduli interdisciplinari, percorsi di Educazione Civica. Si associano alle classi e i docenti possono firmare lezioni con riferimento al modulo.

### 4.5 Moduli richiesta

> **Pagina:** `Scuola → Moduli` (`/scuola/moduli`)

Definisce i tipi di **richiesta** che alunni/genitori/docenti possono inviare (es. richiesta di certificato, giustificazione, ecc.).

## 5. Calendario e orario

Procedura completa in [`procedura_caricamento_calendario.md`](../procedura_caricamento_calendario.md). In sintesi:

### 5.1 Festività

> **Pagina:** `Scuola → Festività` (`/scuola/festivita`)

Inserire le **festività nazionali** (Tutti i Santi, Immacolata, Natale, Santo Stefano, Capodanno, Epifania, Pasqua, Pasquetta, 25 aprile, 1 maggio, 2 giugno) e le festività **specifiche dell'istituto** (Patrono, ponti deliberati). Lasciare `sede` vuoto per renderle valide su tutte le sedi.

### 5.2 Orario

> **Pagina:** `Scuola → Orario` (`/scuola/orario`)

Crea un **orario** per ogni sede. Periodo `15/09/2025 → 10/06/2026` (o quello dell'a.s.). Click sull'icona orologio per definire la **scansione oraria** (slot 1ª, 2ª, ... ora con inizio/fine/durata).

### 5.3 Lezioni orario

> Stessa pagina, click sull'icona griglia (Componi orario)

Per ogni classe, assegna a ogni cella `giorno × ora` la cattedra che insegna in quel momento. Si compila ricalcando il PDF dell'orario settimanale dell'istituto.

## 6. Gestione utenti

> **Hub:** `/utenti` (Docenti, Alunni, ATA)

L'accesso è gated: solo Amministratore o Dirigente vedono il pulsante in dashboard.

### 6.1 Docenti

> **Pagine:** `Docenti → Modifica` (`/docenti/modifica`), `Docenti → Importazione` (`/docenti/importa`)

Da `/docenti/modifica`:
- **Aggiungi docente** singolo
- **Modifica** dati anagrafici, password, foto
- **Abilita / Disabilita** account
- **Reset password** (genera password casuale e la invia per email)

Da `/docenti/importa`: import massivo da CSV (formato documentato in pagina).

### 6.2 Alunni

Pagine analoghe sotto `/alunni/*`. Possibilità di:
- Modificare anagrafica + classe di appartenenza
- Importare da CSV
- Gestire **rappresentanti** (alunni e genitori)
- Spostare un alunno tra classi (`/alunni/classe`)

### 6.3 Personale ATA

`/ata/*`: anagrafica, importazione, rappresentanti.

> **Sicurezza**: tutte le scritture sull'anagrafica utenti (`POST/PUT/PATCH`) richiedono `ROLE_AMMINISTRATORE` o `ROLE_PRESIDE`. Le `GET` sono accessibili anche a docenti per uso in dropdown e simili.

## 7. Cattedre e incarichi

### 7.1 Cattedre

> **Pagina:** `Docenti → Cattedre` (`/docenti/cattedre`)

Vedi [`procedura_assegnazione_cattedre.md`](../procedura_assegnazione_cattedre.md). Per ogni cattedra: docente + materia + classe + tipo (`N`/`I`/`P`/`A`) + flag supplenza.

### 7.2 Coordinatori e segretari

> **Pagine:** `Docenti → Coordinatori`, `Docenti → Segretari`

Per ogni classe assegna il **coordinatore** e il **segretario** del consiglio di classe.

### 7.3 Staff, BES, RSPP, Rappresentanti

Pagine dedicate:
- `Docenti → Staff` — collaboratori del Dirigente
- `Docenti → Responsabili BES` — referenti BES per sede
- `Docenti → RSPP` — Responsabile Sicurezza
- `Docenti → Rappresentanti` — rappresentanti dei docenti negli organi collegiali

## 8. Sistema

> **Hub:** `Sistema` (`/sistema`)

### 8.1 Parametri

`/sistema/parametri` — configurazioni di sistema (anno scolastico, periodi, soglie, opzioni).

### 8.2 Banner

`/sistema/banner` — messaggio in homepage (es. "Avvisi importanti per il rientro in classe").

### 8.3 Email

`/sistema/email` — configurazione SMTP per le notifiche.

### 8.4 Telegram

`/sistema/telegram` — bot per notifiche immediate (opzionale).

### 8.5 Manutenzione

`/sistema/manutenzione` — modalità manutenzione: il sito mostra un messaggio agli utenti non admin.

### 8.6 Aggiornamenti

`/sistema/aggiorna` — aggiornamenti del registro (Symfony console + migrazioni DB).

### 8.7 Archivia

`/sistema/archivia` — archiviazione di fine anno (backup + reset operativo per il nuovo a.s.).

### 8.8 Nuovo anno

`/sistema/nuovo` — creazione nuovo anno scolastico.

### 8.9 Password reset

`/sistema/password` — reset password massivo o per gruppi.

### 8.10 Alias

`/sistema/alias` — entra come un altro utente (per supporto e diagnosi). **Tracciato** nei log: usalo solo per motivi documentabili.

## 9. Operazioni periodiche

### Inizio anno scolastico (settembre)

1. `/sistema/nuovo` per creare l'a.s. 2025/26
2. Verifica anagrafiche docenti/alunni/ATA (passaggio di anno alunni)
3. Aggiorna **Festività** dell'a.s. corrente
4. Crea il nuovo **Orario** e la **scansione oraria**
5. Carica **cattedre** dal piano di organico
6. Carica **lezioni orario** dal PDF
7. Verifica **periodi** (dal `Sistema → Parametri`)
8. Comunica via email le credenziali ai nuovi utenti

### Durante l'anno

- Verifica **email mittente** e **SMTP** funzionino (test mensile)
- Monitora richieste pendenti dai genitori
- Backup periodico DB (operazione lato server)

### Fine anno (giugno-luglio)

- Chiusura scrutini finali
- Generazione documenti di valutazione e pagelle
- Archiviazione (`/sistema/archivia`)
- Backup completo

### Cambio sezione / cambio classe alunni

`/alunni/classe` — UI dedicata per spostare un alunno fra classi durante l'anno.

## 10. FAQ ed errori comuni

| Sintomo | Causa | Cosa fare |
|---|---|---|
| Docente segnala "Cattedre attive: 0" | Manca assegnazione cattedra | `/docenti/cattedre` → Aggiungi |
| Registro firme vuoto per tutti | Manca scansione oraria o orario scaduto | `/scuola/orario` → verifica periodi e scansione |
| Errore 500 sul Registro voti | Periodi non configurati | `/sistema/parametri` → imposta `periodo1_fine`, `periodo2_fine` |
| Festività non si vedono | `gs_festivita` vuota | `/scuola/festivita` → Aggiungi le 11 festività nazionali |
| Email non arrivano | SMTP errato o credenziali scadute | `/sistema/email` → test invio |
| Login docente: "Utente sconosciuto" anche se esiste | Stanno usando email come username | Indicargli lo username corretto (`cognome.iniziale_nome`) |
| Pagine vuote / errori improvvisi | Cache Symfony obsoleta | Restart container o `cache:clear` lato server |
| Non riesco a creare un secondo orario per la stessa sede | Le scansioni si sovrappongono per `(sede, giorno, ora)` | Crea una **sede virtuale** separata |

## Riferimenti

- [Indice manuali](README.md)
- [Manuale Dirigente](manuale_dirigente.md) — funzioni sovrapposte
- Procedure tecniche:
  - `Docs/procedura_assegnazione_cattedre.md`
  - `Docs/procedura_caricamento_calendario.md`
  - `Docs/restart_backend.md`
  - `Docs/RIPRISTINO_DATABASE_E_BACKUP_NAS.md`
- Documentazione tecnica del refactor in `Docs/`

---

*Ultimo aggiornamento: 2026-05-04*
