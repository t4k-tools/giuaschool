# Issues Refactor Backlog

Ultimo aggiornamento: 2026-04-27

Questo documento contiene issue markdown pronte da copiare su GitHub o nel tracker che usate.

## E1 - Registro docente: sostituzioni

### Contesto

Il refactor gestisce gia il contesto lezioni e il registro firme, e il create in modalita sostituzione e' disponibile. Restano pero casi residui legati alla parita completa con i flussi condivisi.

### Obiettivo

Chiudere la parita del flusso sostituzione nel refactor, mantenendo coerente il comportamento tra create e i casi condivisi residui.

### API coinvolte

- `GET /api/lezioni/contesto`
- `GET /api/registro/lezioni/creazione`
- `POST /api/registro/lezioni`
- `PUT /api/registro/lezioni`

### Route/viste coinvolte

- `/lezioni`
- `/registro/firme`

### Sotto-task

- consolidare i casi legacy di sostituzione gia coperti dal create
- rifinire il raccordo con edit/delete condivisi
- mantenere allineati create context e UI sul contesto `classe`
- aggiungere o stabilizzare la validazione sui casi residui

### Test/validazione

- creazione lezione in sostituzione
- modifica lezione in sostituzione
- verifica permessi su data e classe

### Definition of done

Un docente puo creare e modificare una lezione in sostituzione dal refactor senza rimbalzo al legacy.

### Nota stato 2026-04-27

Il create in sostituzione e' gia disponibile nel refactor; questa issue ora copre soprattutto consolidamento e chiusura dei casi residui collegati a `E3`.

## E2 - Registro docente: compresenze e slot gia occupati

### Contesto

Quando uno slot contiene gia lezioni, il refactor ora copre i casi compatibili principali nel create, ma non ha ancora parita piena con tutti i casi avanzati e con `edit/delete` condivisi.

### Obiettivo

Completare la gestione di compresenze e slot gia occupati nel registro refactor fino alla parita utile col legacy.

### API coinvolte

- `GET /api/registro/lezioni/creazione`
- `POST /api/registro/lezioni`
- `PUT /api/registro/lezioni`
- `DELETE /api/registro/lezioni`

### Route/viste coinvolte

- `/registro/firme`

### Sotto-task

- censire i casi legacy di compresenza
- definire il modello di ownership delle firme
- supportare slot multipli lato service
- aggiornare la vista del registro per slot condivisi
- aggiungere test di conflitto
- chiudere i casi avanzati di trasformazione ancora residui

### Test/validazione

- slot con una lezione esistente
- slot con piu docenti
- trasformazione e cancellazione in casi condivisi

### Definition of done

I casi di compresenza e slot occupato sono gestiti nel refactor senza fallback al legacy.

### Nota stato 2026-04-27

Lo smoke test ha gia validato tre scenari reali sul create flow: slot vuoto, slot compatibile con riuso della lezione esistente, slot incompatibile correttamente rifiutato. Restano da chiudere i casi avanzati e il collegamento con `E3`.

## E3 - Registro docente: lezioni condivise

### Contesto

Edit e delete di lezioni condivise restano in parte legacy.

### Obiettivo

Consentire modifica e cancellazione di lezioni condivise nel refactor con regole chiare di ownership.

### API coinvolte

- `PUT /api/registro/lezioni`
- `DELETE /api/registro/lezioni`

### Route/viste coinvolte

- `/registro/firme`

### Sotto-task

- definire le regole su firma singola e lezione condivisa
- implementare la logica lato service
- aggiornare i messaggi UI
- aggiungere test multi-docente

### Test/validazione

- modifica di una firma condivisa
- delete firma singola
- delete ultima firma con rimozione lezione

### Definition of done

Le lezioni condivise possono essere gestite dal refactor con comportamento coerente e auditabile.

## E4 - Voti sostegno

### Contesto

Il refactor gestisce i voti curricolari ma blocca ancora il sostegno.

### Obiettivo

Abilitare consultazione e CRUD voti del sostegno nel refactor.

### API coinvolte

- `GET /api/voti/quadro`
- `POST /api/voti`
- `PUT /api/voti`
- `DELETE /api/voti`

### Route/viste coinvolte

- `/registro/voti`

### Sotto-task

- mappare il flusso legacy del sostegno
- estendere `VotiService`
- adattare UI e validazioni
- verificare medie e visibilita

### Test/validazione

- consultazione quadro sostegno
- inserimento voto sostegno
- modifica/cancellazione voto sostegno

