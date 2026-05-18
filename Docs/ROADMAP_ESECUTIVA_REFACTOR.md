# Roadmap Esecutiva Refactor

Ultimo aggiornamento: 2026-04-30

Questa roadmap traduce lo stato reale del progetto `registro` in un backlog direttamente usabile per pianificazione, issue e release.

## Convenzioni

- `Owner`: ruolo consigliato, da sostituire con il nominativo effettivo.
- `Release target`: suggerimento di finestra di rilascio relativa.
- `Stato`: valore iniziale consigliato per backlog non ancora aperti.
- `Definition of done`: condizione minima per considerare chiusa l'epic.

## Backlog esecutivo

| Priorita | Epic | Ambito | API da fare/chiudere | Route Next | Dipendenze | Rischi principali | Stima | Owner | Release target | Stato | Definition of done |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P0 | E1 | Registro docente: sostituzioni | Estendere `LezioniApiController` e `RegistroApiController` per creazione/modifica lezioni in modalita sostituzione | `/lezioni`, `/registro/firme` | `LessonContextService`, `RegistroLezioneCreateService`, regole `RegistroUtil` | contesto misto `cattedra/classe`, permessi data, regressioni su firme | L | Backend + Frontend | R1 | In corso | Create/edit/delete sostituzione operativi nel refactor anche nel contesto `classe`; residuo: validazione con dati reali per casistiche avanzate di `controllaNuovaLezione` e verifica di parita col legacy. |
| P0 | E2 | Registro docente: compresenze e slot gia occupati | Supportare compresenze/trasformazioni avanzate negli endpoint `GET /api/registro/lezioni/creazione`, `POST/PUT/DELETE /api/registro/lezioni` | `/registro/firme` | `RegistroLezioneCreateService`, modello `Lezione/Firma/FirmaSostegno` | collisioni su lezioni esistenti, semantica legacy implicita | XL | Backend | R1-R2 | In corso | Create co_sign e transform operativi; edit/delete lezioni condivise completi (E3). Residuo principale: test con dati reali e consolidamento sui casi avanzati del legacy. |
| — | E3 | Registro docente: lezioni condivise | Consentire edit/delete di lezioni condivise senza deviare al legacy | `/registro/firme` | `RegistroLezioneCreateService`, gestione multi-firma | perdita dati tra docenti, regole ownership non banali | L | Backend + Frontend | R2 | — | **Migrato** | Backend: getEditContext, update, getDeleteContext, delete gestiscono correttamente firme singole e condivise. Frontend: dialog edit e delete con preview context operativi. Aggiornato 2026-04-27. |
| P0 | E4 | Voti sostegno | Completare validazione end-to-end e UI dedicata; backend `buildSupportQuadro` gia implementato in `VotiService` | `/registro/voti` | `VotiService`, `RegistroUtil`, mapping sostegno | modello voti sostegno diverso dal curricolare | M | Backend + Frontend | R2 | In corso | Backend: canEdit corretto, createVote con override materia, updateVote con fallback sostegno. UI: create/edit/delete in vista sostegno. Nel worktree attuale il refactor gestisce anche il contesto `classe/sostituzione` con risoluzione, persistenza, cambio rapido e reset dell'associazione classe->cattedra. Residuo: test end-to-end con dati reali. |
| — | E5 | Comunicazioni: circolari | `ComunicazioniApiController` (11 endpoint) + `ComunicazioniService` (423 righe) + UI completa | `/circolari` | `ComunicazioniApiController`, `ComunicazioniService` | — | — | — | — | **Migrato** | Lista, dettaglio, firma presa visione, download allegati operativi. Documentazione non era aggiornata. |
| — | E6 | Comunicazioni: avvisi e agenda | API dedicate per elenco, dettaglio, stati pubblicazione, calendario | `/avvisi`, `/agenda` | `AvvisiController`, modello eventi/comunicazioni | forte accoppiamento con ruoli e notifiche | L | Backend + Frontend | R3 | — | **Migrato** | API avvisi (list, dettaglio, read, allegati) e agenda (mensile, dettaglio giorno) complete. Frontend `/avvisi` e `/agenda` operativi. Aggiornato 2026-04-27. |
| — | E7 | Colloqui | `ColloquiApiController` (14 endpoint) + `ColloquiService` (735 righe) + UI docente e famiglia | `/colloqui` | `ColloquiApiController`, `ColloquiService` | — | — | — | — | **Migrato** | Slot, prenotazioni, conferme/rifiuti, storico operativi per docenti e famiglie. Documentazione non era aggiornata. |
| — | E8 | Portale famiglie: situazione base | `FamigliaApiController` + `FamigliaService` (429 righe) + UI con tab | `/famiglia` | `FamigliaApiController`, `FamigliaService` | — | — | — | — | **Migrato** | Dashboard con tab voti/assenze/note/lezioni/osservazioni/agenda operativa. Documentazione non era aggiornata. |
| — | E9 | Portale famiglie: pagelle | Incluso in `FamigliaApiController` + UI pagelle per periodo | `/pagelle` | `FamigliaApiController` | — | — | — | — | **Migrato** | Consultazione e pagelle per periodo disponibili. Documentazione non era aggiornata. |
| — | E10 | Portale famiglie: richieste minime | `RichiesteFamigliaApiController` (8 endpoint) + `RichiesteFamigliaService` (542 righe) + UI CRUD | `/richieste`, `/richieste/gestione` | `RichiesteFamigliaApiController`, `RichiesteFamigliaService` | — | — | — | — | **Migrato** | Invio, lista, dettaglio, annulla, download allegati, gestione e rimozione richieste operative. Documentazione non era aggiornata. |
| P1 | E11 | Documenti didattici e BES | API CRUD/lista/download per programmi, relazioni, BES, archivio | `/documenti`, sottosezioni dedicate | `DocumentiController`, storage allegati | area ampia, permessi delicati, molti casi speciali | XL | Backend + Frontend | R6 | — | **Migrato** | DocumentiApiController: piani(L)/programmi(P)/relazioni(R)/maggio(M) list+upload+delete per docente; BES(B/H/D/C) list per staff/responsabileBes/coordinatori; download via dirDocumento; upload con flow convertePdf+allegatoDocumento+destinatariDocumento. Frontend `/documenti` con tab per tipologia, carica/scarica/elimina per slot. Aggiornato 2026-04-27. |
| — | E12 | Richieste famiglia complete | Completare workflow moduli, filtri, approvazioni, allegati | `/richieste`, `/richieste/gestione` | E10, modelli richieste/definizioni | stati workflow complessi | L | Backend + Frontend | R6 | — | **Migrato** | API gestione: listGestione (con filtri stato/classe), gestisci (→G), rimuovi (→C). Frontend `/richieste/gestione` con tabella, filtri e dialog conferma. Aggiornato 2026-04-27. |
| — | E13 | Scrutini completi | Da consultazione base a CRUD/config completo se richiesto | `/scuola/scrutini` | `ScuolaApiController`, regole scrutinio | rischio di migrare un perimetro non ancora deciso | M/L | Backend + Frontend | R6 | — | **Migrato** | API scrutini: list + update (data, dataProposte, classiVisibili per anno). Frontend con dialog di edit operativo e azioni bulk per impostare/azzerare la pubblicazione esiti. Aggiornato 2026-04-30. |
| — | E14 | Moduli completi | Da toggle semplice a edit strutturato dei moduli | `/scuola/moduli` | API `moduli`, definizione campi | scope creep funzionale | M | Backend + Frontend | R6 | — | **Migrato** | API: fix serializzazione richiedenti/destinatari come array, toggle ritorna dati aggiornati, PUT /moduli/{id} per unica/gestione/allegati. Frontend: dialog edit strutturato e filtri locali nome/stato. Aggiornato 2026-04-30. |
| P1 | E15 | Archiviazione / nuovo anno / aggiornamento | Decidere se UI operativa o funzioni solo amministrative; introdurre API/command sicuri se operative | `/sistema/archivia`, `/sistema/nuovo`, `/sistema/aggiorna` | processi di sistema, audit, deploy | operazioni sensibili e potenzialmente distruttive | M/L | Backend | R7 | Parziale | /sistema/aggiorna mostra info di sistema via API con refresh esplicito. /sistema/archivia e /sistema/nuovo restano pagine informative dichiaratamente amministrative (no API operativa), ma ora collegano i moduli refactor utili per i controlli preliminari. Decisione presa: procedure distruttive restano fuori dalla UI refactor. |
| — | E16 | Coordinatore | API aggregate su assenze, voti, documenti, moduli formativi | `/coordinatore` | E11, E13, blocco registro chiuso | dipendenza da molti moduli prima incompleti | XL | Backend + Frontend | R7 | — | **Migrato** | CoordinatoreApiController: /classi, /{id}/situazione (alunni+BES), /{id}/assenze (statistiche), /{id}/voti (medie per materia). Frontend `/coordinatore` con tab Situazione/Assenze/Voti. Aggiornato 2026-04-27. |
| P2 | E17 | Recovery password | API reset/recovery, token, mail template | `/login/recovery` | mailer, utenti, sicurezza | superficie sicurezza e UX errori | M | Backend + Frontend | R8 | — | **Migrato** | POST /api/auth/recovery: genera nuova password, invia email via MailerInterface con credenziali. Frontend /login/recovery con form email e stato successo. Link "Password dimenticata?" aggiunto al login. Aggiornato 2026-04-27. |
| P2 | E18 | SPID | Handshake auth, callback, bootstrap session/token verso refactor | `/login/spid` | stack SPID legacy, security Symfony | integrazione delicata e normativa | L | Backend | R8 | Todo | L'accesso SPID atterra nel refactor con sessione/token corretti e senza bridge legacy manuali. |
| P2 | E19 | Google Workspace / OAuth | Flusso OAuth e handoff identita verso frontend nuovo | `/login` + `/auth/callback` | `OAuth2Controller`, security | gestione redirect/sessione ibrida | M | Backend | R8 | **Migrato** | GSuiteAuthenticator.onAuthenticationSuccess() genera JWT Lexik e redirect a {NEXTJS_URL}/auth/callback?token={JWT}. onAuthenticationFailure() redirect a /login?error=google. services.yaml bind $nextjsUrl. Nuova pagina auth/callback in Next.js legge il token, lo salva in localStorage e redirect a /. Bottone "Accedi con Google" aggiunto a login/page.tsx. Aggiornato 2026-04-29. |
| P2 | E20 | Mobile app / prelogin | Decidere compatibilita o nuovo contratto API per app | endpoint app dedicati o nuova app shell | `AppController`, strategia prodotto | rischio progetto parallelo non chiuso | L/XL | Product + Backend | R8-R9 | Todo | Esiste una decisione esplicita e implementata su compatibilita mobile o nuova strategia app. |
| P2 | E21 | Logout/auth unificati | Allineare JWT, alias, sessioni residue e logout unico | login/logout globali | auth context Next, backend auth | edge case su alias e flussi ibridi | S/M | Backend + Frontend | R9 | — | **Migrato** | setUnauthorizedHandler in client.ts: 401 globale su apiRequest+apiDownload. AuthProvider registra l'handler e chiama clearSession+redirect /login automaticamente. Logout/alias già funzionanti. Aggiornato 2026-04-27. |
| P2 | E22 | Segreteria | Estrarre perimetro, definire API e route reali | sezione `segreteria/*` | controller legacy segreteria | scope poco definito oggi | L | Product + Backend + Frontend | R9 | Parziale | SegreteriaApiController: /assenze, /alunni/{id}/assenze, /classi, /genitori (list+edit PUT), /scrutini. Frontend: /segreteria/assenze, /segreteria/genitori (tabella genitori per alunno con edit email/telefoni), /segreteria/scrutini (badge periodi completati per alunno). L'area e' chiaramente avanzata nel worktree, ma il perimetro finale rispetto al legacy non e' ancora chiuso. Aggiornato 2026-04-29. |

