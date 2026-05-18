# Procedura: Caricamento calendario scolastico

Procedura per configurare il **calendario delle lezioni e delle festività** nel registro elettronico. Senza questa configurazione, i docenti aprendo il **Registro firme / lezioni** vedono il calendario vuoto perché non c'è alcuna ora di lezione né alcun giorno festivo.

## Quando applicare la procedura

- **Nuova installazione** dell'istituto.
- **Inizio anno scolastico**: caricamento dell'orario definitivo dopo la settimana provvisoria di settembre.
- **DB ripristinato da backup** in cui la configurazione calendario è stata persa.

## Stato iniziale di riferimento

Verificare che il DB sia in uno stato simile a questo (situazione "calendario vuoto"):

```bash
docker exec registro_db mysql -uroot -proot giuaschool -e \
  "SELECT 'orario' AS t, COUNT(*) FROM gs_orario;
   SELECT 'scansione_oraria' AS t, COUNT(*) FROM gs_scansione_oraria;
   SELECT 'festivita' AS t, COUNT(*) FROM gs_festivita;
   SELECT 'orario_docente' AS t, COUNT(*) FROM gs_orario_docente;"
```

Se le scansioni e le festività sono `0`, o se l'unico orario presente è scaduto (controlla `inizio`/`fine`), va eseguita la procedura completa.

## Prerequisiti

- Account **Amministratore** o **Dirigente**.
- Anagrafica già caricata: docenti, classi, materie, cattedre. Se le cattedre mancano vedi `Docs/procedura_assegnazione_cattedre.md`.
- Sedi configurate (`Scuola → Sedi`).
- Configurazione anno scolastico in `Scuola → Configurazione`: `anno_inizio`, `anno_fine`, `periodo1_fine`, `periodo2_fine` valorizzati.
- PDF dell'orario settimanale per consultazione (per inserimento manuale) o file CSV se si usa l'import legacy.

## Ordine dei passi

L'ordine è vincolante: ogni passo dipende dal precedente.

```
1. Festività  →  2. Orario  →  3. Scansione oraria  →  4. Lezioni orario (cattedra → slot)
```

---

## 1. Festività

