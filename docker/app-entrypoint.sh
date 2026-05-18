#!/bin/sh
set -eu

APP_DIR=/var/www/html
JWT_DIR="$APP_DIR/config/jwt"

mkdir -p \
  "$APP_DIR/FILES" \
  "$APP_DIR/var/cache" \
  "$APP_DIR/var/log" \
  "$APP_DIR/var/sessions" \
  "$JWT_DIR"

chown -R www-data:www-data \
  "$APP_DIR/FILES" \
  "$APP_DIR/var" \
  "$JWT_DIR"

if [ -n "${JWT_PASSPHRASE:-}" ] && { [ ! -s "$JWT_DIR/private.pem" ] || [ ! -s "$JWT_DIR/public.pem" ]; }; then
  echo "Generating JWT keypair..."
  umask 077
  openssl genpkey \
    -out "$JWT_DIR/private.pem" \
    -aes256 \
    -algorithm rsa \
    -pass pass:"$JWT_PASSPHRASE" \
    -pkeyopt rsa_keygen_bits:4096
  openssl pkey \
    -in "$JWT_DIR/private.pem" \
    -passin pass:"$JWT_PASSPHRASE" \
    -out "$JWT_DIR/public.pem" \
    -pubout
  chown www-data:www-data "$JWT_DIR/private.pem" "$JWT_DIR/public.pem"
fi

if [ "${APP_ENV:-prod}" = "prod" ] && [ "${SKIP_CACHE_WARMUP:-0}" != "1" ]; then
  php "$APP_DIR/bin/console" cache:warmup --env=prod --no-debug >/dev/null 2>&1 || true
fi

exec "$@"
