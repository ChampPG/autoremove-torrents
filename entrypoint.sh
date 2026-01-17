#!/usr/bin/env bash
set -e

# Start Web UI in the background (default port 8080)
/app/.venv/bin/python /app/webui/app.py &

# Run cron/autoremove (original behavior)
exec /bin/sh /usr/bin/cron.sh

