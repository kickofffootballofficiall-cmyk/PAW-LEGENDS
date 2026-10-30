#!/usr/bin/env node
"use strict";
/* =============================================================================
   PAW LEGENDS: DOG WORLD — otomatik MOTOR testleri (sifir bagimlilik)
   Calistirma:  node tests/run_tests.js
   Cikti:       tests/RESULTS.md
   ========================================================================== */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
global.window = global;
require(path.join(ROOT, "src/js/core/data_bundle.js"));
require(path.join(ROOT, "src/js/core/engine.js"));
const PL = global.PL, E = PL.engine, DB = PL.DB;
const S = E.stats, G = E.genetics, CR = E.crates, BT = E.battle, EC = E.economy,
      MK = E.market, QS = E.quests, AC = E.achievements, SV = E.save, EV = E.events;
const BAL = E.bal(), SK = DB.statKeys;
const NOW = Date.parse("2026-03-11T12:00:00Z");   // Carsamba, gunduz -> etkinlik yok

let pass = 0, fail = 0; const lines = [];
function T(name, fn) {
  try { fn(); pass++; lines.push("PASS  " + name); }
  catch (e) { fail++; lines.push("FAIL  " + name + "  ->  " + e.message); }
}
function ok(c, m) { if (!c) throw new Error(m || "beklenen kosul saglanmadi"); }
function near(a, b, tol, m) {
  if (Math.abs(a - b) > tol) throw new Error((m || "near") + ": " + a + " != " + b + " (+/-" + tol + ")");
}
function st() {                       // baslangic durumu + 2 starter kopek
  const s = SV.defaultState("Test Oyuncu");
  SV.starterDogs(s);
  s.time.lastSeenAt = NOW; s.time.lastCollectAt = NOW; s.time.clockBase = NOW / 1000;
  s.settings.reduceMotion = true;
  return s;
}
const ADULT_H = 60;
function age(d, h) { d.bornAt = NOW - (h === undefined ? ADULT_H : h) * 3600e3; return d; }
function ready(d) { d.level = 10; d.energy = 100; d.breedCooldownUntil = 0; d.inMarket = false; d.traits = []; return age(d); }
function mkDog(breedId, opts) {
  opts = opts || {};
  const d = E.makeDog(breedId, Object.assign({ seed: opts.seed === undefined ? (breedId * 7919 + (opts.level || 1) * 13) : opts.seed, bornAt: NOW - ADULT_H * 3600e3 }, opts));
  return d;
}
function fixedTeam(seed, level, rarity) {
  const rnd = E.rng.from(seed);
  const pool = rarity ? DB.breeds.filter(b => b.rarity === rarity) : DB.breeds;
  const out = [];
  for (let i = 0; i < BAL.battle.team_size; i++) {
    const b = E.rng.pick(rnd, pool);
    out.push(E.makeDog(b.id, { seed: Math.floor(rnd() * 1e9), level: level, uid: "T" + seed + "_" + i, bornAt: NOW - 72 * 3600e3 }));
  }
  return out;
}
function statSum(o) { let t = 0; SK.forEach(k => t += o[k]); return t; }

/* ======================= 01 VERI BUTUNLUGU ======================= */
T("01a 100 benzersiz irk var (id/anahtar/isim)", () => {
  ok(DB.breeds.length === 100, "sayi " + DB.breeds.length);
  const ids = new Set(), keys = new Set(), names = new Set();
  DB.breeds.forEach(b => { ids.add(b.id); keys.add(b.key); names.add(b.name_tr); });
  ok(ids.size === 100, "id tekrari var"); ok(keys.size === 100, "key tekrari var"); ok(names.size === 100, "isim tekrari var");
});
T("01b 100 irkin webp + svg gorseli diskte var ve bos degil", () => {
  DB.breeds.forEach(b => {
    const w = path.join(ROOT, b.image), s = path.join(ROOT, b.image_svg);
    ok(fs.existsSync(w), "eksik webp: " + b.image);
    ok(fs.existsSync(s), "eksik svg: " + b.image_svg);
    ok(fs.statSync(w).size > 3000, "webp cok kucuk: " + b.image + " (" + fs.statSync(w).size + "b)");
  });
});
T("01c her irk gorseli farkli (ayni dosya 100 kez kopyalanmadi)", () => {
  const sizes = DB.breeds.map(b => fs.statSync(path.join(ROOT, b.image)).size);
  ok(new Set(sizes).size >= 95, "gorseller ayni: benzersiz boyut " + new Set(sizes).size);
  const hashes = new Set(DB.breeds.map(b => require("crypto").createHash("md5").update(fs.readFileSync(path.join(ROOT, b.image))).digest("hex")));
  ok(hashes.size === 100, "md5 tekrari var: " + hashes.size + "/100");
});
T("01d irk alanlari gecerli (rarity/6 stat/aciklama/uretim/deger/yetenek)", () => {
  DB.breeds.forEach(b => {
    ok(!!DB.rarities[b.rarity], "gecersiz rarity: " + b.rarity);
    SK.forEach(k => ok(typeof b.stats[k] === "number" && b.stats[k] >= 20 && b.stats[k] <= 120, b.key + "." + k + " sinir disi"));
    ok(b.description_tr && b.description_tr.length >= 25, "aciklama kisa: " + b.key);
    ok(b.productionPerSecondLevel1 > 0 && b.marketBasePrice > 0, "ekonomi alani 0: " + b.key);
    ok(b.ability && b.ability.name_tr && b.ability.type && typeof b.ability.cooldown === "number", "yetenek bozuk: " + b.key);
    ok(b.group && b.origin && b.size && BAL.breeding.growth_stages && ["toy", "küçük", "orta", "büyük", "dev"].includes(b.size), "boyut gecersiz: " + b.key);
  });
});
T("01e irk stat toplami rarity tablosuna birebir esit", () => {
  DB.breeds.forEach(b => {
    const sum = statSum(b.stats);
    ok(sum === DB.rarities[b.rarity].stat_sum, b.key + " " + sum + " != " + DB.rarities[b.rarity].stat_sum);
  });
});
T("01f rarity dagilimi 30/24/20/13/10/3", () => {
  const c = {};
  DB.breeds.forEach(b => c[b.rarity] = (c[b.rarity] || 0) + 1);
  const want = { "yaygın": 30, "seçkin": 24, "nadir": 20, "çok_nadir": 13, "efsanevi": 10, "mitik": 3 };
  Object.keys(want).forEach(k => ok(c[k] === want[k], k + ": " + c[k] + " != " + want[k]));
});
T("01g 6 rarity katmaninin renk/cerçeve/carpan verileri tam", () => {
  ok(Object.keys(DB.rarities).length === 6, "rarity sayisi " + Object.keys(DB.rarities).length);
  let prevSum = 0, prevProd = 0, prevPrice = 0;
  Object.keys(DB.rarities).forEach(k => {
    const r = DB.rarities[k];
    ok(/^#[0-9a-f]{6}$/i.test(r.color) && /^#[0-9a-f]{6}$/i.test(r.color_dark), k + " renk bozuk");
    ok(r.name_tr && r.name_en && r.glow, k + " etiket eksik");
    ok(r.stat_sum > prevSum && r.production_mult > prevProd && r.price_mult > prevPrice, k + " carpanlari artmiyor");
    prevSum = r.stat_sum; prevProd = r.production_mult; prevPrice = r.price_mult;
  });
});
T("01h data_bundle.js, data/*.json ile birebir ayni (bayat degil)", () => {
  const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f + ".json"), "utf8"));
  const br = read("breeds");
  const pairs = [
    ["breeds", br.breeds, DB.breeds], ["rarities", read("rarities").rarities, DB.rarities],
    ["crates", read("crates").crates, DB.crates], ["balance", read("balance"), DB.balance],
    ["items", read("items").items, DB.items], ["quests", read("quests"), DB.quests],
    ["achievements", read("achievements").achievements, DB.achievements],
    ["events", read("events").events, DB.events], ["lookups", read("_lookups"), DB.lookups],
    ["statKeys", br.statKeys, DB.statKeys], ["statLabels", br.statLabels, DB.statLabels]
  ];
  pairs.forEach(([name, disk, bundled]) =>
    ok(JSON.stringify(disk) === JSON.stringify(bundled), "bundle != data/" + name));
  ok(br.count === 100 && br.version === DB.version, "breeds.json ust verisi tutarsiz");
  DB.breeds.forEach(b => {
    ok(DB.breedsById[b.id] === b && DB.breedsByKey[b.key] === b, "indeks bozuk: " + b.key);
    ok(DB.lookups[b.key], "lookups'ta gorunum verisi yok: " + b.key);
  });
});

