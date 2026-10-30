#!/usr/bin/env node
/* =============================================================================
   PAW LEGENDS — admin API test paketi
   Gerçek sunucuyu çocuk proses olarak başlatır, HTTP üzerinden senaryoları koşar.
   Kullanım: node tests/admin_api.js
   ========================================================================== */
"use strict";
const http = require("http");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = 8899;
const BASE = "http://127.0.0.1:" + PORT;
const DB = path.join(__dirname, "..", "server", "db.json");
const results = [];
let pass = 0, fail = 0;

function check(name, cond, extra) {
  if (cond) { pass++; results.push("✓ " + name); }
  else { fail++; results.push("✗ " + name + (extra ? " — " + extra : "")); }
}
function req(method, p, body, headers) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(BASE + p, {
      method, headers: Object.assign({
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }, headers || {})
    }, (res) => {
      let s = "";
      res.on("data", (c) => (s += c));
      res.on("end", () => {
        let j = {};
        try { j = JSON.parse(s); } catch (e) { j = { _raw: s }; }
        resolve({ status: res.status || res.statusCode, j, raw: s });
      });
    });
    r.on("error", () => resolve({ status: 0, j: { error: "network" }, raw: "" }));
    if (data) r.write(data);
    r.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try { fs.unlinkSync(DB); } catch (e) { /* yoksa sorun değil */ }
  const child = spawn(process.execPath, [path.join(__dirname, "..", "server", "index.js"), String(PORT)], {
    env: Object.assign({}, process.env, { ADMIN_PASS: "testpass", PAW_SECRET: "testsec" }),
    stdio: "ignore"
  });
  let up = false;
  for (let i = 0; i < 40 && !up; i++) {
    const p = await req("GET", "/api/ping");
    up = p.status === 200;
    if (!up) await sleep(150);
  }
  check("01 sunucu ayaga kalkti", up);
  if (!up) { child.kill(); return finish(); }

  // --- admin girisi ---
  let r = await req("POST", "/admin/login", { pass: "yanlis" });
  check("02 yanlis parola 403", r.status === 403);
  r = await req("POST", "/admin/login", { pass: "testpass" });
  check("03 dogru parola token uretir", r.status === 200 && !!r.j.token);
  const ADM = { "X-Admin": r.j.token };
  r = await req("GET", "/admin/api/overview");
  check("04 tokensiz admin API 403", r.status === 403);
  r = await req("GET", "/admin/api/overview", null, ADM);
  check("05 overview tokenla 200", r.status === 200 && typeof r.j.users === "number");
  r = await req("GET", "/admin", null, ADM);
  check("06 /admin panel HTML doner", r.status === 200 && r.raw.indexOf("PAW LEGENDS — ADMIN") >= 0);
  {
    const m = r.raw.match(/<script>([\s\S]*)<\/script>/);
    let jsOk = false;
    try { new Function(m[1]); jsOk = true; } catch (e) { jsOk = false; }
    check("06b panel JS sozdizimi gecerli", jsOk && !!m);
  }

  // --- oyuncu ---
  r = await req("POST", "/api/auth/login", { name: "TestOyuncu", code: "PAW-TEST01" });
  check("07 oyuncu girisi", r.status === 200 && !!r.j.token);
  const PT = { "X-Auth": r.j.token };
  const CODE = r.j.user.code;

  // --- puan odulu + posta akisi ---
  r = await req("POST", "/admin/api/action", { type: "add_points", code: CODE, amount: 5000, note: "test ödülü" }, ADM);
  check("08 add_points aksiyonu", r.status === 200 && r.j.ok);
  r = await req("GET", "/api/me", null, PT);
  check("09 oyuncu postasi odulu gorur", r.status === 200 && r.j.mail.length === 1 && r.j.mail[0].amount === 5000);
  const mailId = r.j.mail[0].id;
  r = await req("POST", "/api/mail/ack", { ids: [mailId] }, PT);
  check("10 posta onayi (ack)", r.status === 200);
  r = await req("GET", "/api/me", null, PT);
  check("11 ack sonrasi posta bos", r.j.mail.length === 0);

  // --- mesaj + duyuru ---
  r = await req("POST", "/admin/api/action", { type: "send_message", code: CODE, text: "merhaba test" }, ADM);
  check("12 send_message", r.status === 200);
  r = await req("GET", "/api/me", null, PT);
  check("13 mesaj oyuncuya ulasti", r.j.mail.length === 1 && r.j.mail[0].type === "message");
  await req("POST", "/api/mail/ack", { ids: r.j.mail.map((m) => m.id) }, PT);
  r = await req("POST", "/admin/api/action", { type: "announce", text: "test duyurusu" }, ADM);
  check("14 announce", r.status === 200);
  r = await req("GET", "/api/me", null, PT);
  check("15 duyuru /api/me icinde", r.j.announcement && r.j.announcement.text === "test duyurusu");
  r = await req("GET", "/api/announce");
  check("16 herkese acik /api/announce", r.status === 200 && !!r.j.announcement);

  // --- ban akisi ---
  r = await req("POST", "/admin/api/action", { type: "ban", code: CODE, hours: 1, reason: "test bani" }, ADM);
  check("17 ban aksiyonu", r.status === 200);
  r = await req("POST", "/api/auth/login", { name: "TestOyuncu", code: "PAW-TEST01" });
  check("18 banli oyuncu giris 403", r.status === 403 && r.j.error === "banned" && r.j.reason === "test bani");
  r = await req("POST", "/admin/api/action", { type: "unban", code: CODE }, ADM);
  check("19 unban", r.status === 200);
  r = await req("POST", "/api/auth/login", { name: "TestOyuncu", code: "PAW-TEST01" });
  check("20 unban sonrasi giris 200", r.status === 200);

  // --- elo + liderlik ---
  r = await req("POST", "/admin/api/action", { type: "set_rating", code: CODE, rating: 1750 }, ADM);
  check("21 set_rating", r.status === 200);
  r = await req("GET", "/api/leaderboard");
  check("22 liderlik tablosu guncel", r.j.rows.some((x) => x.code === CODE && x.rating === 1750));

  // --- pazar: ilan + admin kaldirma ---
  r = await req("POST", "/api/market/list", { dog: { uid: "u1", name: "Test Köpek", value: 9000 }, price: 9000 }, PT);
  check("23 ilan acma", r.status === 200 && !!r.j.id);
  const lid = r.j.id;
  r = await req("POST", "/admin/api/action", { type: "del_listing", id: lid }, ADM);
  check("24 admin ilan kaldirma", r.status === 200);
  r = await req("GET", "/admin/api/listings", null, ADM);
  check("25 ilan listede removedByAdmin", r.j.listings.some((l) => l.id === lid && l.sold && l.removedByAdmin));

  // --- isim / sifirlama / log ---
  r = await req("POST", "/admin/api/action", { type: "rename", code: CODE, name: "YeniIsim" }, ADM);
  check("26 rename", r.status === 200);
  r = await req("GET", "/admin/api/players?q=yeniisim", null, ADM);
  check("27 arama yeni ismi bulur", r.j.rows.length === 1 && r.j.rows[0].name === "YeniIsim");
  r = await req("POST", "/admin/api/action", { type: "reset_profile", code: CODE }, ADM);
  check("28 reset_profile", r.status === 200);
  r = await req("GET", "/admin/api/players?q=" + CODE, null, ADM);
  check("29 sifirlama sonrasi elo 1000", r.j.rows[0].rating === 1000 && r.j.rows[0].balance === 0);
  r = await req("GET", "/admin/api/log", null, ADM);
  check("30 islem kaydi tutuluyor", r.j.log.length >= 8 && r.j.log[0].type === "reset_profile");

  // --- wipe ---
  r = await req("POST", "/admin/api/action", { type: "wipe_user", code: CODE }, ADM);
  check("31 wipe_user", r.status === 200);
  r = await req("GET", "/admin/api/players?q=" + CODE, null, ADM);
  check("32 silinen oyuncu listede yok", r.j.rows.length === 0);


  // --- ADMIN: OYUNCU OLUSTURMA + KENNEL + PAZAR VEKALETI ---
  r = await req("POST", "/admin/api/action", { type: "create_player", name: "PanelOyuncu", balance: 200000, dogs: 2 }, ADM);
  check("33 admin yeni oyuncu olusturdu (kod uretildi)", r.status === 200 && /^PAW-[A-Z0-9]{6}$/.test(r.j.code || "") && r.j.engineOk === true);
  const NCODE = r.j.code;
  r = await req("POST", "/admin/api/action", { type: "create_player", name: "X", code: NCODE }, ADM);
  check("34 ayni kod ikinci kez 409", r.status === 409);
  r = await req("GET", "/admin/api/player?code=" + NCODE, null, ADM);
  check("35 oyuncu detayi: 200K puan + 2 gercek kopek", r.status === 200 && r.j.balance === 200000 && r.j.dogsList.length === 2 && !!r.j.dogsList[0].uid && !!r.j.dogsList[0].breedId);
  r = await req("POST", "/admin/api/action", { type: "give_dog", code: NCODE }, ADM);
  check("36 give_dog", r.status === 200);
  r = await req("GET", "/admin/api/player?code=" + NCODE, null, ADM);
  check("37 kennel 3 kopege cikti", r.j.dogsList.length === 3);
  const dogUid = r.j.dogsList[0].uid;
  r = await req("POST", "/admin/api/action", { type: "list_for", code: NCODE, dogUid, price: 50000 }, ADM);
  check("38 list_for: kopek pazara kondu", r.status === 200);
  r = await req("GET", "/admin/api/listings", null, ADM);
  const lid2 = (r.j.listings.find((l) => !l.sold && l.seller === NCODE) || {}).id;
  check("39 ilan aktif gorunuyor", !!lid2);

  // alici oyuncu + bakiye ayarlama
  r = await req("POST", "/api/auth/login", { name: "Alici", code: "PAW-ALICI1" });
  check("40 alici oyuncu girisi", r.status === 200 && !!r.j.token);
  const PT2 = { "X-Auth": r.j.token };
  r = await req("POST", "/admin/api/action", { type: "set_balance", code: "PAW-ALICI1", amount: 100000 }, ADM);
  check("41 set_balance", r.status === 200);
  r = await req("POST", "/admin/api/action", { type: "buy_for", code: "PAW-ALICI1", id: lid2 }, ADM);
  check("42 buy_for: admin oyuncu adina satin aldi", r.status === 200);
  r = await req("GET", "/admin/api/player?code=PAW-ALICI1", null, ADM);
  check("43 kopek alicinin kennel'inde + bakiye dustu", r.j.dogsList.some((d) => d.uid === dogUid) && r.j.balance === 50000);
  r = await req("GET", "/admin/api/player?code=" + NCODE, null, ADM);
  check("44 satici gelirini aldi (250K)", r.j.balance === 250000);
  r = await req("GET", "/api/me", null, PT2);
  check("45 istemci mail'inde -50K ve +100K delta var", (r.j.mail || []).some((m) => m.type === "points" && m.amount === -50000) && (r.j.mail || []).some((m) => m.type === "points" && m.amount === 100000));
  check("46 /api/me dogsList + balance iceriyor", Array.isArray(r.j.dogsList) && r.j.dogsList.some((d) => d.uid === dogUid) && r.j.balance === 50000);
  r = await req("POST", "/api/dogs/ack", { uids: [dogUid] }, PT2);
  check("47 dogs/ack sonrasi sunucu kuyrugu bosaldi", r.status === 200 && r.j.remaining === 0);
  r = await req("POST", "/admin/api/action", { type: "buy_for", code: "PAW-ALICI1", id: "S999999" }, ADM);
  check("48 olmayan ilan buy_for 404", r.status === 404);
  r = await req("POST", "/admin/api/action", { type: "remove_dog", code: NCODE, dogUid: "yok-boyle-uid" }, ADM);
  check("49 olmayan kopek remove_dog 404", r.status === 404);
  r = await req("POST", "/api/auth/login", { code: NCODE, loginOnly: true });
  check("50 loginOnly: mevcut kod balance+dogsList doner", r.status === 200 && r.j.balance === 250000 && Array.isArray(r.j.dogsList) && r.j.dogsList.length === 2);
  r = await req("POST", "/api/auth/login", { code: "PAW-YOK99", loginOnly: true });
  check("51 loginOnly: bilinmeyen kod 404", r.status === 404);

  // --- ADMIN: ESYA VERME ---
  r = await req("GET", "/admin/api/items", null, ADM);
  check("52 esya katalogu (27 esya, stars_only isaretli)", r.status === 200 && r.j.items.length >= 27 && r.j.items.some((x) => x.id === "civili_tasma" && x.stars_only));
  r = await req("POST", "/admin/api/action", { type: "give_item", code: NCODE, itemId: "civili_tasma", qty: 2 }, ADM);
  check("53 give_item: civili tasma x2", r.status === 200);
  r = await req("GET", "/admin/api/player?code=" + NCODE, null, ADM);
  check("54 oyuncu items kaydinda", r.j.items && r.j.items.civili_tasma === 2);
  r = await req("POST", "/admin/api/action", { type: "give_item", code: NCODE, itemId: "yok_item", qty: 1 }, ADM);
  check("55 olmayan esya 404", r.status === 404);
  r = await req("POST", "/api/auth/login", { code: NCODE, loginOnly: true });
  const PT3 = { "X-Auth": r.j.token };
  r = await req("GET", "/api/me", null, PT3);
  check("56 item maili oyuncuya gitti", (r.j.mail || []).some((m) => m.type === "item" && m.itemId === "civili_tasma" && m.qty === 2));

  child.kill();
  finish();

  function finish() {
    const rep = "# ADMIN API TEST SONUCLARI\n\n" + new Date().toISOString() +
      "\n\nGecen: " + pass + " | Kalan: " + fail + "\n\n```\n" + results.join("\n") + "\n```\n";
    fs.writeFileSync(path.join(__dirname, "ADMIN_RESULTS.md"), rep);
    console.log(results.join("\n"));
    console.log("\n=== " + pass + "/" + (pass + fail) + " admin testi gecti" + (fail ? " — BASARISIZ" : " — TUMU BASARILI") + " ===");
    process.exit(fail ? 1 : 0);
  }
}
main();
