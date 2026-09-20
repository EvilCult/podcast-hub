FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    cron \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY config/crontab /etc/cron.d/my-cron-task
COPY config/entrypoint.sh /app/entrypoint.sh

RUN chmod 0644 /etc/cron.d/my-cron-task \
    && chmod +x /app/entrypoint.sh \
    && touch /var/log/cron.log

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
