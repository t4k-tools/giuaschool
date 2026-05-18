#!/bin/sh
set -eu

if [ "${AUTO_INIT_DB:-1}" != "1" ]; then
  echo "Skipping Giua bootstrap SQL because AUTO_INIT_DB=${AUTO_INIT_DB}"
  exit 0
fi

echo "Bootstrapping Giua schema and seed data..."

mysql \
  --database="${MYSQL_DATABASE}" \
  --user=root \
  --password="${MYSQL_ROOT_PASSWORD}" \
  < /docker-init/create-db.sql

mysql \
  --database="${MYSQL_DATABASE}" \
  --user=root \
  --password="${MYSQL_ROOT_PASSWORD}" \
  < /docker-init/init-db.sql