/* ======================= 02 KASALAR ======================= */
T("02a 5 kasa ve tam fiyatlar 10k / 50k / 100k / 200k / 500k", () => {
  const want = { silver: 10000, gold: 50000, diamond: 100000, legendary: 200000, mythic: 500000 };
  ok(DB.crates.length === 5, "kasa sayisi " + DB.crates.length);
  DB.crates.forEach(c => {
    ok(c.price === want[c.id], c.id + " fiyati " + c.price);
    ok(CR.price(c.id) === want[c.id], "CR.price yanlis " + c.id);
    ok(fs.existsSync(path.join(ROOT, c.image)), "kasa gorseli yok: " + c.image);
    ok(c.name_tr && c.desc_tr && c.accent, c.id + " metin alani eksik");
  });
});
T("02b her kasanin olasilik toplami 1.000 ve odul karisimi 1.000", () => {
  DB.crates.forEach(c => {
    let s = 0; Object.keys(c.odds).forEach(k => { ok(DB.rarities[k], c.id + " bilinmeyen rarity " + k); s += c.odds[k]; });
    near(s, 1, 1e-9, c.id + " odds toplami");
    let m = 0; Object.keys(c.reward_mix).forEach(k => m += c.reward_mix[k]);
    near(m, 1, 1e-9, c.id + " reward_mix toplami");
    ok(c.points_max > c.points_min && c.points_min > 0, c.id + " puan araligi bozuk");
    c.item_pool.forEach(i => ok(DB.itemsById[i], c.id + " havuzunda olmayan esya " + i));
  });
});
T("02c kasa kalitesi fiyati arttikca artiyor (yapilandirma)", () => {
  for (let i = 1; i < DB.crates.length; i++) {
    const lo = DB.crates[i - 1].odds, hi = DB.crates[i].odds;
    ok(hi.mitik > lo.mitik && hi.efsanevi > lo.efsanevi && hi["yaygın"] <= lo["yaygın"],
      DB.crates[i].id + " bir oncekinden iyi degil");
  }
});
T("02d 20000 Gumus acilisi: dagilim yapilandirilan olasiliklara uygun", () => {
  const c = DB.crates[0], n = 20000, got = {};
  for (let i = 0; i < n; i++) { const r = CR.open("silver", { seed: i + 1 }); got[r.rarity] = (got[r.rarity] || 0) + 1; }
  Object.keys(c.odds).forEach(k => {
    const p = c.odds[k], obs = (got[k] || 0) / n;
    ok(Math.abs(obs - p) < Math.max(0.012, 3 * Math.sqrt(p * (1 - p) / n)), k + " orani " + obs.toFixed(4) + " != " + p);
  });
});
T("02e 20000 Mitik acilisi: ust sinif orani dogru ve Gumus'un cok uzerinde", () => {
  const c = DB.crates[4], n = 20000; let hi = 0, hiSilver = 0;
  for (let i = 0; i < n; i++) {
    const r = CR.open("mythic", { seed: 900000 + i });
    if (r.rarity === "efsanevi" || r.rarity === "mitik") hi++;
    const r2 = CR.open("silver", { seed: 900000 + i });
    if (r2.rarity === "efsanevi" || r2.rarity === "mitik") hiSilver++;
  }
  near(hi / n, c.odds.efsanevi + c.odds.mitik, 0.012, "mitik kasa ust sinif orani");
  ok(hi > hiSilver * 20, "mitik kasa gumuse gore anlamli sekilde iyi degil (" + hi + " vs " + hiSilver + ")");
});
T("02f odul tipleri gecerli; kopek odulu cekilen rarity ile eslesiyor", () => {
  const types = {};
  for (let i = 0; i < 3000; i++) {
    const r = CR.open("gold", { seed: 5000 + i });
    types[r.type] = (types[r.type] || 0) + 1;
    ok(["dog", "points", "item"].includes(r.type), "bilinmeyen odul tipi " + r.type);
    if (r.type === "dog") {
      ok(r.breedId && E.breed(r.breedId), "kopek odulunda irk yok");
      ok(E.breed(r.breedId).rarity === r.rarity, "odul irki rarity ile eslesmiyor");
    }
    if (r.type === "points") ok(r.points >= DB.crates[1].points_min && r.points <= DB.crates[1].points_max, "puan aralik disi");
    if (r.type === "item") ok(DB.itemsById[r.item], "odul esyasi tanimsiz");
  }
  const mix = DB.crates[1].reward_mix;
  Object.keys(mix).forEach(k => near((types[k] || 0) / 3000, mix[k], 0.02, "odul karisimi " + k));
});
T("02g luck carpani yuksek rarity olasiligini artirir", () => {
  const n = 8000; let base = 0, luck = 0;
  for (let i = 0; i < n; i++) {
    const rnd = E.rng.from(i + 1);
    if (E.rarOrder(CR.rollRarity("diamond", rnd, 1)) >= 5) base++;
    const rnd2 = E.rng.from(i + 1);
    if (E.rarOrder(CR.rollRarity("diamond", rnd2, 3)) >= 5) luck++;
  }
  ok(luck > base * 1.3, "luck etkisi yok (" + base + " -> " + luck + ")");
});

/* ======================= 03 RNG ======================= */
T("03a ayni seed ayni dizi, farkli seed farkli dizi", () => {
  const a = E.rng.from(4242), b = E.rng.from(4242), c = E.rng.from(4243);
  let diff = 0;
  for (let i = 0; i < 100; i++) { const x = a(), y = b(), z = c(); ok(x === y, "seed deterministik degil"); if (x !== z) diff++; }
  ok(diff > 90, "farkli seedler ayni diziyi verdi");
  a.toString();
});
T("03b ri/rf/pick sinirlari ve gauss ortalamasi", () => {
  const rnd = E.rng.from(77);
  for (let i = 0; i < 500; i++) {
    const v = E.rng.ri(rnd, 5, 9); ok(v >= 5 && v <= 9 && Number.isInteger(v), "ri bozuk " + v);
    const f = E.rng.rf(rnd, 0.8, 1.2); ok(f >= 0.8 && f <= 1.2, "rf bozuk " + f);
  }
  const arr = [1, 2, 3];
  for (let i = 0; i < 200; i++) ok(arr.includes(E.rng.pick(rnd, arr)), "pick havuz disi");
  let sum = 0; const n = 4000;
  for (let i = 0; i < n; i++) sum += E.rng.gauss(rnd);
  ok(Math.abs(sum / n) < 0.06, "gauss ortalamasi kaydi " + (sum / n));
});
T("03c weightedPick agirliklara uygun seciyor", () => {
  const rnd = E.rng.from(2024), n = 20000, c = {};
  const entries = [{ key: "a", w: 0.7 }, { key: "b", w: 0.25 }, { key: "c", w: 0.05 }];
  for (let i = 0; i < n; i++) { const k = E.rng.weightedPick(rnd, entries); c[k] = (c[k] || 0) + 1; }
  near(c.a / n, 0.7, 0.02, "weightedPick a"); near(c.b / n, 0.25, 0.02, "weightedPick b"); near(c.c / n, 0.05, 0.01, "weightedPick c");
});
T("03d hashStr kararli ve dagitici", () => {
  ok(E.rng.hashStr("PAW-ABC123") === E.rng.hashStr("PAW-ABC123"), "hash kararli degil");
  ok(E.rng.hashStr("a") !== E.rng.hashStr("b"), "hash cakisiyor");
  ok(Number.isInteger(E.rng.hashStr("x")), "hash sayi degil");
});

