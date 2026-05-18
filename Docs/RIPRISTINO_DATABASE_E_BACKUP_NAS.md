# Ripristino Database e Backup su NAS

## Ripristino del database `registro`

File di backup attuale:

- `/home/gigas/Progetti/registro/Docs/backup-20260402-174537.sql`

Prerequisiti:

- i container `db`, `app` e `frontend` devono esistere nel progetto
- eseguire i comandi dalla directory `/home/gigas/Progetti/registro`

### 1. Entrare nella directory del progetto

```bash
cd /home/gigas/Progetti/registro
```

### 2. Fermare applicazione e frontend

```bash
sudo docker compose stop app frontend
```

### 3. Ricreare il database vuoto

```bash
sudo docker compose exec db mysql -uroot -proot -e "DROP DATABASE IF EXISTS giuaschool; CREATE DATABASE giuaschool CHARACTER SET utf8 COLLATE utf8_unicode_ci;"
```

### 4. Importare il dump SQL

```bash
sudo docker compose exec -T db mysql -uroot -proot giuaschool < /home/gigas/Progetti/registro/Docs/backup-20260402-174537.sql
```

### 5. Verificare che gli utenti siano presenti

```bash
sudo docker compose exec db mysql -uroot -proot giuaschool -e "SELECT COUNT(*) AS utenti FROM gs_utente; SELECT id, username, email, ruolo, abilitato FROM gs_utente ORDER BY id LIMIT 20;"
```

### 6. Riavviare applicazione e frontend

```bash
sudo docker compose start app frontend
```

### 7. Verifica finale

```bash
sudo docker compose ps
sudo docker compose logs --since=2m app frontend db
```

URL utili:

- frontend locale: `http://10.10.40.135:3001`
- backend locale: `http://10.10.40.135:8082`
- tunnel: `https://registro.efor.it`

## Backup del progetto `registro` su NAS

Al momento il NAS non risulta montato su questa macchina. Prima va montato, oppure va usato un percorso NAS gia montato.

### Caso A: il NAS e gia montato

Se il NAS e gia disponibile, ad esempio su `/mnt/nas` oppure `/media/gigas/NAS`, copia il progetto con `rsync`:

```bash
rsync -avh --delete /home/gigas/Progetti/registro/ /PERCORSO_NAS/registro/
```

Esempio:

```bash
rsync -avh --delete /home/gigas/Progetti/registro/ /mnt/nas/backup/registro/
```

Questo metodo:

- copia solo le differenze
- preserva struttura e timestamp
- permette aggiornamenti successivi rapidi

### Caso B: il NAS non e montato

Creare un punto di mount:

```bash
sudo mkdir -p /mnt/nas
```

Montare una condivisione SMB/CIFS:

```bash
sudo mount -t cifs //IP_DEL_NAS/NOME_CONDIVISIONE /mnt/nas -o username=TUO_UTENTE,password=TUA_PASSWORD,uid=$(id -u),gid=$(id -g),iocharset=utf8
```

Esempio:

```bash
sudo mount -t cifs //10.10.40.10/backup /mnt/nas -o username=gigas,password=PASSWORD,uid=$(id -u),gid=$(id -g),iocharset=utf8
```

Dopo il mount, copiare il progetto:

```bash
rsync -avh --delete /home/gigas/Progetti/registro/ /mnt/nas/registro/
```

Quando hai finito:

```bash
sudo umount /mnt/nas
```

## Backup consigliati

Per un backup davvero utile di `registro`, conviene salvare entrambe le cose:

- il progetto: `/home/gigas/Progetti/registro/`
- il dump database: `/home/gigas/Progetti/registro/Docs/backup-20260402-174537.sql`

Se vuoi creare una copia compressa del solo progetto prima di inviarla al NAS:

```bash
cd /home/gigas/Progetti
tar -czf registro-project-$(date +%Y%m%d-%H%M%S).tar.gz registro
```

Poi copiarla sul NAS:

```bash
rsync -avh registro-project-*.tar.gz /mnt/nas/
```

## Nota pratica

La directory `registro` contiene anche componenti generate localmente come `refactor/node_modules`, `refactor/.next` e file temporanei. Se vuoi un backup piu leggero, posso preparare anche una procedura `rsync` che escluda:

- `refactor/node_modules`
- `refactor/.next`
- `src/vendor`
- cache e log temporanei
