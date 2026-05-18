# Manuale Dirigente Scolastico

## Per chi è questo manuale

Questo manuale è per il **Dirigente Scolastico** dell'istituto (ruolo `ROLE_PRESIDE`). Il dirigente ha:

- Pieno accesso ai dati della scuola
- Funzioni decisionali (apertura scrutini, firma documenti, autorizzazioni)
- Le stesse capacità di scrittura sull'anagrafica utenti dell'amministratore
- La funzione di **sovrintendere** al funzionamento didattico complessivo

Per il **funzionamento tecnico del sistema** fare riferimento al [Manuale Amministratore](manuale_amministratore.md). Questo manuale si concentra sulle funzioni *dirigenziali*.

**Prerequisiti:**
- Account con `ROLE_PRESIDE`
- Accesso completato (vedi [Manuale Docente § 1](manuale_docente.md#1-accesso-al-registro))

## Indice

1. [Dashboard dirigente](#1-dashboard-dirigente)
2. [Visione d'insieme dell'istituto](#2-visione-distituto)
3. [Configurazione del proprio profilo dirigente](#3-profilo-dirigente)
4. [Gestione utenti](#4-gestione-utenti)
5. [Scrutini](#5-scrutini)
6. [Comunicazioni e circolari](#6-comunicazioni)
7. [Documenti dell'istituto](#7-documenti-distituto)
8. [Osservazioni](#8-osservazioni)
9. [Richieste e autorizzazioni](#9-richieste)
10. [FAQ](#10-faq)

---

## 1. Dashboard dirigente

Sulla `/dashboard` vedi le card di accesso rapido (Utenti, Registro Classe, Calendario) e dal menu laterale tutte le sezioni del registro.

A differenza dell'amministratore tecnico, il dirigente ha accesso **dirigenziale** (firma, decisione, sovrintendenza). Le voci `Sistema` (banner, manutenzione, aggiornamenti) restano riservate all'amministratore.

## 2. Visione d'istituto

### 2.1 Statistiche generali

> **Pagina:** `Scuola → Dirigente` (`/scuola/dirigente`)

Pagina dedicata al dirigente con:
- **Numero classi** per sede e per anno
- **Personale** docente / ATA / supplenti
- **Iscritti**: alunni totali, per classe, per anno
- **Statistiche** assenze e note disciplinari aggregate
- **Anomalie** segnalate dal sistema (cattedre incomplete, classi senza coordinatore, ecc.)

### 2.2 Esplorazione delle classi

Da `Scuola → Classi` (`/scuola/classi`) hai accesso alle schede classe con riepilogo: composizione, coordinatore, segretario, situazione voti aggregati, note, comunicazioni alla famiglia.

## 3. Profilo dirigente

> **Pagina:** `Profilo` (dal menu utente in basso a sinistra)

Oltre ai dati standard (vedi [Manuale Docente § 13](manuale_docente.md#13-profilo-personale)) il dirigente ha:

- **Firma digitale** (immagine PNG / PDF) usata per intestazioni e documenti ufficiali
- **Email PEC** istituzionale
- **Numeri di reperibilità** (per emergenze)

Il dato di firma è impostato in `Sistema → Parametri → /CONFIG/ISTITUTO/firma_preside`.

## 4. Gestione utenti

Hai gli stessi diritti dell'amministratore sulle scritture utenti. Vedi [Manuale Amministratore § 6](manuale_amministratore.md#6-gestione-utenti).

In particolare puoi:
- **Abilitare/disabilitare** account docenti, alunni, ATA
- **Resettare password** (singola o massiva)
- **Modificare anagrafica** in casi eccezionali

> **Importante**: ogni operazione sui dati personali è registrata in log con timestamp e tuo username. Usalo solo se necessario.

## 5. Scrutini

> **Pagina:** `Scuola → Scrutini` (`/scuola/scrutini`)

Funzioni dirigenziali:

### 5.1 Apertura periodo di scrutinio

Definisci la **finestra temporale** di scrutinio (es. "Scrutini I quadrimestre dal 27/01 al 03/02"). Solo durante questa finestra i docenti possono inserire/modificare proposte di voto e tu/coordinatori potete chiudere lo scrutinio.

### 5.2 Convocazione scrutini

Per ogni classe imposta:
- **Data** e **ora** dello scrutinio
- **Sede** e **modalità** (presenza/online)
- **Presidente** (te o un delegato fra Staff/Coordinatore)
- **Segretario** (di norma il segretario di classe)

Le convocazioni vengono inviate ai docenti del consiglio.

### 5.3 Conduzione scrutinio

In sede di scrutinio sotto la tua presidenza (o di un delegato):
- Vista **tabellone** completo della classe
- **Proposte di voto** dei docenti già presenti
- Discussione e **modifica voti** (con tracciamento)
- **Decisioni** (ammesso, sospeso, non ammesso, esiti speciali)
- **Compilazione condotta** e note in tabellone
- **Chiusura scrutinio** → apertura del verbale

### 5.4 Stampe ufficiali

- **Tabellone** (PDF firmato dal Dirigente)
- **Verbale** (compilato dal segretario, firmato da tutto il consiglio)
- **Pagelle** individuali

### 5.5 Scrutini di rinvio

Per scrutini di **integrazione** (es. dopo sospensione del giudizio a giugno → scrutinio di settembre) si apre una finestra distinta di scrutinio finale.

## 6. Comunicazioni

### 6.1 Circolari

> **Pagina:** `Circolari` (`/circolari`)

Il dirigente è in genere il principale autore di **circolari ufficiali**. Da `/circolari` → **Nuova circolare**:
- Imposta **destinatari** (docenti / ATA / genitori / alunni / classi specifiche / sedi)
- Inserisci **oggetto**, **numero protocollo**, **testo**
- Allega **PDF firmato** se necessario
- **Pubblica**

I destinatari devono confermare la **presa visione** che resta tracciata.

### 6.2 Avvisi

`/avvisi` per comunicazioni più rapide e meno formali.

### 6.3 Comunicazioni individuali

Per casi particolari, puoi inviare comunicazioni dirette a singoli utenti (es. richiamo formale a un docente, comunicazione a una famiglia).

## 7. Documenti d'istituto

> **Pagina:** `Documenti` (`/documenti`)

Hai accesso a tutti i documenti caricati in qualunque area:
- **PEI / PDP** di tutti gli alunni
- **Programmazioni** dei docenti
- **Verbali** dei consigli
- **Documenti del 15 maggio** delle classi quinte
- **Documenti scrutini**

Filtri per: classe, materia, tipo, anno scolastico, stato.

### 7.1 Firma documenti

Documenti che ti riguardano (firme di approvazione, autorizzazioni) hanno un'etichetta **"In attesa di firma"**. Click → leggi → **Firma**.

## 8. Osservazioni

Funzione di **osservazione di lezione** (a fini formativi/ispettivi):

- Visualizzazione **registro firme** di una classe in qualsiasi giorno
- **Annotazioni** riservate sulla lezione (visibili solo a te e all'eventuale ispettore)
- Esportabili per la valutazione del personale

Da `/registro/firme?classe=X&data=Y` con il tuo profilo dirigente.

## 9. Richieste

> **Pagina:** `Richieste → Gestione richieste` (`/richieste/gestione`)

Le richieste **rivolte al Dirigente** (es. autorizzazioni, deroghe, segnalazioni) arrivano qui. Per ognuna:
- Lettura del testo + allegato
- **Approvazione** / **Rifiuto** con motivazione
- Eventuale **delega** a Staff o Coordinatore

Le richieste **respinte / approvate** sono notificate al richiedente (alunno, genitore, docente).

## 10. FAQ

| Sintomo | Causa | Cosa fare |
|---|---|---|
| Non vedo opzione "Apri scrutinio" | Periodo non ancora attivo o già chiuso | Configura in `Scuola → Scrutini` la finestra |
| Mi serve una pagella di un anno passato | Archivio | Da `/pagelle` filtra per anno scolastico |
| Voglio modificare un voto già scrutinato | Vincolo | Per modifica formale serve verbale di rettifica + scrutinio integrativo |
| Non posso modificare la firma in PDF | È una immagine in `Configurazione` | Aggiorna il file in `/sistema/parametri` (chiedi all'amministratore) |
| Email circolare a 800 destinatari non parte | Coda Messenger sovraccarica | Verifica con amministratore: il worker deve essere attivo |

## Riferimenti

- [Manuale Amministratore](manuale_amministratore.md) — funzioni tecniche di sistema
- [Manuale Coordinatore](manuale_coordinatore.md) — funzioni del coordinatore di classe
- [Manuale Docente](manuale_docente.md) — base operativa
- [Indice manuali](README.md)

---

*Ultimo aggiornamento: 2026-05-04*
