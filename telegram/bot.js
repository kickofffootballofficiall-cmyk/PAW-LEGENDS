#!/usr/bin/env node
/* =============================================================================
   PAW LEGENDS — Telegram Bot + Mini App köprüsü (SIFIR bagimlilik)
   Calistirma:
     TG_BOT_TOKEN="123456:AAA..." TG_GAME_URL="https://sunucu.example.com/" \
     TG_API_URL="http://127.0.0.1:8787" ADMIN_PASS="..." PAW_SECRET="..." \
     TG_ADMIN_IDS="123456789" node telegram/bot.js
   Ozellikler:
     /start        → "🎮 Oyunu Aç" Mini App butonu
     /yardim       → komut listesi
     /liderlik     → canli liderlik tablosu (oyun API'sinden)
     /ban /unban /duyuru /oyuncular /istatistik  → admin komutlari (TG_ADMIN_IDS)
   Menu butonu: sohbet kutusunun yanindaki buton da Mini App'i acar
   (baslangicta setChatMenuButton ile otomatik kurulur).
   ========================================================================== */
"use strict";
const https = require("https");
const http = require("http");
const crypto = require("crypto");

const TOKEN = process.env.TG_BOT_TOKEN || "";
const GAME_URL = (process.env.TG_GAME_URL || "http://localhost:8080").replace(/\/$/, "");
const API_URL = (process.env.TG_API_URL || "http://127.0.0.1:8787").replace(/\/$/, "");
const ADMIN_IDS = (process.env.TG_ADMIN_IDS || "").split(",").map(function (x) { return Number(x); }).filter(Boolean);
const ADMIN_PASS = process.env.ADMIN_PASS || "pawlegends-admin";
const PAW_SECRET = process.env.PAW_SECRET || "paw-legends-local-secret-v7";

if (!TOKEN) {
  console.error("HATA: TG_BOT_TOKEN ortam degiskeni zorunlu (BotFather'dan al).");
  process.exit(1);
}

function tg(method, payload, cb) {
  const body = JSON.stringify(payload || {});
  const r = https.request("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
  }, function (res) {
    let s = "";
    res.on("data", function (c) { s += c; });
    res.on("end", function () {
      let j = {};
      try { j = JSON.parse(s); } catch (e) { }
      if (cb) cb(j.ok === true, j);
    });
  });
  r.on("error", function (e) { if (cb) cb(false, { description: e.message }); });
  r.end(body);
}
function apiGet(path, headers, cb) {
  const mod = API_URL.indexOf("https://") === 0 ? https : http;
  mod.get(API_URL + path, { headers: headers || {} }, function (res) {
    let s = "";
    res.on("data", function (c) { s += c; });
    res.on("end", function () {
      let j = {};
      try { j = JSON.parse(s); } catch (e) { }
      cb(res.statusCode, j);
    });
  }).on("error", function () { cb(0, { error: "network" }); });
}
function apiPost(path, body, headers, cb) {
  const data = JSON.stringify(body || {});
  const mod = API_URL.indexOf("https://") === 0 ? https : http;
  const r = mod.request(API_URL + path, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }, headers || {})
  }, function (res) {
    let s = "";
    res.on("data", function (c) { s += c; });
    res.on("end", function () {
      let j = {};
      try { j = JSON.parse(s); } catch (e) { }
      cb(res.statusCode, j);
    });
  });
  r.on("error", function () { cb(0, { error: "network" }); });
  r.end(data);
}
function hmac(s) { return crypto.createHmac("sha256", PAW_SECRET).update(s).digest("hex").slice(0, 40); }
const ADMIN_H = { "X-Admin": hmac("admin:" + ADMIN_PASS) };

const HELP =
  "🐾 PAW LEGENDS: DOG WORLD\n" +
  "🎮 Oyunu Aç — Mini App olarak oynarsın\n" +
  "/liderlik — canlı global liderlik tablosu\n" +
  "/yardim — bu mesaj\n" +
  (ADMIN_IDS.length ? "\n🛡 Admin: /oyuncular /istatistik /ban <kod> <saat> /unban <kod> /duyuru <metin>" : "");

function sendMsg(chat, text, kb) {
  const p = { chat_id: chat, text: text, parse_mode: "HTML" };
  if (kb) p.reply_markup = kb;
  tg("sendMessage", p);
}
const GAME_BTN = { inline_keyboard: [[{ text: "🎮 Oyunu Aç", web_app: { url: GAME_URL } }]] };

