/* =============================================================================
   PAW LEGENDS: DOG WORLD — uygulama kontrolcusu
   Kayit yonetimi, oyun dongusu (tick), tum oyun aksiyonlari, offline kazanc,
   gunluk odul, liderlik tablosu, bot pazar simulasyonu, boot.
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var E = PL.engine, U = PL.ui;
  PL.save = E.save;
  var G = PL.game = { state: null, storage: null, _tick: null, _auto: 0, _friendBattle: null };

  var DEMO_PLAYERS = [
    { code: "PAW-DEMO01", name: "Bozkurt", rating: 1480, dogs: 22, breeds: 34, title: "Sürü Ustası" },
    { code: "PAW-DEMO02", name: "Aylin", rating: 1720, dogs: 31, breeds: 47, title: "Arena Kurdu" },
    { code: "PAW-DEMO03", name: "Mert", rating: 1150, dogs: 12, breeds: 18, title: "Çaylak" },
    { code: "PAW-DEMO04", name: "Zeynep", rating: 2050, dogs: 44, breeds: 66, title: "Elmas Yetiştirici" },
    { code: "PAW-DEMO05", name: "Kaan", rating: 1330, dogs: 17, breeds: 25, title: "Pazar Tüccarı" },
    { code: "PAW-DEMO06", name: "Elif", rating: 1890, dogs: 38, breeds: 55, title: "Genetikçi" },
    { code: "PAW-DEMO07", name: "Demir", rating: 990, dogs: 8, breeds: 11, title: "Yeni Yetiştirici" },
    { code: "PAW-DEMO08", name: "Selin", rating: 2310, dogs: 51, breeds: 78, title: "Mitik Avcısı" }
  ];
  G.demoPlayers = DEMO_PLAYERS;

  /* ------------------------------------------------------------ KAYIT ----- */
  G.save = function () {
    if (!G.state) return;
    G.state.profile.lastSeenAt = Date.now();
    G.state.time.lastSeenAt = Date.now();
    E.save.store(G.storage || localStorage, G.state);
  };
  G.startNew = function (name) {
    G.state = E.save.defaultState(name);
    E.save.starterDogs(G.state);
    G.state.time.monoBase = (root.performance ? performance.now() : 0) / 1000;
    G.state.time.clockBase = Date.now() / 1000;
    G.ensureDailyQuests();
    G.save();
    E.notify(G.state, "Hoş geldin " + name + "! İki başlangıç köpeğin kennel'de.", "ok");
    U.updateTopBar();
  };
  G.resume = function () {
    var st = E.save.load(G.storage || localStorage);
    if (!st) { G.startNew("Yetiştirici"); return; }
    G.state = st;
    G.applySettings();
    G.checkOfflineEarnings();
    G.ensureDailyQuests();
    G.save();
  };
  G.applySettings = function () {
    var s = G.state.settings;
    U.audio.musicOn = s.music; U.audio.sfxOn = s.sfx;
    document.body.setAttribute("data-quality", s.quality || "high");
  };

  /* ------------------------------------------------- OFFLINE KAZANC ------- */
  G.checkOfflineEarnings = function () {
    var st = G.state, now = Date.now();
    var clockNow = now / 1000;
    var perfNow = (root.performance ? performance.now() : 0) / 1000;
    var monoDelta = null;
    if (st.time.monoBase && st.time.clockBase && perfNow > 0) {
      var sessionClock = clockNow - st.time.clockBase;
      var sessionMono = perfNow - st.time.monoBase;
      // ayni oturum icinde saat oynamis mi?
      if (Math.abs(sessionClock - sessionMono) > E.bal().anti_cheat.max_forward_jump_seconds) monoDelta = sessionMono;
    }
    var res = E.economy.offlineGain(st, now, now, monoDelta);
    st.time.monoBase = perfNow; st.time.clockBase = clockNow;
    if (res.tampered) {
      E.notify(st, "Saat değişikliği tespit edildi; çevrimdışı kazanç sınırlandı/sıfırlandı.", "warn");
    }
    if (res.gain >= 1 && res.seconds >= E.bal().economy.offline_min_seconds) {
      setTimeout(function () { G.showOfflineModal(res); }, 700);
    }
    return res;
  };
  G.showOfflineModal = function (res) {
    var m = U.modal({
      title: "Tekrar Hoş Geldin!",
      body: "<div class='offlineBox'>" + U.icon("icon_clock", "big") +
        "<p>Kennel'in sen yokken <b>" + E.fmt.time(res.seconds || 0) + "</b> çalıştı.</p>" +
        "<div class='bigGain'>" + E.fmt.num(Math.floor(res.gain || 0)) + " puan</div>" +
        (res.capped ? "<p class='warn'>Çevrimdışı sınırına (8 saat) ulaşıldı.</p>" : "") +
        (res.tampered ? "<p class='warn'>Cihaz saati tutarsız; kazanç doğrulandı ve sınırlandı.</p>" : "") +
        "<p class='muted small'>Üretim hızın: " + (res.pps || 0).toFixed(2) + " puan/sn (çevrimdışı verim %75)</p></div>",
      buttons: [{
        label: "Topla", cls: "gold", onClick: function () {
          E.gain(G.state, res.gain, "Çevrimdışı üretim");
          G.state.stats.offlineClaims = (G.state.stats.offlineClaims || 0) + 1;
          if (PL.net && PL.net.online) PL.net.verifyEarnings({ seconds: res.seconds, pps: res.pps, gain: res.gain }, function () { });
          E.txLog(G.state, { type: "gain", amount: Math.floor(res.gain), reason: "Çevrimdışı üretim (" + E.fmt.time(res.seconds) + ")" });
          G.checkAchievements();
          G.save(); U.sfx("coin"); U.updateTopBar();
        }
      }]
    });
    void m;
  };

  /* ------------------------------------------------------------- DONGU ---- */
  G.boot = function () {
    G.storage = localStorage;
    buildChrome();
    var has = E.save.load(G.storage);
    var lg0 = (G.state && G.state.settings && G.state.settings.lang) || "tr";
    if (PL.i18n && PL.i18n.names[lg0] && lg0 !== "tr") {
      PL.i18n.lang = lg0;
      try { document.documentElement.lang = lg0; document.documentElement.dir = lg0 === "ar" ? "rtl" : "ltr"; } catch (e) { }
    }
    if (has) { G.resume(); U.replace("hub"); }
    else U.replace("login");
    G._buildChrome = buildChrome;
    G._tick = setInterval(G.tick, 1000);
    G.tgAutoConnect();
    root.addEventListener("beforeunload", function () { G.save(); PL.net.leave(); });
    root.addEventListener("pagehide", function () { G.save(); PL.net.leave(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) { G.save(); PL.net.leave(); } });
  };
  /* Telegram Mini App icinde acildiysa: initData ile otomatik giris + sunucuya baglan.
     Sunucu TG_BOT_TOKEN ile HMAC dogrulamasi yapar; basarisizsa oyun cevrimdisi devam eder. */
  G.tgAutoConnect = function () {
    var tg = window.Telegram && window.Telegram.WebApp;
    var api = (window.PAW_CONFIG && window.PAW_CONFIG.apiUrl || "").replace(/\/$/, "");
    if (!api && /^https:$/.test(location.protocol)) api = location.origin;
    if (!tg || !tg.initData || !api) return;
    try { tg.ready(); tg.expand(); } catch (e) { }
    var hadState = !!G.state;
    var tgName = (tg.initDataUnsafe && tg.initDataUnsafe.user && (tg.initDataUnsafe.user.first_name || "")) || "Yetiştirici";
    var xhr = new XMLHttpRequest();
    xhr.open("POST", api + "/api/tg/login", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 9000;
    xhr.onload = function () {
      var j = null;
      try { j = JSON.parse(xhr.responseText); } catch (e) { }
      if (!j) return;
      if (xhr.status === 403 && j.error === "banned") {
        U.toast("⛔ Hesap yasaklı: " + (j.reason || "") + " — çevrimdışı moddasın", "err");
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !j.token) {
        U.toast("Telegram girişi yapılamadı (" + (j.error || xhr.status) + ") — çevrimdışı oynayabilirsin", "info");
        return;
      }
      if (!G.state) { G.startNew(String(j.name || tgName).slice(0, 18)); }
      var st = G.state;
      st.profile.code = j.user.code;
      PL.net.url = api; PL.net.token = j.token; PL.net.online = true;
      st.online = { mode: "telegram", server: api, user: j.user, token: j.token };
      PL.net.mergeServerDogs(j.dogsList || []);
      if (typeof j.balance === "number" && j.balance > st.balance) st.balance = j.balance;
      G.save();
      PL.net.syncProfile(function () { });
      if (!hadState) U.replace("hub");
      U.updateTopBar();
      U.toast("🤖 Telegram ile bağlanıldı: " + st.profile.code, "ok");
      E.notify(st, "Telegram Mini App oturumu açıldı (" + st.profile.code + ")", "ok");
    };
    xhr.onerror = xhr.ontimeout = function () {
      U.toast("Telegram API'ye ulaşılamadı — çevrimdışı oynayabilirsin", "info");
    };
    xhr.send(JSON.stringify({ initData: tg.initData }));
  };
  G.tick = function () {
    if (!G.state) return;
    var st = G.state, now = Date.now();
    // cevrimici heartbeat: ~30 sn'de bir sunucuya "buradayim" bildir (admin paneli CEVRIMICI gosterir)
    G._hb = (G._hb || 0) + 1;
    if (PL.net.online && G._hb % 30 === 1) PL.net.heartbeat();
    // enerji rejenerasyonu
    var regen = E.bal().training.energy_regen_seconds;
    for (var i = 0; i < st.dogs.length; i++) {
      var d = st.dogs[i];
      if (d.energy < 100 && now - (d._lastEnergy || now) >= 0) {
        d._energyAcc = (d._energyAcc || 0) + 1;
        if (d._energyAcc >= regen) { d._energyAcc = 0; d.energy = Math.min(100, d.energy + 1); }
      }
    }
    // bot pazar satis simulasyonu
    G.simulateBotPurchases(1);
    // sunucu senkronu + admin mudaheleleri (60 sn'de bir, sadece cevrim iciyken)
    G._sec = (G._sec || 0) + 1;
    if (G._sec % 60 === 0 && PL.net && PL.net.online) { PL.net.syncProfile(); PL.net.pollAdmin(); }
    // booster temizligi
    st.boosters = (st.boosters || []).filter(function (b) { return b.endsAt > now; });
    // gunluk gorev sifirlama
    G.ensureDailyQuests();
    // otomatik kayit
    if (++G._auto >= 15) { G._auto = 0; G.save(); }
    U.updateTopBar();
  };
  G.simulateBotPurchases = function (sec) {
    var st = G.state, now = Date.now();
    var mine = st.market.listings.filter(function (l) { return !l.sold; });
    for (var i = 0; i < mine.length; i++) {
      var l = mine[i];
      if (now - l.createdAt < 60000) continue;
      var perHour = E.market.botBuyChancePerHour(l, now);
      var p = perHour * sec / 3600;
      if (Math.random() < p) {
        var fee = E.market.fee(l.price, E.events.active(now));
        var net = l.price - fee;
        l.sold = true; l.soldAt = now;
        var dogIdx = st.dogs.map(function (x) { return x.uid; }).indexOf(l.dog.uid);
        if (dogIdx >= 0) st.dogs.splice(dogIdx, 1);
        E.gain(st, net, "Pazar satışı: " + l.dog.name);
        st.market.history.unshift({ ts: now, type: "sell", text: l.dog.name + " satıldı (komisyon " + E.fmt.num(fee) + ")", amount: net });
        st.stats.marketSales++;
        E.notify(st, "İların sattı: " + l.dog.name + " → +" + E.fmt.num(net) + " puan", "ok");
        E.txLog(st, { type: "crate", amount: net, reason: "Pazar satışı " + l.dog.name, detail: "+" + E.fmt.num(net) });
        U.sfx("coin");
        G.checkAchievements();
        G.save();
      }
    }
  };
  G.refreshBotListings = function () {
    var st = G.state;
    var day = E.dayKey(Date.now());
    if (!st.market.botDay || st.market.botDay !== day || !st.market.botListings || !st.market.botListings.length) {
      st.market.botDay = day;
      st.market.botListings = E.market.botListings(st.market.botSeed + E.rng.hashStr(day), Date.now());
    }
  };
  G.ensureDailyQuests = function () {
    var st = G.state, today = E.dayKey(Date.now());
    if (!st.quests || st.quests.date !== today) {
      st.quests = E.quests.rollDaily(E.rng.hashStr(today + st.profile.id), Date.now());
      E.notify(st, "Yeni günlük görevler hazır!", "info");
    }
  };
  G.collect = function (withSound) {
    var st = G.state, now = Date.now();
    var gain = Math.floor(E.economy.pending(st, now));
    st.time.lastCollectAt = now;
    if (gain > 0) {
      E.gain(st, gain, "Üretim toplama");
      E.quests.progress(st, "collect_income", 1);
      E.quests.progress(st, "earn_points", gain);
      if (withSound) U.sfx("coin");
      U.toast("+" + E.fmt.num(gain) + " puan toplandı.", "ok");
      G.checkAchievements();
      G.save();
      U.updateTopBar();
    } else if (withSound) U.toast("Toplanacak puan henüz yok.", "info");
    return gain;
  };
  G.checkAchievements = function () {
    var un = E.achievements.check(G.state);
    for (var i = 0; i < un.length; i++) {
      E.gain(G.state, un[i].reward_points, "Başarım: " + un[i].name_tr);
      E.notify(G.state, "🏅 Başarım açıldı: " + un[i].name_tr + " (+" + E.fmt.num(un[i].reward_points) + ")", "ok");
      U.sfx("level_up");
    }
    return un;
  };
  G.openLoginReward = function () {
    var st = G.state, today = E.dayKey(Date.now());
    if (st.login.lastClaimKey === today) { U.toast("Bugünkü ödülü zaten aldın.", "info"); return; }
    var cycle = PL.DB.balance.daily.login_rewards;
    var idx = (st.login.streak || 0) % cycle.length;
    var r = cycle[idx];
    var rows = cycle.map(function (c, i) {
      return "<div class='loginDay" + (i === idx ? " today" : "") + (i < idx ? " done" : "") + "'>" +
        "<b>Gün " + c.day + "</b><span>" + c.label + "</span></div>";
    }).join("");
    U.modal({
      title: "Günlük Giriş Ödülü",
      body: "<div class='loginGrid'>" + rows + "</div><p>Bugünün ödülü: <b>" + r.label + "</b> (seri: " + (st.login.streak || 0) + " gün)</p>",
      buttons: [{ label: "Kapat", cls: "ghost" }, {
        label: "Ödülü Al", cls: "gold", onClick: function () {
          st.login.streak = (st.login.lastClaimKey && st.login.lastClaimKey !== today) ? (st.login.streak || 0) + 1 : (st.login.streak || 0) + 1;
          st.login.lastClaimKey = today;
          if (r.type === "points") E.gain(st, r.amount, "Günlük giriş ödülü");
          else if (r.type === "item") st.inventory[r.item] = (st.inventory[r.item] || 0) + r.amount;
          else if (r.type === "crate") {
            var roll = E.crates.open(r.crate, { seed: Date.now() });
            G.applyCrateReward(roll);
          }
          E.quests.progress(st, "collect_income", 1);
          G.checkAchievements();
          G.save(); U.sfx("reward_chime"); U.updateTopBar();
          U.toast("Ödül alındı: " + r.label, "ok");
        }
      }]
    });
  };
  G.leaderboard = function (metric) {
    var st = G.state;
    var rows = DEMO_PLAYERS.map(function (p) {
      var val = metric === "rating" ? p.rating : metric === "balance" ? p.rating * 4200 :
        metric === "collection" ? p.dogs : Math.max(5, Math.round(p.rating / 45));
      return { name: p.name, val: metric === "balance" ? E.fmt.compact(val) : val, raw: val, me: false };
    });
    var me = metric === "rating" ? st.arena.rating : metric === "balance" ? st.balance :
      metric === "collection" ? st.dogs.length : st.stats.maxDogLevel;
    rows.push({ name: st.profile.name, val: metric === "balance" ? E.fmt.compact(me) : me, raw: me, me: true });
    rows.sort(function (a, b) { return b.raw - a.raw; });
    return rows.slice(0, 25);
  };

  /* --------------------------------------------------------- AKSIYONLAR --- */
  var A = G.actions = {};
  A.upgradeDog = function (uid) {
    var st = G.state, dog = U.dogByUid(uid);
    if (!dog) return { ok: false, msg: "Köpek bulunamadı." };
    if (dog.level >= E.bal().levels.max_level) return { ok: false, msg: "Maksimum seviye." };
    var cost = E.stats.levelUpCost(dog);
    if (!E.spend(st, cost, "Seviye: " + dog.name)) return { ok: false, msg: "Yetersiz puan (" + E.fmt.num(cost) + " gerekli)." };
    dog.level++;
    dog.xp = 0;
    st.stats.upgrades++;
    st.stats.maxDogLevel = Math.max(st.stats.maxDogLevel, dog.level);
    E.quests.progress(st, "upgrade_dog", 1);
    G.checkAchievements();
    G.save();
    return { ok: true, cost: cost };
  };
  A.trainDog = function (uid, stat) {
    var st = G.state, dog = U.dogByUid(uid);
    if (!dog) return { ok: false, msg: "Köpek bulunamadı." };
    var T = E.bal().training;
    if ((dog.trained[stat] || 0) >= T.max_extra_points_per_stat) return { ok: false, msg: "Bu istatistik tamamen eğitildi." };
    if (dog.energy < T.energy_cost) return { ok: false, msg: "Enerji yetersiz (" + dog.energy + "/100)." };
    var cost = E.stats.trainCost(dog, stat);
    var trMult = 1;
    dog.traits.forEach(function (t) {
      var tr = E.traits.filter(function (x) { return x.id === t; })[0];
      if (tr && tr.train) trMult *= tr.train;
    });
    cost = Math.round(cost * trMult);
    if (!E.spend(st, cost, "Eğitim: " + dog.name)) return { ok: false, msg: "Yetersiz puan." };
    dog.energy -= T.energy_cost;
    dog.trained[stat] = (dog.trained[stat] || 0) + 1;
    st.stats.trainings++;
    E.quests.progress(st, "train_dog", 1);
    G.checkAchievements(); G.save();
    return { ok: true, cost: cost, gain: 1 };
  };
  A.useItemOnDog = function (itemId, uid) {
    var st = G.state, dog = U.dogByUid(uid), it = E.item(itemId);
    if (!dog || !it || (st.inventory[itemId] || 0) <= 0) return { ok: false, msg: "Eşya yok." };
    var ef = it.effect;
    if (ef.type === "xp") {
      st.inventory[itemId]--;
      st.stats.itemsUsed++;
      G.addXp(dog, ef.amount);
      E.quests.progress(st, "use_item", 1);
      G.save();
      return { ok: true, msg: dog.name + " +" + E.fmt.num(ef.amount) + " XP kazandı." };
    }
    if (ef.type === "energy") {
      st.inventory[itemId]--;
      st.stats.itemsUsed++;
      dog.energy = Math.min(100, dog.energy + ef.amount);
      if (ef.xp) G.addXp(dog, ef.xp);
      E.quests.progress(st, "use_item", 1);
      G.save();
      return { ok: true, msg: dog.name + " enerjisi yenilendi." };
    }
    return { ok: false, msg: "Bu eşya köpek üzerinde kullanılamaz." };
  };
  A.useItem = function (itemId) {
    var st = G.state, it = E.item(itemId);
    if (!it || (st.inventory[itemId] || 0) <= 0) return { ok: false, msg: "Eşya yok." };
    if (it.effect.type === "player_energy") {
      st.inventory[itemId]--;
      st.dogs.forEach(function (d) { d.energy = Math.min(100, d.energy + it.effect.amount); });
      st.stats.itemsUsed++;
      E.quests.progress(st, "use_item", 1);
      G.save();
      return { ok: true, msg: "Tüm köpeklerin enerjisi +" + it.effect.amount + "." };
    }
    return { ok: false, msg: "Bu eşya buradan kullanılamaz." };
  };
  A.activateBooster = function (itemId) {
    var st = G.state, it = E.item(itemId);
    if (!it || it.kind !== "booster" || (st.inventory[itemId] || 0) <= 0) return { ok: false, msg: "Eşya yok." };
    st.inventory[itemId]--;
    st.boosters.push({ id: itemId, type: it.effect.type, mult: it.effect.amount, endsAt: Date.now() + it.effect.hours * 3600000 });
    st.stats.itemsUsed++;
    E.quests.progress(st, "use_item", 1);
    E.notify(st, "Booster aktif: " + it.name_tr, "ok");
    G.save();
    return { ok: true, msg: it.name_tr + " aktif!" };
  };
  G.addXp = function (dog, amount) {
    dog.xp += Math.max(1, Math.round(amount * E.stats.xpMult(dog)));
    var leveled = 0;
    while (dog.level < E.bal().levels.max_level && dog.xp >= E.stats.xpNeeded(dog.level)) {
      dog.xp -= E.stats.xpNeeded(dog.level);
      dog.level++;
      leveled++;
    }
    if (leveled) {
      G.state.stats.maxDogLevel = Math.max(G.state.stats.maxDogLevel, dog.level);
      E.notify(G.state, dog.name + " seviye atladı → " + dog.level, "ok");
    }
    return leveled;
  };
  A.claimQuest = function (i) {
    var st = G.state, q = st.quests.list[i];
    if (!q) return { ok: false, msg: "Görev yok." };
    if (!q.done || q.claimed) return { ok: false, msg: "Ödül hazır değil." };
    q.claimed = true;
    E.gain(st, q.points, "Görev: " + q.text);
    st.dogs.forEach(function (d) { G.addXp(d, Math.round(q.xp / Math.max(1, st.dogs.length)) + 1); });
    G.checkAchievements(); G.save();
    return { ok: true, points: q.points, xp: q.xp };
  };
  A.rerollQuests = function () {
    var st = G.state;
    if (!E.spend(st, E.bal().daily.quest_reroll_cost, "Görev yenileme")) return { ok: false, msg: "Yetersiz puan." };
    st.quests = E.quests.rollDaily((Math.random() * 1e9) | 0, Date.now());
    G.save();
    return { ok: true, msg: "Yeni görevler çekildi." };
  };
  G.applyCrateReward = function (roll) {
    var st = G.state;
    if (roll.type === "dog") {
      var dog = E.makeDog(roll.breedId, { seed: (Math.random() * 1e9) | 0 });
      G.addDog(dog, "Kasa ödülü");
      return dog;
    }
    if (roll.type === "points") { E.gain(st, roll.points, "Kasa puan ödülü"); return null; }
    st.inventory[roll.item] = (st.inventory[roll.item] || 0) + (roll.itemCount || 1);
    return null;
  };
  G.addDog = function (dog, source) {
    var st = G.state;
    if (st.dogs.length >= E.bal().economy.max_dogs) {
      E.notify(st, "Kennel dolu! (" + E.bal().economy.max_dogs + ") Yeni köpek satıldı/eklenemedi.", "warn");
      return false;
    }
    st.dogs.push(dog);
    E.registerBreed(st, dog.breedId);
    if (dog.rarity === "efsanevi") st.stats.legendaryObtained++;
    if (dog.rarity === "mitik") st.stats.mythicObtained++;
    E.quests.progress(st, "obtain_rarity", 1, dog.rarity);
    E.notify(st, (source || "Yeni köpek") + ": " + dog.name + " (" + E.breed(dog.breedId).name_tr + ")", "ok");
    return true;
  };
  A.openCrate = function (crateId, price) {
    var st = G.state;
    var c = E.crate(crateId);
    if (!c) return { ok: false, msg: "Kasa yok." };
    if (st.balance < price) return { ok: false, msg: "Yetersiz bakiye! Gereken: " + E.fmt.num(price) };
    if (!E.spend(st, price, "Kasa: " + c.name_tr)) return { ok: false, msg: "Yetersiz bakiye." };
    var luck = st.luck && st.luck.uses > 0 ? st.luck.mult : 1;
    if (st.luck && st.luck.uses > 0) st.luck.uses--;
    var roll = E.crates.open(crateId, { seed: (Date.now() ^ (Math.random() * 1e9)) | 0, luckMult: luck });
    var dog = G.applyCrateReward(roll);
    st.stats.cratesOpened++;
    E.quests.progress(st, "open_crate", 1);
    E.txLog(st, {
      type: "crate", amount: -price, reason: c.name_tr + " açıldı",
      detail: roll.type === "dog" ? E.breed(roll.breedId).name_tr : (roll.type === "points" ? "+" + E.fmt.num(roll.points) : E.item(roll.item).name_tr)
    });
    G.checkAchievements(); G.save();
    return { ok: true, roll: roll, dog: dog };
  };
  A.breed = function (mUid, fUid, name) {
    var st = G.state, now = Date.now();
    var m = U.dogByUid(mUid), f = U.dogByUid(fUid);
    if (!m || !f) return { ok: false, msg: "Köpek seç." };
    var comp = E.genetics.compatible(m, f, now);
    if (!comp.ok) return { ok: false, msg: comp.problems.join(" ") };
    var evMult = 1, cdMult = 1, mutBonus = 0;
    E.events.active(now).forEach(function (e) {
      if (e.effect.breed_cost_mult) evMult *= e.effect.breed_cost_mult;
      if (e.effect.breed_cooldown_mult) cdMult *= e.effect.breed_cooldown_mult;
      if (e.effect.mutation_chance_bonus) mutBonus += e.effect.mutation_chance_bonus;
    });
    var cost = E.genetics.cost(m, f, evMult);
    if (!E.spend(st, cost, "Çiftleştirme: " + m.name + " × " + f.name)) return { ok: false, msg: "Yetersiz puan (" + E.fmt.num(cost) + ")." };
    var forceMut = (st.inventory.mutation_serum || 0) > 0;
    if (forceMut) st.inventory.mutation_serum--;
    var res = E.genetics.breedPair(m, f, { seed: (Date.now() ^ (Math.random() * 1e9)) | 0, now: now, name: name || undefined, mutationBonus: mutBonus, forceMutation: forceMut });
    var cd = Math.max(E.genetics.cooldownMs(m.rarity, cdMult), E.genetics.cooldownMs(f.rarity, cdMult));
    m.breedCooldownUntil = now + cd; f.breedCooldownUntil = now + cd;
    m.energy = Math.max(0, m.energy - E.bal().breeding.energy_cost);
    f.energy = Math.max(0, f.energy - E.bal().breeding.energy_cost);
    G.addDog(res.dog, "Yavru");
    st.stats.puppiesBred++;
    E.quests.progress(st, "breed", 1);
    E.txLog(st, { type: "spend", amount: cost, reason: "Çiftleştirme " + m.name + "×" + f.name + " → " + res.dog.name });
    G.checkAchievements(); G.save();
    return { ok: true, dog: res.dog, report: res.report };
  };
  A.startBattle = function (teamUids, seed, friendName) {
    var st = G.state, now = Date.now();
    if (teamUids.length !== 4) return { ok: false, msg: "4 köpek seç." };
    var team = teamUids.map(U.dogByUid);
    for (var i = 0; i < team.length; i++) {
      if (!team[i]) return { ok: false, msg: "Köpek bulunamadı." };
      if (!E.stats.stageInfo(team[i], now).can_battle) return { ok: false, msg: team[i].name + " henüz savaşamaz (yavru)." };
      if (team[i].inMarket) return { ok: false, msg: team[i].name + " pazarda." };
    }
    var rnd = E.rng.from(seed);
    var oppTeam, oppName, oppRating;
    if (friendName) {
      var fr = st.friends.list.filter(function (x) { return x.name === friendName || x.code === friendName; })[0];
      oppName = fr ? fr.name : friendName;
      oppRating = fr ? fr.rating : st.arena.rating;
      oppTeam = E.battle.botTeam(oppRating, rnd, now);
    } else {
      oppRating = Math.round(st.arena.rating * (0.82 + 0.36 * rnd()));
      oppName = "Bot Takımı (" + oppRating + ")";
      oppTeam = E.battle.botTeam(oppRating, rnd, now);
    }
    var buffMult = 1;
    if (st.battleBanner && st.battleBanner.battlesLeft > 0) { buffMult = st.battleBanner.mult; st.battleBanner.battlesLeft--; }
    var sim = E.battle.simulate(team, oppTeam, { seed: seed, now: now, buffMult: buffMult });
    var win = sim.winner === "A" ? "win" : sim.winner === "B" ? "loss" : "draw";
    var B = E.bal().battle;
    var evMult = 1;
    E.events.active(now).forEach(function (e) { if (e.effect.battle_reward_mult) evMult *= e.effect.battle_reward_mult; });
    var reward = Math.round((win === "win" ? B.reward_win_points : win === "loss" ? B.reward_loss_points : B.reward_draw_points) * evMult);
    E.gain(st, reward, "Arena ödülü (" + win + ")");
    var xp = win === "win" ? B.xp_win : B.xp_loss;
    team.forEach(function (d) { G.addXp(d, xp); d.energy = Math.max(0, d.energy - 10); });
    var K = win === "win" ? B.elo_k_win : B.elo_k_loss;
    E.events.active(now).forEach(function (e) { if (e.effect.elo_k_mult) K = Math.round(K * e.effect.elo_k_mult); });
    var score = win === "win" ? 1 : win === "draw" ? 0.5 : 0;
    var delta = E.battle.elo(st.arena.rating, oppRating, score, K) - st.arena.rating;
    st.arena.rating += delta;
    if (win === "win") st.arena.wins++; else if (win === "loss") st.arena.losses++; else st.arena.draws++;
    st.arena.tier = E.tierOf(st.arena.rating);
    st.arena.history.unshift({ ts: now, win: win, opp: oppName, oppRating: oppRating, delta: delta, reward: reward, turns: sim.turns });
    if (st.arena.history.length > 40) st.arena.history.length = 40;
    if (win === "win") E.quests.progress(st, "battle_win", 1);
    E.quests.progress(st, "battle_play", 1);
    E.txLog(st, { type: win === "loss" ? "spend" : "gain", amount: reward, reason: "Arena: " + oppName });
    G.checkAchievements(); G.save();
    return { ok: true, sim: sim, reward: reward, delta: delta, xp: xp, oppName: oppName };
  };
  A.listDog = function (uid, price) {
    var st = G.state;
    var dog = U.dogByUid(uid);
    if (!dog) return { ok: false, msg: "Köpek yok." };
    var act = st.market.listings.filter(function (l) { return !l.sold; });
    if (act.length >= E.bal().market.max_active_listings) return { ok: false, msg: "En fazla " + E.bal().market.max_active_listings + " aktif ilan." };
    if (!price || price < E.bal().market.min_price || price > E.bal().market.max_price) return { ok: false, msg: "Geçersiz fiyat." };
    dog.inMarket = true;
    st.market.listings.unshift({
      id: "M" + Date.now().toString(36) + Math.floor(Math.random() * 999),
      seller: st.profile.name, sellerCode: st.profile.code, dog: dog, price: price,
      value: E.stats.marketValue(dog, Date.now()), createdAt: Date.now()
    });
    E.quests.progress(st, "market_list", 1);
    G.save();
    return { ok: true, msg: "İlan yayınlandı." };
  };
  A.cancelListing = function (id) {
    var st = G.state;
    var l = st.market.listings.filter(function (x) { return x.id === id && !x.sold; })[0];
    if (!l) return { ok: false, msg: "İlan yok." };
    l.sold = true; l.cancelled = true;
    var d = U.dogByUid(l.dog.uid);
    if (d) d.inMarket = false;
    G.save();
    return { ok: true, msg: "İlan iptal edildi." };
  };
  A.buyListing = function (id) {
    var st = G.state;
    G.refreshBotListings();
    var all = (st.market.botListings || []).concat(st.market.listings);
    var l = all.filter(function (x) { return x.id === id && !x.sold; })[0];
    if (!l) return { ok: false, msg: "İlan artık yok." };
    if (l.sellerCode === st.profile.code) return { ok: false, msg: "Kendi ilanını alamazsın." };
    if (st.balance < l.price) return { ok: false, msg: "Yetersiz bakiye (" + E.fmt.num(l.price) + " gerekli)." };
    if (!E.spend(st, l.price, "Pazar alış: " + l.dog.name)) return { ok: false, msg: "Yetersiz bakiye." };
    l.sold = true;
    var dog = JSON.parse(JSON.stringify(l.dog));
    dog.uid = "D" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 99);
    dog.inMarket = false;
    G.addDog(dog, "Pazardan alındı");
    st.stats.marketBuys++;
    st.market.history.unshift({ ts: Date.now(), type: "buy", text: l.dog.name + " satın alındı (" + l.seller + ")", amount: -l.price });
    E.quests.progress(st, "market_buy", 1);
    E.txLog(st, { type: "spend", amount: l.price, reason: "Pazar alış " + l.dog.name });
    G.checkAchievements(); G.save();
    return { ok: true, dog: dog };
  };
  /* ---------------------------------------------------------- ARKADAS ----- */
  A.addFriend = function (codeOrName) {
    var st = G.state;
    var v = codeOrName.trim();
    if (!v) return { ok: false, msg: "Kod gir." };
    if (v.toUpperCase() === st.profile.code) return { ok: false, msg: "Kendini ekleyemezsin." };
    var demo = null;
    if (v.toLowerCase() === "demo") demo = DEMO_PLAYERS[Math.floor(Math.random() * DEMO_PLAYERS.length)];
    else demo = DEMO_PLAYERS.filter(function (p) {
      return p.code.toUpperCase() === v.toUpperCase() || p.name.toLowerCase() === v.toLowerCase();
    })[0];
    if (st.online.mode === "online") {
      PL.net.addFriend(v, function (ok, msg) { U.toast(msg, ok ? "ok" : "err"); });
      return { ok: true, msg: "İstek sunucuya gönderildi." };
    }
    if (!demo) return { ok: false, msg: "Oyuncu bulunamadı. (Yerel modda 'demo' yazarak demo arkadaş ekleyebilirsin.)" };
    if (st.friends.list.some(function (f) { return f.code === demo.code; })) return { ok: false, msg: "Zaten arkadaşsınız." };
    if (st.friends.outgoing.some(function (f) { return f.code === demo.code; })) return { ok: false, msg: "İstek zaten bekliyor." };
    st.friends.outgoing.push({ code: demo.code, name: demo.name });
    // demo oyuncu birazdan kabul eder
    setTimeout(function () {
      var oi = st.friends.outgoing.map(function (f) { return f.code; }).indexOf(demo.code);
      if (oi >= 0) {
        st.friends.outgoing.splice(oi, 1);
        st.friends.list.push({
          code: demo.code, name: demo.name, rating: demo.rating, dogs: demo.dogs,
          breeds: demo.breeds, title: demo.title, online: Math.random() < 0.6, since: Date.now()
        });
        st.stats.friendsAdded++;
        E.quests.progress(st, "add_friend", 1);
        E.notify(st, demo.name + " arkadaşlık isteğini kabul etti.", "ok");
        G.checkAchievements(); G.save();
      }
    }, 2500);
    E.quests.progress(st, "add_friend", 0);
    G.save();
    return { ok: true, msg: "İstek gönderildi: " + demo.name };
  };
  A.acceptFriend = function (code) {
    var st = G.state;
    var i = st.friends.incoming.map(function (f) { return f.code; }).indexOf(code);
    if (i < 0) return { ok: false };
    var f = st.friends.incoming.splice(i, 1)[0];
    st.friends.list.push(f);
    st.stats.friendsAdded++;
    E.quests.progress(st, "add_friend", 1);
    G.checkAchievements(); G.save();
    return { ok: true };
  };
  A.declineFriend = function (code) {
    var st = G.state;
    st.friends.incoming = st.friends.incoming.filter(function (f) { return f.code !== code; });
    G.save(); return { ok: true };
  };
  A.removeFriend = function (code) {
    var st = G.state;
    st.friends.list = st.friends.list.filter(function (f) { return f.code !== code; });
    G.save(); return { ok: true };
  };
  A.inviteFriend = function (code) {
    var st = G.state;
    var f = st.friends.list.filter(function (x) { return x.code === code; })[0];
    if (!f) return { ok: false, msg: "Arkadaş yok." };
    G._friendBattle = f.name;
    E.notify(st, f.name + " arena davetini kabul etti!", "ok");
    return { ok: true, msg: f.name + " ile arena maçı başlıyor..." };
  };

  /* ------------------------------------------------------------- CHROME --- */
  function buildChrome() {
    var nav = document.querySelector("#bottomNav");
    if (!nav) return;
    var items = [
      ["hub", "icon_home", "Üs"], ["collection", "icon_collection", "Köpekler"],
      ["crates", "icon_crate", "Kasa"], ["arena", "icon_sword", "Arena"],
      ["market", "icon_market", "Pazar"], ["more", "icon_settings", "Menü"]
    ];
    nav.innerHTML = items.map(function (it) {
      return "<button class='navBtn' data-screen='" + it[0] + "'>" + U.icon(it[1]) + "<span>" + (PL.i18n ? PL.i18n.t(it[2]) : it[2]) + "</span></button>";
    }).join("");
    nav.querySelectorAll(".navBtn").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = b.getAttribute("data-screen");
        if (s === "more") openMoreMenu();
        else U.show(s);
      });
    });
    var bell = document.querySelector("#topBell");
    if (bell) bell.addEventListener("click", function () { U.show("notifications"); });
    var avb = document.querySelector("#topAvatarBtn");
    if (avb) avb.addEventListener("click", function () { U.show("profile"); });
  }
  function openMoreMenu() {
    var items = [
      ["breed", "icon_dna", "Çiftleştirme & Genetik"], ["friends", "icon_friends", "Arkadaşlar"],
      ["quests", "icon_quests", "Günlük Görevler"], ["achievements", "icon_achieve", "Başarımlar"],
      ["events", "icon_banner", "Etkinlikler"], ["leaderboard", "icon_arena", "Sıralama"],
      ["inventory", "icon_inventory", "Envanter"], ["profile", "icon_profile", "Profil"],
      ["settings", "icon_settings", "Ayarlar"], ["help", "icon_help", "Yardım"]
    ];
    var m = U.modal({
      title: "Menü",
      body: "<div class='menuGrid'>" + items.map(function (it) {
        return "<button class='menuItem' data-go='" + it[0] + "'>" + U.icon(it[1]) + "<span>" + it[2] + "</span></button>";
      }).join("") + "</div>"
    });
    m.body.querySelectorAll(".menuItem").forEach(function (b) {
      b.addEventListener("click", function () { m.close(); U.show(b.getAttribute("data-go")); });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", G.boot);
  else G.boot();
})(typeof window !== "undefined" ? window : globalThis);
