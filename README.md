# Giua@school - Registro Elettronico

Registro elettronico open source per istituti scolastici italiani, conforme alla normativa vigente.

## Architettura

Il progetto è composto da due parti:

- **Backend** (`src/`) — Symfony 6.4, PHP, MySQL. Gestisce autenticazione, API REST, logica di business, persistenza dati.
- **Frontend** (`refactor/`) — Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui. Interfaccia moderna con 45+ route.

## Struttura del progetto

```
├── src/                         # Backend Symfony
│   ├── src/Controller/          # Controller API e web
│   ├── src/Entity/              # Entità Doctrine (ORM)
│   ├── src/Repository/          # Repository per accesso ai dati
│   ├── src/Security/            # Autenticazione e autorizzazione
│   ├── config/                  # Configurazione Symfony
│   ├── templates/               # Template Twig (legacy)
│   └── public/                  # Entry point PHP
├── refactor/                    # Frontend Next.js
│   └── src/
│       ├── app/(app)/           # Route autenticate (dashboard, alunni, docenti, ...)
│       ├── app/(auth)/          # Route autenticazione (login)
│       ├── components/          # Componenti React riutilizzabili
│       └── lib/                 # Utility, API client, tipi
├── docker/                      # Configurazioni PHP e MySQL
├── Docs/                        # Documentazione e guide di deploy
├── Dockerfile*                  # Immagini Docker (backend, frontend, produzione)
├── docker-compose.yml           # Ambiente di sviluppo locale
└── docker-compose.production.yml # Ambiente di produzione con Traefik
```

## Requisiti

- Docker e Docker Compose
- Node.js 20+ (per sviluppo frontend)
- PHP 8.2+ e Composer (per sviluppo backend)

## Avvio rapido (Docker)

```bash
# Sviluppo locale
docker compose up -d

# Produzione (con Traefik reverse proxy)
docker compose -f docker-compose.production.yml up -d
```

## Ruoli utente

- **Amministratore** — Gestione completa del sistema
- **Dirigente scolastico** — Supervisione e approvazione
- **Segreteria** — Gestione alunni, docenti, ATA, classi, orari
- **Docente** — Registro di classe, voti, assenze, annotazioni
- **Genitore** — Consultazione voti, assenze, comunicazioni
- **Alunno** — Consultazione propri dati

## Documentazione

La guida al deploy è disponibile in `Docs/DEPLOY-GUIDA.md`.

Per la migrazione `legacy -> refactor` vedi:

- `Docs/INDEX_REFACTOR.md`
- `Docs/MATRICE_MIGRAZIONE_LEGACY_REFACTOR.md`
- `Docs/ROADMAP_ESECUTIVA_REFACTOR.md`

## Licenza

AGPL-3.0 — [Giua@school](https://github.com/iisgiua/giuaschool)