function handle(msg) {
  const chat = msg.chat.id;
  const txt = String(msg.text || "").trim();
  const from = msg.from ? msg.from.id : 0;
  const isAdmin = ADMIN_IDS.indexOf(from) >= 0;

  if (txt === "/start") {
    sendMsg(chat, "🐾 <b>PAW LEGENDS: DOG WORLD</b>\n100 köpek ırkı, gerçek genetik, savaşlar ve pazar!\nAşağıdaki butonla oyunu Telegram içinde aç:\n\n🆔 Telegram ID'n: <code>" + from + "</code> (admin komutları için bunu sakla)", GAME_BTN);
    return;
  }
  if (txt === "/yardim" || txt === "/help") { sendMsg(chat, HELP); return; }
  if (txt === "/liderlik" || txt === "/leaderboard") {
    apiGet("/api/leaderboard", null, function (st, j) {
      if (st !== 200 || !j.rows) return sendMsg(chat, "⚠️ Oyun sunucusuna ulaşılamadı.");
      const top = j.rows.slice(0, 10).map(function (r, i) {
        return (i + 1) + ". " + r.name + " — " + r.rating + " Elo, " + r.dogs + " köpek";
      }).join("\n");
      sendMsg(chat, "🏆 <b>Liderlik Tablosu</b>\n" + (top || "Henüz oyuncu yok."));
    });
    return;
  }
  if (!isAdmin) {
    if (txt.indexOf("/") === 0) sendMsg(chat, "Bu komut için yetkin yok. 🐾");
    return;
  }
  /* ------------------------- ADMIN KOMUTLARI ------------------------- */
  const m = txt.match(/^\/(\w+)\s*(.*)$/);
  const cmd = m ? m[1] : "";
  const arg = m ? m[2].trim() : "";
  if (cmd === "istatistik") {
    apiGet("/admin/api/overview", null === null ? ADMIN_H : ADMIN_H, function (st, j) {
      if (st !== 200) return sendMsg(chat, "⚠️ Admin API hatası: " + st);
      sendMsg(chat, "📊 Oyuncu: " + j.users + " | Çevrimiçi: " + j.online + " | Yasaklı: " + j.banned +
        "\nAktif ilan: " + j.listings + " | Pazar hacmi: " + Number(j.ledgerVolume).toLocaleString("tr-TR") +
        "\nÇalışma: " + Math.floor(j.uptimeSec / 60) + " dk");
    });
    return;
  }
  if (cmd === "oyuncular") {
    apiGet("/admin/api/players", ADMIN_H, function (st, j) {
      if (st !== 200) return sendMsg(chat, "⚠️ Admin API hatası: " + st);
      const rows = j.rows.slice(0, 15).map(function (r) {
        return "• " + r.code + " " + r.name + " — " + r.balance.toLocaleString("tr-TR") + " p, " + r.rating + " Elo" + (r.banned ? " ⛔" : (r.online ? " 🟢" : ""));
      }).join("\n");
      sendMsg(chat, "👥 <b>Oyuncular</b> (" + j.rows.length + ")\n" + (rows || "Boş."));
    });
    return;
  }
  if (cmd === "ban" || cmd === "unban") {
    const pm = arg.match(/^(PAW-[A-Z0-9]{6})(?:\s+(\d+))?/i);
    if (!pm) return sendMsg(chat, "Kullanım: /ban PAW-KOD123 [saat] veya /unban PAW-KOD123");
    apiPost("/admin/api/action", {
      type: cmd, code: pm[1].toUpperCase(),
      hours: cmd === "ban" ? Number(pm[2] || 0) : undefined,
      reason: cmd === "ban" ? "Telegram admin komutu" : undefined
    }, ADMIN_H, function (st, j) {
      sendMsg(chat, st === 200 ? "✅ " + pm[1].toUpperCase() + " için " + cmd + " uygulandı." : "⚠️ Hata: " + (j.error || st));
    });
    return;
  }
  if (cmd === "duyuru") {
    if (!arg) return sendMsg(chat, "Kullanım: /duyuru <metin>");
    apiPost("/admin/api/action", { type: "announce", text: arg }, ADMIN_H, function (st, j) {
      sendMsg(chat, st === 200 ? "📢 Duyuru tüm oyunculara gönderildi." : "⚠️ Hata: " + (j.error || st));
    });
    return;
  }
  if (txt.indexOf("/") === 0) sendMsg(chat, "Bilinmeyen admin komutu. /yardim");
}

/* ------------------------------------------------------- POLLING -------- */
let offset = 0;
function poll() {
  https.get("https://api.telegram.org/bot" + TOKEN + "/getUpdates?timeout=25&offset=" + offset, function (res) {
    let s = "";
    res.on("data", function (c) { s += c; });
    res.on("end", function () {
      let j = {};
      try { j = JSON.parse(s); } catch (e) { }
      if (j.ok && j.result) {
        for (const u of j.result) {
          offset = u.update_id + 1;
          if (u.message) { try { handle(u.message); } catch (e) { console.error("handler:", e.message); } }
        }
      }
      setTimeout(poll, j.ok ? 300 : 5000);
    });
  }).on("error", function () { setTimeout(poll, 5000); });
}

tg("getMe", {}, function (ok, j) {
  if (!ok) { console.error("Bot token gecersiz:", j.description); process.exit(1); }
  console.log("🐾 Bot hazir: @" + j.result.username);
  tg("setChatMenuButton", { menu_button: { type: "web_app", text: "🎮 Oyunu Aç", web_app: { url: GAME_URL } } }, function (ok2) {
    console.log(ok2 ? "✅ Menu butonu Mini App'e ayarlandi: " + GAME_URL : "⚠ Menu butonu ayarlanamadi");
  });
  tg("setMyCommands", { commands: [
    { command: "start", description: "Menü + oyunu aç" },
    { command: "yardim", description: "Komut listesi" },
    { command: "liderlik", description: "Canlı liderlik tablosu" }
  ] }, function (ok3) { if (ok3) console.log("✅ Bot komut listesi ayarlandi"); });
  poll();
});