/* ======================= 04 KOPEK / STAT / URETIM ======================= */
T("04a makeDog: iv 0.82-1.18, 9 gen cifti, cinsiyet, enerji, soy", () => {
  const uids = new Set();
  for (let i = 0; i < 400; i++) {
    const b = DB.breeds[i % 100];
    const d = mkDog(b.id, { seed: i * 31 + 5, level: 1 + (i % 30) });
    ok(["m", "f"].includes(d.sex), "cinsiyet bozuk: " + d.sex);
    ok(uids.add(d.uid), "uid tekrari");
    SK.forEach(k => {
      ok(d.ivs[k] >= 0.82 && d.ivs[k] <= 1.18, "iv sinir disi " + d.ivs[k]);
      ok(d.trained[k] === 0, "trained 0 degil");
    });
    ok(Object.keys(d.genes).length === 9, "gen sayisi " + Object.keys(d.genes).length);
    Object.keys(d.genes).forEach(k => {
      ok(d.genes[k].length === 2, "alel cifti bozuk");
      d.genes[k].forEach(a => ok(a === 0 || a === 1, "alel degeri bozuk: " + a));
    });
    ok(d.energy === 100 && d.breedCooldownUntil === 0 && d.inMarket === false, "baslangic alanlari bozuk");
    ok(d.lineage.generation === 0 && d.purebred === true && d.rarity === b.rarity, "soy/rarity bozuk");
    ok(d.look && d.look.key === b.key, "gorunum verisi yok");
  }
});
T("04b dogStats formulu elle hesapla birebir ayni", () => {
  for (let i = 0; i < 12; i++) {
    const d = mkDog(DB.breeds[i * 8].id, { seed: 100 + i, level: 3 + i * 4 });
    d.trained.power = 12; d.trained.speed = 4;
    if (i % 3 === 0) d.mutation = E.mutations.find(m => m.stat === "power");
    const got = S.dogStats(d, NOW), stg = S.stageInfo(d, NOW), b = E.breed(d.breedId);
    SK.forEach(k => {
      let v = b.stats[k] * d.ivs[k] * (1 + (d.level - 1) * BAL.levels.stat_gain_per_level) * stg.stat_mult + (d.trained[k] || 0);
      if (d.mutation && d.mutation.stat === k) v *= d.mutation.mult;
      ok(got[k] === Math.max(1, Math.round(v)), k + ": " + got[k] + " != " + Math.round(v));
    });
  }
});
T("04c battleStats formulleri (HP/ATK/DEF/SPD) dogru", () => {
  const d = mkDog(DB.breeds[2].id, { seed: 9, level: 25 });
  const s = S.dogStats(d, NOW), bs = S.battleStats(d, NOW);
  ok(bs.maxHp === Math.round(70 + s.stamina * 2.1 + s.defense * 0.55 + 25 * 9), "HP formulu");
  ok(bs.atk === Math.round(s.power * 1.25 + s.intelligence * 0.25 + 25 * 2.2), "ATK formulu");
  ok(bs.def === Math.round(s.defense * 1.05 + s.stamina * 0.20 + 25 * 1.35), "DEF formulu");
  ok(bs.spd === Math.round(s.speed * 1.0 + s.agility * 0.45 + 25 * 0.8), "SPD formulu");
  ok(bs.maxHp > 0 && bs.atk > 0 && bs.def > 0 && bs.spd > 0, "savas degeri 0");
});
T("04d seviye ve egitim stati, uretimi, pazara degerini artirir", () => {
  const lo = mkDog(DB.breeds[40].id, { seed: 3, level: 1 });
  const hi = mkDog(DB.breeds[40].id, { seed: 3, level: 40 });
  ok(statSum(S.dogStats(hi, NOW)) > statSum(S.dogStats(lo, NOW)), "seviye stati artirmadi");
  ok(S.productionPerSec(hi, NOW, 1) > S.productionPerSec(lo, NOW, 1), "seviye uretimi artirmadi");
  ok(S.marketValue(hi, NOW) > S.marketValue(lo, NOW), "seviye degeri artirmadi");
  const tr = mkDog(DB.breeds[40].id, { seed: 3, level: 1 });
  SK.forEach(k => tr.trained[k] = 40);
  ok(statSum(S.dogStats(tr, NOW)) > statSum(S.dogStats(lo, NOW)), "egitim stati artirmadi");
  ok(S.marketValue(tr, NOW) > S.marketValue(lo, NOW), "egitim degeri artirmadi");
});
T("04e uretim: rarity carpani, evre carpani, global carpan", () => {
  const com = mkDog(DB.breeds.find(b => b.rarity === "yaygın").id, { seed: 11, level: 10 });
  const myt = mkDog(DB.breeds.find(b => b.rarity === "mitik").id, { seed: 11, level: 10 });
  ok(S.productionPerSec(myt, NOW, 1) > S.productionPerSec(com, NOW, 1) * 5, "rarity uretimi etkilemiyor");
  const pup = mkDog(DB.breeds[10].id, { seed: 12, level: 10 }); age(pup, 1);
  ok(S.productionPerSec(pup, NOW, 1) < S.productionPerSec(age(mkDog(DB.breeds[10].id, { seed: 12, level: 10 }), 60), NOW, 1), "yavru evresi uretimi dusurmuyor");
  near(S.productionPerSec(com, NOW, 2), S.productionPerSec(com, NOW, 1) * 2, 1e-9, "global carpan");
});
T("04f koleksiyon bonusu %0.4/kopek, tavan %35", () => {
  near(S.collectionMult(0), 1, 1e-9, "0 kopek");
  near(S.collectionMult(10), 1.04, 1e-9, "10 kopek");
  near(S.collectionMult(87), 1.348, 1e-3, "87 kopek");
  near(S.collectionMult(200), 1.35, 1e-9, "tavan");
});
T("04g xp / seviye atlama / egitim maliyetleri monoton ve formullere uygun", () => {
  let prev = 0;
  for (let l = 1; l < BAL.levels.max_level; l++) {
    const x = S.xpNeeded(l); ok(x > prev, "xp egrisi monoton degil @" + l); prev = x;
    let expXp = BAL.levels.xp_base * Math.pow(l, BAL.levels.xp_exp);
    if (l > 100 && BAL.levels.post100_xp_mult) expXp *= Math.pow(BAL.levels.post100_xp_mult, l - 100);
    ok(x === Math.round(expXp), "xp formulu @" + l);
  }
  const comB = DB.breeds.find(b => b.rarity === "yaygın");
  const d1 = mkDog(comB.id, { seed: 1, level: 5 }), d2 = mkDog(comB.id, { seed: 1, level: 25 });
  ok(S.levelUpCost(d2) > S.levelUpCost(d1), "seviye maliyeti artmiyor");
  const rare = mkDog(DB.breeds.find(b => b.rarity === "mitik").id, { seed: 1, level: 5 });
  ok(S.levelUpCost(rare) > S.levelUpCost(d1) * 5, "rarity maliyeti etkilemiyor");
  const t = mkDog(DB.breeds[5].id, { seed: 1, level: 1 });
  ok(S.trainCost(t, "power") === BAL.training.base_cost, "ilk egitim maliyeti " + S.trainCost(t, "power"));
  t.trained.power = 8;
  ok(S.trainCost(t, "power") === Math.round(900 * Math.pow(1.35, 2)), "egitim maliyeti kademeli degil");
});
T("04h buyume evreleri yas esiklerine gore dogru", () => {
  const d = mkDog(DB.breeds[6].id, { seed: 4 });
  const cases = [[0, "yavru"], [3.9, "yavru"], [4, "genç"], [15, "genç"], [16, "yetişkin"], [47, "yetişkin"], [48, "usta"], [119, "usta"], [120, "yaşlı"], [500, "yaşlı"]];
  cases.forEach(([h, want]) => { age(d, h); ok(S.stageOf(d, NOW) === want, h + " saat -> " + S.stageOf(d, NOW) + " (beklenen " + want + ")"); });
  age(d, 20);
  ok(S.stageInfo(d, NOW).stat_mult === 1 && S.stageInfo(d, NOW).can_battle === true, "yetiskin evre verisi bozuk");
  age(d, 1);
  ok(S.stageInfo(d, NOW).can_battle === false, "yavru savasabildi");
});
T("04i ozellik (trait) carpanlari: pazar, uretim, savas, egitim, cevrimdisi", () => {
  const base = mkDog(DB.breeds[12].id, { seed: 21, level: 20 }); base.traits = [];
  const withT = mkDog(DB.breeds[12].id, { seed: 21, level: 20 }); withT.traits = ["altin_goz"];
  ok(S.marketValue(withT, NOW) > S.marketValue(base, NOW) * 1.3, "altin_goz pazar degerini artirmadi");
  const s = st(); s.dogs = [base];
  const p1 = EC.totalPerSec(s, NOW);
  const s2 = st(); const prodDog = mkDog(DB.breeds[12].id, { seed: 21, level: 20 }); prodDog.traits = ["ay_tuyu"]; s2.dogs = [prodDog];
  ok(EC.totalPerSec(s2, NOW) > p1 * 1.05, "ay_tuyu uretimi artirmadi");
  ok(E.traits.length === 6 && E.traits.every(t => t.id && t.name && t.desc), "trait verisi eksik");
});

