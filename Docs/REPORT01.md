# Report 01 — Divergenza tra `main` locale e `origin/main`

Data: 2026-04-30

## TL;DR

`main` locale e `origin/main` rappresentano lo **stesso lavoro fatto due volte da due sessioni Claude diverse**, una su un'altra macchina e una qui. Non c'e' materiale unico su `origin` che non sia anche in locale, eccetto:

- 3 file binari (`pdf`/`odt`) che il locale ha **intenzionalmente rimosso** dal commit `2f9b09a4`
- 2 pagine refactor (`segreteria/assenze` e `segreteria/scrutini`) dove il locale ha **deliberatamente cambiato approccio UX** (ricerca manuale al posto di `useDeferredValue`)

In piu' il locale ha gia' **5 commit di lavoro aggiuntivo** che `origin` non ha (incluso il cherry-pick upstream `77026e02`).

**Raccomandazione: force-push con `--force-with-lease`**, dopo aver creato una ref di backup remota per sicurezza. Trade-off accettabile: si perdono 3 messaggi di commit granulari su `origin`, si guadagna una storia pulita e lineare.

---

## Contesto

I due rami:

```
origin/main (3 commit non in locale):
  9c230bb2  feat(E19): Google OAuth → JWT handoff               [2026-04-27 18:27]
  61c0c59a  feat(E22): segreteria completa — genitori e scrutini [2026-04-27 18:20]
  7b4fa471  feat: E11/E17/E21/E22 — documenti BES, recovery...  [2026-04-27 18:12]

main locale (5 commit non su origin):
  5374a8de  docs: strategia upstream e tracking cherry-pick      [2026-04-30]
  35534dc1  Merge: cherry-pick upstream:77026e02                  [2026-04-30]
  e9036992  fix(E1+E4): supplenza per docente di sostegno         [cherry-pick]
  676cfa05  chore: ignora cloni legacy/riferimento dentro refactor/
  2f9b09a4  feat(refactor): nuovi controller API e UI per...     [2026-04-30]
```

Le storie hanno un antenato comune (`40817b42 fix(E4) sostegno updateVote`), quindi non sono storie disgiunte come col rapporto upstream.

## Cosa rappresenta `2f9b09a4` rispetto ai 3 commit `origin`?

I 3 commit su `origin` sono stati fatti il **2026-04-27** da `Gigas <gigas@local>` con co-author `Claude Sonnet 4.6`. Il nostro `2f9b09a4` e' stato fatto il **2026-04-30** sempre da Gigas, ma con co-author `Claude Opus 4.7 (1M context)`. La sessione locale (questa) ha "rifatto" gli stessi 3 epic, ottenendo le stesse feature ma con:

- granularita' diversa (1 commit invece di 3)
- contenuto leggermente piu' ricco (espansione `SegreteriaApiController`, `segreteria/genitori`, ecc.)
- refactor UX diverso su 2 pagine

Il messaggio di commit `2f9b09a4` cita esplicitamente le epic: `E11/E12/E13/E14/E16/E17/E19/E22 + consolidamento E1/E2/E4`. L'informazione semantica delle 3 commit di `origin` e' quindi **gia' contenuta** nel messaggio del commit locale, anche se in forma piu' compressa.

## Analisi differenza file per file

### File presenti **solo su origin** (perdita potenziale se force-push)

| File | Origin (byte) | Local | Note |
|---|---|---|---|
| `Docs/DEPLOY-GUIDA.pdf` | 33635 | 0 (rimosso) | Rimozione intenzionale, esiste `DEPLOY-GUIDA.md` |
| `Docs/MATRICE_MIGRAZIONE_LEGACY_REFACTOR.pdf` | 104407 | 0 (rimosso) | Rimozione intenzionale, esiste `.md` |
| `Docs/ROADMAP_ESECUTIVA_REFACTOR.odt` | 62178 | 0 (rimosso) | Rimozione intenzionale, esiste `.md` |

> Tutti e tre sono binari che il commit locale `2f9b09a4` ha esplicitamente cancellato. Nessuna perdita di informazione: la fonte canonica sono ora le versioni `.md` con `git diff` significativo.

### File presenti **solo su locale** (lavoro che si perderebbe se rebasassimo su origin)

| File | Local (linee) |
|---|---|
| `Docs/CHECKLIST_E2E_REGISTRO_FIRME.md` | 205 |
| `Docs/CHECKLIST_E2E_REGISTRO_VOTI.md` | 226 |
| `Docs/STATO_ROTTE_REFACTOR.md` | 103 |
| `Docs/UPSTREAM.md` | ~200 |
| `Docs/UPSTREAM_1_2.md` | ~60 |

### File presenti su entrambi ma con contenuto diverso

Per **22 file** comuni alla diff `main` vs `origin/main`. Nella stragrande maggioranza dei casi il locale ha **piu' linee** e il delta e' lavoro aggiuntivo (es. `SegreteriaApiController` 498 righe origin → 636 locale, +138 righe; `segreteria/genitori` 261 → 441, +180 righe).

**Eccezione 1: `refactor/src/app/(app)/segreteria/assenze/page.tsx`**

- Origin: usa `useDeferredValue` + auto-search reattivo
- Local: usa `useState` + `handleSearch` con bottone manuale + icona `Search` da lucide

Si tratta di una **scelta UX deliberata** del locale (probabilmente per evitare richieste API a ogni keystroke). Non e' una regressione, e' un cambio di approccio.

**Eccezione 2: `refactor/src/app/(app)/segreteria/scrutini/page.tsx`**

Stessa identica situazione di assenze (stesso refactor `useDeferredValue` → ricerca manuale).

> Decisione esplicita necessaria: la versione "ricerca manuale" e' quella corretta? Se SI, il locale e' allineato. Se NO, va recuperato il `useDeferredValue`.

