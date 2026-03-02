#!/bin/sh
set -e

echo "[homelabarr] Running database migrations..."
node /app/migrate.js

echo "[homelabarr] Starting server..."
exec node /app/server.js