/* ======================= 05 GENETIK ======================= */
T("05a crossAlleles her lokusta ebeveyn alellerinden seciyor", () => {
  const rnd = E.rng.from(31337);
  for (let i = 0; i < 400; i++) {
    const m = [i % 2, (i + 1) % 2], f = [(i + 1) % 2, i % 2];
    const c = G.crossAlleles(m, f, rnd);
    ok(c.length === 2 && m.includes(c[0]) && f.includes(c[1]), "alel gecisi bozuk " + JSON.stringify(c));
  }
});
T("05b compatible: gecersiz ciftler reddediliyor", () => {
  const s = st();
  const m = ready(mkDog(DB.breeds[20].id, { seed: 5, level: 10, sex: "f" }));
  const f = ready(mkDog(DB.breeds[21].id, { seed: 6, level: 10, sex: "m" }));
  ok(G.compatible(m, f, NOW).ok === true, "gecerli cift reddedildi: " + G.compatible(m, f, NOW).problems);
  ok(G.compatible(m, m, NOW).ok === false, "ayni kopek kabul edildi");
  const f2 = ready(mkDog(DB.breeds[22].id, { seed: 7, level: 10, sex: "m" }));
  ok(G.compatible(f, f2, NOW).ok === false, "ayni cinsiyet kabul edildi");
  const pup = ready(mkDog(DB.breeds[23].id, { seed: 8, level: 10, sex: "m" })); age(pup, 1);
  ok(G.compatible(m, pup, NOW).ok === false, "yavru kabul edildi");
  const low = ready(mkDog(DB.breeds[24].id, { seed: 9, level: 2, sex: "m" })); low.level = 2;
  ok(G.compatible(m, low, NOW).ok === false, "seviye alti kabul edildi");
  const tired = ready(mkDog(DB.breeds[25].id, { seed: 10, level: 10, sex: "m" })); tired.energy = 10;
  ok(G.compatible(m, tired, NOW).ok === false, "enerjisi az kopek kabul edildi");
  const cd = ready(mkDog(DB.breeds[26].id, { seed: 11, level: 10, sex: "m" })); cd.breedCooldownUntil = NOW + 60000;
  ok(G.compatible(m, cd, NOW).ok === false, "bekleme surecindeki kopek kabul edildi");
  const inMk = ready(mkDog(DB.breeds[27].id, { seed: 12, level: 10, sex: "m" })); inMk.inMarket = true;
  ok(G.compatible(m, inMk, NOW).ok === false, "pazardaki kopek kabul edildi");
  ok(G.compatible(m, f, NOW).problems.length === 0, "gecerli ciftte sorun listesi dolu");
});
T("05c uretim maliyeti rarity toplamina, bekleme suresi rarity'ye bagli", () => {
  const com = ready(mkDog(DB.breeds.find(b => b.rarity === "yaygın").id, { seed: 30, level: 10, sex: "f" }));
  const com2 = ready(mkDog(DB.breeds.find(b => b.rarity === "yaygın").id, { seed: 31, level: 10, sex: "m" }));
  const myt = ready(mkDog(DB.breeds.find(b => b.rarity === "mitik").id, { seed: 32, level: 10, sex: "m" }));
  ok(G.cost(com, com2) === 4000, "yaygin+yaygin maliyeti " + G.cost(com, com2));
  ok(G.cost(com, myt) === Math.round(4000 * BAL.breeding.cost_by_rarity_sum["7"]), "karma maliyet yanlis");
  ok(G.cost(myt, myt) === Math.round(4000 * 24), "mitik+mitik maliyeti " + G.cost(myt, myt));
  ok(G.cooldownMs("yaygın") === 2 * 60000, "yaygin bekleme " + G.cooldownMs("yaygın"));
  ok(G.cooldownMs("mitik") === 60 * 60000, "mitik bekleme " + G.cooldownMs("mitik"));
  ok(G.cooldownMs("mitik", 0.5) === 30 * 60000, "etkinlik carpani uygulanmadi");
});
T("05d breedPair: yavru irki/alelleri/soyu ebeveynden geliyor", () => {
  for (let i = 0; i < 60; i++) {
    const m = ready(mkDog(DB.breeds[11].id, { seed: 1000 + i, level: 12, sex: "f" }));
    const f = ready(mkDog(DB.breeds[42].id, { seed: 2000 + i, level: 12, sex: "m" }));
    const r = G.breedPair(m, f, { seed: 3000 + i, now: NOW });
    const c = r.dog;
    ok([m.breedId, f.breedId].includes(c.breedId), "yavru irki ebeveyn disi");
    ok(r.report.breedId === c.breedId, "rapor irki tutarsiz");
    Object.keys(c.genes).forEach(k => {
      ok(m.genes[k].includes(c.genes[k][0]), "anne aleli gecmedi: " + k);
      ok(f.genes[k].includes(c.genes[k][1]), "baba aleli gecmedi: " + k);
    });
    SK.forEach(k => ok(c.ivs[k] >= 0.75 && c.ivs[k] <= 1.25, "yavru iv sinir disi " + c.ivs[k]));
    ok(c.lineage.mother === m.uid && c.lineage.father === f.uid, "soy kaydi bozuk");
    ok(c.lineage.generation === 1, "nesil " + c.lineage.generation);
    ok(c.lineage.ancestors.includes(m.uid) && c.lineage.ancestors.includes(f.uid), "ata listesi eksik");
    ok(c.purebred === false && r.report.sameBreed === false, "melez safkan isaretlendi");
    ok(c.bornAt === NOW, "dogum zamani yanlis");
    ok(S.stageOf(c, NOW) === "yavru", "yavru evresi yanlis");
  }
});
T("05e ayni irk cifti safkan yavru verir ve purity bonusu alir", () => {
  const b = DB.breeds[5];
  let pureSum = 0, hybSum = 0, n = 200;
  for (let i = 0; i < n; i++) {
    const m = ready(mkDog(b.id, { seed: 4000 + i, level: 15, sex: "f" }));
    const f = ready(mkDog(b.id, { seed: 5000 + i, level: 15, sex: "m" }));
    const r = G.breedPair(m, f, { seed: 6000 + i, now: NOW });
    ok(r.dog.breedId === b.id && r.dog.purebred === true && r.report.sameBreed === true, "safkan uretim bozuk");
    pureSum += statSum(r.dog.ivs);
    const m2 = ready(mkDog(DB.breeds[6].id, { seed: 4000 + i, level: 15, sex: "f" }));
    const f2 = ready(mkDog(DB.breeds[7].id, { seed: 5000 + i, level: 15, sex: "m" }));
    hybSum += statSum(G.breedPair(m2, f2, { seed: 6000 + i, now: NOW }).dog.ivs);
  }
  ok(pureSum > hybSum, "safkan bonusu melezden dusuk (" + pureSum + " vs " + hybSum + ")");
});
T("05f kardes ciftlesmesi: ortak ata sayisi ve ceza > 0", () => {
  const m = ready(mkDog(DB.breeds[20].id, { seed: 71, level: 15, sex: "f" }));
  const f = ready(mkDog(DB.breeds[21].id, { seed: 72, level: 15, sex: "m" }));
  const s1 = G.breedPair(m, f, { seed: 73, now: NOW }).dog; s1.sex = "f";
  const s2 = G.breedPair(m, f, { seed: 74, now: NOW }).dog; s2.sex = "m";
  age(s1, 60); age(s2, 60); s1.level = s2.level = 12; s1.energy = s2.energy = 100;
  const shared = G.sharedAncestors(s1, s2);
  ok(shared >= 2, "ortak ata " + shared);
  const r = G.breedPair(s1, s2, { seed: 75, now: NOW });
  ok(r.report.sharedAncestors >= 2, "rapor ortak ata " + r.report.sharedAncestors);
  ok(r.report.inbreedPenalty > 0, "akraba cezasi 0");
  near(r.report.inbreedPenalty, Math.min(BAL.breeding.inbreeding_max_penalty, shared * BAL.breeding.inbreeding_penalty_per_shared_ancestor), 1e-9, "ceza formulu");
  ok(r.report.inbreedPenalty <= BAL.breeding.inbreeding_max_penalty, "ceza tavani asildi");
});
T("05g mutasyon: zorlaninca uygulanir, stat mutasyonu dogStats'a yansiyor", () => {
  const m = ready(mkDog(DB.breeds[30].id, { seed: 81, level: 15, sex: "f" }));
  const f = ready(mkDog(DB.breeds[31].id, { seed: 82, level: 15, sex: "m" }));
  const r = G.breedPair(m, f, { seed: 83, now: NOW, forceMutation: true });
  ok(r.dog.mutation && r.dog.mutation.name, "zorlanan mutasyon uygulanmadi");
  ok(r.report.mutation === r.dog.mutation.name, "rapor mutasyonu tutarsiz");
  const mut = r.dog.mutation;
  const plain = mkDog(r.dog.breedId, { seed: 84, level: r.dog.level });
  plain.ivs = JSON.parse(JSON.stringify(r.dog.ivs)); plain.bornAt = r.dog.bornAt;
  if (mut.stat) {
    const a = S.dogStats(plain, NOW)[mut.stat], b2 = S.dogStats(r.dog, NOW)[mut.stat];
    ok(b2 > a, "stat mutasyonu etkisiz (" + a + " -> " + b2 + ")");
  } else {
    ok(mut.allMult > 1, "allMult tanimsiz");
  }
  ok(E.mutations.length >= 5 && E.mutations.every(x => x.id && x.name && x.mult), "mutasyon verisi eksik");
});
T("05h dogal uretimde nadir ozellik/mutasyon istatistiksel olarak gorulur", () => {
  let traits = 0, muts = 0, n = 1500;
  for (let i = 0; i < n; i++) {
    const m = ready(mkDog(DB.breeds[i % 100].id, { seed: 20000 + i, level: 15, sex: "f" }));
    const f = ready(mkDog(DB.breeds[(i + 37) % 100].id, { seed: 40000 + i, level: 15, sex: "m" }));
    const r = G.breedPair(m, f, { seed: 60000 + i, now: NOW });
    if (r.dog.traits.length) traits++;
    if (r.dog.mutation) muts++;
  }
  ok(traits > n * 0.03 && traits < n * 0.35, "nadir ozellik orani mantiksiz: " + traits + "/" + n);
  ok(muts > n * 0.02 && muts < n * 0.20, "mutasyon orani mantiksiz: " + muts + "/" + n);
});
T("05i cift merle cezasi iv'leri dusurur", () => {
  let found = 0;
  for (let i = 0; i < 4000 && found < 3; i++) {
    const m = ready(mkDog(DB.breeds[50].id, { seed: 70000 + i, level: 15, sex: "f" }));
    const f = ready(mkDog(DB.breeds[51].id, { seed: 80000 + i, level: 15, sex: "m" }));
    m.genes.merle = [1, 1]; f.genes.merle = [1, 1];
    const r = G.breedPair(m, f, { seed: 90000 + i, now: NOW });
    if (r.report.doubleMerle) {
      found++;
      ok(r.dog.look.doubleMerle === true, "look isareti yok");
      SK.forEach(k => ok(r.dog.ivs[k] >= 0.75, "cift merle iv tabani " + r.dog.ivs[k]));
    }
  }
  ok(found >= 1, "4000 denemede cift merle uretilemedi");
});