### Definition of done

Un docente di sostegno puo gestire i voti dal refactor senza errore di non supporto.

## E5 - Comunicazioni: circolari

### Contesto

Le circolari restano oggi totalmente legacy.

### Obiettivo

Portare nel refactor elenco, dettaglio, allegati e presa visione delle circolari.

### API coinvolte

- nuova famiglia API `circolari`

### Route/viste coinvolte

- `/circolari`
- `/circolari/[id]`

### Sotto-task

- estrarre contratti dal legacy
- implementare API lista/dettaglio/download
- implementare UI elenco e dettaglio
- gestire allegati e presa visione

### Test/validazione

- lettura circolare
- download allegato
- presa visione per utente abilitato

### Definition of done

Elenco, dettaglio, allegati e presa visione circolari funzionano nel refactor per i ruoli previsti.

## E6 - Comunicazioni: avvisi e agenda

### Contesto

Avvisi e agenda restano nel backend storico.

### Obiettivo

Portare avvisi e agenda nel refactor con viste dedicate e API coerenti.

### API coinvolte

- nuova famiglia API `avvisi`
- nuova famiglia API `agenda`

### Route/viste coinvolte

- `/avvisi`
- `/agenda`

### Sotto-task

- separare i casi d'uso avvisi vs agenda
- definire API lista/dettaglio/eventi
- creare elenco e vista calendario
- testare filtri per ruolo

### Test/validazione

- elenco avvisi
- dettaglio avviso
- calendario agenda

### Definition of done

Avvisi e agenda sono consultabili e gestibili nel refactor senza fallback al legacy.

## E7 - Colloqui

### Contesto

Il flusso colloqui e' ancora interamente legacy per docenti e famiglie.

### Obiettivo

Portare nel refactor disponibilita, prenotazioni, conferme/rifiuti e storico colloqui.

### API coinvolte

- nuova famiglia API `colloqui`

### Route/viste coinvolte

- `/colloqui`
- `/colloqui/prenota`

### Sotto-task

- estrarre il modello slot/prenotazione
- implementare API docente
- implementare API famiglia
- realizzare le due interfacce
- testare concorrenza slot

### Test/validazione

- apertura slot docente
- prenotazione famiglia
- conferma/rifiuto e storico

### Definition of done

Docenti e famiglie possono gestire colloqui dal refactor con coerenza sugli slot.

## E8 - Portale famiglie: situazione base

### Contesto

Senza portale famiglia il legacy pubblico non e' dismettibile.

### Obiettivo

Offrire nel refactor una vista famiglia con voti, assenze, note, agenda e comunicazioni.

### API coinvolte

- nuove API consumer famiglia

### Route/viste coinvolte

- `/famiglia`
- eventuali sezioni `genitori/*`

### Sotto-task

- definire shell area famiglia
- gestire multi-figlio
- esporre API consumer
- realizzare viste responsive

### Test/validazione

- accesso famiglia
- selezione figlio
- consultazione dati base

### Definition of done

La famiglia consulta la situazione base dal refactor senza usare il legacy.

## E9 - Portale famiglie: pagelle

### Contesto

Le pagelle sono ancora solo legacy.

### Obiettivo

Rendere disponibili lettura e download pagelle dal refactor.

### API coinvolte

- nuova famiglia API `pagelle`

### Route/viste coinvolte

- `/pagelle`

### Sotto-task

- esporre periodi e pagelle
- implementare vista elenco/dettaglio
- gestire download

### Test/validazione

- accesso a pagella per periodo
- download da ruolo autorizzato

### Definition of done

Le pagelle sono consultabili e scaricabili dal refactor con permessi corretti.

## E10 - Portale famiglie: richieste minime

### Contesto

Il backoffice moduli esiste, ma il flusso famiglia resta legacy.

### Obiettivo

Consentire l'invio e il monitoraggio delle richieste principali dal refactor.

### API coinvolte

- nuova famiglia API `richieste`

### Route/viste coinvolte

- `/richieste`

### Sotto-task

- definire subset iniziale richieste
- esporre submit/stato/allegati
- realizzare form e storico

### Test/validazione

- invio richiesta
- consultazione stato
- gestione allegati

### Definition of done

Una famiglia puo inviare e monitorare le richieste principali nel refactor.

## E11 - Documenti didattici e BES

### Contesto

Programmi, relazioni, documenti BES e archivio restano nel perimetro legacy.

### Obiettivo

Portare nel refactor gestione documenti didattici e BES con upload, elenco, dettaglio e download.

