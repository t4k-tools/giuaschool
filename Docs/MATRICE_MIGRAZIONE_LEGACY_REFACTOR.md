# Matrice Migrazione Legacy -> Refactor

Ultimo aggiornamento: 2026-04-30

## Criteri stato

- `Migrato`: esistono route `refactor` reali e API dedicate; il caso d'uso principale e' eseguibile senza passare dal legacy.
- `Parziale`: il refactor copre una parte sostanziale del flusso, ma restano casi limite o sotto-flussi ancora legacy.
- `Solo legacy`: non esiste una sezione `refactor` dedicata; l'utente resta sul backend Twig/PHP storico.
- `Fallback legacy`: il frontend `refactor` intercetta l'URL ma mostra una pagina generica con link al legacy.

## Evidenza tecnica trasversale

- Il menu del `refactor` usa le voci backend e costruisce URL Next automaticamente: [refactor/src/components/layout/app-sidebar.tsx](../refactor/src/components/layout/app-sidebar.tsx)
- Le route non migrate finiscono ancora nella catch-all che rimanda al `legacy`: [refactor/src/app/(app)/[...slug]/page.tsx](../refactor/src/app/(app)/[...slug]/page.tsx)
- Il perimetro API consumato dal frontend e' definito in: [refactor/src/lib/api/client.ts](../refactor/src/lib/api/client.ts)
- La fotografia route-per-route piu aggiornata del worktree e' in: [STATO_ROTTE_REFACTOR.md](./STATO_ROTTE_REFACTOR.md)

## Matrice

