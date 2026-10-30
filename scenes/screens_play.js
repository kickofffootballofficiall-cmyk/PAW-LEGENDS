/* =============================================================================
   PAW LEGENDS — ekranlar (2/2): kasalar, ciftlestirme, arena (4v4), pazar,
   arkadaslar
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var E = PL.engine, U = PL.ui;
  var el = U.el, esc = U.esc;

  /* ------------------------------------------------------------- KASALAR -- */
  U.registerScreen("crates", {
    music: "music_menu",
    render: function () {
      var st = PL.game.state;
      var now = Date.now();
      var evs = E.events.active(now);
      var priceMult = 1;
      evs.forEach(function (e) { if (e.effect.crate_price_mult) priceMult *= e.effect.crate_price_mult; });
      var html = "<div class='crateRow'>" + PL.DB.crates.map(function (c) {
        var price = Math.round(c.price * priceMult);
        var can = st.balance >= price;
        return "<div class='crateCard' data-c='" + c.id + "' style='--ca:" + c.accent + ";--cb:" + c.accent2 + "'>" +
          "<div class='crateImg' style='background-image:url(\"" + c.image + "\")'></div>" +
          "<b>" + esc(c.name_tr) + "</b>" +
          "<p>" + esc(c.desc_tr) + "</p>" +
          "<div class='cratePrice" + (can ? "" : " poor") + "'>" + U.icon("icon_points") + " " + E.fmt.num(price) +
          (priceMult !== 1 ? " <s>" + E.fmt.num(c.price) + "</s>" : "") + "</div>" +
          "<div class='oddsToggle' data-o='" + c.id + "'>Olasılıklar ▾</div>" +
          "<div class='oddsBox' id='odds_" + c.id + "' style='display:none'>" + oddsTable(c) + "</div>" +
          "<button class='btn gold openBtn' data-open='" + c.id + "'>" + U.icon("icon_crate") + " Aç</button>" +
          "</div>";
      }).join("") + "</div>" +
        "<div class='panel'><h3>Kasa Geçmişi</h3><div id='crateHist' class='txList'></div></div>";
      function oddsTable(c) {
        var rows = Object.keys(c.odds).map(function (k) {
          var r = E.rar(k);
          return "<div class='oddRow'><span style='color:" + r.color + "'>" + r.name_tr + "</span>" +
            "<b>%" + (c.odds[k] * 100).toFixed(2) + "</b></div>";
        }).join("");
        return rows + "<div class='oddRow mix'><span>Köpek / Puan / Eşya</span><b>" +
          Math.round(c.reward_mix.dog * 100) + "% / " + Math.round(c.reward_mix.points * 100) +
          "% / " + Math.round(c.reward_mix.item * 100) + "%</b></div>";
      }
      var d = U.screenShell("Kasalar", html, { wide: true });
      d.querySelectorAll(".oddsToggle").forEach(function (t) {
        t.addEventListener("click", function () {
          var box = d.querySelector("#odds_" + t.getAttribute("data-o"));
          box.style.display = box.style.display === "none" ? "" : "none";
        });
      });
      d.querySelectorAll("[data-open]").forEach(function (b) {
        b.addEventListener("click", function () { openCrateFlow(b.getAttribute("data-open"), priceMult); });
      });
      var hist = st.log.filter(function (l) { return l.type === "crate"; }).slice(0, 20);
      d.querySelector("#crateHist").innerHTML = hist.map(function (l) {
        return "<div class='tx gain'><span>" + E.fmt.date(l.ts) + " • " + esc(l.reason) + "</span><b>" + esc(l.detail || "") + "</b></div>";
      }).join("") || "<p class='muted'>Henüz kasa açmadın.</p>";
      return d;
    }
  });

  function openCrateFlow(crateId, priceMult) {
    var st = PL.game.state;
    var c = E.crate(crateId);
    var price = Math.round(c.price * (priceMult || 1));
    if (st.balance < price) {
      U.sfx("ui_error");
      U.toast("Yetersiz bakiye! Gereken: " + E.fmt.num(price) + " puan.", "err");
      return;
    }
    var m = U.modal({
      title: c.name_tr, cls: "crateModal", dismissable: false,
      body: "<div class='crateStage'><div class='crateBig' style='background-image:url(\"" + c.image + "\")'></div>" +
        "<div class='crateMsg'>Açılıyor...</div></div>"
    });
    U.sfx("crate_shake");
    var stage = m.body.querySelector(".crateBig");
    stage.classList.add("shaking");
    setTimeout(function () {
      var res = PL.game.actions.openCrate(crateId, price);
      if (!res.ok) { m.close(); U.toast(res.msg, "err"); U.sfx("ui_error"); return; }
      U.sfx("crate_open");
      stage.classList.remove("shaking");
      stage.classList.add("burst");
      m.body.querySelector(".crateMsg").textContent = "";
      setTimeout(function () {
        var r = res.roll;
        var rarKey = r.rarity;
        var rr = E.rar(rarKey);
        var content;
        if (r.type === "dog") {
          var b = E.breed(r.breedId);
          content = "<div class='revealCard rar-" + rarKey.replace(/[^a-z0-9]/gi, "") + "' style='--rc:" + rr.color + ";--rcd:" + rr.color_dark + "'>" +
            "<div class='revImg' style='background-image:url(\"" + b.image + "\")'></div>" +
            "<b>" + esc(b.name_tr) + "</b>" + U.rarityBadge(rarKey) +
            "<div class='muted'>" + esc(res.dog.name) + " • Sv 1</div></div>";
          U.sfx(rarKey === "mitik" || rarKey === "efsanevi" ? "reward_mythic" : (rarKey === "çok_nadir" ? "reward_epic" : "reward_chime"));
          U.audio.barkFor(b.size);
        } else if (r.type === "points") {
          content = "<div class='revealCard points'><div class='revImg pts'>" + U.icon("icon_points", "huge") + "</div>" +
            "<b>+" + E.fmt.num(r.points) + " puan</b>" + U.rarityBadge(rarKey) + "</div>";
          U.sfx("coin");
        } else {
          var it = E.item(r.item);
          content = "<div class='revealCard item'><div class='revImg'>" +
            U.icon(it.icon.replace("assets/ui/", "").replace(".svg", ""), "huge") + "</div>" +
            "<b>" + esc(it.name_tr) + "</b>" + U.rarityBadge(rarKey) +
            "<div class='muted'>" + esc(it.desc_tr) + "</div></div>";
          U.sfx("reward_chime");
        }
        m.body.innerHTML = "<div class='revealWrap " + rarKey.replace(/[^a-z0-9]/gi, "") + "'>" + content +
          "<div class='muted small'>" + esc(c.name_tr) + " • nadirlik: " + rr.name_tr + "</div></div>";
        m.box.appendChild(el("div", { class: "modalFoot" }, [
          el("button", { class: "btn gold", onclick: function () { m.close(); U.show("crates", {}, { noHistory: true }); } }, ["Harika!"])
        ]));
        U.updateTopBar();
      }, 620);
    }, 900);
  }

  /* -------------------------------------------------------- CIFTLESTIRME -- */
  U.registerScreen("breed", {
    render: function () {
      var st = PL.game.state, now = Date.now();
      var sel = { m: null, f: null };
      var d = el("div");
      function eligible() {
        return st.dogs.filter(function (x) { return !x.inMarket; });
      }
      function draw() {
        var list = eligible();
        var moms = list.filter(function (x) { return x.sex === "f"; });
        var dads = list.filter(function (x) { return x.sex === "m"; });
        var md = sel.m ? U.dogByUid(sel.m) : null;
        var fd = sel.f ? U.dogByUid(sel.f) : null;
        var comp = md && fd ? E.genetics.compatible(md, fd, now) : null;
        var cost = md && fd ? E.genetics.cost(md, fd, evCostMult()) : 0;
        var body =
          "<div class='breedCols'>" +
          "<div class='breedCol'><h3>" + U.icon("icon_female_white") + " Anne</h3>" +
          (md ? U.dogCard(md, { selected: true }) + "<button class='btn ghost small' data-clear='m'>Temizle</button>"
            : U.empty("icon_female", "Anne seç", "Aşağıdaki listeden seç.")) +
          "<div class='pickList' id='pickM'>" + moms.map(function (x) {
            return U.dogCard(x, { selected: sel.m === x.uid, dim: sel.m === x.uid });
          }).join("") + "</div></div>" +
          "<div class='breedCol'><h3>" + U.icon("icon_male_white") + " Baba</h3>" +
          (fd ? U.dogCard(fd, { selected: true }) + "<button class='btn ghost small' data-clear='f'>Temizle</button>"
            : U.empty("icon_male", "Baba seç", "Aşağıdaki listeden seç.")) +
          "<div class='pickList' id='pickF'>" + dads.map(function (x) {
            return U.dogCard(x, { selected: sel.f === x.uid, dim: sel.f === x.uid });
          }).join("") + "</div></div></div>" +
          "<div class='panel breedSummary'>" +
          (md && fd ?
            "<h3>Eşleşme Özeti</h3>" +
            "<div class='chips'>" +
            "<span class='chip " + (md.breedId === fd.breedId ? "ok" : "warn") + "'>" +
            (md.breedId === fd.breedId ? "Safkan yavru: " + esc(E.breed(md.breedId).name_tr)
              : "Melez ihtimali: " + esc(E.breed(md.breedId).name_tr) + " / " + esc(E.breed(fd.breedId).name_tr)) + "</span>" +
            "<span class='chip'>Ortak ata: " + E.genetics.sharedAncestors(md, fd) + "</span>" +
            "<span class='chip'>Maliyet: " + E.fmt.num(cost) + "</span>" +
            "<span class='chip'>Süre: " + E.fmt.time(Math.max(E.genetics.cooldownMs(md.rarity), E.genetics.cooldownMs(fd.rarity)) / 1000) + "</span>" +
            "</div>" +
            (comp.ok ? "<p class='okText'>Eşleşme uygun. Yavru istatistikleri ebeveyn genlerinden hesaplanır.</p>"
              : "<ul class='errList'>" + comp.problems.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>") +
            "<div class='actionRow'><input id='pupName' class='input' placeholder='Yavru adı (opsiyonel)'>" +
            "<button class='btn gold' id='btnBreed' " + (comp.ok && st.balance >= cost ? "" : "disabled") + ">" +
            U.icon("icon_dna") + " Çiftleştir (" + E.fmt.num(cost) + ")</button></div>"
            : "<p class='muted'>Anne ve baba seç; genetik uyum, maliyet ve süre burada hesaplanır.</p>") +
          "</div>" +
          "<div class='panel'><h3>Kennel'deki Yavrular & Gelişim</h3><div id='pupList' class='grid small'></div></div>";
        d.innerHTML = U.screenShell("Çiftleştirme & Genetik", body, { wide: true }).innerHTML;
        wire();
      }
      function evCostMult() {
        var m = 1;
        E.events.active(now).forEach(function (e) { if (e.effect.breed_cost_mult) m *= e.effect.breed_cost_mult; });
        return m;
      }
      function wire() {
        d.querySelectorAll("#pickM .dogCard").forEach(function (c) {
          c.addEventListener("click", function () { sel.m = c.getAttribute("data-uid"); draw(); });
        });
        d.querySelectorAll("#pickF .dogCard").forEach(function (c) {
          c.addEventListener("click", function () { sel.f = c.getAttribute("data-uid"); draw(); });
        });
        d.querySelectorAll("[data-clear]").forEach(function (b) {
          b.addEventListener("click", function () { sel[b.getAttribute("data-clear")] = null; draw(); });
        });
        var bb = d.querySelector("#btnBreed");
        if (bb) bb.addEventListener("click", function () {
          var name = (d.querySelector("#pupName").value || "").trim();
          var res = PL.game.actions.breed(sel.m, sel.f, name);
          if (!res.ok) { U.sfx("ui_error"); U.toast(res.msg, "err"); return; }
          U.sfx("breed_done");
          showPupResult(res);
          draw();
        });
        var pups = st.dogs.filter(function (x) { return E.stats.stageOf(x, now) === "yavru" || E.stats.stageOf(x, now) === "genç"; });
        var pl = d.querySelector("#pupList");
        pl.innerHTML = pups.length ? pups.map(function (p) {
          var stg = E.stats.stageOf(p, now);
          var info = E.stats.stageInfo(p, now);
          return U.dogCard(p, { sub: stg + " • üretim ×" + info.production_mult });
        }).join("") : "<p class='muted'>Şu an yavru yok.</p>";
        pl.querySelectorAll(".dogCard").forEach(function (c) {
          c.addEventListener("click", function () { U.show("dogDetail", { uid: c.getAttribute("data-uid") }); });
        });
      }
      function showPupResult(res) {
        var dog = res.dog, rep = res.report;
        var b = E.breed(dog.breedId), rr = E.rar(dog.rarity);
        var lines = [
          "Irk: <b>" + esc(b.name_tr) + "</b> (" + (rep.sameBreed ? "safkan" : "melez ihtimali gerçekleşti") + ")",
          "Nadirlik: <b>" + rr.name_tr + "</b>",
          "Ortak ata sayısı: <b>" + rep.sharedAncestors + "</b>" + (rep.inbreedPenalty > 0 ? " → akrabalık cezası %" + Math.round(rep.inbreedPenalty * 100) : ""),
          rep.doubleMerle ? "<span class='warn'>Çift merle riski gerçekleşti: istatistikler %" +
            Math.round(E.bal().breeding.allele_rules.double_merle_penalty * 100) + " düştü.</span>" : "",
          rep.mutation ? "✦ Mutasyon: <b>" + esc(rep.mutation) + "</b>" : "",
          rep.traits.length ? "★ Özellik: " + rep.traits.map(esc).join(", ") : ""
        ].filter(Boolean);
        U.modal({
          title: "Yavru Doğdu! 🐶", cls: "pupModal",
          body: "<div class='revealCard rar-" + dog.rarity.replace(/[^a-z0-9]/gi, "") + "' style='--rc:" + rr.color + ";--rcd:" + rr.color_dark + "'>" +
            "<div class='revImg' style='background-image:url(\"" + b.image + "\")'></div><b>" + esc(dog.name) + "</b>" +
            U.rarityBadge(dog.rarity) + "</div>" +
            "<ul class='reportList'>" + lines.map(function (l) { return "<li>" + l + "</li>"; }).join("") + "</ul>" +
            "<div class='geneRep'>" + Object.keys(dog.genes).slice(0, 9).map(function (k) {
              var a = dog.genes[k];
              return "<span class='gene'><b>" + k + "</b>" + (a[0] ? "A" : "a") + (a[1] ? "A" : "a") + "</span>";
            }).join("") + "</div>",
          buttons: [{ label: "Kennel'e Ekle", cls: "gold" }]
        });
      }
      draw();
      return d;
    }
  });

  /* ------------------------------------------------------------- ARENA ---- */
  U.registerScreen("arena", {
    music: "music_battle",
    render: function () {
      var st = PL.game.state, now = Date.now();
      var sel = [];
      var d = el("div");
      function battleReady() {
        return st.dogs.filter(function (x) {
          return E.stats.stageInfo(x, now).can_battle && !x.inMarket;
        });
      }
      function drawPicker() {
        var list = battleReady();
        d.innerHTML = U.screenShell("Arena — 4'e 4",
          "<div class='panel' style='margin-bottom:10px;font-size:12.5px;color:var(--muted)'>🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.</div>" +
          "<div class='arenaHead'>" +
          "<div class='ratingCard'><b>" + st.arena.rating + "</b><span>" + esc(E.tierOf(st.arena.rating)) + "</span>" +
          "<i>" + st.arena.wins + "G / " + st.arena.losses + "M / " + st.arena.draws + "B</i></div>" +
          "<div class='teamPicks' id='teamPicks'>" + [0, 1, 2, 3].map(function (i) {
            var u = sel[i];
            var dg = u ? U.dogByUid(u) : null;
            return "<div class='slot" + (dg ? " filled" : "") + "'>" +
              (dg ? "<img src='" + E.breed(dg.breedId).image + "'><span>" + esc(dg.name) + "</span>" :
                "<span class='slotEmpty'>Slot " + (i + 1) + "</span>") + "</div>";
          }).join("") + "</div></div>" +
          "<div class='actionRow'><button class='btn gold big' id='btnFight' " + (sel.length === 4 ? "" : "disabled") + ">" +
          U.icon("icon_sword") + " Savaşa Gir</button>" +
          "<button class='btn ghost' id='btnAuto'>Otomatik Seç</button></div>" +
          "<div class='grid small' id='arenaPool'>" + list.map(function (x) {
            var bs = E.stats.battleStats(x, now);
            return U.dogCard(x, {
              selected: sel.indexOf(x.uid) >= 0,
              sub: "HP " + bs.maxHp + " • ATK " + bs.atk + " • SPD " + bs.spd
            });
          }).join("") + "</div>" +
          "<div class='panel'><h3>Arena Geçmişi</h3><div class='txList' id='arenaHist'></div></div>", { wide: true }).innerHTML;
        d.querySelectorAll("#arenaPool .dogCard").forEach(function (c) {
          c.addEventListener("click", function () {
            var uid = c.getAttribute("data-uid");
            var i = sel.indexOf(uid);
            if (i >= 0) sel.splice(i, 1);
            else { if (sel.length >= 4) { U.toast("Takım dolu (4).", "err"); return; } sel.push(uid); }
            U.sfx("ui_click");
            drawPicker();
          });
        });
        d.querySelector("#btnAuto").addEventListener("click", function () {
          var ranked = list.slice().sort(function (a, b) {
            var ba = E.stats.battleStats(a, now), bb = E.stats.battleStats(b, now);
            return (bb.atk + bb.maxHp + bb.spd) - (ba.atk + ba.maxHp + ba.spd);
          });
          sel = ranked.slice(0, 4).map(function (x) { return x.uid; });
          drawPicker();
        });
        d.querySelector("#btnFight").addEventListener("click", function () { runBattle(sel.slice(), null); });
        d.querySelector("#arenaHist").innerHTML = st.arena.history.slice(0, 15).map(function (h) {
          return "<div class='tx " + (h.win === "win" ? "gain" : h.win === "loss" ? "spend" : "") + "'>" +
            "<span>" + E.fmt.date(h.ts) + " • " + esc(h.opp) + " (" + h.oppRating + ")</span>" +
            "<b>" + (h.win === "win" ? "GALİBİYET" : h.win === "loss" ? "MAĞLUBİYET" : "BERABERE") +
            " • " + (h.delta > 0 ? "+" : "") + h.delta + " puan • +" + E.fmt.num(h.reward) + "</b></div>";
        }).join("") || "<p class='muted'>Henüz savaş yok.</p>";
      }
      function runBattle(teamUids, friendName) {
        var team = teamUids.map(U.dogByUid);
        var seed = (Date.now() ^ (Math.random() * 1e9)) | 0;
        var res = PL.game.actions.startBattle(teamUids, seed, friendName);
        if (!res.ok) { U.toast(res.msg, "err"); return; }
        playBattle(res, team);
      }
      function playBattle(res, team) {
        var sim = res.sim;
        var m = U.modal({ title: "Arena Savaşı", cls: "battleModal", dismissable: false, body: "" });
        var units = {};
        sim.units.forEach(function (u) { units[u.uid] = u; });
        function unitCard(u) {
          var b = E.breed(u.breedId);
          return "<div class='bUnit' id='u_" + u.uid + "' data-side='" + u.side + "'>" +
            "<div class='bImg' style='background-image:url(\"" + b.image + "\")'></div>" +
            "<div class='bName'>" + esc(u.name) + " <i>Sv" + u.level + "</i></div>" +
            "<div class='bHp'><i style='width:100%'></i></div><div class='bHpTxt'>" + u.hp + "/" + u.maxHp + "</div></div>";
        }
        var left = sim.units.filter(function (u) { return u.side === "A"; }).map(unitCard).join("");
        var right = sim.units.filter(function (u) { return u.side === "B"; }).map(unitCard).join("");
        m.body.innerHTML = "<div class='battleGrid'><div class='bCol teamA'>" + left + "</div>" +
          "<div class='bMid'><div class='bTurn'>Tur 1</div><div class='bLog' id='bLog'></div></div>" +
          "<div class='bCol teamB'>" + right + "</div></div>";
        var logBox = m.body.querySelector("#bLog");
        var idx = 0;
        var reduce = st.settings.reduceMotion;
        var stepMs = reduce ? 0 : 420;
        function nameOf(uid) { return units[uid] ? units[uid].name : uid; }
        function applyEntry(e) {
          var line = "";
          if (e.t === "round") { m.body.querySelector(".bTurn").textContent = "Tur " + e.round; return; }
          if (e.t === "hit") {
            var du = units[e.dst];
            if (du) {
              du.hp = Math.max(0, du.hp - e.dmg);
              var node = m.body.querySelector("#u_" + e.dst);
              if (node) {
                node.querySelector(".bHp i").style.width = (du.hp / du.maxHp * 100) + "%";
                node.querySelector(".bHpTxt").textContent = du.hp + "/" + du.maxHp;
                node.classList.add("hitFx");
                setTimeout(function () { node.classList.remove("hitFx"); }, 300);
                if (du.hp <= 0) node.classList.add("dead");
                var fl = el("span", { class: "dmgFloat" + (e.crit ? " crit" : ""), text: "-" + e.dmg });
                node.appendChild(fl);
                setTimeout(function () { if (fl.parentNode) fl.parentNode.removeChild(fl); }, 700);
              }
            }
            line = "<b>" + esc(nameOf(e.src)) + "</b> → " + esc(nameOf(e.dst)) +
              (e.ability ? " [" + esc(e.ability) + "]" : "") + " <span class='dmg'>-" + e.dmg + "</span>" +
              (e.crit ? " <span class='crit'>KRİTİK!</span>" : "") + (e.absorbed ? " (kalkan -" + e.absorbed + ")" : "");
            U.sfx(e.crit ? "battle_crit" : "battle_hit");
          } else if (e.t === "heal") {
            var hu = units[e.src];
            if (hu) {
              hu.hp = Math.min(hu.maxHp, hu.hp + e.amount);
              var hn = m.body.querySelector("#u_" + e.src);
              if (hn) {
                hn.querySelector(".bHp i").style.width = (hu.hp / hu.maxHp * 100) + "%";
                hn.querySelector(".bHpTxt").textContent = hu.hp + "/" + hu.maxHp;
              }
            }
            line = "<b>" + esc(nameOf(e.src)) + "</b> iyileşti <span class='heal'>+" + e.amount + "</span>";
            U.sfx("battle_heal");
          } else if (e.t === "counter") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> karşı saldırı! " + esc(nameOf(e.dst)) + " <span class='dmg'>-" + e.dmg + "</span>";
          } else if (e.t === "shield") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> kalkan kazandı (" + e.amount + ")";
          } else if (e.t === "stun") {
            line = "<b>" + esc(nameOf(e.dst)) + "</b> sersemledi!";
          } else if (e.t === "stunned") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> sersem — tur kaybı";
          } else if (e.t === "bleed") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> kanıyor <span class='dmg'>-" + e.dmg + "</span>";
          } else if (e.t === "howl") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> takımını coşturdu (+" + e.value + "% hasar)";
          } else if (e.t === "rally") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> takımı hızlandırdı (+" + e.value + "%)";
          } else if (e.t === "fortify") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> savunmayı sağlamlaştırdı";
          } else if (e.t === "counter_set") {
            line = "<b>" + esc(nameOf(e.src)) + "</b> karşı saldırı pozisyonunda";
          }
          if (line) {
            var p = el("div", { class: "bLine", html: line });
            logBox.appendChild(p);
            logBox.scrollTop = logBox.scrollHeight;
          }
        }
        function next() {
          if (idx >= sim.log.length) { finish(); return; }
          applyEntry(sim.log[idx++]);
          setTimeout(next, stepMs);
        }
        function finish() {
          var win = sim.winner;
          var txt = win === "A" ? "ZAFER! 🏆" : win === "B" ? "MAĞLUBİYET" : "BERABERE";
          U.sfx(win === "A" ? "battle_win" : "battle_lose");
          logBox.appendChild(el("div", { class: "bResult " + win, text: txt + "  •  +" + E.fmt.num(res.reward) +
            " puan • " + (res.delta > 0 ? "+" : "") + res.delta + " arena puanı • +" + res.xp + " XP" }));
          m.box.appendChild(el("div", { class: "modalFoot" }, [
            el("button", {
              class: "btn gold", onclick: function () {
                m.close(); U.show("arena", {}, { noHistory: true });
              }
            }, ["Devam"])
          ]));
          U.updateTopBar();
        }
        next();
      }
      drawPicker();
      // arkadas daveti ile savas
      if (PL.game._friendBattle) {
        var fb = PL.game._friendBattle;
        PL.game._friendBattle = null;
        setTimeout(function () { runBattle(sel.length === 4 ? sel.slice() : battleReady().slice(0, 4).map(function (x) { return x.uid; }), fb); }, 300);
      }
      return d;
    }
  });

  /* -------------------------------------------------------------- PAZAR --- */
  U.registerScreen("market", {
    render: function () {
      var st = PL.game.state, now = Date.now();
      var tab = "buy";
      var flt = { q: "", rar: "all", min: "", max: "", sort: "price_asc" };
      var d = el("div");
      function listings() {
        PL.game.refreshBotListings();
        var list = (st.market.botListings || []).filter(function (l) { return !l.sold; })
          .concat(st.market.listings.filter(function (l) { return !l.sold && l.sellerCode !== st.profile.code; }));
        if (flt.rar !== "all") list = list.filter(function (l) { return l.dog.rarity === flt.rar; });
        if (flt.q) {
          var q = flt.q.toLowerCase();
          list = list.filter(function (l) {
            return l.dog.name.toLowerCase().indexOf(q) >= 0 || E.breed(l.dog.breedId).name_tr.toLowerCase().indexOf(q) >= 0;
          });
        }
        if (flt.min) list = list.filter(function (l) { return l.price >= parseInt(flt.min, 10); });
        if (flt.max) list = list.filter(function (l) { return l.price <= parseInt(flt.max, 10); });
        list.sort(function (a, b) {
          if (flt.sort === "price_asc") return a.price - b.price;
          if (flt.sort === "price_desc") return b.price - a.price;
          if (flt.sort === "rarity") return E.rarOrder(b.dog.rarity) - E.rarOrder(a.dog.rarity);
          return b.dog.level - a.dog.level;
        });
        return list;
      }
      function draw() {
        var body =
          "<div class='tabs' id='mktTabs'>" +
          tabBtn("buy", "Satın Al") + tabBtn("mine", "İlanlarım") + tabBtn("sell", "İlan Ver") + tabBtn("hist", "Geçmiş") +
          "</div><div id='mktBody'></div>";
        function tabBtn(k, label) {
          return "<button class='tabBtn" + (tab === k ? " active" : "") + "' data-t='" + k + "'>" + label + "</button>";
        }
        d.innerHTML = U.screenShell("Oyuncular Arası Pazar", body, { wide: true }).innerHTML;
        d.querySelectorAll(".tabBtn").forEach(function (b) {
          b.addEventListener("click", function () { tab = b.getAttribute("data-t"); draw(); });
        });
        var mb = d.querySelector("#mktBody");
        if (tab === "buy") {
          var list = listings();
          mb.innerHTML = "<div class='filterBar'>" +
            "<input class='input' id='fQ' placeholder='Ara...' value='" + esc(flt.q) + "'>" +
            "<select class='input' id='fRar'><option value='all'>Tüm nadirlikler</option>" +
            Object.keys(PL.DB.rarities).map(function (k) {
              return "<option value='" + k + "'" + (flt.rar === k ? " selected" : "") + ">" + PL.DB.rarities[k].name_tr + "</option>";
            }).join("") + "</select>" +
            "<input class='input num' id='fMin' type='number' placeholder='Min' value='" + esc(flt.min) + "'>" +
            "<input class='input num' id='fMax' type='number' placeholder='Max' value='" + esc(flt.max) + "'>" +
            "<select class='input' id='fSort'><option value='price_asc'>Fiyat (artan)</option>" +
            "<option value='price_desc'>Fiyat (azalan)</option><option value='rarity'>Nadirlik</option>" +
            "<option value='level'>Seviye</option></select></div>" +
            "<div class='marketList'>" + (list.length ? list.map(listingCard).join("") :
              U.empty("icon_market", "İlan bulunamadı", "Filtreleri değiştir.")) + "</div>";
          function listingCard(l) {
            var b = E.breed(l.dog.breedId), rr = E.rar(l.dog.rarity);
            var ratio = l.price / Math.max(1, l.value);
            var tag = ratio < 0.95 ? "<span class='pill ok'>FIRSAT</span>" :
              (ratio > 1.3 ? "<span class='pill warn'>PAHALI</span>" : "");
            return "<div class='mktCard rar-" + l.dog.rarity.replace(/[^a-z0-9]/gi, "") + "' style='--rc:" + rr.color + "'>" +
              "<div class='mktImg' style='background-image:url(\"" + b.image + "\")'></div>" +
              "<div class='mktInfo'><b>" + esc(l.dog.name) + "</b>" +
              "<span>" + esc(b.name_tr) + " • Sv " + l.dog.level + "</span>" +
              U.rarityBadge(l.dog.rarity) + tag +
              "<div class='muted small'>Satıcı: " + esc(l.seller) + " • Değer: " + E.fmt.compact(l.value) + "</div></div>" +
              "<div class='mktBuy'><b>" + E.fmt.num(l.price) + "</b>" +
              "<button class='btn gold small' data-buy='" + l.id + "'>Satın Al</button></div></div>";
          }
          mb.querySelector("#fQ").addEventListener("input", function (e) { flt.q = e.target.value; refreshList(); });
          mb.querySelector("#fRar").addEventListener("change", function (e) { flt.rar = e.target.value; refreshList(); });
          mb.querySelector("#fMin").addEventListener("input", function (e) { flt.min = e.target.value; refreshList(); });
          mb.querySelector("#fMax").addEventListener("input", function (e) { flt.max = e.target.value; refreshList(); });
          mb.querySelector("#fSort").addEventListener("change", function (e) { flt.sort = e.target.value; refreshList(); });
          function refreshList() {
            var holder = mb.querySelector(".marketList");
            var ls = listings();
            holder.innerHTML = ls.length ? ls.map(function (l) {
              var b = E.breed(l.dog.breedId), rr = E.rar(l.dog.rarity);
              return "<div class='mktCard rar-" + l.dog.rarity.replace(/[^a-z0-9]/gi, "") + "' style='--rc:" + rr.color + "'>" +
                "<div class='mktImg' style='background-image:url(\"" + b.image + "\")'></div>" +
                "<div class='mktInfo'><b>" + esc(l.dog.name) + "</b><span>" + esc(b.name_tr) + " • Sv " + l.dog.level + "</span>" +
                U.rarityBadge(l.dog.rarity) +
                "<div class='muted small'>Satıcı: " + esc(l.seller) + " • Değer: " + E.fmt.compact(l.value) + "</div></div>" +
                "<div class='mktBuy'><b>" + E.fmt.num(l.price) + "</b>" +
                "<button class='btn gold small' data-buy='" + l.id + "'>Satın Al</button></div></div>";
            }).join("") : U.empty("icon_market", "İlan bulunamadı", "");
            wireBuy(holder);
          }
          function wireBuy(scope) {
            scope.querySelectorAll("[data-buy]").forEach(function (btn) {
              btn.addEventListener("click", function () {
                var id = btn.getAttribute("data-buy");
                var l = listings().filter(function (x) { return x.id === id; })[0];
                if (!l) return;
                U.confirm("Satın Al", l.dog.name + " (" + E.breed(l.dog.breedId).name_tr + ") için " +
                  E.fmt.num(l.price) + " puan ödensin mi?", function () {
                    var res = PL.game.actions.buyListing(id);
                    if (res.ok) { U.sfx("coin"); U.toast("Satın alındı: " + res.dog.name + " 🐾", "ok"); }
                    else { U.sfx("ui_error"); U.toast(res.msg, "err"); }
                    draw();
                  });
              });
            });
          }
          wireBuy(mb);
        } else if (tab === "sell") {
          var mine = st.dogs.filter(function (x) { return !x.inMarket; });
          mb.innerHTML = "<p class='muted'>Komisyon: %" +
            Math.round(E.market.fee(100, E.events.active(now)) ) + " • En fazla " +
            E.bal().market.max_active_listings + " aktif ilan.</p>" +
            "<div class='grid small' id='sellPool'>" + mine.map(function (x) {
              return U.dogCard(x, { sub: "Önerilen: " + E.fmt.compact(E.stats.marketValue(x, now)) });
            }).join("") + "</div>";
          mb.querySelectorAll("#sellPool .dogCard").forEach(function (c) {
            c.addEventListener("click", function () {
              var uid = c.getAttribute("data-uid");
              var dog = U.dogByUid(uid);
              var val = E.stats.marketValue(dog, now);
              U.modal({
                title: "İlan Ver — " + esc(dog.name),
                body: "<p class='muted'>Önerilen fiyat: <b>" + E.fmt.num(val) + "</b> (değer)</p>" +
                  "<input id='priceIn' type='number' class='input' value='" + val + "' min='" + E.bal().market.min_price + "'>",
                buttons: [{ label: "Vazgeç", cls: "ghost" }, {
                  label: "İlanla", cls: "gold", onClick: function () {
                    var p = parseInt(U.$("#priceIn").value, 10);
                    var res = PL.game.actions.listDog(uid, p);
                    U.toast(res.msg, res.ok ? "ok" : "err");
                    if (res.ok) draw();
                  }
                }]
              });
            });
          });
        } else if (tab === "mine") {
          var act = st.market.listings.filter(function (l) { return !l.sold; });
          mb.innerHTML = act.length ? act.map(function (l) {
            var b = E.breed(l.dog.breedId);
            return "<div class='mktCard'><div class='mktImg' style='background-image:url(\"" + b.image + "\")'></div>" +
              "<div class='mktInfo'><b>" + esc(l.dog.name) + "</b><span>" + esc(b.name_tr) + " • Sv " + l.dog.level + "</span>" +
              "<div class='muted small'>İlan: " + E.fmt.date(l.createdAt) + "</div></div>" +
              "<div class='mktBuy'><b>" + E.fmt.num(l.price) + "</b>" +
              "<button class='btn danger small' data-cancel='" + l.id + "'>İptal</button></div></div>";
          }).join("") : U.empty("icon_market", "Aktif ilan yok", "İlan Ver sekmesinden satışa çıkar.");
          mb.querySelectorAll("[data-cancel]").forEach(function (b) {
            b.addEventListener("click", function () {
              var res = PL.game.actions.cancelListing(b.getAttribute("data-cancel"));
              U.toast(res.msg, res.ok ? "ok" : "err");
              draw();
            });
          });
        } else {
          mb.innerHTML = "<div class='txList'>" + st.market.history.slice(0, 30).map(function (h) {
            return "<div class='tx " + (h.type === "sell" || h.type === "buy" ? (h.type === "sell" ? "gain" : "spend") : "") + "'>" +
              "<span>" + E.fmt.date(h.ts) + " • " + esc(h.text) + "</span><b>" +
              (h.amount ? (h.amount > 0 ? "+" : "−") + E.fmt.num(Math.abs(h.amount)) : "") + "</b></div>";
          }).join("") + "</div>" || "<p class='muted'>Geçmiş yok.</p>";
        }
      }
      draw();
      return d;
    }
  });

  /* ---------------------------------------------------------- ARKADASLAR -- */
  U.registerScreen("friends", {
    render: function () {
      var st = PL.game.state;
      var d = el("div");
      function draw() {
        d.innerHTML = U.screenShell("Arkadaşlar",
          "<div class='panel'><h3>Oyuncu Kodun</h3><div class='codeBox'><b>" + esc(st.profile.code) + "</b>" +
          "<button class='miniBtn' id='fCopy'>Kopyala</button></div>" +
          "<div class='actionRow'><input id='fCode' class='input' placeholder='PAW-XXXXXX veya isim'>" +
          "<button class='btn blue' id='fAdd'>İstek Gönder</button></div></div>" +
          "<div class='panel'><h3>Gelen İstekler</h3><div id='fIn'>" +
          (st.friends.incoming.length ? st.friends.incoming.map(function (f) {
            return "<div class='friendRow'><span>" + esc(f.name) + " <i>" + esc(f.code) + "</i></span>" +
              "<button class='btn gold small' data-acc='" + esc(f.code) + "'>Kabul</button>" +
              "<button class='btn danger small' data-dec='" + esc(f.code) + "'>Reddet</button></div>";
          }).join("") : "<p class='muted'>Gelen istek yok.</p>") + "</div></div>" +
          "<div class='panel'><h3>Arkadaş Listesi</h3><div id='fList'>" +
          (st.friends.list.length ? st.friends.list.map(function (f) {
            return "<div class='friendRow'><span class='" + (f.online ? "on" : "off") + "'>" +
              (f.online ? "●" : "○") + " " + esc(f.name) + " <i>" + esc(f.code) + " • " + esc(f.title || "Yetiştirici") + "</i></span>" +
              "<span class='fBtns'><button class='btn blue small' data-inv='" + esc(f.code) + "'>Arena Daveti</button>" +
              "<button class='btn ghost small' data-prof='" + esc(f.code) + "'>Profil</button>" +
              "<button class='btn danger small' data-del='" + esc(f.code) + "'>Sil</button></span></div>";
          }).join("") : "<p class='muted'>Henüz arkadaşın yok. Yerel modda 'demo' yazarak demo arkadaş ekleyebilirsin.</p>") + "</div></div>" +
          "<div class='panel'><h3>Gönderilen İstekler</h3><div id='fOut'>" +
          (st.friends.outgoing.length ? st.friends.outgoing.map(function (f) {
            return "<div class='friendRow'><span>" + esc(f.name) + " <i>" + esc(f.code) + "</i></span><span class='pill'>Bekliyor</span></div>";
          }).join("") : "<p class='muted'>Yok.</p>") + "</div></div>", { wide: true }).innerHTML;
        d.querySelector("#fCopy").addEventListener("click", function () {
          try { navigator.clipboard.writeText(st.profile.code); } catch (e) { }
          U.toast("Kod kopyalandı.", "ok");
        });
        d.querySelector("#fAdd").addEventListener("click", function () {
          var v = d.querySelector("#fCode").value.trim();
          if (!v) return;
          var res = PL.game.actions.addFriend(v);
          U.toast(res.msg, res.ok ? "ok" : "err");
          if (res.ok) U.sfx("reward_chime");
          draw();
        });
        d.querySelectorAll("[data-acc]").forEach(function (b) {
          b.addEventListener("click", function () {
            PL.game.actions.acceptFriend(b.getAttribute("data-acc")); draw(); U.toast("Arkadaş eklendi.", "ok");
          });
        });
        d.querySelectorAll("[data-dec]").forEach(function (b) {
          b.addEventListener("click", function () { PL.game.actions.declineFriend(b.getAttribute("data-dec")); draw(); });
        });
        d.querySelectorAll("[data-del]").forEach(function (b) {
          b.addEventListener("click", function () { PL.game.actions.removeFriend(b.getAttribute("data-del")); draw(); });
        });
        d.querySelectorAll("[data-inv]").forEach(function (b) {
          b.addEventListener("click", function () {
            var res = PL.game.actions.inviteFriend(b.getAttribute("data-inv"));
            U.toast(res.msg, res.ok ? "ok" : "err");
            if (res.ok) U.show("arena");
          });
        });
        d.querySelectorAll("[data-prof]").forEach(function (b) {
          var f = st.friends.list.filter(function (x) { return x.code === b.getAttribute("data-prof"); })[0];
          if (!f) return;
          U.modal({
            title: esc(f.name), body: "<div class='statGrid'>" +
              "<div class='statCard'><span>Arena</span><b>" + f.rating + "</b></div>" +
              "<div class='statCard'><span>Köpek</span><b>" + f.dogs + "</b></div>" +
              "<div class='statCard'><span>Koleksiyon</span><b>" + f.breeds + "/100</b></div>" +
              "<div class='statCard'><span>Durum</span><b>" + (f.online ? "Çevrim içi" : "Çevrimdışı") + "</b></div></div>",
            buttons: [{ label: "Kapat", cls: "gold" }]
          });
        });
      }
      draw();
      return d;
    }
  });

  /* =============================================================================
     KURT AKINI — canli animasyonlu PvE dovus modu (3 dalga)
     ========================================================================== */
  var WOLVES = {
    grey:  { img: "assets/wolves/wolf_grey.webp",  name: "Bozkurt",     hp: 260, atk: 34, spd: 62, def: 22 },
    black: { img: "assets/wolves/wolf_black.webp", name: "Kara Kurt",   hp: 330, atk: 43, spd: 74, def: 26 },
    alpha: { img: "assets/wolves/wolf_alpha.webp", name: "Alfa Kurt",   hp: 540, atk: 56, spd: 68, def: 34 },
    dire:  { img: "assets/wolves/wolf_dire.webp",  name: "Dire Kurt",   hp: 920, atk: 76, spd: 80, def: 44 }
  };
  var WOLF_WAVES = [
    ["grey", "grey", "grey"],
    ["grey", "black", "grey", "black"],
    ["alpha", "black", "black"]
  ];

  U.registerScreen("wolf", {
    render: function () {
      var st = PL.game.state, now = Date.now();
      st.wolf = st.wolf || { nextAt: 0, wins: 0, losses: 0, kills: 0 };
      var d = el("div");
      var team = [];
      var S = null, iv = null;

      function unitHtml(u, side, i) {
        return "<div class='wUnit " + (side ? "wolf" : "dog") + "' id='wu" + side + "_" + i + "'>" +
          "<div class='wImg' style='background-image:url(\"" + u.img + "\")'></div>" +
          "<div class='wHp'><i style='width:100%'></i></div>" +
          "<b>" + esc(u.name) + "</b></div>";
      }
      function stageHtml() {
        return U.screenShell("Kurt Akını",
          "<div class='wTop'><b>" + (PL.i18n ? PL.i18n.t("Dalga") : "Dalga") + " <span id='wWave'>1</span>/3</b>" +
          "<span id='wLog' class='muted'></span></div>" +
          "<div class='wolfStage'>" +
          "<div class='wRow' id='wRowDogs'>" + S.dogs.map(function (u, i) { return unitHtml(u, 0, i); }).join("") + "</div>" +
          "<div class='wMid'><span>VS</span></div>" +
          "<div class='wRow' id='wRowWolves'>" + S.wolves.map(function (u, i) { return unitHtml(u, 1, i); }).join("") + "</div>" +
          "</div>").innerHTML;
      }
      function pickHtml() {
        var cd = st.wolf.nextAt > now;
        return U.screenShell("Kurt Akını",
          "<div class='panel'><h3>🐺 " + (PL.i18n ? PL.i18n.t("Kurt Akını") : "Kurt Akını") + "</h3>" +
          "<p class='muted'>" + (PL.i18n ? PL.i18n.t("3 dalga kurt sürüsünü yen; büyük puan ve Kurt Dişi kazan. Savaşabilecek köpeklerden en fazla 4 tanesini seç.") : "3 dalga kurt sürüsünü yen; büyük puan ve Kurt Dişi kazan. Savaşabilecek köpeklerden en fazla 4 tanesini seç.") + "</p>" +
          "<p>" + (PL.i18n ? PL.i18n.t("Galibiyet") : "Galibiyet") + ": <b>" + st.wolf.wins + "</b> • " +
          (PL.i18n ? PL.i18n.t("Yenilgi") : "Yenilgi") + ": <b>" + st.wolf.losses + "</b> • 🐺 " + st.wolf.kills + "</p>" +
          (cd ? "<p class='muted'>⏳ " + E.fmt.time((st.wolf.nextAt - now) / 1000) + "</p>" : "") +
          "<div class='grid small' id='wolfPick'>" + st.dogs.filter(function (x) {
            return E.stats.stageInfo(x, now).can_battle && !x.inMarket;
          }).map(function (x) { return U.dogCard(x, { selected: team.indexOf(x) >= 0 }); }).join("") + "</div>" +
          "<div class='actionRow'><button class='btn gold' id='wolfStart' " + (cd ? "disabled" : "") + ">" +
          (PL.i18n ? PL.i18n.t("Başlat") : "Başlat") + " (" + team.length + "/4)</button></div></div>").innerHTML;
      }
      function resultHtml(win, pts, fang) {
        return U.screenShell("Kurt Akını",
          "<div class='panel' style='text-align:center;padding:26px'>" +
          "<h3 style='font-size:26px'>" + (win ? "🏆 " + (PL.i18n ? PL.i18n.t("Zafer!") : "Zafer!") : "💀 " + (PL.i18n ? PL.i18n.t("Yenilgi...") : "Yenilgi...")) + "</h3>" +
          "<p>" + (PL.i18n ? PL.i18n.t("Ödül") : "Ödül") + ": <b style='color:var(--gold)'>+" + E.fmt.compact(pts) + " " +
          (PL.i18n ? PL.i18n.t("Puan") : "Puan") + "</b>" + (fang ? " + 🦴 " + (PL.i18n ? PL.i18n.t("Kurt Dişi") : "Kurt Dişi") : "") + "</p>" +
          "<div class='actionRow' style='justify-content:center'><button class='btn gold' id='wolfAgain'>" +
          (PL.i18n ? PL.i18n.t("Kapat") : "Kapat") + "</button></div></div>").innerHTML;
      }
      function draw() {
        if (iv) { clearInterval(iv); iv = null; }
        if (S && S.mode === "battle") { d.innerHTML = stageHtml(); return; }
        d.innerHTML = S && S.mode === "result" ? resultHtml(S.win, S.pts, S.fang) : pickHtml();
        if (PL.i18n) PL.i18n.apply(d);
        var pk = d.querySelector("#wolfPick");
        if (pk) pk.addEventListener("click", function (e) {
          var c = e.target.closest(".dogCard"); if (!c) return;
          var dg = st.dogs.filter(function (x) { return x.uid === c.getAttribute("data-uid"); })[0];
          var i = team.indexOf(dg);
          if (i >= 0) team.splice(i, 1); else if (team.length < 4) team.push(dg);
          draw();
        });
        var bs = d.querySelector("#wolfStart");
        if (bs) bs.addEventListener("click", function () {
          if (team.length < 1) { U.toast("En az 1 köpek seç", "err"); return; }
          startBattle();
        });
        var ba = d.querySelector("#wolfAgain");
        if (ba) ba.addEventListener("click", function () { S = null; team = []; U.replace("wolf"); });
      }
      function bar(u, side, i) {
        var e2 = d.querySelector("#wu" + side + "_" + i);
        if (!e2) return null;
        return e2.querySelector(".wHp i");
      }
      function idxOf(u) { return u.side === 0 ? S.dogs.indexOf(u) : S.wolves.indexOf(u); }
      function updateBars() {
        S.dogs.concat(S.wolves).forEach(function (u) {
          var b = bar(u, u.side, idxOf(u));
          if (b) b.style.width = Math.max(0, Math.round(u.hp / u.max * 100)) + "%";
        });
      }
      function animate(u, t, dmg, crit) {
        var ea = d.querySelector("#wu" + u.side + "_" + idxOf(u));
        var et = d.querySelector("#wu" + t.side + "_" + idxOf(t));
        if (ea) { ea.classList.add(u.side === 0 ? "lungeR" : "lungeL"); setTimeout(function () { ea.classList.remove("lungeR", "lungeL"); }, 480); }
        if (et) {
          et.classList.add("hit");
          var f = document.createElement("span");
          f.className = "dmgFloat" + (crit ? " crit" : "");
          f.textContent = "-" + dmg;
          et.appendChild(f);
          setTimeout(function () { et.classList.remove("hit"); f.remove(); }, 620);
          if (t.hp <= 0) setTimeout(function () { et.classList.add("ko"); }, 260);
        }
        var lg = d.querySelector("#wLog");
        if (lg) lg.textContent = u.name + " → " + t.name + " (-" + dmg + (crit ? " KRİTİK!" : "") + ")";
      }
      function nextWave() {
        var mult = 1 + 0.05 * Math.max(0, (st.stats.maxDogLevel || 1) - 1) + S.wave * 0.16;
        S.wolves = WOLF_WAVES[S.wave].map(function (k) {
          var w = WOLVES[k];
          var hp = Math.round(w.hp * mult);
          return { side: 1, key: k, name: w.name, img: w.img, hp: hp, max: hp, atk: Math.round(w.atk * mult), spd: w.spd, def: Math.round(w.def * mult) };
        });
        S.order = S.dogs.concat(S.wolves).slice().sort(function (a, b) { return b.spd - a.spd; });
        S.ptr = 0;
        var wv = d.querySelector("#wWave"); if (wv) wv.textContent = String(S.wave + 1);
      }
      function end(win) {
        if (iv) { clearInterval(iv); iv = null; }
        var pts = 0, fang = false;
        if (win) {
          pts = Math.round((6000 + 2500 * team.length) * (1 + 0.08 * Math.max(0, (st.stats.maxDogLevel || 1) - 1)));
          st.balance += pts;
          st.wolf.wins++; st.wolf.kills += 3 + S.wave * 1;
          fang = Math.random() < 0.35;
          if (fang) { st.inventory = st.inventory || {}; st.inventory.kurt_disi = (st.inventory.kurt_disi || 0) + 1; }
        } else st.wolf.losses++;
        st.wolf.nextAt = Date.now() + 5 * 60000;
        team.forEach(function (dg) { dg.energy = Math.max(0, dg.energy - 12); });
        PL.game.save();
        S = { mode: "result", win: win, pts: pts, fang: fang };
        draw();
      }
      function step() {
        if (!S || S.mode !== "battle") return;
        var u = null;
        for (var g = 0; g < 10; g++) { u = S.order[S.ptr % S.order.length]; S.ptr++; if (u.hp > 0) break; }
        if (!u || u.hp <= 0) return end(true);
        var enemies = (u.side === 0 ? S.wolves : S.dogs).filter(function (x) { return x.hp > 0; });
        if (!enemies.length) return end(u.side === 0);
        var t = enemies[Math.floor(Math.random() * enemies.length)];
        var crit = Math.random() < 0.12;
        var dmg = Math.max(6, Math.round(u.atk * (0.85 + Math.random() * 0.35) - t.def * 0.35));
        if (crit) dmg = Math.round(dmg * 1.6);
        t.hp = Math.max(0, t.hp - dmg);
        animate(u, t, dmg, crit);
        updateBars();
        if (S.wolves.every(function (x) { return x.hp <= 0; })) {
          S.wave++;
          if (S.wave >= 3) return setTimeout(function () { end(true); }, 700);
          clearInterval(iv); iv = null;
          S.dogs.forEach(function (x) { if (x.hp > 0) x.hp = Math.min(x.max, Math.round(x.hp + x.max * 0.25)); });
          setTimeout(function () {
            nextWave(); draw(); updateBars();
            iv = setInterval(step, 850);
          }, 1000);
        } else if (S.dogs.every(function (x) { return x.hp <= 0; })) {
          return setTimeout(function () { end(false); }, 700);
        }
      }
      function startBattle() {
        var now2 = Date.now();
        S = {
          mode: "battle", wave: 0, ptr: 0,
          dogs: team.map(function (dg) {
            var s2 = E.stats.dogStats(dg, now2);
            var hp = Math.round(s2.defense * 3 + s2.stamina * 2 + 120);
            return { side: 0, name: dg.name, img: E.breed(dg.breedId).image, hp: hp, max: hp, atk: Math.round(s2.power * 0.9 + s2.agility * 0.2), spd: s2.speed, def: Math.round(s2.defense * 0.5), ref: dg };
          })
        };
        nextWave();
        draw();
        updateBars();
        iv = setInterval(step, 850);
      }
      draw();
      return d;
    }
  });

  /* =============================================================================
     CEVIKLIK PARKURU — zamanlama mini oyunu (3 tur)
     ========================================================================== */
  U.registerScreen("agility", {
    render: function () {
      var st = PL.game.state, now = Date.now();
      st.agi = st.agi || { nextAt: 0, best: 0, plays: 0 };
      var d = el("div");
      var pos = 0, dir = 1, speed = 0.85, round = 1, score = 0, zone = { a: 40, b: 60 }, running = false, raf = null;
      function newZone() {
        var w = 24 - round * 4;
        var a = 8 + Math.random() * (84 - w);
        zone = { a: a, b: a + w };
      }
      function drawGame() {
        d.innerHTML = U.screenShell("Çeviklik Parkuru",
          "<div class='panel'><h3>🎯 " + (PL.i18n ? PL.i18n.t("Çeviklik Parkuru") : "Çeviklik Parkuru") + "</h3>" +
          "<p class='muted'>" + (round) + "/3 " + (PL.i18n ? PL.i18n.t("Tur") : "Tur") + " • " +
          (PL.i18n ? PL.i18n.t("Ödül") : "Ödül") + ": " + (PL.i18n ? PL.i18n.t("Puan") : "Puan") + " ×45</p>" +
          "<div class='agiTrack'><div class='agiZone' id='agiZone'></div><div class='agiMark' id='agiMark'></div></div>" +
          "<div class='actionRow'><button class='btn gold big' id='agiStop'>✋ " +
          (PL.i18n ? PL.i18n.t("DUR!") : "DUR!") + "</button></div>" +
          "<p id='agiMsg' class='muted'></p></div>").innerHTML;
        if (PL.i18n) PL.i18n.apply(d);
        paintZone();
        d.querySelector("#agiStop").addEventListener("click", stop);
      }
      function paintZone() {
        var z = d.querySelector("#agiZone");
        if (z) { z.style.left = zone.a + "%"; z.style.width = (zone.b - zone.a) + "%"; }
      }
      function tick() {
        pos += dir * speed;
        if (pos > 100) { pos = 100; dir = -1; }
        if (pos < 0) { pos = 0; dir = 1; }
        var m = d.querySelector("#agiMark");
        if (m) m.style.left = pos + "%";
        raf = requestAnimationFrame(tick);
      }
      function stop() {
        if (!running) { running = true; raf = requestAnimationFrame(tick); return; }
        cancelAnimationFrame(raf);
        var c = (zone.a + zone.b) / 2, half = (zone.b - zone.a) / 2;
        var msg = d.querySelector("#agiMsg");
        if (pos >= zone.a && pos <= zone.b) {
          var q = Math.round(100 - Math.abs(pos - c) / half * 50);
          score += q;
          if (msg) msg.textContent = "✅ +" + q + " (" + (PL.i18n ? PL.i18n.t("Tur") : "Tur") + " " + round + ")";
        } else if (msg) msg.textContent = "❌ " + (PL.i18n ? PL.i18n.t("Tur") : "Tur") + " " + round + " kaçtı!";
        round++;
        if (round > 3) return finish();
        speed += 0.4; newZone(); paintZone();
        running = false; pos = 0; dir = 1;
        setTimeout(function () { running = true; raf = requestAnimationFrame(tick); }, 600);
      }
      function finish() {
        var pts = score * 45;
        st.balance += pts;
        st.agi.plays++; st.agi.best = Math.max(st.agi.best, score);
        st.agi.nextAt = Date.now() + 5 * 60000;
        PL.game.save();
        d.innerHTML = U.screenShell("Çeviklik Parkuru",
          "<div class='panel' style='text-align:center;padding:26px'><h3>🎯 " + score + "/300</h3>" +
          "<p>" + (PL.i18n ? PL.i18n.t("Ödül") : "Ödül") + ": <b style='color:var(--gold)'>+" + E.fmt.compact(pts) + " " +
          (PL.i18n ? PL.i18n.t("Puan") : "Puan") + "</b></p>" +
          "<div class='actionRow' style='justify-content:center'><button class='btn gold' id='agiClose'>" +
          (PL.i18n ? PL.i18n.t("Kapat") : "Kapat") + "</button></div></div>").innerHTML;
        if (PL.i18n) PL.i18n.apply(d);
        d.querySelector("#agiClose").addEventListener("click", function () { U.back(); });
      }
      if (st.agi.nextAt > now) {
        d.innerHTML = U.screenShell("Çeviklik Parkuru",
          "<div class='panel' style='text-align:center;padding:26px'><h3>⏳</h3><p class='muted'>" +
          E.fmt.time((st.agi.nextAt - now) / 1000) + "</p><p>" + (PL.i18n ? PL.i18n.t("En iyi skor") : "En iyi skor") +
          ": <b>" + st.agi.best + "</b></p></div>").innerHTML;
      } else {
        newZone(); drawGame();
      }
      return d;
    }
  });


  /* =============================================================================
     MAGAZA — puan ile satin alma + Telegram Stars paketleri
     ========================================================================== */
  function TT(x) { return PL.i18n ? PL.i18n.t(x) : x; }

  var SHOP_OFFERS = [
    { id: "energy", icon: "icon_energy", name: "Enerji Dolumu", desc: "Tüm köpeklerin enerjisi anında dolar.", cost: 15000,
      apply: function (st) { st.dogs.forEach(function (x) { x.energy = 100; }); } },
    { id: "kurt_disi", icon: "icon_sword", name: "Kurt Dişi", desc: "Kurt ganimeti; koleksiyon değeri yüksek.", cost: 30000,
      apply: function (st) { st.inventory = st.inventory || {}; st.inventory.kurt_disi = (st.inventory.kurt_disi || 0) + 1; } },
    { id: "sans_tilismi", icon: "icon_charm", name: "Şans Tılsımı", desc: "Nadir bir koleksiyon eşyası.", cost: 60000,
      apply: function (st) { st.inventory = st.inventory || {}; st.inventory.sans_tilismi = (st.inventory.sans_tilismi || 0) + 1; } },
    { id: "altin_tasma", icon: "icon_key_gold", name: "Altın Tasma", desc: "Efsanevi koleksiyon parçası.", cost: 120000,
      apply: function (st) { st.inventory = st.inventory || {}; st.inventory.altin_tasma = (st.inventory.altin_tasma || 0) + 1; } },
    { id: "deri_tasma", icon: "icon_charm", name: "Deri Tasma", desc: "Donanım: kuşanılan köpeğe Güç +%3.", cost: 200000,
      apply: function (st) { st.inventory = st.inventory || {}; st.inventory.deri_tasma = (st.inventory.deri_tasma || 0) + 1; } },
    { id: "boyunluk", icon: "icon_shield", name: "Boyunluk", desc: "Donanım: kuşanılan köpeğe Savunma +%4.", cost: 300000,
      apply: function (st) { st.inventory = st.inventory || {}; st.inventory.boyunluk = (st.inventory.boyunluk || 0) + 1; } },
    { id: "vitamin", icon: "icon_serum", name: "Vitamin İlacı", desc: "Donanım: kuşanılan köpeğe XP +%10.", cost: 150000,
      apply: function (st) { st.inventory = st.inventory || {}; st.inventory.vitamin = (st.inventory.vitamin || 0) + 1; } }
  ];
  var STARS_OFFERS = [
    { id: "s25", stars: 25, name: "25 ⭐ Paket", desc: "250.000 puan", pts: 250000, item: null },
    { id: "s60", stars: 60, name: "60 ⭐ Paket", desc: "700.000 puan + Altın Tasma", pts: 700000, item: "altin_tasma" },
    { id: "eq_civili_tasma", stars: 150, name: "Çivili Tasma", desc: "Donanım: Güç +%10 (kalıcı, çok değerli!)", pts: 0, item: "civili_tasma" },
    { id: "eq_efsane_iksir", stars: 120, name: "Efsane İksir", desc: "Donanım: XP +%30 (kalıcı)", pts: 0, item: "efsane_iksir" },
    { id: "eq_civili_boyunluk", stars: 200, name: "Çivili Boyunluk", desc: "Donanım: Savunma +%12 (kalıcı, en pahalısı!)", pts: 0, item: "civili_boyunluk" }
  ];

  function starsFlow(o) {
    var st = PL.game.state;
    var tg = window.Telegram && window.Telegram.WebApp;
    if (!tg || typeof tg.openInvoice !== "function") {
      U.toast(TT("Stars ile alım yalnızca Telegram uygulamasında çalışır."), "err"); U.sfx("ui_error"); return;
    }
    if (!PL.net.online) {
      U.toast("Sunucuya bağlı değilsin — Ayarlar → Sunucu adresinden bağlan.", "err"); U.sfx("ui_error"); return;
    }
    PL.net.starsInvoice(o.id, function (ok, j) {
      if (!ok || !j || !j.url) { U.toast((j && j.error) || "Fatura oluşturulamadı", "err"); return; }
      tg.openInvoice(j.url, function (status) {
        if (status === "paid") {
          st.balance += o.pts;
          if (o.item) { st.inventory = st.inventory || {}; st.inventory[o.item] = (st.inventory[o.item] || 0) + 1; }
          st.shop.stars++;
          E.notify(st, "⭐ " + o.name + " satın alındı", "success");
          PL.net.starsPaid(o.id, function () { });
          if (PL.game.save) PL.game.save();
          U.sfx("reward_mythic");
          U.toast(TT("Ödeme alındı!") + (o.pts ? " +" + E.fmt.compact(o.pts) + " " + TT("Puan") : " " + TT(o.name)), "ok");
          U.replace("shop");
        } else U.toast("Ödeme tamamlanmadı (" + status + ")", "err");
      });
    });
  }

  U.registerScreen("shop", {
    render: function () {
      var st = PL.game.state;
      st.shop = st.shop || { buys: 0, stars: 0 };
      var html =
        "<div class='panel'><h3>" + U.icon("icon_coin") + " " + TT("Puan ile Satın Al") + "</h3>" +
        "<div class='shopGrid'>" + SHOP_OFFERS.map(function (o) {
          return "<div class='shopCard'><div class='shopIco'>" + U.icon(o.icon, "big") + "</div>" +
            "<b>" + esc(TT(o.name)) + "</b><p class='muted'>" + esc(TT(o.desc)) + "</p>" +
            "<button class='btn gold small' data-buy='" + o.id + "' " + (st.balance >= o.cost ? "" : "disabled") + ">" +
            U.icon("icon_coin") + " " + E.fmt.compact(o.cost) + "</button></div>";
        }).join("") + "</div></div>" +
        "<div class='panel'><h3>⭐ " + TT("Telegram Stars") + "</h3>" +
        "<p class='muted'>" + esc(TT("Stars ile alım yalnızca Telegram uygulamasında çalışır.")) +
        " " + esc("Sunucu tarafında TG_BOT_TOKEN tanımlı olmalıdır.") + "</p>" +
        "<div class='shopGrid'>" + STARS_OFFERS.map(function (o) {
          return "<div class='shopCard stars'><div class='shopIco'>⭐</div>" +
            "<b>" + esc(TT(o.name)) + "</b><p class='muted'>" + esc(TT(o.desc)) + "</p>" +
            "<button class='btn blue small' data-stars='" + o.id + "'>⭐ " + o.stars + " — " + TT("Satın Al") + "</button></div>";
        }).join("") + "</div>" +
        "<p class='muted' style='margin-top:10px'>" + esc("Star satın alımların: ") + "<b>" + st.shop.stars + "</b></p></div>";
      var d = U.screenShell("Mağaza", html);
      d.querySelectorAll("[data-buy]").forEach(function (b) {
        b.addEventListener("click", function () {
          var o = SHOP_OFFERS.filter(function (x) { return x.id === b.getAttribute("data-buy"); })[0];
          if (!o) return;
          if (st.balance < o.cost) { U.toast(TT("Yetersiz puan!"), "err"); U.sfx("ui_error"); return; }
          st.balance -= o.cost;
          o.apply(st);
          st.shop.buys++;
          E.notify(st, TT("Satın alındı!") + " " + o.name, "success");
          if (PL.game.save) PL.game.save();
          U.sfx("reward_chime");
          U.toast(TT("Satın alındı!") + " " + TT(o.name), "ok");
          U.replace("shop");
        });
      });
      d.querySelectorAll("[data-stars]").forEach(function (b) {
        b.addEventListener("click", function () {
          var o = STARS_OFFERS.filter(function (x) { return x.id === b.getAttribute("data-stars"); })[0];
          if (o) starsFlow(o);
        });
      });
      return d;
    }
  });

  /* =============================================================================
     DAVET ET — arkadas kodu, paylasim, davet odulleri
     ========================================================================== */
  var INVITE_MILESTONES = [
    { n: 1, pts: 50000, item: null },
    { n: 3, pts: 150000, item: "kurt_disi" },
    { n: 5, pts: 300000, item: null },
    { n: 10, pts: 500000, item: "altin_tasma" }
  ];

  U.registerScreen("invite", {
    render: function () {
      var st = PL.game.state;
      st.invite = st.invite || { used: null, invited: [], claimed: {} };
      var href = "index.html";
      try { href = (typeof location !== "undefined" && location.href) ? location.href.split("?")[0] : "index.html"; } catch (e) { }
      var link = href + "?ref=" + st.profile.code;
      var msg = "PAW LEGENDS: DOG WORLD oynuyorum! Bana katıl, ikimiz de ödül kazanalım: ";
      var refParam = null;
      try { refParam = new URLSearchParams((typeof location !== "undefined" && location.search) || "").get("ref"); } catch (e) { }
      if (refParam && /^PAW-[A-Z0-9]{6}$/i.test(refParam)) refParam = refParam.toUpperCase(); else refParam = null;

      var invited = st.invite.invited || [];
      var html =
        "<div class='panel'><h3>" + U.icon("icon_friends") + " " + TT("Kodunu paylaş") + "</h3>" +
        "<div class='inviteCode'>" + esc(st.profile.code) + "</div>" +
        "<p class='muted' style='text-align:center'>" + esc("Her arkadaşın senin kodunla başlarsa ") + "<b>50.000 " + esc(TT("Puan")) + "</b>" + esc(" kazanırsın; arkadaşın da ") + "<b>25.000</b>" + esc(" hoş geldin bonusu alır.") + "</p>" +
        "<div class='shareRow'>" +
        "<button class='btn green small' id='shWa'>WhatsApp</button>" +
        "<button class='btn blue small' id='shTg'>Telegram</button>" +
        "<button class='btn ghost small' id='shCopy'>" + TT("Kopyala") + "</button>" +
        "</div>" +
        "<input class='input' id='invLink' readonly value='" + esc(link) + "' style='margin-top:10px'></div>" +
        "<div class='panel'><h3>" + TT("Hoş geldin bonusu") + "</h3>" +
        (st.invite.used ? "<p class='muted'>" + esc("Kullandığın kod: ") + "<b>" + esc(st.invite.used) + "</b> ✓</p>"
          : "<p class='muted'>" + esc("Bir arkadaşının davet kodunu gir; ikiniz de ödül kazanın.") + "</p>" +
          "<div class='row' style='display:flex;gap:8px'><input class='input' id='refIn' placeholder='PAW-XXXXXX' maxlength='10' value='" + (refParam ? esc(refParam) : "") + "' style='flex:1'>" +
          "<button class='btn gold' id='refGo'>" + TT("Onayla") + "</button></div>" +
          (refParam ? "<p style='color:var(--ok)'>🔗 " + esc("Bağlantıda davet kodu algılandı!") + "</p>" : "")) +
        "</div>" +
        "<div class='panel'><h3>" + TT("Davet ödülleri") + " — <b>" + invited.length + "</b> " + esc(TT("davet")) + "</h3>" +
        INVITE_MILESTONES.map(function (m) {
          var done = invited.length >= m.n, got = !!st.invite.claimed[m.n];
          return "<div class='mileRow'><span>" + m.n + " " + esc(TT("davet")) + " → <b>" + E.fmt.compact(m.pts) + " " + esc(TT("Puan")) + "</b>" +
            (m.item ? " + 🦴 " + esc(TT(m.item === "altin_tasma" ? "Altın Tasma" : "Kurt Dişi")) : "") + "</span>" +
            (got ? "<span style='color:var(--ok)'>✓</span>" : done ? "<button class='btn gold small' data-mile='" + m.n + "'>" + TT("Ödülü al") + "</button>" : "<span class='muted'>" + invited.length + "/" + m.n + "</span>") +
            "</div>";
        }).join("") +
        "<p class='muted' style='margin-top:8px'>" + esc(TT("Davet sayımı sunucuya bağlıyken güncellenir.")) + "</p></div>";

      var d = U.screenShell("Davet Et", html);
      var redrawn = false;
      function openShare(u) { try { window.open(u, "_blank"); } catch (e) { } }
      var wa = d.querySelector("#shWa"); if (wa) wa.addEventListener("click", function () { openShare("https://wa.me/?text=" + encodeURIComponent(msg + link)); });
      var tg2 = d.querySelector("#shTg"); if (tg2) tg2.addEventListener("click", function () { openShare("https://t.me/share/url?url=" + encodeURIComponent(link) + "&text=" + encodeURIComponent(msg)); });
      var cp = d.querySelector("#shCopy");
      if (cp) cp.addEventListener("click", function () {
        var inp = d.querySelector("#invLink");
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link);
          else { inp.select && inp.select(); document.execCommand && document.execCommand("copy"); }
        } catch (e) { }
        U.toast(TT("Kopyalandı!"), "ok");
      });
      var rg = d.querySelector("#refGo");
      if (rg) rg.addEventListener("click", function () {
        var v = String(d.querySelector("#refIn").value || "").trim().toUpperCase();
        if (!/^PAW-[A-Z0-9]{6}$/.test(v)) { U.toast("Geçersiz kod biçimi (PAW-XXXXXX olmalı)", "err"); U.sfx("ui_error"); return; }
        if (v === st.profile.code) { U.toast("Kendi kodunu kullanamazsın!", "err"); U.sfx("ui_error"); return; }
        st.invite.used = v;
        st.balance += 25000;
        E.notify(st, "Davet kodu kullanıldı: " + v + " (+25.000 puan)", "success");
        if (PL.game.save) PL.game.save();
        if (PL.net.online) PL.net.applyInvite(v, function (ok2, j2) {
          U.toast(ok2 ? "Arkadaşın 50.000 puan ödülünü aldı!" : ("Sunucu: " + ((j2 && j2.error) || "davet işlenemedi")), ok2 ? "ok" : "err");
        });
        U.sfx("reward_chime");
        U.replace("invite");
      });
      d.querySelectorAll("[data-mile]").forEach(function (b) {
        b.addEventListener("click", function () {
          var n = parseInt(b.getAttribute("data-mile"), 10);
          var m = INVITE_MILESTONES.filter(function (x) { return x.n === n; })[0];
          if (!m || st.invite.claimed[n] || (st.invite.invited || []).length < n) return;
          st.invite.claimed[n] = true;
          st.balance += m.pts;
          if (m.item) { st.inventory = st.inventory || {}; st.inventory[m.item] = (st.inventory[m.item] || 0) + 1; }
          E.notify(st, "Davet ödülü (" + n + "): +" + E.fmt.compact(m.pts) + " puan", "success");
          if (PL.game.save) PL.game.save();
          U.sfx("reward_epic");
          U.replace("invite");
        });
      });
      if (PL.net.online && !redrawn) {
        PL.net.inviteStatus(function (ok3, j3) {
          if (ok3 && j3 && j3.invited) {
            var have = {}; (st.invite.invited || []).forEach(function (x) { have[x.code] = 1; });
            j3.invited.forEach(function (x) { if (x && x.code && !have[x.code]) { st.invite.invited.push(x); have[x.code] = 1; } });
            if (PL.game.save) PL.game.save();
            if (!redrawn && U.currentScreen() === "invite") { redrawn = true; U.replace("invite"); }
          }
        });
      }
      return d;
    }
  });


  /* =============================================================================
     DÖRTLÜ MASA — 4 kisilik sicak koltuk: sirayla kopek oynanir, en guclu kazanir
     ========================================================================== */
  U.registerScreen("table", {
    render: function () {
      var st = PL.game.state;
      st.table = st.table || { wins: 0, losses: 0, plays: 0 };
      var TB = null;
      var d = el("div");

      function pw(c) { return c.power; }
      function cardFace(c, cls) {
        if (!c) return "<div class='tCard empty" + (cls || "") + "'><span>—</span></div>";
        if (c.pass) return "<div class='tCard pass" + (cls || "") + "'><b>PAS</b></div>";
        return "<div class='tCard" + (cls || "") + "'><div class='tImg' style='background-image:url(\"" + c.img + "\")'></div>" +
          "<b>" + esc(c.name) + "</b><span class='tPw'>⚔ " + c.power + "</span></div>";
      }
      function dealHand() {
        var hand = [];
        for (var k = 0; k < 8; k++) {
          var bd = E.makeDog(1 + Math.floor(Math.random() * 100), { seed: Math.floor(Math.random() * 1e9), bornAt: Date.now() - 72 * 3600e3 });
          bd.level = 10 + Math.floor(Math.random() * 36);
          hand.push(mkCard(bd));
        }
        hand.sort(function (a, b) { return b.power - a.power; });
        return hand;
      }
      function mkCard(dog) {
        return { ref: dog, breedId: dog.breedId, name: dog.name, img: E.breed(dog.breedId).image, power: E.stats.dogStats(dog, Date.now()).power };
      }
      function setupHtml() {
        return U.screenShell("Dörtlü Masa",
          "<div class='panel'><h3>🃏 " + TT("Dörtlü Masa") + "</h3>" +
          "<p class='muted'>" + TT("4 oyuncu sırayla masaya köpek koyar; masadaki en güçlü köpeği oynayan eli kazanır. 3 el kazanan oyunu kazanır!") + "</p>" +
          "<div class='tSetup'>" + [0, 1, 2, 3].map(function (i) {
            return "<div class='tSeatCfg'><b>" + (i === 0 ? TT("Sen") : TT("Oyuncu") + " " + (i + 1)) + "</b>" +
              "<label><input type='checkbox' id='tBot" + i + "' " + (i === 0 ? "disabled" : "checked") + "> " + TT("Bot") + "</label></div>";
          }).join("") + "</div>" +
          "<p>" + TT("Sen kendi köpeklerinden 8'ini kullanırsın; diğer koltuklar (insan veya bot) rastgele 8'er köpek çeker.") + "</p>" +
          "<p>" + TT("Ödül") + ": <b style='color:var(--gold)'>50.000 " + TT("Puan") + "</b> • " + TT("Katılım") + ": <b>10.000</b></p>" +
          "<p class='muted'>" + TT("G") + ": " + st.table.wins + " • " + TT("Yenilgi") + ": " + st.table.losses + "</p>" +
          "<div class='actionRow'><button class='btn gold big' id='tStart'>" + TT("Başla") + "</button></div></div>").innerHTML;
      }
      function gameHtml() {
        var s0 = TB.seats[0];
        var myTurn = TB.turn === 0 && !s0.acted;
        return U.screenShell("Dörtlü Masa",
          "<div class='tTop'><b>" + TT("El") + " " + TB.trick + "/5</b>" +
          "<span class='muted'>" + (TB.best ? TT("Masadaki en güçlü") + ": <b style='color:var(--gold)'>⚔ " + TB.best.power + "</b>" : TT("Masa boş — lider ortaya köpek koymalı")) + "</span>" +
          "<span class='muted'>" + TT("Sıra") + ": <b>" + esc(TB.seats[TB.turn].name) + "</b></span></div>" +
          "<div class='tblGrid'>" + TB.seats.map(function (s) {
            return "<div class='tblSeat" + (TB.turn === s.i && !s.acted ? " turn" : "") + (TB.bestSeat === s.i ? " best" : "") + (s.i === 0 ? " me" : "") + "'>" +
              "<b>" + esc(s.name) + (s.bot ? " 🤖" : "") + "</b>" +
              "<span class='tTricks'>" + Array(s.tricks + 1).join("★") + "<i>" + TT("El") + ": " + s.hand.length + "</i></span>" +
              cardFace(s.played) + "</div>";
          }).join("") + "</div>" +
          "<div class='tLog'>" + TB.log.slice(0, 5).map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("") + "</div>" +
          "<div class='panel'><h3>" + (myTurn ? TT("Sıra sende — bir köpek oyna") : TT("Sıra") + ": " + esc(TB.seats[TB.turn].name) + (TB.seats[TB.turn].bot ? " 🤖" : "")) + "</h3>" +
          "<div class='tHand'>" + s0.hand.map(function (c, ix) {
            var can = myTurn && (!TB.best || c.power > TB.best.power);
            return "<div class='tCard hand" + (can ? "" : " dis") + "' data-card='" + ix + "'>" +
              "<div class='tImg' style='background-image:url(\"" + c.img + "\")'></div>" +
              "<b>" + esc(c.name) + "</b><span class='tPw'>⚔ " + c.power + "</span></div>";
          }).join("") + "</div>" +
          "<div class='actionRow'><button class='btn ghost' id='tPass' " + (myTurn && TB.best ? "" : "disabled") + ">" + TT("PAS") + "</button></div></div>").innerHTML;
      }
      function resultHtml() {
        var w = TB.winner >= 0 ? TB.seats[TB.winner] : null;
        var iWon = TB.winner === 0;
        return U.screenShell("Dörtlü Masa",
          "<div class='panel' style='text-align:center;padding:26px'>" +
          "<h3 style='font-size:26px'>" + (TB.winner < 0 ? "🤝 " + TT("Berabere!") : iWon ? "🏆 " + TT("Oyunu kazandın!") : "💀 " + TT("Oyunu kaybettin") + " — " + esc(w.name)) + "</h3>" +
          "<div class='tScore'>" + TB.seats.map(function (s) {
            return "<span" + (s.i === TB.winner ? " class='win'" : "") + ">" + esc(s.name) + ": <b>" + Array(s.tricks + 1).join("★") + "</b></span>";
          }).join("") + "</div>" +
          "<p>" + TT("Ödül") + ": <b style='color:var(--gold)'>+" + E.fmt.compact(iWon ? 50000 : 10000) + " " + TT("Puan") + "</b></p>" +
          "<div class='actionRow' style='justify-content:center'>" +
          "<button class='btn gold' id='tAgain'>" + TT("Tekrar Oyna") + "</button>" +
          "<button class='btn ghost' id='tClose'>" + TT("Kapat") + "</button></div></div>").innerHTML;
      }
      function draw() {
        d.innerHTML = TB ? (TB.over ? resultHtml() : gameHtml()) : setupHtml();
        if (PL.i18n) PL.i18n.apply(d);
        wire();
      }
      function startGame() {
        var seats = [];
        var myDogs = st.dogs.filter(function (x) { return E.stats.stageInfo(x, Date.now()).can_battle && !x.inMarket; })
          .map(mkCard).sort(function (a, b) { return b.power - a.power; }).slice(0, 8);
        if (!myDogs.length) { U.toast(TT("Savaşabilecek köpeğin yok (yavrular 4 saat sonra hazır olur)."), "err"); U.sfx("ui_error"); return; }
        for (var i = 0; i < 4; i++) {
          var cb = d.querySelector("#tBot" + i);
          var isBot = i === 0 ? false : !!(cb && cb.checked);
          seats.push({
            i: i, bot: isBot, tricks: 0, acted: false, played: null,
            name: i === 0 ? (st.profile.name || TT("Sen")) : (isBot ? "Bot " : TT("Oyuncu") + " ") + (i + 1),
            hand: i === 0 ? myDogs : dealHand()
          });
        }
        TB = { seats: seats, trick: 1, turn: 0, leader: 0, best: null, bestSeat: -1, over: false, winner: -1, log: [] };
        U.sfx("battle_win");
        draw();
        setTimeout(advance, 500);
      }
      function alive() { return TB && !TB.over && U.currentScreen() === "table"; }
      function advance() {
        if (!alive()) return;
        if (TB.seats.every(function (s) { return s.acted; })) return endTrick();
        var s = TB.seats[TB.turn];
        if (s.acted || (!s.hand.length && s.played !== null)) { TB.turn = (TB.turn + 1) % 4; return advance(); }
        if (!s.hand.length) { passSeat(s, true); return; }
        if (s.bot) setTimeout(function () { if (!alive()) return; botPlay(s); }, 850);
      }
      function botPlay(s) {
        var cand = null;
        if (!TB.best) {
          cand = s.hand[s.hand.length - 1];
        } else {
          var fits = s.hand.filter(function (c) { return c.power > TB.best.power; }).sort(function (a, b) { return a.power - b.power; });
          cand = fits[0] || null;
        }
        if (cand) playCard(s, cand); else passSeat(s);
      }
      function playCard(s, c) {
        s.hand = s.hand.filter(function (x) { return x !== c; });
        s.played = c; s.acted = true;
        if (!TB.best || c.power > TB.best.power) { TB.best = c; TB.bestSeat = s.i; }
        TB.log.unshift(s.name + " → " + c.name + " (⚔ " + c.power + ")");
        U.sfx("ui_click");
        TB.turn = (s.i + 1) % 4;
        draw();
        setTimeout(advance, 350);
      }
      function passSeat(s, silent) {
        s.played = { pass: true }; s.acted = true;
        TB.log.unshift(s.name + " → PAS");
        TB.turn = (s.i + 1) % 4;
        draw();
        setTimeout(advance, silent ? 120 : 500);
      }
      function endTrick() {
        if (TB.bestSeat < 0) return endGame();
        var w = TB.seats[TB.bestSeat];
        w.tricks++;
        TB.log.unshift("🏆 " + TT("El kazananı") + ": " + w.name + " (⚔ " + TB.best.power + ")");
        U.toast("🏆 " + TT("El kazananı") + ": " + w.name, "ok");
        U.sfx("reward_chime");
        if (w.tricks >= 3 || TB.trick >= 5 || TB.seats.every(function (s) { return !s.hand.length; })) return endGame();
        TB.trick++;
        TB.seats.forEach(function (s) { s.played = null; s.acted = false; });
        TB.best = null; TB.bestSeat = -1; TB.leader = w.i; TB.turn = w.i;
        draw();
        setTimeout(advance, 900);
      }
      function endGame() {
        TB.over = true;
        var sorted = TB.seats.slice().sort(function (a, b) { return b.tricks - a.tricks; });
        var tie = sorted[0].tricks === sorted[1].tricks;
        TB.winner = tie ? -1 : sorted[0].i;
        st.table.plays++;
        if (TB.winner === 0) {
          st.table.wins++; st.balance += 50000;
          E.notify(st, "Dörtlü Masa galibiyeti (+50.000 puan)", "success");
          U.sfx("reward_mythic");
        } else {
          st.table.losses++; st.balance += 10000;
        }
        if (PL.game.save) PL.game.save();
        draw();
      }
      function wire() {
        var bs = d.querySelector("#tStart"); if (bs) bs.addEventListener("click", startGame);
        d.querySelectorAll("[data-card]").forEach(function (n) {
          n.addEventListener("click", function () {
            if (!alive() || TB.turn !== 0) return;
            var s0 = TB.seats[0];
            if (s0.acted) return;
            var c = s0.hand[parseInt(n.getAttribute("data-card"), 10)];
            if (!c) return;
            if (TB.best && c.power <= TB.best.power) { U.toast(TT("Masadaki köpekten güçlü birini seçmelisin!"), "err"); U.sfx("ui_error"); return; }
            playCard(s0, c);
          });
        });
        var pp = d.querySelector("#tPass");
        if (pp) pp.addEventListener("click", function () {
          if (!alive() || TB.turn !== 0) return;
          var s0 = TB.seats[0];
          if (!s0.acted && TB.best) passSeat(s0);
        });
        var ag = d.querySelector("#tAgain"); if (ag) ag.addEventListener("click", function () { U.replace("table"); });
        var cl = d.querySelector("#tClose"); if (cl) cl.addEventListener("click", function () { U.back(); });
      }
      draw();
      return d;
    }
  });

})(typeof window !== "undefined" ? window : globalThis);
