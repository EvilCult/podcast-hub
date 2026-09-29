FROM node:22-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    cron \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

COPY config/crontab /etc/cron.d/my-cron-task
COPY config/entrypoint.sh /app/entrypoint.sh

RUN chmod 0644 /etc/cron.d/my-cron-task \
    && chmod +x /app/entrypoint.sh \
    && touch /var/log/cron.log

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
