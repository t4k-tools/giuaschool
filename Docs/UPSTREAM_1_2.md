# Spiegazione discorsiva dei punti 1 e 2 di UPSTREAM.md

Ultimo aggiornamento: 2026-04-30

Questo documento accompagna `UPSTREAM.md` e ne spiega le prime due sezioni in modo discorsivo, per chi prende in mano il progetto senza contesto pregresso.

## Punto 1 — Premessa

Sto fissando i tre attori in gioco e come sono collegati, perche' senza questo non si capisce di cosa stiamo parlando dopo.

### I tre repository

- **`iisgiua/giuaschool`** e' il progetto originale, mantenuto dall'IIS Giua. E' un'applicazione Symfony "classica": backend PHP che genera le pagine HTML usando il template engine Twig. Quando l'utente clicca su un link, il server PHP genera tutto l'HTML e lo manda al browser. Lo chiamo "upstream" perche' sta a monte: noi siamo nati come fork di questo.
- **`t4k-tools/giua-registro`** e' il nostro fork. E' partito come copia di giuaschool ma poi ha preso una direzione diversa.
- **I due cloni locali in `refactor/`** (`giuaschool/` e `giua-registro/`) sono solo **copie di lavoro sul disco**, scaricate per poter fare confronti senza interrogare ogni volta GitHub. Sono nel `.gitignore` perche' non servono al progetto, sono "materiale da scrivania". Sono importanti per chi deve confrontare i due repo, ma non vanno ne' distribuiti ne' committati.

### Cosa abbiamo deciso di cambiare rispetto all'upstream

L'upstream e' monolitico — backend e frontend stanno insieme nello stesso processo PHP. Noi stiamo facendo una cosa diversa:

- il backend Symfony **resta**, ma viene "aperto" verso l'esterno con delle API REST (endpoint `/api/...` che parlano JSON), protette con token JWT
- il frontend viene **separato** in un'app Next.js indipendente (la cartella `refactor/`), che vive nel browser e chiama le API
- abbiamo aggiunto dei **service** in `src/src/Service/` — sono classi PHP che contengono la logica di business riusabile dai nuovi controller API (es. `VotiService`, `ColloquiService`)
- e abbiamo i **`Docs/`** che tracciano il viaggio della migrazione

Questo e' importante perche' spiega perche' molti dei punti successivi del documento dicono "non riallineiamo i template Twig": noi quei template li stiamo abbandonando, sostituiti dalle pagine Next.

## Punto 2 — Stato del drift

"Drift" qui significa **deriva**: due barche partite dallo stesso punto che, col tempo, si sono allontanate. Il termine si usa proprio quando un fork e l'upstream divergono e nessuno fa piu' la fatica di tenerli sincronizzati.

### I numeri concreti

L'upstream e' **molto attivo**: nel solo periodo 2025-2026 ha fatto piu' di 200 commit. Significa che chi mantiene `iisgiua/giuaschool` continua a:

- correggere bug
- aggiungere feature nuove (es. SPID via gateway MIM, modulo Autorizzazioni, fix sulle proposte di voto)
- mantenere e aggiornare i test

**Noi invece** siamo partiti da uno snapshot di `giuaschool` (un certo commit nel passato) e da quel momento abbiamo lavorato solo sul nostro fork, senza mai tornare a "scaricare" gli aggiornamenti dell'upstream. Quindi la nostra base di codice si e' fermata a un certo punto, mentre l'upstream e' andato avanti.

### Perche' e' un problema concreto, non solo teorico

L'esempio chiave nel documento e' il commit `77026e02` del 27 aprile 2026: l'upstream ha scritto **"Fix: supplenza per docente di sostegno"**.

Ora guarda cosa abbiamo nei nostri P0 ancora aperti:

- `E1` Sostituzioni — parziale
- `E4` Voti sostegno — parziale

L'upstream sta correggendo bug **esattamente nella stessa area dove noi stiamo cercando di chiudere i gap**. Se non guardiamo il loro fix, rischiamo di:

1. lavorare per scoprire e correggere lo stesso bug che loro hanno gia' risolto (lavoro doppio)
2. lasciarlo non corretto perche' non sapevamo che esistesse (regressione)
3. correggerlo in modo diverso e poi avere conflitti se mai ci sincronizzassimo

Stessa storia per "Fix: proposte di voto" (gennaio 2026), che tocca l'area scrutini (`E13`), e per "Fix: voti su ritardo" (ottobre 2025), area voti.

### In sintesi

Il drift non e' solo un problema di "siamo indietro", e' un problema di **valore che stiamo lasciando sul tavolo**. L'upstream sta facendo gratis lavoro che riguarda direttamente codice che condividiamo (entita', util, regole di business), e noi non lo stiamo prendendo.

Il resto di `UPSTREAM.md` (punti 3-8) parte da questa constatazione e propone una strategia per fermare la deriva senza buttare via il lavoro architetturale che abbiamo fatto noi.
