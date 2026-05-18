# Manuale Coordinatore di classe

## Per chi è questo manuale

Questo manuale è per i **docenti con incarico di Coordinatore di classe**. È un'integrazione del [Manuale Docente](manuale_docente.md): tutto quello che fai come docente curricolare lo trovi lì. Qui sono descritte solo le **funzioni aggiuntive** legate al ruolo di coordinatore.

**Prerequisiti:**
- Sei già un docente regolarmente loggato
- L'amministratore ti ha assegnato come coordinatore di una o più classi (in `Docenti → Coordinatori`)

## Indice

1. [Cosa fa il coordinatore](#1-cosa-fa)
2. [La pagina coordinatore](#2-la-pagina-coordinatore)
3. [Visione d'insieme della classe](#3-visione-dinsieme)
4. [Gestione assenze](#4-gestione-assenze)
5. [Gestione note disciplinari](#5-gestione-note)
6. [Comunicazioni alla classe](#6-comunicazioni)
7. [Convocazione consigli straordinari](#7-consigli-straordinari)
8. [Documenti del consiglio di classe](#8-documenti)
9. [Scrutini](#9-scrutini)
10. [FAQ](#10-faq)

---

## 1. Cosa fa il coordinatore

Il coordinatore di classe ha responsabilità che vanno oltre la propria materia:

- **Vede tutta la classe**, non solo la sua cattedra
- **Coordina** il consiglio di classe (convocazione, ordine del giorno, conduzione)
- **Comunica** con le famiglie a nome del consiglio
- **Annulla** note disciplinari emesse da altri docenti se motivate
- **Giustifica** assenze in casi particolari
- **Sovrintende** ai documenti di valutazione (PEI/PDP, verbali)
- **Presiede** lo scrutinio (insieme al Dirigente o suo delegato)

## 2. La pagina coordinatore

> **Pagina:** `Coordinatore` (`/coordinatore`)

Voce di menu visibile solo se sei coordinatore di almeno una classe. Se ne coordini più di una, in alto trovi un selettore per scegliere quale visualizzare.

Layout: la pagina è organizzata in tab/sezioni dedicate alla classe selezionata.

## 3. Visione d'insieme della classe

Dalla pagina coordinatore vedi un **riepilogo** della classe:

- **Elenco alunni** con nome, data nascita, BES (sì/no), note
- **Statistiche** assenze, ritardi, uscite anticipate
- **Voti** medi per materia
- **Note disciplinari** dell'anno (chi, quando, motivazione)
- **Andamento** generale (trend voti, presenze)

Click su un alunno → **scheda personale** con tutti i suoi dati: presenze giornaliere, voti per materia, note ricevute, comunicazioni famiglia.

## 4. Gestione assenze

Oltre alle funzioni standard del [Registro Assenze](manuale_docente.md#6-registro-assenze):

### 4.1 Giustificare assenze pregresse

Se un alunno torna dopo giorni di assenza con giustificazione cartacea o digitale, da `/registro/assenze`:
1. Click sull'assenza
2. **Giustifica**
3. Inserisci data del giustificativo, motivazione, eventuale documento
4. **Salva**

L'assenza resta in elenco ma viene contrassegnata come **giustificata**.

### 4.2 Convertire assenza in entrata in ritardo

Se un alunno è arrivato in ritardo significativo e un altro docente l'ha segnato assente, puoi convertire l'assenza in **entrata in ritardo** specificando l'ora.

### 4.3 Statistiche assenze

Sulla scheda alunno, sezione **Assenze**:
- numero totale assenze nell'anno
- ore di lezione perse
- ritardi/uscite anticipate
- elenco cronologico

Utile per il consiglio di classe e per le comunicazioni alla famiglia su assenze ricorrenti.

## 5. Gestione note disciplinari

### 5.1 Vedere tutte le note della classe

Da `/coordinatore` o da `/registro/note` (con classe coordinata) vedi **tutte** le note disciplinari della classe, anche quelle emesse da altri docenti.

### 5.2 Annullare una nota

Solo il coordinatore (o l'autore) può annullare una nota già inserita.

1. Click sulla nota
2. **Annulla**
3. Inserisci la motivazione (es. "Chiarito con l'alunno", "Errore di persona")
4. **Conferma**

La nota resta in storico (per tracciabilità) ma è marcata come **annullata** e non ha più effetti disciplinari.

### 5.3 Sintesi note al CdC

In sede di scrutinio o consiglio di classe, dalla scheda alunno puoi esportare un **riepilogo note** ricevute durante l'anno.

## 6. Comunicazioni

> **Pagina:** `Avvisi` (`/avvisi`) — sezione "Avvisi destinati alla classe X" oppure "Crea avviso"

### 6.1 Avviso alla classe

1. `/avvisi` → **Nuovo avviso**
2. Imposta **destinatari** = la tua classe coordinata (genitori e/o alunni)
3. Compila **oggetto** e **testo**
4. Eventuale **allegato**
5. **Invia**

I genitori ricevono notifica via email/Telegram (se configurato).

### 6.2 Comunicazione individuale

Per scrivere a una **singola famiglia**, dalla scheda alunno → **Invia comunicazione**. Il messaggio resta tracciato nel registro famiglia.

## 7. Consigli straordinari

Per convocare un consiglio di classe straordinario:

1. `/coordinatore` → **Convoca consiglio**
2. Imposta **data**, **ora**, **luogo / link videoconferenza**
3. **Ordine del giorno**: testo libero (in genere "Andamento didattico-disciplinare", "Caso alunno X", ecc.)
4. **Destinatari**: docenti del consiglio + (opzionale) genitori rappresentanti + alunni rappresentanti
5. **Invia convocazione**

Tutti i destinatari ricevono email/notifica con link al verbale (vuoto, da compilare poi dal segretario).

## 8. Documenti del consiglio di classe

Da `/documenti` (filtrato sulla classe coordinata):

- **PEI / PDP** degli alunni con BES — visibili al coordinatore
- **Verbali** consigli di classe (caricati dal segretario)
- **Documento del 15 maggio** (per le quinte) — coordina la stesura
- **Programmazioni** disciplinari — controllo coordinato

Puoi richiedere ai docenti curricolari il caricamento dei documenti in scadenza tramite `Avvisi`.

## 9. Scrutini

> **Pagina:** `Scuola → Scrutini` (`/scuola/scrutini`)

Quando lo scrutinio della tua classe è aperto, dalla pagina scrutini accedi al **tabellone**:

- Inserisci **proposte di voto** della tua materia
- Verifichi che gli altri docenti abbiano inserito le proprie
- Compila **giudizio condotta** e **note** in tabellone
- In sede di scrutinio, sotto la presidenza del Dirigente o suo delegato, aggiorni **voti finali** (eventuali modifiche delle proposte)
- Inserisci **decisioni** (ammesso, sospeso, non ammesso, esiti speciali)
- Stampa **verbale** e **tabellone**

Il segretario carica il verbale firmato in `/documenti`.

## 10. FAQ

| Sintomo | Causa | Cosa fare |
|---|---|---|
| La voce **Coordinatore** non compare nel menu | Non sei stato assegnato come coordinatore | Chiedi all'amministratore (`Docenti → Coordinatori`) |
| Vedo solo una classe, ma ne coordino di più | Selettore in alto della pagina | Click sul selettore per cambiare |
| Non riesco ad annullare una nota di un altro docente | Manca permesso o nota troppo vecchia (>30 giorni) | Verifica con l'amministratore |
| Il consiglio straordinario non parte la convocazione | Email mittente non configurata | Contatta amministratore (`Sistema → Email`) |
| Non vedo i voti di altri docenti nello scrutinio | Lo scrutinio non è ancora aperto | Aspetta apertura scrutinio dal Dirigente |
| Ricevo molte email duplicate | Notifiche multi-canale attivate per stesso evento | Personalizza in `Profilo → Notifiche` |

## Riferimenti

- [Manuale Docente](manuale_docente.md) — base di tutte le funzioni docente
- [Indice manuali](README.md)

---

*Ultimo aggiornamento: 2026-05-04*
