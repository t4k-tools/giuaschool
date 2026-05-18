# giua@school — Guida al Deploy in Produzione

## Registro Elettronico — Istruzioni per il Trasferimento su Server

---

**Versione:** 2.0
**Data:** Febbraio 2026
**Autore:** ACIIEF — istitutiparitari.com
**Stack:** Symfony 6.4 + Next.js 16 + MySQL 8 + Traefik 3 + worker Messenger

---

## Indice

1. [Requisiti Server](#1-requisiti-server)
2. [Preparazione del VPS](#2-preparazione-del-vps)
3. [Configurazione DNS](#3-configurazione-dns)
4. [Trasferimento File](#4-trasferimento-file)
5. [Configurazione Ambiente](#5-configurazione-ambiente)
6. [Avvio dei Container](#6-avvio-dei-container)
7. [Primo Avvio e Inizializzazione DB](#7-primo-avvio-e-inizializzazione-db)
8. [Verifica del Funzionamento](#8-verifica-del-funzionamento)
9. [Backup Automatico](#9-backup-automatico)
10. [Manutenzione e Aggiornamenti](#10-manutenzione-e-aggiornamenti)
11. [Troubleshooting](#11-troubleshooting)
12. [Riferimenti Risorse](#12-riferimenti-risorse)

---

## 1. Requisiti Server

### Hardware Minimo (VPS)

| Risorsa        | Minimo        | Consigliato     |
|----------------|---------------|-----------------|
| **CPU**        | 1 vCPU        | 2 vCPU          |
| **RAM**        | 2 GB          | 4 GB            |
| **Disco**      | 20 GB SSD     | 40 GB SSD       |
| **Banda**      | 1 TB/mese     | Illimitata      |
| **OS**         | Ubuntu 22.04+ | Ubuntu 24.04 LTS|

### Stima Spazio Disco

| Componente                    | Dimensione   |
|-------------------------------|-------------|
| Sistema Operativo + Docker    | ~5 GB       |
| Immagini Docker (5 container) | ~2.2 GB     |
| Codice sorgente Symfony       | ~500 MB     |
| Frontend Next.js (standalone) | ~65 MB      |
| Database MySQL (scuola tipica)| ~200-500 MB |
| Certificati SSL + Chiavi JWT  | ~10 KB      |
| Log (Traefik + App)           | ~500 MB     |
| Buffer/workspace              | ~5-10 GB    |
| **Totale stimato**            | **~15-20 GB**|

### Software Necessario

| Software                | Scopo                                          |
|------------------------|-------------------------------------------------|
| Docker Engine 24+      | Runtime container                               |
| Docker Compose v2+     | Orchestrazione multi-container                  |
| **Traefik 3** (container) | Reverse proxy + SSL Let's Encrypt automatico |
| UFW                    | Firewall (opzionale ma consigliato)             |
| fail2ban               | Protezione brute-force (opzionale)              |

> **Nota:** Traefik sostituisce Nginx + Certbot in un unico container Docker.
> Gestisce automaticamente il reverse proxy, il routing, e i certificati SSL
> Let's Encrypt con rinnovo automatico. Non serve installare nient'altro.

### Provider VPS Consigliati

| Provider       | Piano                    | Prezzo/mese |
|---------------|--------------------------|-------------|
| Hetzner       | CX22 (2vCPU, 4GB, 40GB) | ~4-5 EUR    |
| Contabo       | VPS S (4vCPU, 8GB, 200GB)| ~6 EUR     |
| OVH           | VPS Starter              | ~6 EUR      |
| Aruba Cloud   | Smart (2vCPU, 4GB)       | ~8 EUR      |

---

## 2. Preparazione del VPS

### 2.1 Accesso al Server

```bash
ssh root@IP_DEL_SERVER
```

### 2.2 Aggiornamento Sistema

```bash
apt update && apt upgrade -y
apt install -y curl git ufw fail2ban
```

### 2.3 Installazione Docker

```bash
# Installa Docker (metodo ufficiale)
curl -fsSL https://get.docker.com | sh

# Verifica installazione
docker --version
docker compose version

# Abilita Docker all'avvio
systemctl enable docker
```

### 2.4 Creazione Utente Non-Root (consigliato)

```bash
# Crea utente deploy
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# Passa all'utente deploy
su - deploy
```

### 2.5 Configurazione Firewall

```bash
# Consenti SSH, HTTP e HTTPS
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

# Abilita firewall
ufw enable
ufw status
```

> **Importante:** NON aprire la porta 3306 (MySQL) e 3307. Il database
> è accessibile solo dalla rete Docker interna.

---

## 3. Configurazione DNS

Prima di procedere, configura il DNS dei due host pubblici:

1. Accedi al pannello di gestione DNS del tuo provider di dominio
2. Aggiungi due record **A**:

| Tipo | Nome              | Valore         | TTL  |
|------|-------------------|----------------|------|
| A    | registro          | IP_DEL_SERVER  | 300  |
| A    | legacy.registro   | IP_DEL_SERVER  | 300  |

Esempio:
- `registro.tuascuola.it` → `123.45.67.89`
- `legacy.registro.tuascuola.it` → `123.45.67.89`

3. Attendi la propagazione DNS (5-30 minuti)

```bash
# Verifica propagazione
dig registro.tuascuola.it +short
# Deve restituire l'IP del tuo server
```

> **Nota:** Traefik richiede che il dominio sia raggiungibile per emettere
> il certificato SSL. Configura il DNS PRIMA di avviare i container.

---

## 4. Trasferimento File

### 4.1 Struttura del Progetto

```
registro/
├── docker-compose.production.yml   ← Orchestrazione produzione
├── Dockerfile.production            ← Build Symfony
├── Dockerfile.frontend              ← Build Next.js (multi-stage)
├── .env.production.example          ← Template variabili
├── docker/
│   ├── php.ini                      ← Config PHP
│   ├── backend.env.local.example    ← Override persistenti modificabili dal pannello
│   ├── mysql-init.sh                ← Bootstrap automatico schema/dati base
│   └── mysql-prod.cnf               ← Config MySQL ottimizzata
├── src/                             ← Codice Symfony (backend)
└── refactor/                        ← Codice Next.js (frontend)
```

### 4.2 Trasferimento via rsync (consigliato)

```bash
# Dal tuo computer locale:
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='vendor' \
  --exclude='var/cache' \
  --exclude='var/log' \
  --exclude='.env' \
  --exclude='.env.local' \
  --exclude='registro_db_data' \
  /percorso/locale/registro/ \
  deploy@IP_SERVER:/home/deploy/registro/
```

### 4.3 Alternativa: Git Clone

Se il progetto è su un repository Git:

```bash
# Sul server:
cd /home/deploy
git clone https://url-del-tuo-repo.git registro
cd registro
```

### 4.4 Alternativa: Trasferimento ZIP + SCP

```bash
# Locale: crea archivio (escludendo file pesanti)
tar czf registro-deploy.tar.gz \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='vendor' \
  --exclude='.env' \
  registro/

# Trasferisci
scp registro-deploy.tar.gz deploy@IP_SERVER:/home/deploy/

# Sul server: estrai
cd /home/deploy
tar xzf registro-deploy.tar.gz
```

---

## 5. Configurazione Ambiente

### 5.1 Crea i File di Ambiente

```bash
cd /home/deploy/registro
cp .env.production.example .env
cp docker/backend.env.local.example docker/backend.env.local
nano .env
```

### 5.2 Compila le Variabili

```env
# Dominio del registro
DOMAIN=registro.tuascuola.it
LEGACY_DOMAIN=legacy.registro.tuascuola.it

# Email per certificati SSL
ACME_EMAIL=admin@tuascuola.it

# Database (CAMBIA QUESTE PASSWORD!)
DB_NAME=giuaschool
DB_USER=giuaschool
DB_PASSWORD=una_password_MOLTO_sicura_2026!
DB_ROOT_PASSWORD=root_password_DIVERSA_sicura!
AUTO_INIT_DB=1

# Symfony secret (genera con il comando sotto)
APP_SECRET=genera_questo_valore_vedi_sotto
JWT_PASSPHRASE=passphrase_jwt_diversa_e_molto_sicura

# Traefik dashboard (genera con il comando sotto)
TRAEFIK_DASHBOARD_AUTH=admin:hash_generato_vedi_sotto
```

Il file `docker/backend.env.local` contiene invece gli override persistenti del backend
modificabili anche dal pannello admin, ad esempio:

```env
MAILER_DSN='php://default'
LOG_LEVEL='warning'
```

### 5.3 Genera Valori Sicuri

```bash
# Genera APP_SECRET (32 caratteri hex)
openssl rand -hex 16
# Esempio output: a3f5b8c1d4e7f0123456789abcdef012

# Genera password per dashboard Traefik
# (installa apache2-utils se non presente)
apt install -y apache2-utils

# Genera hash (ti chiederà la password)
htpasswd -nB admin

# IMPORTANTE: nell'.env, raddoppia ogni $ nell'hash!
# Se htpasswd restituisce:  admin:$2y$05$abc123...
# Nel .env scrivi:          admin:$$2y$$05$$abc123...
```

### 5.4 Note su JWT e Bootstrap DB

```bash
# Le chiavi JWT vengono generate automaticamente al primo boot
# dal container app, nel volume persistente registro_jwt_keys.

# Se stai facendo una PRIMA installazione pulita:
# lascia AUTO_INIT_DB=1 per creare automaticamente schema + dati base.

# Se invece devi importare un dump esistente:
# imposta AUTO_INIT_DB=0 prima del primo avvio del database.
```

---

## 6. Avvio dei Container

### 6.1 Build e Avvio

```bash
cd /home/deploy/registro

# Build delle immagini e avvio in background
docker compose -f docker-compose.production.yml up -d --build
```

Il primo avvio richiede ~3-5 minuti perche':
- Scarica le immagini base (Traefik, MySQL, PHP, Node)
- Builda il Dockerfile.production (Symfony + Composer)
- Builda il Dockerfile.frontend (Next.js multi-stage)
- Avvia MySQL e attende l'healthcheck
- Traefik emette il certificato SSL da Let's Encrypt

### 6.2 Verifica Stato Container

```bash
# Stato di tutti i container
docker compose -f docker-compose.production.yml ps

# Devi vedere 5 container "running":
# registro_traefik    → porta 80, 443
# registro_app        → interno
# registro_worker     → interno
# registro_frontend   → interno
# registro_db         → interno
```

### 6.3 Verifica Log per Errori

```bash
# Log di tutti i container
docker compose -f docker-compose.production.yml logs

# Log di un container specifico
docker compose -f docker-compose.production.yml logs traefik
docker compose -f docker-compose.production.yml logs app
docker compose -f docker-compose.production.yml logs frontend
docker compose -f docker-compose.production.yml logs db

# Log in tempo reale (follow)
docker compose -f docker-compose.production.yml logs -f traefik
```

---

## 7. Primo Avvio e Inizializzazione DB

### 7.1 Installazione Pulita

Con `AUTO_INIT_DB=1` e volume MySQL vuoto, il container `db` esegue automaticamente:
- `src/src/Install/create-db.sql`
- `src/src/Install/init-db.sql`

Al termine avrai schema, dati base e utente amministratore iniziale:

```text
username: admin
email: Admin@giua.mda
password: demo1234
```

> Nota: il login iniziale usa `username: admin`. Email profilo:
> `Admin@giua.mda`. Cambia immediatamente la password dopo il primo accesso.

### 7.2 Restore di un Database Esistente

```bash
# PRIMA del primo avvio del DB imposta AUTO_INIT_DB=0 nel file .env

# Avvia stack senza bootstrap automatico
docker compose -f docker-compose.production.yml up -d --build

# Importa il dump SQL
docker compose -f docker-compose.production.yml exec -T db \
  mysql -u"${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < dump_database.sql
```

### 7.3 Pulizia Cache Symfony

```bash
docker compose -f docker-compose.production.yml exec app \
  php bin/console cache:clear --env=prod
```

---

## 8. Verifica del Funzionamento

### 8.1 Test Landing Page

Apri nel browser:
```
https://registro.tuascuola.it
```

Dovresti vedere:
- Lucchetto SSL verde nella barra degli indirizzi
- Landing page con le informazioni della scuola
- Pulsante "Accedi" che porta al login

### 8.2 Test API Pubblica

```bash
curl -s https://registro.tuascuola.it/api/public/info | python3 -m json.tool
```

Deve restituire i dati dell'istituto (nome, sede, anno scolastico).

### 8.3 Test Login

```
https://registro.tuascuola.it/login
```

Prova ad accedere con le credenziali dell'amministratore.

Se una sezione del nuovo frontend non è ancora completata, usa il backend legacy su:
```
https://legacy.registro.tuascuola.it
```

### 8.4 Test SSL

```bash
# Verifica certificato
curl -vI https://registro.tuascuola.it 2>&1 | grep -E "SSL|subject|expire"
```

### 8.5 Test Redirect HTTP → HTTPS

```bash
curl -I http://registro.tuascuola.it
# Deve restituire: 301 Moved Permanently → https://...
```

---

## 9. Backup Automatico

### 9.1 Script di Backup

Crea il file `/home/deploy/backup-registro.sh`:

```bash
#!/bin/bash
# =============================================
# Backup giornaliero giua@school
# =============================================

BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Backup database
docker compose -f /home/deploy/registro/docker-compose.production.yml \
  exec -T db mysqldump -u root -p"${DB_ROOT_PASSWORD}" \
  --single-transaction --routines --triggers \
  giuaschool | gzip > "$BACKUP_DIR/db_${DATE}.sql.gz"

# Backup chiavi JWT
tar czf "$BACKUP_DIR/jwt_${DATE}.tar.gz" \
  -C /var/lib/docker/volumes/registro_jwt_keys/_data .

# Backup filesystem applicativo persistente
tar czf "$BACKUP_DIR/files_${DATE}.tar.gz" \
  -C /var/lib/docker/volumes/registro_symfony_files/_data .

# Backup file .env
cp /home/deploy/registro/.env "$BACKUP_DIR/env_${DATE}.bak"

# Backup override persistenti del backend
cp /home/deploy/registro/docker/backend.env.local "$BACKUP_DIR/backend-env_${DATE}.bak"

# Pulizia vecchi backup
find "$BACKUP_DIR" -name "*.gz" -mtime +${RETENTION_DAYS} -delete
find "$BACKUP_DIR" -name "*.bak" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completato: $BACKUP_DIR"
```

### 9.2 Pianifica Backup con Cron

```bash
# Rendi eseguibile
chmod +x /home/deploy/backup-registro.sh

# Aggiungi al crontab (backup ogni notte alle 3:00)
crontab -e

# Aggiungi questa riga:
0 3 * * * /home/deploy/backup-registro.sh >> /home/deploy/backups/backup.log 2>&1
```

### 9.3 Restore da Backup

```bash
# Ripristina database
gunzip < /home/deploy/backups/db_2026-02-28_03-00.sql.gz | \
  docker compose -f docker-compose.production.yml exec -T db \
  mysql -u root -p giuaschool
```

---

## 10. Manutenzione e Aggiornamenti

### 10.1 Aggiornamento del Codice

```bash
cd /home/deploy/registro

# Aggiorna codice sorgente
git pull origin main  # oppure rsync dal locale

# Ricostruisci e riavvia
docker compose -f docker-compose.production.yml up -d --build

# Pulisci cache
docker compose -f docker-compose.production.yml exec app \
  php bin/console cache:clear --env=prod
```

### 10.2 Riavvio Singolo Container

```bash
# Riavvia solo il frontend
docker compose -f docker-compose.production.yml restart frontend

# Riavvia solo il backend
docker compose -f docker-compose.production.yml restart app
```

### 10.3 Monitoraggio Risorse

```bash
# Consumo risorse in tempo reale
docker stats

# Spazio disco Docker
docker system df

# Pulizia immagini/container inutilizzati
docker system prune -f
docker image prune -a -f  # ATTENZIONE: rimuove immagini non in uso
```

### 10.4 Aggiornamento Immagini Docker

```bash
# Aggiorna Traefik e MySQL (immagini pre-built)
docker compose -f docker-compose.production.yml pull traefik db

# Riavvia con le nuove immagini
docker compose -f docker-compose.production.yml up -d
```

### 10.5 Visualizza Log

```bash
# Ultimi 100 log del backend
docker compose -f docker-compose.production.yml logs --tail=100 app

# Log accesso Traefik
docker compose -f docker-compose.production.yml exec traefik \
  cat /var/log/traefik/access.log | tail -50

# Query lente MySQL
docker compose -f docker-compose.production.yml exec db \
  cat /var/lib/mysql/slow-query.log
```

### 10.6 Stop e Riavvio Completo

```bash
# Stop tutti i container (i dati persistono nei volumi)
docker compose -f docker-compose.production.yml down

# Riavvio completo
docker compose -f docker-compose.production.yml up -d
```

---

## 11. Troubleshooting

### SSL non funziona

**Causa:** DNS non ancora propagato quando Traefik ha provato a emettere il certificato.

```bash
# Verifica DNS
dig registro.tuascuola.it +short

# Riavvia Traefik per ritentare
docker compose -f docker-compose.production.yml restart traefik

# Controlla log Traefik per errori ACME
docker compose -f docker-compose.production.yml logs traefik | grep -i "acme\|error"
```

### Database non si connette

```bash
# Verifica che MySQL sia healthy
docker compose -f docker-compose.production.yml ps db

# Testa connessione dal container app
docker compose -f docker-compose.production.yml exec app \
  php bin/console doctrine:query:sql "SELECT 1"
```

### Frontend mostra errore 502

```bash
# Verifica che il frontend sia attivo
docker compose -f docker-compose.production.yml ps frontend

# Controlla log Next.js
docker compose -f docker-compose.production.yml logs frontend
```

### API restituisce errore 500

```bash
# Controlla log Symfony
docker compose -f docker-compose.production.yml exec app \
  cat var/log/prod.log | tail -50

# Pulisci cache
docker compose -f docker-compose.production.yml exec app \
  php bin/console cache:clear --env=prod
```

### Disco pieno

```bash
# Verifica spazio
df -h

# Pulizia Docker
docker system prune -f

# Pulizia log vecchi
docker compose -f docker-compose.production.yml exec app \
  find var/log -name "*.log" -mtime +7 -delete
```

---

## 12. Riferimenti Risorse

### Architettura Finale

```
Internet → :80/:443 → Traefik (reverse proxy + SSL)
                          ├── Host registro.*        → Next.js (Node.js standalone)
                          ├── Host registro.* /api/* → Symfony API (PHP 8.2 + Apache)
                          └── Host legacy.*          → Symfony legacy (Twig + Apache)
                                     │                         │
                       MySQL 8.0 ◄───┴──────────── Worker Messenger (rete interna)
```

### Container in Produzione

| Container          | Immagine          | RAM stimata | Porta esposta |
|--------------------|-------------------|-------------|---------------|
| registro_traefik   | traefik:v3.3      | ~30 MB      | 80, 443       |
| registro_app       | php:8.2-apache    | ~200 MB     | Nessuna       |
| registro_worker    | php:8.2-apache    | ~150 MB     | Nessuna       |
| registro_frontend  | node:20-alpine    | ~100 MB     | Nessuna       |
| registro_db        | mysql:8.0         | ~300-500 MB | Nessuna       |

### Volumi Persistenti

| Volume                  | Contenuto                    |
|------------------------|------------------------------|
| registro_db_data       | Dati MySQL                   |
| registro_jwt_keys      | Chiavi JWT autenticazione    |
| registro_symfony_files | Upload, archivi e allegati   |
| registro_symfony_logs  | Log Symfony e worker         |
| registro_symfony_sessions | Sessioni backend legacy   |
| registro_letsencrypt   | Certificati SSL              |
| registro_traefik_logs  | Log accesso reverse proxy    |

### Porte

| Porta | Servizio | Accesso         |
|-------|----------|-----------------|
| 80    | Traefik  | Pubblico (redirect → 443) |
| 443   | Traefik  | Pubblico (HTTPS) |
| 3306  | MySQL    | Solo rete Docker interna |

### Comandi Rapidi

```bash
# Avvio
docker compose -f docker-compose.production.yml up -d

# Stop
docker compose -f docker-compose.production.yml down

# Log
docker compose -f docker-compose.production.yml logs -f

# Stato
docker compose -f docker-compose.production.yml ps

# Ricostruisci dopo aggiornamento
docker compose -f docker-compose.production.yml up -d --build

# Backup DB
docker compose -f docker-compose.production.yml exec -T db \
  mysqldump -u root -pPASSWORD giuaschool | gzip > backup.sql.gz
```

---

**Documento redatto per il progetto giua@school — Registro Elettronico ACIIEF**
**Design e personalizzazione: istitutiparitari.com**