| Area | Legacy principale | Refactor UI/API | Stato | Note |
|---|---|---|---|---|
| Landing pubblica | `LoginController::home` | Landing Next `/` + `GET /api/public/info` | Parziale | La landing pubblica e' nuova, ma la home autenticata legacy resta distinta. |
| Login username/password | `GET/POST /login/form/` | `/login` + `POST /api/auth/login` + `GET /api/auth/me` | Migrato | Login applicativo standard spostato su JWT/API. |
| Logout | `GET /logout/` | Logout client-side nel provider auth | Parziale | Il refactor gestisce il token, ma il logout legacy continua a esistere per i flussi Twig o ibridi. |
| Recupero password | `GET/POST /login/recovery/` | `/login/recovery` + `POST /api/auth/recovery` | Migrato | UI auth dedicata e API recovery presenti nel refactor. |
| Login SPID | `/spid/login/{idp}`, `/spid/acs/{responseId}` | Nessuna UI/API dedicata | Solo legacy | Flusso ancora interamente legacy/PHP bridge. |
| Login Google Workspace | `/login/gsuite`, `/login/gsuite/check` | Bottone in `/login` + handoff JWT su `/auth/callback` | Migrato | Il refactor avvia il login Google dal frontend e riceve il token JWT dal backend su callback Next dedicata. |
| Login/app mobile | `/app/login/*`, `/app/prelogin/`, `/app/info/` | Nessuna UI/API dedicata | Solo legacy | App mobile ancora legata al backend storico. |
| Menu dinamico | Menu Twig per ruolo | `GET /api/menu` + sidebar React | Migrato | Il menu e' servito via API e renderizzato nel `refactor`. |
| Dashboard/home autenticata | `login_home` Twig | `/dashboard` | Parziale | Esiste dashboard nuova, ma molte destinazioni portano ancora al legacy o a moduli non completati. |
| Profilo utente | `/login/profilo` | `/profilo` | Migrato | Presente pagina dedicata nel `refactor`. |
| Sistema: parametri | `/sistema/parametri/` | `/sistema/parametri` + API sistema | Migrato | UI e API presenti. |
| Sistema: banner | `/sistema/banner/` | `/sistema/banner` + API sistema | Migrato | UI e API presenti. |
| Sistema: manutenzione | `/sistema/manutenzione/` | `/sistema/manutenzione` + API sistema | Migrato | UI e API presenti. |
| Sistema: archiviazione | `/sistema/archivia/` | `/sistema/archivia` | Parziale | Pagina presente con collegamenti operativi ai moduli refactor gia utili (`/scuola/scrutini`, `/documenti`); la procedura completa non e' ancora equivalente al legacy. |
| Sistema: nuovo anno scolastico | `/sistema/nuovo/{step}` | `/sistema/nuovo` | Parziale | Pagina presente con rimandi a `/scuola/istituto`, `/scuola/classi`, `/scuola/scrutini`; il workflow multi-step legacy non risulta ancora migrato in modo equivalente. |
| Sistema: aggiornamento | `/sistema/aggiorna/{step}` | `/sistema/aggiorna` | Parziale | Pagina presente con refresh esplicito delle info di sistema, ma senza workflow di aggiornamento equivalente al legacy. |
| Sistema: email | `/sistema/email` | `/sistema/email` + API sistema | Migrato | UI e API presenti. |
| Sistema: telegram | `/sistema/telegram` | `/sistema/telegram` + API sistema | Migrato | UI e API presenti. |
| Sistema: alias | `/sistema/alias/`, `/sistema/alias/exit` | `/sistema/alias` + API alias | Migrato | La UI ora copre ricerca, impersonazione e uscita alias. |
| Sistema: cambio password utente | `/sistema/password/` | `/sistema/password` + API sistema | Migrato | UI e API presenti. |
| Scuola: amministratore | `/scuola/amministratore` | `/scuola/amministratore` + API scuola | Migrato | UI e API presenti. |
| Scuola: dirigente | `/scuola/dirigente` | `/scuola/dirigente` + API scuola | Migrato | UI e API presenti. |
| Scuola: istituto | `/scuola/istituto` | `/scuola/istituto` + API scuola | Migrato | UI e API presenti. |
| Scuola: sedi | `/scuola/sedi*` | `/scuola/sedi` + API sedi | Migrato | UI e API presenti. |
| Scuola: corsi | `/scuola/corsi*` | `/scuola/corsi` + API corsi | Migrato | UI e API presenti. |
| Scuola: materie | `/scuola/materie*` | `/scuola/materie` + API materie | Migrato | UI e API presenti; resta da decidere il supporto `delete`. |
| Scuola: classi | `/scuola/classi*` | `/scuola/classi` + API classi | Migrato | UI e API presenti. |
| Scuola: festivita | `/scuola/festivita*` | `/scuola/festivita` + API scuola | Migrato | UI e API presenti. |
| Scuola: orario | `/scuola/orario*` | `/scuola/orario` + API scuola | Migrato | UI e API presenti. |
| Scuola: scrutini | `/scuola/scrutini/{periodo}` | `/scuola/scrutini` + API scuola | Parziale | Configurazione presente con edit operativo e azioni bulk sulla pubblicazione esiti; il perimetro legacy appare comunque piu ampio della sola consultazione/base edit. |
| Scuola: moduli richiesta | `/scuola/moduli*` | `/scuola/moduli` + API scuola | Parziale | UI presente con list, toggle, edit strutturato e filtri locali; configurazione completa ancora da definire. |
| Scuola: moduli formativi | `/scuola/moduliFormativi*` | `/scuola/moduliFormativi` + API scuola | Migrato | Route e API presenti nel worktree attuale. |
| Docenti: importa | `/docenti/importa/` | `/docenti/importa` + API import | Migrato | UI e upload API presenti. |
| Docenti: modifica/anagrafica | `/docenti/modifica*` | `/docenti/modifica` + API docenti | Migrato | UI e API presenti. |
| Docenti: cattedre | `/docenti/cattedre*` | `/docenti/cattedre` + API cattedre | Migrato | UI e API presenti. |
| Docenti: staff | `/docenti/staff*` | `/docenti/staff` + API docenti | Migrato | UI e API presenti per l'anagrafica/configurazione staff. |
| Docenti: coordinatori | `/docenti/coordinatori*` | `/docenti/coordinatori` + API docenti | Migrato | UI e API presenti. |
| Docenti: segretari | `/docenti/segretari*` | `/docenti/segretari` + API docenti | Migrato | UI e API presenti. |
| Docenti: responsabili BES | `/docenti/responsabiliBes*` | `/docenti/responsabiliBes` + API docenti | Migrato | UI e API presenti. |
| Docenti: RSPP | `/docenti/rspp` | `/docenti/rspp` + API docenti | Migrato | UI e API presenti. |
| Docenti: rappresentanti | `/docenti/rappresentanti*` | `/docenti/rappresentanti` + API docenti | Migrato | UI e API presenti. |
| ATA: importa | `/ata/importa/` | `/ata/importa` + API import | Migrato | UI e upload API presenti. |
| ATA: modifica/anagrafica | `/ata/modifica*` | `/ata/modifica` + API ATA | Migrato | UI e API presenti. |
| ATA: rappresentanti | `/ata/rappresentanti*` | `/ata/rappresentanti` + API ATA | Migrato | UI e API presenti. |
| Alunni: importa | `/alunni/importa/` | `/alunni/importa` + API import | Migrato | UI e upload API presenti. |
| Alunni: modifica/anagrafica | `/alunni/modifica*` | `/alunni/modifica` + API alunni | Migrato | UI e API presenti. |
| Alunni: cambio classe | `/alunni/classe*` | `/alunni/classe` + API alunni | Migrato | UI e API presenti. |
| Alunni: rappresentanti | `/alunni/rappresentanti*` | `/alunni/rappresentanti` + API alunni | Migrato | UI e API presenti. |
| Alunni: rappresentanti genitori | `/alunni/rappresentantiGenitori*` | `/alunni/rappresentantiGenitori` + API alunni | Migrato | UI e API presenti. |
| Docente operativo: contesto lezioni | `LezioniController::classe` | `/lezioni` + `GET /api/lezioni/contesto` | Migrato | Contesto cattedra/classe sostituzione gestito nel refactor. |
| Docente operativo: firme/lezioni | `RegistroController::firme/add/edit/delete` | `/registro/firme` + API registro dedicate | Parziale | Create copre sostituzioni e slot compatibili/compresenze; edit/delete condivisi sono implementati nel refactor. Il modulo appare implementativamente completo nel worktree. Residuo reale: validazione end-to-end su casi avanzati e consolidamento di parita col legacy. |
| Docente operativo: assenze/appello | `AssenzeController::*` | `/registro/assenze` + API assenze dedicate | Migrato | Quadro giornaliero, appello, assenze, entrate, uscite e fuori-classe sono presenti nel refactor. |
| Docente operativo: note disciplinari | `RegistroController::nota*` | `/registro/note` + API note dedicate | Migrato | List, create, update, delete, annulla e provvedimento coperti. |
| Docente operativo: voti | `VotiController::*` | `/registro/voti` + API voti dedicate | Parziale | Quadro e CRUD presenti anche in modalita sostegno (`mode: support`) con UI dedicata. Nel worktree attuale il contesto `classe/sostituzione` non e' piu bloccante: il refactor risolve, memorizza, cambia e azzera la cattedra compatibile direttamente dalla UI. Residuo reale: validazione end-to-end con dati reali e chiusura degli edge case. |
| Docente operativo: osservazioni | `/lezioni/osservazioni/*` | Nessuna sezione dedicata | Solo legacy | Osservazioni di classe/personali non migrate. |
| Docente operativo: colloqui | `/colloqui/*` | `/colloqui` + `ColloquiApiController` (14 endpoint) + `ColloquiService` | Migrato | Slot docenti, prenotazioni famiglia, conferme/rifiuti, gestione singola e ricorrente. Fronte docente e famiglia coperti. |
| Docente operativo: documenti | `/documenti/*` | `/documenti` + `DocumentiApiController` | Migrato | Piani, programmi, relazioni, documento del 15 maggio e BES: lista/upload/download/delete coperti nel refactor per il perimetro principale. |
| Comunicazioni: circolari | `/circolari/*` | `/circolari` + `ComunicazioniApiController` (11 endpoint) + `ComunicazioniService` | Migrato | Lista, dettaglio, firma presa visione, download allegati, filtri per ruolo. |
| Comunicazioni: avvisi | `/avvisi/*`, `/documenti/bacheca*` | `/avvisi` + `ComunicazioniApiController` | Migrato | Lista, dettaglio, read, download allegati e filtri per ruolo presenti nel refactor. |
| Agenda | `/avvisi/agenda*` | `/agenda` + `ComunicazioniApiController` | Migrato | Agenda mensile e dettaglio giorno/tipo presenti con API dedicate. |
| Coordinatore | `/coordinatore/*` | `/coordinatore` + `CoordinatoreApiController` | Migrato | Classi coordinate, situazione alunni, assenze e voti aggregati presenti nel refactor. |
| Staff operativo | `/avvisi_gestione`, `/avvisi_edit_*`, altri flussi staff | Nessuna sezione dedicata | Solo legacy | Nel refactor esiste la configurazione staff, non i flussi operativi. |
| Genitori/alunni: lezioni | `/genitori/lezioni`, `/genitori/argomenti` | `/famiglia?tab=lezioni` + `FamigliaApiController` + `FamigliaService` | Migrato | Lezioni e argomenti del giorno sono consultabili nell'area famiglia. |
| Genitori/alunni: situazione | `/genitori/voti`, `/genitori/assenze`, `/genitori/note`, `/genitori/deroghe` | `/famiglia` + `FamigliaApiController` + `FamigliaService` | Migrato | Dashboard con tab voti, assenze, note, lezioni, agenda e osservazioni. |
| Genitori/alunni: pagelle | `/genitori/pagelle/{periodo}` | `/pagelle` + `FamigliaApiController` | Migrato | Consultazione e pagelle per periodo disponibili nel portale famiglia. |
| Genitori/alunni: richieste | `richieste_*` | `/richieste`, `/richieste/gestione` + `RichiesteFamigliaApiController` (8 endpoint) + `RichiesteFamigliaService` | Migrato | Invio, lista, dettaglio, annulla, download allegati, gestione e rimozione richieste con workflow base presenti nel refactor. |
| Genitori/alunni: colloqui | `/colloqui/genitori`, `/colloqui/prenota/*` | `/colloqui` + `ColloquiApiController` | Migrato | Prenotazione, storico e gestione colloqui disponibili (fronte famiglia incluso nel modulo `/colloqui`). |
| Segreteria | `/segreteria_*` | `/segreteria/assenze`, `/segreteria/genitori`, `/segreteria/scrutini` + `SegreteriaApiController` | Parziale | Il worktree locale mostra gia tre sottosezioni refactor. Resta da definire se il perimetro e' sufficiente per considerare l'area completa. |

