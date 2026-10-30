#!/usr/bin/env node
/* =============================================================================
   PAW LEGENDS — Telegram initData dogrulama testi
   Sunucuyu TG_BOT_TOKEN ile acar, resmi semayla initData uretip /api/tg/login'i dener.
   Kullanım: node tests/telegram_test.js
   ========================================================================== */
"use strict";
const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 8898;
const BASE = "http://127.0.0.1:" + PORT;
const BOT = "testbot123";
const results = [];
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; results.push("✓ " + name); }
  else { fail++; results.push("✗ " + name + (extra ? " — " + extra : "")); }
}
function req(method, p, body) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(BASE + p, {
      method, headers: Object.assign({ "Content-Type": "application/json" }, data ? { "Content-Length": Buffer.byteLength(data) } : {})
    }, (res) => {
      let s = "";
      res.on("data", (c) => (s += c));
      res.on("end", () => {
        let j = {};
        try { j = JSON.parse(s); } catch (e) { }
        resolve({ status: res.statusCode, j });
      });
    });
    r.on("error", () => resolve({ status: 0, j: {} }));
    if (data) r.write(data);
    r.end();
  });
}
function makeInitData(user, tamper) {
  const obj = {
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AAHdF6IQAAAAAN0XohDzrGf2",
    platform: "android",
    version: "7.0"
  };
  const pairs = Object.keys(obj).sort().map((k) => k + "=" + obj[k]);
  const secret = crypto.createHmac("sha256", "WebAppData").update(BOT).digest();
  const hash = crypto.createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const all = pairs.concat(["hash=" + (tamper ? hash.replace(/^./, "0") : hash)]);
  return all.join("&");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try { fs.unlinkSync(path.join(__dirname, "..", "server", "db.json")); } catch (e) { }
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server", "index.js"), String(PORT)], {
    env: Object.assign({}, process.env, { TG_BOT_TOKEN: BOT, ADMIN_PASS: "x", PAW_SECRET: "y" }),
    stdio: "ignore"
  });
  let up = false;
  for (let i = 0; i < 40 && !up; i++) { up = (await req("GET", "/api/ping")).status === 200; if (!up) await sleep(150); }
  check("01 sunucu ayaga kalkti", up);
  if (!up) { child.kill(); return finish(); }

  const user = { id: 424242, first_name: "Test", last_name: "TG", username: "testtg" };
  let r = await req("POST", "/api/tg/login", { initData: makeInitData(user) });
  check("02 gecerli initData → 200 + token", r.status === 200 && !!r.j.token && !!r.j.user.code, JSON.stringify(r.j).slice(0, 80));
  const code1 = r.j.user && r.j.user.code;
  check("03 kod PAW- formatinda", /^PAW-[A-Z0-9]{6}$/.test(code1 || ""));

  r = await req("POST", "/api/tg/login", { initData: makeInitData(user) });
  check("04 ayni TG id → ayni hesap kodu", r.j.user && r.j.user.code === code1);

  r = await req("POST", "/api/tg/login", { initData: makeInitData(user, true) });
  check("05 bozuk hash → 401", r.status === 401);

  r = await req("POST", "/api/tg/login", { initData: "user=%7B%7D&hash=abc" });
  check("06 sacma initData → 401", r.status === 401);

  const old = makeInitData(user).replace(/auth_date=\d+/, "auth_date=1000000000");
  r = await req("POST", "/api/tg/login", { initData: old });
  check("07 cok eski auth_date → 401", r.status === 401);

  r = await req("GET", "/api/leaderboard");
  check("08 TG hesabi liderlikte", (r.j.rows || []).some((x) => x.code === code1));

  child.kill();
  finish();
  function finish() {
    fs.writeFileSync(path.join(__dirname, "TELEGRAM_RESULTS.md"),
      "# TELEGRAM TEST SONUCLARI\n\n" + new Date().toISOString() + "\n\nGecen: " + pass + " | Kalan: " + fail +
      "\n\n```\n" + results.join("\n") + "\n```\n");
    console.log(results.join("\n"));
    console.log("\n=== " + pass + "/" + (pass + fail) + " telegram testi gecti" + (fail ? " — BASARISIZ" : " — TUMU BASARILI") + " ===");
    process.exit(fail ? 1 : 0);
  }
}
main();
