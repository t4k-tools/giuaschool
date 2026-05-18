# Cambio tema e branding per nuove scuole

Guida operativa per cambiare la **grafica** del registro elettronico
mantenendo **stessa codebase**. Pensata per il caso in cui lo stesso
software venga deployato per scuole diverse (es. ACIIEF, Scuola X, ...).

> Il codice resta identico per tutte le scuole. Cambiano solo:
> palette colori (CSS variables), logo, nome scuola, dominio,
> database, credenziali. Tutti questi aspetti vivono fuori dalla
> codebase: file CSS dedicato per tema, `.env.local` per le variabili,
> `PERSONAL/` per gli asset del backend legacy, DB MySQL separato per
> i dati anagrafici.

---

## 1. Come funziona il theming

Il frontend Next.js usa **Tailwind v4 + shadcn/ui con CSS variables**.
I colori, raggi, font, ecc. sono tutti definiti come variabili CSS
(`--primary`, `--background`, `--radius`, ecc.) e usate ovunque nei
componenti.

Il tema attivo viene scelto dall'attributo `data-theme` sull'elemento
`<html>`, impostato da `app/layout.tsx` in base alla variabile env
`NEXT_PUBLIC_BRAND`.

```
refactor/src/themes/
├── default.css   ← palette shadcn neutral (fallback, attivata da :root)
├── aciief.css    ← tema ACIIEF (verde istituzionale, attivato da [data-theme="aciief"])
└── <nuovo>.css   ← un file per ogni scuola futura
```

L'ordine di precedenza CSS funziona così:
- `default.css` definisce le variabili in `:root` → specificità bassa
- `<brand>.css` definisce le variabili in `[data-theme="<brand>"]` → specificità più alta
- Vince il tema della scuola attiva. Senza env var, resta il default neutral.

---

## 2. Workflow per aggiungere una nuova scuola

### Step 1 — Crea il file tema

Copia `aciief.css` come modello, scegli una chiave breve (es. `scuola-x`)
e personalizza i valori delle variabili:

```bash
cd /home/gigas/Progetti/giuaschool
cp refactor/src/themes/aciief.css refactor/src/themes/scuola-x.css
```

