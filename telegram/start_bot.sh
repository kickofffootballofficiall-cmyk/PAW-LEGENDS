#!/usr/bin/env bash
# PAW LEGENDS — Telegram bot + API baslatma (tek komut)
# Kullanim:  TG_BOT_TOKEN="123456:AAA..." TG_ADMIN_IDS="123456789" bash telegram/start_bot.sh
set -e
cd "$(dirname "$0")/.."

if [ -z "$TG_BOT_TOKEN" ]; then echo "HATA: TG_BOT_TOKEN gerekli (BotFather dan al)"; exit 1; fi
export TG_API_URL="${TG_API_URL:-https://cork-believed-reservations-saw.trycloudflare.com}"
export TG_GAME_URL="${TG_GAME_URL:-$TG_API_URL}"   # oyun artik API ile ayni porttan servis ediliyor
export ADMIN_PASS="${ADMIN_PASS:-pawlegends-admin}"
export PAW_SECRET="${PAW_SECRET:-paw-legends-local-secret-v7}"
export TG_ADMIN_IDS="${TG_ADMIN_IDS:-2084906139}"
export PORT="${PORT:-8787}"

# API sunucusunu TG_BOT_TOKEN ile yeniden baslat (initData dogrulamasi icin sart)
pkill -f "node server/index[.]js" 2>/dev/null || true
sleep 1
TG_BOT_TOKEN="$TG_BOT_TOKEN" PORT="$PORT" ADMIN_PASS="$ADMIN_PASS" PAW_SECRET="$PAW_SECRET" \
  nohup node server/index.js > server.log 2>&1 &
echo "API basladi: port $PORT (log: server.log)"

# Botu baslat (on planda calisir, Ctrl+C ile durur)
TG_BOT_TOKEN="$TG_BOT_TOKEN" TG_GAME_URL="$TG_GAME_URL" TG_API_URL="http://127.0.0.1:$PORT" \
ADMIN_PASS="$ADMIN_PASS" PAW_SECRET="$PAW_SECRET" TG_ADMIN_IDS="$TG_ADMIN_IDS" \
  node telegram/bot.js
