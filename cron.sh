#!/usr/bin/env bash

if [ -z "$CRON" ]
  then
    echo "INFO: No CRON setting found. Running autoremove once."
    /app/.venv/bin/autoremove-torrents $OPTS
  else
    # Setup cron schedule
    echo "$CRON /app/.venv/bin/autoremove-torrents $OPTS >> /app/autoremove-torrents.log 2>&1" > /tmp/crontab.tmp
    crontab /tmp/crontab.tmp
    crontab -l
    rm /tmp/crontab.tmp
    # Start cron
    echo "INFO: Starting cron ..."
    touch /var/log/crond.log
    cron -f &
    echo "INFO: cron started"
    tail -F /var/log/crond.log /app/autoremove-torrents.log
  fi
fi