/* ======================= 06 SAVAS ======================= */
T("06a ayni seed -> birebir ayni savas (deterministik)", () => {
  const A = fixedTeam(11, 25, "efsanevi"), Bt = fixedTeam(22, 25, "nadir");
  const r1 = BT.simulate(A, Bt, { seed: 4242, now: NOW });
  const r2 = BT.simulate(A, Bt, { seed: 4242, now: NOW });
  ok(JSON.stringify(r1) === JSON.stringify(r2), "ayni seed farkli sonuc uretti");
});
T("06b farkli seed -> farkli savas akisi", () => {
  const A = fixedTeam(12, 20), Bt = fixedTeam(13, 20);
  const r1 = BT.simulate(A, Bt, { seed: 1, now: NOW });
  const r2 = BT.simulate(A, Bt, { seed: 2, now: NOW });
  ok(JSON.stringify(r1.log) !== JSON.stringify(r2.log), "seed savasi degistirmiyor");
});
T("06c 4v4 yapisi: 8 birim, gecerli kazanan, tur tavani, HP tutarliligi", () => {
  for (let i = 0; i < 40; i++) {
    const A = fixedTeam(100 + i, 15 + (i % 30)), Bt = fixedTeam(500 + i, 15 + ((i + 7) % 30));
    const r = BT.simulate(A, Bt, { seed: 7000 + i, now: NOW });
    ok(["A", "B", "draw"].includes(r.winner), "gecersiz kazanan: " + r.winner);
    ok(r.turns >= 1 && r.turns <= BAL.battle.max_turns, "tur siniri: " + r.turns);
    ok(r.units.length === 8, "birim sayisi " + r.units.length);
    ok(r.units.filter(u => u.side === "A").length === 4 && r.units.filter(u => u.side === "B").length === 4, "taraf dagilimi bozuk");
    r.units.forEach(u => {
      ok(!Number.isNaN(u.hp) && u.hp >= 0 && u.hp <= u.maxHp, "HP bozuk: " + u.hp + "/" + u.maxHp);
      ok(u.uid && u.name && u.image, "birim kimligi eksik");
    });
    r.log.forEach(e => {
      ok(typeof e.turn === "number" && e.t, "log kaydi bozuk");
      if (e.t === "hit") {
        ok(Number.isFinite(e.dmg) && e.dmg >= 0, "hasar bozuk: " + e.dmg);
        ok(e.dmg + (e.absorbed || 0) >= 1, "kalkansiz sifir hasar");
        if (e.dmg === 0) ok(e.absorbed > 0, "emilim olmadan sifir hasar");
      }
    });
    const aAlive = r.units.filter(u => u.side === "A" && u.alive).length;
    const bAlive = r.units.filter(u => u.side === "B" && u.alive).length;
    if (r.winner === "A") ok(aAlive > 0, "kazanan A ama hicbir birimi ayakta degil");
    if (r.winner === "B") ok(bAlive > 0, "kazanan B ama hicbir birimi ayakta degil");
  }
});
T("06d guclu takim zayif takimi belirgin sekilde yener (denge)", () => {
  let win = 0, n = 50;
  for (let i = 0; i < n; i++) {
    const A = fixedTeam(2000 + i, 45, "mitik"), Bt = fixedTeam(3000 + i, 5, "yaygın");
    if (BT.simulate(A, Bt, { seed: 500 + i, now: NOW }).winner === "A") win++;
  }
  ok(win >= n * 0.9, "mitik/45 takim yaygin/5 karsisinda " + win + "/" + n + " kazandi");
});
T("06e savas sirasi hiza bagli, savunma hasari azaltiyor", () => {
  const A = fixedTeam(4001, 20), Bt = fixedTeam(4002, 20);
  const r = BT.simulate(A, Bt, { seed: 8, now: NOW });
  const first = r.log.filter(e => e.t === "hit").slice(0, 8);
  ok(first.length > 0, "hic hasar kaydi yok");
  const u = r.units.map(x => ({ uid: x.uid }));
  ok(u.length === 8, "birim listesi bozuk");
  const p1 = BT.prepare(mkDog(DB.breeds[1].id, { seed: 51, level: 20 }), NOW);
  const p2 = BT.prepare(mkDog(DB.breeds[1].id, { seed: 51, level: 20 }), NOW);
  ok(p1.hp === p1.maxHp && p1.alive === true && p1.cd === 0, "prepare baslangic durumu bozuk");
  ok(p1.atk === p2.atk && p1.maxHp === p2.maxHp, "prepare deterministik degil");
  ok(p1.ability && p1.ability.name_tr, "yetenek hazirlanmadi");
});
T("06f Elo: kazanan artar, kaybeden duser, beraberlik ara deger", () => {
  const K = BAL.battle.elo_k_win;
  ok(BT.elo(1000, 1000, 1, K) === 1000 + Math.round(K * 0.5), "kazanc elo yanlis");
  ok(BT.elo(1000, 1000, 0, BAL.battle.elo_k_loss) < 1000, "kayip elo azaltmadi");
  const draw = BT.elo(1000, 1000, 0.5, K);
  ok(draw === 1000, "esit puanli beraberlik degistirmemeli: " + draw);
  ok(BT.elo(1500, 1000, 1, K) - 1500 < BT.elo(1000, 1500, 1, K) - 1000, "zayifi yenmek daha cok puan vermeli");
  ok(Number.isInteger(BT.elo(1200, 1300, 1, K)), "elo tam sayi degil");
});
T("06g bot takimi rating'e olcekleniyor", () => {
  const rnd = E.rng.from(77), t1 = BT.botTeam(900, rnd, NOW), t2 = BT.botTeam(2400, E.rng.from(78), NOW);
  ok(t1.length === 4 && t2.length === 4, "bot takim boyutu");
  t1.concat(t2).forEach(d => { ok(d.uid && d.breedId && d.level >= 1 && d.level <= 50, "bot kopegi bozuk"); });
  const avg = a => a.reduce((s, d) => s + d.level, 0) / a.length;
  ok(avg(t2) > avg(t1), "rating bot seviyesini artirmiyor (" + avg(t1).toFixed(1) + " vs " + avg(t2).toFixed(1) + ")");
});
T("06h ozellik/yetenek carpanlari savasta etkili", () => {
  const mk = (traitOn) => {
    const t = fixedTeam(9001, 30);
    if (traitOn) t.forEach(d => d.traits = ["celik_pati"]);
    return t;
  };
  const foe = fixedTeam(9002, 30);
  let withT = 0, without = 0;
  for (let i = 0; i < 40; i++) {
    if (BT.simulate(mk(true), foe, { seed: 300 + i, now: NOW }).winner === "A") withT++;
    if (BT.simulate(mk(false), foe, { seed: 300 + i, now: NOW }).winner === "A") without++;
  }
  ok(withT >= without, "celik_pati savasi iyilestirmiyor (" + withT + " vs " + without + ")");
});
T("06i savas odulleri ve arena istatistikleri tutarli", () => {
  ok(BAL.battle.reward_win_points > BAL.battle.reward_draw_points && BAL.battle.reward_draw_points > BAL.battle.reward_loss_points, "odul siralamasi bozuk");
  const s = st();
  s.arena.rating = 1200; s.arena.wins = 3; s.arena.losses = 1;
  s.arena.rating = BT.elo(s.arena.rating, 1150, 1, BAL.battle.elo_k_win);
  E.gain(s, BAL.battle.reward_win_points, "arena");
  s.arena.wins++; s.stats.battlesWon++;
  s.arena.history.push({ t: NOW, won: true, rating: s.arena.rating });
  ok(s.arena.rating > 1200 && s.arena.wins === 4 && s.balance === 30000 + 6500, "odul/istatistik islenmedi");
  ok(E.tierOf(s.arena.rating) === "Gümüş Lig", "lig yanlis: " + E.tierOf(s.arena.rating));
});
T("06j lig esikleri sirali ve kapsamli", () => {
  const tiers = [[0, "Bronz Lig"], [1150, "Gümüş Lig"], [1400, "Altın Lig"], [1700, "Efsanevi Lig"], [2000, "Elmas Lig"], [2400, "Mitik Lig"], [5000, "Mitik Lig"]];
  tiers.forEach(([r, t]) => ok(E.tierOf(r) === t, r + " -> " + E.tierOf(r) + " (beklenen " + t + ")"));
});

/* ======================= 07 EKONOMI / CEVRIMDISI ======================= */
T("07a toplam uretim pozitif ve global carpanla olcekleniyor", () => {
  const s = st();
  const pps = EC.totalPerSec(s, NOW);
  ok(pps > 0, "uretim 0");
  s.boosters.push({ id: "b", type: "production_mult", mult: 2, endsAt: NOW + 3600e3 });
  near(EC.totalPerSec(s, NOW), pps * 2, pps * 0.02, "booster 2x etkisi");
  ok(EC.globalMult(s, NOW) > 2, "globalMult " + EC.globalMult(s, NOW));
});
T("07b pending biriken puani dogru hesapliyor", () => {
  const s = st();
  s.time.lastCollectAt = NOW - 120000;
  near(EC.pending(s, NOW), EC.totalPerSec(s, NOW) * 120, 1e-6, "120 sn birikim");
  s.time.lastCollectAt = NOW;
  near(EC.pending(s, NOW), 0, 1e-9, "sifir birikim");
  s.time.lastCollectAt = NOW + 60000;
  ok(EC.pending(s, NOW) === 0, "gelecek zamanda negatif birikim");
});
T("07c cevrimdisi kazanc 8 saatte sinirlaniyor, %75 verimle", () => {
  const s = st();
  s.time.lastSeenAt = NOW - 20 * 3600e3;
  const pps = EC.totalPerSec(s, NOW);
  const r = EC.offlineGain(s, NOW, NOW, 20 * 3600);
  ok(r.seconds === BAL.economy.offline_cap_hours * 3600, "sure sinirlanmadi: " + r.seconds);
  ok(r.capped === true && r.tampered === false, "isaretler yanlis");
  const eff = BAL.economy.offline_efficiency;
  near(r.gain, pps * 28800 * eff, Math.max(1, pps * 28800 * eff * 0.001), "kazanc formulu");
  ok(r.gain > 0, "kazanc 0");
});
T("07d saat geri alinirsa kazanc 0 ve hile isareti true", () => {
  const s = st();
  s.time.lastSeenAt = NOW;
  const r = EC.offlineGain(s, NOW, NOW - 600000, 0);
  ok(r.gain === 0 && r.tampered === true && r.seconds === 0, "geri alma tespiti calismadi: " + JSON.stringify(r));
});
T("07e saat ileri alinip monotonic delta kucukse kazanc kirpilir", () => {
  const s = st();
  s.time.lastSeenAt = NOW - 5 * 3600e3;
  const r = EC.offlineGain(s, NOW, NOW, 60);
  ok(r.seconds === 60 + BAL.anti_cheat.max_forward_jump_seconds, "kirpma yanlis: " + r.seconds);
  ok(r.tampered === true, "hile isareti yok");
  const honest = EC.offlineGain(s, NOW, NOW, 5 * 3600);
  ok(honest.tampered === false && honest.seconds === 18000, "durust sure hile sayildi");
});
T("07f offline_min_seconds altindaki cikis kazanc vermez", () => {
  const s = st();
  s.time.lastSeenAt = NOW - 60000;
  const r = EC.offlineGain(s, NOW, NOW, 60);
  ok(r.seconds === 60 && r.gain === 0 && r.tampered === false, "kisa cikis kazanci " + r.gain);
  s.time.lastSeenAt = NOW - 130000;
  ok(EC.offlineGain(s, NOW, NOW, 130).gain > 0, "esik ustu kazanc vermedi");
});
T("07g cevrimdisi kazanc trait ile artiyor (avci_buru +%10)", () => {
  const s1 = st();
  const s2 = JSON.parse(JSON.stringify(s1));     // ayni kopekler, sadece trait farkli
  s2.dogs.forEach(d => d.traits = ["avci_buru"]);
  [s1, s2].forEach(s => s.time.lastSeenAt = NOW - 4 * 3600e3);
  const g1 = EC.offlineGain(s1, NOW, NOW, 4 * 3600).gain;
  const g2 = EC.offlineGain(s2, NOW, NOW, 4 * 3600).gain;
  ok(g2 > g1 * 1.05, "avci_buru cevrimdisi kazanci artirmadi (" + g1.toFixed(0) + " -> " + g2.toFixed(0) + ")");
});
T("07h gain/spend: bakiye, omur boyu puan, islem gunlugu", () => {
  const s = st();
  const b0 = s.balance;
  ok(E.gain(s, 1234.7, "test") === 1234, "gain yuvarlamadi");
  ok(s.balance === b0 + 1234 && s.lifetimePoints === 1234 && s.stats.pointsEarned === 1234, "gain alanlari islenmedi");
  ok(s.log[0].type === "gain" && s.log[0].amount === 1234 && s.log[0].reason === "test", "islem gunlugu kaydi yok");
  ok(E.spend(s, 1e9, "imkansiz") === false && s.balance === b0 + 1234, "yetersiz bakiye harcanabildi");
  ok(E.spend(s, 1000, "kasa") === true && s.balance === b0 + 234, "spend bakiye dusurmedi");
  ok(s.log[0].type === "spend", "harcama loglanmadi");
  ok(E.gain(s, 0, "bos") === 0, "0 kazanc islendi");
});

