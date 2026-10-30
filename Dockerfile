# PAW LEGENDS: DOG WORLD — hepsi bir arada konteyner
# Oyun (statik) + API + admin paneli TEK portta (8787); TG_BOT_TOKEN verilirse bot da aynı konteynerde çalışır.
# Sıfır npm bağımlılığı — sadece Node.
FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=8787 \
    NODE_ENV=production \
    DB_FILE=/data/db.json
EXPOSE 8787
# Kalıcı veri: DB_FILE=/data/db.json → /data volume'ünü bağla (Fly: volume, VPS: -v paw-data:/data)
VOLUME ["/data"]
CMD ["sh", "deploy/run.sh"]
