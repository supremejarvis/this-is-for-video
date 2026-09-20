#!/bin/sh
set -e

echo "🚀 [Apollo Backend Entrypoint] Starting Apollo Engineering FastAPI container..."

# Check and wait for PostgreSQL database connectivity
if [ -n "$DATABASE_URL" ]; then
  echo "📡 [Apollo Backend Entrypoint] Checking database connectivity..."
  python -c "
import os, sys, time, urllib.parse, socket

db_url = os.environ.get('DATABASE_URL', '')
if 'postgres' in db_url:
    # Handle asyncpg or standard postgres url
    clean_url = db_url.replace('postgresql+asyncpg://', 'http://').replace('postgresql://', 'http://')
    parsed = urllib.parse.urlparse(clean_url)
    host = parsed.hostname or 'postgres'
    port = parsed.port or 5432
    max_retries = 30
    print(f'Waiting for PostgreSQL at {host}:{port}...')
    for attempt in range(1, max_retries + 1):
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f'✓ Successfully connected to PostgreSQL at {host}:{port}!')
                sys.exit(0)
        except OSError as e:
            if attempt % 5 == 0 or attempt == 1:
                print(f'[{attempt}/{max_retries}] PostgreSQL not ready yet ({e}). Retrying in 1s...')
            time.sleep(1)
    print('⚠️ PostgreSQL connection timeout. Proceeding with application boot.')
"
  
  # Run Alembic migrations automatically on startup
  echo "🗄️ [Apollo Backend Entrypoint] Running Alembic migrations (upgrade head)..."
  alembic upgrade head || echo "⚠️ [Apollo Backend Entrypoint] Migration warning - proceeding with startup"
fi

echo "🟢 [Apollo Backend Entrypoint] Starting application process: $@"
exec "$@"