## Ordine consigliato

> E3, E5, E6, E7, E8, E9, E10, E11, E12, E13, E14, E16, E17, E19, E21 sono migrati. E15 dichiarato Parziale (nessuna API operativa per operazioni distruttive). E22 resta Parziale finche il perimetro segreteria non e' chiuso rispetto al legacy. Aggiornato 2026-04-29.

1. `E1 + E2 + E4` — blocco docente: test end-to-end con dati reali; su `E1/E2` il codice e' sostanzialmente completo, su `E4` il residuo principale non e' piu il contesto ma la validazione funzionale reale
2. `E22` — Segreteria (consolidare il perimetro reale migrato)
3. `E18` — SPID (dipende da stack SPID esterno)
4. `E20` — Mobile app (richiede decisione di prodotto)

## Release suggerite

| Release | Focus |
|---|---|
| R1 | Sostituzioni, compresenze, chiusura primi gap del registro docente |
| R2 | Lezioni condivise e voti sostegno |
| R3 | Circolari, avvisi, agenda |
| R4 | Colloqui e avvio portale famiglie |
| R5 | Pagelle e richieste minime famiglie |
| R6 | Documenti, richieste complete, scrutini, moduli |
| R7 | Funzioni amministrative residue e coordinatore |
| R8 | Recovery, SPID, OAuth, strategia mobile |
| R9 | Logout unificato, segreteria, cleanup finale del legacy |

