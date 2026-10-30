#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAW LEGENDS: DOG WORLD — varlik (asset) denetimi
Calistirma:  python3 tests/check_assets.py
Cikti:       tests/ASSET_REPORT.md
Kontrol: 100 irk gorseli (webp+svg, 720x720, benzersiz), 5 kasa, arka planlar,
         arayuz ikonlari, 24 ses dosyasi (WAV basligi gecerli, sure > 0),
         index.html referanslari, data/*.json ve data_bundle.js tutarliligi.
"""
import json, os, sys, wave, hashlib, html.parser, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ok_n = 0
problems = []

def check(cond, msg):
    global ok_n
    if cond:
        ok_n += 1
    else:
        problems.append(msg)

def p(*a):
    return os.path.join(ROOT, *a)

def rd_json(rel):
    with open(p(rel), encoding="utf-8") as f:
        return json.load(f)

try:
    from PIL import Image
    HAVE_PIL = True
except Exception:
    HAVE_PIL = False

print("PIL:", "var" if HAVE_PIL else "YOK (gorsel boyut kontrolu atlanir)")

# ---------------------------------------------------------------- KOPEKLER
breeds = rd_json("data/breeds.json")["breeds"]
check(len(breeds) == 100, "irk sayisi %d (100 olmali)" % len(breeds))
hashes = {}
sizes = []
for b in breeds:
    w, s = b["image"], b["image_svg"]
    check(os.path.exists(p(w)), "eksik webp: %s" % w)
    check(os.path.exists(p(s)), "eksik svg: %s" % s)
    if os.path.exists(p(w)):
        sz = os.path.getsize(p(w))
        sizes.append(sz)
        check(sz > 3000, "cok kucuk webp: %s (%d b)" % (w, sz))
        h = hashlib.md5(open(p(w), "rb").read()).hexdigest()
        check(h not in hashes, "ayni gorsel iki irkta kullanilmis: %s == %s" % (w, hashes.get(h, "?")))
        hashes[h] = w
        if HAVE_PIL:
            try:
                im = Image.open(p(w)); im.load()
                check(im.size[0] >= 720 and im.size[1] >= 720 and im.size[0] == im.size[1], "%s boyutu %s (kare ve >=720 olmali)" % (w, im.size))
                check(im.mode in ("RGB", "RGBA"), "%s kipi %s" % (w, im.mode))
            except Exception as e:
                problems.append("%s acilamadi: %s" % (w, e))
    if os.path.exists(p(s)):
        head = open(p(s), encoding="utf-8").read(300)
        check("<svg" in head, "svg bozuk: %s" % s)
check(len(set(sizes)) >= 95, "gorsel boyutlari cok benzer (kopya suphesi): %d benzersiz" % len(set(sizes)))
check(len(hashes) == 100, "benzersiz gorsel sayisi %d/100" % len(hashes))

# ---------------------------------------------------------------- KASALAR / ARKA PLAN / IKONLAR
crates = rd_json("data/crates.json")["crates"]
check(len(crates) == 5, "kasa sayisi %d" % len(crates))
for c in crates:
    check(os.path.exists(p(c["image"])), "eksik kasa gorseli: %s" % c["image"])
    check(os.path.exists(p(c["image"].replace(".webp", ".svg"))), "eksik kasa svg: %s" % c["image"])

bg_have = set(os.listdir(p("assets/backgrounds")))
check(len([f for f in bg_have if f.endswith(".webp")]) >= 6, "arka plan sayisi az: %s" % sorted(bg_have))
for bg in ["bg_menu", "bg_farm", "bg_arena", "bg_market", "bg_forest", "bg_mountain"]:
    check(any(f.startswith(bg + ".") for f in bg_have), "eksik arka plan: %s" % bg)
# kodda/CSS'te gecen her arka plan gercekten var mi?
import re as _re
bg_refs = set()
for rel in ["src/css/style.css", "src/js/ui/ui.js", "src/js/app.js",
            "scenes/screens_core.js", "scenes/screens_play.js", "index.html"]:
    if os.path.exists(p(rel)):
        bg_refs |= set(_re.findall(r"backgrounds/([a-z_0-9]+\.(?:webp|png|svg))", open(p(rel), encoding="utf-8").read()))
# ui.js icindeki SCREEN_BG haritasi (dinamik url) -> dosyalar var mi?
ui_txt = open(p("src/js/ui/ui.js"), encoding="utf-8").read()
m = _re.search(r"var SCREEN_BG = \{([^}]+)\}", ui_txt)
check(m is not None, "ui.js SCREEN_BG haritasi bulunamadi")
screen_bgs = set(_re.findall(r'"([a-z_0-9]+)"', m.group(1))) if m else set()
check(len(screen_bgs) >= 4, "ekran arka plani sayisi az: %s" % sorted(screen_bgs))
for r in sorted(screen_bgs):
    check(r + ".webp" in bg_have, "ekran arka plani yok: assets/backgrounds/%s.webp" % r)
bg_refs |= {r + ".webp" for r in screen_bgs}
check(len(bg_refs) >= 5, "kodda hic arka plan kullanilmiyor")
for r in sorted(bg_refs):
    check(r in bg_have, "kodda kullanilan arka plan yok: assets/backgrounds/%s" % r)

icons = [f for f in os.listdir(p("assets/ui")) if f.endswith(".svg")]
check(len(icons) >= 40, "arayuz ikon sayisi az: %d" % len(icons))
for f in icons:
    head = open(p("assets/ui", f), encoding="utf-8").read(200)
    check("<svg" in head, "bozuk ikon: %s" % f)

items = rd_json("data/items.json")["items"]
for it in items:
    check(os.path.exists(p(it["icon"])), "esya ikonu yok: %s (%s)" % (it["icon"], it["id"]))

# kod icinde U.icon("...") ile kullanilan ikonlar
used_icons = set()
for rel in ["src/js/ui/ui.js", "src/js/app.js", "scenes/screens_core.js", "scenes/screens_play.js"]:
    txt = open(p(rel), encoding="utf-8").read()
    import re
    used_icons |= set(re.findall(r"U\.icon\(\s*[\"']([a-z_0-9]+)[\"']", txt))
    used_icons |= set(re.findall(r"icon\(\s*[\"']([a-z_0-9]+)[\"']", txt))
    used_icons |= set(re.findall(r"assets/ui/([a-z_0-9]+)\.svg", txt))
for ic in sorted(used_icons):
    check(os.path.exists(p("assets/ui", ic + ".svg")), "kodda kullanilan ikon yok: assets/ui/%s.svg" % ic)

# ---------------------------------------------------------------- SESLER
snds = sorted(f for f in os.listdir(p("assets/sounds")) if f.endswith(".wav"))
check(len(snds) >= 20, "ses sayisi az: %d" % len(snds))
total_dur = 0.0
for f in snds:
    fp = p("assets/sounds", f)
    check(os.path.getsize(fp) > 1000, "bos ses: %s" % f)
    try:
        with wave.open(fp, "rb") as wv:
            frames = wv.getnframes(); rate = wv.getframerate()
            dur = frames / float(rate) if rate else 0
            total_dur += dur
            check(frames > 0 and dur > 0.02, "gecersiz WAV: %s (%.3f sn)" % (f, dur))
            check(wv.getnchannels() in (1, 2), "kanal sayisi bozuk: %s" % f)
    except Exception as e:
        problems.append("WAV okunamadi %s: %s" % (f, e))
required = ["bark_small", "bark_medium", "bark_large", "ui_click", "ui_back", "ui_error", "ui_hover",
            "crate_shake", "crate_open", "reward_chime", "reward_epic", "reward_mythic", "coin",
            "level_up", "breed_done", "puppy_yip", "battle_hit", "battle_crit", "battle_heal",
            "battle_win", "battle_lose", "music_menu", "music_farm", "music_battle"]
names = {f[:-4] for f in snds}
for r in required:
    check(r in names, "zorunlu ses eksik: %s.wav" % r)

# ---------------------------------------------------------------- HTML / JS / CSS / VERI
class RefParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.refs = []
    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if k in ("src", "href") and v and not v.startswith(("http://", "https://", "#", "data:")):
                self.refs.append(v)

hp = RefParser()
hp.feed(open(p("index.html"), encoding="utf-8").read())
check(len(hp.refs) >= 8, "index.html referans sayisi az: %d" % len(hp.refs))
for r in hp.refs:
    check(os.path.exists(p(r)), "index.html kirik referans: %s" % r)

for f in ["src/css/style.css", "src/js/core/engine.js", "src/js/core/data_bundle.js",
          "src/js/ui/ui.js", "src/js/app.js", "src/js/net.js",
          "scenes/screens_core.js", "scenes/screens_play.js", "manifest.webmanifest",
          "server/index.js", "README.md", "LICENSES.md", "INSTALL.md"]:
    check(os.path.exists(p(f)), "eksik proje dosyasi: %s" % f)

check(os.path.getsize(p("src/js/core/data_bundle.js")) > 50000, "data_bundle.js cok kucuk")

# bundle <-> data eslesmesi
bundle_txt = open(p("src/js/core/data_bundle.js"), encoding="utf-8").read()
i = bundle_txt.index("PL.DB = ") + len("PL.DB = ")
j = bundle_txt.index(";\n", i)
bundle = json.loads(bundle_txt[i:j])
check(bundle["breeds"] == breeds, "data_bundle breeds != data/breeds.json")
check(bundle["crates"] == crates, "data_bundle crates != data/crates.json")
check(bundle["items"] == items, "data_bundle items != data/items.json")
check(bundle["balance"] == rd_json("data/balance.json"), "data_bundle balance != data/balance.json")
check(bundle["quests"] == rd_json("data/quests.json"), "data_bundle quests != data/quests.json")
check(bundle["achievements"] == rd_json("data/achievements.json")["achievements"], "data_bundle achievements != data")
check(bundle["events"] == rd_json("data/events.json")["events"], "data_bundle events != data/events.json")
check(bundle["rarities"] == rd_json("data/rarities.json")["rarities"], "data_bundle rarities != data")

# ---------------------------------------------------------------- RAPOR
counts = {
    "dogs_webp": len([f for f in os.listdir(p("assets/dogs")) if f.endswith(".webp")]),
    "dogs_svg": len([f for f in os.listdir(p("assets/dogs")) if f.endswith(".svg")]),
    "crates": len([f for f in os.listdir(p("assets/crates")) if f.endswith(".webp")]),
    "backgrounds": len(os.listdir(p("assets/backgrounds"))),
    "ui_icons": len(icons),
    "sounds": len(snds),
    "kod_icinde_kullanilan_ikon": len(used_icons),
}
md = [
    "# PAW LEGENDS: DOG WORLD — Varlik (Asset) Denetim Raporu",
    "",
    "- Tarih: " + datetime.datetime.now().isoformat(timespec="seconds"),
    "- Komut: `python3 tests/check_assets.py`",
    "- Gecen kontrol: **%d**" % ok_n,
    "- Sorun: **%d**" % len(problems),
    "",
    "## Sayimlar",
    "",
    "| Varlik | Adet |",
    "|---|---:|",
] + ["| %s | %s |" % (k, v) for k, v in counts.items()] + [
    "| toplam ses suresi | %.1f sn |" % total_dur,
    "| 100 irk gorseli benzersiz (md5) | %d/100 |" % len(hashes),
    "",
    "## Sonuc",
    "",
    ("**TUM VARLIK KONTROLLERI GECTI**" if not problems else "**%d SORUN BULUNDU**" % len(problems)),
    "",
]
if problems:
    md.append("```")
    md.extend(problems)
    md.append("```")
with open(p("tests/ASSET_REPORT.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(md) + "\n")

for k, v in counts.items():
    print("  %s: %s" % (k, v))
print("toplam ses suresi: %.1f sn" % total_dur)
print("gecen kontrol: %d | sorun: %d" % (ok_n, len(problems)))
for x in problems[:40]:
    print("  SORUN:", x)
print("Rapor: tests/ASSET_REPORT.md")
sys.exit(1 if problems else 0)
