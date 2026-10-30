#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAW LEGENDS - kopek portresi SVG sanat uretici.
Her irk icin IRK PARAMETRELERINDEN (renk, desen, kulak tipi, burun uzunlugu,
kafa yapisi, tuy uzunlugu, kiriskilik, yele, sakal, ip tuy ...) benzersiz bir
portre uretir. Ayni gorsel tekrar kullanilmaz; cizim tamamen parametrik ve
seed'e (irk numarasina) baglidir.

Cikti: seffaf arka planli SVG (kopek). Arka plan/isik/golgelendirme islemleri
build_dog_images.py icinde PIL ile yapilir.
"""
import math
import random


# --------------------------------------------------------------------------- #
# renk yardimcilari
# --------------------------------------------------------------------------- #
def _hx(c):
    c = c.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _to_hex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in rgb)


def mix(c1, c2, t):
    a, b = _hx(c1), _hx(c2)
    return _to_hex([a[i] + (b[i] - a[i]) * t for i in range(3)])


def lighter(c, t=0.3):
    return mix(c, "#ffffff", t)


def darker(c, t=0.35):
    return mix(c, "#000000", t)


def with_alpha(c, a):
    r, g, b = _hx(c)
    return "rgba(%d,%d,%d,%.3f)" % (r, g, b, a)


# --------------------------------------------------------------------------- #
# geometri yardimcilari
# --------------------------------------------------------------------------- #
def catmull(pts, closed=True, tension=1.0):
    """Catmull-Rom nokta listesini yumusak kubik bezier yoluna cevirir."""
    n = len(pts)
    if n < 3:
        return ""
    if closed:
        p = [pts[-1]] + list(pts) + [pts[0], pts[1]]      # uzunluk n+3
        segs = range(n)
    else:
        p = [pts[0]] + list(pts) + [pts[-1]]              # uzunluk n+2
        segs = range(n - 1)
    d = ["M%.2f %.2f" % (pts[0][0], pts[0][1])]
    for i in segs:
        p0, p1, p2, p3 = p[i], p[i + 1], p[i + 2], p[i + 3]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6.0 * tension, p1[1] + (p2[1] - p0[1]) / 6.0 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6.0 * tension, p2[1] - (p3[1] - p1[1]) / 6.0 * tension)
        d.append("C%.2f %.2f %.2f %.2f %.2f %.2f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
    if closed:
        d.append("Z")
    return " ".join(d)


def ellipse_pts(cx, cy, rx, ry, n=40, a0=0.0, a1=None, rot=0.0):
    if a1 is None:
        a1 = a0 + math.tau
    out = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n
        x, y = rx * math.cos(a), ry * math.sin(a)
        if rot:
            x, y = x * math.cos(rot) - y * math.sin(rot), x * math.sin(rot) + y * math.cos(rot)
        out.append((cx + x, cy + y))
    return out


def jag_pts(pts, rng, amp=4.0, freq=3.0):
    """Silueti hafifce purtuklendirir (tuy etkisi) - deterministik."""
    out = []
    n = len(pts)
    cx = sum(p[0] for p in pts) / n
    cy = sum(p[1] for p in pts) / n
    phases = [(rng.random() * math.tau, 0.6 + rng.random() * 1.6) for _ in range(int(freq) + 2)]
    for i, (x, y) in enumerate(pts):
        dx, dy = x - cx, y - cy
        r = math.hypot(dx, dy) or 1.0
        a = math.atan2(dy, dx)
        mod = sum(math.sin(a * (k + 2) * 1.7 + ph) * amp * w
                  for k, (ph, w) in enumerate(phases))
        r2 = max(1.0, r + mod)
        out.append((cx + dx / r * r2, cy + dy / r * r2))
    return out


HEAD_SHAPES = {
    #  rx,   ry,  cheek,  dome,  taper
    "wedge":  (1.00, 0.94, 0.72, 0.00, 0.86),
    "round":  (1.00, 0.96, 0.96, 0.10, 0.98),
    "square": (1.08, 0.90, 1.04, 0.02, 1.00),
    "domed":  (0.96, 1.04, 0.88, 0.22, 0.90),
    "narrow": (0.80, 1.02, 0.62, 0.00, 0.74),
    "egg":    (0.90, 1.12, 0.80, 0.28, 0.84),
}

BUILD_WIDTH = {"slim": 0.86, "athletic": 1.00, "stocky": 1.12, "bulky": 1.26}
SIZE_SCALE = {"toy": 0.80, "küçük": 0.90, "orta": 1.00, "büyük": 1.07, "dev": 1.14}


class SvgBuilder(object):
    def __init__(self):
        self.defs = []
        self.body = []
        self._g = 0

    def grad(self, kind, gid, stops, **attrs):
        a = " ".join('%s="%s"' % (k.replace("_", "-"), v) for k, v in attrs.items())
        s = "".join('<stop offset="%s" stop-color="%s"%s/>' %
                    (o, c, ' stop-opacity="%s"' % op if op is not None else "")
                    for o, c, op in stops)
        tag = "radialGradient" if kind == "r" else "linearGradient"
        self.defs.append('<%s id="%s" %s>%s</%s>' % (tag, gid, a, s, tag))
        return gid

    def clip(self, cid, path_d):
        self.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, path_d))
        return cid

    def raw(self, s):
        self.body.append(s)

    def path(self, d, fill="none", stroke=None, sw=1.0, op=1.0, clip=None,
             linecap="round", extra=""):
        attrs = ['d="%s"' % d, 'fill="%s"' % fill, 'opacity="%.3f"' % op]
        if stroke:
            attrs += ['stroke="%s"' % stroke, 'stroke-width="%.2f"' % sw,
                      'stroke-linecap="%s"' % linecap]
        if clip:
            attrs.append('clip-path="url(#%s)"' % clip)
        if extra:
            attrs.append(extra)
        self.body.append("<path %s/>" % " ".join(attrs))

    def ellipse(self, cx, cy, rx, ry, **kw):
        self.path(ellipse_closed(cx, cy, rx, ry), **kw)

    def group_open(self, **attrs):
        a = " ".join('%s="%s"' % (k.replace("_", "-"), v) for k, v in attrs.items())
        self.body.append("<g %s>" % a)

    def group_close(self):
        self.body.append("</g>")

    def svg(self, w, h):
        return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
                'viewBox="0 0 %d %d"><defs>%s</defs>%s</svg>'
                % (w, h, w, h, "".join(self.defs), "".join(self.body)))


def ellipse_closed(cx, cy, rx, ry):
    return ("M%.2f %.2f A%.2f %.2f 0 1 0 %.2f %.2f A%.2f %.2f 0 1 0 %.2f %.2f Z"
            % (cx - rx, cy, rx, ry, cx + rx, cy, rx, ry, cx - rx, cy))


# --------------------------------------------------------------------------- #
# ana cizim
# --------------------------------------------------------------------------- #
W = H = 720


def render_dog_svg(look, seed_extra=0):
    """look: data/_lookups.json kaydi. Seffaf zeminli SVG string + meta dondurur.

    Tarz: premium koleksiyon karti portresi (gercekcilik odakli stilize illüstrasyon).
    Tum geometri irk parametrelerinden turetilir; seed = irk numarasidir.
    """
    rng = random.Random(look["id"] * 7919 + seed_extra)
    S = SvgBuilder()

    c1 = look.get("c1", "#b5813f")
    c2 = look.get("c2", darker(c1, .35))
    c3 = look.get("c3", lighter(c1, .45))
    pat = look.get("pat", "solid")
    fur = float(look.get("fur", .3))
    fluff = float(look.get("fluff", .3))
    ear = look.get("ear", "prick")
    muz = float(look.get("muz", .6))
    muzW = float(look.get("muzW", .6))
    head = look.get("head", "wedge")
    build = look.get("build", "athletic")
    eye_c = look.get("eye", "#4a2c12")
    wrk = float(look.get("wrk", 0))
    flews = float(look.get("flews", .2))
    mane = float(look.get("mane", .2))
    beard = float(look.get("beard", 0))
    brow = float(look.get("brow", 0))
    cords = float(look.get("cords", 0))
    topknot = float(look.get("topknot", 0))
    feather = float(look.get("feathering", 0))
    split_nose = 1 if look.get("splitNose") else 0
    tongue = look.get("tongue")
    blaze = 1 if look.get("blaze") else 0
    pompom = 1 if look.get("pompom") else 0

    hs = HEAD_SHAPES.get(head, HEAD_SHAPES["wedge"])
    scale = SIZE_SCALE.get(look.get("size", "orta"), 1.0)
    bw = BUILD_WIDTH.get(build, 1.0)

    base_skull = 120 * scale
    skullRX = base_skull * hs[0]
    skullRY = base_skull * hs[1]
    cheek = hs[2]
    dome = hs[3]
    taper = hs[4]

    HCX, HCY = 360.0, 288.0
    muzL = (44 + muz * 148) * scale * (0.94 + 0.12 * hs[1])
    muzWid = (30 + muzW * 72) * scale
    jawY = HCY + skullRY * 0.36
    stopY = HCY + skullRY * 0.02          # alin-burun gecisi

    # ---- renkler (koyu tuylu irklarda ortam isigi ile kaldir) ----
    lum = (0.299 * _hx(c1)[0] + 0.587 * _hx(c1)[1] + 0.114 * _hx(c1)[2]) / 255.0
    if lum < 0.22:
        c1 = mix(c1, "#8a8f9c", 0.22 - lum)          # cok koyu tuyu hafif ac
        c2 = mix(c2, "#6d7280", max(0.0, 0.16 - lum * .5))
    hi = lighter(c1, .34)
    sh = darker(c1, .34)

    # ---- gradientler ----
    g_head = S.grad("r", "gHead", [("0", lighter(c1, .34), None),
                                   ("0.45", c1, None),
                                   ("0.80", darker(c1, .28), None),
                                   ("1", darker(c1, .48), None)],
                    cx="0.36", cy="0.26", r="1.05")
    g_body = S.grad("r", "gBody", [("0", lighter(c1, .22), None),
                                   ("0.5", c1, None),
                                   ("1", darker(c1, .5), None)],
                    cx="0.4", cy="0.16", r="1.1")
    g_muz = S.grad("r", "gMuz", [("0", lighter(c1, .30), None),
                                 ("0.6", lighter(c1, .06), None),
                                 ("1", darker(c1, .34), None)],
                   cx="0.45", cy="0.25", r="1.0")
    g_muz_mask = S.grad("r", "gMuzMask", [("0", lighter(c2, .18), None),
                                          ("0.55", c2, None),
                                          ("1", darker(c2, .4), None)],
                        cx="0.45", cy="0.25", r="1.0")
    g_ear = S.grad("l", "gEar", [("0", darker(c1, .18), None), ("1", darker(c1, .52), None)],
                   x1="0.1", y1="0", x2="0.9", y2="1")
    g_ear_in = S.grad("r", "gEarIn", [("0", mix(c1, "#b07070", .5), None),
                                      ("1", darker(c1, .5), None)],
                      cx="0.5", cy="0.35", r="0.75")
    g_nose = S.grad("r", "gNose", [("0", "#6a5654", None), ("0.4", "#241b1b", None),
                                   ("1", "#0c0909", None)], cx="0.36", cy="0.28", r="0.9")
    g_chest = S.grad("l", "gChest", [("0", lighter(c1, .26), None), ("0.45", c1, None),
                                     ("1", darker(c1, .48), None)],
                     x1="0.2", y1="0", x2="0.8", y2="1")
    g_ruff = S.grad("r", "gRuff", [("0", lighter(c1, .34), None), ("0.55", c1, None),
                                   ("1", darker(c1, .44), None)], cx="0.42", cy="0.22", r="1.0")

    def soft(cx, cy, rx, ry, col, alpha, cxg=.5, cyg=.42):
        """Kenarlari seffaflasan yumusak golge/isik elipsi."""
        gid = "sf%d" % S._g
        S._g += 1
        S.grad("r", gid, [("0", col, alpha), ("0.5", col, alpha * .55), ("1", col, 0.0)],
               cx=str(cxg), cy=str(cyg), r="0.78")
        S.ellipse(cx, cy, rx, ry, fill="url(#%s)" % gid)

    # =====================================================================
    # 1) BOYUN + GOGUS
    # =====================================================================
    chest_top = HCY + skullRY * 0.72
    shoulder_w = (152 + 92 * bw) * scale * (0.92 + 0.22 * fluff)
    neck_w = skullRX * (0.72 + 0.18 * bw)
    body_pts = [(HCX - neck_w, jawY + muzL * 0.10),
                (HCX - shoulder_w * 0.62, chest_top + 40 * scale),
                (HCX - shoulder_w * 0.86, chest_top + 130 * scale),
                (HCX - shoulder_w * 0.96, H + 60),
                (HCX + shoulder_w * 0.96, H + 60),
                (HCX + shoulder_w * 0.86, chest_top + 130 * scale),
                (HCX + shoulder_w * 0.62, chest_top + 40 * scale),
                (HCX + neck_w, jawY + muzL * 0.10),
                (HCX, jawY + muzL * 0.45)]
    body_d = catmull(jag_pts(body_pts, rng, amp=2 + 4 * fur, freq=3))
    S.path(body_d, fill="url(#%s)" % g_body)
    # omuz / gogus hacim golgeleri (yumuşak)
    soft(HCX - shoulder_w * 0.55, chest_top + 160 * scale, shoulder_w * 0.42,
         170 * scale, darker(c1, .40), .30)
    soft(HCX + shoulder_w * 0.58, chest_top + 180 * scale, shoulder_w * 0.40,
         180 * scale, darker(c1, .45), .34)
    soft(HCX - shoulder_w * 0.08, chest_top + 110 * scale, shoulder_w * 0.46,
         140 * scale, lighter(c1, .26), .22)

    chest_white = pat in ("bicolor", "tricolor", "urajiro", "blenheim", "patched",
                          "points") or blaze
    if chest_white:
        wc = "#f7f3ea" if pat == "tricolor" else c3
        cw_pts = [(HCX - neck_w * 0.62, jawY + muzL * 0.5),
                  (HCX - shoulder_w * 0.40, chest_top + 120 * scale),
                  (HCX - shoulder_w * 0.30, H + 40),
                  (HCX + shoulder_w * 0.30, H + 40),
                  (HCX + shoulder_w * 0.40, chest_top + 120 * scale),
                  (HCX + neck_w * 0.62, jawY + muzL * 0.5),
                  (HCX, jawY + muzL * 0.72)]
        S.path(catmull(jag_pts(cw_pts, rng, amp=2 + 4 * fur, freq=3)), fill=wc, op=.94)

    # =====================================================================
    # 2) YELE / RUFF (boyun cevresi)
    # =====================================================================
    mv = max(mane, (fluff - 0.5) * 1.5)
    if mv > 0.04:
        rr = skullRX * (1.02 + 0.62 * mv)
        ry2 = skullRY * (0.80 + 0.46 * mv)
        cy2 = jawY + skullRY * (0.18 + 0.20 * mv)
        n = 40
        pts = []
        for i in range(n + 1):
            a = math.pi * (0.05 + 0.90 * i / n)
            lobes = 1 + 0.10 * mv * math.sin(a * (6 + int(5 * mv)))
            pts.append((HCX + rr * math.cos(a) * lobes, cy2 + ry2 * math.sin(a) * lobes))
        pts = [(HCX + rr * .5, cy2 - ry2 * .5)] + pts + [(HCX - rr * .5, cy2 - ry2 * .5)]
        d = catmull(pts)
        clip_ruff = S.clip("clipRuff", d)
        S.path(d, fill="url(#%s)" % g_ruff, op=.98)
        for i in range(int(40 * (0.35 + mv))):
            a = math.pi * (0.06 + 0.88 * rng.random())
            r0 = rr * (0.45 + 0.35 * rng.random())
            r1 = rr * (0.82 + 0.30 * rng.random())
            x0, y0 = HCX + r0 * math.cos(a), cy2 + ry2 * math.sin(a) * 1.02
            x1, y1 = HCX + r1 * math.cos(a), cy2 + ry2 * math.sin(a) * 1.08
            S.path("M%.1f %.1f Q%.1f %.1f %.1f %.1f" %
                   (x0, y0, (x0 + x1) / 2 + rng.uniform(-10, 10), (y0 + y1) / 2 + 8, x1, y1),
                   stroke=lighter(c1, .32) if rng.random() > .5 else darker(c1, .34),
                   sw=2.0 + 3.0 * fluff, op=.14 + .14 * rng.random(), clip=clip_ruff)

    # =====================================================================
    # 3) KULAKLAR (kafa arkasinda)
    # =====================================================================
    def ear_points(side, kind, sx, sy, srx, sry):
        if kind == "prick":
            h = sry * 1.22
            w = srx * 0.44
            pts = [(sx - w, sy + h * .20), (sx - w * .72, sy - h * .55),
                   (sx - w * .18, sy - h * .98), (sx + w * .22, sy - h * .92),
                   (sx + w * .78, sy - h * .30), (sx + w * .86, sy + h * .24),
                   (sx, sy + h * .40)]
        elif kind == "semi":
            h = sry * 0.98
            w = srx * 0.50
            pts = [(sx - w, sy + h * .25), (sx - w * .62, sy - h * .62),
                   (sx - w * .05, sy - h * .86), (sx + w * .68, sy - h * .38),
                   (sx + w * .80, sy + h * .34), (sx, sy + h * .48)]
        elif kind == "floppy":
            h = sry * (1.30 + 0.45 * fur)
            w = srx * 0.54
            pts = [(sx - w * .82, sy - h * .15), (sx - w * 1.02, sy + h * .42),
                   (sx - w * .72, sy + h * .92), (sx + w * .22, sy + h * 1.0),
                   (sx + w * .86, sy + h * .52), (sx + w * .80, sy - h * .08),
                   (sx + w * .28, sy - h * .28)]
        elif kind == "rose":
            h = sry * 0.72
            w = srx * 0.50
            pts = [(sx - w * .92, sy + h * .12), (sx - w * .82, sy - h * .7),
                   (sx - w * .08, sy - h * .92), (sx + w * .8, sy - h * .42),
                   (sx + w * .76, sy + h * .38), (sx, sy + h * .42)]
        elif kind == "bat":
            h = sry * 1.02
            w = srx * 0.78
            pts = [(sx - w, sy + h * .28), (sx - w * .9, sy - h * .5),
                   (sx - w * .3, sy - h * .88), (sx + w * .42, sy - h * .84),
                   (sx + w * .94, sy - h * .38), (sx + w * .86, sy + h * .34), (sx, sy + h * .48)]
        elif kind == "button":
            h = sry * 0.72
            w = srx * 0.55
            pts = [(sx - w * .9, sy - h * .22), (sx - w * .6, sy - h * .78),
                   (sx + w * .32, sy - h * .66), (sx + w * .82, sy + h * .12),
                   (sx + w * .46, sy + h * .6), (sx - w * .36, sy + h * .52)]
        elif kind == "folded":
            h = sry * (1.10 + 0.24 * fur)
            w = srx * 0.66
            pts = [(sx - w * .98, sy - h * .28), (sx - w * .98, sy + h * .40),
                   (sx - w * .42, sy + h * .92), (sx + w * .42, sy + h * .68),
                   (sx + w * .86, sy + h * .08), (sx + w * .52, sy - h * .36),
                   (sx - w * .08, sy - h * .46)]
        elif kind == "tiny":
            h = sry * 0.52
            w = srx * 0.42
            pts = [(sx - w, sy + h * .12), (sx - w * .5, sy - h * .78),
                   (sx + w * .35, sy - h * .68), (sx + w, sy + h * .2), (sx, sy + h * .42)]
        else:
            h, w = sry, srx * .6
            pts = [(sx - w, sy), (sx, sy - h), (sx + w, sy), (sx, sy + h * .4)]
        if side < 0:
            pts = [(2 * sx - x, y) for (x, y) in pts]
        return pts

    ear_clips = []
    ear_up = ear in ("prick", "bat", "semi", "tiny")
    EAR_X = {"prick": .72, "bat": .80, "semi": .74, "tiny": .68,
             "floppy": .94, "folded": .98, "rose": .86, "button": .80}
    EAR_Y = {"prick": .58, "bat": .56, "semi": .50, "tiny": .48,
             "floppy": -.02, "folded": .06, "rose": .16, "button": .22}
    ear_set_x = skullRX * EAR_X.get(ear, .8)
    ear_set_y = HCY - skullRY * EAR_Y.get(ear, .1)
    ear_s = (0.86 + 0.34 * fluff)
    for side in (-1, 1):
        sx = HCX + side * ear_set_x
        pts = ear_points(side, ear, sx, ear_set_y, skullRX * ear_s, skullRY * ear_s)
        d = catmull(jag_pts(pts, rng, amp=1.5 + 4 * fur, freq=3))
        cid = S.clip("clipEar%d" % side, d)
        S.path(d, fill="url(#%s)" % g_ear)
        inner = [(p[0] + (sx - p[0]) * .36, p[1] + (ear_set_y - p[1]) * .34 + 10) for p in pts]
        S.path(catmull(inner), fill="url(#%s)" % g_ear_in, op=.68, clip=cid)
        S.path(d, fill="none", stroke=darker(c1, .6), sw=2.0, op=.35, clip=cid)
        ear_clips.append(cid)
        if fur > .4 or feather > .15:
            for i in range(int(14 * (fur + feather))):
                p = pts[rng.randrange(len(pts))]
                x0, y0 = p
                ang = math.atan2(y0 - ear_set_y, x0 - sx) + rng.uniform(-.35, .35)
                L = (8 + 26 * max(fur, feather)) * rng.uniform(.5, 1.2)
                S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                       (x0, y0, math.cos(ang + 1.2) * L * .5, math.sin(ang + 1.2) * L * .5,
                        x0 + math.cos(ang) * L, y0 + math.sin(ang) * L),
                       stroke=lighter(c1, .34) if rng.random() > .45 else darker(c1, .32),
                       sw=1.4 + 2.0 * fur, op=.28, clip=cid)

    # =====================================================================
    # 4) KAFA SILUETI
    # =====================================================================
    def head_pts():
        right = [(HCX, HCY - skullRY * (1.0 + dome * .22)),
                 (HCX + skullRX * .52, HCY - skullRY * (1.0 + dome * .26)),
                 (HCX + skullRX * .94, HCY - skullRY * .70),
                 (HCX + skullRX * .99, HCY - skullRY * .16),
                 (HCX + skullRX * cheek * taper, HCY + skullRY * .32),
                 (HCX + muzWid * 1.00, stopY + muzL * .22),
                 (HCX + muzWid * .92, stopY + muzL * .68),
                 (HCX + muzWid * .62, HCY + muzL * .98),
                 (HCX + muzWid * .24, HCY + muzL * 1.03),
                 (HCX, HCY + muzL * 1.05)]
        left = [(2 * HCX - x, y) for (x, y) in reversed(right[1:])]
        return left + right

    hp = jag_pts(head_pts(), rng, amp=1.2 + 4.5 * fur + 2.0 * fluff, freq=3)
    head_d = catmull(hp)
    clip_head = S.clip("clipHead", head_d)
    S.path(head_d, fill="url(#%s)" % g_head)

    # hacim: elmacik golgeleri + alin isigi + kas kemigi
    eye_y = HCY - skullRY * .14
    eye_dx = skullRX * (.44 if head in ("narrow", "wedge") else .38)
    eye_rx = skullRX * (.148 + .028 * (head in ("round", "domed")))
    eye_ry = eye_rx * (.74 if head in ("round", "domed") else .60)
    soft(HCX - skullRX * .80, jawY - skullRY * .02, skullRX * .46, skullRY * .58,
         darker(c1, .42), .30)
    soft(HCX + skullRX * .80, jawY - skullRY * .02, skullRX * .46, skullRY * .58,
         darker(c1, .46), .36)
    soft(HCX - skullRX * .26, HCY - skullRY * .60, skullRX * .62, skullRY * .48,
         lighter(c1, .34), .26, cxg=.4, cyg=.3)
    for side in (-1, 1):     # kas kemigi cikintisi
        soft(HCX + side * eye_dx, eye_y - eye_ry * 1.9, eye_rx * 1.9, eye_ry * 1.3,
             lighter(c1, .30), .20)
    # stop golgesi (alin-burun birlesimi)
    S.path("M%.1f %.1f Q%.1f %.1f %.1f %.1f Q%.1f %.1f %.1f %.1f Z" %
           (HCX - muzWid * 1.05, stopY - skullRY * .12, HCX, stopY + skullRY * .16,
            HCX + muzWid * 1.05, stopY - skullRY * .12, HCX, stopY - skullRY * .02,
            HCX - muzWid * 1.05, stopY - skullRY * .12),
           fill=darker(c1, .42), op=.20, clip=clip_head)

    # =====================================================================
    # 5) DESENLER
    # =====================================================================
    def blob(cx, cy, rx, ry, col, op=.9, rot=0.0, jaggy=0.0):
        pts = ellipse_pts(cx, cy, rx, ry, n=24, rot=rot)
        if jaggy:
            pts = jag_pts(pts, rng, amp=jaggy, freq=4)
        S.path(catmull(pts), fill=col, op=op, clip=clip_head)

    muz_cx, muz_cy = HCX, stopY + muzL * .48
    muz_rx, muz_ry = muzWid * .95, muzL * .46

    if pat in ("mask",):
        soft(HCX, muz_cy + muz_ry * .18, muz_rx * 1.02, muz_ry * 1.05, c2, .96)
        soft(HCX, muz_cy + muz_ry * .55, muz_rx * .80, muz_ry * .75, darker(c2, .3), .55)
        for side in (-1, 1):
            soft(HCX + side * eye_dx * 1.02, eye_y + eye_ry * .2, eye_rx * 2.6, eye_ry * 2.6,
                 c2, .34)
        soft(HCX, eye_y - eye_ry * 3.4, skullRX * .50, skullRY * .38, c2, .18)

    if pat == "saddle":
        pts = [(HCX - skullRX * .98, HCY - skullRY * .30),
               (HCX - skullRX * .60, HCY - skullRY * 1.0),
               (HCX + skullRX * .60, HCY - skullRY * 1.0),
               (HCX + skullRX * .98, HCY - skullRY * .30),
               (HCX + skullRX * .70, HCY + skullRY * .16),
               (HCX, HCY + skullRY * .30),
               (HCX - skullRX * .70, HCY + skullRY * .16)]
        S.path(catmull(jag_pts(pts, rng, amp=2 + 5 * fur, freq=3)), fill=c2, op=.94, clip=clip_head)

    if pat == "points":
        blob(HCX, muz_cy + muz_ry * .30, muz_rx * .82, muz_ry * .62, c3, op=.95)
        for side in (-1, 1):
            blob(HCX + side * eye_dx, eye_y - eye_ry * 2.0, eye_rx * .85, eye_ry * .62, c3, op=.9)
            blob(HCX + side * skullRX * .80, jawY - skullRY * .16, skullRX * .26, skullRY * .26, c3, op=.55)

    if pat == "urajiro":
        blob(HCX, muz_cy + muz_ry * .35, muz_rx * .85, muz_ry * .60, c3, op=.95)
        for side in (-1, 1):
            blob(HCX + side * skullRX * .66, jawY + muzL * .02, skullRX * .34, skullRY * .34, c3, op=.8)
        blob(HCX, eye_y - eye_ry * 3.4, skullRX * .24, skullRY * .40, c3, op=.22)

    if pat == "bicolor" or blaze:
        white = c3
        blob(HCX, muz_cy + muz_ry * .35, muz_rx * .88, muz_ry * .58, white, op=.96)
        pts = [(HCX - skullRX * .10, HCY - skullRY * .98), (HCX + skullRX * .10, HCY - skullRY * .98),
               (HCX + skullRX * .16, eye_y - eye_ry * 1.2), (HCX + muzWid * .42, stopY + muzL * .2),
               (HCX, muz_cy + muz_ry * .8), (HCX - muzWid * .42, stopY + muzL * .2),
               (HCX - skullRX * .16, eye_y - eye_ry * 1.2)]
        S.path(catmull(pts), fill=white, op=.93, clip=clip_head)
        if pat == "bicolor":
            blob(HCX - skullRX * .80, HCY - skullRY * .30, skullRX * .52, skullRY * .70, c2, op=.85)
            blob(HCX + skullRX * .80, HCY - skullRY * .30, skullRX * .52, skullRY * .70, c2, op=.85)
            blob(HCX, HCY - skullRY * .92, skullRX * .74, skullRY * .34, c2, op=.9)

    if pat == "tricolor":
        blob(HCX - skullRX * .78, HCY - skullRY * .34, skullRX * .56, skullRY * .66, c2, op=.92)
        blob(HCX + skullRX * .78, HCY - skullRY * .34, skullRX * .56, skullRY * .66, c2, op=.92)
        blob(HCX, HCY - skullRY * .95, skullRX * .68, skullRY * .32, c2, op=.9)
        for side in (-1, 1):
            blob(HCX + side * eye_dx, eye_y - eye_ry * 1.9, eye_rx * .9, eye_ry * .6, c3, op=.9)
        blob(HCX, muz_cy + muz_ry * .4, muz_rx * .8, muz_ry * .5, "#f7f3ea", op=.95)
        pts = [(HCX - skullRX * .09, HCY - skullRY * .98), (HCX + skullRX * .09, HCY - skullRY * .98),
               (HCX + muzWid * .30, stopY + muzL * .2), (HCX, muz_cy + muz_ry * .7),
               (HCX - muzWid * .30, stopY + muzL * .2)]
        S.path(catmull(pts), fill="#f8f5ee", op=.92, clip=clip_head)

    if pat == "brindle":
        for i in range(22):
            x = HCX - skullRX * 1.05 + (2.1 * skullRX) * (i / 21.0)
            wob = rng.uniform(-8, 8)
            y0 = HCY - skullRY * (0.95 + rng.random() * .1)
            y1 = HCY + muzL * (0.65 + rng.random() * .35)
            S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" %
                   (x, y0, x + wob, y0 + (y1 - y0) * .33, x - wob, y0 + (y1 - y0) * .66,
                    x + wob * .5, y1),
                   stroke=c2, sw=4 + 8 * rng.random() * (0.6 + fur * .6),
                   op=.45 + .3 * rng.random(), clip=clip_head)

    if pat == "merle":
        for i in range(40):
            a = rng.random() * math.tau
            r = rng.random() ** .6
            cx = HCX + math.cos(a) * skullRX * .95 * r
            cy = HCY - skullRY * .18 + math.sin(a) * skullRY * .85 * r
            rr = (5 + 18 * rng.random()) * (0.8 + fur)
            blob(cx, cy, rr, rr * rng.uniform(.6, 1.2),
                 c2 if rng.random() > .35 else lighter(c1, .45),
                 op=.4 + .4 * rng.random(), rot=rng.random() * 3)

    if pat == "patched":
        side = 1 if rng.random() > .5 else -1
        blob(HCX + side * skullRX * .56, HCY - skullRY * .34, skullRX * .74, skullRY * .68,
             c2, op=.93, rot=side * .22, jaggy=3 + 6 * fur)
        blob(HCX - side * skullRX * .30, muz_cy + muz_ry * .3, muz_rx * .5, muz_ry * .3, c2,
             op=.5, jaggy=2)

    if pat == "harlequin":
        for i in range(8):
            a = rng.random() * math.tau
            r = rng.random() ** .55
            cx = HCX + math.cos(a) * skullRX * .92 * r
            cy = HCY - skullRY * .14 + math.sin(a) * skullRY * .8 * r
            rr = (12 + 34 * rng.random())
            blob(cx, cy, rr, rr * rng.uniform(.6, 1.3), c2, op=.92,
                 rot=rng.random() * 3, jaggy=4 + 6 * fur)

    if pat == "spotted":
        for i in range(36):
            a = rng.random() * math.tau
            r = rng.random() ** .6
            cx = HCX + math.cos(a) * skullRX * .98 * r
            cy = HCY - skullRY * .08 + math.sin(a) * skullRY * .9 * r
            rr = 4.5 + 11 * rng.random()
            S.ellipse(cx, cy, rr, rr * rng.uniform(.85, 1.1), fill=c2, op=.88, clip=clip_head)
        for i in range(24):
            cx = HCX + rng.uniform(-shoulder_w * .78, shoulder_w * .78)
            cy = chest_top + rng.uniform(40, 300) * scale
            rr = 4.5 + 11 * rng.random()
            S.ellipse(cx, cy, rr, rr * rng.uniform(.85, 1.1), fill=c2, op=.8)

    if pat == "ticked":
        for i in range(130):
            a = rng.random() * math.tau
            r = rng.random() ** .5
            cx = HCX + math.cos(a) * skullRX * .98 * r
            cy = HCY - skullRY * .08 + math.sin(a) * skullRY * .9 * r
            S.ellipse(cx, cy, 1.4 + 2.2 * rng.random(), 1.4 + 2.2 * rng.random(),
                      fill=c2 if rng.random() > .45 else mix(c2, c3, .5), op=.7, clip=clip_head)

    # =====================================================================
    # 6) BURUN BOLGESI GOLGELENDIRME + BURUN + AGIZ
    # =====================================================================
    S.path(catmull(jag_pts(
        [(muz_cx - muz_rx, muz_cy - muz_ry * .95),
         (muz_cx - muz_rx * .94, muz_cy + muz_ry * (.55 + .35 * flews)),
         (muz_cx - muz_rx * .42, muz_cy + muz_ry * (1.0 + .45 * flews)),
         (muz_cx, muz_cy + muz_ry * (1.02 + .45 * flews)),
         (muz_cx + muz_rx * .42, muz_cy + muz_ry * (1.0 + .45 * flews)),
         (muz_cx + muz_rx * .94, muz_cy + muz_ry * (.55 + .35 * flews)),
         (muz_cx + muz_rx, muz_cy - muz_ry * .95),
         (muz_cx, muz_cy - muz_ry * 1.1)], rng, amp=1.2 + 3 * fur, freq=3)),
        fill="url(#%s)" % (g_muz_mask if pat == "mask" else g_muz), op=.85, clip=clip_head)

    nose_y = muz_cy - muz_ry * .30
    nose_rx = muz_rx * (.44 + .12 * muzW)
    nose_ry = nose_rx * (.62 + .14 * flews)
    nose_pts = [(HCX - nose_rx, nose_y),
                (HCX - nose_rx * .82, nose_y - nose_ry * .8),
                (HCX, nose_y - nose_ry),
                (HCX + nose_rx * .82, nose_y - nose_ry * .8),
                (HCX + nose_rx, nose_y),
                (HCX + nose_rx * .5, nose_y + nose_ry * .72),
                (HCX, nose_y + nose_ry * .92),
                (HCX - nose_rx * .5, nose_y + nose_ry * .72)]
    S.path(catmull(nose_pts), fill="url(#%s)" % g_nose)
    for side in (-1, 1):
        S.ellipse(HCX + side * nose_rx * .44, nose_y + nose_ry * .12,
                  nose_rx * .16, nose_ry * .20, fill="#0a0707", op=.85)
    S.ellipse(HCX - nose_rx * .30, nose_y - nose_ry * .40, nose_rx * .26, nose_ry * .16,
              fill="#ffffff", op=.28)
    if split_nose:
        S.path("M%.1f %.1f L%.1f %.1f" % (HCX, nose_y - nose_ry * 1.0, HCX, nose_y + nose_ry * 1.2),
               stroke=mix(c1, "#3a2a24", .65), sw=4.0, op=.9)
        S.path("M%.1f %.1f L%.1f %.1f" % (HCX, nose_y - nose_ry * 1.0, HCX, nose_y + nose_ry * 1.2),
               stroke=lighter(c1, .5), sw=1.2, op=.45)

    mouth_y = nose_y + nose_ry * 1.25
    droop = 5 + 18 * flews
    for side in (-1, 1):
        S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" %
               (HCX, mouth_y, HCX + side * muz_rx * .30, mouth_y + droop * .6,
                HCX + side * muz_rx * .60, mouth_y + droop * .2,
                HCX + side * muz_rx * .70, mouth_y - droop * .3),
               stroke=darker(c1, .62), sw=2.2 + 1.6 * flews, op=.6)
    if tongue:
        tw = muz_rx * .24
        ty = mouth_y + 2
        S.path(catmull([(HCX - tw, ty), (HCX - tw * 1.0, ty + tw * 1.1),
                        (HCX, ty + tw * 1.45), (HCX + tw * 1.0, ty + tw * 1.1),
                        (HCX + tw, ty)]),
               fill="#5a6ba8" if tongue == "blue" else "#c96a78", op=.92)
        S.path("M%.1f %.1f L%.1f %.1f" % (HCX, ty + 2, HCX, ty + tw * 1.3),
               stroke=darker("#5a6ba8", .35), sw=1.4, op=.5)

    if wrk > .05:
        for i in range(int(2 + 6 * wrk)):
            yy = HCY - skullRY * (.80 - i * .14)
            ww = skullRX * (.40 + .35 * rng.random())
            S.path("M%.1f %.1f Q%.1f %.1f %.1f %.1f" %
                   (HCX - ww, yy, HCX, yy + 7 + 12 * wrk * rng.random(), HCX + ww, yy),
                   stroke=darker(c1, .48), sw=1.8 + 2.6 * wrk, op=.20 + .25 * wrk, clip=clip_head)
        for i in range(int(1 + 4 * wrk)):
            yy = nose_y - nose_ry * (1.5 + i * .5)
            ww = muz_rx * (.65 + .3 * rng.random())
            S.path("M%.1f %.1f Q%.1f %.1f %.1f %.1f" %
                   (HCX - ww, yy, HCX, yy + 9 * wrk, HCX + ww, yy),
                   stroke=darker(c1, .5), sw=2.2 + 2.6 * wrk, op=.25 + .22 * wrk, clip=clip_head)

    # =====================================================================
    # 7) GOZLER (badem sekli, derin)
    # =====================================================================
    for side in (-1, 1):
        ex, ey = HCX + side * eye_dx, eye_y
        rx, ry = eye_rx, eye_ry
        # goz cukuru
        soft(ex, ey, rx * 2.2, ry * 2.6, darker(c1, .55), .26)
        eye_path = ("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f Z" %
                    (ex - rx, ey, ex - rx * .55, ey - ry * 1.15, ex + rx * .55, ey - ry * 1.15,
                     ex + rx, ey, ex + rx * .55, ey + ry * .95, ex - rx * .55, ey + ry * .95,
                     ex - rx, ey))
        clip_eye = S.clip("clipEye%d" % side, eye_path)
        S.path(eye_path, fill="#140e0b", op=.95, clip=clip_head)
        gid = "gIris%d" % side
        S.grad("r", gid, [("0", lighter(eye_c, .38), None), ("0.5", eye_c, None),
                          ("1", darker(eye_c, .6), None)], cx="0.42", cy="0.34", r="0.8")
        iris_r = rx * .78
        S.ellipse(ex + side * rx * .04, ey + ry * .06, iris_r, iris_r * .96,
                  fill="url(#%s)" % gid, clip=clip_eye)
        for i in range(12):
            a = rng.random() * math.tau
            S.path("M%.1f %.1f L%.1f %.1f" %
                   (ex + math.cos(a) * iris_r * .3, ey + math.sin(a) * iris_r * .3,
                    ex + math.cos(a) * iris_r * .95, ey + math.sin(a) * iris_r * .95),
                   stroke=darker(eye_c, .5), sw=.8, op=.30, clip=clip_eye)
        S.ellipse(ex + side * rx * .06, ey + ry * .08, iris_r * .44, iris_r * .44,
                  fill="#0a0707", clip=clip_eye)
        # ust kapak golgesi (irisin ust kismi karanlik)
        S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f L%.1f %.1f L%.1f %.1f Z" %
               (ex - rx, ey - ry * .2, ex - rx * .5, ey - ry * 1.2, ex + rx * .5, ey - ry * 1.2,
                ex + rx, ey - ry * .2, ex + rx, ey - ry * 1.6, ex - rx, ey - ry * 1.6),
               fill="#000000", op=.45, clip=clip_eye)
        S.ellipse(ex - rx * .28, ey - ry * .32, rx * .13, ry * .11, fill="#ffffff", op=.85,
                  clip=clip_eye)
        S.ellipse(ex + rx * .26, ey + ry * .28, rx * .06, ry * .05, fill="#ffffff", op=.35,
                  clip=clip_eye)
        # kapak cizgileri
        S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" %
               (ex - rx * 1.15, ey - ry * .1, ex - rx * .5, ey - ry * 1.3,
                ex + rx * .55, ey - ry * 1.25, ex + rx * 1.15, ey - ry * .05),
               stroke=darker(c1, .65), sw=2.6 + 1.8 * wrk, op=.85, clip=clip_head)
        S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" %
               (ex - rx * 1.0, ey + ry * .35, ex - rx * .3, ey + ry * 1.15,
                ex + rx * .4, ey + ry * 1.1, ex + rx * 1.0, ey + ry * .3),
               stroke=darker(c1, .48), sw=1.6, op=.45, clip=clip_head)
        # yas cizgisi (ic kose -> burun)
        S.path("M%.1f %.1f Q%.1f %.1f %.1f %.1f" %
               (ex - side * rx * .9, ey + ry * .5, HCX - side * muz_rx * .35, stopY + muzL * .3,
                HCX - side * muz_rx * .28, stopY + muzL * .55),
               stroke=darker(c1, .5), sw=1.4, op=.22, clip=clip_head)
        if pat in ("points", "tricolor"):
            S.ellipse(ex, ey - ry * 2.3, rx * .8, ry * .5, fill=c3, op=.7, clip=clip_head)

    # =====================================================================
    # 8) SAKAL / KAS / TUTAM / IP TUY
    # =====================================================================
    bv = max(beard, brow)
    if bv > .05:
        for i in range(int(16 + 46 * bv)):
            x = HCX + rng.uniform(-muz_rx * 1.05, muz_rx * 1.05)
            y = mouth_y + rng.uniform(-2, 22)
            L = (12 + 46 * bv) * rng.uniform(.4, 1.1)
            ang = math.pi / 2 + rng.uniform(-.6, .6) + (0.35 if x > HCX else -0.35)
            S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                   (x, y, math.cos(ang + 1.3) * L * .5, math.sin(ang + 1.3) * L * .5,
                    x + math.cos(ang) * L, y + math.sin(ang) * L),
                   stroke=lighter(c1, .40) if rng.random() > .4 else darker(c1, .34),
                   sw=1.6 + 2.4 * bv, op=.28 + .26 * rng.random(), clip=clip_head)
        if brow > .05:
            for side in (-1, 1):
                for i in range(int(6 + 12 * brow)):
                    x = HCX + side * eye_dx + rng.uniform(-eye_rx * 1.5, eye_rx * 1.5)
                    y = eye_y - eye_ry * (1.8 + rng.random() * 1.0)
                    L = (10 + 30 * brow) * rng.uniform(.4, 1.1)
                    S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                           (x, y, side * L * .4, -L * .45, x + side * L * .75, y + L * .25),
                           stroke=lighter(c1, .38), sw=1.6 + 2.2 * brow, op=.35)

    if cords > .5:
        for i in range(60):
            x = HCX + rng.uniform(-skullRX * 1.25, skullRX * 1.25)
            y = HCY - skullRY * (1.0 + rng.random() * .25)
            L = rng.uniform(110, 380) * (0.7 + 0.5 * scale)
            w = rng.uniform(6, 15)
            col = mix(c1, "#ffffff" if rng.random() > .5 else "#000000", rng.uniform(.05, .28))
            S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" %
                   (x, y, x + rng.uniform(-14, 14), y + L * .33,
                    x + rng.uniform(-18, 18), y + L * .66, x + rng.uniform(-12, 12), y + L),
                   stroke=col, sw=w, op=.9, clip=clip_head)
        for i in range(52):
            x = HCX + rng.uniform(-shoulder_w, shoulder_w)
            y = chest_top + rng.uniform(-10, 70)
            L = rng.uniform(150, 320)
            w = rng.uniform(7, 16)
            col = mix(c1, "#ffffff" if rng.random() > .5 else "#000000", rng.uniform(.05, .26))
            S.path("M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f" %
                   (x, y, x + rng.uniform(-16, 16), y + L * .33,
                    x + rng.uniform(-20, 20), y + L * .66, x + rng.uniform(-14, 14), y + L),
                   stroke=col, sw=w, op=.9)

    if topknot > .05:
        # tepe sac kapagi (dalga sekli)
        crown_y = HCY - skullRY * (1.0 + topknot * .10)
        pts = [(HCX - skullRX * .78, HCY - skullRY * .52)]
        n = 12
        for k in range(n + 1):
            t = k / float(n)
            x = HCX - skullRX * .78 + 1.56 * skullRX * t
            y = crown_y - math.sin(t * math.pi) * skullRY * (.22 + .30 * topknot)
            y += math.sin(t * math.pi * 5) * 4.0
            pts.append((x, y))
        pts += [(HCX + skullRX * .78, HCY - skullRY * .52), (HCX, HCY - skullRY * .8)]
        d_cap = catmull(pts)
        clip_cap = S.clip("clipCap", d_cap)
        S.path(d_cap, fill="url(#gHead)", op=.98)
        for k in range(int(26 + 34 * topknot)):
            t = rng.random() * 2 - 1
            x = HCX + t * skullRX * .72
            y = crown_y + rng.uniform(-6, skullRY * .3)
            L = (26 + 70 * topknot) * rng.uniform(.5, 1.0)
            side = 1 if x >= HCX else -1
            S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                   (x, y, side * L * .30, L * .42, side * L * .18, L),
                   stroke=lighter(c1, .40) if rng.random() > .45 else darker(c1, .25),
                   sw=1.6 + 2.4 * topknot, op=.35 + .25 * rng.random(), clip=clip_cap)
        # yanlara duse tutamlar (kafa silueti boyunca)
        for side in (-1, 1):
            for k in range(int(10 + 18 * topknot)):
                y = HCY - skullRY * (.75 - rng.random() * .55)
                x = HCX + side * skullRX * (.86 + rng.random() * .16)
                L = (30 + 80 * topknot) * rng.uniform(.5, 1.0)
                S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                       (x, y, side * L * .22, L * .45, side * L * .10, L),
                       stroke=lighter(c1, .36) if rng.random() > .4 else c1,
                       sw=1.8 + 2.6 * topknot, op=.4)

    if pompom:
        for side in (-1, 1):
            cx = HCX + side * skullRX * 1.0
            cy = HCY - skullRY * .5
            for i in range(20):
                a = rng.random() * math.tau
                r = skullRX * .28 * rng.random()
                S.ellipse(cx + math.cos(a) * r, cy + math.sin(a) * r,
                          skullRX * .11 * rng.uniform(.6, 1.3), skullRX * .11 * rng.uniform(.6, 1.3),
                          fill=lighter(c1, .34) if rng.random() > .5 else c1, op=.45)

    # =====================================================================
    # 9) TUY SILUETI (ince, kavisli) + AYDINLATMA
    # =====================================================================
    if fur > .10 and cords < .5:
        n_s = int(90 * (fur + fluff * .7) + 24)
        for i in range(n_s):
            p = hp[int(rng.random() * (len(hp) - 1))]
            ang = math.atan2(p[1] - HCY, p[0] - HCX) + rng.uniform(-.4, .4)
            L = (4 + 20 * fur + 12 * fluff) * rng.uniform(.35, 1.0)
            x0, y0 = p[0] - math.cos(ang) * L * .6, p[1] - math.sin(ang) * L * .6
            bend = rng.uniform(-.5, .5)
            S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                   (x0, y0,
                    math.cos(ang + 1.3 + bend) * L * .5, math.sin(ang + 1.3 + bend) * L * .5,
                    x0 + math.cos(ang + bend * .5) * L, y0 + math.sin(ang + bend * .5) * L),
                   stroke=lighter(c1, .32) if rng.random() > .45 else darker(c1, .32),
                   sw=1.0 + 1.8 * fur, op=.07 + .08 * rng.random(), clip=clip_head)
        # govde: yumusak tuy bantlari (cizgi yok)
        soft(HCX - shoulder_w * .42, chest_top + 200 * scale, shoulder_w * .55,
             210 * scale, darker(c1, .38), .20)
        soft(HCX + shoulder_w * .5, chest_top + 240 * scale, shoulder_w * .5,
             220 * scale, darker(c1, .42), .24)
    if feather > .1:
        for side in (-1, 1):
            cid = ear_clips[0 if side < 0 else 1] if len(ear_clips) == 2 else clip_head
            for i in range(int(40 * feather)):
                x = HCX + side * (skullRX * (.72 + rng.random() * .30))
                y = HCY + rng.uniform(-skullRY * .1, 190 * scale)
                L = (10 + 34 * feather) * rng.uniform(.4, 1.0)
                bend = rng.uniform(.35, .8) * side
                S.path("M%.1f %.1f q%.1f %.1f %.1f %.1f" %
                       (x, y, bend * L * .5, L * .45, x + bend * L * .35, y + L),
                       stroke=lighter(c1, .34) if rng.random() > .4 else c1,
                       sw=1.4 + 2.0 * feather, op=.30, clip=cid)
            # kulak kenarinda dalga (fringe)
            x0 = HCX + side * skullRX * .98
            d = "M%.1f %.1f" % (x0, HCY - skullRY * .1)
            yy = HCY - skullRY * .1
            for i in range(7):
                yy += (42 + 30 * feather) * scale
                d += " q%.1f %.1f %.1f %.1f" % (side * (10 + 8 * feather), 22 * scale,
                                                0, 44 * scale)
            d += " q%.1f %.1f %.1f %.1f" % (-side * 26, 18, -side * 34, -30)
            S.path(d, fill=lighter(c1, .22), op=.35, clip=cid)

    # alt cene golgesi
    S.path(catmull([(HCX - skullRX * .85, jawY + muzL * .30), (HCX, jawY + muzL * 1.0),
                    (HCX + skullRX * .85, jawY + muzL * .30),
                    (HCX + skullRX * .45, jawY + muzL * 1.05),
                    (HCX - skullRX * .45, jawY + muzL * 1.05)]),
           fill=darker(c1, .6), op=.22, clip=clip_head)
    # boyun alt golgesi (govdeye)
    soft(HCX, jawY + muzL * 1.18, skullRX * 1.15, skullRY * .52, darker(c1, .62), .28)
    # sol ust kenar isigi
    g_rim = S.grad("l", "gRim", [("0", "#ffd9a0", .42), ("0.30", "#ffd9a0", 0),
                                 ("1", "#000000", 0)], x1="0", y1="0.15", x2="0.6", y2="0.85")
    S.path(head_d, fill="url(#%s)" % g_rim)
    S.path(body_d, fill="url(#%s)" % g_rim, op=.8)
    # sag alt golge
    g_shade = S.grad("l", "gShade", [("0", "#000000", 0), ("0.62", "#000000", 0),
                                     ("1", "#000414", .42)], x1="0.25", y1="0", x2="1", y2="1")
    S.path(head_d, fill="url(#%s)" % g_shade)
    S.path(body_d, fill="url(#%s)" % g_shade)
    # siluet kenari
    S.path(head_d, fill="none", stroke=darker(c1, .7), sw=1.8, op=.4)
    S.path(body_d, fill="none", stroke=darker(c1, .7), sw=1.8, op=.3)

    return S.svg(W, H), dict(head_d=head_d, body_d=body_d, HCX=HCX, HCY=HCY,
                             skullRX=skullRX, skullRY=skullRY, scale=scale,
                             shoulder_w=shoulder_w, chest_top=chest_top)

if __name__ == "__main__":
    print("dogart modul olarak kullanilir: scripts/art/build_dog_images.py")
