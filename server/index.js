#!/usr/bin/env node
/* =============================================================================
   PAW LEGENDS: DOG WORLD — cevrim ici sunucu (SIFIR bagimlilik, sadece node:http)
   Calistirma:  node server/index.js  [PORT]
   Varsayilan port: 8787
   Veri: server/db.json (otomatik olusturulur)
   Gorevler: hesap oturumlari (HMAC), pazar (atomik al/sat, cift harcama korumali),
   arkadas sistemi, liderlik tablosu, cevrimdisi kazanc dogrulamasi.
   ========================================================================== */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = parseInt(process.argv[2] || process.env.PORT || "8787", 10);
const DB_PATH = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(__dirname, "db.json");
const SECRET = process.env.PAW_SECRET || "paw-legends-local-secret-v7";
const ADMIN_PASS = process.env.ADMIN_PASS || "pawlegends-admin";
const ADMIN_HTML = path.join(__dirname, "admin.html");

const BAL = {
  offline_cap_hours: 8,
  offline_efficiency: 0.75,
  market_fee: 0.05,
  market_min: 1000,
  market_max: 50000000
};

/* ------------------------------------------------------------------ DB ---- */
let db = { users: {}, listings: {}, ledger: [], seq: 1, adminLog: [], announcements: [] };
function loadDb() {
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_PATH, "utf8"))); }
  catch (e) { /* ilk calistirma */ }
}
let saveTimer = null;
function saveDb() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try { fs.writeFileSync(DB_PATH, JSON.stringify(db)); } catch (e) { console.error("db write fail", e.message); }
  }, 250);
}
loadDb();

/* Admin tarafinda kopek uretmek icin istemciyle AYNI motor kullanilir */
global.window = global;
try {
  require(path.join(__dirname, "..", "src", "js", "core", "data_bundle.js"));
  require(path.join(__dirname, "..", "src", "js", "core", "engine.js"));
} catch (e) { console.error("Motor yuklenemedi (kopek uretimi devre disi):", e.message); }
const ENG = (global.PL && global.PL.engine) || null;
const DBX = (global.PL && global.PL.DB) || null;
function genDog(breedId) {
  if (!ENG || !DBX) return null;
  let b = breedId;
  if (!b || !DBX.breeds.some(function (x) { return x.id === b; })) {
    b = DBX.breeds[Math.floor(Math.random() * DBX.breeds.length)].id;
  }
  return ENG.makeDog(b, { seed: Math.floor(Math.random() * 1e9), bornAt: Date.now() - 26 * 3600e3 });
}

function hmac(s) { return crypto.createHmac("sha256", SECRET).update(s).digest("hex").slice(0, 40); }
function tokenFor(code) { return hmac("token:" + code); }
function auth(req) {
  const t = req.headers["x-auth"];
  if (!t) return null;
  for (const code of Object.keys(db.users)) if (tokenFor(code) === t) return db.users[code];
  return null;
}
function adminAuth(req) { return req.headers["x-admin"] === hmac("admin:" + ADMIN_PASS); }
function isBanned(u) { return !!(u && u.banned && (u.banned.until === 0 || u.banned.until > Date.now())); }
/* Cevrimici durumu: son 90 sn icinde heartbeat/istek atmisse ve acikca "ciktim" demediyse */
function isOnline(u) {
  if (!u || !u.lastSeenAt) return false;
  if (u.leftAt && u.leftAt >= u.lastSeenAt) return false;
  return Date.now() - u.lastSeenAt < 90000;
}
function touch(u) { if (!u) return; u.lastSeenAt = Date.now(); if (u.leftAt) delete u.leftAt; }
function logAdmin(type, code, detail) {
  db.adminLog = db.adminLog || [];
  db.adminLog.unshift({ ts: Date.now(), type: type, code: code || "-", detail: detail || "" });
  if (db.adminLog.length > 300) db.adminLog.length = 300;
}
/* Telegram Mini App initData dogrulamasi (resmi WebAppData HMAC şeması) */
function tgValidate(initData) {
  const BOT = process.env.TG_BOT_TOKEN;
  if (!BOT || !initData) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  const pairs = [];
  for (const [k, v] of params.entries()) if (k !== "hash") pairs.push(k + "=" + v);
  pairs.sort();
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT).digest();
  const calc = crypto.createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  if (calc !== hash) return null;
  const auth = Number(params.get("auth_date") || 0);
  if (!auth || Date.now() / 1000 - auth > 86400) return null;
  const out = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}