### API coinvolte

- nuova famiglia API `documenti`
- sottosezioni dedicate per programmi, relazioni, BES, archivio

### Route/viste coinvolte

- `/documenti`
- eventuali sottosezioni dedicate

### Sotto-task

- suddividere il modulo in sotto-ambiti
- definire API upload/list/download
- chiarire storage allegati e naming
- realizzare UI elenco, dettaglio e upload
- verificare permessi per ruolo e classe

### Test/validazione

- upload documento
- download documento
- accesso negato su ruolo non autorizzato

### Definition of done

I documenti principali sono gestibili nel refactor con storage, download e permessi verificati.

## E12 - Richieste famiglia complete

### Contesto

Il refactor coprira inizialmente solo le richieste minime; il workflow completo legacy e' piu ampio.

### Obiettivo

Completare nel refactor l'intero workflow richieste, incluse approvazioni, filtri e allegati.

### API coinvolte

- estensione famiglia API `richieste`

### Route/viste coinvolte

- `/richieste`
- `/richieste/[id]`

### Sotto-task

- mappare stati e transizioni workflow
- completare API di dettaglio, filtri e allegati
- allineare UX tra famiglia e backoffice
- gestire timeline e storico stati

### Test/validazione

- richiesta con allegato
- avanzamento stato
- consultazione dettaglio storico

### Definition of done

Tutto il workflow richieste e' coperto nel refactor fino agli stati finali previsti.

## E13 - Scrutini completi

### Contesto

La sezione `scrutini` esiste nel refactor ma il perimetro finale non e' ancora chiarito rispetto al legacy.

### Obiettivo

Definire e completare nel refactor lo scope effettivo degli scrutini.

### API coinvolte

- API `scrutini` esistenti da estendere se necessario

### Route/viste coinvolte

- `/scuola/scrutini`

### Sotto-task

- decidere scope funzionale finale
- completare API CRUD/config se richiesto
- adeguare UI a scope deciso
- testare flussi multi-periodo

### Test/validazione

- consultazione scrutinio
- eventuale modifica/configurazione
- coerenza con voti e periodi

### Definition of done

Il perimetro scrutini e' dichiarato e coperto in modo coerente con lo scope deciso.

## E14 - Moduli completi

### Contesto

Nel refactor i moduli sono oggi gestiti in modo parziale, principalmente come list e toggle.

### Obiettivo

Rendere i moduli configurabili nel refactor in modo strutturato.

### API coinvolte

- API `moduli` da estendere con update strutturato

### Route/viste coinvolte

- `/scuola/moduli`

### Sotto-task

- definire campi editabili
- introdurre endpoint update strutturato
- aggiungere dialog o pagina dettaglio
- verificare compatibilita con dati esistenti

### Test/validazione

- modifica configurazione modulo
- persistenza corretta dei campi
- rendering coerente in UI

### Definition of done

I moduli sono configurabili dal refactor con editing strutturato, non solo toggle.

## E15 - Archiviazione / nuovo anno / aggiornamento

### Contesto

Le tre sezioni esistono ma non sono ancora equivalenti ai workflow legacy.

### Obiettivo

Decidere e implementare per ogni funzione se resta amministrativa esterna o diventa pienamente operativa nel refactor.

### API coinvolte

- eventuali command/API dedicate per operazioni di sistema

### Route/viste coinvolte

- `/sistema/archivia`
- `/sistema/nuovo`
- `/sistema/aggiorna`

### Sotto-task

- chiarire il target per ciascuna funzione
- se operativa, esporre command backend auditati
- progettare UI con conferme forti
- testare error handling e casi distruttivi

### Test/validazione

- esecuzione controllata di ciascun workflow
- audit/log presente
- messaggi errore chiari

### Definition of done

Ogni funzione e' o realmente operativa nel refactor o esplicitamente declassata a procedura amministrativa esterna.

## E16 - Coordinatore

### Contesto

L'area coordinatore resta ancora interamente legacy.

### Obiettivo

Portare nel refactor il sottoinsieme prioritario delle funzioni coordinatore.

### API coinvolte

- nuove API aggregate coordinatore

### Route/viste coinvolte

- `/coordinatore/*` o nuova sezione dedicata

### Sotto-task

- estrarre le funzioni realmente usate
- definire API aggregate
- progettare dashboard e viste dettaglio
- integrare assenze, voti, documenti e moduli formativi

### Test/validazione

- consultazione quadro coordinatore
- drill-down su alunno/classe
- coerenza dati con moduli sorgente

