#!/bin/sh
# PAW LEGENDS — tek konteyner / tek VPS baslatici
# API + oyun + admin paneli: TEK port ($PORT, varsayilan 8787)
# TG_BOT_TOKEN tanimliysa Telegram botu da ayni surec grubunda calisir.
set -e
cd "$(dirname "$0")/.."

PORT="${PORT:-8787}"
DB_FILE="${DB_FILE:-$(pwd)/server/db.json}"
mkdir -p "$(dirname "$DB_FILE")"
export PORT DB_FILE

echo "[run] API + oyun + admin: 0.0.0.0:$PORT (db: $DB_FILE)"
node server/index.js &
API_PID=$!

if [ -n "$TG_BOT_TOKEN" ]; then
  TG_GAME_URL="${TG_GAME_URL:-http://127.0.0.1:$PORT}"
  TG_API_URL="http://127.0.0.1:$PORT"
  export TG_GAME_URL TG_API_URL
  echo "[run] Telegram bot baslatiliyor (Mini App URL: $TG_GAME_URL)"
  node telegram/bot.js &
  BOT_PID=$!
else
  echo "[run] TG_BOT_TOKEN yok — bot baslatilmadi (oyun yine de calisir)"
fi

term() {
  echo "[run] kapatiliyor..."
  kill "$API_PID" ${BOT_PID:+"$BOT_PID"} 2>/dev/null || true
  wait
}
trap term TERM INT
wait
