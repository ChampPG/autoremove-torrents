FROM python:3.10-slim

WORKDIR /app

RUN apt-get update \
&& apt-get install gcc cron -y -q \
&& apt-get clean

RUN touch /app/autoremove-torrents.log

ADD cron.sh /usr/bin/cron.sh
RUN chmod +x /usr/bin/cron.sh

RUN python3 -m venv .venv \
&& . ./.venv/bin/activate \
&& pip install autoremove-torrents

COPY config.example.yml config.yml

ENV OPTS '-c /app/config.yml'
ENV CRON '*/5 * * * *'

ENTRYPOINT ["/bin/sh", "/usr/bin/cron.sh"]