### Definition of done

Le funzioni coordinatore usate quotidianamente sono disponibili nel refactor senza dipendenze residue dal legacy.

## E17 - Recovery password

### Contesto

Il recupero password non ha ancora una controparte refactor.

### Obiettivo

Implementare nel refactor il recupero password end-to-end.

### API coinvolte

- nuove API `recovery/reset`

### Route/viste coinvolte

- `/login/recovery`

### Sotto-task

- definire contratto reset/recovery
- introdurre token e scadenza
- aggiungere template mail
- implementare pagina richiesta reset e conferma

### Test/validazione

- invio richiesta reset
- uso token valido
- gestione token scaduto/non valido

### Definition of done

Il recupero password e' eseguibile end-to-end dal refactor con token e mail verificati.

## E18 - SPID

### Contesto

L'accesso SPID resta ancora sul bridge legacy.

### Obiettivo

Far atterrare il flusso SPID nel refactor con bootstrap corretto dell'identita.

### API coinvolte

- integrazione auth SPID / callback

### Route/viste coinvolte

- `/login/spid`

### Sotto-task

- mappare handshake e callback attuali
- definire bootstrap identita verso refactor
- implementare entrypoint UI e redirect
- testare l'intero flusso

### Test/validazione

- login SPID completo
- bootstrap session/token corretto
- ritorno su UI refactor

### Definition of done

L'accesso SPID atterra nel refactor con sessione/token corretti e senza bridge legacy manuali.

## E19 - Google Workspace / OAuth

### Contesto

L'integrazione OAuth Google resta ancora legacy.

### Obiettivo

Portare nel refactor il login Google Workspace/OAuth con redirect e bootstrap identita coerenti.

### API coinvolte

- integrazione OAuth backend

### Route/viste coinvolte

- `/login/google` o equivalente

### Sotto-task

- mappare il flusso legacy
- definire bootstrap verso token/sessione refactor
- implementare entrypoint UI e callback
- testare casi redirect/sessione ibrida

### Test/validazione

- login OAuth completo
- ritorno corretto in UI
- gestione sessione residua

### Definition of done

Il login OAuth completa il flusso nel refactor con redirect e bootstrap identita corretti.

## E20 - Mobile app / prelogin

### Contesto

Il perimetro mobile/prelogin non e' ancora deciso nel percorso di migrazione.

### Obiettivo

Prendere una decisione esplicita su compatibilita mobile o nuovo contratto API, e implementarla.

### API coinvolte

- endpoint mobile esistenti o nuove API dedicate

### Route/viste coinvolte

- eventuale nuova entry mobile

### Sotto-task

- censire endpoint mobili in uso
- scegliere strategia compatibilita o redesign
- definire contratto API o piano deprecazione
- pianificare impatto sul client mobile

### Test/validazione

- verifica strategia scelta
- prova su client o simulazione
- documentazione aggiornata

### Definition of done

Esiste una decisione esplicita e implementata su compatibilita mobile o nuova strategia app.

## E21 - Logout/auth unificati

### Contesto

Oggi convivono JWT, alias e possibili sessioni residue o ibride.

### Obiettivo

Allineare logout e modello auth in modo coerente su tutto il refactor.

### API coinvolte

- login/logout globali
- eventuali endpoint alias/auth di supporto

### Route/viste coinvolte

- flusso globale auth

### Sotto-task

- censire stati auth esistenti
- definire modello unico di logout
- adeguare backend e auth context frontend
- testare scenari alias e ibridi

### Test/validazione

- logout standard
- logout in alias
- logout dopo flussi ibridi

### Definition of done

Logout, alias e sessioni ibride si chiudono con un modello auth coerente e senza comportamenti divergenti.

## E22 - Segreteria

### Contesto

La segreteria e' ancora poco estratta e totalmente legacy.

### Obiettivo

Definire il perimetro prioritario della segreteria e portare almeno il sottoinsieme ad alto utilizzo nel refactor.

### API coinvolte

- nuove API `segreteria`

### Route/viste coinvolte

- `segreteria/*`

### Sotto-task

- estrarre perimetro reale dai controller legacy
- definire subset prioritario
- implementare API e route principali
- verificare dipendenze con anagrafiche e richieste

### Test/validazione

- accesso ruolo segreteria
- uso dei casi prioritari
- coerenza con dati esistenti

### Definition of done

Il perimetro segreteria e' definito e almeno il sottoinsieme prioritario e' disponibile nel refactor.
