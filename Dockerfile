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
&& pip install autoremove-torrents flask pyyaml

COPY config.example.yml config.yml
COPY webui /app/webui
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENV OPTS='-c /app/config.yml'
ENV CRON='*/5 * * * *'
ENV WEBUI_PORT=8080

EXPOSE 8080

ENTRYPOINT ["/bin/sh", "/app/entrypoint.sh"]