## Sintesi operativa

### Aree realisticamente migrate

- Autenticazione base JWT
- Login Google Workspace con callback Next e handoff JWT
- Landing pubblica e profilo
- Backoffice anagrafiche e configurazione (Scuola, Docenti, Alunni, ATA)
- Import docenti/alunni/ATA
- Blocco docente base: contesto lezioni, firme, assenze, note, voti
- Documenti didattici e BES
- Circolari (lista, dettaglio, firma presa visione, allegati)
- Avvisi e agenda
- Colloqui (slot docenti, prenotazioni, conferme, storico — sia fronte docente sia famiglia)
- Portale famiglie: situazione (voti, assenze, note, lezioni, agenda, osservazioni)
- Portale famiglie: pagelle
- Richieste famiglia (invio, stato, allegati, annulla)
- Coordinatore
- Recupero password
- Segreteria: assenze, genitori, scrutini nel worktree locale

### Aree migrate ma non ancora chiuse

- Registro lezioni: codice sostanzialmente completo; restano validazione end-to-end e consolidamento sui casi avanzati
- Voti sostegno: create/edit/delete e UI presenti, manca validazione end-to-end
- Scrutini, moduli richiesta (solo toggle, manca edit strutturato), archiviazione, nuovo anno, aggiornamento
- Segreteria: area estesa nel worktree a `assenze`, `genitori`, `scrutini`, ma da consolidare come perimetro finale

