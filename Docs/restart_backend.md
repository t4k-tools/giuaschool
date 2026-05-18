# Procedura — Riavvio backend Symfony

Ultimo aggiornamento: 2026-04-30

## Quando serve

Va eseguita ogni volta che cambia qualcosa che il backend Symfony legge **all'avvio** e tiene in cache durante l'esecuzione:

- modifiche a `src/config/packages/*.yaml` (incluso `lexik_jwt_authentication.yaml`, `security.yaml`, ecc.)
- modifiche a `src/config/services.yaml`
- modifiche a `composer.json` o aggiornamento di dipendenze (`composer install`)
- bind di nuove env var in `services.yaml` o nuove voci in `.env`
- migrazioni di schema database

Per modifiche a controller/entity/template Twig in genere **non serve riavviare** il container in dev (PHP rilegge i file a ogni richiesta), ma in produzione (con OPcache attivo) il riavvio e' consigliato per essere certi di servire la versione corretta.

## Architettura del deploy

Il backend gira come container Docker. Service compose pertinenti:

| Service | Container | Ruolo |
|---|---|---|
| `app` | `registro_app` | Symfony backend (PHP-FPM) |
| `worker` (solo prod) | `registro_worker` | Worker async messaggistica/email |
| `frontend` | `registro_frontend` | Next.js refactor |
| `db` | `registro_db` | MariaDB/MySQL |
| `traefik` (solo prod) | `registro_traefik` | Reverse proxy + TLS |

## Procedura per ambiente di sviluppo locale

File compose: `docker-compose.yml`

```bash
cd /home/gigas/Progetti/registro

# riavvia solo il backend Symfony
docker compose restart app

# verifica che sia ripartito
docker compose ps app
docker compose logs --tail=30 app
```

Se hai modificato anche `composer.json` o aggiunto nuovi bundle in `bundles.php`, rebuild dell'immagine:

```bash
docker compose up -d --build app
```

## Procedura per produzione

File compose: `docker-compose.production.yml`

> Verificare prima quale file viene effettivamente usato sul server: alcune installazioni hanno un `compose.yml` dedicato o usano `--file` esplicito.

```bash
cd /percorso/al/progetto/sul/server

# riavvio backend principale + worker async
docker compose -f docker-compose.production.yml restart app worker

# verifica
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=50 app
```

### Verifica pulizia cache Symfony

In produzione e' attiva la cache Symfony. Se il riavvio non basta, forzare il clear:

```bash
docker compose -f docker-compose.production.yml exec app php bin/console cache:clear --env=prod --no-warmup
docker compose -f docker-compose.production.yml exec app php bin/console cache:warmup --env=prod
```

## Cosa fare se al riavvio compaiono errori

### `app` non si avvia

```bash
docker compose logs app
```

Errori frequenti:

- **`SyntaxError` in YAML** — virgolette/indentazione errate in `lexik_jwt_authentication.yaml` o `services.yaml`. Annullare la modifica, riprovare con sintassi corretta
- **`UnknownPropertyException`** — chiave config non riconosciuta dal bundle. Verificare versione del bundle in `composer.json`
- **`PassPhraseInvalid` su JWT** — la passphrase delle chiavi non corrisponde al valore di `JWT_PASSPHRASE` in `.env`

### Errori 500 dopo il riavvio

```bash
docker compose exec app tail -f var/log/prod.log
```

In genere indicano problemi di runtime (DI, services). Annullare la modifica e riprovare con un cambio piu' piccolo per isolare la causa.

## Verifiche post-riavvio

### Check rapido sulla salute del backend

```bash
# il backend risponde su /api/public/info anche senza auth
curl -i https://registro.efor.it/api/public/info
```

Risposta attesa: HTTP 200 + JSON con metadata istituto.

### Check specifico per `token_ttl` JWT

Dopo il riavvio, fare un nuovo login dal frontend Next.js e ispezionare il token ricevuto:

```bash
# decodifica payload del JWT (parte tra i due punti)
echo "<TOKEN>" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

Verificare che la differenza tra `exp` e `iat` corrisponda al valore configurato:

| TTL atteso | `exp - iat` |
|---|---|
| 1h | 3600 |
| 8h | 28800 |
| 24h | 86400 |

I token **gia emessi** prima del riavvio mantengono il TTL originario (sono stati firmati con i parametri vecchi). Solo i nuovi login beneficiano del cambio.

## Tornare indietro su un cambio config

Tutti i file di config sono in git. Per annullare:

```bash
git checkout HEAD -- src/config/packages/lexik_jwt_authentication.yaml
docker compose restart app
```

Se la modifica problematica e' gia stata committata e pushata:

```bash
# revert del commit (sicuro, crea un nuovo commit di rollback)
git revert <hash-commit>
git push origin main
```

## Storico modifiche

| Data | Cambiamento |
|---|---|
| 2026-04-30 | Versione iniziale della procedura |
