# Manuale Personale ATA

## Per chi è questo manuale

Questo manuale è per il **personale ATA** (Amministrativo, Tecnico, Ausiliario) dell'istituto: assistenti amministrativi, assistenti tecnici, collaboratori scolastici, DSGA (`ROLE_ATA`).

Il personale ATA usa il registro elettronico per:

- Ricevere **avvisi** e **circolari**
- Confermare **presa visione** di documenti ufficiali
- Gestire **richieste** di sua competenza (a seconda del ruolo)
- Comunicare con docenti e amministrazione

L'accesso del personale ATA è essenzialmente **in lettura** delle comunicazioni interne. Le funzioni di **gestione amministrativa** vera e propria (segreteria didattica) sono disponibili al personale di segreteria con permessi specifici (vedi sez. dedicata).

**Prerequisiti:**
- Account `ROLE_ATA` abilitato
- Credenziali ricevute dall'amministratore o dal Dirigente

## Indice

1. [Accesso al registro](#1-accesso)
2. [Dashboard ATA](#2-dashboard)
3. [Avvisi e circolari](#3-avvisi-circolari)
4. [Comunicazioni interne](#4-comunicazioni)
5. [Richieste](#5-richieste)
6. [Funzioni di segreteria didattica](#6-segreteria)
7. [Profilo personale](#7-profilo)
8. [FAQ](#8-faq)

---

## 1. Accesso

1. Apri https://registro.efor.it
2. **Username** e **password**
3. Click **Accedi**

Username in genere `cognome.iniziale_nome`.

**Primo accesso o reset:** ti viene chiesto di cambiare password.

**Password dimenticata:** click su "Hai dimenticato la password?" → email registrata → password temporanea.

## 2. Dashboard ATA

> **Pagina:** `/dashboard`

Vedi:
- Tuo nome, ruolo, riepilogo: **circolari da firmare**, **avvisi non letti**, **richieste pendenti** (se applicabili)
- Card di accesso rapido alle sezioni che ti riguardano

A differenza dei docenti **non vedi**: contesto lezioni, registro firme/voti/note.

## 3. Avvisi e circolari

### 3.1 Circolari

> **Pagina:** `Circolari` (`/circolari`)

Documenti ufficiali della scuola di pertinenza ATA o tutto il personale.

1. Le **non lette** sono evidenziate
2. Click → leggi il testo + eventuale allegato
3. **Conferma presa visione** quando richiesto

La presa visione è **tracciata** con data, ora, username. Equivale alla firma cartacea.

### 3.2 Avvisi

> **Pagina:** `Avvisi` (`/avvisi`)

Comunicazioni più rapide dell'istituto: turni, sostituzioni, riunioni informali, indicazioni operative.

## 4. Comunicazioni interne

Da `Avvisi` → **Nuovo avviso** (se autorizzato dall'amministratore):
- Avvisi di servizio rivolti a colleghi (es. "Riunione assistenti tecnici domani")
- Allegati (turni, modulistica)

Per **comunicazioni ufficiali** (circolari) il processo passa dal Dirigente o suo delegato.

## 5. Richieste

> **Pagina:** `Richieste` (`/richieste`) o `Richieste → Gestione` (`/richieste/gestione`)

A seconda del ruolo e dei permessi:

### 5.1 Inviare richieste

Come dipendente puoi inviare richieste (es. **richiesta ferie**, **permesso**, **congedo**) se l'istituto ha attivato il modulo HR sul registro.

### 5.2 Gestire richieste degli utenti

Se sei in **segreteria didattica** o **DSGA**, gestisci le richieste in arrivo dagli utenti (genitori, alunni, docenti):
- Lettura
- Approvazione / rifiuto con motivazione
- Eventuale **delega** ad altro personale

## 6. Funzioni di segreteria didattica

Per chi lavora in segreteria didattica (sottoinsieme del personale ATA con permessi estesi):

> **Pagine:** `Segreteria → Assenze`, `Segreteria → Genitori`, `Segreteria → Scrutini`

### 6.1 Assenze

`/segreteria/assenze` — inserimento assenze a partire da giustificazioni cartacee, riconciliazioni, correzioni.

### 6.2 Genitori

`/segreteria/genitori` — gestione anagrafica genitori (consente reset password famiglie, aggiornamento email, ecc.).

### 6.3 Scrutini

`/segreteria/scrutini` — esportazioni scrutini per pratiche esterne.

> Queste pagine sono visibili solo al personale ATA con permessi specifici. Se hai bisogno di accedervi e non le vedi, fai richiesta all'amministratore o al Dirigente.

## 7. Profilo personale

> **Pagina:** `Profilo` (dal menu in basso a sinistra)

- **Cambiare password**
- Aggiornare **email** e **numeri di telefono**
- Configurare **notifiche**

I dati anagrafici (nome, cognome, codice fiscale, mansione) sono modificabili solo dall'amministratore.

## 8. FAQ

| Sintomo | Causa | Cosa fare |
|---|---|---|
| **"Utente sconosciuto"** al login | Sto usando email invece di username | Usa lo username (es. `rossi.m`) |
| **Non vedo le pagine `/segreteria/*`** | Permessi specifici non assegnati | Chiedi all'amministratore se devi avere accesso |
| **Non vedo le circolari** che mi riguardano | Filtro destinatari errato all'origine | Segnalalo al Dirigente o all'amministratore |
| **Mi serve fare un avviso urgente** | Funzione "Nuovo avviso" non visibile | Contatta uno Staff o il Dirigente |
| **Sono di una sede e vedo tutto** | Filtro per sede non automatico se `sede_id` è NULL | Normale; se serve filtrare, contatta amministratore |

## Riferimenti

- [Manuale Amministratore](manuale_amministratore.md) — per chi gestisce il sistema
- [Indice manuali](README.md)

---

*Ultimo aggiornamento: 2026-05-04*