/* ======================= 08 PAZAR ======================= */
T("08a komisyon %5, etkinlikte dusuyor", () => {
  ok(MK.fee(100000) === 5000, "komisyon " + MK.fee(100000));
  ok(MK.fee(0) === 0 && MK.fee(19) === 1, "yuvarlama bozuk");
  const evs = [{ effect: { market_fee: 0.02 } }];
  ok(MK.fee(100000, evs) === 2000, "etkinlik komisyonu uygulanmadi");
  ok(BAL.market.fee === 0.05 && BAL.market.min_price === 1000 && BAL.market.max_price === 50000000, "pazar sabitleri degismis");
  ok(BAL.market.max_active_listings === 6 && BAL.market.local_demo_sellers === 14, "pazar limitleri degismis");
});
T("08b bot ilanlari: 14 kayit, deterministik, gecerli alanlar", () => {
  const proj = l => ({ id: l.id, seller: l.seller, code: l.sellerCode, price: l.price, value: l.value,
    createdAt: l.createdAt, breedId: l.dog.breedId, level: l.dog.level, rarity: l.dog.rarity, ivs: l.dog.ivs });
  const a = MK.botListings(1234, NOW), b2 = MK.botListings(1234, NOW), c = MK.botListings(9999, NOW);
  ok(a.length === 14, "ilan sayisi " + a.length);
  ok(JSON.stringify(a.map(proj)) === JSON.stringify(b2.map(proj)), "ayni seed farkli ilan uretti");
  ok(JSON.stringify(a.map(proj)) !== JSON.stringify(c.map(proj)), "farkli seed ayni ilanlari uretti");
  const ids = new Set();
  a.forEach(l => {
    ok(ids.add(l.id), "ilan id tekrari");
    ok(l.price > 0 && l.value > 0, "fiyat/deger 0");
    ok(l.dog && l.dog.uid && E.breed(l.dog.breedId), "ilan kopegi bozuk");
    ok(l.seller && l.sellerCode && l.bot === true, "satici bilgisi eksik");
    ok(l.createdAt <= NOW && NOW - l.createdAt <= 72 * 3600e3, "ilan yasi sinir disi");
    ok(l.price >= BAL.market.min_price, "ilan fiyati taban altinda");
  });
});
T("08c bot satin alma olasiligi fiyat/deger oranina gore azaliyor", () => {
  const rows = [[0.5, 0.55], [0.9, 0.55], [1.0, 0.30], [1.05, 0.30], [1.2, 0.14], [1.25, 0.14], [1.5, 0.05], [1.6, 0.05], [3.0, 0.015]];
  let prev = 1;
  rows.forEach(([ratio, want]) => {
    const got = MK.botBuyChancePerHour({ price: 1000 * ratio, value: 1000 }, NOW);
    ok(got === want, "oran " + ratio + " -> " + got + " (beklenen " + want + ")");
    ok(got <= prev, "olasilik monoton azalmiyor"); prev = got;
  });
});
T("08d pazar degeri formulu birebir dogru", () => {
  function mv(d) {
    const b = E.breed(d.breedId), r = E.rar(d.rarity);
    let tr = 0; Object.keys(d.trained).forEach(k => tr += d.trained[k]);
    let tm = 1;
    if (d.traits && d.traits.length) tm = 1.35;
    if (d.mutation) tm = 1.75;
    if (d.purebred && d.lineage && d.lineage.generation >= 2) tm = Math.max(tm, 2.2);
    const gm = 1 + Math.min(0.5, (d.lineage ? d.lineage.generation : 0) * 0.06);
    return Math.round(b.marketBasePrice * r.price_mult * (1 + d.level * 0.045) * (1 + tr * 0.01) * tm * gm);
  }
  for (let i = 0; i < 20; i++) {
    const d = mkDog(DB.breeds[i * 5].id, { seed: 300 + i, level: 1 + i * 2 });
    if (i % 4 === 1) d.traits = ["altin_goz"];
    if (i % 4 === 2) d.mutation = E.mutations[0];
    if (i % 4 === 3) { d.purebred = true; d.lineage.generation = 3; }
    SK.forEach(k => d.trained[k] = i);
    ok(S.marketValue(d, NOW) === mv(d), "deger uyusmuyor " + d.breedId + ": " + S.marketValue(d, NOW) + " != " + mv(d));
  }
});
T("08e rarity pazar degerini carpan kadar artiriyor", () => {
  const b = DB.breeds.find(x => x.rarity === "yaygın");
  const base = mkDog(b.id, { seed: 60, level: 10 });
  const v = S.marketValue(base, NOW);
  Object.keys(DB.rarities).forEach(k => {
    const d = mkDog(b.id, { seed: 60, level: 10 }); d.rarity = k;
    near(S.marketValue(d, NOW) / v, DB.rarities[k].price_mult, 0.01, k + " fiyat carpani");
  });
});
T("08f satis/net gelir hesabi: alici fiyati oduyor, satici komisyon dusulmus aliyor", () => {
  const s = st();
  const price = 250000, fee = MK.fee(price);
  s.balance = price;
  const listing = { id: "L1", price: price, seller: "BOT-1", bot: true };
  ok(E.spend(s, listing.price, "pazar alim") === true, "alim basarisiz");
  const net = listing.price - fee;
  ok(s.balance === 0 && net === 237500 && fee === 12500, "komisyon hesabi yanlis");
  s.market.history.push({ t: NOW, type: "buy", price: price, fee: fee });
  s.stats.marketBuys++;
  ok(s.market.history.length === 1 && s.stats.marketBuys === 1, "pazar gecmisi islenmedi");
  const before = s.balance;
  E.gain(s, net, "pazar satis");
  s.stats.marketSales++;
  ok(s.balance === before + net, "satis geliri eklenmedi");
});

