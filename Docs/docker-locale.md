# Docker locale su questa macchina

## Obiettivo

Avviare Giua Registro in Docker senza conflitti con i servizi gia attivi sull'host.

## Porte scelte

- Backend Symfony: `8082`
- Frontend Next.js: `3001`
- MySQL: `3308`

## Motivazione

Sulla macchina host risultano gia usate:

- `80` da Apache
- `8080` da Nginx
- `8081` da gfor

Per questo il compose locale di `registro` usa porte diverse.

## Avvio

```bash
cd /home/gigas/Progetti/registro
docker compose up -d --build
```

## Accesso

- backend legacy: `http://10.10.40.135:8082`
- frontend refactor: `http://10.10.40.135:3001`

## Note

- `cloudflared` fa parte dell'avvio standard.
- Il tunnel configurato inoltra `registro.efor.it` verso il servizio `frontend:3000`.