### Aree ancora non migrate

- SPID, app mobile
- Osservazioni di classe/personali lato registro docente

## Priorita suggerite

1. Chiudere i gap del blocco docente ancora aperti: validazione end-to-end su lezioni condivise/sostegno (E1-E4).
2. Consolidare i moduli gia migrati ma solo parzialmente equivalenti: scrutini (E13), moduli strutturati (E14), procedure sistema (E15), segreteria (E22).
3. Tenere `richieste`, `documenti`, `coordinatore` e `famiglia` allineati con test su casi reali, non solo con la presenza di pagine/API.
4. Chiudere i flussi di accesso ancora storici: `SPID` (E18) e mobile (E20).

## Checklist esecutiva aggiornata

I numeri epic sono allineati alla [Roadmap Esecutiva Refactor](./ROADMAP_ESECUTIVA_REFACTOR.md).

| Epic | Ambito | Stato attuale | Priorita | Note operative |
|---|---|---|---|---|
| E1 | Registro docente: sostituzioni | Parziale | P0 | Implementazione refactor presente anche in contesto `classe`; residuo principale: validazione con dati reali e verifica di parita con il legacy. |
| E2 | Registro docente: compresenze e slot condivisi | Parziale | P0 | Create, edit e delete condivisi risultano implementati nel refactor; residuo principale sui casi avanzati e sulla validazione con dati reali. |
| E3 | Registro docente: edit/delete lezioni condivise | Migrato | P0 | Implementato in `RegistroLezioneCreateService`; residuo reale: test e consolidamento su casistiche avanzate. |
| E4 | Voti sostegno | Parziale | P0 | Backend e UI dedicata presenti; il tratto `classe/sostituzione` nel refactor voti e' ora molto piu avanti e non e' piu un blocco strutturale. Manca validazione end-to-end con dati reali. |
| E5 | Comunicazioni: circolari | **Migrato** | — | `ComunicazioniApiController` (11 endpoint) + `ComunicazioniService` (423 righe) + UI completa. Chiuso. |
| E6 | Comunicazioni: avvisi e agenda | Migrato | P1 | `ComunicazioniApiController` copre avvisi e agenda con API dedicate; UI `/avvisi` e `/agenda` presenti. |
| E7 | Colloqui docenti/genitori | **Migrato** | — | `ColloquiApiController` (14 endpoint) + `ColloquiService` (735 righe) + UI fronte docente e famiglia. Chiuso. |
| E8 | Portale famiglie: situazione base | **Migrato** | — | `FamigliaApiController` + `FamigliaService` + UI con tab voti/assenze/note/lezioni/osservazioni. |
| E9 | Portale famiglie: pagelle | **Migrato** | — | Consultazione pagelle per periodo disponibile nel portale famiglia. Chiuso. |
| E10 | Portale famiglie: richieste minime | **Migrato** | — | `RichiesteFamigliaApiController` (8 endpoint) + `RichiesteFamigliaService` + UI famiglia. |
| E11 | Documenti didattici e BES | Migrato | P1 | `DocumentiApiController` + `/documenti` coprono piani, programmi, relazioni, maggio e BES nel perimetro principale. |
| E12 | Richieste famiglia complete | Migrato | P1 | Presenti anche `/richieste/gestione`, `gestisci` e `rimuovi` con workflow base per i destinatari. |
| E13 | Scrutini completi | Migrato | P1 | `/scuola/scrutini` + API update per periodo presenti nel refactor. |
| E14 | Moduli richiesta completi | Migrato | P1 | `/scuola/moduli` ha list, toggle e update strutturato. |
| E15 | Archiviazione / nuovo anno / aggiornamento | Parziale | P1 | Pagine presenti ma procedure operative non equivalenti al legacy. |
| E16 | Coordinatore | Migrato | P1 | `/coordinatore` + `CoordinatoreApiController` coprono classi, situazione, assenze e voti. |
| E17 | Recupero password | Migrato | P2 | `/login/recovery` + `POST /api/auth/recovery` presenti nel refactor. |
| E18 | SPID | Solo legacy | P2 | Bridge PHP legacy ancora attivo. |
| E19 | Google Workspace / OAuth | Migrato | P2 | Login Next con bottone Google e callback `/auth/callback`; backend fa handoff JWT al refactor. |
| E20 | Mobile app / prelogin | Solo legacy | P2 | Tutto in `AppController`, strategia da decidere. |
| E21 | Logout unificato | Parziale | P2 | Doppio modello auth JWT/legacy ancora presente. |
| E22 | Segreteria | Parziale | P2 | Nel worktree sono presenti `/segreteria/assenze`, `/segreteria/genitori`, `/segreteria/scrutini`; resta da chiarire il perimetro finale rispetto al legacy. |
| — | Osservazioni di classe | Solo legacy | P1 | Non incluso negli epic formali; osservazioni classe/personali ancora legacy. |

## Sequenza consigliata

1. `E1 + E2 + E4`
Chiudono i gap residui del blocco docente con test reali.

2. `E15 + E22`
Completano le aree amministrative solo parzialmente migrate.

3. `E18 + E20`
Chiudono accessi alternativi e perimetro mobile ancora storico.

## Dipendenze strutturali

- I flussi utente finali dipendono da API nuove, non solo da pagine React.
- Il catch-all con rimando al legacy va mantenuto finche esistono moduli `Solo legacy`.
- Prima di dismettere il legacy pubblico devono essere chiusi almeno gli epic `P0`.

## Prossimi deliverable consigliati

1. Validare end-to-end i moduli ora segnati come migrati: colloqui, comunicazioni, famiglia, richieste, documenti, coordinatore.
2. Consolidare i gap residui del blocco docente (E1-E4) con test su dati reali.
3. Estendere la segreteria oltre il sotto-perimetro assenze, oppure dichiararne esplicitamente lo scope ridotto.
4. Aggiornare questo documento a ogni verifica di codice reale, non alla sola comparsa di una pagina o di un controller.
