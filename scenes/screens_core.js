/* =============================================================================
   PAW LEGENDS — ekranlar (1/2): giris, us, koleksiyon, kopek detay, envanter,
   profil, ayarlar, yardim, bildirimler, gorevler, basarimlar, etkinlikler,
   siralama tablosu
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var E = PL.engine, U = PL.ui;
  var el = U.el, esc = U.esc;

  /* ------------------------------------------------------------- GIRIS ---- */
  U.registerScreen("login", {
    music: "music_menu",
    render: function () {
      var d = el("div", { class: "screen loginScreen" });
      d.innerHTML =
        "<div class='loginBg' style='background-image:url(\"assets/backgrounds/bg_menu.webp\")'></div>" +
        "<div class='loginBox'>" +
        "<div class='logoWrap'><div class='logoPaw'>" + U.icon("icon_paw", "logo") + "</div>" +
        "<h1 class='logoTitle'>PAW LEGENDS</h1><div class='logoSub'>DOG WORLD</div></div>" +
        "<form id='loginForm' class='loginForm'>" +
        "<label>Yetiştirici Adı</label>" +
        "<input id='loginName' maxlength='18' placeholder='örn. Bozkurt' autocomplete='off'>" +
        "<button class='btn gold big' type='submit'>Yeni Maceraya Başla</button>" +
        "<div class='loginAlt'>" +
        "<button class='btn ghost' type='button' id='btnContinue' style='display:none'>Kayda Devam Et</button>" +
        "<button class='btn ghost' type='button' id='btnImport'>Kayıt İçe Aktar</button>" +
        "<button class='btn ghost' type='button' id='btnCode'>Sunucu Kodu ile Giriş</button>" +
        "</div>" +
        "<div class='loginNote'>Çevrimdışı oynanabilir • Veriler bu cihazda saklanır • " +
        "İstersen yerel sunucuya bağlanıp çevrim içi pazara ve arkadaş sistemine geçebilirsin.</div>" +
        "</form></div>";
      var st = PL.save.load(localStorage);
      if (st) d.querySelector("#btnContinue").style.display = "";
      d.querySelector("#loginForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var name = d.querySelector("#loginName").value.trim() || "Yetiştirici";
        PL.game.startNew(name);
        U.replace("hub");
      });
      d.querySelector("#btnContinue").addEventListener("click", function () {
        PL.game.resume();
        U.replace("hub");
      });
      d.querySelector("#btnImport").addEventListener("click", function () {
        U.modal({
          title: "Kayıt İçe Aktar",
          body: "<p>Dışa aktardığın kayıt kodunu yapıştır:</p><textarea id='impTa' rows='6' placeholder='eyJ2Ijo3...'></textarea>",
          buttons: [{ label: "Vazgeç", cls: "ghost" }, {
            label: "İçe Aktar", cls: "gold", onClick: function () {
              var s = U.$("#impTa").value;
              var obj = PL.save.import(s);
              if (!obj || !obj.v) { U.toast("Geçersiz kayıt kodu.", "err"); U.sfx("ui_error"); return; }
              PL.save.store(localStorage, obj);
              PL.game.resume();
              U.replace("hub");
              U.toast("Kayıt içe aktarıldı.", "ok");
            }
          }]
        });
      });
      d.querySelector("#btnCode").addEventListener("click", function () {
        var lastSrv = "";
        try { lastSrv = localStorage.getItem("paw_server") || ""; } catch (e) { }
        if (!lastSrv && location.protocol === "https:") lastSrv = location.origin;
        U.modal({
          title: "Sunucu Kodu ile Giriş",
          body: "<p class='muted'>Admin panelinden senin için oluşturulan oyuncu kodunu gir (PAW-XXXXXX). Sunucudaki köpeklerin ve puanın bu cihaza yüklenir.</p>" +
            "<label>Sunucu Adresi</label><input id='srvUrl' class='input' placeholder='http://localhost:8787' value='" + esc(lastSrv) + "'>" +
            "<label>Oyuncu Kodu</label><input id='srvCode' class='input' placeholder='PAW-XXXXXX' maxlength='10' style='text-transform:uppercase'>",
          buttons: [{ label: "Vazgeç", cls: "ghost" }, {
            label: "Giriş", cls: "gold", onClick: function () {
              var url = U.$("#srvUrl").value.trim();
              var code = U.$("#srvCode").value.trim().toUpperCase();
              if (!url || !/^PAW-[A-Z0-9]{6}$/.test(code)) { U.toast("Sunucu adresi ve geçerli bir kod (PAW-XXXXXX) gir.", "err"); U.sfx("ui_error"); return; }
              PL.net.remoteLogin(url, code, function (ok, j, base) {
                if (!ok || !j || !j.token) { U.toast("Giriş başarısız: " + ((j && j.error) || "?"), "err"); U.sfx("ui_error"); return; }
                var st = E.save.defaultState((j.user && j.user.name) || "Yetiştirici");
                st.profile.code = j.user.code;
                st.balance = Number(j.balance) || 0;
                st.dogs = (j.dogsList || []).slice();
                var acks = st.dogs.map(function (x) { return x.uid; });
                if (!st.dogs.length) E.save.starterDogs(st);
                PL.game.state = st;
                PL.net.url = base; PL.net.token = j.token; PL.net.online = true;
                st.online = { mode: "online", server: base, user: j.user, token: j.token };
                try { localStorage.setItem("paw_server", base); } catch (e2) { }
                PL.game.save();
                if (PL.game.applySettings) PL.game.applySettings();
                if (acks.length) {
                  var xa = new XMLHttpRequest();
                  xa.open("POST", base + "/api/dogs/ack", true);
                  xa.setRequestHeader("Content-Type", "application/json");
                  xa.setRequestHeader("X-Auth", j.token);
                  xa.send(JSON.stringify({ uids: acks }));
                }
                U.replace("hub");
                U.toast("Hoş geldin " + st.profile.name + "! " + st.dogs.length + " köpek yüklendi.", "ok");
              });
            }
          }]
        });
      });
      return d;
    }
  });

  /* --------------------------------------------------------------- US ----- */
  U.registerScreen("hub", {
    music: "music_farm",
    render: function () {
      var st = PL.game.state, now = Date.now();
      var pps = E.economy.totalPerSec(st, now);
      var pending = E.economy.pending(st, now);
      var d = el("div", { class: "screen" });
      var evs = E.events.active(now);
      var evHtml = evs.length ? "<div class='eventStrip'>" + evs.map(function (e) {
        return "<span class='evChip'>" + U.icon("icon_star") + esc(e.name_tr) + "</span>";
      }).join("") + "</div>" : "";
      d.innerHTML =
        "<div class='hubBg' style='background-image:url(\"assets/backgrounds/bg_farm.webp\")'></div>" +
        "<div class='hubWrap'>" +
        evHtml +
        "<div class='heroCard'>" +
        "<div class='heroAvatar' style='background-image:url(\"" + E.breed(st.profile.avatarBreed).image + "\")'></div>" +
        "<div class='heroInfo'><h2>" + esc(st.profile.name) + "</h2>" +
        "<div class='heroCode'>" + esc(st.profile.code) + " • " + esc(st.arena ? E.tierOf(st.arena.rating) : "") + "</div>" +
        "<div class='heroStats'>" +
        "<span>" + U.icon("icon_paw") + " " + st.dogs.length + " köpek</span>" +
        "<span>" + U.icon("icon_sword") + " " + (st.arena.wins || 0) + "G/" + (st.arena.losses || 0) + "M</span>" +
        "<span>" + U.icon("icon_star") + " " + (st.stats.breedsDiscovered || []).length + "/100 ırk</span>" +
        "</div></div>" +
        "<button class='btn gold' id='btnCollect'>" + U.icon("icon_points") +
        " Topla <b id='pendVal'>" + E.fmt.compact(pending) + "</b></button>" +
        "<div class='ppsLine'>Saniyede <b>" + pps.toFixed(2) + "</b> puan • Günde <b>" +
        E.fmt.compact(pps * 86400) + "</b> puan</div>" +
        "</div>" +
        "<div class='hubGrid'>" +
        hubTile("crates", "icon_crate", "Kasalar", "5 kasa • şansını dene") +
        hubTile("breed", "icon_dna", "Çiftleştir", "Genetik & yavrular") +
        hubTile("arena", "icon_sword", "Arena", "4'e 4 savaş") +
        hubTile("wolf", "icon_sword", "Kurt Akını", "3 dalga PvE") +
        hubTile("agility", "icon_arena", "Çeviklik Parkuru", "mini oyun") +
        hubTile("shop", "icon_coin", "Mağaza", "Puan & Yıldız") +
        hubTile("invite", "icon_friends", "Davet Et", "Ödül kazan") +
        hubTile("table", "icon_arena", "Dörtlü Masa", "4 kişilik oyun") +
        hubTile("market", "icon_market", "Pazar", "Al & sat") +
        hubTile("collection", "icon_collection", "Koleksiyon", st.dogs.length + " köpek") +
        hubTile("quests", "icon_quests", "Görevler", questBadge()) +
        hubTile("inventory", "icon_inventory", "Envanter", itemCount()) +
        hubTile("friends", "icon_friends", "Arkadaşlar", (st.friends.list || []).length + " kişi") +
        hubTile("achievements", "icon_achieve", "Başarımlar", achCount()) +
        hubTile("events", "icon_banner", "Etkinlikler", evs.length + " aktif") +
        hubTile("leaderboard", "icon_arena", "Sıralama", "Lig tablosu") +
        hubTile("help", "icon_help", "Yardım", "Rehber") +
        "</div>" +
        "<div class='hubDogs'><div class='secTitle'><h2>Kennel</h2><span>En üretken 4 köpeğin</span></div>" +
        "<div class='kennelRow' id='kennelRow'></div></div>" +
        "</div>";
      function hubTile(screen, ic, title, sub) {
        return "<button class='hubTile' data-go='" + screen + "'>" + U.icon(ic) +
          "<b>" + esc(title) + "</b><span>" + esc(sub) + "</span></button>";
      }
      function questBadge() {
        var q = st.quests && st.quests.list || [];
        var done = q.filter(function (x) { return x.done && !x.claimed; }).length;
        return done ? done + " ödül hazır" : q.length + " günlük görev";
      }
      function itemCount() {
        var n = 0; for (var k in st.inventory) n += st.inventory[k];
        return n + " eşya";
      }
      function achCount() {
        return Object.keys(st.achievements.unlocked).length + "/" + PL.DB.achievements.length;
      }
      d.querySelectorAll(".hubTile").forEach(function (b) {
        b.addEventListener("click", function () { U.show(b.getAttribute("data-go")); });
      });
      d.querySelector("#btnCollect").addEventListener("click", function () { PL.game.collect(true); });
      var row = d.querySelector("#kennelRow");
      var top = st.dogs.slice().sort(function (a, b) {
        return E.stats.productionPerSec(b, now, 1) - E.stats.productionPerSec(a, now, 1);
      }).slice(0, 4);
      if (!top.length) row.innerHTML = U.empty("icon_paw", "Henüz köpeğin yok", "Kasa açarak ilk köpeğini kazan!");
      else row.innerHTML = top.map(function (dg) { return U.dogCard(dg); }).join("");
      row.querySelectorAll(".dogCard").forEach(function (c) {
        c.addEventListener("click", function () { U.show("dogDetail", { uid: c.getAttribute("data-uid") }); });
      });
      return d;
    },
    onShow: function () {
      var iv = setInterval(function () {
        var pv = U.$("#pendVal");
        if (!pv || U.currentScreen() !== "hub") { clearInterval(iv); return; }
        pv.textContent = E.fmt.compact(E.economy.pending(PL.game.state, Date.now()));
      }, 1000);
    }
  });

  /* -------------------------------------------------------- KOLEKSIYON ---- */
  U.registerScreen("collection", {
    render: function (params) {
      var st = PL.game.state;
      var state = { q: "", rar: "all", sort: "rarity" };
      var d = el("div");
      function filtered() {
        var list = st.dogs.slice();
        if (state.rar !== "all") list = list.filter(function (x) { return x.rarity === state.rar; });
        if (state.q) {
          var q = state.q.toLowerCase();
          list = list.filter(function (x) {
            return x.name.toLowerCase().indexOf(q) >= 0 ||
              E.breed(x.breedId).name_tr.toLowerCase().indexOf(q) >= 0;
          });
        }
        var now = Date.now();
        list.sort(function (a, b) {
          if (state.sort === "level") return b.level - a.level;
          if (state.sort === "pps") return E.stats.productionPerSec(b, now, 1) - E.stats.productionPerSec(a, now, 1);
          if (state.sort === "name") return a.name.localeCompare(b.name, "tr");
          if (state.sort === "power") return E.stats.dogStats(b, now).power - E.stats.dogStats(a, now).power;
          return E.rarOrder(b.rarity) - E.rarOrder(a.rarity) || b.level - a.level;
        });
        return list;
      }
      function draw() {
        var list = filtered();
        var body = d.querySelector("#collGrid");
        if (!list.length) body.innerHTML = U.empty("icon_collection", "Köpek bulunamadı", "Filtreleri temizle veya kasa aç.");
        else body.innerHTML = list.map(function (x) { return U.dogCard(x); }).join("");
        body.querySelectorAll(".dogCard").forEach(function (c) {
          c.addEventListener("click", function () { U.show("dogDetail", { uid: c.getAttribute("data-uid") }); });
        });
        d.querySelector("#collCount").textContent = list.length + " / " + st.dogs.length;
      }
      var rarOpts = ["all"].concat(Object.keys(PL.DB.rarities)).map(function (k) {
        return "<option value='" + k + "'>" + (k === "all" ? "Tüm nadirlikler" : PL.DB.rarities[k].name_tr) + "</option>";
      }).join("");
      d.innerHTML = U.screenShell("Koleksiyon",
        "<div class='filterBar'>" +
        "<input id='collQ' class='input' placeholder='İsim veya ırk ara...'>" +
        "<select id='collRar' class='input'>" + rarOpts + "</select>" +
        "<select id='collSort' class='input'><option value='rarity'>Nadirliğe göre</option>" +
        "<option value='level'>Seviyeye göre</option><option value='pps'>Üretime göre</option>" +
        "<option value='power'>Güce göre</option><option value='name'>İsme göre</option></select>" +
        "<span class='pill' id='collCount'></span></div>" +
        "<div class='catalogInfo'>" + U.icon("icon_star") +
        " Keşfedilen ırk: <b>" + (st.stats.breedsDiscovered || []).length + "/100</b> • " +
        "Koleksiyon bonusu: <b>%" + Math.round((E.stats.collectionMult(st.dogs.length) - 1) * 100) + "</b></div>" +
        "<div class='grid' id='collGrid'></div>", { wide: true }).innerHTML;
      d.querySelector("#collQ").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
      d.querySelector("#collRar").addEventListener("change", function (e) { state.rar = e.target.value; draw(); });
      d.querySelector("#collSort").addEventListener("change", function (e) { state.sort = e.target.value; draw(); });
      draw();
      return d;
    }
  });

  /* ----------------------------------------------------- KOPEK DETAY ------ */
  U.registerScreen("dogDetail", {
    render: function (params) {
      var dog = U.dogByUid(params.uid);
      if (!dog) return U.screenShell("Köpek", U.empty("icon_paw", "Köpek bulunamadı", ""));
      var b = E.breed(dog.breedId), r = E.rar(dog.rarity), now = Date.now();
      var st = PL.game.state;
      var stats = E.stats.dogStats(dog, now);
      var bs = E.stats.battleStats(dog, now);
      var stage = E.stats.stageOf(dog, now);
      var xpNeed = E.stats.xpNeeded(dog.level);
      var cost = E.stats.levelUpCost(dog);
      var look = PL.DB.lookups[b.key];
      var d = el("div");
      var traitHtml = dog.traits.length ? dog.traits.map(function (t) {
        var tr = E.traits.filter(function (x) { return x.id === t; })[0];
        return tr ? "<span class='chip trait'>" + U.icon("icon_star") + esc(tr.name) + "<i>" + esc(tr.desc) + "</i></span>" : "";
      }).join("") : "<span class='chip muted'>Özel özellik yok</span>";
      var mutHtml = dog.mutation ? "<span class='chip mut'>" + U.icon("icon_serum") + esc(dog.mutation.name) +
        "<i>" + esc(dog.mutation.desc) + "</i></span>" : "";
      var GEAR_SLOTS = [["collar", "Tasma"], ["guard", "Boyunluk / Koruma"], ["med", "İlaç"]];
      function gearBuffText(it) {
        var parts = [];
        var NM = { power: "Güç", speed: "Hız", stamina: "Dayanıklılık", intelligence: "Zekâ", agility: "Çeviklik", defense: "Savunma", xp: "XP" };
        for (var bk in (it.buffs || {})) parts.push((NM[bk] || bk) + " +" + Math.round(it.buffs[bk] * 100) + "%");
        return parts.join(", ");
      }
      function gearEquippedCount(itemId) {
        var n = 0;
        st.dogs.forEach(function (x) { if (x.equips) for (var gs in x.equips) if (x.equips[gs] === itemId) n++; });
        return n;
      }
      var gearHtml = "<div class='panel'><h3>" + U.icon("icon_shield") + " Donanım</h3>" +
        GEAR_SLOTS.map(function (sl) {
          var slot = sl[0];
          var cur = dog.equips && dog.equips[slot];
          var curIt = cur ? E.item(cur) : null;
          var opts = ["<option value=''>— boş —</option>"];
          Object.keys(st.inventory).forEach(function (iid) {
            var it = E.item(iid);
            if (!it || !it.equip || it.equip.slot !== slot) return;
            var free = (st.inventory[iid] || 0) - gearEquippedCount(iid) + (cur === iid ? 1 : 0);
            if (free <= 0) return;
            opts.push("<option value='" + iid + "'>" + esc(it.name_tr) + " (" + gearBuffText(it) + ")</option>");
          });
          return "<div class='gearRow'><span class='gearSlot'>" + esc(sl[1]) + "</span>" +
            "<select class='input gearSel' data-gear='" + slot + "'>" + opts.join("") + "</select>" +
            (curIt ? "<i class='gearCur'>✓ " + esc(curIt.name_tr) + " — " + gearBuffText(curIt) + "</i>" : "") + "</div>";
        }).join("") +
        "<p class='muted'>Donanım bonusları savaş istatistiklerine ve XP kazancına anında yansır. Çivili seri ve Efsane İksir yalnızca mağazanın ⭐ Telegram Stars bölümünde.</p></div>";
      d.innerHTML = U.screenShell(dog.name,
        "<div class='dogHero rar-" + dog.rarity.replace(/[^a-z0-9]/gi, "") + "' style='--rc:" + r.color + ";--rcd:" + r.color_dark + "'>" +
        "<div class='dogHeroImg' style='background-image:url(\"" + b.image + "\")'></div>" +
        "<div class='dogHeroInfo'>" +
        "<h2>" + esc(b.name_tr) + " <span class='sex " + (dog.sex === "m" ? "m" : "f") + "'>" + (dog.sex === "m" ? "♂" : "♀") + "</span></h2>" +
        "<div class='dogMeta'>" + U.rarityBadge(dog.rarity) +
        "<span class='chip'>" + esc(b.group) + "</span><span class='chip'>" + esc(b.origin) + "</span>" +
        "<span class='chip'>" + esc(stage) + "</span><span class='chip'>Sv " + dog.level + "</span></div>" +
        "<div class='xpLine'>XP " + E.fmt.num(dog.xp) + " / " + E.fmt.num(xpNeed) + U.progress(dog.xp, xpNeed, "xp") + "</div>" +
        "<div class='ppsChip'>" + U.icon("icon_points") + " " +
        E.stats.productionPerSec(dog, now, 1).toFixed(2) + " puan/sn</div>" +
        "</div></div>" +
        "<p class='breedDesc'>" + esc(b.description_tr) + "</p>" +
        "<div class='abilityBox'><b>" + U.icon("icon_sword") + " " + esc(b.ability.name_tr) + "</b>" +
        "<span>" + esc(b.ability.desc_tr) + "</span><i>Bekleme: " + b.ability.cooldown + " tur</i></div>" +
        "<div class='panel'><h3>İstatistikler</h3>" +
        U.statRow("Güç", stats.power, 220, "#ff7043") +
        U.statRow("Hız", stats.speed, 220, "#4fc3f7") +
        U.statRow("Dayanıklılık", stats.stamina, 220, "#66bb6a") +
        U.statRow("Zekâ", stats.intelligence, 220, "#ab7df6") +
        U.statRow("Çeviklik", stats.agility, 220, "#ffd54f") +
        U.statRow("Savunma", stats.defense, 220, "#90a4ae") +
        "<div class='derived'>Can " + bs.maxHp + " • Saldırı " + bs.atk + " • Savunma " + bs.def + " • Hız " + bs.spd + "</div>" +
        "</div>" +
        "<div class='panel'><h3>Genetik & Özellikler</h3>" +
        "<div class='chips'>" + traitHtml + mutHtml +
        "<span class='chip " + (dog.purebred ? "ok" : "warn") + "'>" + (dog.purebred ? "Safkan" : "Melez") + "</span>" +
        "<span class='chip'>Nesil " + (dog.lineage ? dog.lineage.generation : 0) + "</span>" +
        "<span class='chip'>Enerji " + dog.energy + "/100</span></div>" +
        "<div class='geneGrid' id='geneGrid'></div>" +
        "</div>" +
        gearHtml +
        (dog.lineage && (dog.lineage.mother || dog.lineage.father) ?
          "<div class='panel'><h3>Soy Ağacı</h3><div class='lineage'>" +
          "<span>" + U.icon("icon_female_white") + " Anne: " + esc(parentName(dog.lineage.mother)) + "</span>" +
          "<span>" + U.icon("icon_male_white") + " Baba: " + esc(parentName(dog.lineage.father)) + "</span>" +
          "</div></div>" : "") +
        "<div class='actionRow'>" +
        "<button class='btn gold' id='btnUp'>" + U.icon("icon_xp") + " Seviye Atla (" + E.fmt.compact(cost) + ")</button>" +
        "<button class='btn blue' id='btnTrain'>" + U.icon("icon_brain") + " Eğit</button>" +
        "<button class='btn ghost' id='btnItems'>" + U.icon("icon_inventory") + " Eşya Kullan</button>" +
        "<button class='btn ghost' id='btnRename'>" + U.icon("icon_rename") + " İsim</button>" +
        "<button class='btn ghost' id='btnAvatar'>Avatar Yap</button>" +
        "</div>", { noBack: false }).innerHTML;
      function parentName(uid) {
        var p = U.dogByUid(uid);
        return p ? p.name : "Kayıt dışı";
      }
      // gen izgara
      var gg = d.querySelector("#geneGrid");
      var GENE_LABEL = { mask: "Maske", merle: "Merle", white: "Beyaz leke", brindle: "Brindle", dilute: "Renk açılması", long_fur: "Uzun tüy", prick: "Dik kulak", short_muzzle: "Kısa burun", blue_eye: "Mavi göz" };
      gg.innerHTML = Object.keys(dog.genes).map(function (k) {
        var a = dog.genes[k];
        return "<div class='gene'><b>" + esc(GENE_LABEL[k] || k) + "</b><span>" +
          (a[0] ? "A" : "a") + (a[1] ? "A" : "a") + "</span></div>";
      }).join("");
      d.querySelectorAll("[data-gear]").forEach(function (sel2) {
        var slot2 = sel2.getAttribute("data-gear");
        sel2.value = (dog.equips && dog.equips[slot2]) || "";
        sel2.addEventListener("change", function () {
          var v = sel2.value;
          dog.equips = dog.equips || {};
          if (v) dog.equips[slot2] = v; else delete dog.equips[slot2];
          if (!Object.keys(dog.equips).length) delete dog.equips;
          PL.game.save();
          U.sfx("reward_chime");
          U.toast(v ? "Kuşanıldı: " + E.item(v).name_tr + " (" + gearBuffText(E.item(v)) + ")" : "Donanım çıkarıldı", "ok");
          U.replace("dogDetail", { uid: dog.uid });
        });
      });
      d.querySelector("#btnUp").addEventListener("click", function () {
        var res = PL.game.actions.upgradeDog(dog.uid);
        if (res.ok) { U.toast("Seviye " + dog.level + "! 🎉", "ok"); U.sfx("level_up"); redraw(); }
        else { U.toast(res.msg, "err"); U.sfx("ui_error"); }
      });
      d.querySelector("#btnTrain").addEventListener("click", function () {
        var rows = E.stats.STAT_KEYS.map(function (k) {
          return "<button class='trainRow' data-k='" + k + "'><span>" + PL.DB.statLabels[k] +
            " (+" + ((dog.trained[k] || 0)) + ")</span><b>" + E.fmt.compact(E.stats.trainCost(dog, k)) +
            " • 1 enerji</b></button>";
        }).join("");
        U.modal({
          title: "Eğitim — " + esc(dog.name),
          body: "<p class='muted'>Eğitim kalıcı istatistik kazandırır. Enerji: <b>" + dog.energy + "/100</b></p><div class='trainList'>" + rows + "</div>",
          buttons: [{ label: "Kapat", cls: "ghost" }]
        });
        U.$$(".trainRow").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var res = PL.game.actions.trainDog(dog.uid, btn.getAttribute("data-k"));
            if (res.ok) { U.sfx("coin"); U.toast("+" + res.gain + " " + PL.DB.statLabels[btn.getAttribute("data-k")], "ok"); redraw(); }
            else { U.sfx("ui_error"); U.toast(res.msg, "err"); }
          });
        });
      });
      d.querySelector("#btnItems").addEventListener("click", function () {
        var usable = Object.keys(st.inventory).filter(function (k) {
          return st.inventory[k] > 0 && E.item(k) && (E.item(k).effect.type === "xp" || E.item(k).effect.type === "energy");
        });
        if (!usable.length) { U.toast("Bu köpekte kullanılabilir eşya yok.", "err"); return; }
        U.modal({
          title: "Eşya kullan — " + esc(dog.name),
          body: "<div class='trainList'>" + usable.map(function (k) {
            var it = E.item(k);
            return "<button class='trainRow' data-i='" + k + "'><span>" + U.icon(it.icon.replace("assets/ui/", "").replace(".svg", "")) +
              " " + esc(it.name_tr) + " ×" + st.inventory[k] + "</span><b>" + esc(it.desc_tr) + "</b></button>";
          }).join("") + "</div>",
          buttons: [{ label: "Kapat", cls: "ghost" }]
        });
        U.$$(".trainRow").forEach(function (btn) {
          btn.addEventListener("click", function () {
            var res = PL.game.actions.useItemOnDog(btn.getAttribute("data-i"), dog.uid);
            if (res.ok) { U.sfx("reward_chime"); U.toast(res.msg, "ok"); redraw(); }
            else U.toast(res.msg, "err");
          });
        });
      });
      d.querySelector("#btnRename").addEventListener("click", function () {
        U.modal({
          title: "Köpeği Yeniden Adlandır",
          body: "<input id='rnIn' class='input' maxlength='18' value='" + esc(dog.name) + "'>",
          buttons: [{ label: "Vazgeç", cls: "ghost" }, {
            label: "Kaydet", cls: "gold", onClick: function () {
              var v = U.$("#rnIn").value.trim();
              if (!v) return false;
              dog.name = v; U.saveNow(); redraw(); U.toast("İsim güncellendi.", "ok");
            }
          }]
        });
      });
      d.querySelector("#btnAvatar").addEventListener("click", function () {
        st.profile.avatarBreed = dog.breedId; U.saveNow(); U.updateTopBar();
        U.toast("Avatar güncellendi.", "ok");
      });
      function redraw() { U.saveNow(); U.show("dogDetail", { uid: dog.uid }, { noHistory: true }); }
      return d;
    }
  });

  /* ---------------------------------------------------------- ENVANTER ---- */
  U.registerScreen("inventory", {
    render: function () {
      var st = PL.game.state;
      var keys = Object.keys(st.inventory).filter(function (k) { return st.inventory[k] > 0; });
      var html;
      if (!keys.length) html = U.empty("icon_inventory", "Envanter boş", "Kasalardan ve görevlerden eşya kazanabilirsin.");
      else html = "<div class='invGrid'>" + keys.map(function (k) {
        var it = E.item(k);
        return "<div class='invCard' data-i='" + k + "'>" +
          U.icon(it.icon.replace("assets/ui/", "").replace(".svg", ""), "big") +
          "<b>" + esc(it.name_tr) + "</b><span class='invCount'>×" + st.inventory[k] + "</span>" +
          "<p>" + esc(it.desc_tr) + "</p><i>Değer: " + E.fmt.compact(it.value) + "</i></div>";
      }).join("") + "</div>";
      var d = U.screenShell("Envanter", html +
        "<div class='panel'><h3>İşlem Geçmişi (puan)</h3><div class='txList' id='txList'></div></div>");
      var tx = d.querySelector("#txList");
      tx.innerHTML = st.log.slice(0, 40).map(function (l) {
        return "<div class='tx " + l.type + "'><span>" + E.fmt.date(l.ts) + " • " + esc(l.reason || "") +
          "</span><b>" + (l.type === "gain" ? "+" : "−") + E.fmt.num(l.amount) + "</b></div>";
      }).join("") || "<p class='muted'>Henüz işlem yok.</p>";
      d.querySelectorAll(".invCard").forEach(function (c) {
        c.addEventListener("click", function () {
          var k = c.getAttribute("data-i");
          var it = E.item(k);
          if (it.kind === "booster") {
            U.confirm(it.name_tr, "Aktif edilsin mi? (" + esc(it.desc_tr) + ")", function () {
              var res = PL.game.actions.activateBooster(k);
              U.toast(res.msg, res.ok ? "ok" : "err");
            }, "Aktif Et");
          } else if (it.effect.type === "player_energy") {
            U.confirm(it.name_tr, "Oyuncu enerjisi yenilensin mi?", function () {
              var res = PL.game.actions.useItem(k);
              U.toast(res.msg, res.ok ? "ok" : "err");
            });
          } else {
            U.toast("Bu eşyayı bir köpeğin detay ekranından kullan.", "info");
          }
        });
      });
      return d;
    }
  });

  /* ------------------------------------------------------------ PROFIL ---- */
  U.registerScreen("profile", {
    render: function () {
      var st = PL.game.state;
      var d = U.screenShell("Profil",
        "<div class='profileHead'>" +
        "<div class='profAv' style='background-image:url(\"" + E.breed(st.profile.avatarBreed).image + "\")'></div>" +
        "<div><h2>" + esc(st.profile.name) + "</h2>" +
        "<div class='heroCode'>Oyuncu kodu: <b>" + esc(st.profile.code) + "</b> " +
        "<button class='miniBtn' id='copyCode'>Kopyala</button></div>" +
        "<div class='muted'>Katılım: " + E.fmt.date(st.profile.createdAt) + "</div></div></div>" +
        "<div class='statGrid'>" +
        pStat("Toplam kazanç", E.fmt.compact(st.stats.pointsEarned)) +
        pStat("Bakiye", E.fmt.compact(st.balance)) +
        pStat("Köpek", st.dogs.length) +
        pStat("Keşfedilen ırk", (st.stats.breedsDiscovered || []).length + "/100") +
        pStat("Açılan kasa", st.stats.cratesOpened) +
        pStat("Üretilen yavru", st.stats.puppiesBred) +
        pStat("Arena G/M/B", st.arena.wins + "/" + st.arena.losses + "/" + st.arena.draws) +
        pStat("Arena puanı", st.arena.rating + " (" + E.tierOf(st.arena.rating) + ")") +
        pStat("Pazar satışı", st.stats.marketSales) +
        pStat("Pazar alışları", st.stats.marketBuys) +
        pStat("Arkadaş", (st.friends.list || []).length) +
        pStat("Giriş serisi", st.login.streak + " gün") +
        "</div>" +
        "<div class='actionRow'>" +
        "<button class='btn ghost' id='btnExport'>" + U.icon("icon_inventory") + " Kaydı Dışa Aktar</button>" +
        "<button class='btn danger' id='btnReset'>Kaydı Sıfırla</button></div>", { noBack: false });
      function pStat(k, v) { return "<div class='statCard'><span>" + esc(k) + "</span><b>" + esc(String(v)) + "</b></div>"; }
      d.querySelector("#copyCode").addEventListener("click", function () {
        try { navigator.clipboard.writeText(st.profile.code); U.toast("Kod kopyalandı: " + st.profile.code, "ok"); }
        catch (e) { U.toast("Kod: " + st.profile.code, "info"); }
      });
      d.querySelector("#btnExport").addEventListener("click", function () {
        var code = PL.save.export(st);
        U.modal({
          title: "Kayıt Kodu", body: "<p class='muted'>Bu kodu güvenli bir yere kaydet:</p><textarea rows='6' readonly>" + code + "</textarea>",
          buttons: [{ label: "Kapat", cls: "gold" }]
        });
      });
      d.querySelector("#btnReset").addEventListener("click", function () {
        U.confirm("Kaydı Sıfırla", "TÜM ilerleme silinecek. Emin misin?", function () {
          PL.save.clear(localStorage); location.reload();
        }, "Evet, Sil");
      });
      return d;
    }
  });

  /* ------------------------------------------------------------ AYARLAR --- */
  U.registerScreen("settings", {
    render: function () {
      var st = PL.game.state, s = st.settings;
      var d = U.screenShell("Ayarlar",
        "<div class='panel'><h3>Ses</h3>" +
        toggle("music", "Arka plan müziği", s.music) +
        toggle("sfx", "Efekt sesleri", s.sfx) +
        slider("volM", "Müzik seviyesi", Math.round(U.audio.volMusic * 100)) +
        slider("volS", "Efekt seviyesi", Math.round(U.audio.volSfx * 100)) +
        "</div>" +
        "<div class='panel'><h3>Görüntü & Erişilebilirlik</h3>" +
        "<div class='setRow'><span>Grafik kalitesi</span><select id='setQ' class='input'>" +
        ["ultra", "high", "medium", "low"].map(function (q) {
          return "<option value='" + q + "'" + (s.quality === q ? " selected" : "") + ">" +
            ({ ultra: "Ultra", high: "Yüksek", medium: "Orta", low: "Düşük" })[q] + "</option>";
        }).join("") + "</select></div>" +
        toggle("reduce", "Animasyonları azalt", s.reduceMotion) +
        toggle("notif", "Bildirimler", s.notifications) +
        "</div>" +
        "<div class='panel'><h3>Dil</h3><div class='setRow'><span>Arayüz dili</span>" +
        "<select id='setLang' class='input'>" + PL.i18n.list().map(function (l) { return "<option value='" + l.code + "'" + ((s.lang || "tr") === l.code ? " selected" : "") + ">" + l.name + "</option>"; }).join("") + "</select></div>" +
        "<p class='muted'>11 dil destegi: cekirdek arayuz aninda cevrilir, Arapca'da yon sagdan sola gecer. Irk aciklamalari ve gorev metinleri gibi derin icerik su an Turkce.</p></div>" +
        "<div class='panel'><h3>Bağlantı</h3>" +
        "<div class='setRow'><span>Mod</span><b class='pill " + (st.online.mode === "online" ? "ok" : "") + "'>" +
        (st.online.mode === "online" ? "Çevrim içi (" + esc(st.online.server) + ")" : "Yerel / çevrimdışı") + "</b></div>" +
        "<div class='setRow'><input id='srvUrl' class='input' placeholder='http://localhost:8787' value='" + esc(st.online.server || (location.protocol === "https:" ? location.origin : "")) + "'>" +
        "<button class='btn blue' id='btnConnect'>Bağlan</button>" +
        "<button class='btn ghost' id='btnDisconnect' style='" + (st.online.mode === "online" ? "" : "display:none") + "'>Ayrıl</button></div>" +
        "<p class='muted'>Sunucu: server/index.js (Node, bağımlılıksız). Çevrim içi modda pazar, arkadaşlar ve " +
        "sıralama sunucuda doğrulanır; kazanç hesapları sunucu saatiyle yapılır.</p></div>" +
        "<div class='panel'><h3>Hakkında</h3><p class='muted'>PAW LEGENDS: DOG WORLD v" + E.version +
        " • Motor: özgün JS • Görseller: prosedürel üretim (SVG→WebP) • Sesler: özgün sentez</p></div>");
      function toggle(id, label, val) {
        return "<div class='setRow'><span>" + esc(label) + "</span><label class='switch'><input type='checkbox' id='set_" + id + "'" +
          (val ? " checked" : "") + "><i></i></label></div>";
      }
      function slider(id, label, val) {
        return "<div class='setRow'><span>" + esc(label) + "</span><input type='range' min='0' max='100' value='" + val + "' id='set_" + id + "'></div>";
      }
      d.querySelector("#set_music").addEventListener("change", function (e) {
        s.music = e.target.checked; U.audio.setMusicOn(s.music); U.saveNow();
      });
      d.querySelector("#set_sfx").addEventListener("change", function (e) { s.sfx = e.target.checked; U.audio.setSfxOn(s.sfx); U.saveNow(); });
      d.querySelector("#set_volM").addEventListener("input", function (e) {
        U.audio.volMusic = e.target.value / 100; if (U.audio.musicEl) U.audio.musicEl.volume = U.audio.volMusic;
      });
      d.querySelector("#set_volS").addEventListener("input", function (e) { U.audio.volSfx = e.target.value / 100; });
      d.querySelector("#setLang").addEventListener("change", function (e) { PL.i18n.set(e.target.value); });
      d.querySelector("#setQ").addEventListener("change", function (e) {
        s.quality = e.target.value;
        document.body.setAttribute("data-quality", s.quality);
        U.saveNow();
      });
      d.querySelector("#set_reduce").addEventListener("change", function (e) { s.reduceMotion = e.target.checked; U.saveNow(); });
      d.querySelector("#set_notif").addEventListener("change", function (e) { s.notifications = e.target.checked; U.saveNow(); });
      d.querySelector("#btnConnect").addEventListener("click", function () {
        var url = d.querySelector("#srvUrl").value.trim();
        if (!url) { U.toast("Sunucu adresi gir.", "err"); return; }
        PL.net.connect(url, function (ok, msg) {
          U.toast(msg, ok ? "ok" : "err");
          if (ok) U.show("settings", {}, { noHistory: true });
        });
      });
      d.querySelector("#btnDisconnect").addEventListener("click", function () {
        PL.net.disconnect(); U.show("settings", {}, { noHistory: true });
      });
      return d;
    }
  });

  /* ------------------------------------------------------------- YARDIM --- */
  U.registerScreen("help", {
    render: function () {
      var secs = [
        ["Hızlı Başlangıç", "Köpeklerin saniyede puan üretir. Üs ekranındaki <b>Topla</b> düğmesiyle biriken puanları al. " +
          "Puanlarla kasa aç, köpek seviyesi yükselt, eğitim ver ve pazarı kullan."],
        ["Pasif Üretim", "Üretim = ırk tabanı × seviye çarpanı × gelişim evresi × nadirlik × koleksiyon bonusu × etkinlier. " +
          "Oyun kapalıyken en fazla 8 saat birikir (%75 verim). Saat değiştirmeye karşı koruma aktiftir."],
        ["Kasalar", "5 kasa vardır: Gümüş 10B, Altın 50B, Elmas 100B, Efsanevi 200B, Mitik 500B. Bakiyen yoksa kasa açılmaz. " +
          "Her kasanın nadirlik olasılıkları kasa ekranında listelenir; ödüller köpek, puan veya eşya olabilir."],
        ["Çiftleştirme & Genetik", "İki yetişkin köpeği eşleştir: yavrunun istatistikleri ebeveynlerin genlerinden (alel çaprazlaması + " +
          "gauss sapması) hesaplanır. Maske, merle, brindle, uzun tüy, dik kulak gibi aleller baskınlık kurallarıyla aktarılır. " +
          "Akraba çiftleşmesi ceza, safkanlık bonus getirir. Mutasyon ve nadir özellik şansı düşüktür."],
        ["Arena (4'e 4)", "4 köpek seç, sıra tabanlı savaş motoru hız sırasına göre hamleleri işler. Hasar formülü: " +
          "saldırı × yetenek × (1 − savunma/(savunma+140)) × nadirlik çarpanı × kritik. İlk sürümde botlara karşı oynarsın; " +
          "çevrim içi modda sunucu eşleştirmesi eklenir."],
        ["Pazar", "Köpeklerini ilan et; yerel modda bot alıcılar fiyat/değer oranına göre teklif verir. Çevrim içi modda " +
          "tüm işlemler sunucuda atomik doğrulanır (çift satış ve çift harcama engelli)."],
        ["Arkadaşlar", "Profilindeki oyuncu kodunu paylaş. Yerel modda demo arkadaşlar vardır; çevrim içi modda gerçek " +
          "istek/ kabul sistemi ve arena daveti çalışır."],
        ["Veri & Güvenlik", "Kayıt tarayıcı localStorage'ında tutulur; Kayıt kodu ile dışa/içe aktarabilirsin. " +
          "Sunucu modunda HMAC oturum anahtarı kullanılır."],
      ];
      return U.screenShell("Yardım & Rehber",
        "<div class='helpList'>" + secs.map(function (s2) {
          return "<div class='panel'><h3>" + s2[0] + "</h3><p>" + s2[1] + "</p></div>";
        }).join("") + "</div>");
    }
  });

  /* --------------------------------------------------------- BILDIRIM ----- */
  U.registerScreen("notifications", {
    render: function () {
      var st = PL.game.state;
      st.notifications.forEach(function (n) { n.read = true; });
      U.saveNow();
      var html = st.notifications.length ? st.notifications.map(function (n) {
        return "<div class='notif " + n.kind + "'><span>" + E.fmt.date(n.ts) + "</span><p>" + esc(n.text) + "</p></div>";
      }).join("") : U.empty("icon_help", "Bildirim yok", "");
      return U.screenShell("Bildirimler", html);
    }
  });

  /* ------------------------------------------------------------ GOREVLER -- */
  U.registerScreen("quests", {
    render: function () {
      var st = PL.game.state;
      PL.game.ensureDailyQuests();
      var q = st.quests.list;
      var html = "<div class='questList'>" + q.map(function (it, i) {
        return "<div class='questCard" + (it.done ? " done" : "") + "'>" +
          "<div class='qTop'><b>" + esc(it.text) + "</b><span>" + it.progress + "/" + it.target + "</span></div>" +
          U.progress(it.progress, it.target, it.done ? "ok" : "") +
          "<div class='qFoot'><span>" + U.icon("icon_points") + " " + E.fmt.compact(it.points) + " • " +
          U.icon("icon_xp") + " " + it.xp + " XP</span>" +
          (it.claimed ? "<span class='pill ok'>Alındı</span>" :
            it.done ? "<button class='btn gold small' data-q='" + i + "'>Ödülü Al</button>" :
              "<span class='pill'>Devam ediyor</span>") +
          "</div></div>";
      }).join("") + "</div>" +
        "<div class='actionRow'><button class='btn ghost' id='qReroll'>" + U.icon("icon_clock") +
        " Görevleri Yenile (" + E.fmt.compact(E.bal().daily.quest_reroll_cost) + ")</button>" +
        "<button class='btn ghost' id='qLogin'>Günlük Giriş Ödülü</button></div>";
      var d = U.screenShell("Günlük Görevler", html);
      d.querySelectorAll("[data-q]").forEach(function (b) {
        b.addEventListener("click", function () {
          var res = PL.game.actions.claimQuest(parseInt(b.getAttribute("data-q"), 10));
          if (res.ok) { U.sfx("reward_chime"); U.toast("+" + E.fmt.num(res.points) + " puan, +" + res.xp + " XP", "ok"); }
          else U.toast(res.msg, "err");
          U.show("quests", {}, { noHistory: true });
        });
      });
      d.querySelector("#qReroll").addEventListener("click", function () {
        U.confirm("Görevleri Yenile", "Yeni günlük görev seti çekilsin mi?", function () {
          var res = PL.game.actions.rerollQuests();
          U.toast(res.msg, res.ok ? "ok" : "err");
          U.show("quests", {}, { noHistory: true });
        });
      });
      d.querySelector("#qLogin").addEventListener("click", function () { PL.game.openLoginReward(); });
      return d;
    }
  });

  /* --------------------------------------------------------- BASARIMLAR --- */
  U.registerScreen("achievements", {
    render: function () {
      var st = PL.game.state;
      var html = "<div class='achGrid'>" + PL.DB.achievements.map(function (a) {
        var un = st.achievements.unlocked[a.id];
        var cur = E.achievements.metric(st, a.metric);
        return "<div class='achCard" + (un ? " unlocked" : "") + "'>" +
          "<div class='achIcon'>" + a.icon + "</div>" +
          "<b>" + esc(a.name_tr) + "</b><p>" + esc(a.desc_tr) + "</p>" +
          (un ? "<span class='pill ok'>" + E.fmt.date(un) + "</span>" :
            "<div class='achProg'>" + U.progress(Math.min(cur, a.target), a.target) +
            "<span>" + E.fmt.compact(Math.min(cur, a.target)) + "/" + E.fmt.compact(a.target) + "</span></div>") +
          "<i>Ödül: " + E.fmt.compact(a.reward_points) + " puan</i></div>";
      }).join("") + "</div>";
      return U.screenShell("Başarımlar & Rozetler", html, { wide: true });
    }
  });

  /* --------------------------------------------------------- ETKINLIKLER -- */
  U.registerScreen("events", {
    render: function () {
      var now = Date.now();
      var active = E.events.active(now);
      var html = "<div class='evGrid'>" + PL.DB.events.map(function (e) {
        var on = active.indexOf(e) >= 0;
        return "<div class='evCard" + (on ? " on" : "") + "'>" +
          "<div class='evHead'>" + U.icon("icon_banner") + "<b>" + esc(e.name_tr) + "</b>" +
          (on ? "<span class='pill ok'>AKTİF</span>" : "<span class='pill'>Pasif</span>") + "</div>" +
          "<p>" + esc(e.desc_tr) + "</p>" +
          "<div class='chips'>" + Object.keys(e.effect).map(function (k) {
            return "<span class='chip'>" + esc(k) + ": " + e.effect[k] + "</span>";
          }).join("") + "</div></div>";
      }).join("") + "</div>";
      return U.screenShell("Etkinlikler", html, { wide: true });
    }
  });

  /* ---------------------------------------------------------- SIRALAMA ---- */
  U.registerScreen("leaderboard", {
    render: function () {
      var st = PL.game.state;
      var rows = PL.game.leaderboard;   // fonksiyon referansi: draw() metrik ile cagirir
      var html = "<div class='lbTabs' id='lbTabs'>" +
        ["rating", "balance", "collection", "level"].map(function (k, i) {
          return "<button class='tabBtn" + (i === 0 ? " active" : "") + "' data-k='" + k + "'>" +
            ({ rating: "Arena", balance: "Puan", collection: "Koleksiyon", level: "Seviye" })[k] + "</button>";
        }).join("") + "</div><div class='lbList' id='lbList'></div>";
      var d = U.screenShell("Sıralama Tablosu", html);
      function draw(k) {
        var list = rows(k);
        d.querySelector("#lbList").innerHTML = list.map(function (r, i) {
          return "<div class='lbRow" + (r.me ? " me" : "") + "'><span class='lbRank'>" + (i + 1) + "</span>" +
            "<span class='lbName'>" + esc(r.name) + (r.me ? " (sen)" : "") + "</span>" +
            "<span class='lbVal'>" + esc(String(r.val)) + "</span></div>";
        }).join("");
      }
      draw("rating");
      d.querySelectorAll(".tabBtn").forEach(function (b) {
        b.addEventListener("click", function () {
          d.querySelectorAll(".tabBtn").forEach(function (x) { x.classList.remove("active"); });
          b.classList.add("active");
          draw(b.getAttribute("data-k"));
        });
      });
      return d;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
