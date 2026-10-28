FROM node:22-slim

RUN node --version

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    cron \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# 生产构建可用 --build-arg 传入真实公网地址（bake 进构建产物）；
# 不传则 prebuild 会自动用 .env.example 的开发默认值生成 .env
ARG PUBLIC_API_URL
ARG PUBLIC_HOST
RUN if [ -n "$PUBLIC_API_URL" ]; then \
    printf 'PUBLIC_API_URL=%s\nPUBLIC_HOST=%s\n' "$PUBLIC_API_URL" "$PUBLIC_HOST" > .env; \
    fi
RUN npm run build

COPY config/crontab /etc/cron.d/my-cron-task
COPY config/entrypoint.sh /app/entrypoint.sh

RUN chmod 0644 /etc/cron.d/my-cron-task \
    && chmod +x /app/entrypoint.sh \
    && touch /var/log/cron.log

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
