# Stato Rotte Refactor

Ultimo aggiornamento: 2026-04-30

Questa tabella descrive lo stato reale delle rotte del progetto `registro`, incrociando:

- presenza di una route Next.js dedicata nel `refactor`
- presenza di backend/API reale nel codice Symfony
- eventuale fallback o permanenza nel legacy

## Legenda stato

- `Migrato`: route refactor presente e caso d'uso principale coperto da API/backend reale
- `Parziale`: route refactor presente, ma il flusso non e' ancora equivalente al legacy o richiede consolidamento
- `Solo legacy`: nessuna route refactor dedicata; il flusso resta nel backend storico
- `Fallback legacy`: route non dedicata nel refactor, intercettata dalla catch-all che rimanda al legacy

## Tabella rotte

| Rotta | Refactor | API | Stato | Note |
|---|---|---|---|---|
| `/` | Si | `GET /api/public/info` | Parziale | Landing nuova; non coincide del tutto con la home autenticata legacy. |
| `/dashboard` | Si | menu + API varie | Parziale | Dashboard nuova, ma convive con moduli ancora legacy/parziali. |
| `/profilo` | Si | endpoint auth/me | Migrato | Profilo utente nel refactor. |
| `/login` | Si | `POST /api/auth/login`, `GET /api/auth/me` | Migrato | Login standard JWT/API. |
| `/login/recovery` | Si | `POST /api/auth/recovery` | Migrato | Recovery credenziali operativo. |
| `/auth/callback` | Si | handoff JWT backend | Migrato | Callback Next per login Google. |
| `/login/google` | No | No | Non applicabile | Non esiste route Next dedicata; il bottone in `/login` chiama backend `/login/gsuite`. |
| `/login/spid` | No | No | Solo legacy | Nessuna UI Next dedicata. |
| `/agenda` | Si | `ComunicazioniApiController` | Migrato | Agenda mensile e dettaglio giorno. |
| `/avvisi` | Si | `ComunicazioniApiController` | Migrato | Lista, dettaglio, read, allegati. |
| `/circolari` | Si | `ComunicazioniApiController` | Migrato | Lista, dettaglio, firma presa visione, allegati. |
| `/colloqui` | Si | `ColloquiApiController` | Migrato | Docenti e famiglie coperti. |
| `/famiglia` | Si | `FamigliaApiController` | Migrato | Dashboard situazione famiglia. |
| `/pagelle` | Si | `FamigliaApiController` | Migrato | Pagelle per periodo. |
| `/richieste` | Si | `RichiesteFamigliaApiController` | Migrato | Invio, lista, dettaglio, annulla, allegati. |
| `/richieste/gestione` | Si | `RichiesteFamigliaApiController` | Migrato | Workflow base destinatari/gestione. |
| `/documenti` | Si | `DocumentiApiController` | Migrato | Piani, programmi, relazioni, maggio, BES. |
| `/coordinatore` | Si | `CoordinatoreApiController` | Migrato | Situazione, assenze, voti aggregati. |
| `/lezioni` | Si | `LezioniApiController` | Migrato | Contesto lezioni presente nel refactor. |
| `/registro/assenze` | Si | controller API registro/assenze | Migrato | Appello e assenze operative. |
| `/registro/note` | Si | `RegistroNoteApiController` | Migrato | CRUD note e provvedimenti. |
| `/registro/firme` | Si | `RegistroApiController` | Parziale | Operativo, ma restano validazioni/casi avanzati condivisi. |
| `/registro/voti` | Si | `VotiApiController` | Parziale | Anche sostegno presente. Il flusso `classe/sostituzione` ora risolve, memorizza, cambia e azzera la cattedra compatibile; resta da consolidare end-to-end con dati reali. |
| `/scuola` | Si | `ScuolaApiController` | Migrato | Sezione contenitore presente. |
| `/scuola/amministratore` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/dirigente` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/istituto` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/sedi` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/corsi` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/classi` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/materie` | Si | `ScuolaApiController` | Migrato | Operativo; resta solo tema minore su `delete`. |
| `/scuola/festivita` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/orario` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/scuola/scrutini` | Si | `ScuolaApiController` | Parziale | Presente e modificabile; la UX e' avanzata anche con azioni bulk sulla pubblicazione esiti, ma il perimetro legacy e' piu ampio. |
| `/scuola/moduli` | Si | `ScuolaApiController` | Parziale | Molto avanzato nel worktree locale; oltre a list/toggle/edit ha ora filtri locali per nome/stato, ma non e' ancora chiuso al 100%. |
| `/scuola/moduliFormativi` | Si | `ScuolaApiController` | Migrato | Operativo. |
| `/docenti` | Si | `DocentiApiController` | Migrato | Sezione contenitore presente. |
| `/docenti/importa` | Si | `ImportApiController` | Migrato | Operativo. |
| `/docenti/modifica` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/docenti/cattedre` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/docenti/staff` | Si | `DocentiApiController` | Migrato | Configurazione staff presente. |
| `/docenti/coordinatori` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/docenti/segretari` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/docenti/responsabiliBes` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/docenti/rspp` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/docenti/rappresentanti` | Si | `DocentiApiController` | Migrato | Operativo. |
| `/alunni` | Si | `AlunniApiController` | Migrato | Sezione contenitore presente. |
| `/alunni/importa` | Si | `ImportApiController` | Migrato | Operativo. |
| `/alunni/modifica` | Si | `AlunniApiController` | Migrato | Operativo. |
| `/alunni/classe` | Si | `AlunniApiController` | Migrato | Operativo. |
| `/alunni/rappresentanti` | Si | `AlunniApiController` | Migrato | Operativo. |
| `/alunni/rappresentantiGenitori` | Si | `AlunniApiController` | Migrato | Operativo. |
| `/ata` | Si | `AtaApiController` | Migrato | Sezione contenitore presente. |
| `/ata/importa` | Si | `ImportApiController` | Migrato | Operativo. |
| `/ata/modifica` | Si | `AtaApiController` | Migrato | Operativo. |
| `/ata/rappresentanti` | Si | `AtaApiController` | Migrato | Operativo. |
| `/segreteria/assenze` | Si | `SegreteriaApiController` | Migrato | Sotto-perimetro assenze presente e operativo. |
| `/segreteria/genitori` | Si | `SegreteriaApiController` | Migrato | Presente nel worktree locale; piu avanti della docs. |
| `/segreteria/scrutini` | Si | `SegreteriaApiController` | Migrato | Presente nel worktree locale; piu avanti della docs. |
| `/sistema` | Si | `SistemaApiController` | Migrato | Sezione contenitore presente. |
| `/sistema/parametri` | Si | `SistemaApiController` | Migrato | Operativo. |
| `/sistema/banner` | Si | `SistemaApiController` | Migrato | Operativo. |
| `/sistema/manutenzione` | Si | `SistemaApiController` | Migrato | Operativo. |
| `/sistema/email` | Si | `SistemaApiController` | Migrato | Operativo. |
| `/sistema/telegram` | Si | `SistemaApiController` | Migrato | Operativo. |
| `/sistema/password` | Si | `SistemaApiController` | Migrato | Operativo. |
| `/sistema/alias` | Si | API alias/auth | Migrato | Ricerca, impersonazione, uscita alias. |
| `/sistema/archivia` | Si | info/diagnostica | Parziale | Pagina presente con collegamenti ai controlli refactor utili (`scrutini`, `documenti`); procedura distruttiva legacy non migrata. |
| `/sistema/nuovo` | Si | info/diagnostica | Parziale | Pagina presente con collegamenti ai moduli refactor rilevanti (`istituto`, `classi`, `scrutini`); workflow completo nuovo anno non equivalente al legacy. |
| `/sistema/aggiorna` | Si | info/diagnostica | Parziale | Workflow di aggiornamento completo non migrato; pagina info con refresh dati esplicito. |
| `/spid/*` | No | backend legacy | Solo legacy | Flusso SPID ancora storico. |
| `/app/login/*` | No | backend legacy | Solo legacy | Mobile app ancora sul backend storico. |
| `/app/prelogin/*` | No | backend legacy | Solo legacy | Prelogin mobile ancora legacy. |
| `/osservazioni/*` | No | non emersa API refactor dedicata | Solo legacy | Osservazioni docente non migrate come sezione autonoma. |
| qualsiasi altra route catturata da `[...slug]` | Fallback | No | Fallback legacy | Rimando esplicito al backend storico tramite catch-all. |

## Sintesi

- `Migrato`: quasi tutto il nucleo applicativo quotidiano.
- `Parziale`: `registro/firme`, `registro/voti`, `scuola/scrutini`, `scuola/moduli`, `sistema/archivia`, `sistema/nuovo`, `sistema/aggiorna`.
- `Solo legacy`: `SPID`, `mobile/prelogin`, `osservazioni`.
- La documentazione in `Docs` e' gia parzialmente superata dal worktree locale almeno su `Google OAuth` e su parte di `Segreteria`.
