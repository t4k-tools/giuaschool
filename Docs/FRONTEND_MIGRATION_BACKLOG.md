# Frontend Migration Backlog

Stato al 2026-04-30 (risincronizzato con codice reale).

Questo documento separa le aree del frontend `refactor/` in:

- migrate e operative
- migrate ma parziali
- non migrate o ancora solo fallback legacy

Il backlog e' allineato al codice attuale del worktree, non a una fotografia storica del progetto.

## Priorita 1

### Registro docente: sostituzioni

- Route nuove: `/lezioni`, `/registro/firme`
- Stato frontend: il contesto docente e il registro firme sono presenti
- Stato backend API: presenti `GET /api/lezioni/contesto`, `GET /api/registro/firme`, `POST/PUT/DELETE /api/registro/lezioni`
- Gap reale:
  - create in sostituzione disponibile
  - create/edit/delete risultano presenti anche sul tratto sostituzione
  - resta da consolidare la parita con il legacy su casi reali e varianti avanzate
- Riferimento tecnico: `RegistroLezioneCreateService`
- Azione consigliata:
  - mantenere allineati backend e UI sui casi `classe` senza `cattedra`
  - completare il tratto condiviso con `E3`

### Registro docente: compresenze e lezioni condivise

- Route nuove: `/registro/firme`
- Stato frontend: CRUD base disponibile
- Stato backend API: presenti endpoint dedicati
- Gap reale:
  - create su slot compatibili/compresenze disponibile nel refactor
  - modifica/cancellazione lezioni condivise risultano presenti nel refactor, ma non ancora consolidate su tutti i casi reali
  - alcuni casi avanzati di trasformazione slot non sono ancora chiusi a parita completa
- Azione consigliata:
  - concentrare la verifica su trasformazioni avanzate, ownership firma e regressioni rispetto al legacy
  - promuovere il modulo a `Migrato` solo dopo validazione su dati reali

### Registro docente: voti sostegno

- Route nuova: `/registro/voti`
- Stato frontend: quadro e CRUD presenti per docente curricolare e sostegno
- Stato backend API: `GET /api/voti/quadro`, `POST/PUT/DELETE /api/voti`; `buildSupportQuadro()` implementato in `VotiService`
- Gap reale:
  - UI sostegno presente con create/edit/delete
  - il tratto `classe/sostituzione` non e' piu bloccante: il refactor risolve, memorizza, cambia e azzera la cattedra compatibile direttamente dalla pagina voti
  - resta da validare end-to-end il flusso con dati reali
- Azione consigliata:
  - testare il flusso completo sostegno con dati reali
  - verificare sul campo i casi limite residui dopo la risoluzione `classe -> cattedra`

### Registro docente: validazione reale

- Route nuove: `/registro/firme`, `/registro/voti`
- Stato frontend: create/edit/delete condivisi e modalita sostegno sono presenti
- Stato backend API: presenti endpoint e service dedicati
- Gap reale:
  - manca ancora un ciclo di verifica end-to-end su dati reali
  - `/registro/firme` appare implementativamente completo, ma i casi avanzati del legacy vanno consolidati prima di dichiararlo chiuso
  - `/registro/voti` resta parziale, ma non piu per assenza di supporto al contesto `classe/sostituzione`: il residuo e' soprattutto di validazione funzionale reale
- Azione consigliata:
  - concentrarsi su smoke test reali per `E1-E4`
  - documentare gli edge case residui invece di lasciare stato implicito

## Priorita 2

### Procedure di sistema

- Route nuove: `/sistema/archivia`, `/sistema/nuovo`, `/sistema/aggiorna`
- Stato frontend: presenti ma con perimetro dichiaratamente parziale
- Stato backend API: solo diagnostica/info, non procedure operative complete
- Gap reale:
  - il refactor non sostituisce ancora i workflow amministrativi distruttivi del legacy
  - le pagine sono pero piu utili del vecchio snapshot documentale: `archivia` e `nuovo` rimandano ai moduli refactor rilevanti, `aggiorna` permette refresh esplicito delle info
- Azione consigliata:
  - mantenere esplicito lo scope ridotto
  - decidere se queste procedure resteranno fuori UI o diventeranno comandi auditati

### Segreteria

- Route nuove: `/segreteria/assenze`, `/segreteria/genitori`, `/segreteria/scrutini`
- Stato frontend: presenti pagine dedicate per assenze, genitori e scrutini
- Stato backend API: `SegreteriaApiController` presente
- Gap reale:
  - il worktree e' piu avanti del vecchio snapshot documentale
  - resta da chiarire se il perimetro attuale copre i casi d'uso segreteria davvero necessari o se mancano ancora sotto-flussi legacy
- Azione consigliata:
  - tenere la sezione classificata `Parziale`
  - consolidare lo scope reale per nuclei funzionali, non come blocco unico

### Accessi esterni

- Route nuove: presenti per `Google OAuth` dentro `/login` + `/auth/callback`; assenti per `SPID` e mobile
- Stato frontend: `recovery` e `Google OAuth` sono migrati; `SPID` e mobile no
- Gap reale:
  - SPID e mobile/prelogin restano storici
