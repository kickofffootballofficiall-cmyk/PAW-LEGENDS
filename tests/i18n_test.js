#!/usr/bin/env node
/* PAW LEGENDS — i18n testi: dil parity, ceviri, kalip, RTL */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "src/js/core/i18n.js"), "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const I = sandbox.window.PL.i18n;
let pass = 0, fail = 0;
const res = [];
function check(n, c, x) { if (c) { pass++; res.push("✓ " + n); } else { fail++; res.push("✗ " + n + (x ? " — " + x : "")); } }

const langs = Object.keys(I.dicts);
check("01 10 yabanci dil + tr = 11", langs.length === 10 && Object.keys(I.names).length === 11, langs.join(","));
const base = Object.keys(I.dicts.en).sort();
let parityOk = true, missing = "";
for (const l of langs) {
  const ks = Object.keys(I.dicts[l]).sort();
  const miss = base.filter(k => I.dicts[l][k] === undefined);
  const extra = ks.filter(k => !base.includes(k));
  if (miss.length || extra.length) { parityOk = false; missing += l + ":" + miss.length + "eksik/" + extra.length + "fazla "; }
}
check("02 tum diller ayni anahtar kumesi", parityOk, missing);
check("03 tr kimlik ceviri", I.t("Arena") === "Arena");
I.lang = "en";
check("04 en basit ceviri", I.t("Ayarlar") === "Settings");
check("05 en nav", I.t("Köpekler") === "Dogs");
check("06 en kalip Sv", I.t("Sv 12") === "Lv 12");
check("07 en kalip G/M/B", I.t("3G / 1M / 2B") === "3W / 1L / 2D");
check("08 bilinmeyen metin kaynak kalir", I.t("Olmayan bir metin") === "Olmayan bir metin");
I.lang = "ru"; check("09 ru", I.t("Pazar") === "Рынок");
I.lang = "ar"; check("10 ar", I.t("Savaş!") === "قاتل!");
I.lang = "zh"; check("11 zh", I.t("Galibiyet") === "胜");
I.lang = "ja"; check("12 ja", I.t("Eğit") === "訓練");
I.lang = "de"; check("13 de", I.t("Satın Al") === "Kaufen");
I.lang = "es"; check("14 es", I.t("Arkadaşlar") === "Amigos");
I.lang = "fr"; check("15 fr", I.t("Envanter") === "Inventaire");
I.lang = "pt"; check("16 pt", I.t("Bağlan") === "Conectar");
I.lang = "az"; check("17 az", I.t("Kasa") === "Sandıqlar");
I.lang = "xx"; check("18 gecersiz dil tr'ye duser", I.t("Ayarlar") === "Ayarlar" || I.lang !== "xx");
I.lang = "tr";
const emptyVal = langs.some(l => Object.values(I.dicts[l]).some(v => !v || !String(v).trim()));
check("19 bos ceviri yok", !emptyVal);
fs.writeFileSync(path.join(__dirname, "I18N_RESULTS.md"),
  "# I18N TEST SONUCLARI\n\n" + new Date().toISOString() + "\n\nGecen: " + pass + " | Kalan: " + fail +
  "\n\nDiller: " + Object.keys(I.names).join(", ") + "\n\n```\n" + res.join("\n") + "\n```\n");
console.log(res.join("\n"));
console.log("\n=== " + pass + "/" + (pass + fail) + " i18n testi gecti" + (fail ? " — BASARISIZ" : " — TUMU BASARILI") + " ===");
process.exit(fail ? 1 : 0);
