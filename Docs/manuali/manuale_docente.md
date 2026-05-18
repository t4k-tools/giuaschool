# Manuale Docente

## Per chi è questo manuale

Questo manuale è rivolto a **tutti i docenti** dell'istituto: docenti curricolari, docenti di sostegno, ITP (Insegnanti Tecnico-Pratici), supplenti, docenti di potenziamento e attività alternativa.

Se hai un **incarico aggiuntivo** (Coordinatore di classe, Segretario, Responsabile BES, RSPP) le funzioni specifiche sono trattate nelle appendici in fondo a questo manuale e nel [Manuale Coordinatore](manuale_coordinatore.md).

**Prerequisiti:**
- Avere ricevuto le credenziali dall'istituto
- Avere almeno una **cattedra attiva** assegnata dall'amministratore (combinazione docente + materia + classe)
- L'orario settimanale dell'istituto deve essere già stato caricato

## Indice

1. [Accesso al registro](#1-accesso-al-registro)
2. [La home (dashboard)](#2-la-home-dashboard)
3. [Contesto lezioni — il punto di partenza](#3-contesto-lezioni)
4. [Registro firme — firmare le proprie ore](#4-registro-firme)
5. [Registro voti — inserire valutazioni](#5-registro-voti)
6. [Registro assenze — gestire presenze e ritardi](#6-registro-assenze)
7. [Registro note — note disciplinari e annotazioni](#7-registro-note)
8. [Agenda — il tuo calendario personale](#8-agenda)
9. [Avvisi e circolari](#9-avvisi-e-circolari)
10. [Colloqui con i genitori](#10-colloqui)
11. [Documenti didattici](#11-documenti-didattici)
12. [Pagelle](#12-pagelle)
13. [Profilo personale](#13-profilo-personale)
14. [FAQ ed errori comuni](#14-faq-ed-errori-comuni)
15. [Appendici per incarichi aggiuntivi](#15-appendici)

---

## 1. Accesso al registro

1. Apri il browser su **https://registro.efor.it**
2. Inserisci **username** (es. `rossi.m`) e **password**
3. Click **Accedi**

> Lo username **non è la tua email**: in genere è `cognome.iniziale_nome`. Se l'email lavora dove lo username dovrebbe stare, il sistema risponde **"Utente sconosciuto"**.

**Primo accesso o dopo un reset:** ti verrà chiesto di cambiare la password.

**Dimenticato la password:** click su **"Hai dimenticato la password?"** dalla pagina di login → inserisci l'email → riceverai una password temporanea per email.

**Logout:** in basso a sinistra, click sul tuo nome → **Esci**.

## 2. La home (dashboard)

Subito dopo il login arrivi su `/dashboard`, dove vedi:

- **Benvenuto, [tuo nome]** con la data e ora correnti
- **Card informative**: Ruolo, Anno scolastico, Istituto, Orario locale
- **Card di accesso rapido**:
  - **Registro Classe** — porta alla scelta del contesto lezioni
  - **Calendario** — apre l'agenda personale

Dal **menu laterale** (icona ☰ in alto a sinistra se è chiuso) hai accesso a tutte le sezioni: Lezioni, Avvisi, Circolari, Colloqui, Documenti, Agenda, Pagelle, Profilo.

## 3. Contesto lezioni

> **Pagina:** `Lezioni → Contesto lezioni` (URL: `/lezioni`)

Prima di firmare lezioni o inserire voti devi **scegliere su quale cattedra o classe lavorare**. È la pagina più importante della tua giornata.

**Modalità "Cattedra"** — il caso normale:
1. Click su **Cattedra**
2. Dalla tendina, scegli la cattedra (`Materia · Classe`)
3. Click **Salva contesto**

**Modalità "Sostituzione"** — quando sostituisci un collega:
1. Click su **Sostituzione**
2. Scegli la **classe in sostituzione**
3. Click **Salva contesto**

Una volta salvato il contesto:
- I bottoni **Apri registro firme** e **Apri registro voti** ti portano direttamente al modulo giusto
- Il contesto viene memorizzato e riutilizzato finché non lo cambi
- L'**Anteprima contesto** mostra in basso classe e modalità attiva

**Cattedre attive: 0?** Significa che l'amministratore non ti ha ancora assegnato cattedre. Contatta la segreteria.

## 4. Registro firme

> **Pagina:** `/registro/firme` (la apri dal "Contesto lezioni" o dal menu)

È il **registro di classe** vero e proprio: qui firmi le ore di lezione, vedi presenze/assenze e accedi a voti, note, assenze.

### Layout

- In alto: **classe**, **materia**, contatori **avvisi** e **circolari**
- **Toolbar** con: bottoni Assenze / Voti / Note, navigazione Precedente/Successivo, vista **Giorno** o **Mese**
- **Vista Giornaliera (G)**: riepilogo Assenti/Entrate/Uscite/Fuori classe e l'elenco delle ore di quel giorno
- **Vista Mensile (M)**: una card per ogni giorno del mese, festivi inclusi (in rosso/grigio)

### Aggiungere una firma

1. Trova l'ora in cui hai lezione (es. **2ª ora 09:00-10:00**)
2. Click **Aggiungi**
3. Compila:
   - **Argomento** della lezione (cosa hai spiegato)
   - **Attività** (lavoro svolto in classe, esercizi, verifica orale...)
   - **Ora fine** (se la lezione finisce prima dell'orario standard)
   - **Modulo formativo** (opzionale, per moduli PCTO/interdisciplinari)
4. Click **Salva**

### Modificare una firma

Click **Modifica** sull'ora già firmata. Stesso form di creazione, dati precompilati.

### Eliminare una firma

Click **Elimina** → conferma. **Attenzione**: se la firma è collegata a voti, note o lezione condivisa con altri docenti, il sistema avvisa e potrebbe bloccare l'operazione.

### Compresenza

Se due docenti devono firmare la stessa ora (es. curricolare + ITP, oppure curricolare + sostegno):
1. Il primo docente firma normalmente
2. Il secondo apre la stessa ora e clicca **Aggiungi**
3. Il sistema riconosce la compresenza e aggiunge la seconda firma senza duplicare la lezione

### Sostituzione

In modalità "Sostituzione" (vedi sez. 3), puoi creare una lezione anche su una classe in cui non hai cattedra. Il sistema chiederà eventualmente la **materia** e il **tipo di sostituzione**.

## 5. Registro voti

> **Pagina:** `/registro/voti` (URL diretto o dal Registro firme → bottone "Voti")

È il **quadro valutazioni** del periodo (trimestre/quadrimestre). Mostra una tabella con tutti i tuoi alunni in righe e i voti per tipo (Scritti / Orali / Pratici) in colonne.

### Inserire un voto

1. Click sulla cella vuota dell'alunno e tipo di voto
2. Compila il dialog:
   - **Tipo**: Scritto (S) / Orale (O) / Pratico (P)
   - **Voto** (numerico) o **Giudizio** (testuale)
   - **Data** della valutazione
   - **Argomento** (es. "Verifica capitolo 3")
   - **Visibile**: se spunto, il voto è subito visibile a famiglia e alunno
   - **Media**: se spunto, il voto entra nella media aritmetica
3. Click **Salva**

### Modificare o eliminare

Click sul voto esistente → si apre il dialog. Puoi cambiarlo o usare **Elimina** per rimuoverlo.

### Cambio periodo

In alto puoi cambiare il **periodo** visualizzato (es. dal Primo al Secondo Quadrimestre). I voti restano associati al periodo in cui ricade la data della valutazione.

### Voti di sostegno

Se sei docente di sostegno, lavori sul tuo alunno specifico e i voti che inserisci sono coerenti con la cattedra del titolare curricolare.

## 6. Registro assenze

> **Pagina:** `/registro/assenze` (dal Registro firme → bottone "Assenze")

Per ogni giornata mostra:
- **Assenti**: studenti non presenti
- **Entrate** in ritardo (con orario)
- **Uscite** anticipate (con orario)
- **Fuori classe**: studenti temporaneamente fuori

**Operazioni rapide:**
- Marcare un alunno come assente / presente
- Inserire un'entrata in ritardo (con orario e giustificazione opzionale)
- Inserire un'uscita anticipata
- Giustificare un'assenza precedente (se autorizzato dal coordinatore o da regole d'istituto)

**Le assenze le mette il docente della prima ora** in cui l'alunno arriva (o non arriva). Successivi docenti vedono lo stato già impostato e non lo modificano se non per casi particolari.

## 7. Registro note

> **Pagina:** `/registro/note` (dal Registro firme → bottone "Note")

Due tipi di voci:

### Note disciplinari

Sanzioni formali (Codice della convivenza). Si associano a uno o più alunni. Hanno **rilevanza disciplinare**: vengono notificate alle famiglie e contribuiscono al voto di condotta.

### Annotazioni

Comunicazioni interne più leggere (es. "consiglio orientativo", "richiama in classe"). Restano nel registro ma non sono atti formali.

### Inserire una nota

1. Click **Nuova nota** (o **Nuova annotazione**)
2. Scegli **alunno/i** interessati
3. Inserisci **testo** della motivazione
4. Click **Salva**

### Annullare una nota

Solo l'autore (o il coordinatore con motivo) può **annullare** una nota già inserita. La nota resta in storico ma non ha più effetti disciplinari.

## 8. Agenda

> **Pagina:** `/agenda` (URL diretto, o dalla card "Calendario" della dashboard)

Calendario **personale** con:
- **Verifiche programmate** (quelle che hai inserito tu o che riguardano le tue cattedre)
- **Compiti** assegnati
- **Colloqui** con genitori prenotati

Vista mensile, con icone colorate sui giorni con eventi. Click su un giorno → dettaglio degli eventi di quella data.

### Programmare una verifica

1. Click sul giorno desiderato → **Aggiungi verifica**
2. Compila: **classe**, **materia**, **argomento**, **ora**
3. Click **Salva**

La verifica appare automaticamente nelle agende degli alunni interessati e dei loro genitori.

## 9. Avvisi e circolari

### Avvisi

> **Pagina:** `Avvisi` (`/avvisi`)

Comunicazioni interne dell'istituto rivolte a docenti, classi specifiche o gruppi (es. "Riunione dipartimento", "Sospensione lezioni per assemblea").

Nuovo avviso pendente: appare un **counter** in alto su `/registro/firme`. Click su `/avvisi` → **Lista** → **Leggi** sull'avviso.

### Circolari

> **Pagina:** `Circolari` (`/circolari`)

Documenti formali dell'istituto (delibere, comunicazioni del Dirigente). Si **firmano per presa visione** quando lette.

Le circolari **non lette** appaiono evidenziate. Click → leggi → click **Conferma presa visione**.

## 10. Colloqui

> **Pagina:** `Colloqui` (`/colloqui`)

Gestione dei **colloqui mattutini** (settimanali, su prenotazione) e dei **colloqui generali pomeridiani** (periodici, su appuntamento).

### Definire i colloqui mattutini

1. Click **Nuovo colloquio**
2. Compila: **giorno della settimana**, **ora**, **frequenza**, **durata appuntamento** (default 10 min), **numero massimo prenotazioni**
3. Click **Salva**

Da quel momento, i genitori della classe vedono lo slot disponibile sui loro account e possono prenotare.

### Visualizzare le prenotazioni

In tabella vedi tutti i prossimi colloqui prenotati con **alunno**, **genitore**, **orario**, **stato**. Puoi:
- Confermare una prenotazione
- Spostarla
- Annullarla con motivazione

### Colloqui generali

Configurati a livello d'istituto. Tu compari nell'elenco dei docenti disponibili. I genitori prenotano lo slot.

## 11. Documenti didattici

> **Pagina:** `Documenti` (`/documenti`)

Archivio dei tuoi documenti di pertinenza:
- **Programmazione didattica** della tua materia
- **PEI / PDP** (per Sostegno e BES)
- **Verbali consigli di classe** (se sei segretario)
- **Documenti del 15 maggio** (classi quinte)
- **Documenti scrutini**

Ogni documento ha:
- **Stato**: bozza / pubblicato
- **Data scadenza**
- **Allegato** (PDF caricato)

### Caricare un documento

1. Click **Aggiungi documento**
2. Scegli **tipo** (es. Programmazione, PEI, ...)
3. Carica il **file PDF**
4. Click **Pubblica** (o **Salva come bozza**)

### Documenti BES

Se sei docente di sostegno o referente BES, vedi anche i PEI/PDP degli alunni di tua competenza. Le **scadenze** sono evidenziate.

## 12. Pagelle

> **Pagina:** `Pagelle` (`/pagelle`)

Visualizzazione delle pagelle (intermedio, finale) delle classi in cui hai cattedra. Sola visualizzazione: **non puoi modificare le valutazioni dello scrutinio** dopo la chiusura.

Click su una pagella → vedi il dettaglio per alunno con voti per materia, condotta, assenze, esito.

## 13. Profilo personale

> **Pagina:** `Profilo` (`/profilo`, accessibile dal menu utente in basso a sinistra)

Da qui puoi:
- **Cambiare la password** (consigliato ogni 3-6 mesi)
- Aggiornare **email** e **numeri di telefono**
- Configurare le **notifiche** (canali e frequenza)
- Caricare la **foto** (per riconoscimento nel sistema)

Le altre informazioni anagrafiche (nome, codice fiscale, ecc.) sono modificabili solo dalla segreteria.

## 14. FAQ ed errori comuni

| Sintomo | Causa | Cosa fare |
|---|---|---|
| Login: **"Utente sconosciuto"** | Hai inserito l'email invece dello username | Usa lo username (es. `rossi.m`) |
| Login: **"Credenziali non valide"** | Password sbagliata | Click su "Hai dimenticato la password?" |
| **Cattedre attive: 0** in Contesto lezioni | Cattedre non assegnate | Contatta la segreteria |
| Registro firme **vuoto** anche in giorni di lezione | Orario settimanale non caricato | Contatta amministratore |
| **"Nessuna lezione disponibile per questa data"** | È un festivo, oppure orario incompleto | Verifica con amministratore |
| **Errore 500** improvviso | Problema temporaneo del server | Ricarica la pagina; se persiste, segnala |
| Voto inserito ma **non visibile** alla famiglia | Hai tolto la spunta "Visibile" | Modifica il voto e riattiva la spunta |
| Mi sono trovato **automaticamente disconnesso** | La sessione scade dopo 8 ore di inattività | Rifai il login, è normale |
| Voglio **annullare una nota** ma non posso | Solo l'autore o il coordinatore può | Chiedi al coordinatore |

## 15. Appendici

### Appendice A — Docente di sostegno

Lavori sul tuo alunno specifico assegnato. Le tue cattedre hanno `tipo` differente (es. `S` per sostegno) e ti permettono di:

- Firmare in compresenza con il curricolare
- Inserire **voti specifici** sull'alunno seguito
- Vedere e gestire il **PEI** (Piano Educativo Individualizzato)

### Appendice B — Coordinatore di classe

Se sei coordinatore, hai funzioni aggiuntive sul **Consiglio di classe** che presiedi. Vedi il [Manuale Coordinatore](manuale_coordinatore.md).

In sintesi, da `/coordinatore`:
- Visione completa di **assenze**, **note**, **voti** della classe
- **Convocazione** e gestione dei consigli straordinari
- **Annullamento** note disciplinari
- Comunicazioni dirette alle famiglie

### Appendice C — Segretario di classe

Quando sei segretario, sei responsabile della **redazione del verbale** dei consigli di classe. Da `/coordinatore` → **Verbali** carichi i verbali firmati.

### Appendice D — Responsabile BES di sede

Se hai questo incarico, oltre al manuale Docente vedi anche i PEI/PDP di tutti gli alunni BES della sede di tua competenza. La pagina di riferimento è `/documenti` con filtri estesi.

### Appendice E — RSPP

Il Responsabile del Servizio Prevenzione e Protezione vede e firma le **comunicazioni di sicurezza** dell'istituto. Funzione di sola visualizzazione documentale, integrata in `/documenti`.

---

## Riferimenti

- [Indice manuali](README.md)
- [Manuale Coordinatore](manuale_coordinatore.md)
- Procedure tecniche: vedi `Docs/procedura_*.md` per chi gestisce calendario, cattedre, ecc.

## Supporto

- **Segreteria** — per anagrafica, cattedre, password
- **Amministratore di sistema** — per malfunzionamenti tecnici

---

*Ultimo aggiornamento: 2026-05-04*