## Template per issue

Per ogni epic o sotto-epic aprire un'issue con almeno:

- `Contesto`
- `Obiettivo`
- `API coinvolte`
- `Route/viste coinvolte`
- `Vincoli legacy da replicare o superare`
- `Test/validazione`
- `Definition of done`

## Sotto-task tecnici per epic

### E1 - Registro docente: sostituzioni

- mappare i casi legacy coperti da scelta `classe` senza `cattedra`
- estendere il contratto `GET /api/registro/lezioni/creazione`
- estendere create/update lato service per contesto sostituzione
- aggiornare UI `/lezioni` e `/registro/firme` per distinguere chiaramente contesto sostituzione
- validare permessi, date, materia associata e salvataggio su database
- Stato 2026-04-29: create/edit/delete sostituzione risultano presenti nel refactor; lavoro residuo soprattutto su validazione con dati reali e parita col legacy

### E2 - Registro docente: compresenze e slot gia occupati

- censire i casi legacy di slot gia popolato
- definire il modello dati atteso per compresenza e ownership firme
- estendere il service per supportare slot multi-docente
- aggiornare la UI del registro per visualizzare lezioni multiple nello stesso slot
- aggiungere test sui casi di conflitto e trasformazione
- Stato 2026-04-29: create su slot compatibili e compresenze principale disponibile; edit/delete condivisi presenti. UI create espone anche il tipo azione previsto (`create`, `co_sign`, `transform`). Residuo: validazione dei casi avanzati reali.

