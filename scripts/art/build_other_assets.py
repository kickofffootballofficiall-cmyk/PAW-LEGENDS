#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAW LEGENDS - kasa (crate), arka plan ve arayuz varliklarini uretir.
Cikti:
  assets/crates/crate_{silver,gold,diamond,legendary,mythic}.webp (+ .svg)
  assets/backgrounds/bg_{menu,farm,arena,forest,mountain,market}.webp
  assets/ui/*.svg  (ikon seti: para, kasa, arena, pazar, arkadas, gorev,
                    basarim, ayarlar, profil, koleksiyon, envanter, yardim,
                    geri, kilit, kalp, kalkan, yildirim, beyin, pati, yildiz ...)
"""
import json
import math
import os
import random

import numpy as np
import cairosvg
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CR = os.path.join(ROOT, "assets", "crates")
BG = os.path.join(ROOT, "assets", "backgrounds")
UI = os.path.join(ROOT, "assets", "ui")
OUT = 720


def hx(c):
    c = c.lstrip("#")
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def mix(c1, c2, t):
    a, b = hx(c1), hx(c2)
    return "#%02x%02x%02x" % tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def lighter(c, t):
    return mix(c, "#ffffff", t)


def darker(c, t):
    return mix(c, "#000000", t)


# ===========================================================================
# KASALAR
# ===========================================================================
def crate_svg(cid, accent, accent2, rng):
    """Metalik, isikli, premium kasa cizimi (onde, hafif 3/4 perspektif)."""
    W = H = 720
    defs, body = [], []

    def grad(gid, stops, **at):
        a = " ".join('%s="%s"' % (k.replace("_", "-"), v) for k, v in at.items())
        st = [(t[0], t[1], t[2] if len(t) > 2 else None) for t in stops]
        s = "".join('<stop offset="%s" stop-color="%s"%s/>' %
                    (o, c, ' stop-opacity="%s"' % op if op is not None else "")
                    for o, c, op in st)
        defs.append('<linearGradient id="%s" %s>%s</linearGradient>' % (gid, a, s))
        return gid

    def rgrad(gid, stops, **at):
        a = " ".join('%s="%s"' % (k.replace("_", "-"), v) for k, v in at.items())
        st = [(t[0], t[1], t[2] if len(t) > 2 else None) for t in stops]
        s = "".join('<stop offset="%s" stop-color="%s"%s/>' %
                    (o, c, ' stop-opacity="%s"' % op if op is not None else "")
                    for o, c, op in st)
        defs.append('<radialGradient id="%s" %s>%s</radialGradient>' % (gid, a, s))
        return gid

    gold = "#f5c76a"
    metal_d = darker(accent2, .45)
    g_face = grad("gFace", [("0", lighter(accent, .55)), ("0.35", accent),
                            ("0.75", darker(accent, .35)), ("1", darker(accent, .55))],
                  x1="0", y1="0", x2="1", y2="1")
    g_top = grad("gTop", [("0", lighter(accent, .7)), ("0.5", lighter(accent, .25)),
                          ("1", accent)], x1="0", y1="0", x2="0.3", y2="1")
    g_side = grad("gSide", [("0", darker(accent, .25)), ("1", darker(accent, .6))],
                  x1="0", y1="0", x2="1", y2="0.6")
    g_glow = rgrad("gGlow", [("0", accent, .85), ("0.5", accent, .30), ("1", accent, 0)],
                   cx="0.5", cy="0.5", r="0.5")
    g_gold = grad("gGold", [("0", "#fff3c8"), ("0.4", gold), ("1", "#8a5c12")],
                  x1="0", y1="0", x2="1", y2="1")

    # zemin parlamasi
    body.append('<ellipse cx="360" cy="600" rx="300" ry="70" fill="url(#gGlow)" opacity="0.8"/>')
    body.append('<ellipse cx="360" cy="620" rx="230" ry="34" fill="#000000" opacity="0.5"/>')

    # govde (kutu) - on yuz
    body.append('<path d="M150 330 L150 560 Q150 596 186 596 L534 596 Q570 596 570 560 L570 330 Z" '
                'fill="url(#gFace)"/>')
    # yan yuz (3/4)
    body.append('<path d="M570 330 L640 296 L640 520 Q640 552 610 560 L570 560 Z" fill="url(#gSide)"/>')
    # kapak
    body.append('<path d="M150 330 L220 268 L640 268 L570 330 Z" fill="url(#gTop)"/>')
    body.append('<path d="M570 330 L640 268 L640 296 L570 358 Z" fill="%s"/>' % darker(accent, .5))
    # kapak kaldirma cizgisi + isik sizintisi
    body.append('<rect x="150" y="322" width="420" height="10" fill="%s" opacity="0.9"/>'
                % lighter(accent, .5))
    body.append('<rect x="150" y="318" width="420" height="18" fill="url(#gGlow)" opacity="0.9"/>')
    # metal bantlar
    for x in (210, 470):
        body.append('<rect x="%d" y="330" width="40" height="266" fill="url(#gGold)" opacity="0.95"/>' % x)
        body.append('<rect x="%d" y="330" width="10" height="266" fill="#fff8e0" opacity="0.5"/>' % x)
    body.append('<rect x="150" y="430" width="420" height="34" fill="url(#gGold)" opacity="0.9"/>')
    body.append('<rect x="150" y="430" width="420" height="8" fill="#fff8e0" opacity="0.45"/>')
    # kilit / amblem
    body.append('<circle cx="360" cy="447" r="52" fill="%s" stroke="url(#gGold)" stroke-width="8"/>'
                % darker(accent2, .35))
    body.append('<circle cx="360" cy="447" r="38" fill="url(#gGlow)"/>')
    # pati amblemi
    paw = ('<g fill="%s" opacity="0.95">' % "#0d0b12")
    paw += '<ellipse cx="360" cy="456" rx="17" ry="14"/>'
    for dx, dy in ((-16, -12), (-6, -19), (6, -19), (16, -12)):
        paw += '<ellipse cx="%d" cy="%d" rx="7.5" ry="9.5"/>' % (360 + dx, 447 + dy)
    paw += '</g>'
    body.append(paw)
    # köse zırhları
    for (x, y) in ((150, 330), (570, 330), (150, 596), (570, 596)):
        body.append('<circle cx="%d" cy="%d" r="16" fill="url(#gGold)"/>' % (x, y))
        body.append('<circle cx="%d" cy="%d" r="6" fill="%s"/>' % (x, y, metal_d))
    # parlama cizgileri
    body.append('<path d="M180 340 L240 596 L210 596 L168 420 Z" fill="#ffffff" opacity="0.10"/>')
    body.append('<path d="M520 340 L560 340 L520 596 L480 596 Z" fill="#000000" opacity="0.16"/>')
    # ucan isik parcaciklari
    for i in range(26):
        x = 180 + rng.random() * 360
        y = 120 + rng.random() * 220
        r = 2 + rng.random() * 5
        body.append('<circle cx="%.0f" cy="%.0f" r="%.1f" fill="%s" opacity="%.2f"/>'
                    % (x, y, r, lighter(accent, .6), .25 + .5 * rng.random()))
    # ust isik huzmesi
    body.append('<path d="M300 40 L420 40 L470 268 L250 268 Z" fill="url(#gGlow)" opacity="0.5"/>')
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
           '<defs>%s</defs>%s</svg>' % (W, H, W, H, "".join(defs), "".join(body)))
    return svg


# ===========================================================================
# ARKA PLANLAR
# ===========================================================================
def _save_bg(arr_fn, path):
    img = arr_fn()
    img.save(path, "WEBP", quality=84, method=5)


def bg_gradient(c_top, c_mid, c_bot, glow=None, glow_pos=(0.5, 0.35)):
    size = OUT
    y = np.linspace(0, 1, size)[:, None, None].astype(np.float32)
    top, mid, bot = (np.array(hx(c), np.float32) for c in (c_top, c_mid, c_bot))
    a = np.zeros((size, size, 3), np.float32)
    t1 = np.clip(y * 2, 0, 1)
    t2 = np.clip((y - 0.5) * 2, 0, 1)
    a[:] = top[None, None] * (1 - t1) + mid[None, None] * t1
    a[:] = a * (1 - t2) + bot[None, None] * t2
    if glow:
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
        d = np.sqrt((xx - glow_pos[0]) ** 2 + ((yy - glow_pos[1]) * 1.15) ** 2)
        g = np.clip(1 - d / 0.55, 0, 1) ** 2
        a += np.array(hx(glow), np.float32)[None, None] * g[..., None] * 0.5
    return a


def _mountains(rng, color_far, color_near, snow=True):
    """Katmanli dag siluetleri (numpy maskesi + PIL cizim)."""
    size = OUT
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    layers = [(color_far, 0.42, 0.10), (mix(color_far, color_near, .5), 0.55, 0.14),
              (color_near, 0.72, 0.18)]
    for col, base, amp in layers:
        ct = hx(col)
        pts = [(0, size)]
        n = 9
        for i in range(n + 1):
            x = size * i / n
            h = size * (base - amp * abs(math.sin(i * 1.7 + rng.random() * .6)) - rng.random() * .05)
            pts.append((x, h))
        pts.append((size, size))
        d.polygon(pts, fill=ct + (255,))
        if snow and col is color_far:
            for i in range(1, n):
                x = size * i / n
                d.polygon([(x - 26, pts[i][1] + 26), (x, pts[i][1] - 4), (x + 26, pts[i][1] + 26)],
                          fill=(232, 238, 246, 230))
    return img


def _trees(rng, color, y_base, scale=1.0, count=26):
    size = OUT
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    ct = hx(color)
    for i in range(count):
        x = rng.uniform(-20, size + 20)
        h = rng.uniform(90, 190) * scale
        w = h * rng.uniform(.34, .46)
        y0 = y_base + rng.uniform(-14, 14)
        for k in range(3):
            yy = y0 - h * (k * .28)
            ww = w * (1 - k * .26)
            d.polygon([(x - ww, yy), (x, yy - h * .52), (x + ww, yy)], fill=ct + (255,))
        d.rectangle([x - 3 * scale, y0 - 4, x + 3 * scale, y0 + 10], fill=hx(darker(color, .4)) + (255,))
    return img


def _stars(rng, n=140):
    size = OUT
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i in range(n):
        x, y = rng.uniform(0, size), rng.uniform(0, size * .55)
        r = rng.uniform(.6, 2.2)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(230, 240, 255, int(rng.uniform(90, 230))))
    return img


def make_backgrounds():
    rng = random.Random(4242)
    os.makedirs(BG, exist_ok=True)

    nrng = np.random.default_rng(99)

    def fin(arr, layers=(), vignette=.45, grain=4.0, name="bg"):
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
        for lay in layers:
            img.alpha_composite(lay)
        a = np.asarray(img).astype(np.float32)
        n = nrng.normal(0, grain, (a.shape[0], a.shape[1], 1))
        a[..., :3] = np.clip(a[..., :3] + n, 0, 255)
        size = a.shape[0]
        yy, xx = np.mgrid[0:size, 0:size].astype(np.float32) / size
        dd = np.sqrt(((xx - .5) * 1.05) ** 2 + ((yy - .48) * 1.1) ** 2)
        v = np.clip((dd - .38) / .62, 0, 1) ** 1.6
        a[..., :3] *= (1 - vignette * v[..., None])
        out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")
        out.save(os.path.join(BG, name + ".webp"), "WEBP", quality=84, method=5)
        print("  backgrounds/%s.webp" % name)

    # MENU: gece gokyuzu + daglar + altin ay isigi
    fin(bg_gradient("#0b1024", "#141c38", "#05070d", glow="#3a4a7a", glow_pos=(.5, .28)),
        layers=(_stars(rng), _mountains(rng, "#1b2542", "#0c1226")),
        name="bg_menu")
    # CIFTLIK: gun dogumu, yesil tepe, ciftlik evi silueti
    arr = bg_gradient("#f2b265", "#d98a4a", "#3a2a1e", glow="#ffd9a0", glow_pos=(.5, .62))
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(img)
    # gunes
    d.ellipse([300, 380, 420, 500], fill=(255, 226, 160, 235))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    hills = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hills)
    hd.ellipse([-200, 430, 520, 900], fill=(74, 96, 52, 255))
    hd.ellipse([240, 460, 980, 940], fill=(58, 78, 42, 255))
    # ciftlik evi
    hd.polygon([(470, 470), (470, 410), (520, 378), (570, 410), (570, 470)], fill=(92, 58, 38, 255))
    hd.polygon([(462, 412), (520, 372), (578, 412)], fill=(122, 42, 34, 255))
    hd.rectangle([505, 430, 535, 470], fill=(40, 26, 18, 255))
    # cit
    for x in range(40, 700, 46):
        hd.rectangle([x, 560, x + 8, 610], fill=(70, 48, 30, 255))
    hd.rectangle([30, 574, 700, 582], fill=(70, 48, 30, 255))
    fin(arr, layers=(hills,), vignette=.4, name="bg_farm")
    # ARENA: koyu tas zemin, mesale isigi, kalabalik silueti
    arr = bg_gradient("#2a1414", "#170c10", "#070405", glow="#ff8a3a", glow_pos=(.5, .3))
    ar = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    ad = ImageDraw.Draw(ar)
    # arena zemini (elips)
    ad.ellipse([60, 470, 660, 700], fill=(46, 34, 30, 255))
    ad.ellipse([90, 486, 630, 680], fill=(58, 44, 38, 255))
    ad.ellipse([120, 500, 600, 662], fill=(70, 54, 46, 255))
    # tribün silueti
    ad.polygon([(0, 300), (0, 470), (720, 470), (720, 300), (600, 340), (120, 340)],
               fill=(20, 12, 12, 255))
    for i in range(60):
        x = rng.uniform(20, 700)
        y = rng.uniform(352, 452)
        r = rng.uniform(7, 13)
        ad.ellipse([x - r, y - r, x + r, y + r], fill=(12, 8, 8, 255))
    # mesaleler
    for x in (110, 610):
        ad.rectangle([x - 6, 330, x + 6, 470], fill=(30, 20, 16, 255))
        ad.ellipse([x - 22, 292, x + 22, 344], fill=(255, 150, 60, 220))
        ad.ellipse([x - 12, 304, x + 12, 336], fill=(255, 220, 140, 235))
    ar = ar.filter(ImageFilter.GaussianBlur(1.2))
    fin(arr, layers=(ar,), vignette=.5, name="bg_arena")
    # ORMAN: yesil derinlik, isik huzmeleri
    arr = bg_gradient("#12301f", "#0b2015", "#04100a", glow="#8fd08a", glow_pos=(.5, .18))
    fo = _trees(rng, "#0a2415", 700, scale=1.5, count=20)
    fo2 = _trees(rng, "#06170d", 720, scale=2.1, count=12)
    rays = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(7):
        x0 = rng.uniform(60, 500)
        rd.polygon([(x0, 0), (x0 + 40, 0), (x0 + 200, 720), (x0 + 120, 720)],
                   fill=(190, 240, 180, 26))
    rays = rays.filter(ImageFilter.GaussianBlur(6))
    fin(arr, layers=(fo, fo2, rays), vignette=.45, name="bg_forest")
    # DAG: karli zirveler, soguk isik
    fin(bg_gradient("#20304f", "#16233c", "#070b14", glow="#9fc4e8", glow_pos=(.5, .2)),
        layers=(_stars(rng, 90), _mountains(rng, "#31466b", "#141d31", snow=True)),
        name="bg_mountain")
    # PAZAR: aksam pazar yeri, fenerler
    arr = bg_gradient("#241a2e", "#160f1e", "#070510", glow="#ffb03a", glow_pos=(.5, .3))
    mk = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    md = ImageDraw.Draw(mk)
    md.rectangle([0, 430, 720, 720], fill=(24, 16, 26, 255))
    for i, x in enumerate(range(40, 720, 150)):
        # tezgah
        md.rectangle([x, 380, x + 110, 470], fill=(52, 34, 26, 255))
        md.polygon([(x - 12, 380), (x + 122, 380), (x + 104, 344), (x + 6, 344)],
                   fill=(120, 40, 44, 255) if i % 2 else (40, 70, 110, 255))
        md.rectangle([x + 44, 300, x + 50, 344], fill=(30, 20, 16, 255))
        md.ellipse([x + 34, 286, x + 60, 312], fill=(255, 190, 90, 220))
    mk = mk.filter(ImageFilter.GaussianBlur(1.0))
    fin(arr, layers=(mk,), vignette=.45, name="bg_market")


# ===========================================================================
# UI IKONLARI (SVG)
# ===========================================================================
def icon(name, inner, vb="0 0 64 64"):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" width="64" height="64">%s</svg>'
            % (vb, inner))


def make_ui_icons():
    os.makedirs(UI, exist_ok=True)
    G = ('<defs><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">'
         '<stop offset="0" stop-color="#ffe9a8"/><stop offset="0.5" stop-color="#f5c76a"/>'
         '<stop offset="1" stop-color="#a8720c"/></linearGradient>'
         '<linearGradient id="sv" x1="0" y1="0" x2="0" y2="1">'
         '<stop offset="0" stop-color="#e8eef6"/><stop offset="1" stop-color="#8a94a4"/>'
         '</linearGradient></defs>')
    icons = {
        "icon_points": G + '<circle cx="32" cy="32" r="26" fill="url(#gd)" stroke="#6d4a08" stroke-width="3"/>'
                          '<circle cx="32" cy="32" r="19" fill="none" stroke="#fff6d8" stroke-width="2.5" opacity=".8"/>'
                          '<path d="M32 20c5 6 8 8 12 9-4 2-6 4-7 9h-10c-1-5-3-7-7-9 4-1 7-3 12-9z" fill="#7a5206"/>',
        "icon_crate": G + '<rect x="10" y="24" width="44" height="30" rx="5" fill="url(#gd)" stroke="#6d4a08" stroke-width="3"/>'
                         '<rect x="10" y="18" width="44" height="10" rx="4" fill="#ffe9a8" stroke="#6d4a08" stroke-width="3"/>'
                         '<rect x="28" y="18" width="8" height="36" fill="#8a5c12"/>'
                         '<circle cx="32" cy="39" r="6" fill="#6d4a08"/>',
        "icon_arena": '<path d="M32 6l8 10 12 2-8 11 3 13-15-6-15 6 3-13-8-11 12-2z" fill="url(#gd)" stroke="#6d4a08" stroke-width="2.5"/>'
                      '<path d="M20 46h24l-3 12H23z" fill="#8a5c12"/>',
        "icon_market": '<path d="M10 22h44l-4-12H14z" fill="#c9573f" stroke="#5a1f14" stroke-width="2.5"/>'
                       '<rect x="12" y="24" width="40" height="30" rx="3" fill="#e8cfa4" stroke="#5a3a1c" stroke-width="2.5"/>'
                       '<rect x="26" y="36" width="12" height="18" fill="#7a5206"/>'
                       '<rect x="16" y="30" width="8" height="8" fill="#8fc3e8"/><rect x="40" y="30" width="8" height="8" fill="#8fc3e8"/>',
        "icon_friends": '<circle cx="24" cy="22" r="10" fill="url(#sv)"/>'
                        '<path d="M8 52c0-11 7-17 16-17s16 6 16 17z" fill="url(#sv)"/>'
                        '<circle cx="44" cy="26" r="8" fill="#f5c76a"/>'
                        '<path d="M32 52c0-9 5-14 12-14s12 5 12 14z" fill="#f5c76a"/>',
        "icon_quests": '<rect x="14" y="8" width="36" height="48" rx="5" fill="#e8eef6" stroke="#4a5568" stroke-width="3"/>'
                       '<path d="M22 22h20M22 32h20M22 42h13" stroke="#4a5568" stroke-width="3.5" stroke-linecap="round"/>'
                       '<circle cx="44" cy="44" r="9" fill="#43d17c" stroke="#1c7a45" stroke-width="2.5"/>'
                       '<path d="M40 44l3 3 5-6" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
        "icon_achieve": '<circle cx="32" cy="26" r="16" fill="url(#gd)" stroke="#6d4a08" stroke-width="3"/>'
                        '<path d="M32 18l3.5 7 7.5 1-5.5 5.5 1.5 7.5-7-3.8-7 3.8 1.5-7.5-5.5-5.5 7.5-1z" fill="#7a5206"/>'
                        '<path d="M24 40l-4 16 12-6 12 6-4-16z" fill="#c9573f"/>',
        "icon_settings": '<circle cx="32" cy="32" r="10" fill="none" stroke="url(#sv)" stroke-width="6"/>'
                         '<g stroke="url(#sv)" stroke-width="6" stroke-linecap="round">'
                         '<path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6"/></g>',
        "icon_profile": '<circle cx="32" cy="22" r="12" fill="url(#gd)"/>'
                        '<path d="M12 56c0-13 9-20 20-20s20 7 20 20z" fill="url(#gd)"/>',
        "icon_collection": '<rect x="8" y="14" width="22" height="30" rx="4" fill="#3fa2ff" stroke="#1552a8" stroke-width="2.5"/>'
                           '<rect x="22" y="20" width="22" height="30" rx="4" fill="#b06bff" stroke="#5f2aa8" stroke-width="2.5"/>'
                           '<rect x="36" y="14" width="22" height="30" rx="4" fill="#ffb03a" stroke="#a85f06" stroke-width="2.5"/>',
        "icon_inventory": '<path d="M14 26h36l-4 30H18z" fill="#8a5c12" stroke="#4a2f06" stroke-width="3"/>'
                          '<path d="M14 26c0-12 8-18 18-18s18 6 18 18z" fill="#c9873f" stroke="#4a2f06" stroke-width="3"/>'
                          '<rect x="28" y="24" width="8" height="10" rx="2" fill="#ffe9a8"/>',
        "icon_help": '<circle cx="32" cy="32" r="26" fill="#3fa2ff" stroke="#1552a8" stroke-width="3"/>'
                     '<path d="M25 25c0-6 4-9 8-9s8 3 8 8c0 6-6 7-6 12" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>'
                     '<circle cx="35" cy="45" r="3.4" fill="#fff"/>',
        "icon_back": '<path d="M38 12L18 32l20 20" stroke="url(#sv)" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        "icon_lock": '<rect x="16" y="28" width="32" height="26" rx="5" fill="url(#gd)" stroke="#6d4a08" stroke-width="3"/>'
                     '<path d="M22 28v-8a10 10 0 0 1 20 0v8" fill="none" stroke="#6d4a08" stroke-width="5"/>',
        "icon_heart": '<path d="M32 54C14 40 8 30 12 21c3-7 12-8 17-2l3 4 3-4c5-6 14-5 17 2 4 9-2 19-20 33z" fill="#ff4a6e" stroke="#8d0f2c" stroke-width="2.5"/>',
        "icon_shield": '<path d="M32 6l22 8v16c0 14-10 24-22 28C20 54 10 44 10 30V14z" fill="url(#sv)" stroke="#4a5568" stroke-width="3"/>'
                       '<path d="M32 14l14 5v11c0 10-7 17-14 20z" fill="#8a94a4" opacity=".6"/>',
        "icon_speed": '<path d="M10 40c6-16 20-24 44-24-8 6-10 10-10 14 8 0 12 2 16 6-22 0-38 2-50 4z" fill="#3fa2ff"/>'
                      '<path d="M6 50h40" stroke="#8fc3e8" stroke-width="4" stroke-linecap="round"/>',
        "icon_brain": '<path d="M26 10c-8 0-12 6-12 11 0 3-4 4-4 10s4 7 4 10c0 6 6 11 12 11 4 0 6-2 6-6V14c0-3-2-4-6-4z" fill="#b06bff"/>'
                      '<path d="M38 10c8 0 12 6 12 11 0 3 4 4 4 10s-4 7-4 10c0 6-6 11-12 11-4 0-6-2-6-6V14c0-3 2-4 6-4z" fill="#c98aff"/>',
        "icon_paw": '<ellipse cx="32" cy="42" rx="13" ry="11" fill="url(#gd)"/>'
                    '<ellipse cx="16" cy="26" rx="6" ry="8" fill="url(#gd)"/>'
                    '<ellipse cx="26" cy="18" rx="6" ry="8" fill="url(#gd)"/>'
                    '<ellipse cx="38" cy="18" rx="6" ry="8" fill="url(#gd)"/>'
                    '<ellipse cx="48" cy="26" rx="6" ry="8" fill="url(#gd)"/>',
        "icon_star": '<path d="M32 6l7.6 15.4L56 24l-12 11.7 2.8 16.5L32 44.4 17.2 52.2 20 35.7 8 24l16.4-2.6z" fill="url(#gd)" stroke="#6d4a08" stroke-width="2.5"/>',
        "icon_xp": '<path d="M28 6h12l-6 18h10L24 58l6-24H18z" fill="#43d17c" stroke="#1c7a45" stroke-width="2.5"/>',
        "icon_dna": '<path d="M20 8c0 14 24 14 24 28s-24 14-24 28" stroke="#43d17c" stroke-width="5" fill="none"/>'
                    '<path d="M44 8c0 14-24 14-24 28s24 14 24 28" stroke="#3fa2ff" stroke-width="5" fill="none"/>'
                    '<path d="M22 16h20M22 48h20M26 32h12" stroke="#e8eef6" stroke-width="3.5"/>',
        "icon_sword": '<path d="M40 8l16 16-26 26-10 4 4-10z" fill="url(#sv)" stroke="#4a5568" stroke-width="2.5"/>'
                      '<path d="M18 46l-8 8M14 42l8 8" stroke="#8a5c12" stroke-width="5" stroke-linecap="round"/>',
        "icon_coin": '<circle cx="32" cy="32" r="24" fill="url(#gd)" stroke="#6d4a08" stroke-width="3"/>'
                     '<text x="32" y="42" font-size="28" font-family="DejaVu Sans, sans-serif" font-weight="bold" text-anchor="middle" fill="#7a5206">P</text>',
        "icon_key_silver": '<circle cx="22" cy="22" r="12" fill="none" stroke="url(#sv)" stroke-width="6"/>'
                           '<path d="M30 30l22 22M44 44l8-8M38 38l8-8" stroke="url(#sv)" stroke-width="6" stroke-linecap="round"/>',
        "icon_key_gold": '<circle cx="22" cy="22" r="12" fill="none" stroke="url(#gd)" stroke-width="6"/>'
                         '<path d="M30 30l22 22M44 44l8-8M38 38l8-8" stroke="url(#gd)" stroke-width="6" stroke-linecap="round"/>',
        "icon_key_diamond": '<circle cx="22" cy="22" r="12" fill="none" stroke="#8fe3ff" stroke-width="6"/>'
                            '<path d="M30 30l22 22M44 44l8-8M38 38l8-8" stroke="#8fe3ff" stroke-width="6" stroke-linecap="round"/>',
        "icon_potion_xp": '<path d="M26 8h12v14l10 22a8 8 0 0 1-7 12H23a8 8 0 0 1-7-12l10-22z" fill="#bfe8ff" stroke="#1d6f9c" stroke-width="3"/>'
                          '<path d="M20 40h24l4 8a6 6 0 0 1-5 8H21a6 6 0 0 1-5-8z" fill="#43d17c"/>',
        "icon_food": '<path d="M12 34c0-12 9-20 20-20s20 8 20 20c0 12-9 18-20 18s-20-6-20-18z" fill="#c9873f" stroke="#5a3a1c" stroke-width="3"/>'
                     '<circle cx="24" cy="32" r="4" fill="#5a3a1c"/><circle cx="36" cy="28" r="4" fill="#5a3a1c"/><circle cx="32" cy="40" r="4" fill="#5a3a1c"/>',
        "icon_food_champion": '<path d="M12 34c0-12 9-20 20-20s20 8 20 20c0 12-9 18-20 18s-20-6-20-18z" fill="url(#gd)" stroke="#6d4a08" stroke-width="3"/>'
                              '<path d="M32 20l3 6 6 .8-4.4 4.4 1.1 6.3-5.7-3.1-5.7 3.1 1.1-6.3-4.4-4.4 6-.8z" fill="#7a5206"/>',
        "icon_booster": '<path d="M34 6L14 36h14l-4 22 22-32H32z" fill="#ffb03a" stroke="#a85f06" stroke-width="2.5"/>',
        "icon_ticket": '<path d="M8 22h48v8a6 6 0 0 0 0 12v8H8v-8a6 6 0 0 0 0-12z" fill="#b06bff" stroke="#5f2aa8" stroke-width="3"/>'
                       '<path d="M28 22v28" stroke="#5f2aa8" stroke-width="3" stroke-dasharray="4 4"/>',
        "icon_charm": '<path d="M32 6l6 14 15 2-11 10 3 15-13-7-13 7 3-15-11-10 15-2z" fill="#ff4a6e" stroke="#8d0f2c" stroke-width="2.5"/>'
                      '<circle cx="32" cy="28" r="5" fill="#ffd0da"/>',
        "icon_rename": '<path d="M40 10l14 14-30 30-16 2 2-16z" fill="url(#sv)" stroke="#4a5568" stroke-width="2.5"/>'
                       '<path d="M36 14l14 14" stroke="#4a5568" stroke-width="3"/>',
        "icon_serum": '<rect x="24" y="6" width="16" height="10" rx="3" fill="#8a94a4"/>'
                      '<path d="M22 16h20v34a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill="#d8f0ff" stroke="#1d6f9c" stroke-width="3"/>'
                      '<path d="M22 34h20v16a6 6 0 0 1-6 6H28a6 6 0 0 1-6-6z" fill="#ff4a6e"/>',
        "icon_banner": '<path d="M14 8h36v40l-18-10-18 10z" fill="#c9573f" stroke="#5a1f14" stroke-width="3"/>'
                       '<path d="M32 20l3 6 6 .8-4.4 4.4 1.1 6.3-5.7-3.1-5.7 3.1 1.1-6.3-4.4-4.4 6-.8z" fill="#ffe9a8"/>',
        "icon_energy": '<path d="M20 10h24l-6 16h12L26 56l4-20H16z" fill="#43d17c" stroke="#1c7a45" stroke-width="2.5"/>',
        "icon_home": '<path d="M8 32L32 10l24 22" stroke="url(#gd)" stroke-width="6" fill="none" stroke-linecap="round"/>'
                     '<path d="M16 30v24h32V30" fill="none" stroke="url(#gd)" stroke-width="6" stroke-linejoin="round"/>',
        "icon_sound": '<path d="M12 26h10l12-10v32l-12-10H12z" fill="url(#sv)"/>'
                      '<path d="M40 22c6 6 6 14 0 20M46 16c9 9 9 23 0 32" stroke="url(#sv)" stroke-width="4" fill="none" stroke-linecap="round"/>',
        "icon_music": '<path d="M24 46V14l26-6v32" stroke="url(#sv)" stroke-width="5" fill="none"/>'
                      '<circle cx="18" cy="46" r="7" fill="url(#sv)"/><circle cx="44" cy="40" r="7" fill="url(#sv)"/>',
        "icon_play": '<path d="M18 10l34 22-34 22z" fill="#43d17c" stroke="#1c7a45" stroke-width="3"/>',
        "icon_plus": '<path d="M32 12v40M12 32h40" stroke="#43d17c" stroke-width="9" stroke-linecap="round"/>',
        "icon_close": '<path d="M16 16l32 32M48 16L16 48" stroke="#ff4a6e" stroke-width="8" stroke-linecap="round"/>',
        "icon_clock": '<circle cx="32" cy="32" r="24" fill="none" stroke="url(#sv)" stroke-width="5"/>'
                      '<path d="M32 18v14l10 8" stroke="url(#sv)" stroke-width="5" fill="none" stroke-linecap="round"/>',
        "icon_male": '<circle cx="26" cy="38" r="14" fill="none" stroke="#3fa2ff" stroke-width="6"/>'
                     '<path d="M36 28L52 12M40 12h12v12" stroke="#3fa2ff" stroke-width="6" fill="none" stroke-linecap="round"/>',
        "icon_female": '<circle cx="32" cy="24" r="14" fill="none" stroke="#ff4a6e" stroke-width="6"/>'
                       '<path d="M32 38v18M24 48h16" stroke="#ff4a6e" stroke-width="6" stroke-linecap="round"/>',
        "icon_male_white": '<circle cx="26" cy="38" r="14" fill="none" stroke="#e8eef6" stroke-width="6"/>'
                           '<path d="M36 28L52 12M40 12h12v12" stroke="#e8eef6" stroke-width="6" fill="none" stroke-linecap="round"/>',
        "icon_female_white": '<circle cx="32" cy="24" r="14" fill="none" stroke="#e8eef6" stroke-width="6"/>'
                             '<path d="M32 38v18M24 48h16" stroke="#e8eef6" stroke-width="6" stroke-linecap="round"/>',
    }
    for name, inner in icons.items():
        with open(os.path.join(UI, name + ".svg"), "w", encoding="utf-8") as f:
            f.write(icon(name, inner))
    print("  ui ikonlari: %d adet" % len(icons))
    return sorted(icons)


# ===========================================================================
def main():
    crates = json.load(open(os.path.join(ROOT, "data", "crates.json"), encoding="utf-8"))["crates"]
    os.makedirs(CR, exist_ok=True)
    for c in crates:
        rng = random.Random(hash(c["id"]) % 100000)
        svg = crate_svg(c["id"], c["accent"], c["accent2"], rng)
        with open(os.path.join(CR, "crate_%s.svg" % c["id"]), "w", encoding="utf-8") as f:
            f.write(svg)
        png = cairosvg.svg2png(bytestring=svg.encode(), output_width=OUT * 2, output_height=OUT * 2)
        import io
        img = Image.open(io.BytesIO(png)).convert("RGBA")
        img.resize((OUT, OUT), Image.Resampling.LANCZOS).save(
            os.path.join(CR, "crate_%s.webp" % c["id"]), "WEBP", quality=85, method=5)
        print("  crates/crate_%s.webp" % c["id"])
    make_backgrounds()
    make_ui_icons()


if __name__ == "__main__":
    main()
