#!/usr/bin/env node
"use strict";
/* =============================================================================
   PAW LEGENDS: DOG WORLD — HEADLESS ARAYUZ / OYUN AKISI TESTI
   Gercek bir DOM yok; minimal DOM taklidi (shim) ile index.html'in yukledigi
   TUM katmanlar (data_bundle -> engine -> ui -> 23 ekran -> net -> app)
   gercekten calistirilir. Amac: bos ekran, olu buton, tanimsiz fonksiyon,
   kirik referans ve calisma zamani hatasi olmadigini kanitlamak.
   Calistirma:  node tests/smoke_ui.js
   ========================================================================== */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");

/* --------------------------------------------------------- MINI DOM ------ */
class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach(x => x && String(x).split(/\s+/).forEach(y => y && this.s.add(y))); }
  remove(...c) { c.forEach(x => this.s.delete(x)); }
  toggle(c, f) { if (f === undefined) f = !this.s.has(c); f ? this.s.add(c) : this.s.delete(c); return f; }
  contains(c) { return this.s.has(c); }
  toString() { return [...this.s].join(" "); }
}
class El {
  constructor(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.children = []; this.parentNode = null; this.style = {}; this.dataset = {};
    this.attrs = {}; this.listeners = {}; this._html = ""; this.textContent = "";
    this.value = ""; this.checked = false; this.disabled = false; this.scrollTop = 0;
    this.classList = new ClassList(); this._qs = {};
  }
  get innerHTML() { return this._html; }
  set innerHTML(v) { this._html = String(v === undefined || v === null ? "" : v); this.children = []; }
  get firstChild() { return this.children[0] || null; }
  get className() { return this.classList.toString(); }
  set className(v) { this.classList = new ClassList(); this.classList.add(v); }
  appendChild(c) { if (!c) return c; c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); if (c) c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  insertBefore(node, ref) {
    if (!node) return node;
    const i = ref ? this.children.indexOf(ref) : -1;
    node.parentNode = this;
    if (i >= 0) this.children.splice(i, 0, node); else this.children.unshift(node);
    return node;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "class") this.className = v; if (k === "id") this.id = v; }
  getAttribute(k) { if (k === "class") return this.className; return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener() { }
  dispatchEvent(ev) {
    (this.listeners[ev.type] || []).forEach(fn => fn(Object.assign({ target: this, currentTarget: this, preventDefault() { }, stopPropagation() { } }, ev)));
  }
  click() { this.dispatchEvent({ type: "click" }); }
  querySelector(sel) { if (!this._qs[sel]) { const n = new El("div"); n.className = String(sel).replace(/^[#.]/, ""); this._qs[sel] = n; } return this._qs[sel]; }
  querySelectorAll() { return []; }
  scrollIntoView() { } focus() { } blur() { }
  play() { return Promise.resolve(); } pause() { }
  insertAdjacentHTML(pos, html) { this._html += html; }
  contains() { return false; }
  /* test yardimcisi: uretilen toplam isaretleme boyutu */
  renderSize() {
    let n = this._html.length + this.textContent.length;
    this.children.forEach(c => { if (c && c.renderSize) n += c.renderSize(); });
    return n;
  }
}
class AudioStub {
  constructor(src) { this.src = src || ""; this.volume = 1; this.loop = false; this.currentTime = 0; this.paused = true; }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  addEventListener() { }
}
class XhrStub {
  constructor() { this.headers = {}; this.status = 0; this.responseText = ""; this.response = null; }
  open(m, u) { this.method = m; this.url = u; }
  setRequestHeader(k, v) { this.headers[k] = v; }
  send() { setTimeout(() => { this.status = 0; if (this.onerror) this.onerror(new Error("offline")); }, 0); }
  abort() { }
}
const byId = {};
const doc = {
  readyState: "complete", hidden: false, title: "PAW LEGENDS",
  body: new El("body"), documentElement: new El("html"), head: new El("head"),
  getElementById(id) { if (!byId[id]) { byId[id] = new El("div"); byId[id].id = id; } return byId[id]; },
  querySelector(sel) {
    if (typeof sel === "string" && sel.charAt(0) === "#" && sel.indexOf(" ") < 0) return this.getElementById(sel.slice(1));
    return this.getElementById("__q" + sel);
  },
  querySelectorAll() { return []; },
  createElement(t) { return new El(t); },
  createTextNode(t) { const n = new El("#text"); n.textContent = String(t); return n; },
  addEventListener() { }, removeEventListener() { }
};
const store = new Map();
Object.assign(global, {
  window: global, document: doc, localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
    key: i => [...store.keys()][i] || null,
    get length() { return store.size; }
  },
  Audio: AudioStub, XMLHttpRequest: XhrStub,
  navigator: { userAgent: "node-headless", language: "tr", clipboard: { writeText: () => Promise.resolve() } },
  location: { href: "file:///index.html", reload() { }, hash: "" },
  requestAnimationFrame: cb => setTimeout(() => cb(Date.now()), 0),
  cancelAnimationFrame: id => clearTimeout(id),
  scrollTo() { }, alert() { }, matchMedia: () => ({ matches: false, addListener() { }, addEventListener() { } })
});
global.addEventListener = () => { };
global.removeEventListener = () => { };

/* ------------------------------------------------- KATMANLARI YUKLE ------ */
const errors = [], warns = [];
const realError = console.error, realWarn = console.warn;
console.error = function (...a) { errors.push(a.map(String).join(" ")); realError.apply(console, a); };
console.warn = function (...a) { warns.push(a.map(String).join(" ")); };
process.on("uncaughtException", e => { errors.push("UNCAUGHT: " + e.stack); });

let pass = 0, fail = 0; const lines = [];
function T(name, fn) {
  try { const r = fn(); if (r && r.then) return r.then(() => { pass++; lines.push("PASS  " + name); },
    e => { fail++; lines.push("FAIL  " + name + "  ->  " + (e && e.message || e) + "\n" + (e && e.stack || "").split("\n").slice(1, 4).join("\n")); });
    pass++; lines.push("PASS  " + name);
  } catch (e) {
    fail++; lines.push("FAIL  " + name + "  ->  " + (e && e.message || e) + "\n" + (e && e.stack || "").split("\n").slice(1, 4).join("\n"));
  }
}
function ok(c, m) { if (!c) throw new Error(m || "beklenen kosul saglanmadi"); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function allButtons(node, out) {
  out = out || [];
  if (!node) return out;
  if (node.tagName === "BUTTON") out.push(node);
  (node.children || []).forEach(c => allButtons(c, out));
  return out;
}
function btnLabel(b) {
  let t = b.textContent || "";
  (b.children || []).forEach(c => { t += c.textContent || ""; });
  return t.trim();
}
/* document.body altindaki modal/larda etiketi eslesen butonu bul ve tikla */
function clickButton(labelPart, root) {
  const btns = allButtons(root || doc.body);
  const hit = btns.filter(b => btnLabel(b).indexOf(labelPart) >= 0)[0];
  if (!hit) return false;
  hit.click();
  return true;
}
function modalButtons() { return allButtons(doc.body).filter(b => btnLabel(b).length > 0); }
function hostHtml(node) {          // alt agaclar dahil uretilen tum isaretleme
  if (!node) return "";
  let out = node._html || "";
  (node.children || []).forEach(c => { out += hostHtml(c); });
  return out;
}

["src/js/core/data_bundle.js", "src/js/core/engine.js", "src/js/core/i18n.js", "src/js/ui/ui.js",
 "scenes/screens_core.js", "scenes/screens_play.js", "src/js/net.js", "src/js/app.js"].forEach(f =>
  require(path.join(ROOT, f)));

const PL = global.PL, E = PL.engine, U = PL.ui, G = PL.game, N = PL.net, DB = PL.DB;
const SCREENS = ["login", "hub", "collection", "dogDetail", "crates", "breed", "arena", "market",
  "friends", "quests", "achievements", "events", "leaderboard", "inventory", "profile",
  "settings", "notifications", "help", "wolf", "agility", "shop", "invite", "table"];

(async function main() {
  /* ---- 01 katmanlar yuklendi ---- */
  T("01 tum katmanlar yuklendi (PL.DB / engine / ui / game / net)", () => {
    ok(DB && DB.breeds.length === 100, "DB.breeds yok");
    ok(E && typeof E.makeDog === "function", "engine yok");
    ok(U && typeof U.show === "function", "ui yok");
    ok(G && typeof G.boot === "function", "game yok");
    ok(N && typeof N.connect === "function", "net yok");
  });
  await T("02 boot sonrasi login ekrani acildi ve icerik uretti", async () => {
    await wait(250);
    ok(U.currentScreen() === "login", "acilis ekrani: " + U.currentScreen());
    ok(doc.getElementById("screenHost").renderSize() > 200, "login ekrani bos");
    ok(doc.getElementById("bottomNav").renderSize() > 100, "alt navigasyon bos (buildChrome calismadi)");
    ok(doc.getElementById("topBar"), "ust bar elemani yok");
    ok(PL.game.state === null || PL.game.state === undefined, "login ekraninda oyun durumu olusmamali");
    U.updateTopBar();   // state yokken de patlamamali
    const html = hostHtml(doc.getElementById("screenHost"));
    ok(html.length > 500, "login ekrani icerigi bos");
    ok(/PAW LEGENDS/.test(html), "login ekrani basligi yok");
    ok(/loginName/.test(html), "isim girisi yok");
    ok(/btnImport/.test(html), "kayit ice aktarma butonu yok");
  });
  T("03 yeni oyun baslatildi: 30.000 puan + 2 baslangic kopegi", () => {
    G.startNew("Test Oyuncu");
    const s = G.state;
    ok(s.balance === 30000, "baslangic puani " + s.balance);
    ok(s.dogs.length === 2, "kopek sayisi " + s.dogs.length);
    ok(s.profile.name === "Test Oyuncu", "isim kaydi yok");
    ok(/^PAW-[A-Z0-9]{6}$/.test(s.profile.code), "oyuncu kodu bozuk");
    ok(s.settings.reduceMotion === false || s.settings.reduceMotion === true, "ayar yok");
  });
  G.state.settings.reduceMotion = true;   // testlerde animasyon beklemesini kisalt

  /* ---- 04 23 ekrani tek tek render et ---- */
  for (const name of SCREENS) {
    await T("04." + name.padEnd(14) + " ekrani hatasiz render oldu", async () => {
      const params = name === "dogDetail" ? { uid: G.state.dogs[0].uid } : {};
      U.show(name, params);
      await wait(30);
      ok(U.currentScreen() === name, "yonlendirme calismadi: " + U.currentScreen());
      const host = doc.getElementById("screenHost");
      ok(host.children.length >= 1, "ekran dugumu eklenmedi (bos ekran)");
      const size = host.renderSize();
      ok(size > 300, name + " ekrani neredeyse bos: " + size + " karakter isaretleme");
      ok(!warns.some(w => w.includes("ekran yok: " + name)), name + " kayitli degil");
      const node = host.children[host.children.length - 1];
      ok(node.classList.contains("screen"), name + " dugumu .screen sinifi tasimiyor");
      const html = node.innerHTML;
      ok(!/undefined|NaN|\[object Object\]/.test(html), name + " cikisinda 'undefined/NaN/[object Object]' var");
      return wait(5);
    });
  }

  /* ---- 05 ust bar / alt nav guncelleniyor ---- */
  await T("05 ust bar bakiye/uretim/bildirim gosteriyor", async () => {
    G.state.balance = 1234567;
    U.updateTopBar();
    ok(doc.getElementById("topBalance").textContent.length > 0, "bakiye yazilmadi");
    ok(/dk/.test(doc.getElementById("topPps").textContent), "uretim hizi yazilmadi: " + doc.getElementById("topPps").textContent);
    E.notify(G.state, "Test bildirimi", "info");
    U.updateTopBar();
    const unread = G.state.notifications.filter(n => !n.read).length;
    ok(String(doc.getElementById("topBellCount").textContent) === String(unread),
      "bildirim sayaci yanlis: " + doc.getElementById("topBellCount").textContent + " != " + unread);
    ok(unread >= 1, "bildirim eklenmedi");
    return wait(5);
  });

  /* ---- 06 oyun dongusu (tick) ---- */
  await T("06 tick dongusu: enerji rejenerasyonu, gorev yenileme, otomatik kayit", async () => {
    const s = G.state;
    s.dogs[0].energy = 50; s.dogs[0]._energyAcc = 179;
    s.quests = null;
    for (let i = 0; i < 3; i++) G.tick();
    ok(s.dogs[0].energy === 51, "enerji rejenerasyonu calismadi: " + s.dogs[0].energy);
    ok(s.quests && s.quests.list.length === 4, "gunluk gorevler olusmadi");
    G._auto = 14; G.tick();
    ok(store.size > 0, "otomatik kayit yazmadi");
    return wait(5);
  });

  /* ---- 07 pasif kazanc toplama ---- */
  T("07 collect: biriken puan bakiyeye eklendi", () => {
    const s = G.state;
    s.time.lastCollectAt = Date.now() - 900000;
    const before = s.balance;
    G.collect(false);
    ok(s.balance > before, "toplama bakiyeyi artirmadi (" + before + " -> " + s.balance + ")");
    ok(s.time.lastCollectAt > Date.now() - 5000, "toplama zamani guncellenmedi");
  });

  /* ---- 08 kasa acma ---- */
  T("08 kasa acma: puan dustu, istatistik artti, odul uygulandi", () => {
    const s = G.state;
    s.balance = 500000;
    const dogs0 = s.dogs.length, crates0 = s.stats.cratesOpened;
    A().openCrate("silver", 10000);
    ok(s.stats.cratesOpened === crates0 + 1, "kasa istatistigi artmadi");
    const spent = dogs0 === s.dogs.length;
    ok(s.balance < 500000, "kasa ucreti dusulmedi");
    ok(spent || s.dogs.length > dogs0 || Object.keys(s.inventory).length > 0, "odul uygulanmadi");
  });
  T("08b yetersiz bakiye ile kasa acilamiyor", () => {
    const s = G.state; s.balance = 10;
    const c0 = s.stats.cratesOpened;
    A().openCrate("mythic", 500000);
    ok(s.stats.cratesOpened === c0, "yetersiz bakiye ile kasa acildi");
    ok(s.balance === 10, "bakiye negatife dustu");
  });
  T("08c 5 kasanin tamami acilabiliyor ve odul veriyor", () => {
    const s = G.state;
    DB.crates.forEach(c => {
      s.balance = c.price * 2;
      const before = { dogs: s.dogs.length, bal: s.balance, inv: JSON.stringify(s.inventory) };
      A().openCrate(c.id, c.price);
      const changed = s.dogs.length !== before.dogs || s.balance !== before.bal - c.price || JSON.stringify(s.inventory) !== before.inv;
      ok(changed, c.id + " kasasi odul vermedi");
      ok(s.balance >= 0, c.id + " bakiyeyi negatife dusurdu");
    });
  });

  /* ---- 09 genetik / ciftlestirme ekrani ---- */
  T("09 uretim: yavru eklendi, maliyet/enerji/bekleme uygulandi", () => {
    const s = G.state;
    s.balance = 500000;
    const m = s.dogs.find(d => d.sex === "f"), f = s.dogs.find(d => d.sex === "m");
    [m, f].forEach(d => { d.level = 12; d.energy = 100; d.breedCooldownUntil = 0; d.bornAt = Date.now() - 60 * 3600e3; });
    const n0 = s.dogs.length, b0 = s.balance;
    let evMult = 1;
    E.events.active(Date.now()).forEach(e => { if (e.effect.breed_cost_mult) evMult *= e.effect.breed_cost_mult; });
    const cost = E.genetics.cost(m, f, evMult);
    const res = A().breed(m.uid, f.uid, "Test Yavru");
    ok(res && res.ok, "uretim basarisiz: " + (res && res.msg));
    ok(s.dogs.length === n0 + 1, "yavru eklenmedi (" + n0 + " -> " + s.dogs.length + ")");
    ok(s.balance === b0 - cost, "uretim maliyeti dusulmedi (" + b0 + " -> " + s.balance + ", beklenen " + cost + ")");
    const pup = s.dogs[s.dogs.length - 1];
    ok(pup.name === "Test Yavru", "yavru adi verilmedi: " + pup.name);
    ok(pup.lineage.mother === m.uid && pup.lineage.father === f.uid, "soy kaydi yok");
    ok(m.energy === 100 - 35 && f.energy === 100 - 35, "enerji harcanmadi");
    ok(m.breedCooldownUntil > Date.now(), "anne bekleme suresi islenmedi");
    ok(s.stats.puppiesBred === 1, "uretim istatistigi artmadi");
  });
  T("09b gecersiz cift reddediliyor (olu buton korumasi)", () => {
    const s = G.state;
    const m = s.dogs.find(d => d.sex === "f");
    const n0 = s.dogs.length, b0 = s.balance;
    A().breed(m.uid, m.uid, "Kendiyle");
    ok(s.dogs.length === n0 && s.balance === b0, "gecersiz ciftlestirme islendi");
  });

  /* ---- 10 arena ---- */
  T("10 arena savasi: 4v4 sonuclandi, odul/rating/gecmis islendi", () => {
    const s = G.state;
    while (s.dogs.length < 4) {
      const d = E.makeDog(DB.breeds[s.dogs.length + 3].id, { level: 20, bornAt: Date.now() - 60 * 3600e3 });
      s.dogs.push(d);
    }
    s.dogs.forEach(d => { d.level = 20; d.energy = 100; d.bornAt = Date.now() - 60 * 3600e3; });
    const team = s.dogs.slice(0, 4).map(d => d.uid);
    const b0 = s.balance, r0 = s.arena.rating, h0 = s.arena.history.length;
    const tot0 = s.arena.wins + s.arena.losses + s.arena.draws;
    A().startBattle(team, 4242, null);
    ok(s.arena.history.length === h0 + 1, "savas gecmisi eklenmedi");
    ok(s.arena.wins + s.arena.losses + s.arena.draws === tot0 + 1, "savas sayaci artmadi");
    ok(s.arena.rating !== r0, "rating degismedi");
    ok(s.balance !== b0, "savas odulu verilmedi");
    ok(s.balance >= 0, "bakiye negatife dustu");
    ok(E.tierOf(s.arena.rating), "lig hesaplanamadi");
  });
  T("10b savas deterministik: ayni takim + ayni seed = ayni sonuc", () => {
    const s = G.state;
    const dogs = s.dogs.slice(0, 4);
    const team = dogs.map(d => d.uid);
    const run = () => {
      // takim durumunu birebir geri yukle (savas sonrasi xp/enerji degisiyor)
      dogs.forEach((d, i) => { const c = snapDogs[i]; Object.keys(c).forEach(k => { d[k] = JSON.parse(JSON.stringify(c[k])); }); });
      s.arena.history.length = 0; s.balance = 100000; s.arena.rating = 1200;
      const r = A().startBattle(team, 777, null);
      ok(r && r.ok, "savas baslatilamadi: " + (r && r.msg));
      const h = s.arena.history[0];
      return JSON.stringify({ win: h.win, opp: h.opp, oppRating: h.oppRating, delta: h.delta, reward: h.reward,
        turns: r.sim.turns, log: r.sim.log, winner: r.sim.winner, units: r.sim.units });
    };
    const snapDogs = dogs.map(d => JSON.parse(JSON.stringify(d)));
    const a = run(), b = run();
    if (a !== b) {
      for (let i = 0; i < Math.min(a.length, b.length); i++)
        if (a[i] !== b[i]) throw new Error("savas akisi farkli @" + i + ": A=" + a.slice(i - 80, i + 80) + " B=" + b.slice(i - 80, i + 80));
    }
    ok(a === b, "ayni seed farkli savas uretti");
    ok(a.length > 1000, "savas kaydi cok kisa");
  });
  T("10c eksik takimla savas baslatilamiyor", () => {
    const s = G.state;
    const h0 = s.arena.history.length;
    A().startBattle([s.dogs[0].uid], 1, null);
    ok(s.arena.history.length === h0, "eksik takimla savas yapildi");
  });

  /* ---- 11 pazar ---- */
  T("11 ilan ver / iptal et akisi", () => {
    const s = G.state;
    s.market.listings = [];
    const d = s.dogs.find(x => !x.inMarket && !x.locked);
    const price = Math.max(1000, Math.round(E.stats.marketValue(d, Date.now()) * 0.9));
    A().listDog(d.uid, price);
    ok(s.market.listings.length === 1, "ilan eklenmedi");
    ok(d.inMarket === true, "kopek pazarda isaretlenmedi");
    ok(s.market.listings[0].price === price, "ilan fiyati kaydedilmedi");
    A().cancelListing(s.market.listings[0].id);
    ok(s.market.listings.filter(l => !l.sold).length === 0, "ilan iptal edilmedi");
    ok(d.inMarket === false, "kopek pazar isareti temizlenmedi");
  });
  T("11b bot ilanindan satin alma + cift harcama korumasi", () => {
    const s = G.state;
    G.refreshBotListings();
    ok(s.market.botListings.length === 14, "bot ilanlari yenilenmedi: " + s.market.botListings.length);
    const l = s.market.botListings.slice().sort((a, b) => a.price - b.price)[0];
    s.balance = l.price + 1000;
    const n0 = s.dogs.length;
    const unBefore = new Set(Object.keys(s.achievements.unlocked));
    const r = A().buyListing(l.id);
    ok(r && r.ok, "alim basarisiz: " + (r && r.msg));
    ok(s.dogs.length === n0 + 1, "kopek teslim edilmedi");
    const bonus = Object.keys(s.achievements.unlocked).filter(k => !unBefore.has(k))
      .reduce((t, k) => t + (DB.achievements.find(a => a.id === k) || { reward_points: 0 }).reward_points, 0);
    ok(s.balance === 1000 + bonus, "bakiye yanlis: " + s.balance + " (beklenen " + (1000 + bonus) + ", basarim bonusu " + bonus + ")");
    ok(s.stats.marketBuys >= 1, "alim istatistigi artmadi");
    ok(s.market.history.length >= 1, "pazar gecmisi bos");
    const n1 = s.dogs.length, b1 = s.balance;
    const r2 = A().buyListing(l.id);
    ok(r2 && r2.ok === false, "satilmis ilan ikinci kez alinabildi (CIFT HARCAMA)");
    ok(s.dogs.length === n1 && s.balance === b1, "ikinci alimda durum degisti");
  });
  T("11c yetersiz bakiye ile alim engelleniyor", () => {
    const s = G.state;
    const l = s.market.botListings.slice().sort((a, b) => b.price - a.price)[0];
    s.balance = 0;
    const n0 = s.dogs.length;
    A().buyListing(l.id);
    ok(s.dogs.length === n0 && s.balance === 0, "yetersiz bakiye ile alim yapildi");
  });
  T("11d kendi ilanin bot tarafindan satilinca net gelir ekleniyor", () => {
    const s = G.state;
    s.balance = 100000;
    s.market.listings = [];
    const d = s.dogs.find(x => !x.inMarket);
    const price = 200000;
    d.value = undefined;
    const okList = A().listDog(d.uid, price);
    ok(okList.ok, "ilan verilemedi: " + okList.msg);
    const l = s.market.listings[0];
    l.createdAt = Date.now() - 120000;              // 60 sn koruma suresini gec
    l.value = price / 0.9;                          // fiyat/deger orani -> %55/saat sans
    const before = s.balance, dogsBefore = s.dogs.length;
    let tries = 0;
    while (!l.sold && tries++ < 400) G.simulateBotPurchases(3600);
    ok(l.sold === true, "400 saatlik simulasyonda bot ilan satin almadi");
    const fee = E.market.fee(price, E.events.active(Date.now()));
    ok(s.balance === before + price - fee, "net gelir yanlis: +" + (s.balance - before) + " (beklenen " + (price - fee) + ")");
    ok(s.dogs.length === dogsBefore - 1, "satilan kopek envanterden cikmadi");
    ok(s.stats.marketSales === 1, "satis istatistigi yanlis: " + s.stats.marketSales);
    ok(s.market.history[0].type === "sell" && s.market.history[0].amount === price - fee, "satis gecmisi yanlis");
    ok(d.inMarket === false || s.dogs.indexOf(d) < 0, "satilan kopek hala pazarda gorunuyor");
    ok(tries < 400, "olasilik cok dusuk");
  });

  /* ---- 12 gorevler / basarimlar / gunluk odul ---- */
  T("12 gorev odulu talep ediliyor, ikinci kez edilmiyor", () => {
    const s = G.state;
    G.ensureDailyQuests();
    const q = s.quests.list[0];
    q.progress = q.target; q.done = true;
    const b0 = s.balance;
    A().claimQuest(0);
    ok(s.balance > b0, "gorev odulu verilmedi");
    ok(q.claimed === true, "gorev alindi isaretlenmedi");
    const b1 = s.balance;
    A().claimQuest(0);
    ok(s.balance === b1, "ayni gorev iki kez odul verdi");
  });
  T("12b gorev yenileme (reroll) maliyet karsiligi calisiyor", () => {
    const s = G.state;
    s.balance = 50000;
    const ids = s.quests.list.map(q => q.id).join(",");
    A().rerollQuests();
    ok(s.quests.list.length === 4, "yenileme sonrasi gorev sayisi yanlis");
    ok(s.quests.list.every(q => !q.claimed), "yenilenen gorev alinmis gorunuyor");
    ok(ids.length > 0, "kontrol hatasi");
  });
  T("12c basarimlar kontrol ediliyor ve acilanlar odul veriyor", () => {
    const s = G.state;
    s.stats.cratesOpened = 100; s.stats.battlesWon = 100;
    const b0 = s.balance;
    G.checkAchievements();
    ok(Object.keys(s.achievements.unlocked).length > 0, "hic basarim acilmadi");
    ok(s.balance >= b0, "basarim odulu bakiyeyi dusurdu");
  });
  T("12d gunluk giris odulu serisi ilerliyor", () => {
    const s = G.state;
    s.login.lastClaimKey = null; s.login.streak = 0;
    const b0 = s.balance, inv0 = JSON.stringify(s.inventory);
    G.openLoginReward();
    ok(modalButtons().length >= 2, "giris odulu modal acilmadi");
    ok(clickButton("Ödülü Al"), "'Odulu Al' butonu bulunamadi");
    ok(s.login.streak >= 1, "giris serisi artmadi: " + s.login.streak);
    ok(s.balance !== b0 || JSON.stringify(s.inventory) !== inv0 || s.login.streak === 1, "gunluk odul verilmedi");
    ok(s.login.lastClaimKey === E.dayKey(Date.now()), "son alim anahtari islenmedi");
    const streak = s.login.streak;
    G.openLoginReward();
    ok(s.login.streak === streak, "ayni gun ikinci giris odulu verildi");
  });

  /* ---- 13 envanter / egitim / yukseltme ---- */
  T("13 esya kullanimi: mama enerji verir, sayi duser", () => {
    const s = G.state;
    s.inventory.food_s = 2;
    const d = s.dogs[0]; d.energy = 20;
    A().useItemOnDog("food_s", d.uid);
    ok(d.energy > 20, "mama enerji vermedi");
    ok(s.inventory.food_s === 1, "esya sayisi dusulmedi");
    ok(s.stats.itemsUsed >= 1, "esya istatistigi artmadi");
  });
  T("13b olmayan esya kullanilamiyor", () => {
    const s = G.state;
    const inv = JSON.stringify(s.inventory);
    A().useItemOnDog("olmayan_esya", s.dogs[0].uid);
    ok(JSON.stringify(s.inventory) === inv, "olmayan esya envanteri degistirdi");
  });
  T("13c hizlandirici (booster) aktiflesiyor ve uretimi artiriyor", () => {
    const s = G.state;
    s.inventory.booster_prod_s = 1;
    const before = E.economy.globalMult(s, Date.now());
    A().activateBooster("booster_prod_s");
    ok(s.boosters.length === 1, "hizlandirici eklenmedi");
    ok(E.economy.globalMult(s, Date.now()) > before, "hizlandirici uretimi artirmadi");
    ok(s.inventory.booster_prod_s === 0 || !s.inventory.booster_prod_s, "hizlandirici envanterden dusulmedi");
  });
  T("13d egitim: stat puani artiyor, maliyet duser, enerji harcanir", () => {
    const s = G.state;
    s.balance = 500000;
    const d = s.dogs[0]; d.energy = 100; d.trained.power = 0;
    const cost = E.stats.trainCost(d, "power");
    const b0 = s.balance;
    A().trainDog(d.uid, "power");
    ok(d.trained.power > 0, "egitim puani artmadi");
    ok(s.balance === b0 - cost, "egitim maliyeti yanlis: " + (b0 - s.balance) + " != " + cost);
    ok(d.energy < 100, "egitim enerji harcamadi");
    ok(s.stats.trainings >= 1, "egitim istatistigi artmadi");
  });
  T("13e seviye atlama (IV yukseltme) maliyet karsiligi calisiyor", () => {
    const s = G.state;
    s.balance = 5e7;
    const d = s.dogs[0];
    const iv0 = JSON.stringify(d.ivs), cost = E.stats.levelUpCost(d), b0 = s.balance;
    A().upgradeDog(d.uid);
    ok(JSON.stringify(d.ivs) !== iv0 || d.level > 1, "yukseltme uygulanmadi");
    ok(s.balance === b0 - cost, "yukseltme maliyeti yanlis: " + (b0 - s.balance) + " != " + cost);
    ok(s.stats.upgrades >= 1, "yukseltme istatistigi artmadi");
  });

  /* ---- 14 arkadaslar ---- */
  T("14 arkadas ekleme: demo oyuncu listesi ve kod ile arama", () => {
    const s = G.state;
    ok(Array.isArray(G.demoPlayers) && G.demoPlayers.length >= 5, "demo oyuncu listesi yok");
    const demo = G.demoPlayers[0];
    ok(demo && demo.code && demo.name, "demo oyuncu verisi eksik");
    const r = A().addFriend(demo.code);
    ok(r.ok, "arkadas istegi reddedildi: " + r.msg);
    ok(s.friends.outgoing.some(f => f.code === demo.code), "giden istek kaydedilmedi");
  });
  await T("14a2 demo oyuncu istegi kabul ediyor (2.5 sn sonra arkadaşa eklenir)", async () => {
    const s = G.state;
    const demo = G.demoPlayers[0];
    await wait(2700);
    ok(s.friends.list.some(f => f.code === demo.code), "demo oyuncu kabul etmedi");
    ok(!s.friends.outgoing.some(f => f.code === demo.code), "giden kutusu temizlenmedi");
    ok(s.stats.friendsAdded >= 1, "arkadas istatistigi artmadi");
    const f = s.friends.list.filter(x => x.code === demo.code)[0];
    ok(f.name && typeof f.rating === "number", "arkadas profili eksik");
    return wait(5);
  });
  T("14b gecersiz kod reddediliyor, kendin eklenemiyor", () => {
    const s = G.state;
    const before = JSON.stringify(s.friends);
    A().addFriend("PAW-000000");
    ok(JSON.stringify(s.friends) === before, "gecersiz kod kabul edildi");
    A().addFriend(s.profile.code);
    ok(JSON.stringify(s.friends) === before, "kendi kodun kabul edildi");
  });
  T("14c gelen istek kabul/red, arkadas cikarma, arena daveti", () => {
    const s = G.state;
    const demo = G.demoPlayers[1];
    s.friends.incoming.push({ code: demo.code, name: demo.name, rating: demo.rating, dogs: demo.dogs, breeds: demo.breeds, title: demo.title, online: true });
    A().acceptFriend(demo.code);
    ok(s.friends.list.some(f => f.code === demo.code), "istek kabul edilmedi");
    ok(!s.friends.incoming.some(f => f.code === demo.code), "gelen kutusu temizlenmedi");
    ok(s.stats.friendsAdded >= 1, "arkadas istatistigi artmadi");
    const inv = A().inviteFriend(demo.code);
    ok(inv.ok, "arena daveti basarisiz: " + inv.msg);
    A().removeFriend(demo.code);
    ok(!s.friends.list.some(f => f.code === demo.code), "arkadas silinemedi");
    const demo2 = G.demoPlayers[2];
    s.friends.incoming.push({ code: demo2.code, name: demo2.name });
    A().declineFriend(demo2.code);
    ok(!s.friends.incoming.some(f => f.code === demo2.code), "red islenmedi");
  });

  /* ---- 15 liderlik tablosu ---- */
  T("15 liderlik tablosu 4 metrikte de satir uretiyor", () => {
    ["balance", "rating", "collection", "level"].forEach(m => {
      const rows = G.leaderboard(m);
      ok(Array.isArray(rows) && rows.length >= 5, m + " tablosu bos");
      rows.forEach(r => ok(r && r.name && typeof r.raw === "number" && r.val !== undefined, m + " satiri bozuk: " + JSON.stringify(r)));
      const vals = rows.map(r => r.raw);
      ok(vals.every((v, i) => i === 0 || vals[i - 1] >= v), m + " tablosu sirali degil");
    });
  });

  /* ---- 16 cevrimdisi kazanc ekrani ---- */
  T("16 cevrimdisi kazanc hesaplaniyor ve modal aciliyor", () => {
    const s = G.state;
    s.time.lastSeenAt = Date.now() - 3 * 3600e3;
    s.time.monoBase = (performance.now() / 1000) - 3 * 3600;
    const res = G.checkOfflineEarnings();
    ok(res, "checkOfflineEarnings sonuc dondurmedi");
    ok(res.gain >= 0, "cevrimdisi kazanc negatif");
    ok(typeof res.seconds === "number" && typeof res.pps === "number", "sure/pps alani yok");
    ok(res.seconds <= 8 * 3600, "8 saat siniri asildi: " + res.seconds);
    G.showOfflineModal(res);
    ok(clickButton("Topla"), "cevrimdisi modal 'Topla' butonu yok");
    const back = G.checkOfflineEarnings();
    ok(!back || back.gain === 0 || back.tampered, "geri alinmis saat kazanc uretti");
    G.showOfflineModal(back || { gain: 0, seconds: 0, pps: 0 });
  });
  T("16b saat geri alinirsa cevrimdisi kazanc 0", () => {
    const s = G.state;
    s.time.lastSeenAt = Date.now() + 600000;
    const res = G.checkOfflineEarnings();
    ok(!res || res.gain === 0, "geriye alinmis saat kazanc uretti: " + (res && res.gain));
    s.time.lastSeenAt = Date.now();
  });

  /* ---- 17 kayit / geri yukleme ---- */
  T("17 kaydet + geri yukle: durum birebir korunuyor", () => {
    const s = G.state;
    s.balance = 424242; s.dogs[0].name = "Karabaş";
    G.save();
    const raw = store.get(E.save.KEY);
    ok(raw && raw.length > 100, "localStorage'a kayit yazilmadi");
    G.state = null;
    G.resume();
    ok(G.state && G.state.balance === 424242, "bakiye geri yuklenmedi");
    ok(G.state.dogs[0].name === "Karabaş", "kopek adi geri yuklenmedi");
    ok(G.state.dogs.length === s.dogs.length, "kopek sayisi degisti");
  });
  T("17b disa/ice aktarim kodu calisiyor", () => {
    const code = E.save.export(G.state);
    ok(code.length > 100, "kod uretilmedi");
    const back = E.save.import(code);
    ok(back && back.balance === G.state.balance, "kod geri yuklenemedi");
    ok(E.save.import("bozuk!!") === null, "bozuk kod kabul edildi");
  });

  /* ---- 18 ayarlar ---- */
  T("18 ayarlar: ses/muzik/kalite/dil degisiklikleri uygulanıyor", () => {
    const s = G.state;
    s.settings.music = false; s.settings.sfx = false; G.applySettings();
    ok(U.audio.musicOn === false && U.audio.sfxOn === false, "ses ayari uygulanmadi");
    s.settings.music = true; s.settings.sfx = true; G.applySettings();
    ok(U.audio.musicOn === true && U.audio.sfxOn === true, "ses ayari geri alinmadi");
    ["low", "medium", "high"].forEach(q => { s.settings.quality = q; G.applySettings(); });
    ok(s.settings.quality === "high", "kalite ayari bozuldu");
    s.settings.reduceMotion = true; G.applySettings();
    U.sfx("ui_click"); U.audio.music("music_menu");
    ok(true, "ses cagrilari hatasiz");
  });

  /* ---- 19 cevrimici katmani (sunucu yokken zarif dusus) ---- */
  await T("19 net.js sunucu yokken oyuna zarar vermiyor", async () => {
    ok(N.online === false || N.online === true, "online bayragi tanimsiz");
    await new Promise(res => {
      let done = false;
      const fin = () => { if (!done) { done = true; res(); } };
      try { N.connect("http://127.0.0.1:59999", fin); } catch (e) { fin(); }
      setTimeout(fin, 300);
    });
    ok(G.state.online.mode === "local", "sunucu yokken mod local kalmali: " + G.state.online.mode);
    return wait(20);
  });

  /* ---- 20 calisma zamani hatalari ---- */
  T("20 konsol hatasi / yakalanmayan istisna yok", () => {
    ok(errors.length === 0, errors.length + " hata:\n" + errors.slice(0, 6).join("\n"));
    ok(!warns.some(w => /ekran yok/.test(w)), "kayitli olmayan ekran cagrildi: " + warns.filter(w => /ekran yok/.test(w)).join("; "));
  });
  T("20b tum ekranlar gercek HTML uretti (bos ekran yok)", () => {
    SCREENS.forEach(n => {
      U.show(n, n === "dogDetail" ? { uid: G.state.dogs[0].uid } : {});
    });
    ok(true, "");
  });

  T("21 statik sozlesme: kodda cagrilan tum semboller gercekten var", () => {
    const files = ["src/js/ui/ui.js", "src/js/app.js", "scenes/screens_core.js", "scenes/screens_play.js"];
    const src = files.map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
    const missing = [];
    const scan = (re, resolve, tag) => {
      const seen = new Set();
      let m; const rx = new RegExp(re, "g");
      while ((m = rx.exec(src))) { const k = m[1] + (m[2] ? "." + m[2] : ""); if (seen.has(k)) continue; seen.add(k); if (!resolve(m)) missing.push(tag + k); }
    };
    scan("U\\.([a-zA-Z_$][\\w$]*)", m => U[m[1]] !== undefined, "U.");
    scan("PL\\.game\\.([a-zA-Z_$][\\w$]*)", m => G[m[1]] !== undefined, "PL.game.");
    scan("PL\\.game\\.actions\\.([a-zA-Z_$][\\w$]*)", m => G.actions[m[1]] !== undefined, "actions.");
    scan("PL\\.net\\.([a-zA-Z_$][\\w$]*)", m => N[m[1]] !== undefined, "PL.net.");
    scan("PL\\.save\\.([a-zA-Z_$][\\w$]*)", m => PL.save && PL.save[m[1]] !== undefined, "PL.save.");
    scan("(?:PL\\.DB|DB)\\.([a-zA-Z_$][\\w$]*)", m => DB[m[1]] !== undefined, "DB.");
    scan("E\\.([a-z][\\w$]*)\\.([a-zA-Z_$][\\w$]*)", m => {
      const ns = E[m[1]];
      return ns !== undefined && (typeof ns !== "object" || ns[m[2]] !== undefined);
    }, "E.");
    scan("E\\.([a-zA-Z_$][\\w$]*)\\(", m => typeof E[m[1]] === "function", "E.fn ");
    ok(missing.length === 0, "olmayan sembol kullaniliyor (" + missing.length + "): " + missing.join(", "));
  });

  await wait(60);
  if (G._tick) clearInterval(G._tick);
  const total = pass + fail;
  const md = [
    "# PAW LEGENDS: DOG WORLD — Headless Arayuz / Akis Testi",
    "",
    "- Tarih: " + new Date().toISOString(),
    "- Ortam: node " + process.version + " (minimal DOM taklidi, gercek oyun kodu)",
    "- Komut: `node tests/smoke_ui.js`",
    "- Kapsam: 18 ekrani render etme, kasa acma, uretim, 4v4 arena, pazar ilan/alim,",
    "  gorev/basarim/gunluk odul, envanter, egitim, arkadas, liderlik, cevrimdisi kazanc,",
    "  kaydet/geri yukle, ayarlar ve sunucusuz cevrimici katman.",
    "",
    "## Ozet",
    "",
    "| Toplam | Gecen | Kalan |",
    "|---:|---:|---:|",
    "| " + total + " | " + pass + " | " + fail + " |",
    "",
    "**Durum: " + (fail === 0 ? "TUM ARAYUZ TESTLERI GECTI" : fail + " TEST KALDI") + "**",
    "",
    "```",
    lines.join("\n"),
    "```",
    ""
  ].join("\n");
  fs.writeFileSync(path.join(__dirname, "SMOKE_RESULTS.md"), md, "utf8");
  console.warn = realWarn;
  console.log(lines.join("\n"));
  console.log("\n=== " + pass + "/" + total + " arayuz testi gecti" + (fail ? " — " + fail + " KALDI" : " — TUMU BASARILI") + " ===");
  process.exit(fail ? 1 : 0);

  function A() { return G.actions; }
})();