/* ======================= 09 GOREV / BASARIM / ETKINLIK ======================= */
T("09a gunluk gorevler: 4 adet, benzersiz tipler, deterministik", () => {
  const a = QS.rollDaily(1234, NOW), b2 = QS.rollDaily(1234, NOW), c = QS.rollDaily(4321, NOW);
  ok(a.list.length === BAL.daily.quests_per_day, "gorev sayisi " + a.list.length);
  ok(a.date === E.dayKey(NOW), "gorev tarihi yanlis");
  ok(new Set(a.list.map(q => q.type)).size === a.list.length, "gorev tipleri tekrarli");
  ok(JSON.stringify(a) === JSON.stringify(b2), "ayni seed farkli gorev uretti");
  ok(JSON.stringify(a) !== JSON.stringify(c), "farkli seed ayni gorevleri uretti");
  a.list.forEach(q => {
    ok(q.id && q.text && q.target > 0 && q.points > 0 && q.xp >= 0, "gorev alani eksik: " + JSON.stringify(q));
    ok(q.progress === 0 && q.done === false && q.claimed === false, "gorev baslangic durumu bozuk");
    ok(DB.quests.pool.some(p => p.id === q.id), "gorev havuzda yok: " + q.id);
  });
});
T("09b gorev ilerlemesi: artis, tavan, tamamlanma, rarity filtresi", () => {
  const s = st();
  s.quests = QS.rollDaily(55, NOW);
  const q = s.quests.list[0];
  QS.progress(s, q.type, 1, "mitik");
  ok(q.progress === 1, "ilerleme islenmedi: " + q.progress);
  QS.progress(s, q.type, 999, "mitik");
  ok(q.progress === q.target && q.done === true, "tavan/tamamlanma bozuk: " + q.progress + "/" + q.target);
  QS.progress(s, "olmayan_tip", 5, "mitik");
  const before = q.progress;
  QS.progress(s, q.type, 1, "mitik");
  ok(q.progress === before, "tamamlanmis gorev ilerledi");
  q.claimed = true; q.done = false; q.progress = 0;
  QS.progress(s, q.type, 1, "mitik");
  ok(q.progress === 0, "alindi isaretli gorev ilerledi");
});
T("09c basarimlar: esik, tek seferlik acilis, odul alanlari", () => {
  ok(DB.achievements.length >= 20, "basarim sayisi " + DB.achievements.length);
  DB.achievements.forEach(a => ok(a.id && a.name_tr && a.metric && a.target > 0 && a.reward_points > 0, "basarim alani eksik: " + a.id));
  const empty = SV.defaultState("Bos");
  ok(AC.check(empty).length === 0, "bomboş durumda basarim acildi");
  const s = st();
  const firstBatch = AC.check(s);
  ok(firstBatch.length > 0 && firstBatch.every(a => a.metric === "dogs_owned"),
    "2 kopekle sadece kopek sayisi basarimi acilmali: " + firstBatch.map(a => a.id));
  ok(AC.metric(s, "dogs_owned") === 2, "dogs_owned metrigi " + AC.metric(s, "dogs_owned"));
  ok(AC.check(s).length === 0, "ayni basarim ikinci kez acildi");
  s.stats.cratesOpened = 50; s.stats.battlesWon = 50; s.stats.puppiesBred = 50;
  s.stats.pointsEarned = 5e6; s.arena.rating = 2500; s.login.streak = 30;
  const un1 = AC.check(s);
  ok(un1.length > 0, "hic basarim acilmadi");
  un1.forEach(a => ok(DB.achievements.some(x => x.id === a.id), "bilinmeyen basarim " + a.id));
  ok(Object.keys(s.achievements.unlocked).length === firstBatch.length + un1.length, "acilis kaydi eksik");
  ok(firstBatch.concat(un1).every((a, i, arr) => arr.findIndex(x => x.id === a.id) === i), "ayni basarim iki kez acildi");
  ok(AC.check(s).length === 0, "ayni basarimlar tekrar acildi");
  const metrics = new Set(DB.achievements.map(a => a.metric));
  metrics.forEach(m => ok(typeof AC.metric(s, m) === "number", "metrik sayi degil: " + m));
});
T("09d etkinlik takvimi: hafta sonu / hafta ici / gece", () => {
  const sat = Date.parse("2026-03-14T12:00:00Z");   // Cumartesi
  const wed = Date.parse("2026-03-11T12:00:00Z");   // Carsamba
  const evSat = EV.active(sat).map(e => e.id), evWed = EV.active(wed).map(e => e.id);
  ok(evSat.includes("ev_golden_weekend"), "cumartesi etkinligi yok: " + evSat);
  ok(!evWed.includes("ev_golden_weekend"), "carsamba hafta sonu etkinligi aktif");
  EV.active(sat).forEach(e => ok(DB.events.some(x => x.id === e.id) && e.effect, "etkinlik verisi bozuk"));
  ok(EV.active(sat).length !== EV.active(wed).length || evSat.join() !== evWed.join(), "etkinlik takvimi degismiyor");
  ok(DB.events.length >= 4 && DB.events.every(e => e.name_tr && e.desc_tr && e.effect), "etkinlik icerigi eksik");
});
T("09e hafta sonu etkinligi uretimi 2 katina cikariyor", () => {
  const sat = Date.parse("2026-03-14T12:00:00Z");
  const s = st();
  s.time.lastSeenAt = sat - 3600e3;
  const weekDay = EC.totalPerSec(s, NOW), weekEnd = EC.totalPerSec(s, sat);
  ok(weekEnd > weekDay * 1.9, "hafta sonu uretim carpani yok (" + weekDay.toFixed(2) + " -> " + weekEnd.toFixed(2) + ")");
  ok(MK.fee(100000, EV.active(sat)) === 2000, "hafta sonu komisyonu uygulanmadi");
});
T("09f esya verisi tam ve ikonlar mevcut", () => {
  ok(DB.items.length >= 15, "esya sayisi " + DB.items.length);
  DB.items.forEach(it => {
    ok(it.id && it.name_tr && it.desc_tr && it.kind && it.value > 0, "esya alani eksik: " + it.id);
    ok(["key", "consumable", "booster", "cosmetic", "material", "collectible", "equipment"].includes(it.kind), "esya turu gecersiz: " + it.kind + " (" + it.id + ")");
    ok(fs.existsSync(path.join(ROOT, it.icon)), "esya ikonu yok: " + it.icon);
    ok(DB.itemsById[it.id] === it, "itemsById indeksi bozuk");
  });
  DB.crates.forEach(c => c.item_pool.forEach(i => ok(DB.itemsById[i], "kasa havuzunda tanimsiz esya " + i)));
  BAL.daily.login_rewards.forEach(r => {
    if (r.type === "item") ok(DB.itemsById[r.item], "gunluk odul esyasi tanimsiz " + r.item);
    if (r.type === "crate") ok(E.crate(r.crate), "gunluk odul kasasi tanimsiz " + r.crate);
  });
});
T("09g gunluk giris odulleri 7 gunluk dongude tanimli", () => {
  ok(BAL.daily.login_rewards.length === BAL.daily.login_reward_cycle, "odul dongusu " + BAL.daily.login_rewards.length + " != " + BAL.daily.login_reward_cycle);
  BAL.daily.login_rewards.forEach((r, i) => {
    ok(r.day === i + 1 && r.label && ["points", "item", "crate"].includes(r.type), "odul " + i + " bozuk");
    if (r.type === "points") ok(r.amount > 0, "puan odulu 0");
  });
  ok(BAL.daily.quest_reroll_cost > 0, "gorev yenileme maliyeti yok");
});

/* ======================= 10 KAYIT / PROFIL ======================= */
T("10a defaultState: baslangic puani, bolgeler, oyuncu kodu, ayarlar", () => {
  const s = SV.defaultState("Deneme");
  ok(s.balance === BAL.economy.start_balance, "baslangic puani " + s.balance);
  ok(s.dogs.length === 0, "defaultState kopek iceriyor");
  ok(/^PAW-[A-Z0-9]{6}$/.test(s.profile.code), "oyuncu kodu bozuk: " + s.profile.code);
  ok(s.profile.name === "Deneme" && s.profile.title && s.profile.avatarBreed, "profil alanlari eksik");
  ok(s.arena.rating === BAL.battle.elo_start && s.arena.tier === "Bronz", "arena baslangici yanlis");
  ["profile", "dogs", "inventory", "boosters", "arena", "market", "friends", "achievements", "login", "stats", "settings", "time", "notifications", "log", "online"].forEach(k =>
    ok(k in s, "eksik bolge " + k));
  ok(s.settings.lang === "tr" && s.settings.quality === "high" && s.settings.music === true, "varsayilan ayarlar yanlis");
  ok(s.online.mode === "local", "varsayilan mod local degil");
  ok(s.v === 7, "kayit surumu " + s.v);
  ok(s.inventory.food_s === 3 && s.inventory.xp_potion_s === 2, "baslangic envanteri yanlis");
});
T("10b starterDogs: 2 kopek, karsi cinsiyet, irk kaydi", () => {
  const s = SV.defaultState("Baslangic");
  SV.starterDogs(s);
  ok(s.dogs.length === BAL.economy.start_dogs, "kopek sayisi " + s.dogs.length);
  ok(s.dogs[0].sex !== s.dogs[1].sex, "baslangic kopekleri ayni cinsiyette");
  s.dogs.forEach(d => {
    ok(["yaygın", "seçkin"].includes(d.rarity), "baslangic kopegi cok nadir: " + d.rarity);
    ok(d.level >= 1 && d.level <= 5, "baslangic seviyesi " + d.level);
    ok(S.stageOf(d, Date.now()) !== "yavru", "baslangic kopegi yavru");
  });
  ok(s.stats.breedsDiscovered.length >= 1 && s.stats.breedsDiscovered.length <= 2, "kesif kaydi yanlis");
  const s2 = SV.defaultState("Baslangic"); s2.profile.id = s.profile.id;
  SV.starterDogs(s2);
  ok(s2.dogs[0].breedId === s.dogs[0].breedId, "ayni profil icin baslangic deterministik degil");
});
T("10c export/import turu birebir korur, bozuk kod reddedilir", () => {
  const s = st();
  s.balance = 987654; s.dogs[0].name = "Karabaş"; s.dogs[0].level = 33;
  s.arena.history.push({ t: NOW, won: true, rating: 1100 });
  s.stats.cratesOpened = 12;
  const code = SV.export(s);
  ok(typeof code === "string" && code.length > 100, "kayit kodu olusmadi");
  ok(/^[A-Za-z0-9+/=]+$/.test(code), "kayit kodu base64 degil");
  const back = SV.import(code);
  ok(back && back.balance === 987654, "bakiye korunmadi");
  ok(back.dogs[0].name === "Karabaş" && back.dogs[0].level === 33, "kopek verisi korunmadi");
  ok(back.arena.history.length === 1 && back.stats.cratesOpened === 12, "gecmis/istatistik korunmadi");
  ok(JSON.stringify(back) === JSON.stringify(s), "kayit turu birebir degil");
  ok(SV.import("!!!bozuk!!!") === null, "bozuk kod kabul edildi");
  ok(SV.import("") === null, "bos kod kabul edildi");
});
T("10d migrate eski kaydi v7'ye tamamlar, veriyi korur", () => {
  const old = { v: 5, balance: 4242, profile: { name: "Eski Oyuncu" }, dogs: [], stats: { cratesOpened: 3 } };
  const m = SV.migrate(JSON.parse(JSON.stringify(old)));
  ok(m.v === 7, "surum guncellenmedi: " + m.v);
  ok(m.balance === 4242 && m.profile.name === "Eski Oyuncu" && m.stats.cratesOpened === 3, "veri kayboldu");
  ["arena", "market", "friends", "settings", "time", "login", "achievements", "notifications", "log", "online"].forEach(k =>
    ok(m[k] !== undefined, "eksik bolge eklenmedi: " + k));
  ok(m.arena.rating === 1000 && m.settings.lang === "tr", "varsayilanlar doldurulmadi");
  ok(SV.migrate(null) === null, "bos kayit migrate edildi");
});
T("10e bildirim ve islem gunlugu sinirlari", () => {
  const s = st();
  for (let i = 0; i < 90; i++) E.notify(s, "bildirim " + i, i % 3 === 0 ? "ok" : "info");
  ok(s.notifications.length === 60, "bildirim tavani " + s.notifications.length);
  ok(s.notifications[0].text === "bildirim 89", "bildirim sirasi yanlis");
  ok(s.notifications.every(n => n.id && n.ts && n.kind && n.read === false), "bildirim alani eksik");
  for (let i = 0; i < 260; i++) E.txLog(s, { type: "gain", amount: i });
  ok(s.log.length === 200, "gunluk tavani " + s.log.length);
  ok(s.log[0].amount === 259 && s.log[0].ts > 0, "gunluk sirasi/damgasi bozuk");
});
T("10f dayKey gun sinirlarini dogru ayiriyor", () => {
  const k1 = E.dayKey(NOW);
  ok(/^\d{4}-\d{2}-\d{2}$/.test(k1), "gun anahtari bicimi " + k1);
  ok(E.dayKey(NOW + 86400e3) !== k1, "ertesi gun ayni anahtar");
  ok(E.dayKey(NOW + 2 * 86400e3) !== E.dayKey(NOW + 86400e3), "2 gun sonra ayni anahtar");
  ok(E.dayKey(NOW) === E.dayKey(NOW + 3600e3), "ayni gun farkli anahtar");
});
T("10g makeCode ayni id icin kararli, farkli id icin benzersiz", () => {
  ok(SV.makeCode("P123") === SV.makeCode("P123"), "kod kararli degil");
  ok(/^PAW-[A-Z0-9]{6}$/.test(SV.makeCode("P999")), "kod bicimi bozuk");
  const seen = new Set();
  for (let i = 0; i < 3000; i++) seen.add(SV.makeCode("P" + i));
  ok(seen.size > 2900, "kod cakismasi yuksek: " + seen.size + "/3000");
});