## Implicazioni delle tre opzioni

### A. Force-push del locale su origin

```bash
# safety net: salviamo lo stato attuale di origin in una ref remota di backup
git push origin origin/main:refs/heads/backup/main-pre-force-2026-04-30

# poi force-push
git push --force-with-lease origin main
```

**Cosa si guadagna**

- Storia pulita e lineare
- `origin/main` riflette esattamente il working state attuale (incluso cherry-pick upstream)
- Niente conflitti
- La `Docs/UPSTREAM.md` e tutto il lavoro recente vanno su origin

**Cosa si perde**

- I 3 messaggi di commit granulari di `origin` (`E11/E17/E21/E22`, `E22 segreteria completa`, `E19 OAuth`) non saranno piu' visibili in `git log` di origin: rimangono solo nel messaggio "bundle" `2f9b09a4`
- L'autorialita' Claude Sonnet 4.6 dei tre commit originali viene sostituita da Claude Opus 4.7 (1M context) sul commit locale

**Rischi**

- Se qualcuno altro ha pullato `origin/main` nel frattempo e ci ha lavorato, vedra' la sua storia divergere. `--force-with-lease` ci protegge dal force-pushare se nel frattempo origin e' cambiato (sarebbe bloccato e dovremmo rifare il fetch).
- Il backup branch e' la tua via di ripristino se ti accorgi che hai bisogno di tornare a origin: `git push -f origin backup/main-pre-force-2026-04-30:main`

### B. Merge `origin/main` nel locale

```bash
git checkout main
git merge origin/main
```

**Cosa si guadagna**

- Storia preserva i 3 commit di origin (con i loro messaggi originali)
- Nessuna operazione distruttiva su origin

**Cosa si perde**

- Si introduce un commit di merge "octopus" con conflitti garantiti su decine di file (perche' lo stesso contenuto e' stato scritto due volte in modi diversi)
- Probabilmente bisognera' risolvere conflitti manualmente file per file scegliendo "ours" quasi sempre, riproducendo il risultato del force-push ma con piu' rumore

**Rischi**

- Resa storia: il `git log --graph` post-merge sara' ingestibile
- Rischio di errori di risoluzione conflitti che reintroducono codice obsoleto (es. il `useDeferredValue` rimosso)
- Tempo richiesto: stimato 30-60 minuti vs 2 minuti per force-push

### C. Tenere divergenti per ora

Lasciare `main` e `origin/main` divergenti, lavorare solo localmente, decidere dopo. Quando si decide, le opzioni sono comunque A o B.

**Quando ha senso**

- Se ci sono dubbi su cosa contenga davvero `origin/main` (oggi, dopo questa analisi, non e' piu' il caso)
- Se l'altra macchina che ha pushato i 3 commit potrebbe pushare ancora altro lavoro che non vogliamo perdere

## Verifica preliminare consigliata

Prima di force-push, una sola domanda da rispondere:

> **C'e' un'altra macchina/sessione che potrebbe ancora pushare lavoro su `origin/main`?**

- Se SI: chiarire prima da li' (commit pendenti?), poi decidere
- Se NO (questa e' la macchina di lavoro principale): procedere con A

Indicatore secondario: l'ultimo push su origin e' del 2026-04-27. Sono passati 3 giorni in cui tutto il lavoro e' stato qui. Probabilmente la sessione `Sonnet 4.6` su altra macchina e' stata abbandonata e si e' continuato su questa con `Opus 4.7`.

## Raccomandazione finale

**Procedere con A (force-push con `--force-with-lease`)**, dopo aver:

1. Creato una ref di backup remota `backup/main-pre-force-2026-04-30`
2. Verificato un'ultima volta che il locale build/lint passi (cosi' non pushiamo codice rotto)
3. Confermato a voce che nessun'altra sessione sta lavorando su `origin/main`

Motivo: il locale rappresenta **lo stesso intento** di `origin` ma con piu' lavoro recente sopra. La granularita' di commit di origin non vale la complessita' di un merge confuso. Il backup remoto ti rende l'operazione reversibile.

## Sequenza comandi proposta

```bash
# 1. backup di origin attuale (irreversibile solo finche' non lo cancelli)
git push origin origin/main:refs/heads/backup/main-pre-force-2026-04-30

# 2. (opzionale) verifica build locale del refactor
cd refactor && npm run build && cd ..

# 3. force-push protetto
git push --force-with-lease origin main

# 4. verifica
git fetch origin
git log --oneline origin/main -10
```

Se a posteriori serve rollback:

```bash
git push -f origin refs/heads/backup/main-pre-force-2026-04-30:main
```

## Aspetti collaterali da tenere d'occhio

1. **Token GitHub esposto** nel remote del clone `refactor/giua-registro/`. Indipendente da questa decisione, **da revocare**.
2. **Lavoro di refactor UX** (ricerca manuale vs `useDeferredValue`) merita una decisione esplicita di prodotto: anche se il force-push lo "vince" automaticamente, scriviamolo nel registro decisioni se vogliamo che resti documentato.
3. La sessione precedente con `Claude Sonnet 4.6` (autore originale dei 3 commit su origin) deve essere chiusa formalmente per evitare che pubblichi altri commit non coordinati.

## Conclusione

Le 3 opzioni in tabella:

| Opzione | Tempo | Rischio | Pulizia storia | Reversibile |
|---|---|---|---|---|
| A. Force-push con backup | ~2 min | Basso (con `--force-with-lease`) | Alta | Si (via backup ref) |
| B. Merge | ~30-60 min | Medio (errori di risoluzione conflitti) | Bassa | No (commit di merge resta in storia) |
| C. Aspettare | 0 min | Basso | n/a | n/a |

**A e' la scelta consigliata.**
