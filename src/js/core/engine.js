/* =============================================================================
   PAW LEGENDS: DOG WORLD — cekirdek oyun motoru (tarayici + Node testleri ortak)
   Bagimlilik yok. Klasik script olarak yuklenir; window.PL uzerine kurulur.
   Ayni dosya Node tarafinda tests/run_tests.js ve server/index.js icinde
   window taklidi ile calistirilir (mantik tek kaynaktan gelir).
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var E = PL.engine = {};

  /* ---------------------------------------------------------------- RNG --- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rngFrom(seed) { return mulberry32(typeof seed === "string" ? hashStr(seed) : (seed | 0)); }
  function ri(rnd, lo, hi) { return lo + Math.floor(rnd() * (hi - lo + 1)); }
  function rf(rnd, lo, hi) { return lo + rnd() * (hi - lo); }
  function pick(rnd, arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function gauss(rnd) { // Box-Muller
    var u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function shuffle(rnd, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function weightedPick(rnd, entries) { // [{key, w}]
    var tot = 0, i;
    for (i = 0; i < entries.length; i++) tot += entries[i].w;
    var r = rnd() * tot;
    for (i = 0; i < entries.length; i++) { r -= entries[i].w; if (r <= 0) return entries[i].key; }
    return entries[entries.length - 1].key;
  }
  E.rng = { mulberry32: mulberry32, hashStr: hashStr, from: rngFrom, ri: ri, rf: rf, pick: pick, gauss: gauss, shuffle: shuffle, weightedPick: weightedPick };

  /* ------------------------------------------------------------- FORMAT --- */
  var F = E.fmt = {};
  F.num = function (n) {
    n = Math.floor(n);
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  F.compact = function (n) {
    if (n >= 1e12) return (n / 1e12).toFixed(2).replace(".", ",") + " T";
    if (n >= 1e9) return (n / 1e9).toFixed(2).replace(".", ",") + " Mr";
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(".", ",") + " Mn";
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(".", ",") + " B";
    return F.num(n);
  };
  F.time = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + "s " + m + "dk";
    if (m > 0) return m + "dk " + s + "sn";
    return s + "sn";
  };
  F.clock = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return (h > 0 ? p(h) + ":" : "") + p(m) + ":" + p(s);
  };
  F.date = function (ts) {
    var d = new Date(ts);
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  };
  F.pct = function (x) { return "%" + Math.round(x * 100); };

  /* --------------------------------------------------------------- DATA --- */
  // data_bundle.js tarafindan doldurulur (PL.DB = {breeds, rarities, crates, balance, items, quests, achievements, events})
  E.breed = function (id) { return PL.DB.breedsById[id]; };
  E.breedByKey = function (k) { return PL.DB.breedsByKey[k]; };
  E.rar = function (key) { return PL.DB.rarities[key]; };
  E.rarOrder = function (key) { return PL.DB.rarities[key].order; };
  E.item = function (id) { return PL.DB.itemsById[id]; };
  E.crate = function (id) {
    for (var i = 0; i < PL.DB.crates.length; i++) if (PL.DB.crates[i].id === id) return PL.DB.crates[i];
    return null;
  };
  E.bal = function () { return PL.DB.balance; };

  /* -------------------------------------------------------------- STATS --- */
  var S = E.stats = {};
  S.STAT_KEYS = ["power", "speed", "stamina", "intelligence", "agility", "defense"];
  S.lvlFactor = function (level) {
    var b = E.bal().economy;
    return (0.60 + level * 0.085) / (0.60 + 1 * 0.085);
  };
  S.stageOf = function (dog, now) {
    var stages = E.bal().breeding.growth_stages;
    var hours = (now - dog.bornAt) / 3600000;
    var cur = "yavru";
    var order = ["yavru", "genç", "yetişkin", "usta", "yaşlı"];
    for (var i = 0; i < order.length; i++) {
      if (hours >= stages[order[i]].min_hours) cur = order[i];
    }
    return cur;
  };
  S.stageInfo = function (dog, now) {
    return E.bal().breeding.growth_stages[S.stageOf(dog, now)];
  };
  S.dogStats = function (dog, now) {
    var b = E.breed(dog.breedId);
    var st = S.stageInfo(dog, now || Date.now());
    var out = {};
    for (var i = 0; i < S.STAT_KEYS.length; i++) {
      var k = S.STAT_KEYS[i];
      var v = b.stats[k] * (dog.ivs[k] || 1) * (1 + (dog.level - 1) * E.bal().levels.stat_gain_per_level);
      v *= st.stat_mult;
      v += (dog.trained && dog.trained[k]) || 0;
      if (dog.mutation && dog.mutation.stat === k) v *= dog.mutation.mult;
      var gb = S.gearBuff(dog, k);
      if (gb) v *= (1 + gb);
      out[k] = Math.max(1, Math.round(v));
    }
    return out;
  };
  S.battleStats = function (dog, now) {
    var st = S.dogStats(dog, now);
    var B = E.bal().battle;
    return {
      maxHp: Math.round(70 + st.stamina * 2.1 + st.defense * 0.55 + dog.level * 9),
      atk: Math.round(st.power * 1.25 + st.intelligence * 0.25 + dog.level * 2.2),
      def: Math.round(st.defense * 1.05 + st.stamina * 0.20 + dog.level * 1.35),
      spd: Math.round(st.speed * 1.0 + st.agility * 0.45 + dog.level * 0.8),
      stats: st
    };
  };
  S.xpNeeded = function (level) {
    var L = E.bal().levels;
    var v = L.xp_base * Math.pow(level, L.xp_exp);
    if (level > 100 && L.post100_xp_mult) v *= Math.pow(L.post100_xp_mult, level - 100);
    return Math.round(v);
  };
  S.levelUpCost = function (dog) {
    var L = E.bal().levels;
    var rar = E.rar(dog.rarity);
    var v = L.cost_base * Math.pow(dog.level, L.cost_exp) * rar.price_mult * 0.55;
    if (dog.level > 100 && L.post100_cost_mult) v *= Math.pow(L.post100_cost_mult, dog.level - 100);
    return Math.round(v);
  };
  /* Ekipman (donanim) bonuslari: dog.equips = { collar|guard|med: itemId } */
  S.gearBuff = function (dog, key) {
    var m = 0;
    if (dog && dog.equips) {
      for (var sl in dog.equips) {
        var it = E.item(dog.equips[sl]);
        if (it && it.buffs && it.buffs[key]) m += it.buffs[key];
      }
    }
    return m;
  };
  S.xpMult = function (dog) { return 1 + S.gearBuff(dog, "xp"); };
  S.trainCost = function (dog, statKey) {
    var T = E.bal().training;
    var cur = (dog.trained && dog.trained[statKey]) || 0;
    return Math.round(T.base_cost * Math.pow(T.cost_growth_per_point, Math.floor(cur / 4)));
  };
  S.productionPerSec = function (dog, now, globalMult) {
    var b = E.breed(dog.breedId);
    var st = S.stageInfo(dog, now);
    return b.productionPerSecondLevel1 * S.lvlFactor(dog.level) * st.production_mult * (globalMult || 1);
  };
  S.collectionMult = function (dogCount) {
    var e = E.bal().economy;
    return 1 + Math.min(e.collection_bonus_cap, dogCount * e.collection_bonus_per_dog);
  };
  S.marketValue = function (dog, now) {
    var b = E.breed(dog.breedId);
    var rar = E.rar(dog.rarity);
    var trained = 0;
    for (var k in (dog.trained || {})) trained += dog.trained[k];
    var traitMult = 1;
    if (dog.traits && dog.traits.length) traitMult = 1.35;
    if (dog.mutation) traitMult = 1.75;
    if (dog.purebred && dog.lineage && dog.lineage.generation >= 2) traitMult = Math.max(traitMult, 2.2);
    var genMult = 1 + Math.min(0.5, (dog.lineage ? dog.lineage.generation : 0) * 0.06);
    return Math.round(b.marketBasePrice * rar.price_mult * (1 + dog.level * 0.045) *
      (1 + trained * 0.01) * traitMult * genMult);
  };

  /* -------------------------------------------------------- KÖPEK FABRIKA --- */
  var TRAIT_POOL = [
    { id: "altin_goz", name: "Altın Gözler", desc: "Gözleri altın gibi parlar; pazar değeri artar.", market: 1.15 },
    { id: "ay_tuyu", name: "Ay Tüyü", desc: "Tüyleri ay ışığında gümüş parlar; üretim +%8.", prod: 1.08 },
    { id: "celik_pati", name: "Çelik Pati", desc: "Arena hasarı +%6.", battle: 1.06 },
    { id: "ruzgar_kalbi", name: "Rüzgâr Kalbi", desc: "Arena hızı +%8.", spd: 1.08 },
    { id: "sadarakat", name: "Sarsılmaz Sadakat", desc: "Eğitim maliyeti -%15.", train: 0.85 },
    { id: "avci_buru", name: "Avcı Burnu", desc: "Çevrimdışı kazanç +%10.", offline: 1.10 }
  ];
  E.traits = TRAIT_POOL;
  var MUTATIONS = [
    { id: "mut_gumus", name: "Gümüş Tüy Mutasyonu", desc: "Tüyler gümüşe çalar; tüm istatistikler +%5.", stat: null, allMult: 1.05, mult: 1.05 },
    { id: "mut_guc", name: "Herkül Geni", desc: "Güç +%18.", stat: "power", mult: 1.18 },
    { id: "mut_hiz", name: "Şimşek Geni", desc: "Hız +%18.", stat: "speed", mult: 1.18 },
    { id: "mut_zeka", name: "Dâhi Geni", desc: "Zekâ +%18.", stat: "intelligence", mult: 1.18 },
    { id: "mut_kalkan", name: "Kale Geni", desc: "Savunma +%18.", stat: "defense", mult: 1.18 },
    { id: "mut_dayanik", name: "Dağ Geni", desc: "Dayanıklılık +%18.", stat: "stamina", mult: 1.18 }
  ];
  E.mutations = MUTATIONS;

  var NAME_A = ["Zeus", "Ateş", "Kar", "Duman", "Fırtına", "Gölge", "Poyraz", "Mavi", "Badem", "Cesur",
    "Dost", "Efe", "Fındık", "Gizem", "Hızlı", "Işık", "Kara", "Lodos", "Mercan", "Nazlı",
    "Ozan", "Pamuk", "Rüzgâr", "Sultan", "Titan", "Umut", "Vira", "Yaman", "Zeytin", "Asil",
    "Bora", "Ceylan", "Derya", "Erlik", "Flora", "Gürbüz", "Han", "Irmak", "Kuzey", "Luna"];
  var NAME_B = ["", " Han", " Ağa", " Paşa", " Sultan", " Bey", " Hatun", " Reis", " Efe", " Kral"];

  function makeGenes(rnd, look, pattern) {
    var rules = E.bal().breeding.allele_rules;
    function allele(dominance, present) {
      // fenotipten genotip tahmini: baskin fenotip -> AA veya Aa; cekinik -> aa
      if (present) return rnd() < dominance ? [1, 1] : [1, 0];
      return rnd() < 0.25 ? [1, 0] : [0, 0];
    }
    var hasMask = /mask|points|tricolor/.test(pattern);
    var hasMerle = pattern === "merle";
    var hasWhite = /bicolor|tricolor|patched|harlequin|urajiro|blenheim/.test(pattern);
    var hasBrindle = pattern === "brindle";
    var dilute = /9a9aa2|8a8f96|b9bec6|7d8794/.test(look.c1 || "");
    return {
      mask: allele(rules.mask.dominance, hasMask),
      merle: hasMerle ? [1, 0] : [0, 0],
      white: allele(rules.white_spotting.dominance, hasWhite),
      brindle: allele(rules.brindle.dominance, hasBrindle),
      dilute: allele(rules.dilute.dominance, dilute),
      long_fur: allele(rules.long_fur.dominance, (look.fur || 0) > 0.5),
      prick: allele(rules.prick_ear.dominance, look.ear === "prick" || look.ear === "bat" || look.ear === "semi"),
      short_muzzle: allele(rules.short_muzzle.dominance, (look.muz || 0.5) < 0.4),
      blue_eye: allele(rules.blue_eye.dominance, /6f|7f|a8c|8fe/.test(look.eye || ""))
    };
  }

  function phenotypeFromGenes(genes, motherLook, fatherLook, rnd) {
    function dom(pair, thr) { return (pair[0] + pair[1]) >= (thr === undefined ? 1 : thr); }
    var look = {};
    var keys = ["c1", "c2", "c3", "pat", "fur", "fluff", "ear", "muz", "muzW", "head",
      "build", "eye", "wrk", "flews", "mane", "beard", "brow", "cords", "topknot",
      "feathering", "blaze", "pompom", "splitNose", "tongue"];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var mv = motherLook[k], fv = fatherLook[k];
      if (typeof mv === "number" && typeof fv === "number") {
        look[k] = (mv + fv) / 2 + gauss(rnd) * 0.05;
        look[k] = Math.max(0, Math.min(1, look[k]));
      } else {
        look[k] = rnd() < 0.5 ? mv : fv;
      }
    }
    // alel etkileri
    if (dom(genes.long_fur)) look.fur = Math.max(look.fur, 0.55);
    else look.fur = Math.min(look.fur, 0.45);
    if (dom(genes.prick)) look.ear = rnd() < 0.7 ? "prick" : "semi";
    if (dom(genes.short_muzzle)) look.muz = Math.min(look.muz, 0.45);
    if (dom(genes.blue_eye)) look.eye = rnd() < 0.5 ? "#6fc7e8" : "#a8c4d8";
    if (dom(genes.dilute)) look.c1 = mixHex(look.c1, "#aeb6c2", 0.45);
    if (genes.merle[0] + genes.merle[1] >= 1) {
      look.pat = "merle";
      if (genes.merle[0] + genes.merle[1] === 2) look.doubleMerle = true;
    } else if (dom(genes.brindle)) look.pat = "brindle";
    else if (dom(genes.mask)) look.pat = /points|tricolor/.test(motherLook.pat + fatherLook.pat) ? look.pat : "mask";
    else if (genes.white[0] + genes.white[1] === 2 && look.pat === "solid") look.pat = "bicolor";
    return look;
  }

  function mixHex(a, b, t) {
    function h(c) { c = String(c).replace("#", ""); return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
    var x = h(a), y = h(b);
    function c(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }
    return "#" + c(x[0] + (y[0] - x[0]) * t) + c(x[1] + (y[1] - x[1]) * t) + c(x[2] + (y[2] - x[2]) * t);
  }
  E.mixHex = mixHex;

  E.makeDog = function (breedId, opts) {
    opts = opts || {};
    var rnd = rngFrom(opts.seed !== undefined ? opts.seed : (Date.now() ^ Math.floor(Math.random() * 1e9)));
    var b = E.breed(breedId);
    var dog = {
      uid: "D" + (opts.uid || (Date.now().toString(36) + Math.floor(rnd() * 1e6).toString(36))).toUpperCase(),
      breedId: breedId,
      name: opts.name || (E.rng.pick(rnd, NAME_A) + E.rng.pick(rnd, NAME_B)).trim(),
      sex: opts.sex || (rnd() < 0.5 ? "m" : "f"),
      rarity: b.rarity,
      level: opts.level || 1,
      xp: 0,
      ivs: {},
      trained: {},
      traits: [],
      mutation: null,
      bornAt: opts.bornAt || Date.now(),
      energy: 100,
      breedCooldownUntil: 0,
      inMarket: false,
      locked: !!opts.locked,
      lineage: opts.lineage || { mother: null, father: null, generation: 0, ancestors: [] },
      purebred: opts.purebred !== undefined ? opts.purebred : true,
      genes: opts.genes || makeGenes(rnd, PL.DB.lookups[b.key], b.rarity),
      look: opts.look || PL.DB.lookups[b.key],
      createdAt: Date.now()
    };
    var ivSigma = opts.ivSigma !== undefined ? opts.ivSigma : 0.055;
    for (var i = 0; i < S.STAT_KEYS.length; i++) {
      var k = S.STAT_KEYS[i];
      var iv = 1 + gauss(rnd) * ivSigma;
      dog.ivs[k] = Math.max(0.82, Math.min(1.18, Math.round(iv * 1000) / 1000));
      dog.trained[k] = 0;
    }
    if (opts.traitChance === undefined || rnd() < opts.traitChance) {
      if (rnd() < 0.18) dog.traits.push(E.rng.pick(rnd, TRAIT_POOL).id);
    }
    return dog;
  };

  /* ------------------------------------------------------------- GENETIK --- */
  var G = E.genetics = {};
  G.crossAlleles = function (m, f, rnd) {
    return [m[rnd() < 0.5 ? 0 : 1], f[rnd() < 0.5 ? 0 : 1]];
  };
  G.sharedAncestors = function (a, b) {
    var sa = {}, n = 0, i;
    var la = (a.lineage && a.lineage.ancestors) || [];
    var lb = (b.lineage && b.lineage.ancestors) || [];
    for (i = 0; i < la.length; i++) sa[la[i]] = 1;
    if (a.uid && sa[b.uid]) n++;
    for (i = 0; i < lb.length; i++) if (sa[lb[i]]) n++;
    return n;
  };
  G.compatible = function (a, b, now) {
    var B = E.bal().breeding;
    var problems = [];
    if (a.uid === b.uid) problems.push("Aynı köpek seçilemez.");
    if (a.sex === b.sex) problems.push("Anne ve baba farklı cinsiyette olmalı.");
    var nowTs = now || Date.now();
    if (S.stageOf(a, nowTs) === "yavru" || S.stageOf(b, nowTs) === "yavru") problems.push("Yavrular çiftleştirilemez.");
    if (a.level < B.min_level || b.level < B.min_level) problems.push("Her iki köpek en az " + B.min_level + ". seviye olmalı.");
    if ((a.breedCooldownUntil || 0) > nowTs) problems.push(a.name + " dinleniyor (" + F.time((a.breedCooldownUntil - nowTs) / 1000) + ").");
    if ((b.breedCooldownUntil || 0) > nowTs) problems.push(b.name + " dinleniyor (" + F.time((b.breedCooldownUntil - nowTs) / 1000) + ").");
    if (a.energy < B.energy_cost || b.energy < B.energy_cost) problems.push("Enerji yetersiz (gereken " + B.energy_cost + ").");
    if (a.inMarket || b.inMarket) problems.push("Pazardaki köpek çiftleştirilemez.");
    return { ok: problems.length === 0, problems: problems };
  };
  G.cost = function (a, b, evMult) {
    var B = E.bal().breeding;
    var sum = E.rarOrder(a.rarity) + E.rarOrder(b.rarity);
    var mult = B.cost_by_rarity_sum[String(sum)] || 1.0;
    return Math.round(B.base_cost * mult * (evMult || 1));
  };
  G.cooldownMs = function (rarity, evMult) {
    var B = E.bal().breeding;
    return (B.cooldown_minutes_by_rarity[rarity] || 5) * 60000 * (evMult || 1);
  };
  G.breedPair = function (mother, father, opts) {
    opts = opts || {};
    var rnd = rngFrom(opts.seed !== undefined ? opts.seed : Date.now() ^ 0x5eed);
    var B = E.bal().breeding;
    var sameBreed = mother.breedId === father.breedId;
    var childBreedId = sameBreed ? mother.breedId : (rnd() < 0.5 ? mother.breedId : father.breedId);
    var childBreed = E.breed(childBreedId);
    var mLook = mother.look || PL.DB.lookups[E.breed(mother.breedId).key];
    var fLook = father.look || PL.DB.lookups[E.breed(father.breedId).key];
    var genes = {};
    for (var gk in mother.genes) genes[gk] = G.crossAlleles(mother.genes[gk], father.genes[gk], rnd);
    var look = phenotypeFromGenes(genes, mLook, fLook, rnd);
    look.id = childBreed.id; look.key = childBreed.key;
    look.rarity = childBreed.rarity; look.size = childBreed.size;
    look.accent = E.rar(childBreed.rarity).color;

    // istatistik kalitimi: ebeveyn ortalamasi + gauss sapmasi + melez/safkan bonusu
    var shared = G.sharedAncestors(mother, father);
    var inbreedPenalty = Math.min(B.inbreeding_max_penalty, shared * B.inbreeding_penalty_per_shared_ancestor);
    var ms = S.dogStats(mother, opts.now), fs = S.dogStats(father, opts.now);
    var ivs = {};
    for (var i = 0; i < S.STAT_KEYS.length; i++) {
      var k = S.STAT_KEYS[i];
      var parentAvg = (mother.ivs[k] + father.ivs[k]) / 2;
      var iv = parentAvg + gauss(rnd) * B.child_iv_sigma;
      iv *= (1 - inbreedPenalty);
      if (sameBreed) iv *= (1 + B.purity_bonus * 0.5);
      else iv *= (1 + B.hybrid_bonus);
      ivs[k] = Math.max(0.80, Math.min(1.22, Math.round(iv * 1000) / 1000));
    }
    var child = E.makeDog(childBreedId, {
      seed: opts.seed, genes: genes, look: look, ivSigma: 0,
      lineage: {
        mother: mother.uid, father: father.uid,
        generation: Math.max(mother.lineage ? mother.lineage.generation : 0,
          father.lineage ? father.lineage.generation : 0) + 1,
        ancestors: ((mother.lineage && mother.lineage.ancestors) || []).concat(
          (father.lineage && father.lineage.ancestors) || [], [mother.uid, father.uid]).slice(-40)
      },
      purebred: sameBreed,
      bornAt: opts.now || Date.now()
    });
    child.ivs = ivs;
    child.name = opts.name || child.name;
    // cinsiyet kalitimi + mutasyon + nadir ozellik
    var mutChance = B.mutation_chance + (opts.mutationBonus || 0) + (opts.forceMutation ? 1 : 0);
    if (rnd() < mutChance) {
      var mut = E.rng.pick(rnd, MUTATIONS);
      child.mutation = { id: mut.id, name: mut.name, desc: mut.desc, stat: mut.stat, mult: mut.mult, allMult: mut.allMult || 1 };
      if (mut.allMult) { for (var kk in ivs) ivs[kk] = Math.min(1.25, ivs[kk] * mut.allMult); }
    }
    if (rnd() < B.rare_trait_chance + (mother.traits.length + father.traits.length) * 0.02) {
      var pool = TRAIT_POOL.slice();
      if (mother.traits.length && rnd() < 0.5) child.traits.push(mother.traits[0]);
      else if (father.traits.length && rnd() < 0.5) child.traits.push(father.traits[0]);
      else child.traits.push(E.rng.pick(rnd, pool).id);
      child.traits = child.traits.slice(0, 2);
    }
    // cift merle riski
    var report = {
      sameBreed: sameBreed, sharedAncestors: shared, inbreedPenalty: inbreedPenalty,
      doubleMerle: !!(look.doubleMerle), mutation: child.mutation ? child.mutation.name : null,
      traits: child.traits.slice(), breedId: childBreedId
    };
    if (look.doubleMerle) {
      for (var k2 in ivs) ivs[k2] = Math.max(0.75, ivs[k2] * (1 - B.allele_rules.double_merle_penalty));
    }
    return { dog: child, report: report };
  };

  /* --------------------------------------------------------------- KASA --- */
  var CR = E.crates = {};
  CR.price = function (crateId, evMult) { return Math.round(E.crate(crateId).price * (evMult || 1)); };
  CR.rollRarity = function (crateId, rnd, luckMult) {
    var c = E.crate(crateId);
    var entries = [];
    for (var k in c.odds) {
      var w = c.odds[k];
      if (w <= 0) continue;
      var order = E.rarOrder(k);
      if (order >= 4) w *= (luckMult || 1);
      entries.push({ key: k, w: w });
    }
    return E.rng.weightedPick(rnd, entries);
  };
  CR.open = function (crateId, opts) {
    opts = opts || {};
    var rnd = rngFrom(opts.seed !== undefined ? opts.seed : Date.now() ^ 0xc0ffee);
    var c = E.crate(crateId);
    var rarKey = CR.rollRarity(crateId, rnd, opts.luckMult || 1);
    var mixType = E.rng.weightedPick(rnd, [
      { key: "dog", w: c.reward_mix.dog }, { key: "points", w: c.reward_mix.points },
      { key: "item", w: c.reward_mix.item }]);
    var out = { crate: crateId, rarity: rarKey, type: mixType };
    if (mixType === "dog") {
      var pool = [];
      for (var i = 0; i < PL.DB.breeds.length; i++) if (PL.DB.breeds[i].rarity === rarKey) pool.push(PL.DB.breeds[i].id);
      if (!pool.length) pool = [PL.DB.breeds[0].id];
      out.breedId = E.rng.pick(rnd, pool);
    } else if (mixType === "points") {
      out.points = E.rng.ri(rnd, c.points_min, c.points_max);
    } else {
      out.item = E.rng.pick(rnd, c.item_pool);
      out.itemCount = 1;
    }
    return out;
  };

  /* -------------------------------------------------------------- SAVAS --- */
  var BT = E.battle = {};
  BT.ABILITY_TYPES = ["strike", "bite_bleed", "guard", "howl", "heal", "stun", "pierce",
    "crit_up", "drain", "rally", "aoe", "counter", "fortify", "execute"];
  BT.prepare = function (dog, now) {
    var bs = S.battleStats(dog, now);
    var b = E.breed(dog.breedId);
    return {
      uid: dog.uid, name: dog.name, breedId: dog.breedId, breedName: b.name_tr,
      rarity: dog.rarity, level: dog.level, image: b.image, sex: dog.sex,
      hp: bs.maxHp, maxHp: bs.maxHp, atk: bs.atk, def: bs.def, spd: bs.spd,
      ability: b.ability, cd: 0, statuses: {}, alive: true, counter: 0, shield: 0,
      dmgMult: 1, defMult: 1, spdMult: 1, critBonus: 0
    };
  };
  BT.simulate = function (teamA, teamB, opts) {
    opts = opts || {};
    var rnd = rngFrom(opts.seed !== undefined ? opts.seed : 12345);
    var B = E.bal().battle;
    var now = opts.now || Date.now();
    var units = [];
    var i, u;
    function prep(list, side) {
      var out = [];
      for (var j = 0; j < list.length; j++) {
        var d = list[j];
        var p = d.maxHp !== undefined ? d : BT.prepare(d, now);
        p.side = side; p.slot = j;
        if (opts.buffMult && side === "A") p.dmgMult *= opts.buffMult;
        out.push(p);
      }
      return out;
    }
    units = prep(teamA, "A").concat(prep(teamB, "B"));
    var log = [];
    var turn = 0;
    function alive(side) { return units.filter(function (x) { return x.side === side && x.alive; }); }
    function addEntry(e) { e.turn = turn; log.push(e); }
    function target(rnd2, side, mode) {
      var foes = alive(side === "A" ? "B" : "A");
      if (!foes.length) return null;
      if (mode === "lowest") {
        foes.sort(function (a, b) { return (a.hp / a.maxHp) - (b.hp / b.maxHp); });
        return foes[0];
      }
      return E.rng.pick(rnd2, foes);
    }
    function damage(src, dst, mult, opts2) {
      opts2 = opts2 || {};
      var rarMult = B.rarity_dmg_mult[src.rarity] || 1;
      var def = dst.def * dst.defMult * (opts2.ignoreDef ? (1 - opts2.ignoreDef / 100) : 1);
      var base = src.atk * src.dmgMult * mult * (1 - def / (def + 140)) * rarMult;
      var critChance = B.crit_chance_base + (opts2.critBonus || 0) + src.critBonus +
        (opts2.agility || 0) * B.crit_chance_from_agility;
      var crit = rnd() < critChance;
      var roll = 0.92 + rnd() * 0.16;
      var dmg = base * roll * (crit ? B.crit_mult : 1);
      if (dst.statuses.stun !== undefined) dmg *= 1.1;
      dmg = Math.max(1, Math.round(dmg));
      var absorbed = 0;
      if (dst.shield > 0) { absorbed = Math.min(dst.shield, dmg); dst.shield -= absorbed; dmg -= absorbed; }
      dst.hp = Math.max(0, dst.hp - dmg);
      if (dst.hp <= 0) { dst.alive = false; }
      addEntry({ t: "hit", src: src.uid, dst: dst.uid, dmg: dmg, absorbed: absorbed, crit: crit,
        ability: opts2.ability || null, type: opts2.type || "basic" });
      if (dst.counter > 0 && dst.alive) {
        var ref = Math.round(dmg * dst.counter);
        src.hp = Math.max(0, src.hp - ref);
        if (src.hp <= 0) src.alive = false;
        addEntry({ t: "counter", src: dst.uid, dst: src.uid, dmg: ref });
      }
      return dmg;
    }
    function heal(u, pct) {
      var h = Math.round(u.maxHp * pct / 100);
      u.hp = Math.min(u.maxHp, u.hp + h);
      addEntry({ t: "heal", src: u.uid, amount: h });
    }
    while (turn < B.max_turns && alive("A").length && alive("B").length) {
      turn++;
      addEntry({ t: "round", round: turn });
      var order = units.filter(function (x) { return x.alive; })
        .sort(function (a, b) { return (b.spd * b.spdMult) - (a.spd * a.spdMult); });
      for (i = 0; i < order.length; i++) {
        u = order[i];
        if (!u.alive) continue;
        if (!alive("A").length || !alive("B").length) break;
        // status turlari
        if (u.statuses.stun > 0) {
          u.statuses.stun--;
          addEntry({ t: "stunned", src: u.uid });
          continue;
        }
        if (u.statuses.bleed > 0) {
          var bd = Math.round(u.maxHp * 0.05);
          u.hp = Math.max(0, u.hp - bd);
          if (u.hp <= 0) u.alive = false;
          addEntry({ t: "bleed", src: u.uid, dmg: bd });
          u.statuses.bleed--;
          if (!u.alive) continue;
        }
        if (u.statuses.regen > 0) { heal(u, 6); u.statuses.regen--; }
        if (u.statuses.buffDmg > 0) { u.statuses.buffDmg--; if (u.statuses.buffDmg === 0) u.dmgMult /= u.buffAmt || 1.2; }
        if (u.cd > 0) u.cd--;
        var ab = u.ability;
        var useAb = u.cd === 0;
        var selfish = ab.type === "heal" || ab.type === "guard" || ab.type === "fortify" ||
          ab.type === "howl" || ab.type === "rally";
        var dst = selfish ? null : target(rnd, u.side, ab.type === "execute" ? "lowest" : null);
        if (!useAb || (!dst && !selfish)) {
          var t2 = target(rnd, u.side);
          if (!t2) continue;
          damage(u, t2, 1.0, { agility: u.spd });
          continue;
        }
        u.cd = ab.cooldown;
        switch (ab.type) {
          case "strike": case "execute": {
            var mult = ab.mult || 1.5;
            if (ab.type === "execute" && dst && dst.hp / dst.maxHp < 0.4) mult *= 1.6;
            damage(u, dst, mult, { ability: ab.name_tr, type: ab.type, agility: u.spd });
            break;
          }
          case "pierce": damage(u, dst, ab.mult || 1.5, { ability: ab.name_tr, ignoreDef: ab.value, agility: u.spd }); break;
          case "bite_bleed": case "aoe": {
            if (ab.type === "aoe") {
              var foes = alive(u.side === "A" ? "B" : "A");
              for (var q = 0; q < foes.length; q++) {
                damage(u, foes[q], ab.mult || 0.9, { ability: ab.name_tr, type: "aoe" });
                if (rnd() < 0.25 && foes[q].alive) { foes[q].statuses.bleed = 2; }
              }
            } else {
              damage(u, dst, ab.mult || 1.4, { ability: ab.name_tr });
              if (dst.alive) dst.statuses.bleed = 2;
            }
            break;
          }
          case "stun": {
            damage(u, dst, ab.mult || 1.0, { ability: ab.name_tr });
            if (dst.alive && rnd() < 0.55) { dst.statuses.stun = 1; addEntry({ t: "stun", src: u.uid, dst: dst.uid }); }
            break;
          }
          case "drain": {
            var dd = damage(u, dst, ab.mult || 1.4, { ability: ab.name_tr });
            var absorbedHp = Math.round(dd * (ab.value || 50) / 100);
            u.hp = Math.min(u.maxHp, u.hp + absorbedHp);
            addEntry({ t: "heal", src: u.uid, amount: absorbedHp });
            break;
          }
          case "heal": {
            var ally = alive(u.side).sort(function (a, b) { return (a.hp / a.maxHp) - (b.hp / b.maxHp); })[0];
            if (ally) heal(ally, ab.value || 20);
            break;
          }
          case "guard": {
            u.shield += Math.round(u.maxHp * (ab.value || 25) / 100);
            addEntry({ t: "shield", src: u.uid, amount: u.shield });
            var weak = alive(u.side).sort(function (a, b) { return (a.hp / a.maxHp) - (b.hp / b.maxHp); })[0];
            if (weak && weak !== u) { weak.shield += Math.round(weak.maxHp * (ab.value || 25) / 200); }
            break;
          }
          case "fortify": {
            u.defMult *= 1 + (ab.value || 30) / 100;
            u.statuses.regen = 3;
            addEntry({ t: "fortify", src: u.uid });
            break;
          }
          case "howl": case "rally": {
            var mates = alive(u.side);
            for (var m = 0; m < mates.length; m++) {
              if (ab.type === "howl") { mates[m].dmgMult *= 1 + (ab.value || 20) / 100; }
              else { mates[m].spdMult *= 1 + (ab.value || 20) / 100; }
            }
            addEntry({ t: ab.type, src: u.uid, value: ab.value });
            break;
          }
          case "counter": {
            u.counter = (ab.value || 40) / 100;
            damage(u, dst, ab.mult || 1.2, { ability: ab.name_tr });
            addEntry({ t: "counter_set", src: u.uid });
            break;
          }
          case "crit_up": {
            u.critBonus += 0.35;
            damage(u, dst, ab.mult || 1.5, { ability: ab.name_tr, agility: u.spd });
            break;
          }
          default: damage(u, dst, ab.mult || 1.5, { ability: ab.name_tr });
        }
      }
    }
    var aAlive = alive("A").length, bAlive = alive("B").length;
    var winner = aAlive > 0 && bAlive === 0 ? "A" : (bAlive > 0 && aAlive === 0 ? "B" : (aAlive === bAlive ? "draw" : (aAlive > bAlive ? "A" : "B")));
    if (turn >= B.max_turns && aAlive && bAlive) {
      var hpA = alive("A").reduce(function (s, x) { return s + x.hp / x.maxHp; }, 0);
      var hpB = alive("B").reduce(function (s, x) { return s + x.hp / x.maxHp; }, 0);
      winner = Math.abs(hpA - hpB) < 0.02 ? "draw" : (hpA > hpB ? "A" : "B");
    }
    return {
      log: log, winner: winner, turns: turn,
      units: units.map(function (x) {
        return { uid: x.uid, name: x.name, side: x.side, breedId: x.breedId, rarity: x.rarity,
          level: x.level, hp: x.hp, maxHp: x.maxHp, alive: x.alive, image: x.image };
      })
    };
  };
  BT.elo = function (ra, rb, score, K) {
    var ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
    return Math.round(ra + K * (score - ea));
  };
  BT.botTeam = function (rating, rnd, now) {
    var pool = PL.DB.breeds.slice();
    var team = [];
    var strength = 0.75 + Math.min(0.6, rating / 3000);
    for (var i = 0; i < 4; i++) {
      var b = E.rng.pick(rnd, pool);
      var lvl = Math.max(1, Math.round(rating / 60 * strength + E.rng.ri(rnd, -3, 6)));
      lvl = Math.min(50, lvl);
      var d = E.makeDog(b.id, {
        level: lvl, seed: rnd() * 1e9,
        uid: "BOT" + Math.floor(rnd() * 1e9).toString(36).toUpperCase() + i
      });
      d.bornAt = now - 72 * 3600000;
      team.push(d);
    }
    return team;
  };

  /* ------------------------------------------------------------ EKONOMI --- */
  var EC = E.economy = {};
  EC.globalMult = function (state, now) {
    var m = 1;
    var i;
    for (i = 0; i < (state.boosters || []).length; i++) {
      var bo = state.boosters[i];
      if (bo.endsAt > now && bo.type === "production_mult") m *= bo.mult;
    }
    var evs = E.events.active(now);
    for (i = 0; i < evs.length; i++) if (evs[i].effect && evs[i].effect.production_mult) m *= evs[i].effect.production_mult;
    m *= S.collectionMult((state.dogs || []).length);
    return m;
  };
  EC.totalPerSec = function (state, now) {
    var m = EC.globalMult(state, now);
    var t = 0;
    for (var i = 0; i < state.dogs.length; i++) {
      var d = state.dogs[i];
      var tr = 1;
      for (var k = 0; k < d.traits.length; k++) {
        var trf = E.traits.filter(function (x) { return x.id === d.traits[k]; })[0];
        if (trf && trf.prod) tr *= trf.prod;
      }
      t += S.productionPerSec(d, now, m) * tr;
    }
    return t;
  };
  EC.pending = function (state, now) {
    var dt = Math.max(0, (now - (state.time.lastCollectAt || now)) / 1000);
    return EC.totalPerSec(state, now) * dt;
  };
  EC.offlineGain = function (state, now, clockNow, monotonicDelta) {
    var bal = E.bal();
    var last = state.time.lastSeenAt || now;
    var clockElapsed = (clockNow - last) / 1000;
    var elapsed = clockElapsed;
    var tampered = false;
    if (monotonicDelta !== undefined && monotonicDelta !== null) {
      if (clockElapsed > monotonicDelta + bal.anti_cheat.max_forward_jump_seconds) {
        elapsed = monotonicDelta + bal.anti_cheat.max_forward_jump_seconds;
        tampered = true;
      }
    }
    if (clockElapsed < 0) { return { seconds: 0, gain: 0, capped: false, tampered: true, rawSeconds: clockElapsed, pps: 0 }; }
    var capped = false;
    var cap = bal.economy.offline_cap_hours * 3600;
    if (elapsed > cap) { elapsed = cap; capped = true; }
    var evs = E.events.active(now);
    var eff = bal.economy.offline_efficiency;
    for (var i = 0; i < evs.length; i++) if (evs[i].effect && evs[i].effect.offline_efficiency_bonus) eff += evs[i].effect.offline_efficiency_bonus;
    var offMult = 1;
    for (var k = 0; k < state.dogs.length; k++) {
      for (var j = 0; j < state.dogs[k].traits.length; j++) {
        var trf = E.traits.filter(function (x) { return x.id === state.dogs[k].traits[j]; })[0];
        if (trf && trf.offline) offMult *= trf.offline;
      }
    }
    var pps = EC.totalPerSec(state, now);
    var gain = elapsed < bal.economy.offline_min_seconds ? 0 : pps * elapsed * eff * offMult;
    return { seconds: elapsed, gain: gain, capped: capped, tampered: tampered, rawSeconds: clockElapsed, pps: pps };
  };

  /* ------------------------------------------------------------- OLAYLAR --- */
  var EV = E.events = {};
  EV.active = function (now) {
    var d = new Date(now);
    var list = [];
    var evs = PL.DB.events;
    var week = Math.floor(now / (7 * 86400000));
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      if (e.window === "weekend" && (d.getDay() === 6 || d.getDay() === 0)) list.push(e);
      else if (e.window === "weekly" && (week % 4) === e.week_mod) list.push(e);
      else if (e.window === "daily_night" && (d.getHours() >= 22 || d.getHours() < 6)) list.push(e);
    }
    return list;
  };

  /* -------------------------------------------------------------- PAZAR --- */
  var MK = E.market = {};
  MK.fee = function (price, evs) {
    var f = E.bal().market.fee;
    for (var i = 0; i < (evs || []).length; i++) if (evs[i].effect.market_fee) f = evs[i].effect.market_fee;
    return Math.round(price * f);
  };
  MK.botListings = function (seed, now) {
    var rnd = rngFrom(seed);
    var n = E.bal().market.local_demo_sellers;
    var out = [];
    var names = ["Köpekçi Ali", "Patika Kennel", "Bozkır Kennels", "Anadolu Paws", "Luna Kennel",
      "Dağ Evi Kennel", "Ege Patileri", "Karadeniz Kennel", "Toros Dogs", "Marmara Paws",
      "Kapadokya Kennel", "Boğaz Kennels", "Van Kedisi? Hayır Köpek!", "Zirve Kennel"];
    for (var i = 0; i < n; i++) {
      var b = E.rng.pick(rnd, PL.DB.breeds);
      var lvl = E.rng.ri(rnd, 1, 40);
      var d = E.makeDog(b.id, { level: lvl, seed: rnd() * 1e9, bornAt: now - E.rng.ri(rnd, 20, 400) * 3600000 });
      var val = S.marketValue(d, now);
      var price = Math.round(val * E.rng.rf(rnd, 0.82, 1.35));
      out.push({
        id: "L" + (seed % 100000) + "_" + i, seller: names[i % names.length], sellerCode: "BOT-" + (1000 + i),
        dog: d, price: price, value: val, createdAt: now - E.rng.ri(rnd, 1, 40) * 3600000, bot: true
      });
    }
    return out;
  };
  MK.botBuyChancePerHour = function (listing, now) {
    var ratio = listing.price / Math.max(1, listing.value);
    if (ratio <= 0.9) return 0.55;
    if (ratio <= 1.05) return 0.30;
    if (ratio <= 1.25) return 0.14;
    if (ratio <= 1.6) return 0.05;
    return 0.015;
  };

  /* --------------------------------------------------------- GOREV/ROZET --- */
  var QS = E.quests = {};
  function dayKey(now) {
    var d = new Date(now);
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  E.dayKey = dayKey;
  QS.rollDaily = function (seed, now) {
    var rnd = rngFrom(seed);
    var pool = PL.DB.quests.pool.slice();
    var out = [];
    var used = {};
    var count = E.bal().daily.quests_per_day;
    while (out.length < count && pool.length) {
      var idx = Math.floor(rnd() * pool.length);
      var q = pool.splice(idx, 1)[0];
      if (used[q.type]) continue;
      used[q.type] = 1;
      out.push({ id: q.id, type: q.type, target: q.count, progress: 0, points: q.points, xp: q.xp,
        text: q.text_tr, rarity: q.rarity || null, done: false, claimed: false });
    }
    return { date: dayKey(now), list: out };
  };
  QS.progress = function (state, type, amount, rarity) {
    var q = state.quests && state.quests.list || [];
    for (var i = 0; i < q.length; i++) {
      var it = q[i];
      if (it.claimed || it.type !== type) continue;
      if (it.rarity && rarity && E.rarOrder(rarity) < E.rarOrder(it.rarity)) continue;
      it.progress = Math.min(it.target, it.progress + (amount || 1));
      if (it.progress >= it.target) it.done = true;
    }
  };
  var AC = E.achievements = {};
  AC.metric = function (state, key) {
    var st = state.stats;
    switch (key) {
      case "dogs_owned": return state.dogs.length;
      case "breeds_discovered": return (st.breedsDiscovered || []).length;
      case "crates_opened": return st.cratesOpened || 0;
      case "legendary_obtained": return st.legendaryObtained || 0;
      case "mythic_obtained": return st.mythicObtained || 0;
      case "puppies_bred": return st.puppiesBred || 0;
      case "battles_won": return st.battlesWon || 0;
      case "rating": return state.arena.rating;
      case "points_earned": return st.pointsEarned || 0;
      case "market_sales": return st.marketSales || 0;
      case "friends": return (state.friends.list || []).length;
      case "login_streak": return state.login.streak || 0;
      case "max_dog_level": return st.maxDogLevel || 1;
      default: return 0;
    }
  };
  AC.check = function (state) {
    var unlocked = [];
    var list = PL.DB.achievements;
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (state.achievements.unlocked[a.id]) continue;
      if (AC.metric(state, a.metric) >= a.target) {
        state.achievements.unlocked[a.id] = Date.now();
        unlocked.push(a);
      }
    }
    return unlocked;
  };

  /* -------------------------------------------------------------- KAYIT --- */
  var SV = E.save = {};
  SV.KEY = "paw_legends_save_v7";
  SV.defaultState = function (name) {
    var now = Date.now();
    var st = {
      v: 7,
      profile: {
        id: "P" + Math.floor(Math.random() * 1e9).toString(36).toUpperCase(),
        code: "", name: name || "Oyuncu", createdAt: now, lastSeenAt: now,
        avatarBreed: 8, title: "Çaylak Yetiştirici"
      },
      balance: E.bal().economy.start_balance,
      lifetimePoints: 0,
      dogs: [],
      inventory: { food_s: 3, xp_potion_s: 2, booster_prod_s: 1 },
      boosters: [],
      luck: { mult: 1, uses: 0 },
      battleBanner: null,
      arena: { rating: E.bal().battle.elo_start, wins: 0, losses: 0, draws: 0, history: [], tier: "Bronz" },
      market: { listings: [], history: [], botSeed: Math.floor(Math.random() * 1e6), botListings: [] },
      friends: { list: [], incoming: [], outgoing: [] },
      quests: null,
      achievements: { unlocked: {} },
      login: { streak: 0, lastClaimKey: null },
      stats: {
        cratesOpened: 0, puppiesBred: 0, battlesWon: 0, battlesLost: 0, battlesDraw: 0,
        marketSales: 0, marketBuys: 0, pointsEarned: 0, itemsUsed: 0, upgrades: 0,
        trainings: 0, friendsAdded: 0, breedsDiscovered: [], maxDogLevel: 1,
        legendaryObtained: 0, mythicObtained: 0, offlineClaims: 0
      },
      settings: { music: true, sfx: true, quality: "high", lang: "tr", notifications: true, reduceMotion: false },
      time: { lastSeenAt: now, lastCollectAt: now, createdAt: now, monoBase: 0, clockBase: now },
      notifications: [],
      log: [],
      online: { mode: "local", server: "", user: null, token: null },
      tutorialDone: false
    };
    st.profile.code = SV.makeCode(st.profile.id);
    return st;
  };
  SV.makeCode = function (id) {
    var h = hashStr(id + "PAW");
    var s = h.toString(36).toUpperCase();
    while (s.length < 6) s = "0" + s;
    return "PAW-" + s.slice(0, 6);
  };
  SV.starterDogs = function (state) {
    var rnd = rngFrom(hashStr(state.profile.id));
    var commons = PL.DB.breeds.filter(function (b) { return b.rarity === "yaygın" || b.rarity === "seçkin"; });
    var a = E.makeDog(E.rng.pick(rnd, commons).id, { seed: rnd() * 1e9, level: 3, bornAt: Date.now() - 40 * 3600000 });
    var b2 = E.makeDog(E.rng.pick(rnd, commons).id, { seed: rnd() * 1e9, level: 2, bornAt: Date.now() - 40 * 3600000 });
    b2.sex = a.sex === "m" ? "f" : "m";
    state.dogs.push(a, b2);
    E.registerBreed(state, a.breedId); E.registerBreed(state, b2.breedId);
  };
  E.registerBreed = function (state, breedId) {
    if (state.stats.breedsDiscovered.indexOf(breedId) < 0) state.stats.breedsDiscovered.push(breedId);
  };
  SV.load = function (storage) {
    try {
      var raw = storage.getItem(SV.KEY);
      if (!raw) return null;
      var st = JSON.parse(raw);
      if (!st || st.v !== 7) return SV.migrate(st);
      return st;
    } catch (e) { return null; }
  };
  SV.migrate = function (st) {
    if (!st) return null;
    var d = SV.defaultState(st.profile && st.profile.name);
    for (var k in st) if (Object.prototype.hasOwnProperty.call(st, k)) d[k] = st[k];
    d.v = 7;
    return d;
  };
  SV.store = function (storage, state) {
    try { storage.setItem(SV.KEY, JSON.stringify(state)); return true; }
    catch (e) { return false; }
  };
  SV.clear = function (storage) { try { storage.removeItem(SV.KEY); } catch (e) { } };
  SV.export = function (state) { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); };
  SV.import = function (str) {
    try { return JSON.parse(decodeURIComponent(escape(atob(str.trim())))); } catch (e) { return null; }
  };

  /* ----------------------------------------------------------- BILDIRIM --- */
  E.notify = function (state, text, kind) {
    state.notifications.unshift({ id: "N" + Date.now() + Math.floor(Math.random() * 999), ts: Date.now(), text: text, kind: kind || "info", read: false });
    if (state.notifications.length > 60) state.notifications.length = 60;
  };
  E.txLog = function (state, entry) {
    entry.ts = Date.now();
    state.log.unshift(entry);
    if (state.log.length > 200) state.log.length = 200;
  };
  E.gain = function (state, amount, reason) {
    amount = Math.floor(amount);
    if (amount <= 0) return 0;
    state.balance += amount;
    state.lifetimePoints += amount;
    state.stats.pointsEarned += amount;
    E.txLog(state, { type: "gain", amount: amount, reason: reason });
    return amount;
  };
  E.spend = function (state, amount, reason) {
    amount = Math.floor(amount);
    if (state.balance < amount) return false;
    state.balance -= amount;
    E.txLog(state, { type: "spend", amount: amount, reason: reason });
    return true;
  };

  /* -------------------------------------------------------------- YARDIM --- */
  E.dogCardSummary = function (dog, now) {
    var b = E.breed(dog.breedId);
    return {
      uid: dog.uid, name: dog.name, breed: b.name_tr, rarity: dog.rarity, level: dog.level,
      image: b.image, sex: dog.sex, stage: S.stageOf(dog, now), pps: S.productionPerSec(dog, now, 1)
    };
  };
  E.tierOf = function (rating) {
    if (rating >= 2400) return "Mitik Lig";
    if (rating >= 2000) return "Elmas Lig";
    if (rating >= 1700) return "Efsanevi Lig";
    if (rating >= 1400) return "Altın Lig";
    if (rating >= 1150) return "Gümüş Lig";
    return "Bronz Lig";
  };
  E.version = "7.0.0";
})(typeof window !== "undefined" ? window : globalThis);
