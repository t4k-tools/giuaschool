# Indice Refactor Registro

Ultimo aggiornamento: 2026-04-30

Questo documento raccoglie i riferimenti principali per seguire la migrazione `legacy -> refactor` del progetto `registro`.

## Documenti chiave

- [Matrice Migrazione Legacy -> Refactor](./MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md)
  Stato sintetico modulo per modulo, con classificazione `Migrato`, `Parziale`, `Solo legacy`, `Fallback legacy`.

- [Stato Rotte Refactor](./STATO_ROTTE_REFACTOR.md)
  Snapshot route-per-route del worktree attuale, utile come fonte di verita quando matrice e backlog sono in riallineamento.

- [Frontend Migration Backlog](./FRONTEND_MIGRATION_BACKLOG.md)
  Backlog frontend allineato al codice attuale, con focus sui gap reali ancora aperti.

- [Roadmap Esecutiva Refactor](./ROADMAP_ESECUTIVA_REFACTOR.md)
  Backlog esecutivo con priorita `P0/P1/P2`, release suggerite, owner consigliati e definition of done.

- [Issues Refactor Backlog](./ISSUES_REFACTOR_BACKLOG.md)
  Issue markdown pronte da copiare nel tracker per le epic `E1-E22`.

## Lettura consigliata

1. Parti dalla [Matrice Migrazione Legacy -> Refactor](./MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md) per capire cosa e' gia migrato davvero.
2. Usa la [Roadmap Esecutiva Refactor](./ROADMAP_ESECUTIVA_REFACTOR.md) per pianificare release e ownership.
3. Usa [Issues Refactor Backlog](./ISSUES_REFACTOR_BACKLOG.md) per aprire issue operative senza riscrivere il contesto.
4. Consulta il [Frontend Migration Backlog](./FRONTEND_MIGRATION_BACKLOG.md) quando serve dettagliare i gap UI/UX del `refactor`.

## Priorita correnti

### P0 — ancora aperti

- `E1` Registro docente: sostituzioni (parziale)
- `E2` Registro docente: compresenze e slot gia occupati (parziale)
- `E4` Voti sostegno — codice e UI presenti; il contesto `classe/sostituzione` nel refactor voti e' avanzato, manca validazione end-to-end

### Migrati (aggiornamento 2026-04-29)

- `E5` Circolari — **Migrato** (`ComunicazioniApiController` + UI completa)
- `E6` Avvisi e agenda — **Migrato** (`ComunicazioniApiController` + UI `/avvisi` e `/agenda`)
- `E7` Colloqui — **Migrato** (`ColloquiApiController` + UI docente e famiglia)
- `E8` Portale famiglie: situazione — **Migrato** (`FamigliaApiController` + UI con tab)
- `E9` Portale famiglie: pagelle — **Migrato**
- `E10` Portale famiglie: richieste minime — **Migrato** (`RichiesteFamigliaApiController` + UI CRUD)
- `E11` Documenti didattici e BES — **Migrato** (`DocumentiApiController` + UI `/documenti`)
- `E12` Richieste famiglia complete — **Migrato** (`/richieste/gestione` + workflow base)
- `E13` Scrutini completi — **Migrato** (`/scuola/scrutini` + update per periodo)
- `E14` Moduli richiesta completi — **Migrato** (`/scuola/moduli` + update strutturato)
- `E16` Coordinatore — **Migrato** (`CoordinatoreApiController` + UI `/coordinatore`)
- `E17` Recovery password — **Migrato** (`/login/recovery` + `POST /api/auth/recovery`)
- `E19` Google Workspace / OAuth — **Migrato** (bottone login in `/login` + handoff JWT su `/auth/callback`)

### P1 — prossimi

- `E15` Archiviazione / nuovo anno / aggiornamento
- `E22` Segreteria — area presente nel refactor (`assenze`, `genitori`, `scrutini`), da consolidare come perimetro funzionale reale

Nota 2026-04-30:

- `E13` e `E14` restano migrati e hanno fatto un passo avanti lato UX nel worktree (`bulk actions` su scrutini, filtri locali su moduli)
- `E15` resta parziale, ma le pagine `sistema/*` sono ora piu orientate ai controlli reali dentro il refactor

### Sequenza suggerita

1. Consolidare il blocco docente: `E1 + E2 + E4`
2. Chiudere le aree amministrative parziali: `E15 + E22`
3. Attaccare i flussi di accesso ancora storici: `E18 + E20`

## Regola di manutenzione documentale

Quando cambia lo stato di una epic o di un modulo:

- aggiornare prima [MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md](./MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md)
- allineare o verificare [STATO_ROTTE_REFACTOR.md](./STATO_ROTTE_REFACTOR.md) se il dubbio riguarda route/API realmente presenti nel worktree
- aggiornare poi [FRONTEND_MIGRATION_BACKLOG.md](./FRONTEND_MIGRATION_BACKLOG.md) se il cambio impatta il frontend
- aggiornare infine [ROADMAP_ESECUTIVA_REFACTOR.md](./ROADMAP_ESECUTIVA_REFACTOR.md) e [ISSUES_REFACTOR_BACKLOG.md](./ISSUES_REFACTOR_BACKLOG.md) se cambiano backlog, release o definition of done
