# Report anomalie registro elettronico ACIIEF

Data: 2026-05-04
Ambiente: produzione `registro.efor.it`
Stato DB: `giuaschool` su `registro_db` (MySQL 8.0)

Questo report raccoglie tutte le anomalie emerse durante il setup di produzione del registro, classificate per gravità e ambito. Serve come **lista lavorabile** per chi deve mettere mano al sistema.

## Indice

1. [Sintesi per priorità](#1-sintesi-per-priorità)
2. [Anomalie dati anagrafici](#2-anomalie-dati-anagrafici)
3. [Anomalie configurazione](#3-anomalie-configurazione)
4. [Anomalie codice e architettura](#4-anomalie-codice-e-architettura)
5. [Anomalie risolte in questa sessione](#5-anomalie-risolte)
6. [Raccomandazioni operative](#6-raccomandazioni-operative)

---

## 1. Sintesi per priorità

| ID | Anomalia | Priorità | Stato |
|---|---|---|---|
| A1 | 18/18 classi senza coordinatore | 🔴 P0 | aperta |
| A2 | 18/18 classi senza segretario | 🔴 P0 | aperta |
| A3 | 0 slot orario assegnati ai 2 nuovi orari (mattina, serale) | 🔴 P0 | aperta |
| A4 | Email/SMTP non configurati | 🟡 P1 | aperta |
| A5 | 0 responsabili BES | 🟡 P1 | aperta |
| A6 | 0 RSPP | 🟡 P1 | aperta |
| A7 | 0 utenti Staff (collaboratori dirigente) | 🟡 P1 | aperta |
| A8 | Duplicato Mitrano Alessio (2 username) | 🟡 P1 | aperta |
| A9 | Typo username `abrozino.a` (manca "n") | 🟢 P2 | aperta |
| A10 | Typo username `mnzo.f` (manca "a") | 🟢 P2 | aperta |
| A11 | Typo cognome `Di Costranzo` | 🟢 P2 | aperta |
| A12 | Typo cognome `Tortors` | 🟢 P2 | aperta |
| A13 | Pattern username non uniformi | 🟢 P2 | aperta |
| A14 | ATA con `sede_id=1` non coperti per la sede serale | 🟢 P2 | accettata da utente |
| A15 | Festività vacanze Natale/Pasqua e patrono mancanti | 🟢 P2 | aperta |
| A16 | Orario provvisorio (id=2) scaduto ma non rimosso | 🟢 P3 | aperta |
| A17 | `Amministratore::getRoles()` non eredita gerarchia | 🟢 P3 | aperta (codice) |
| A18 | API stateless senza role hierarchy strutturale | 🟢 P3 | aperta (codice) |
| A19 | Mancano unique constraint su `gs_orario` e `gs_scansione_oraria` | 🟢 P3 | aperta (codice) |
| A20 | Util legacy dipendenti da `session-based config` | 🟢 P3 | mitigata via subscriber |

---

## 2. Anomalie dati anagrafici

### A8 — Duplicato Mitrano Alessio

In `gs_utente` esistono **due record distinti** per lo stesso docente:

```
username       cognome    nome
─────────────  ─────────  ────────
a.mitrano      Mitrano    Alessio
mitrano.a      Mitrano    Alessio
```

**Rischio**: assenza/incoerenza di cattedre, voti, firme tra i due account. Possibile login confusione per il docente.

**Verifica**: controllare quale dei due è realmente in uso (cattedre attive, ultimo accesso) e disabilitare l'altro. Se entrambi hanno dati, fare merge.

```sql
-- Verifica
SELECT u.username, u.id, u.abilitato, u.ultimo_accesso,
       (SELECT COUNT(*) FROM gs_cattedra WHERE docente_id=u.id AND attiva=1) AS cattedre,
       (SELECT COUNT(*) FROM gs_firma WHERE docente_id=u.id) AS firme
FROM gs_utente u WHERE u.cognome='Mitrano' AND u.nome='Alessio';
```

### A9 — Typo username `abrozino.a`

Il docente reale è **Abronzino Andrea** (con la "n"), confermato da email `abronzino.a@giua.mda` e dal cognome corretto in DB. Lo username in DB è `abrozino.a`.

**Storia**: il 2026-04-30 era stato individuato lo stesso typo e applicata una UPDATE per correggerlo a `abronzino.a`. Lo stato attuale del DB mostra di nuovo il typo, quindi:
- l'UPDATE non è stata persistita, oppure
- il DB è stato ripristinato da un dump precedente, oppure
- ci sono due record (verificare).

**Rimedio**:
```sql
UPDATE gs_utente SET username='abronzino.a' WHERE id=261 AND username='abrozino.a';
```

(verificando prima che `abronzino.a` non esista già).

### A10 — Typo username `mnzo.f`

Manca la "a" iniziale: l'utente è **Manzo Fabio**, lo username dovrebbe essere `manzo.f`.

**Rimedio**:
```sql
UPDATE gs_utente SET username='manzo.f' WHERE username='mnzo.f';
```

### A11 — Typo cognome `Di Costranzo`

Cognome riportato come "Di Costranzo" — quasi sicuramente "**Di Costanzo**" (verificare con segreteria).

**Rimedio (da confermare)**:
```sql
UPDATE gs_utente SET cognome='Di Costanzo' WHERE cognome='Di Costranzo';
```

### A12 — Typo cognome `Tortors`

Cognome riportato come "Tortors" — quasi sicuramente "**Tortora**".

**Rimedio (da confermare)**:
```sql
UPDATE gs_utente SET cognome='Tortora' WHERE cognome='Tortors';
```

### A13 — Pattern username non uniformi

La convenzione naming è `cognome.iniziale_nome` (es. `bianchi.m`). Eccezioni rilevate:

| Username | Convenzione attesa | Note |
|---|---|---|
| `denicolab` | `denicola.b` | manca punto |
| `m.salvatore` | `morgera.s` | nome.cognome anziché cognome.nome |
| `ilenia.p` | `sarnelli.i` | idem |
| `preside` | `vitiello.s` | username generico |
| `a.mitrano` | `mitrano.a` | nome.cognome (in più al duplicato A8) |

**Impatto**: confusione minor per gli utenti che si aspettano lo schema standard. Funzionale: nessun problema.

**Rimedio**: lavoro di pulizia da concordare col Dirigente, eventualmente facendo migrazione massiva e comunicando agli utenti i nuovi username.

---

## 3. Anomalie configurazione

### A1 — Coordinatori non assegnati

Tutte le **18 classi** hanno `coordinatore_id IS NULL`. Senza coordinatore non si possono usare le funzioni di:
- pagina `/coordinatore`
- annullamento note disciplinari
- presidenza scrutini delegata
- comunicazioni alla famiglia tramite coordinatore

**Rimedio**: assegnazione manuale via UI `Docenti → Coordinatori` (`/docenti/coordinatori`) o batch SQL se si ha la mappatura `classe → docente`.

### A2 — Segretari non assegnati

Stesso quadro per i segretari (18/18). Senza segretario non si possono compilare e firmare correttamente:
- verbali consigli di classe
- verbali scrutinio

**Rimedio**: `Docenti → Segretari` (`/docenti/segretari`).

### A3 — Slot orario non caricati

```
Orario id=2 "Provvisorio" (scaduto)  → 4 slot storici
Orario id=4 "Mattina 2025/26"        → 0 slot ❌
Orario id=5 "Serale 2025/26"         → 0 slot ❌
```

Senza slot orari **nessun docente** vede le proprie ore di lezione. Tutti i flussi di firme, voti per ora, annotazioni, sono bloccati.

**Rimedio**: caricamento da `/scuola/orario` → click griglia → assegnazione cella per cella. Per l'istituto con 18 classi sono ~30 ore/settimana × 18 = potenzialmente 540 slot. Il PDF orario settimanale dell'istituto è il riferimento.

Per import bulk (alternativa più rapida) si può:
- preparare CSV `classe, giorno, ora, cattedra_id` con tutte le righe
- caricarle via SQL su `gs_orario_docente`

### A4 — Email/SMTP non configurati

`gs_configurazione` non contiene parametri `mail/smtp/messag`. Senza configurazione email:
- recupero password non funziona
- notifiche utente non partono
- avvisi/circolari non vengono notificati via email
- convocazioni scrutini non arrivano

**Rimedio**: `Sistema → Email` (`/sistema/email`). Servono: server SMTP, porta, mittente, autenticazione, tipo cifratura (TLS/SSL).

### A5 — Responsabili BES non assegnati

`SELECT COUNT(*) FROM gs_utente WHERE responsabile_bes=1` → **0**.

Senza referente BES per sede:
- nessuno coordina i PEI/PDP
- comunicazioni BES non hanno destinatario corretto
- pagine `/docenti/responsabiliBes` vuote

**Rimedio**: assegnare almeno un responsabile per sede da `Docenti → Responsabili BES`.

### A6 — RSPP non assegnato

`SELECT COUNT(*) FROM gs_utente WHERE rspp=1` → **0**.

Il Responsabile Servizio Prevenzione e Protezione è obbligatorio per la sicurezza. Senza assegnazione, le comunicazioni di sicurezza non hanno destinatario interno.

**Rimedio**: `Docenti → RSPP`.

### A7 — Staff non popolato

`SELECT COUNT(*) FROM gs_utente WHERE ruolo='STA'` → **0**.

Senza membri Staff:
- ogni operazione gestionale ricade su admin/dirigente
- impossibile delegare scrutini
- pagina `/docenti/staff` mostra solo il preside (se INSTANCE OF Staff)

**Rimedio**: nominare collaboratori del Dirigente (vicepresidi, responsabili sede) via `Docenti → Staff` o cambiando il ruolo dei docenti interessati a `STA`.

### A14 — ATA legati a `sede_id=1` ma non coperti per sede 2

7 record ATA hanno `sede_id=1`. Per filtri di tipo `sede IS NULL OR sede IN (:sedi)`, gli ATA della sede 1 **non compaiono** quando si filtra per sede 2 (serale virtuale).

**Stato**: utente ha scelto di lasciarli e gestire manualmente in caso di problemi.

**Eventuale rimedio futuro**: `UPDATE gs_utente SET sede_id=NULL WHERE ruolo='ATA' AND sede_id=1` per renderli "trasversali a tutte le sedi".

### A15 — Festività di istituto mancanti

Inserite le 11 festività **nazionali** italiane. Mancano (delibera del Consiglio d'Istituto):
- Vacanze di Natale (giorni intermedi 22-23 dic, 27-31 dic, 2-5 gen)
- Vacanze di Pasqua (2-7 aprile 2026, escluse Pasqua e Pasquetta)
- Festa del Patrono (Sant'Anastasia: data da confermare con istituto)
- Eventuali ponti deliberati (es. 2 maggio 2026, 1 giugno 2026)
- Eventuale Carnevale regionale

**Rimedio**: `/scuola/festivita` → Aggiungi.

### A16 — Orario provvisorio scaduto non eliminato

`gs_orario id=2` ("Orario provvisorio", 15-20 sett 2025) ha 4 slot storici associati. Non operativo, ma resta in DB.

**Impatto**: nessun rischio funzionale; eventualmente confusione visiva su `/scuola/orario` dove appaiono tre orari (provvisorio + mattina + serale).

**Rimedio**: lasciare per archivio storico, oppure eliminare se nessuno consulta i dati di quei 5 giorni.

---

## 4. Anomalie codice e architettura

Annotazioni per chi mette mano al codice (`giua-registro` repo):

### A17 — `Amministratore::getRoles()` non gerarchico

```php
// src/src/Entity/Amministratore.php
public function getRoles(): array {
  return ['ROLE_AMMINISTRATORE', 'ROLE_UTENTE'];
}
```

A differenza di `Preside::getRoles()` che eredita giù la gerarchia (`['ROLE_PRESIDE', 'ROLE_STAFF', 'ROLE_DOCENTE', 'ROLE_UTENTE']`), l'amministratore non ha `ROLE_PRESIDE`. Questo costringe a check espliciti:

```php
#[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]
```

ripetuti su ogni endpoint write (vedi `DocentiApiController`, `AlunniApiController`, `AtaApiController`).

**Fix proposto**: definire `role_hierarchy` in `security.yaml`:

```yaml
security:
  role_hierarchy:
    ROLE_AMMINISTRATORE: [ROLE_PRESIDE, ROLE_STAFF, ROLE_DOCENTE, ROLE_UTENTE]
    ROLE_PRESIDE: [ROLE_STAFF, ROLE_DOCENTE, ROLE_UTENTE]
    ROLE_STAFF: [ROLE_DOCENTE, ROLE_UTENTE]
    ROLE_DOCENTE: [ROLE_UTENTE]
```

E sostituire `IsGranted(Expression(...))` con `IsGranted('ROLE_PRESIDE')` (che con la gerarchia coprirà anche admin).

### A18 — API stateless senza ConfigLoader nativo

Il firewall `^/api/` è `stateless: true`, ma i Util legacy (`RegistroUtil`, `ScrutinioUtil`, ecc.) leggono config da session. Senza `ConfigLoader::carica()` esploderebbero.

**Mitigazione attuale**: subscriber `ApiConfigLoaderSubscriber` chiama `caricaApi()` su ogni richiesta `/api/*`. Aggiunge overhead di ~5 query a richiesta.

**Fix strutturale**: rimpiazzare i lookup `$reqstack->getSession()->get('/CONFIG/...')` con un servizio iniettato `ConfigService` con cache APCu/InMemory. Lavoro grosso, ma elimina la dipendenza dalla session stateful per i Util.

### A19 — Constraint mancanti su tabelle orario

```sql
-- gs_orario
KEY IDX_EE2479B1E19F41BF (sede_id)   -- solo index, no UNIQUE
-- gs_scansione_oraria
KEY IDX_B5A8A4058EEAC9E6 (orario_id)
```

Mancano:
- UNIQUE su `gs_orario(sede_id, inizio, fine)` — eviterebbe sovrapposizioni di orari sulla stessa sede
- UNIQUE su `gs_scansione_oraria(orario_id, giorno, ora)` — eviterebbe scansioni duplicate per lo stesso slot

**Senza**: il sistema permette stati incoerenti che `RegistroUtil::orarioInData` non gestisce (legge tutto e ritorna risultati ambigui).

**Fix**: migrazione Doctrine con aggiunta UNIQUE INDEX.

### A20 — Util session-based — corollario A18

Tutti i lookup `/CONFIG/SCUOLA/anno_inizio`, `/CONFIG/ISTITUTO/firma_preside`, ecc. sono in sessione.

Pattern lentus se la session non è popolata (= 500 silent), e duro da testare in unit test perché richiede mock di RequestStack/Session.

**Fix**: vedi A18 (ConfigService).

### Pattern inconsistente su workaround `ONLY_FULL_GROUP_BY`

Risolto durante la sessione del 2026-05-04 (vedi A risolte sotto), ma pattern del codice originale era inconsistente:

- `DocumentoRepository:159` e `NotaRepository:73` disabilitano `ONLY_FULL_GROUP_BY` con `SET sql_mode=''`
- `AvvisoRepository:354` e `RichiestaRepository:157` non avevano workaround → 500 al primo trigger

**Raccomandazione**: scrivere query compatibili con `ONLY_FULL_GROUP_BY` di default su MySQL 8, evitando workaround `SET sql_mode` che modificano sessione DB.

---

## 5. Anomalie risolte

Per memoria:

### R1 — 500 sul Registro voti (`/api/voti/quadro`)

**Causa**: `RegistroUtil::infoPeriodi()` legge config da session stateless non popolata → `DateTime::createFromFormat(null) → false → ->modify('+1 day') → fatal`.

**Fix** (commit `0ae5d0cc`):
- nuovo `ApiConfigLoaderSubscriber` su `KernelEvents::CONTROLLER` per `/api/*`
- nuovo metodo `ConfigLoader::caricaApi()` (versione leggera senza menu/tema/utente)

### R2 — 500 su `/agenda` (`/api/agenda?mese=YYYY-MM`)

**Causa**: query Doctrine `SELECT DISTINCT DAY(c.data) FROM gs_richiesta_colloquio rc JOIN gs_colloquio c ... ORDER BY rc.appuntamento` viola `ONLY_FULL_GROUP_BY` di MySQL 8 (`SQLSTATE 3065`).

**Fix** (commit `0ae5d0cc`):
- `AvvisoRepository:354` — rimosso `orderBy('rc.appuntamento')` (era inutile)
- `RichiestaRepository:157` — fix preventivo `s.ordinamento` aggiunto al GROUP BY

### R3 — Card "Calendario" e "Gestione Utenti" non cliccabili

**Causa**: card `<Card>` non wrappate in `<Link>`.

**Fix** (commit `0ae5d0cc`):
- nuova pagina hub `/utenti` (gated per Admin/Dirigente)
- card "Calendario" → `/agenda`
- card "Gestione Utenti" → `/utenti` (visibile solo agli ammessi)

### R4 — 18 endpoint API utenti senza check ruolo

**Causa**: `DocentiApi`, `AlunniApi`, `AtaApi` avevano solo `IS_AUTHENTICATED_FULLY` a livello di classe. Un docente autenticato poteva chiamare POST/PUT/PATCH e modificare anagrafiche.

**Fix** (commit `0ae5d0cc`):
- 18 metodi write protetti con `#[IsGranted(new Expression("is_granted('ROLE_AMMINISTRATORE') or is_granted('ROLE_PRESIDE')"))]`

### R5 — Login fallito per typo username `abronzino.a`

**Causa**: storico, sessione 2026-04-30. L'utente cercava di loggarsi come "abronzino.a" mentre lo username in DB era "abrozino.a".

**Stato**: risolto temporaneamente (UPDATE manuale). **Riemerso** in stato attuale del DB (vedi A9).

---

## 6. Raccomandazioni operative

### Ordine consigliato per chiudere il setup

1. **Coordinatori e segretari** (A1, A2) — sblocca tante funzioni
2. **Lezioni orario** (A3) — sblocca firme docenti — è il blocco operativo più impattante
3. **Email/SMTP** (A4) — sblocca recupero password e notifiche
4. **Incarichi** (A5, A6, A7) — Responsabili BES, RSPP, Staff — necessari prima dei consigli di dipartimento
5. **Festività delibera** (A15) — prima delle vacanze di Natale
6. **Pulizia anagrafica** (A8-A13) — quando c'è tempo, in coordinamento col Dirigente

### Lavoro codice (post-setup)

1. `role_hierarchy` in `security.yaml` (A17) — semplifica controlli ruoli
2. Migrazione `ConfigService` con cache (A18, A20) — rimuove dipendenza session
3. UNIQUE constraint su tabelle orario (A19) — previene stati incoerenti
4. Audit query DISTINCT/GROUP BY rimanenti per compatibilità MySQL 8

### Manutenzione preventiva

- **Backup DB** prima di ogni operazione massiva (è già nel runbook in `Docs/RIPRISTINO_DATABASE_E_BACKUP_NAS.md`)
- **Test login** con un utente di ogni ruolo dopo cambi anagrafica
- **Audit log** delle UPDATE effettuate manualmente (questo report aiuta)

---

*Documento mantenuto: aggiornare ad ogni sessione di lavoro sul registro. Per dettagli implementativi vedere i `commit log` corrispondenti e le procedure in `Docs/procedura_*.md`.*
