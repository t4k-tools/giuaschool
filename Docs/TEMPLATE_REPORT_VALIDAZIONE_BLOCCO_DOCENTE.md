# Template Report Validazione Blocco Docente

Ultimo aggiornamento: 2026-04-30

Questo template serve per registrare in modo uniforme la validazione end-to-end del blocco docente, con focus su:

- `/registro/firme`
- `/registro/voti`

Documenti di riferimento:

- [CHECKLIST_E2E_REGISTRO_FIRME.md](./CHECKLIST_E2E_REGISTRO_FIRME.md)
- [CHECKLIST_E2E_REGISTRO_VOTI.md](./CHECKLIST_E2E_REGISTRO_VOTI.md)
- [MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md](./MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md)
- [ROADMAP_ESECUTIVA_REFACTOR.md](./ROADMAP_ESECUTIVA_REFACTOR.md)

## Test session

- Data:
- Ambiente:
- Commit / worktree:
- Tester:
- Dataset usato:
- Legacy confrontato:

## Regole di classificazione

- `OK`: comportamento corretto e ripetibile
- `Warning`: comportamento corretto ma con limite UX, testo ambiguo o passaggio superfluo
- `Bloccante`: errore funzionale reale, regressione rispetto al legacy, perdita dati, salvataggio errato o flusso non usabile

## Report Registro Firme

### Esito sintetico

- Stato complessivo:
- Verdict:
  - `Promuovibile a Migrato`
  - `Resta Parziale`
- Note sintetiche:

### Casi eseguiti

| ID | Caso | Contesto | Atteso | Reale | Esito | Legacy uguale? | Note |
|---|---|---|---|---|---|---|---|
| F1 | Nuova lezione semplice | `cattedra` |  |  |  |  |  |
| F2 | Nuova lezione in sostituzione | `classe/sostituzione` |  |  |  |  |  |
| F3 | Compresenza su slot compatibile |  |  |  |  |  |  |
| F4 | Trasformazione slot gia occupato |  |  |  |  |  |  |
| F5 | Modifica lezione condivisa |  |  |  |  |  |  |
| F6 | Delete sola firma |  |  |  |  |  |  |
| F7 | Delete con lezione condivisa |  |  |  |  |  |  |

### Bug emersi

| ID | Priorita | Caso | Descrizione | Impatto | Riproducibilita | Azione proposta |
|---|---|---|---|---|---|---|
| FIRME-1 | P0/P1/P2 |  |  |  |  |  |

### Valutazione finale firme

- Cosa e' chiuso davvero:
- Cosa resta da correggere:
- Cosa va solo documentato:

## Report Registro Voti

### Esito sintetico

- Stato complessivo:
- Verdict:
  - `Promuovibile a Migrato`
  - `Resta Parziale`
- Note sintetiche:

### Casi eseguiti

| ID | Caso | Contesto | Atteso | Reale | Esito | Legacy uguale? | Note |
|---|---|---|---|---|---|---|---|
| V1 | Quadro voti standard | `cattedra` |  |  |  |  |  |
| V2 | Quadro voti da sostituzione | `classe/sostituzione` |  |  |  |  |  |
| V3 | Risoluzione automatica cattedra | `classe/sostituzione` |  |  |  |  |  |
| V4 | Cambio rapido cattedra | `classe/sostituzione` |  |  |  |  |  |
| V5 | Azzera associazione classe-cattedra | `classe/sostituzione` |  |  |  |  |  |
| V6 | Create voto curricolare |  |  |  |  |  |  |
| V7 | Edit voto curricolare |  |  |  |  |  |  |
| V8 | Delete voto curricolare |  |  |  |  |  |  |
| V9 | Create voto sostegno |  |  |  |  |  |  |
| V10 | Edit voto sostegno |  |  |  |  |  |  |
| V11 | Delete voto sostegno |  |  |  |  |  |  |
| V12 | Caso studente assente / `confirmAbsent` |  |  |  |  |  |  |
| V13 | Vincoli data e periodo |  |  |  |  |  |  |
| V14 | Badge e contesto mostrato in UI |  |  |  |  |  |  |

### Bug emersi

| ID | Priorita | Caso | Descrizione | Impatto | Riproducibilita | Azione proposta |
|---|---|---|---|---|---|---|
| VOTI-1 | P0/P1/P2 |  |  |  |  |  |

### Valutazione finale voti

- Cosa e' chiuso davvero:
- Cosa resta da correggere:
- Cosa va solo documentato:

## Triage finale unico

### P0

- 

### P1

- 

### P2

- 

## Decisione finale

- `/registro/firme`:
- `/registro/voti`:
- Aggiornare docs:
  - [ ] `MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md`
  - [ ] `ROADMAP_ESECUTIVA_REFACTOR.md`
  - [ ] `FRONTEND_MIGRATION_BACKLOG.md`
  - [ ] `STATO_ROTTE_REFACTOR.md`

## Note libere

- 