### E3 - Registro docente: lezioni condivise

- definire regole di edit su firma singola vs lezione condivisa
- definire regole di delete su firma singola vs lezione condivisa
- aggiornare i messaggi errore/refactor per non deviare al legacy
- aggiungere copertura test per ownership multi-docente

### E4 - Voti sostegno

- censire i flussi legacy sostegno in `VotiController`
- estendere `VotiService` per cattedre di sostegno
- adattare UI `/registro/voti` ai casi sostegno
- verificare calcolo medie, visibilita e permessi
- validare inserimento, modifica e cancellazione su dati reali
- Stato 2026-04-30: il refactor voti gestisce anche il contesto `classe/sostituzione` con risoluzione automatica/manuale della cattedra, persistenza per classe, cambio rapido, azzeramento associazione e badge esplicito dell'origine classe. Residuo principale: validazione end-to-end su dati reali.

### E5 - Comunicazioni: circolari

- estrarre contratti lista/dettaglio/allegati dal legacy
- introdurre API CRUD minime per circolari
- progettare UI elenco e dettaglio
- gestire download allegati e presa visione
- verificare ruoli e permessi di pubblicazione/lettura

### E6 - Comunicazioni: avvisi e agenda

- separare il perimetro `avvisi` da `agenda`
- definire API lista/dettaglio/eventi
- progettare viste elenco e calendario
- gestire filtri per ruolo e finestra temporale
- verificare coerenza con notifiche/comunicazioni esistenti