/* ======================= 11 DOSYA/ARAYUZ SOZLESMESI ======================= */
T("11a zorunlu dosyalar ve index.html referanslari mevcut", () => {
  ["index.html", "manifest.webmanifest", "src/css/style.css", "src/js/core/data_bundle.js",
   "src/js/core/engine.js", "src/js/ui/ui.js", "src/js/app.js", "src/js/net.js",
   "scenes/screens_core.js", "scenes/screens_play.js", "server/index.js", "README.md"].forEach(f =>
    ok(fs.existsSync(path.join(ROOT, f)), "eksik dosya: " + f));
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]).filter(r => !/^https?:/.test(r));
  ok(refs.length >= 8, "index.html referans sayisi " + refs.length);
  refs.forEach(r => ok(fs.existsSync(path.join(ROOT, r)), "index.html kirik referans: " + r));
});
T("11b 18 ekran kayitli ve index.html dogru sirada yukluyor", () => {
  const src = ["scenes/screens_core.js", "scenes/screens_play.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  const names = [...src.matchAll(/registerScreen\("([a-zA-Z_]+)"/g)].map(m => m[1]);
  ok(new Set(names).size === names.length, "ayni ekran iki kez kayitli");
  ok(names.length === 23, "ekran sayisi " + names.length + ": " + names.join(","));
  ["hub", "collection", "dogDetail", "crates", "breed", "arena", "market", "friends", "quests",
   "achievements", "events", "leaderboard", "login", "profile", "inventory", "settings", "notifications", "help", "wolf", "agility", "shop", "invite", "table"].forEach(n =>
    ok(names.includes(n), "eksik ekran: " + n));
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const idx = f => order.findIndex(x => x.includes(f));
  ok(idx("data_bundle") < idx("engine.js"), "data_bundle engine'den sonra yukleniyor");
  ok(idx("engine.js") < idx("ui.js"), "engine ui'dan sonra yukleniyor");
  ok(idx("ui.js") < idx("screens_core"), "ui ekranlardan sonra yukleniyor");
  ok(idx("screens_play") < idx("app.js"), "app.js ekranlardan once yukleniyor");
  ok(idx("app.js") < idx("net.js") || idx("net.js") < idx("app.js"), "script sirasi okunamadi");
});
T("11c arayuzde kullanilan tum ses dosyalari mevcut", () => {
  const files = new Set(fs.readdirSync(path.join(ROOT, "assets/sounds")).map(f => f.replace(/\.wav$/, "")));
  const src = ["src/js/ui/ui.js", "src/js/app.js", "scenes/screens_core.js", "scenes/screens_play.js"]
    .map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
  const used = new Set([...src.matchAll(/(?:sfx|music|barkFor)\("([a-z_0-9]+)"/g)].map(m => m[1]));
  ok(used.size >= 8, "kullanilan ses sayisi " + used.size);
  used.forEach(n => ok(files.has(n), "kodda kullanilan ses dosyasi yok: " + n + ".wav"));
  ["music_menu", "music_farm", "music_battle"].forEach(m => ok(files.has(m), "muzik eksik: " + m));
  ["bark_small", "bark_medium", "bark_large", "crate_open", "crate_shake", "reward_chime", "battle_win", "battle_lose", "ui_click", "level_up", "coin"]
    .forEach(m => ok(files.has(m), "zorunlu ses eksik: " + m));
});
T("11d CSS 6 rarity icin stil ve mobil uyum iceriyor", () => {
  const css = fs.readFileSync(path.join(ROOT, "src/css/style.css"), "utf8");
  ok(css.includes("@media"), "mobil medya sorgusu yok");
  ok(/\.dogCard/.test(css) && /\.rar-mitik/.test(css) && /\.rar-efsanevi/.test(css), "rarity kart stilleri eksik");
  ["#screenHost", ".navBtn", ".btn", ".modal", ".toast", "#topBar", "#bottomNav", ".dogCard", ".screen"].forEach(sel =>
    ok(css.includes(sel), "css sinifi eksik: " + sel));
  ok(css.includes("@keyframes"), "animasyon yok");
});
T("11e sunucu uclari istemcideki net.js ile eslesiyor", () => {
  const net = fs.readFileSync(path.join(ROOT, "src/js/net.js"), "utf8");
  const srv = fs.readFileSync(path.join(ROOT, "server/index.js"), "utf8");
  const eps = ["/api/ping", "/api/auth/login", "/api/me", "/api/sync", "/api/leaderboard",
    "/api/market/listings", "/api/market/list", "/api/market/buy", "/api/friends/request", "/api/friends/accept", "/api/verify/earnings"];
  eps.forEach(e => {
    ok(srv.includes('"' + e + '"') || srv.includes("'" + e + "'") || srv.includes(e), "sunucuda uc yok: " + e);
    ok(net.includes(e) || net.includes(e.replace("/api/", "")), "istemcide uc yok: " + e);
  });
});

/* ======================= RAPOR ======================= */
const total = pass + fail;
const md = [
  "# PAW LEGENDS: DOG WORLD — Otomatik Test Sonuclari (Motor)",
  "",
  "- Tarih: " + new Date().toISOString(),
  "- Ortam: node " + process.version + " / " + process.platform,
  "- Komut: `node tests/run_tests.js`",
  "- Kapsam: veri butunlugu (100 irk, 6 rarity, 5 kasa), kasa olasilik dagilimlari,",
  "  RNG determinizmi, stat/uretim/deger formulleri, genetik kalitim ve akraba cezasi,",
  "  4v4 savas determinizmi ve denge, cevrimdisi kazanc + saat hilesi korumasi,",
  "  pazar komisyonu/bot ilanlari, gorev/basarim/etkinlik, kayit sistemi, dosya sozlesmeleri.",
  "",
  "## Ozet",
  "",
  "| Toplam | Gecen | Kalan |",
  "|---:|---:|---:|",
  "| " + total + " | " + pass + " | " + fail + " |",
  "",
  "**Durum: " + (fail === 0 ? "TUM TESTLER GECTI" : fail + " TEST KALDI") + "**",
  "",
  "## Detay",
  "",
  "```",
  lines.join("\n"),
  "```",
  ""
].join("\n");
fs.writeFileSync(path.join(__dirname, "RESULTS.md"), md, "utf8");
console.log(lines.join("\n"));
console.log("\n=== " + pass + "/" + total + " motor testi gecti" + (fail ? " — " + fail + " KALDI" : " — TUMU BASARILI") + " ===");
process.exit(fail ? 1 : 0);
