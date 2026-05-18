# Rapporto Upstream e Strategia di Sincronizzazione

Ultimo aggiornamento: 2026-04-30

Questo documento descrive il rapporto tra il nostro fork `t4k-tools/giua-registro` e il repository ufficiale `iisgiua/giuaschool`, e propone una strategia operativa per gestire lo scambio di codice tra i due.

## Premessa

- **Upstream ufficiale**: https://github.com/iisgiua/giuaschool (branch `master`)
- **Nostro fork**: https://github.com/t4k-tools/giua-registro (branch `main`)
- **Cloni locali di riferimento**: `refactor/giuaschool/` e `refactor/giua-registro/` (in `.gitignore`)

L'upstream e' un'app Symfony/Twig monolitica. Il nostro fork la trasforma architetturalmente in:

- backend Symfony esteso con API REST autenticate via JWT
- frontend Next.js separato in `refactor/`
- nuovi service di dominio in `src/src/Service/`
- documentazione di migrazione in `Docs/`

## Stato del drift al 2026-04-30

L'upstream e' molto attivo: oltre 200 commit nel solo 2025-2026. La nostra base di partenza e' uno snapshot precedente, e finora non sono stati eseguiti merge sistematici dall'upstream.

Conseguenza: stiamo perdendo fix e feature recenti (in particolare aree dove l'upstream sta ancora correggendo bug che ci servono anche a noi: supplenza sostegno, proposte di voto, configurazione pagina voti).

## Differenze strutturali

### Cosa esiste solo nel nostro fork

**Frontend**

- Tutta la directory `refactor/` (Next.js + JWT client + componenti UI)

**Backend (nuovi controller API)**

- `Api/AlunniApiController.php`, `Api/AtaApiController.php`, `Api/AuthController.php`, `Api/ColloquiApiController.php`, `Api/ComunicazioniApiController.php`, `Api/ConfigController.php`, `Api/CoordinatoreApiController.php`, `Api/DocentiApiController.php`, `Api/DocumentiApiController.php`, `Api/FamigliaApiController.php`, `Api/ImportApiController.php`, `Api/LezioniApiController.php`, `Api/MenuController.php`, `Api/PublicController.php`, `Api/RegistroApiController.php`, `Api/RegistroNoteApiController.php`, `Api/RichiesteFamigliaApiController.php`, `Api/ScuolaApiController.php`, `Api/SegreteriaApiController.php`, `Api/SistemaApiController.php`, `Api/VotiApiController.php`

**Backend (nuovi service di dominio)**

- `Service/ColloquiService.php`, `Service/ComunicazioniService.php`, `Service/FamigliaService.php`, `Service/LessonContextService.php`, `Service/RegistroAssenzeService.php`, `Service/RegistroFirmeService.php`, `Service/RegistroLezioneCreateService.php`, `Service/RegistroNoteService.php`, `Service/RichiesteFamigliaService.php`, `Service/VotiService.php`

**Infrastruttura**

- Stack Docker (root): `Dockerfile`, `docker-compose.yml`, `docker/`, `Dockerfile.production`
- Cloudflare Tunnel: `config.yml`, credenziali in `.json`
- Init DB SQL: `src/src/Install/{create-db,drop-db,init-db}.sql`
- Util: `apache-vhost.conf`, `check_it.sh`, `phpinfo.php`, `.env-dist`

**Configurazione**

- `lexik/jwt-authentication-bundle ^3.2`
- `nelmio/cors-bundle ^2.6`
- Chiavi JWT in `src/config/jwt/`
- `config/packages/lexik_jwt_authentication.yaml` e `nelmio_cors.yaml`

**Documentazione**

- Tutto `Docs/`

### Cosa abbiamo modificato rispetto all'upstream

- 14 controller Twig (`Alunni`, `Ata`, `Avvisi`, `Colloqui`, `Docenti`, `Login`, `OAuth2`, `Registro`, `Richieste`, `Scrutinio`, `Scuola`, `Sistema`, `Spid`, `Voti`)
- 5 entity (`Colloquio`, `DefinizioneRichiesta`, `Istituto`, `Log`, `Utente`)
- `Security/GSuiteAuthenticator.php` e `config/packages/security.yaml`
- Asset pubblici (`main.css`, `tema.css`)
- `config/services.yaml`, `composer.json/lock`, `bundles.php`

### Cosa esiste solo nell'upstream

> Lista non esaustiva — solo gli elementi rilevanti per decidere se importare o ignorare.

| Area | Upstream | Stato lato fork |
|---|---|---|
| Suite test (Behat + PHPUnit) | `tests/`, `phpunit.xml`, `behat.yml`, `.env.test`, `src/DataFixtures/`, `Command/AliceLoadCommand.php` | Assente |
| Modulo Autorizzazioni | `AutorizzazioniController`, entity `DefinizioneAutorizzazione`, form, repository, templates | Assente |
| Modulo Consultazioni | entity `DefinizioneConsultazione`, repository, templates richieste | Assente |
| Eventi utente | `UtenteModificatoEvent`, `UtenteModificatoListener` | Assente |
| SPID MIM | `Security/MimSpidAuthenticator.php`, asset `public/spid/`, template `spid.html.twig` | Assente nel fork (in agenda come `E18`) |
| Form pagina voti | `Form/PaginaVotiType.php`, template `lezioni/configura_voti.html.twig` | Assente |
| Refactor automatici | `rector.php` | Assente |
| Metadata pubblica | `publiccode.yml` | Assente |
| Aggiornamento DB | `src/Install/update-v1.6.2-build` | Assente |

## Commit upstream recenti potenzialmente rilevanti

| Hash | Data | Messaggio | Rilevanza per noi |
|---|---|---|---|
| 77026e02 | 2026-04-27 | Fix: supplenza per docente di sostegno | **Alta** — tocca direttamente `E1` e `E4` (P0) |
| 11401a1e | 2026-03-26 | Modifica: visualizzazione lezioni per i genitori | Media — riguarda area `/famiglia` (`E8`, gia migrato) |
| de803ab4 | 2026-03-13 | Modifica: gestione autorizzazioni | Bassa per oggi — modulo non ancora importato |
| 45b60f9a | 2026-03-07 | Rimosso: vecchio supporto SPID | Alta se decidiamo di affrontare `E18` |
| 09c3400a | 2026-02-09 | Aggiunta: gestione SPID/CIE (gateway MIM) | Alta per `E18` |
| 0455aa67 | 2026-02-06 | Fix: autenticazione SPID via gateway MIM | Alta per `E18` |
| 696d0917 | 2026-01-30 | Fix: proposte di voto | Media — area `E13` scrutini |
| 7e83c666 | 2026-01-12 | Aggiunta: implementazione base SPID MIM | Alta per `E18` |
| 8c91bf12 | 2026-01-12 | Aggiunta: prima parte gestione autorizzazioni | Bassa — feature nuova upstream |
| 0ece06dd | 2025-12-08 | Fix registro mensile lezioni | Media — tocca area lezioni/firme |
| 7694caae | 2025-10-14 | Fix: voti su ritardo, e altri minori | Media — area voti |
| 17bbe31a | 2025-10-06 | Modifica: configurazione pagina voti | Media — area voti |

## Opzioni strategiche

### Opzione A — Hard fork (no sync)

Trattare l'upstream come ispirazione storica e basta. Nessun merge, nessun cherry-pick.

**Pro**: zero overhead di manutenzione, totale liberta architetturale.

**Contro**: perdiamo bugfix e feature gratis, doppio lavoro su correzioni gia fatte upstream, drift crescente che rende ogni eventuale futuro merge piu costoso.

### Opzione B — Cherry-pick selettivo dei fix critici

Mantenere il drift architetturale (refactor Next.js + API JWT) ma portare nel fork solo i commit upstream che risolvono bug o coprono casi reali nel perimetro che condividiamo (entita, regole di business, util, controller Twig dietro al refactor).

**Pro**: prendiamo il valore senza accettare regressioni o feature non volute.

**Contro**: serve un processo manuale; conflitti probabili sui controller toccati da entrambe le parti.

### Opzione C — Periodic rebase con upstream `master`

Sincronizzare regolarmente (es. mensile) il fork con `master` upstream e risolvere i conflitti.

**Pro**: il fork resta una "sovrapposizione" pulita di feature nostre sopra l'upstream.

**Contro**: alto costo di gestione conflitti; rischio di rompere il refactor a ogni rebase; inadatto se le entity divergono troppo.

### Opzione D — Tracking diff dichiarativo

Mantenere il fork come progetto autonomo ma documentare esplicitamente in `Docs/` (questo file e affini) quali commit upstream sono stati valutati e con che esito (`importato`, `non rilevante`, `da rivalutare`).

**Pro**: trasparenza, base per cherry-pick selettivo.

**Contro**: serve disciplina; il file va aggiornato con cadenza regolare.

## Strategia consigliata

> **Combinare B + D**: cherry-pick selettivo guidato da un registro di valutazione dei commit upstream.

Motivi:

- Il drift architetturale e' troppo ampio per un rebase pulito (Opzione C non scala).
- Ignorare l'upstream (Opzione A) ci fa perdere bugfix dello stesso dominio (vedi tabella commit recenti).
- Senza tracciamento dichiarativo (Opzione D) il cherry-pick diventa caotico.

### Workflow operativo

1. **Aggiornare il clone di riferimento** ogni 2-4 settimane:

   ```bash
   cd refactor/giuaschool
   git fetch origin
   git log --oneline master..origin/master  # commit nuovi rispetto al check precedente
   ```

2. **Triagiare** i commit nuovi e classificarli:

   - `importa` — bugfix o feature nel perimetro che condividiamo
   - `valuta dopo` — feature interessante ma non urgente
   - `ignora` — fuori scope (es. test che non abbiamo, feature che non vogliamo)

3. **Cherry-pick** dei commit `importa` su un branch dedicato:

   ```bash
   cd /home/gigas/Progetti/registro
   git checkout -b sync/upstream-YYYY-MM-DD
   git remote add upstream-giuaschool /home/gigas/Progetti/registro/refactor/giuaschool  # locale
   git fetch upstream-giuaschool master
   git cherry-pick <hash-upstream>
   ```

4. **Risolvere i conflitti** con preferenza per le nostre modifiche se toccano file che il refactor ha gia riscritto (es. `Controller/Api/*` non esiste upstream, ma se l'upstream cambia un service condiviso bisogna riconciliarlo).

5. **Validare** che il refactor Next.js continui a funzionare contro il backend aggiornato (smoke test su `/lezioni`, `/registro/*`, `/famiglia` come da `Docs/CHECKLIST_E2E_*`).

6. **Aggiornare** la sezione "Registro decisioni" qui sotto.

### Cosa NON cherry-pickare

- Test (`tests/`, `tests/Behat/*`) e fixtures (`src/DataFixtures/*`) finche non decidiamo di importare la suite test in blocco — vanno trattati come decisione separata.
- Modifiche a template Twig di pagine che il refactor ha gia migrato (es. `/circolari`, `/avvisi`, `/famiglia`, `/colloqui`): la UI di quelle aree e' ora in Next.js, non in Twig.
- Feature nuove upstream non chieste dal nostro perimetro (es. `Autorizzazioni`, `Consultazioni`) finche non c'e' una decisione esplicita.

### Cosa importare con priorita

1. `77026e02` (supplenza sostegno) — sblocca validazione `E1` e `E4`.
2. `696d0917` (proposte di voto) — area `E13` ancora `Parziale`.
3. `7694caae` + `17bbe31a` (voti su ritardo, configurazione pagina voti) — area voti.
4. `0ece06dd` (registro mensile lezioni) — area lezioni/firme.
5. Quando si affronta `E18` (SPID): blocco `7e83c666` + `0455aa67` + `09c3400a` + `45b60f9a` da valutare insieme come pacchetto MIM.

## Decisioni gia prese

- **Tutto il frontend Next.js (`refactor/`) resta nostro**, non viene riallineato con Twig upstream.
- **Le procedure distruttive di sistema (`E15`)** rimangono fuori dalla UI refactor; non importiamo workflow upstream equivalenti.
- **Il branding** del fork (e dei messaggi UI) restera differenziato; eventuali stringhe upstream vanno adattate al nostro contesto.

## Registro decisioni cherry-pick

> Aggiornare ogni volta che si valuta un commit upstream. Formato: `hash` — `data triage` — `decisione` — `note`.

| Hash | Triage | Decisione | Note |
|---|---|---|---|
| 77026e02 | 2026-04-30 | Importato il 2026-04-30 come `e9036992` (branch `sync/77026e02-supplenza-sostegno`) | Conflitto solo su `RegistroController.php`: combinato il guard `$cattedra &&` del fork con il nuovo `&& !$sostituzioneSostegno` upstream nei due controlli del campo `moduloFormativo`. `RegistroUtil.php` e `CattedraRepository.php` applicati puliti. Sintassi PHP verificata, validazione end-to-end ancora da fare. Da valutare: allineamento dei service refactor (`VotiService`, `RegistroLezioneCreateService`, `LessonContextService`) con `Cattedra::docenteSostegno()` |
| 11401a1e | 2026-04-30 | Valuta dopo | Vista lezioni genitori; il refactor ha gia `/famiglia?tab=lezioni`, capire se il fix backend ci serve comunque |
| de803ab4 | 2026-04-30 | Ignora per ora | Modulo Autorizzazioni non importato; rivalutare se serve |
| 45b60f9a | 2026-04-30 | Bloccato da `E18` | Rimozione vecchio SPID; ha senso solo se importiamo MIM SPID |
| 09c3400a | 2026-04-30 | Bloccato da `E18` | Pacchetto MIM da importare insieme |
| 0455aa67 | 2026-04-30 | Bloccato da `E18` | Pacchetto MIM da importare insieme |
| 7e83c666 | 2026-04-30 | Bloccato da `E18` | Pacchetto MIM da importare insieme |
| 696d0917 | 2026-04-30 | Da importare | Area `E13` scrutini; verificare conflitti su entity `DefinizioneRichiesta` e controller scrutini |
| 7694caae | 2026-04-30 | Da importare | Voti su ritardo; verificare contro `VotiService` nostro |
| 17bbe31a | 2026-04-30 | Valuta dopo | Configurazione pagina voti coinvolge form `PaginaVotiType` non importato |
| 0ece06dd | 2026-04-30 | Da importare | Fix registro lezioni; rilevante per `E1`/`E2` |
| 8c91bf12 | 2026-04-30 | Ignora per ora | Modulo Autorizzazioni non importato |

## Manutenzione di questo documento

- Aggiornare la tabella commit recenti dopo ogni `git fetch` upstream rilevante.
- Aggiornare il registro decisioni a ogni triage.
- Aggiornare la sezione "Cosa esiste solo nell'upstream" se l'upstream introduce moduli interi nuovi che decidiamo di valutare.
- Quando un commit upstream viene effettivamente cherry-picked, nominare nel commit message il riferimento `upstream:<hash>` per tracciabilita.