Poi nel nuovo file:
- Sostituisci `[data-theme="aciief"]` con `[data-theme="scuola-x"]`
- Sostituisci tutti i selettori `.dark[data-theme="aciief"]` e simili
- Personalizza le variabili colore. Il modo più rapido:
  1. Parti dal colore primario del logo della scuola (es. `#A12030` rosso)
  2. Convertilo in formato OKLCH (https://oklch.com/) — il sistema usa
     OKLCH per coerenza percettiva
  3. Imposta `--primary` con quel valore
  4. Deriva `--ring`, `--chart-*`, `--sidebar-primary` dalla stessa tinta
  5. Adatta `--sidebar` (sfondo barra laterale) — di solito una versione
     scura della stessa tinta o un grigio neutro

### Step 2 — Aggiungi l'import al globals.css

In `refactor/src/app/globals.css` aggiungi il nuovo `@import`:

```css
@import "../themes/default.css";
@import "../themes/aciief.css";
@import "../themes/scuola-x.css";   /* ← nuova riga */
```

L'ordine non è critico tra i brand: ognuno ha selettore specifico
`[data-theme="..."]`, sono mutualmente esclusivi a runtime.

### Step 3 — Configura `.env.local` del deploy della nuova scuola

Nel `.env.local` (NON in `.env`, che è committato) del deploy della
scuola nuova:

```dotenv
NEXT_PUBLIC_BRAND=scuola-x
NEXT_PUBLIC_BRAND_NAME=Scuola X
```

`NEXT_PUBLIC_BRAND` deve corrispondere al nome del file CSS che hai
creato (senza `.css`).
`NEXT_PUBLIC_BRAND_NAME` è il nome usato nel `<title>` della pagina.

### Step 4 — Logo della scuola

Il logo del frontend Next.js è **dinamico**: viene letto dalla tabella
`gs_istituto.logoUrl` del DB MySQL. Ogni scuola lo configura dal
pannello admin → Scuola → Istituto.

Per il **backend legacy Symfony** (porte 8082, raggiungibile via
`/login/form/` per stampare PDF, ecc.) il logo si mette in:

```
PERSONAL/img/logo-giuaschool.png   ← override del logo upstream
PERSONAL/img/logo-giuaschool.svg
```

La cartella `PERSONAL/` è in `.gitignore`: ogni deploy ha il suo logo
locale, mai in repo.

### Step 5 — Tutto il resto del deploy

Per il setup completo di un secondo deploy (porte Docker, DB, tunnel
Cloudflare separati), vedi la sezione "Setup per una nuova scuola"
qui sotto.

---

## 3. Setup di una nuova scuola da zero

Sequenza completa per replicare il deploy in `Progetti/scuola-x/`:

```bash
# 1) Clone della codebase comune
cd /home/gigas/Progetti
git clone git@github.com:t4k-tools/giuaschool.git scuola-x
cd scuola-x

# 2) Crea il file tema (vedi sezione 2)
cp refactor/src/themes/aciief.css refactor/src/themes/scuola-x.css
$EDITOR refactor/src/themes/scuola-x.css

# 3) Aggiungi l'import in globals.css
$EDITOR refactor/src/app/globals.css

# 4) Logo backend legacy in PERSONAL/
cp /percorso/al/logo.png PERSONAL/img/logo-giuaschool.png

# 5) Genera chiavi JWT NUOVE (non riusare quelle di un altro deploy!)
mkdir -p config/jwt
openssl genpkey -out config/jwt/private.pem -aes256 -algorithm rsa -pkeyopt rsa_keygen_bits:4096
# (passphrase generata casualmente, salvala come JWT_PASSPHRASE in .env.local)
openssl pkey -in config/jwt/private.pem -out config/jwt/public.pem -pubout

# 6) Configura .env.local
cat > .env.local <<EOF
APP_SECRET='$(openssl rand -hex 16)'
DATABASE_URL='mysql://scuola_x:CAMBIA_PWD@db:3306/scuola_x'
JWT_PASSPHRASE='<passphrase dello step 5>'
NEXT_PUBLIC_BRAND=scuola-x
NEXT_PUBLIC_BRAND_NAME=Scuola X
NEXTJS_URL=https://scuola-x.efor.it
GOOGLE_CLIENT_ID=''
GOOGLE_CLIENT_SECRET=''
EOF

# 7) Adatta docker-compose.yml
#   - cambia "name: registro" → "name: scuola-x"
#   - cambia porte: 8082→8083, 3001→3002, 3308→3309 (evita conflitti col deploy esistente)
#   - aggiorna i bind mount cloudflared al nuovo credential JSON

# 8) Crea il tunnel Cloudflare per il nuovo dominio
# Su https://one.dash.cloudflare.com/ → Zero Trust → Networks → Tunnels
#   - "Create tunnel" → nome "scuola-x"
#   - scarica il credential JSON in scuola-x/<UUID>.json
#   - configura hostname: scuola-x.efor.it → http://frontend:3000
# Aggiorna docker/cloudflared/config.yml con il nuovo UUID

# 9) Up del deploy
docker compose up -d

# 10) Inizializza il DB
docker exec scuola-x_app php bin/console doctrine:database:create
docker exec scuola-x_app php bin/console doctrine:migrations:migrate -n
# Poi carica i dati specifici della scuola (anagrafiche, classi, docenti...)
```

---

## 4. Cosa è comune vs per-scuola

| Aspetto | Dove vive | Comune (in repo) | Per-scuola (locale) |
|---|---|---|---|
| Codice PHP, TS, Twig | `src/`, `templates/`, `refactor/src/` | ✅ | |
| Schema DB (Doctrine migrations) | `migrations/` | ✅ | |
| API e logica business | `src/Controller/Api/` | ✅ | |
| Tema CSS della scuola | `refactor/src/themes/<brand>.css` | ✅ (un file per scuola) | |
| Logo frontend | DB tabella `gs_istituto.logoUrl` | | ✅ |
| Logo backend legacy | `PERSONAL/img/logo-giuaschool.png` | | ✅ |
| Template Twig override | `PERSONAL/templates/...` | | ✅ |
| Stringhe brand (es. nome istituto) | `PERSONAL/translations/...` + DB | | ✅ |
| Credenziali (DB, Google, SMTP, JWT) | `.env.local` | | ✅ |
| Chiavi JWT (RSA pem) | `config/jwt/*.pem` | | ✅ |
| Tunnel Cloudflare | `<UUID>.json` + `docker/cloudflared/config.yml` | | ✅ |
| Porte container, nome progetto | `docker-compose.yml` | (modificare per deploy) | ✅ |
| Dati MySQL (utenti, classi, ...) | volume Docker `scuola_x_db_data` | | ✅ |

---

## 5. Aggiornamenti software

Tutti i deploy condividono il repo `t4k-tools/giuaschool`. Per portare
fix e nuove feature in tutte le scuole:

```bash
# Su ogni cartella deploy
cd /home/gigas/Progetti/<deploy>
git pull origin master
docker compose restart frontend app
```

Niente conflitti perché i file scuola-specifici (logo in `PERSONAL/`,
`.env.local`, `config/jwt/`, credenziali Cloudflare) sono ignorati dal
repo e quindi non vengono toccati dal `git pull`.

---

## 6. Note tecniche

### Perché OKLCH e non HEX?

Tailwind v4 + shadcn usano OKLCH per la consistenza percettiva tra
chiaro e scuro. Le tinte definite con stessa "L" (Lightness) hanno la
stessa luminosità apparente anche se hanno tonalità diverse.

Convertitori online: https://oklch.com/ (interfaccia visuale con
contrast-checker incorporato per WCAG).

### Cosa NON cambia per scuola

Il **layout** (sidebar a sinistra, topbar in alto, struttura delle
pagine, posizione dei pulsanti) è uniforme tra le scuole. Cambiare il
layout significa modificare i componenti React e rompe la simmetria
multi-scuola. Se una scuola chiede un layout proprio, valuta seriamente
se non sia il caso di fare un fork dedicato invece di parametrizzare.

### Modalità dark

Ogni tema definisce sia la variante light (`[data-theme="X"]`) sia
quella dark (`.dark[data-theme="X"]`). Il toggle dark/light è
indipendente dal brand: ogni utente può scegliere il proprio
preferito, all'interno della palette della sua scuola.