Le festività sono le date in cui non si fa lezione (Natale, Pasqua, festivi nazionali, ponti deliberati dall'istituto).

1. Login come amministratore.
2. Menu **Scuola → Festività** (URL: `/scuola/festivita`).
3. Click **"Aggiungi"** e inserire una alla volta:
   - **Tutti i Santi** — 1 novembre
   - **Immacolata** — 8 dicembre
   - **Vacanze di Natale** — dal 23 dicembre al 6 gennaio (inserire ogni giorno o range come da statuto istituto)
   - **Vacanze di Pasqua** — dipende dall'anno (Giovedì Santo → Martedì dopo Pasqua, tipicamente)
   - **Liberazione** — 25 aprile
   - **Festa del lavoro** — 1 maggio
   - **Festa della Repubblica** — 2 giugno
   - **Patrono / festa locale** — variabile per sede
   - **Ponti deliberati** dal Consiglio d'Istituto
4. Per ogni festività compilare:
   - **Data** (formato `YYYY-MM-DD`)
   - **Descrizione** (es. "Vacanze di Natale")
   - **Tipo**: `Festivo` (codice `F`) per le festività vere; `Assemblea`/`Sciopero` se la giornata è registrabile ma sospesa.
   - **Sede**: lasciare vuoto se vale per tutte le sedi, altrimenti scegliere la sede specifica.
5. Salvare.

## 2. Orario

L'orario è il contenitore con il periodo di validità (date inizio/fine) per cui valgono le scansioni e le lezioni.

1. Menu **Scuola → Orario** (URL: `/scuola/orario`).
2. Click **"Aggiungi"** in alto a destra.
3. Compila:
   - **Nome**: es. `Orario definitivo 2025/26` (o `Orario provvisorio 2025/26` per la prima settimana).
   - **Sede**: scegliere la sede (un orario è per una sede, ripetere per ogni sede dell'istituto).
   - **Inizio**: `2025-09-15` (o la prima data utile).
   - **Fine**: `2026-06-10` (deve coprire fino a fine anno; allineato a `anno_fine`).
4. Salva.

**Nota**: se esiste un "Orario provvisorio" delle prime settimane di scuola e ora va sostituito col definitivo, **lasciarlo per il periodo storico** e creare un nuovo orario per il periodo successivo (eviti di sporcare le firme già messe). I periodi non si possono sovrapporre per la stessa sede.

## 3. Scansione oraria

Definisce gli slot orari giornalieri (1ª ora, 2ª ora, ecc.) per ogni giorno della settimana.

1. Dalla pagina `/scuola/orario`, sulla riga dell'orario appena creato, click sull'icona **orologio** (Scansioni).
2. Si apre la griglia settimanale Lun-Sab × 6 ore.
3. Per ogni giorno della settimana valido (es. Lun-Sab senza domenica):
   - Inserire le ore con **inizio**, **fine**, **durata** (in minuti).
   - Esempio standard 5 ore (mattina):
     - 1ª 8:00-9:00 (60 min)
     - 2ª 9:00-10:00 (60 min)
     - 3ª 10:00-11:00 (60 min)
     - 4ª 11:00-12:00 (60 min)
     - 5ª 12:00-13:00 (60 min)
   - Esempio con intervallo: 3ª può essere spezzata (10:00-10:55) e poi pausa.
4. Salva. La PUT su `/api/orario/{id}/scansioni` sostituisce tutte le scansioni esistenti per quell'orario.

**Importante**: le scansioni vanno inserite per **ogni** giorno in cui si fa lezione. Se la scuola fa 5 giorni (Lun-Ven) **non** inserire scansioni per il sabato; il calendario lo tratterà come giorno senza lezioni (≠ festivo).

## 4. Lezioni orario (cattedra → slot)

Assegnare ogni cattedra del docente al suo slot settimanale (Mar 9:00-10:00 = Italiano in 1ª A con prof. X, ecc.).

1. Dalla pagina `/scuola/orario`, click sull'icona **griglia** (Componi orario).
2. Selezionare una **classe** dal menu in alto.
3. Si visualizza una griglia giorno × ora con celle vuote.
4. Click su una cella vuota: si apre un popover con la lista delle cattedre disponibili per quella classe.
5. Selezionare la cattedra (docente + materia) per quello slot. La lezione viene salvata via POST a `/api/orario/{orarioId}/lezioni`.
6. Per rimuovere: click sulla cella occupata → icona X.
7. Ripetere per **tutte** le classi.

**Suggerimento**: tieni aperto il PDF dell'orario settimanale e ricopia cella per cella. Per istituti grandi (>20 classi) considera l'import bulk via legacy (vedi sezione "Import bulk").

## Verifica risultato

Dopo i 4 passi, login come un docente che ha cattedre nell'orario (es. `asciole.l`) e:

1. Menu **Lezioni → Contesto lezioni**: deve apparire la lista delle classi/cattedre del docente.
2. Selezionare una cattedra → **Apri registro firme**.
3. La pagina deve mostrare:
   - **Data odierna** in vista giornaliera.
   - Le **ore di lezione** della scansione oraria (es. 5 righe da 8:00 a 13:00).
   - **Materia** assegnata al docente in ognuna delle ore in cui ha cattedra in quella classe.
4. Click su **"Mese"** in alto a destra: deve apparire il calendario mensile con:
   - Giorni festivi colorati/segnati.
   - Domeniche (e sabati se non lavorativi) come non lezione.
   - Giorni di lezione cliccabili.

Se il calendario è ancora vuoto:
- Verificare che la **data corrente cada nel periodo dell'orario** (`inizio` ≤ oggi ≤ `fine`).
- Verificare le **scansioni**: senza scansioni per quel giorno della settimana, la giornata appare priva di ore.
- Verificare che la **cattedra** del docente sia stata assegnata a un **slot** di quell'orario (passo 4): un docente con cattedra ma senza slot orari non vede lezioni.

## Errori comuni

| Sintomo | Causa | Rimedio |
|---|---|---|
| Calendario completamente vuoto | Nessun orario valido per la data corrente | Verifica `gs_orario.inizio/fine` copra oggi |
| Vedo le ore ma non le materie | Cattedre non assegnate agli slot | Passo 4 con la classe del docente |
| Festività non evidenziate | `gs_festivita` vuota o festività solo per altra sede | Inserisci festività o lascia il campo Sede vuoto |
| Sabato/Domenica tra i giorni di lezione | Scansione oraria configurata per quel giorno | Rimuovi le scansioni di Dom/Sab dal passo 3 |
| `Questa cattedra esiste già.` (409) | Tentativo di duplicare una lezione orario | La cella è già occupata, rimuovi prima |
| Orari sovrapposti per la stessa sede | Due orari con `inizio/fine` che si accavallano | Sposta `fine` di uno o `inizio` dell'altro |

## Import bulk (alternativa per istituti grandi)

Per evitare di compilare la griglia cella per cella quando ci sono molte classi:

- **Legacy**: vedi `Docs/Guida-caricamento-orario-1.pdf` per il caricamento da PDF/CSV via interfaccia legacy. È ancora la via più rapida per istituti con 30+ classi.
- **Refactor**: l'import bulk non è ancora migrato. È in backlog (ref. `Docs/FRONTEND_MIGRATION_BACKLOG.md` se previsto).

## Riferimenti tecnici

- **UI refactor**:
  - `refactor/src/app/(app)/scuola/festivita/page.tsx`
  - `refactor/src/app/(app)/scuola/orario/page.tsx` (orario + scansioni + compose lezioni)
- **API**:
  - `GET/POST /api/festivita`, `PUT/DELETE /api/festivita/{id}`
  - `GET/POST /api/orario`, `PUT/DELETE /api/orario/{id}`
  - `PUT /api/orario/{id}/scansioni` (sostituisce tutte le scansioni)
  - `GET/POST /api/orario/{orarioId}/lezioni`, `DELETE /api/orario/{orarioId}/lezioni/{id}`
- **Controller**: `src/src/Controller/Api/ScuolaApiController.php` (sezioni FESTIVITA, ORARIO, da riga 876)
- **Util consumer**: `src/src/Util/RegistroUtil.php`
  - `orarioInData()` legge `gs_scansione_oraria` per la data corrente
  - `listaFestivi()` legge `gs_festivita` filtrate per `tipo='F'` e sede
  - `tabellaFirmeVista()` orchestra il calendario giornaliero/mensile per docente
- **Tabelle**: `gs_orario`, `gs_scansione_oraria`, `gs_orario_docente`, `gs_festivita`, `gs_lezione`
