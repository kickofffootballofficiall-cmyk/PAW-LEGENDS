/* =============================================================================
   PAW LEGENDS — arayuz katmani: DOM yardimcilari, ses yoneticisi, router,
   yeniden kullanilabilir bilesenler (kart, rozet, modal, toast, sekme...)
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var E = PL.engine;
  var U = PL.ui = {};

  /* ------------------------------------------------------------- DOM ------ */
  function $(sel, rootEl) { return (rootEl || document).querySelector(sel); }
  function $$(sel, rootEl) { return Array.prototype.slice.call((rootEl || document).querySelectorAll(sel)); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "style") n.setAttribute("style", attrs[k]);
      else if (k.indexOf("on") === 0 && typeof attrs[k] === "function") n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  U.$ = $; U.$$ = $$; U.el = el; U.clear = clear;
  U.esc = function (s) {
    return String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  };

  /* ------------------------------------------------------------- SES ------ */
  var AudioMgr = U.audio = {
    ctx: null, buffers: {}, musicEl: null, musicOn: true, sfxOn: true,
    volMusic: 0.5, volSfx: 0.8, currentMusic: null, ready: false,
    init: function () {
      if (AudioMgr.ready) return;
      try {
        var AC = root.AudioContext || root.webkitAudioContext;
        if (AC) AudioMgr.ctx = new AC();
      } catch (e) { AudioMgr.ctx = null; }
      AudioMgr.ready = true;
    },
    load: function (name, cb) {
      if (AudioMgr.buffers[name]) { if (cb) cb(AudioMgr.buffers[name]); return; }
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "assets/sounds/" + name + ".wav", true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function () {
        if (!AudioMgr.ctx) { AudioMgr.buffers[name] = "fallback"; if (cb) cb(null); return; }
        AudioMgr.ctx.decodeAudioData(xhr.response, function (buf) {
          AudioMgr.buffers[name] = buf; if (cb) cb(buf);
        }, function () { AudioMgr.buffers[name] = "fallback"; if (cb) cb(null); });
      };
      xhr.onerror = function () { AudioMgr.buffers[name] = "fallback"; if (cb) cb(null); };
      xhr.send();
    },
    play: function (name, gainMul) {
      if (!AudioMgr.sfxOn) return;
      AudioMgr.init();
      var doPlay = function () {
        var b = AudioMgr.buffers[name];
        if (!b || b === "fallback") { return; }
        if (!AudioMgr.ctx) return;
        var src = AudioMgr.ctx.createBufferSource();
        var g = AudioMgr.ctx.createGain();
        g.gain.value = AudioMgr.volSfx * (gainMul || 1);
        src.buffer = b; src.connect(g); g.connect(AudioMgr.ctx.destination);
        src.start(0);
      };
      if (AudioMgr.buffers[name]) doPlay();
      else AudioMgr.load(name, doPlay);
    },
    barkFor: function (size) {
      var n = size === "toy" || size === "küçük" ? "bark_small" :
        (size === "dev" || size === "büyük" ? "bark_large" : "bark_medium");
      AudioMgr.play(n);
    },
    music: function (name) {
      if (AudioMgr.currentMusic === name) return;
      AudioMgr.currentMusic = name;
      if (AudioMgr.musicEl) { AudioMgr.musicEl.pause(); AudioMgr.musicEl = null; }
      if (!name || !AudioMgr.musicOn) return;
      var a = new Audio("assets/sounds/" + name + ".wav");
      a.loop = true; a.volume = AudioMgr.volMusic;
      a.play().catch(function () { });
      AudioMgr.musicEl = a;
    },
    setMusicOn: function (on) {
      AudioMgr.musicOn = on;
      if (!on && AudioMgr.musicEl) { AudioMgr.musicEl.pause(); AudioMgr.musicEl = null; AudioMgr.currentMusic = null; }
      else if (on && AudioMgr.currentMusic) { var n = AudioMgr.currentMusic; AudioMgr.currentMusic = null; AudioMgr.music(n); }
    },
    setSfxOn: function (on) { AudioMgr.sfxOn = on; }
  };
  U.sfx = function (name) { AudioMgr.play(name); };

  /* --------------------------------------------------------- ROUTER ------- */
  var screens = {};
  /* ekran bazli arka plan gorselleri (assets/backgrounds/) */
  var SCREEN_BG = {
    arena: "bg_arena", market: "bg_market", breed: "bg_forest",
    crates: "bg_mountain", collection: "bg_farm"
  };
  var history = [];
  var currentName = null;
  U.registerScreen = function (name, def) { screens[name] = def; };
  U.currentScreen = function () { return currentName; };
  U.show = function (name, params, opts) {
    var def = screens[name];
    if (!def) { console.warn("ekran yok:", name); return; }
    var host = $("#screenHost");
    if (!host) return;
    if (!opts || !opts.noHistory) {
      if (currentName && currentName !== name) history.push({ name: currentName, params: U._lastParams });
      if (history.length > 24) history.shift();
    }
    U._lastParams = params || {};
    currentName = name;
    U.sfx("ui_click");
    host.classList.add("leaving");
    var reduce = PL.game && PL.game.state && PL.game.state.settings.reduceMotion;
    setTimeout(function () {
      U.clear(host);
      var node = def.render(params || {});
      if (typeof node === "string") { var d = el("div", { class: "screen" }); d.innerHTML = node; node = d; }
      if (!node.classList.contains("screen")) node.classList.add("screen");
      var bgName = SCREEN_BG[name];
      if (bgName && !PL.game.state.settings.reduceMotion) {
        node.classList.add("hasBg");
        var bgd = el("div", { class: "screenBg" });
        bgd.style.backgroundImage = "url('assets/backgrounds/" + bgName + ".webp')";
        if (node.firstChild) node.insertBefore(bgd, node.firstChild); else node.appendChild(bgd);
      }
      host.appendChild(node);
      host.classList.remove("leaving");
      host.classList.add("entering");
      setTimeout(function () { host.classList.remove("entering"); }, reduce ? 0 : 260);
      if (def.onShow) def.onShow(params || {}, node);
      U.updateTopBar();
      U.updateNav();
      if (def.music && AudioMgr.musicOn) AudioMgr.music(def.music);
      else if (!def.music && AudioMgr.musicOn && PL.game && PL.game.state) AudioMgr.music("music_farm");
      window.scrollTo(0, 0);
    }, reduce ? 0 : 130);
  };
  U.back = function () {
    var prev = history.pop();
    U.sfx("ui_back");
    if (prev) { currentName = null; U.show(prev.name, prev.params, { noHistory: true }); }
    else U.show("hub", {}, { noHistory: true });
  };
  U.replace = function (name, params) { history = []; U.show(name, params, { noHistory: true }); };
  (function () {
    var _show = U.show;
    U.show = function (name, params, opts) {
      var r = _show(name, params, opts);
      if (PL.i18n) PL.i18n.apply(document.getElementById("screenHost"));
      return r;
    };
  })();
  U.currentName = function () { return currentName; };

  /* ------------------------------------------------------ UST BAR / NAV --- */
  U.updateTopBar = function () {
    var st = PL.game && PL.game.state;
    var bar = $("#topBalance");
    if (!bar || !st) return;
    bar.textContent = E.fmt.compact(st.balance);
    var pps = $("#topPps");
    if (pps) pps.textContent = "+" + E.fmt.num(E.economy.totalPerSec(st, Date.now()) * 60) + "/dk";
    var bell = $("#topBellCount");
    if (bell) {
      var un = st.notifications.filter(function (n) { return !n.read; }).length;
      bell.textContent = un > 0 ? un : "";
      bell.style.display = un > 0 ? "flex" : "none";
    }
    var av = $("#topAvatar");
    if (av) {
      var b = E.breed(st.profile.avatarBreed || 8);
      av.style.backgroundImage = "url('" + b.image + "')";
    }
  };
  U.updateNav = function () {
    $$(".navBtn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-screen") === currentName);
    });
  };

  /* ----------------------------------------------------------- TOAST ------ */
  U.toast = function (text, kind) {
    text = (PL.i18n ? PL.i18n.t(text) : text);
    var host = $("#toastHost");
    if (!host) return;
    var t = el("div", { class: "toast " + (kind || "info"), html: text });
    host.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2600);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3100);
  };

  /* ----------------------------------------------------------- MODAL ------ */
  U.modal = function (opts) {
    var wrap = el("div", { class: "modalWrap" });
    var box = el("div", { class: "modal " + (opts.cls || "") });
    if (opts.title) box.appendChild(el("div", { class: "modalTitle", html: opts.title }));
    var body = el("div", { class: "modalBody" });
    if (typeof opts.body === "string") body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    box.appendChild(body);
    if (opts.buttons) {
      var foot = el("div", { class: "modalFoot" });
      opts.buttons.forEach(function (b) {
        foot.appendChild(el("button", {
          class: "btn " + (b.cls || "ghost"),
          onclick: function () { if (b.onClick && b.onClick(wrap) === false) return; close(); }
        }, [b.label]));
      });
      box.appendChild(foot);
    }
    wrap.appendChild(box);
    wrap.addEventListener("click", function (e) { if (e.target === wrap && opts.dismissable !== false) close(); });
    function close() {
      wrap.classList.add("closing");
      setTimeout(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 180);
    }
    document.body.appendChild(wrap);
    U.sfx("ui_click");
    return { close: close, box: box, body: body };
  };
  U.confirm = function (title, text, onYes, yesLabel) {
    U.modal({
      title: title, body: "<p>" + text + "</p>",
      buttons: [
        { label: "Vazgeç", cls: "ghost" },
        { label: yesLabel || "Onayla", cls: "gold", onClick: function () { onYes(); } }
      ]
    });
  };

  /* ------------------------------------------------------- BILESENLER ----- */
  U.icon = function (name, cls) {
    return "<img class='ic " + (cls || "") + "' src='assets/ui/" + name + ".svg' alt=''>";
  };
  U.rarityBadge = function (key) {
    var r = E.rar(key);
    return "<span class='rarBadge' style='--rc:" + r.color + ";--rcd:" + r.color_dark + "'>" +
      U.esc(r.name_tr) + "</span>";
  };
  U.statRow = function (label, value, max, color) {
    var pct = Math.max(2, Math.min(100, (value / (max || 100)) * 100));
    return "<div class='statRow'><span class='statLabel'>" + U.esc(label) + "</span>" +
      "<div class='statBar'><i style='width:" + pct + "%;background:" + (color || "var(--gold)") + "'></i></div>" +
      "<span class='statVal'>" + value + "</span></div>";
  };
  U.dogCard = function (dog, opts) {
    opts = opts || {};
    var now = Date.now();
    var b = E.breed(dog.breedId);
    var r = E.rar(dog.rarity);
    var stage = E.stats.stageOf(dog, now);
    var cls = "dogCard rar-" + dog.rarity.replace(/[^a-z0-9]/gi, "");
    if (opts.selected) cls += " selected";
    if (opts.dim) cls += " dim";
    var sex = dog.sex === "m" ? "♂" : "♀";
    var sexCls = dog.sex === "m" ? "m" : "f";
    var extra = "";
    var cd = "";
    try {
      var si = E.stats.stageInfo(dog, now);
      if (!si.can_battle) {
        var gs = E.bal().breeding.growth_stages, ord = ["yavru", "genç", "yetişkin", "usta", "yaşlı"], tgt = null;
        for (var gi = 0; gi < ord.length; gi++) if (gs[ord[gi]].can_battle) { tgt = gs[ord[gi]].min_hours; break; }
        if (tgt != null) cd = " ⏳ " + E.fmt.time(Math.max(0, (tgt * 3600000 - (now - dog.bornAt)) / 1000));
      }
    } catch (e) { }
    if (opts.sub) extra = "<div class='cardSub'>" + opts.sub + "</div>";
    else extra = "<div class='cardSub'>" + U.esc(stage) + cd + " • " +
      (dog.mutation ? "✦ Mutant" : (dog.traits.length ? "★ Özellikli" : "Standart")) + "</div>";
    return "<div class='" + cls + "' data-uid='" + dog.uid + "' style='--rc:" + r.color + ";--rcd:" + r.color_dark + "'>" +
      "<div class='cardImg' style='background-image:url(\"" + b.image + "\")'>" +
      (dog.inMarket ? "<span class='flag market'>PAZARDA</span>" : "") +
      ((dog.breedCooldownUntil || 0) > now ? "<span class='flag cd'>" + E.fmt.time((dog.breedCooldownUntil - now) / 1000) + "</span>" : "") +
      "</div>" +
      "<div class='cardName'>" + U.esc(dog.name) + " <span class='sex " + sexCls + "'>" + sex + "</span></div>" +
      "<div class='cardBreed'>" + U.esc(b.name_tr) + "</div>" +
      U.rarityBadge(dog.rarity) +
      "<div class='cardLvl'>Sv " + dog.level + "</div>" +
      extra +
      "</div>";
  };
  U.progress = function (val, max, cls) {
    var p = Math.max(0, Math.min(100, (val / Math.max(1, max)) * 100));
    return "<div class='pbar " + (cls || "") + "'><i style='width:" + p + "%'></i></div>";
  };
  U.empty = function (icon, title, text) {
    return "<div class='emptyState'>" + U.icon(icon, "big") + "<h3>" + U.esc(title) + "</h3><p>" + U.esc(text || "") + "</p></div>";
  };
  U.sectionTitle = function (t, sub) {
    return "<div class='secTitle'><h2>" + U.esc(t) + "</h2>" + (sub ? "<span>" + U.esc(sub) + "</span>" : "") + "</div>";
  };
  U.screenShell = function (title, inner, opts) {
    opts = opts || {};
    var head = "<header class='screenHead'>" +
      (opts.noBack ? "" : "<button class='iconBtn' data-act='back'>" + U.icon("icon_back") + "</button>") +
      "<h1>" + U.esc(PL.i18n ? PL.i18n.t(title) : title) + "</h1>" + (opts.right || "") + "</header>";
    var d = el("div", { class: "screen" });
    d.innerHTML = head + "<div class='screenBody" + (opts.wide ? " wide" : "") + "'>" + inner + "</div>";
    d.querySelector("[data-act='back']").addEventListener("click", function () { U.back(); });
    return d;
  };

  /* -------------------------------------------------- SAYI ANIMASYONU ----- */
  U.countUp = function (node, from, to, dur, fmt) {
    var t0 = performance.now();
    fmt = fmt || E.fmt.num;
    function step(t) {
      var k = Math.min(1, (t - t0) / (dur || 600));
      var e = 1 - Math.pow(1 - k, 3);
      node.textContent = fmt(Math.round(from + (to - from) * e));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  /* ------------------------------------------------------- YARDIMCI ------- */
  U.dogByUid = function (uid) {
    var st = PL.game.state;
    for (var i = 0; i < st.dogs.length; i++) if (st.dogs[i].uid === uid) return st.dogs[i];
    return null;
  };
  U.saveNow = function () { if (PL.game) PL.game.save(); };
})(typeof window !== "undefined" ? window : globalThis);