- Azione consigliata:
  - separare i filoni `SPID` e `mobile`
  - non accorparli artificialmente nel backlog frontend puro

## Priorita 3

### SPID

- Route nuova: assente
- Stato frontend: assente
- Gap reale: integrazione auth ancora storica

### Google Workspace / OAuth

- Route nuove: login con bottone Google in `/login` + callback `/auth/callback`
- Stato frontend: presente
- Gap reale: flusso migrato, da verificare solo in validazione end-to-end

### Mobile app / prelogin

- Route nuova: assente
- Stato frontend: assente
- Gap reale: perimetro da decidere prima della migrazione

## Gia operative nel refactor

Le sezioni sotto hanno una copertura almeno funzionale di base nel nuovo frontend:

- `/scuola/sedi`
- `/scuola/corsi`
- `/scuola/classi`
- `/scuola/materie`
- `/scuola/festivita`
- `/scuola/orario`
- `/scuola/istituto`
- `/scuola/amministratore`
- `/scuola/dirigente`
- `/scuola/moduliFormativi`
- `/docenti/importa`
- `/docenti/modifica`
- `/docenti/cattedre`
- `/docenti/staff`
- `/docenti/coordinatori`
- `/docenti/segretari`
- `/docenti/responsabiliBes`
- `/docenti/rspp`
- `/docenti/rappresentanti`
- `/alunni/importa`
- `/alunni/modifica`
- `/alunni/classe`
- `/alunni/rappresentanti`
- `/alunni/rappresentantiGenitori`
- `/ata`
- `/ata/importa`
- `/ata/modifica`
- `/ata/rappresentanti`
- `/sistema/parametri`
- `/sistema/banner`
- `/sistema/manutenzione`
- `/sistema/email`
- `/sistema/telegram`
- `/sistema/password`
- `/sistema/alias`
- `/lezioni`
- `/registro/firme`
- `/registro/assenze`
- `/registro/note`
- `/registro/voti`
- `/circolari` — lista, dettaglio, firma presa visione, download allegati (`ComunicazioniApiController` + `ComunicazioniService`)
- `/avvisi` — lista, dettaglio, read, allegati (`ComunicazioniApiController` + `ComunicazioniService`)
- `/agenda` — mese + dettaglio giorno/tipo (`ComunicazioniApiController` + `ComunicazioniService`)
- `/colloqui` — slot docenti, prenotazioni famiglia, conferme/rifiuti, storico (`ColloquiApiController` + `ColloquiService`)
- `/famiglia` — dashboard situazione: voti, assenze, note, lezioni, osservazioni, agenda (`FamigliaApiController` + `FamigliaService`)
- `/pagelle` — consultazione pagelle per periodo (incluso in `FamigliaApiController`)
- `/richieste` — invio, lista, dettaglio, annulla, download allegati (`RichiesteFamigliaApiController` + `RichiesteFamigliaService`)
- `/richieste/gestione` — workflow base di gestione/rimozione per destinatari
- `/documenti` — piani, programmi, relazioni, maggio, BES (`DocumentiApiController`)
- `/coordinatore` — situazione, assenze, voti aggregati (`CoordinatoreApiController`)
- `/login/recovery` — recupero credenziali (`AuthController::recovery`)
- `/segreteria/assenze` — sotto-perimetro assenze segreteria (`SegreteriaApiController`)
- `/segreteria/genitori` — gestione recapiti genitori per alunno (`SegreteriaApiController`)
- `/segreteria/scrutini` — quadro scrutini per alunno/classe (`SegreteriaApiController`)
- `/login` + bottone Google e `/auth/callback` — handoff OAuth verso JWT refactor

## Migrate ma ancora parziali

- `/registro/firme`
- `/registro/voti`
- `/sistema/archivia`
- `/sistema/nuovo`
- `/sistema/aggiorna`
- `/segreteria/assenze`
- `/segreteria/genitori`
- `/segreteria/scrutini`

## Regola pratica per i prossimi interventi

Quando una pagina del refactor esiste, va classificata cosi:

- operativa: esegue davvero il caso d'uso principale
- parziale: visualizza o modifica solo una parte del flusso
- fallback legacy: esiste solo come passaggio verso il vecchio backend

Questo evita di considerare "migrata" una sezione solo perche ha un `page.tsx`.

Nota 2026-04-30 su `/registro/voti`:

- il refactor ora espone anche indicatori espliciti del contesto risolto (`classe -> cattedra`)
- la cattedra compatibile selezionata viene ricordata per classe
- il docente puo cambiare o azzerare l'associazione senza tornare al legacy o passare da errori intermedi

Nota 2026-04-30 su `scuola/scrutini`, `scuola/moduli`, `sistema/*`:

- `/scuola/scrutini` ha ora azioni bulk per impostare o svuotare la pubblicazione esiti su tutti gli anni
- `/scuola/moduli` ha filtri locali per nome/stato che rendono la lista piu usabile
- `/sistema/archivia` e `/sistema/nuovo` collegano i moduli refactor utili ai controlli preliminari
- `/sistema/aggiorna` consente refresh esplicito delle informazioni di sistema
