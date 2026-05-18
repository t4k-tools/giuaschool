# Manuale Staff (Collaboratori del Dirigente)

## Per chi è questo manuale

Questo manuale è per i **docenti che fanno parte dello Staff di Dirigenza**: vicepresidi, responsabili di sede, responsabili dipartimenti, collaboratori del Dirigente con incarichi gestionali (`ROLE_STAFF`).

Lo Staff conserva tutte le funzioni del docente (firme, voti, agenda, ecc.) e in più ha:

- **Visione ampliata** sulla scuola (più classi, più sedi)
- Accesso ad alcuni **dati amministrativi** (statistiche, richieste pendenti)
- **Capacità di delega** dal Dirigente

Per le **funzioni docente standard** vedi [Manuale Docente](manuale_docente.md). Qui sono descritte solo le aggiunte.

**Prerequisiti:**
- Account docente con `ROLE_STAFF`
- Eventuale assegnazione di una **sede di competenza** se sei responsabile di sede

## Indice

1. [Dashboard staff](#1-dashboard-staff)
2. [Visione ampliata](#2-visione-ampliata)
3. [Gestione richieste](#3-gestione-richieste)
4. [Comunicazioni d'istituto](#4-comunicazioni)
5. [Statistiche e report](#5-statistiche)
6. [Delega per scrutini](#6-delega-scrutini)
7. [Segreteria](#7-segreteria)
8. [FAQ](#8-faq)

---

## 1. Dashboard staff

In `/dashboard`, oltre alle card standard del docente, vedi:
- Voci di menu **Scuola** (in lettura: classi, materie, festività, orario)
- Eventuale card "Gestione utenti" se sei delegato (su autorizzazione admin/dirigente)

## 2. Visione ampliata

### 2.1 Classi e docenti

Da `Scuola → Classi` (`/scuola/classi`) e `Docenti → Staff` (`/docenti/staff`) hai accesso a tutte le classi e ai docenti dell'istituto, con statistiche per classe.

### 2.2 Filtro per sede

Se sei **responsabile di una sede**, le pagine staff filtrano automaticamente sui dati della tua sede di competenza. Per le sedi diverse vedi solo informazioni di base.

### 2.3 Scheda alunno completa

Da `/alunni` puoi cercare qualsiasi alunno e aprirne la **scheda completa** (anagrafica, classe, situazione, presenze, voti, note) — analoga a quella del coordinatore ma per qualsiasi alunno della tua sede.

## 3. Gestione richieste

> **Pagina:** `Richieste → Gestione richieste` (`/richieste/gestione`)

Lo Staff gestisce le **richieste operative** delegate dal Dirigente:

- **Giustificazioni** assenze speciali
- **Autorizzazioni** uscite anticipate / entrate in ritardo programmate
- **Certificati** per gli alunni
- **Richieste di colloquio** straordinarie

Per ogni richiesta:
1. Lettura del testo + allegato eventuale
2. **Approva** / **Rifiuta** con motivazione
3. La risposta viene notificata al richiedente

> **Tip**: imposta in `Profilo → Notifiche` un alert per richieste pendenti, così non ti accumulano.

## 4. Comunicazioni d'istituto

### 4.1 Avvisi

Lo Staff può creare **avvisi a livello di sede** o **a tutto l'istituto** (se delegato).

`/avvisi` → **Nuovo avviso**:
- Destinatari: classi, docenti, ATA, genitori, alunni di una sede o di tutto l'istituto
- Tipi: ordinario, urgente, di servizio
- Allegato PDF se necessario

### 4.2 Circolari

Le circolari ufficiali sono solitamente firmate dal Dirigente. Lo Staff può:
- **Preparare bozze** che il Dirigente approva e firma
- **Pubblicare** circolari delegate (se autorizzato)

## 5. Statistiche e report

### 5.1 Dashboard staff

Pagina `Docenti → Staff` (`/docenti/staff`) con elenco dei membri dello Staff e contatori operativi.

### 5.2 Note disciplinari aggregate

Riepilogo delle note disciplinari per classe / per gravità. Utile per individuare situazioni problematiche e proporre interventi.

### 5.3 Frequenza alunni

Lista degli alunni con **frequenza irregolare** (oltre soglia di assenze) — utile per attivare comunicazioni alle famiglie.

## 6. Delega scrutini

> **Pagina:** `Scuola → Scrutini` (`/scuola/scrutini`)

Quando il Dirigente ti delega come **presidente di scrutinio** per una specifica classe:
- Ricevi notifica
- Hai gli stessi diritti del Dirigente per quella classe e quella sessione (vedi [Manuale Dirigente § 5](manuale_dirigente.md#5-scrutini))
- Firmi il verbale come **presidente delegato**

## 7. Segreteria

> **Pagine:** `Segreteria → Assenze`, `Segreteria → Genitori`, `Segreteria → Scrutini`

Funzioni di supporto a uso della segreteria didattica:

- **Inserimento massivo assenze** quando le giustificazioni arrivano in segreteria in formato cartaceo
- **Gestione genitori** (anagrafica, codici, password reset famiglie)
- **Esportazioni scrutini** per pratiche esterne (uffici scolastici, esami)

L'accesso a queste pagine è limitato allo Staff con permessi specifici. Se non vedi le voci, contatta l'amministratore.

## 8. FAQ

| Sintomo | Causa | Cosa fare |
|---|---|---|
| Non vedo `Richieste → Gestione richieste` | Non hai delega del Dirigente | Chiedi al Dirigente di abilitarti |
| Vedo solo classi della mia sede | Filtro automatico per sede di competenza | Normale; per altre sedi serve permesso aggiuntivo |
| Mando un avviso e non arriva | Worker email/notifiche fermo | Segnala all'amministratore |
| Non riesco a modificare anagrafica utenti | Permessi `ROLE_STAFF` insufficienti per scrittura utenti | Per modifiche anagrafica serve admin o dirigente |
| Vorrei delegare temporaneamente un altro Staff | Funzione delega non auto-gestita | Comunicalo al Dirigente |

## Riferimenti

- [Manuale Docente](manuale_docente.md)
- [Manuale Dirigente](manuale_dirigente.md)
- [Manuale Coordinatore](manuale_coordinatore.md)
- [Indice manuali](README.md)

---

*Ultimo aggiornamento: 2026-05-04*