const ROOT = path.join(__dirname, "..");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".gif": "image/gif", ".ico": "image/x-icon",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".m4a": "audio/mp4",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
  ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".apk": "application/vnd.android.package-archive", ".zip": "application/zip"
};
/* Oyun dosyalari beyaz listeden servis edilir (db.json, .git vb. ASLA) */
const STATIC_OK = ["/index.html", "/manifest.webmanifest", "/sw.js", "/admin_panel.html",
  "/README.md", "/INSTALL.md", "/LICENSES.md", "/src/", "/assets/", "/data/", "/scenes/", "/indir/"];
function serveStatic(res, p) {
  if (!STATIC_OK.some(function (pre) { return p === pre || p.indexOf(pre) === 0; })) return false;
  const fp = path.normalize(path.join(ROOT, p));
  if (fp.indexOf(ROOT) !== 0) return false;
  fs.stat(fp, function (err, stt) {
    if (err || !stt.isFile()) return send(res, 404, { error: "not found" });
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stt.size,
      "Cache-Control": p === "/index.html" ? "no-store" : "public, max-age=600",
      "Access-Control-Allow-Origin": "*"
    });
    fs.createReadStream(fp).pipe(res);
  });
  return true;
}
function serveAdminHtml(res) {
  fs.readFile(ADMIN_HTML, function (err, buf) {
    if (err) return send(res, 500, { error: "admin.html yok" });
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(buf);
  });
}

/* -------------------------------------------------------------- HELPERS --- */
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-Auth, X-Admin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store"
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => { data += c; if (data.length > 2e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { resolve({}); } });
  });
}
const lock = { market: false };

