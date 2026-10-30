/* =============================================================================
   PAW LEGENDS — cevrim ici istemci (server/index.js ile konusur)
   Yerel mod her zaman calisir; sunucu varsa kritik islemler dogrulanir.
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var N = PL.net = { url: "", token: null, online: false };

  function req(method, path, body, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, N.url + path, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (N.token) xhr.setRequestHeader("X-Auth", N.token);
    xhr.timeout = 6000;
    xhr.onload = function () {
      try {
        var j = JSON.parse(xhr.responseText);
        cb(xhr.status >= 200 && xhr.status < 300, j);
      } catch (e) { cb(false, { error: "bad response" }); }
    };
    xhr.onerror = xhr.ontimeout = function () { cb(false, { error: "network" }); };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  N.connect = function (url, cb) {
    N.url = url.replace(/\/$/, "");
    req("GET", "/api/ping", null, function (ok, j) {
      if (!ok) { cb(false, "Sunucuya ulaşılamadı: " + N.url); return; }
      var st = PL.game.state;
      req("POST", "/api/auth/login", { name: st.profile.name, code: st.profile.code }, function (ok2, j2) {
        if (!ok2) {
          if (j2.error === "banned") {
            cb(false, "⛔ HESAP YASAKLI: " + (j2.reason || "admin tarafından yasaklandın") +
              (j2.until ? " — " + new Date(j2.until).toLocaleString("tr-TR") + " tarihine kadar" : " — kalıcı"));
          } else cb(false, "Giriş başarısız: " + (j2.error || "?"));
          return;
        }
        N.token = j2.token; N.online = true;
        st.online = { mode: "online", server: N.url, user: j2.user, token: j2.token };
        N.mergeServerDogs(j2.dogsList || []);
        PL.game.save();
        cb(true, "Sunucuya bağlanıldı: " + j2.user.name + " (" + j2.user.code + ")");
      });
    });
  };
  N.heartbeat = function (cb) {
    if (!N.online) { if (cb) cb(false, { error: "offline" }); return; }
    req("POST", "/api/heartbeat", null, cb || function () { });
  };
  N.leave = function () {
    if (!N.online || !N.url || !N.token) return;
    var u = N.url + "/api/leave";
    var body = JSON.stringify({ token: N.token });
    try {
      if (root.fetch) {
        fetch(u, { method: "POST", keepalive: true, body: body,
          headers: { "Content-Type": "application/json", "X-Auth": N.token } })["catch"](function () { });
        return;
      }
    } catch (e) { }
    try {
      var x = new XMLHttpRequest();
      x.open("POST", u, true);
      x.setRequestHeader("Content-Type", "application/json");
      x.setRequestHeader("X-Auth", N.token);
      x.timeout = 2500;
      x.send(body);
    } catch (e2) { }
  };
  N.disconnect = function () {
    N.leave();
    N.online = false; N.token = null;
    var st = PL.game.state;
    st.online = { mode: "local", server: st.online.server || "", user: null, token: null };
    PL.game.save();
  };
  N.syncProfile = function (cb) {
    if (!N.online) { if (cb) cb(false, { error: "offline" }); return; }
    var st = PL.game.state;
    req("POST", "/api/sync", {
      balance: st.balance, rating: st.arena.rating, wins: st.arena.wins, losses: st.arena.losses,
      dogs: st.dogs.length, breeds: (st.stats.breedsDiscovered || []).length, level: st.stats.maxDogLevel
    }, cb || function () { });
  };
  N.leaderboard = function (cb) { req("GET", "/api/leaderboard", null, cb); };
  N.listings = function (cb) { req("GET", "/api/market/listings", null, cb); };
  N.list = function (dog, price, cb) { req("POST", "/api/market/list", { dog: dog, price: price }, cb); };
  N.buy = function (id, cb) { req("POST", "/api/market/buy", { id: id }, cb); };
  N.addFriend = function (code, cb) { req("POST", "/api/friends/request", { code: code }, cb); };
  N.acceptFriend = function (code, cb) { req("POST", "/api/friends/accept", { code: code }, cb); };
  N.applyInvite = function (ref, cb) { req("POST", "/api/invite", { ref: ref }, cb); };
  N.inviteStatus = function (cb) { req("GET", "/api/invite/status", null, cb); };
  N.starsInvoice = function (offer, cb) { req("POST", "/api/stars/invoice", { offer: offer }, cb); };
  N.starsPaid = function (offer, cb) { req("POST", "/api/stars/paid", { offer: offer }, cb); };
  N.verifyEarnings = function (payload, cb) { req("POST", "/api/verify/earnings", payload, cb); };

  /* Admin'in sunucu tarafinda verdigi kopekleri yerel kennel'e erit.
     Birlestirilen uid'ler /api/dogs/ack ile sunucudan dusurulur (tekrar eklenmez). */
  N.mergeServerDogs = function (list) {
    var st = PL.game && PL.game.state;
    if (!st || !Array.isArray(list) || !list.length) return 0;
    var merged = [];
    list.forEach(function (sd) {
      if (!sd || !sd.uid) return;
      var dup = st.dogs.some(function (x) { return x.uid === sd.uid; });
      if (!dup) { st.dogs.push(sd); merged.push(sd.uid); }
    });
    if (merged.length) {
      if (PL.ui && PL.ui.toast) PL.ui.toast("🐶 Sunucudan " + merged.length + " yeni köpek geldi!", "ok");
      PL.game.save();
      if (N.online) req("POST", "/api/dogs/ack", { uids: merged }, function () { });
    }
    return merged.length;
  };

  /* Admin panelinden olusturulan oyuncunun koduyla giris (loginOnly). */
  N.remoteLogin = function (url, code, cb) {
    var base = String(url || "").trim().replace(/\/$/, "");
    if (!/^https?:\/\//i.test(base)) base = "http://" + base;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", base + "/api/auth/login", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 8000;
    xhr.onload = function () {
      try {
        var j = JSON.parse(xhr.responseText);
        cb(xhr.status >= 200 && xhr.status < 300, j, base);
      } catch (e) { cb(false, { error: "yanitsiz sunucu" }, base); }
    };
    xhr.onerror = xhr.ontimeout = function () { cb(false, { error: "sunucuya ulasilamadi" }, base); };
    xhr.send(JSON.stringify({ code: String(code || "").toUpperCase(), loginOnly: true, name: "" }));
  };

  /* Admin mudehalelerini cekir: puan odulu, mesaj, duyuru, ban kontrolu */
  N.pollAdmin = function (cb) {
    if (!N.online) { if (cb) cb(false); return; }
    req("GET", "/api/me", null, function (ok, j) {
      if (!ok) { if (cb) cb(false); return; }
      var st = PL.game.state;
      if (j.banned) {
        N.disconnect();
        if (PL.ui && PL.ui.toast) PL.ui.toast("⛔ Hesabın admin tarafından yasaklandı — çevrimdışı moda alındın", "err");
        if (cb) cb(false, "banned");
        return;
      }
      var ids = [];
      (j.mail || []).forEach(function (m) {
        ids.push(m.id);
        if (m.type === "points") {
          var amt = Number(m.amount) || 0;
          st.balance += amt;
          if (PL.ui && PL.ui.toast) {
            if (amt < 0) PL.ui.toast("🧾 " + (m.text || "Admin işlemi") + " (" + amt + " puan)", "info");
            else PL.ui.toast("🎁 " + (m.text || "Admin ödülü") + ": +" + amt + " puan", "ok");
          }
        } else if (m.type === "item" && m.itemId) {
          st.inventory = st.inventory || {};
          st.inventory[m.itemId] = (st.inventory[m.itemId] || 0) + (Number(m.qty) || 1);
          if (PL.ui && PL.ui.toast) PL.ui.toast("🎁 " + (m.text || "Admin hediyesi geldi!"), "ok");
        } else if (m.type === "dog_removed") {
          var before = st.dogs.length;
          st.dogs = st.dogs.filter(function (x) { return x.uid !== m.uid; });
          if (st.dogs.length !== before && PL.ui && PL.ui.toast) PL.ui.toast("📤 " + (m.text || "Bir köpeğin admin tarafından kaldırıldı"), "info");
        } else if (m.type === "message" && PL.ui && PL.ui.toast) {
          PL.ui.toast("📩 Admin: " + m.text, "info");
        }
      });
      if (ids.length) { PL.game.save(); req("POST", "/api/mail/ack", { ids: ids }, function () { }); }
      N.mergeServerDogs(j.dogsList || []);
      st.online = st.online || {};
      var an = j.announcement;
      if (an && st.online.lastAnnounce !== an.id) {
        st.online.lastAnnounce = an.id; PL.game.save();
        if (PL.ui && PL.ui.toast) PL.ui.toast("📢 " + an.text, "info");
      }
      if (cb) cb(true, j);
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