### E7 - Colloqui

- estrarre modello slot/prenotazione dal legacy
- definire API docenti per disponibilita e gestione slot
- definire API famiglie per prenotazione e storico
- realizzare UI docente e UI famiglia
- testare concorrenza su slot e stati prenotazione

### E8 - Portale famiglie: situazione base

- definire shell e navigazione area famiglia
- creare API consumer per voti, assenze, note, agenda, comunicazioni
- gestire selezione figlio/tutore se multi-profilo
- introdurre viste responsive e semplificate
- testare autorizzazioni per nucleo familiare

### E9 - Portale famiglie: pagelle

- definire API lettura periodi e pagelle
- implementare pagina elenco/dettaglio/scarico
- verificare visibilita per periodo e permessi famiglia
- testare consistenza con scrutini

### E10 - Portale famiglie: richieste minime

- definire subset richieste iniziale
- esporre API submit/stato/allegati
- realizzare UI invio e storico
- testare workflow base con moduli gia configurati

### E11 - Documenti didattici e BES

- suddividere il modulo in programmi, relazioni, BES, archivio
- definire API upload/list/download
- chiarire storage e naming allegati
- realizzare UI per elenco, upload e dettaglio
- verificare permessi per ruolo e classe

### E12 - Richieste famiglia complete

- mappare tutti gli stati workflow legacy
- completare API filtri, dettaglio, approvazioni e allegati
- unificare UX richieste tra famiglia e backoffice
- testare casi con allegati e stati intermedi

### E13 - Scrutini completi

- chiarire scope finale con decisione funzionale
- completare API CRUD/config se richiesto
- adeguare UI `/scuola/scrutini`
- testare flussi multi-periodo e dipendenze voti

### E14 - Moduli completi

- definire campi editabili e semantica
- aggiungere API update strutturato
- introdurre dialog o pagina dettaglio
- verificare backward compatibility con dati esistenti

### E15 - Archiviazione / nuovo anno / aggiornamento

- decidere per ogni funzione se resta amministrativa o diventa UI operativa
- se operativa, esporre command backend auditati
- progettare UI con conferme forti e feedback di esecuzione
- testare rollback e scenari errore

### E16 - Coordinatore

- estrarre elenco funzioni realmente usate dal ruolo
- definire API aggregate per quadro coordinatore
- progettare dashboard e viste di dettaglio
- integrare assenze, voti, documenti, moduli formativi

### E17 - Recovery password

- definire contratto reset/recovery
- introdurre token, scadenza, template mail
- implementare pagina richiesta reset e conferma
- testare sicurezza e casi errore

### E18 - SPID

- mappare handshake e callback attuali
- definire bootstrap identita verso refactor
- implementare entrypoint UI e gestione redirect
- testare intero flusso auth

### E19 - Google Workspace / OAuth

- mappare flusso OAuth legacy
- definire bootstrap verso sessione/token refactor
- implementare entrypoint UI e callback
- testare redirect e casi sessione ibrida

### E20 - Mobile app / prelogin

- decidere strategia: compatibilita o nuovo contratto
- censire endpoint mobili in uso
- definire eventuale nuovo perimetro API
- pianificare migrazione client o deprecazione

### E21 - Logout/auth unificati

- censire stati auth oggi presenti: JWT, alias, sessioni residue
- definire un modello unico di logout
- adeguare backend e auth context frontend
- testare logout in scenari standard, alias e ibridi

### E22 - Segreteria

- estrarre il perimetro reale dai controller legacy
- definire subset prioritario
- esporre API e route per i casi ad alto utilizzo
- verificare dipendenze con anagrafiche e richieste

## Uso operativo

Quando una epic viene chiusa o ridimensionata, aggiornare anche:

- [MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md](./MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md)
- [FRONTEND_MIGRATION_BACKLOG.md](./FRONTEND_MIGRATION_BACKLOG.md)