/* -------------------------------------------------------------- ROUTES ---- */
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;
  if (req.method === "OPTIONS") return send(res, 204, {});

  if (p === "/") return serveStatic(res, "/index.html");
  if (p === "/api" ) return send(res, 200, {
    name: "PAW LEGENDS: DOG WORLD API", version: "7.0.0", time: Date.now(),
    endpoints: ["/api/ping", "/api/auth/login", "/api/me", "/api/sync", "/api/leaderboard",
      "/api/market/listings", "/api/market/list", "/api/market/buy",
      "/api/friends", "/api/friends/request", "/api/friends/accept", "/api/verify/earnings",
      "/api/invite", "/api/invite/status", "/api/stars/invoice", "/api/stars/paid", "/api/dogs/ack"]
  });
  if (p === "/api/ping") return send(res, 200, { ok: true, time: Date.now(), version: "7.0.0" });

  if (p === "/api/auth/login" && req.method === "POST") {
    const b = await readBody(req);
    const name = String(b.name || "Oyuncu").slice(0, 24);
    let code = String(b.code || "").toUpperCase();
    if (!/^PAW-[A-Z0-9]{6}$/.test(code)) code = "PAW-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    if (!db.users[code]) {
      if (b.loginOnly) return send(res, 404, { error: "bu kod sunucuda kayitli degil" });
      db.users[code] = {
        code, name, createdAt: Date.now(), lastSeenAt: Date.now(),
        balance: 0, rating: 1000, wins: 0, losses: 0, dogs: 0, breeds: 0, level: 1,
        friends: [], incoming: [], outgoing: [], dogsList: []
      };
    }
    if (String(b.name || "").trim()) db.users[code].name = name;
    touch(db.users[code]);
    if (isBanned(db.users[code])) {
      return send(res, 403, { error: "banned", reason: db.users[code].banned.reason || "", until: db.users[code].banned.until });
    }
    saveDb();
    return send(res, 200, { token: tokenFor(code), user: pubUser(db.users[code]), balance: db.users[code].balance || 0, dogsList: db.users[code].dogsList || [] });
  }

  const me = auth(req);

  if (p === "/api/me") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    me.mail = me.mail || [];
    return send(res, 200, {
      user: pubUser(me), friends: me.friends, incoming: me.incoming,
      balance: me.balance || 0, dogsList: me.dogsList || [],
      mail: me.mail.filter(function (m) { return !m.read; }),
      announcement: (db.announcements || [])[0] || null,
      banned: isBanned(me)
    });
  }

  if (p === "/api/dogs/ack" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const uids = Array.isArray(b.uids) ? b.uids.map(String) : [];
    me.dogsList = (me.dogsList || []).filter(function (d) { return uids.indexOf(d.uid) < 0; });
    saveDb();
    return send(res, 200, { ok: true, remaining: me.dogsList.length });
  }

  if (p === "/api/mail/ack" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const ids = Array.isArray(b.ids) ? b.ids : [];
    me.mail = (me.mail || []).map(function (m) { return ids.indexOf(m.id) >= 0 ? Object.assign(m, { read: true }) : m; });
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (p === "/api/tg/login" && req.method === "POST") {
    if (!process.env.TG_BOT_TOKEN) return send(res, 503, { error: "telegram botu kurulu degil (TG_BOT_TOKEN)" });
    const b = await readBody(req);
    const d = tgValidate(String(b.initData || ""));
    if (!d || !d.user) return send(res, 401, { error: "initData dogrulanamadi" });
    let tu; try { tu = JSON.parse(d.user); } catch (e) { return send(res, 401, { error: "initData bozuk" }); }
    db.tg = db.tg || {};
    let code = db.tg[tu.id];
    if (!code) {
      code = "PAW-" + hmac("tg:" + tu.id).slice(0, 6).toUpperCase();
      if (!db.users[code]) {
        db.users[code] = {
          code: code, name: String((tu.first_name || "TG") + " " + (tu.last_name || "")).trim().slice(0, 24),
          createdAt: Date.now(), lastSeenAt: Date.now(),
          balance: 0, rating: 1000, wins: 0, losses: 0, dogs: 0, breeds: 0, level: 1,
          friends: [], incoming: [], outgoing: [], dogsList: []
        };
      }
      db.tg[tu.id] = code;
    }
    touch(db.users[code]);
    if (isBanned(db.users[code])) {
      return send(res, 403, { error: "banned", reason: db.users[code].banned.reason || "", until: db.users[code].banned.until });
    }
    saveDb();
    return send(res, 200, {
      token: tokenFor(code), user: pubUser(db.users[code]), tgId: tu.id,
      name: db.users[code].name, balance: db.users[code].balance || 0, dogsList: db.users[code].dogsList || []
    });
  }

  if (p === "/api/announce") {
    return send(res, 200, { announcement: (db.announcements || [])[0] || null });
  }

  if (p === "/api/sync" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    me.balance = Number(b.balance) || 0;
    me.rating = Number(b.rating) || me.rating;
    me.wins = Number(b.wins) || 0;
    me.losses = Number(b.losses) || 0;
    me.dogs = Number(b.dogs) || 0;
    me.breeds = Number(b.breeds) || 0;
    me.level = Number(b.level) || 1;
    touch(me);
    saveDb();
    return send(res, 200, { ok: true });
  }

  /* Istemci oyunda kaldigi surece ~30 sn'de bir vurur; admin paneli bunu CEVRIMICI gosterir */
  if (p === "/api/heartbeat" && req.method === "POST") {
    const me = auth(req);
    if (!me) return send(res, 401, { error: "unauthorized" });
    touch(me);
    saveDb();
    return send(res, 200, { ok: true, t: Date.now(), online: true });
  }

  /* Oyundan cikis/kapanis: soldAt isaretlenir -> aninda cevrimdisi gorunur (lastSeenAt korunur) */
  if (p === "/api/leave" && req.method === "POST") {
    const b = await readBody(req);
    let me = auth(req);
    if (!me && b && b.token) {
      for (const code of Object.keys(db.users)) if (tokenFor(code) === b.token) { me = db.users[code]; break; }
    }
    if (!me) return send(res, 401, { error: "unauthorized" });
    me.leftAt = Date.now();
    if (!me.lastSeenAt) me.lastSeenAt = me.leftAt;
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (p === "/api/leaderboard") {
    const rows = Object.values(db.users)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 100)
      .map((x, i) => ({ rank: i + 1, code: x.code, name: x.name, rating: x.rating, dogs: x.dogs, breeds: x.breeds }));
    return send(res, 200, { rows });
  }

  if (p === "/api/market/listings") {
    const now = Date.now();
    const rows = Object.values(db.listings).filter((l) => !l.sold && now - l.createdAt < 72 * 3600e3);
    return send(res, 200, { listings: rows });
  }

  if (p === "/api/market/list" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const price = Math.floor(Number(b.price) || 0);
    if (price < BAL.market_min || price > BAL.market_max) return send(res, 400, { error: "gecersiz fiyat" });
    const active = Object.values(db.listings).filter((l) => l.seller === me.code && !l.sold);
    if (active.length >= 6) return send(res, 400, { error: "maksimum aktif ilan" });
    if (!b.dog || !b.dog.uid) return send(res, 400, { error: "kopek verisi yok" });
    const id = "S" + (db.seq++);
    db.listings[id] = {
      id, seller: me.code, sellerName: me.name, dog: b.dog, price,
      value: Number(b.dog.value) || price, createdAt: Date.now(), sold: false
    };
    saveDb();
    return send(res, 200, { ok: true, id });
  }

  if (p === "/api/market/buy" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    while (lock.market) await new Promise((r) => setTimeout(r, 15));
    lock.market = true;
    try {
      const l = db.listings[b.id];
      if (!l || l.sold) return send(res, 409, { error: "ilan yok veya satilmis" });
      if (l.seller === me.code) return send(res, 400, { error: "kendi ilanini alamazsin" });
      const seller = db.users[l.seller];
      if (!seller) return send(res, 409, { error: "satici bulunamadi" });
      if (me.balance < l.price) return send(res, 402, { error: "yetersiz bakiye" });
      // atomik transfer: ayni anda iki istek gelirse ikinci buraya giremez (lock) ve
      // l.sold kontrolu tekrar yapilir
      const fee = Math.round(l.price * BAL.market_fee);
      me.balance -= l.price;
      seller.balance += l.price - fee;
      l.sold = true; l.soldAt = Date.now(); l.buyer = me.code;
      db.ledger.unshift({ ts: Date.now(), id: l.id, buyer: me.code, seller: seller.code, price: l.price, fee });
      if (db.ledger.length > 500) db.ledger.length = 500;
      saveDb();
      return send(res, 200, { ok: true, dog: l.dog, fee, newBalance: me.balance });
    } finally { lock.market = false; }
  }

  if (p === "/api/friends/request" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const target = db.users[String(b.code || "").toUpperCase()];
    if (!target) return send(res, 404, { error: "oyuncu bulunamadi" });
    if (target.code === me.code) return send(res, 400, { error: "kendini ekleyemezsin" });
    if (target.friends.includes(me.code)) return send(res, 409, { error: "zaten arkadas" });
    if (!target.incoming.includes(me.code)) target.incoming.push(me.code);
    if (!me.outgoing.includes(target.code)) me.outgoing.push(target.code);
    saveDb();
    return send(res, 200, { ok: true });
  }

  if (p === "/api/friends/accept" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const code = String(b.code || "").toUpperCase();
    me.incoming = me.incoming.filter((c) => c !== code);
    me.outgoing = me.outgoing.filter((c) => c !== code);
    if (!me.friends.includes(code)) me.friends.push(code);
    const other = db.users[code];
    if (other) {
      other.incoming = other.incoming.filter((c) => c !== me.code);
      other.outgoing = other.outgoing.filter((c) => c !== me.code);
      if (!other.friends.includes(me.code)) other.friends.push(me.code);
    }
    saveDb();
    return send(res, 200, { ok: true, friends: me.friends });
  }


  /* ------------------------------------------------- DAVET SISTEMI -------- */
  if (p === "/api/invite" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const refCode = String(b.ref || "").toUpperCase();
    const ref = db.users[refCode];
    if (!ref) return send(res, 404, { error: "davet kodu bulunamadi" });
    if (ref.code === me.code) return send(res, 400, { error: "kendi kodunu kullanamazsin" });
    if (me.usedRef) return send(res, 409, { error: "zaten bir davet kodu kullandin" });
    ref.invited = ref.invited || [];
    if (ref.invited.some((x) => x.code === me.code)) return send(res, 409, { error: "bu davet zaten islenmis" });
    me.usedRef = refCode;
    ref.invited.push({ code: me.code, name: me.name, ts: Date.now() });
    ref.balance += 50000;
    saveDb();
    return send(res, 200, { ok: true, refName: ref.name, reward: 50000 });
  }
  if (p === "/api/invite/status") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    return send(res, 200, { invited: me.invited || [], usedRef: me.usedRef || null });
  }

  /* --------------------------------------------- TELEGRAM STARS ---------- */
  // XTR (Stars) faturasi: amount birimi Bot API'de yildiz basina 100'dur.
  // Gercek tahsilat dogrulamasi icin bot webhook'u gereklidir; /api/stars/paid
  // istemci beyanina dayali kayit tutar (docs/TELEGRAM.md icinde aciklanir).
  const STARS_OFFERS = {
    s25: { stars: 25, title: "PAW LEGENDS 25 Star Pack", desc: "250.000 puan", pts: 250000 },
    s60: { stars: 60, title: "PAW LEGENDS 60 Star Pack", desc: "700.000 puan + Altin Tasma", pts: 700000, item: "altin_tasma" },
    eq_civili_tasma: { stars: 150, title: "Spiked Collar (Guc +%10)", desc: "Kalici donanim: Civili Tasma", pts: 0, item: "civili_tasma" },
    eq_efsane_iksir: { stars: 120, title: "Legendary Elixir (XP +%30)", desc: "Kalici donanim: Efsane Iksir", pts: 0, item: "efsane_iksir" },
    eq_civili_boyunluk: { stars: 200, title: "Spiked Neck Guard (Savunma +%12)", desc: "Kalici donanim: Civili Boyunluk", pts: 0, item: "civili_boyunluk" }
  };
  if (p === "/api/stars/invoice" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const o = STARS_OFFERS[String(b.offer || "")];
    if (!o) return send(res, 400, { error: "gecersiz paket" });
    const tgToken = process.env.TG_BOT_TOKEN;
    if (!tgToken) return send(res, 503, { error: "Sunucuda TG_BOT_TOKEN tanimli degil; Stars ile alim su an mumkun degil." });
    const body = JSON.stringify({
      title: o.title, description: o.desc,
      payload: JSON.stringify({ offer: b.offer, code: me.code }),
      currency: "XTR",
      prices: [{ label: o.desc, amount: o.stars * 100 }]
    });
    try {
      const tgRes = await new Promise((resolve, reject) => {
        const r2 = require("https").request({
          host: "api.telegram.org", method: "POST",
          path: "/bot" + tgToken + "/createInvoiceLink",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
        }, (resp) => { let d = ""; resp.on("data", (c) => (d += c)); resp.on("end", () => resolve(d)); });
        r2.on("error", reject); r2.write(body); r2.end();
      });
      const j = JSON.parse(tgRes);
      if (!j.ok || !j.result) return send(res, 502, { error: "Telegram fatura olusturamadi: " + (j.description || "?") });
      return send(res, 200, { url: j.result });
    } catch (e) {
      return send(res, 502, { error: "Telegram'a ulasilamadi: " + e.message });
    }
  }
  if (p === "/api/stars/paid" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const o = STARS_OFFERS[String(b.offer || "")];
    if (!o) return send(res, 400, { error: "gecersiz paket" });
    me.starsPaid = me.starsPaid || [];
    me.starsPaid.push({ offer: String(b.offer), ts: Date.now() });
    saveDb();
    return send(res, 200, { ok: true, note: "istemci beyanina dayali kayit" });
  }

  if (p === "/api/friends") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    return send(res, 200, {
      friends: me.friends.map((c) => pubUser(db.users[c])).filter(Boolean),
      incoming: me.incoming.map((c) => pubUser(db.users[c])).filter(Boolean),
      outgoing: me.outgoing.map((c) => pubUser(db.users[c])).filter(Boolean)
    });
  }

  if (p === "/api/verify/earnings" && req.method === "POST") {
    if (!me) return send(res, 401, { error: "unauthorized" });
    const b = await readBody(req);
    const seconds = Number(b.seconds) || 0;
    const pps = Number(b.pps) || 0;
    const sinceLast = (Date.now() - (me.lastSeenAt || Date.now())) / 1000;
    let allowedSec = Math.min(seconds, BAL.offline_cap_hours * 3600);
    // sunucu saati esas: istemcinin iddia ettigi sure, sunucunun gordugu gecmis
    // sureden buyukse kirpilir (saat oynama korumasi)
    if (seconds > sinceLast + 300) allowedSec = Math.max(0, Math.min(allowedSec, sinceLast + 300));
    if (seconds < 0) allowedSec = 0;
    const adjusted = Math.floor(pps * allowedSec * BAL.offline_efficiency);
    const claimed = Math.floor(Number(b.gain) || 0);
    const ok = claimed <= adjusted + 1;
    touch(me);
    saveDb();
    return send(res, ok ? 200 : 200, { ok, adjusted, claimed, allowedSec: Math.round(allowedSec), tampered: !ok });
  }

  /* ------------------------------------------------------------ ADMIN ---- */
  if (p === "/admin" || p === "/admin/") return serveAdminHtml(res);
  if (p === "/admin/login" && req.method === "POST") {
    const b = await readBody(req);
    if (String(b.pass || "") !== ADMIN_PASS) return send(res, 403, { error: "yanlis parola" });
    return send(res, 200, { token: hmac("admin:" + ADMIN_PASS) });
  }
  if (p.indexOf("/admin/api/") === 0) {
    if (!adminAuth(req)) return send(res, 403, { error: "admin token gecersiz" });
    if (p === "/admin/api/overview") {
      const us = Object.values(db.users);
      return send(res, 200, {
        users: us.length,
        online: us.filter(function (x) { return isOnline(x); }).length,
        banned: us.filter(isBanned).length,
        listings: Object.values(db.listings).filter(function (l) { return !l.sold; }).length,
        ledgerVolume: db.ledger.reduce(function (s, x) { return s + x.price; }, 0),
        announcements: (db.announcements || []).length,
        uptimeSec: Math.round(process.uptime()), version: "7.0.0"
      });
    }
    if (p === "/admin/api/players") {
      const q = (u.searchParams.get("q") || "").toLowerCase();
      let rows = Object.values(db.users).map(function (x) {
        return {
          code: x.code, name: x.name, balance: x.balance, rating: x.rating,
          wins: x.wins, losses: x.losses, dogs: x.dogs, breeds: x.breeds, level: x.level,
          lastSeenAt: x.lastSeenAt, createdAt: x.createdAt,
          online: isOnline(x),
          banned: isBanned(x), banReason: x.banned ? x.banned.reason : "",
          mail: (x.mail || []).filter(function (m) { return !m.read; }).length
        };
      });
      if (q) rows = rows.filter(function (r) { return r.name.toLowerCase().indexOf(q) >= 0 || r.code.toLowerCase().indexOf(q) >= 0; });
      rows.sort(function (a, b) { return b.lastSeenAt - a.lastSeenAt; });
      return send(res, 200, { rows: rows });
    }
    if (p === "/admin/api/listings") {
      return send(res, 200, { listings: Object.values(db.listings).sort(function (a, b) { return b.createdAt - a.createdAt; }) });
    }
    if (p === "/admin/api/items") {
      const list = DBX && DBX.items ? DBX.items.map(function (it) {
        return { id: it.id, name_tr: it.name_tr, kind: it.kind, value: it.value, stars_only: !!it.stars_only, stars_price: it.stars_price || 0 };
      }) : [];
      return send(res, 200, { items: list });
    }
    if (p === "/admin/api/player") {
      const code = (u.searchParams.get("code") || "").toUpperCase();
      const usr = db.users[code];
      if (!usr) return send(res, 404, { error: "oyuncu yok" });
      return send(res, 200, {
        code: usr.code, name: usr.name, balance: usr.balance || 0, rating: usr.rating,
        wins: usr.wins, losses: usr.losses, adminCreated: !!usr.adminCreated,
        lastSeenAt: usr.lastSeenAt, online: isOnline(usr),
        banned: isBanned(usr),
        dogsList: usr.dogsList || [],
        items: usr.items || {},
        myListings: Object.values(db.listings).filter(function (l) { return l.seller === code && !l.sold; })
          .map(function (l) { return { id: l.id, dogName: (l.dog && l.dog.name) || "?", price: l.price }; }),
        market: Object.values(db.listings).filter(function (l) { return !l.sold && l.seller !== code; })
          .sort(function (a, b) { return a.price - b.price; }).slice(0, 50)
          .map(function (l) {
            return { id: l.id, seller: l.sellerName, dogName: (l.dog && l.dog.name) || "?",
              breed: (l.dog && l.dog.breedId) || "", rarity: (l.dog && l.dog.rarity) || "", price: l.price };
          })
      });
    }
    if (p === "/admin/api/log") return send(res, 200, { log: db.adminLog || [] });
    if (p === "/admin/api/backup") return send(res, 200, db);
    if (p === "/admin/api/restore" && req.method === "POST") {
      const b = await readBody(req);
      if (!b || typeof b !== "object" || !b.users || typeof b.users !== "object") return send(res, 400, { error: "gecersiz yedek (users alani sart)" });
      db = Object.assign({ users: {}, listings: {}, ledger: [], seq: 1, adminLog: [], announcements: [] }, b);
      saveDb();
      logAdmin("restore", "-", Object.keys(db.users).length + " oyuncu geri yuklendi");
      return send(res, 200, { ok: true, users: Object.keys(db.users).length });
    }
    if (p === "/admin/api/action" && req.method === "POST") {
      const b = await readBody(req);
      const t = String(b.type || "");
      const usr = b.code ? db.users[String(b.code).toUpperCase()] : null;
      const NEED = ["add_points", "send_message", "ban", "unban", "rename", "set_rating", "reset_profile", "wipe_user",
        "give_dog", "buy_for", "list_for", "remove_dog", "set_balance", "give_item"];
      if (t === "create_player") {
        const nm = String(b.name || "").trim().slice(0, 24);
        if (!nm) return send(res, 400, { error: "isim gerekli" });
        let code = String(b.code || "").toUpperCase().trim();
        if (code && !/^PAW-[A-Z0-9]{6}$/.test(code)) return send(res, 400, { error: "kod bicimi PAW-XXXXXX olmali" });
        if (!code) { do { code = "PAW-" + crypto.randomBytes(3).toString("hex").toUpperCase(); } while (db.users[code]); }
        if (db.users[code]) return send(res, 409, { error: "bu kod zaten kayitli" });
        const balance = Math.max(0, Math.floor(Number(b.balance) || 0));
        const ndogs = Math.min(20, Math.max(0, Math.floor(Number(b.dogs) || 0)));
        const dogsList = [];
        for (let i = 0; i < ndogs; i++) {
          const d = genDog(i === 0 && b.breedId ? String(b.breedId) : null);
          if (d) dogsList.push(d);
        }
        db.users[code] = {
          code, name: nm, createdAt: Date.now(), lastSeenAt: 0,
          balance, rating: Math.max(0, Math.floor(Number(b.rating) || 1000)), wins: 0, losses: 0,
          dogs: dogsList.length, breeds: 0, level: 1,
          friends: [], incoming: [], outgoing: [], dogsList, mail: [], adminCreated: true
        };
        logAdmin("create_player", code, nm + " | " + balance + " puan | " + dogsList.length + " kopek");
        saveDb();
        return send(res, 200, { ok: true, code, dogs: dogsList.length, engineOk: !!ENG });
      }
      if (NEED.indexOf(t) >= 0 && !usr) return send(res, 404, { error: "oyuncu bulunamadi" });
      if (t === "add_points") {
        const amt = Math.floor(Number(b.amount) || 0);
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "points", amount: amt, text: String(b.note || "Admin ödülü"), read: false });
        logAdmin("add_points", usr.code, amt + " puan");
      } else if (t === "send_message") {
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "message", text: String(b.text || "").slice(0, 500), read: false });
        logAdmin("send_message", usr.code, String(b.text || "").slice(0, 80));
      } else if (t === "announce") {
        db.announcements = db.announcements || [];
        db.announcements.unshift({ id: "A" + (db.seq++), ts: Date.now(), text: String(b.text || "").slice(0, 300) });
        if (db.announcements.length > 20) db.announcements.length = 20;
        logAdmin("announce", "-", String(b.text || "").slice(0, 80));
      } else if (t === "ban") {
        const hours = Number(b.hours) || 0;
        usr.banned = { until: hours > 0 ? Date.now() + hours * 3600e3 : 0, reason: String(b.reason || "Kural ihlali") };
        logAdmin("ban", usr.code, (hours > 0 ? hours + " saat" : "kalici") + ": " + usr.banned.reason);
      } else if (t === "unban") { usr.banned = null; logAdmin("unban", usr.code, ""); }
      else if (t === "rename") { usr.name = String(b.name || usr.name).slice(0, 24); logAdmin("rename", usr.code, "-> " + usr.name); }
      else if (t === "set_rating") { usr.rating = Math.max(0, Math.floor(Number(b.rating) || usr.rating)); logAdmin("set_rating", usr.code, String(usr.rating)); }
      else if (t === "reset_profile") {
        usr.balance = 0; usr.rating = 1000; usr.wins = 0; usr.losses = 0;
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "message", text: "Sunucu profilin admin tarafindan sifirlandi.", read: false });
        logAdmin("reset_profile", usr.code, "");
      } else if (t === "del_listing") {
        const l = db.listings[String(b.id || "")];
        if (!l) return send(res, 404, { error: "ilan yok" });
        l.sold = true; l.removedByAdmin = true; l.soldAt = Date.now();
        logAdmin("del_listing", l.seller, l.id);
      } else if (t === "wipe_user") {
        for (const id of Object.keys(db.listings)) if (db.listings[id].seller === usr.code) delete db.listings[id];
        delete db.users[usr.code];
        logAdmin("wipe_user", usr.code, "");
      } else if (t === "set_balance") {
        const nb = Math.max(0, Math.floor(Number(b.amount) || 0));
        const delta = nb - (usr.balance || 0);
        usr.balance = nb;
        usr.mail = usr.mail || [];
        if (delta !== 0) usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "points", amount: delta, text: String(b.note || "Admin bakiye güncellemesi"), read: false });
        logAdmin("set_balance", usr.code, String(nb));
      } else if (t === "give_dog") {
        if (!ENG) return send(res, 400, { error: "motor yuklu degil, kopek uretilemiyor" });
        const d = genDog(b.breedId ? String(b.breedId) : null);
        usr.dogsList = usr.dogsList || [];
        usr.dogsList.push(d);
        usr.dogs = usr.dogsList.length;
        logAdmin("give_dog", usr.code, d.name + " (" + d.breedId + ")");
      } else if (t === "buy_for") {
        const l = db.listings[String(b.id || "")];
        if (!l || l.sold) return send(res, 404, { error: "ilan yok veya satilmis" });
        if (l.seller === usr.code) return send(res, 400, { error: "oyuncunun kendi ilani satin alinamaz" });
        if ((usr.balance || 0) < l.price) return send(res, 402, { error: "oyuncu bakiyesi yetersiz (" + (usr.balance || 0) + " < " + l.price + ")" });
        usr.balance -= l.price;
        l.sold = true; l.soldAt = Date.now(); l.buyer = usr.code; l.boughtByAdmin = true;
        usr.dogsList = usr.dogsList || [];
        const ix = usr.dogsList.findIndex(function (x) { return x.uid === l.dog.uid; });
        if (ix >= 0) usr.dogsList[ix] = l.dog; else usr.dogsList.push(l.dog);
        usr.dogs = usr.dogsList.length;
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "points", amount: -l.price, text: "Admin pazar alımı: " + (l.dog.name || l.id), read: false });
        const seller = db.users[l.seller];
        if (seller) {
          seller.balance = (seller.balance || 0) + l.price;
          seller.mail = seller.mail || [];
          seller.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "points", amount: l.price, text: "Köpeğin admin alımıyla satıldı: " + (l.dog.name || l.id), read: false });
        }
        db.ledger.unshift({ ts: Date.now(), id: l.id, buyer: usr.code, seller: l.seller, price: l.price, fee: 0, admin: true });
        if (db.ledger.length > 500) db.ledger.length = 500;
        logAdmin("buy_for", usr.code, l.id + " " + (l.dog.name || "?") + " " + l.price + " puan");
      } else if (t === "list_for") {
        usr.dogsList = usr.dogsList || [];
        const ix = usr.dogsList.findIndex(function (x) { return x.uid === String(b.dogUid || ""); });
        if (ix < 0) return send(res, 404, { error: "kopek oyuncunun sunucu kennel'inde yok" });
        const price = Math.floor(Number(b.price) || 0);
        if (price < BAL.market_min || price > BAL.market_max) return send(res, 400, { error: "gecersiz fiyat" });
        const dog = usr.dogsList.splice(ix, 1)[0];
        usr.dogs = usr.dogsList.length;
        const id = "S" + (db.seq++);
        db.listings[id] = { id, seller: usr.code, sellerName: usr.name, dog, price, value: Number(dog.value) || price, createdAt: Date.now(), sold: false, listedByAdmin: true };
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "dog_removed", uid: dog.uid, text: (dog.name || "Köpeğin") + " admin tarafından pazara kondu (" + id + ")", read: false });
        logAdmin("list_for", usr.code, (dog.name || "?") + " -> " + id + " (" + price + ")");
      } else if (t === "remove_dog") {
        usr.dogsList = usr.dogsList || [];
        const ix = usr.dogsList.findIndex(function (x) { return x.uid === String(b.dogUid || ""); });
        if (ix < 0) return send(res, 404, { error: "kopek bulunamadi" });
        const dog = usr.dogsList.splice(ix, 1)[0];
        usr.dogs = usr.dogsList.length;
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "dog_removed", uid: dog.uid, text: (dog.name || "Köpeğin") + " admin tarafından kennel'den çıkarıldı", read: false });
        logAdmin("remove_dog", usr.code, dog.name || dog.uid);
      } else if (t === "give_item") {
        const itemId = String(b.itemId || "");
        const it = DBX && DBX.itemsById ? DBX.itemsById[itemId] : null;
        if (!it) return send(res, 404, { error: "esya bulunamadi: " + itemId });
        const qty = Math.min(99, Math.max(1, Math.floor(Number(b.qty) || 1)));
        usr.items = usr.items || {};
        usr.items[itemId] = (usr.items[itemId] || 0) + qty;
        usr.mail = usr.mail || [];
        usr.mail.push({ id: "M" + (db.seq++), ts: Date.now(), type: "item", itemId: itemId, qty: qty, text: "Admin hediyesi: " + it.name_tr + " x" + qty, read: false });
        logAdmin("give_item", usr.code, itemId + " x" + qty);
      } else return send(res, 400, { error: "bilinmeyen aksiyon: " + t });
      saveDb();
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "not found" });
  }

  if (req.method === "GET" && serveStatic(res, p)) return;
  return send(res, 404, { error: "not found" });
});

function pubUser(u) {
  if (!u) return null;
  return {
    code: u.code, name: u.name, rating: u.rating, wins: u.wins, losses: u.losses,
    dogs: u.dogs, breeds: u.breeds, level: u.level, banned: isBanned(u),
    online: isOnline(u),
    title: u.rating >= 2000 ? "Elit Yetiştirici" : u.rating >= 1500 ? "Arena Kurdu" : "Yetiştirici"
  };
}

server.listen(PORT, "0.0.0.0", () => {
  console.log("PAW LEGENDS API dinlemede: http://0.0.0.0:" + PORT);
  console.log("Veri dosyasi: " + DB_PATH);
});
