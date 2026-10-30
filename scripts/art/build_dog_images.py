#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAW LEGENDS - 100 kopek portresini uretir.

Pipeline:
  1. data/_lookups.json -> irk cizim parametreleri
  2. scripts/art/dogart.render_dog_svg() -> seffaf zeminli SVG (kopek)
  3. cairosvg -> 2x supersampling ile PNG (RGBA)
  4. PIL/numpy -> premium arka plan (radyal gradyan + nadirlik parlamasi +
     zemin golgesi + rim light + grain + vinyet) ile kompozit
  5. assets/dogs/dog_XXX.webp  (+ kaynak SVG: assets/dogs/dog_XXX.svg)

Kullanim:
  python3 scripts/art/build_dog_images.py            # 100 irk
  python3 scripts/art/build_dog_images.py --only 1 6 14 43   # secili test
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
RESAMPLE = Image.Resampling.LANCZOS

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT)

import cairosvg  # noqa: E402
from scripts.art.dogart import render_dog_svg, W as SVG_W, H as SVG_H, mix  # noqa: E402

DOGS_DIR = os.path.join(ROOT, "assets", "dogs")
SS = 2                      # supersample carpani
KEEP_PNG = False            # webp yeter; PNG yalnizca --png ile
OUT = 720                   # cikti boyutu (kare)
RENDER = OUT * SS


def radial_bg(size, center_color, edge_color, cx=0.5, cy=0.34, power=1.35):
    """Radyal gradyan arka plan (numpy)."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    dx = (x / size - cx) * 1.0
    dy = (y / size - cy) * 1.15
    d = np.sqrt(dx * dx + dy * dy) ** power
    d = np.clip(d / 0.92, 0, 1)[..., None]
    c0 = np.array(center_color, np.float32)
    c1 = np.array(edge_color, np.float32)
    img = c0[None, None, :] * (1 - d) + c1[None, None, :] * d
    return img


def build_background(rarity_color, rng):
    """Premium koyu lacivert/siyah arka plan + nadirlik parlamasi + isik huzmeleri."""
    size = RENDER
    bg = radial_bg(size, (30, 42, 68), (5, 7, 13))
    # hafif ikincil radyal (alt kisim daha koyu)
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    floor = np.clip((y / size - 0.55) / 0.45, 0, 1)[..., None]
    bg = bg * (1 - 0.35 * floor) + np.array([3, 4, 8], np.float32) * (0.35 * floor)

    img = Image.fromarray(np.clip(bg, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

    # nadirlik parlamasi (kafa arkasinda)
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gcx, gcy = int(size * 0.5), int(size * 0.44)
    r = int(size * 0.36)
    rc = tuple(int(v) for v in bytes.fromhex(rarity_color.lstrip("#")))
    for i in range(26, 0, -1):
        rr = int(r * (0.35 + 0.65 * i / 26.0))
        a = int(9.0 * (1 - i / 26.0) + 2)
        gd.ellipse([gcx - rr, gcy - rr * 0.92, gcx + rr, gcy + rr * 0.92],
                   fill=rc + (a,))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.045))
    img.alpha_composite(glow)

    # isik huzmeleri (sol ustten)
    rays = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(9):
        t = i / 8.0
        x0 = int(size * (-0.15 + 0.55 * t))
        w = int(size * (0.03 + 0.05 * rng.random()))
        pts = [(x0, -10), (x0 + w, -10),
               (x0 + int(size * 0.55) + w * 3, size + 10),
               (x0 + int(size * 0.55), size + 10)]
        rd.polygon(pts, fill=(214, 226, 255, int(3 + 4 * rng.random())))
    rays = rays.filter(ImageFilter.GaussianBlur(size * 0.02))
    img.alpha_composite(rays)

    # zemin platformu (hafif elips)
    plat = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plat)
    py = int(size * 0.94)
    pd.ellipse([int(size * 0.10), py - int(size * 0.075),
                int(size * 0.90), py + int(size * 0.075)],
               fill=(12, 18, 32, 200))
    pd.ellipse([int(size * 0.14), py - int(size * 0.062),
                int(size * 0.86), py + int(size * 0.062)],
               outline=(200, 172, 106, 90), width=max(2, size // 320))
    plat = plat.filter(ImageFilter.GaussianBlur(size * 0.006))
    img.alpha_composite(plat)
    return img


def add_grain_and_vignette(img, rng, grain=5.5):
    a = np.asarray(img).astype(np.float32)
    n = rng.normal(0, grain, (a.shape[0], a.shape[1], 1)).astype(np.float32)
    a[..., :3] = np.clip(a[..., :3] + n, 0, 255)
    size = a.shape[0]
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.sqrt(((x / size - 0.5) * 1.06) ** 2 + ((y / size - 0.48) * 1.12) ** 2)
    vig = np.clip((d - 0.42) / 0.62, 0, 1) ** 1.7
    a[..., :3] *= (1 - 0.55 * vig[..., None])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def composite_dog(bg, dog_rgba):
    """Kopegi zeminle birlestirir: golge + rim light + kompozit."""
    size = bg.size[0]
    alpha = dog_rgba.getchannel("A")
    a_np = np.asarray(alpha).astype(np.float32) / 255.0

    # 1) temas golgesi (ayak/kaydirma)
    sh = Image.fromarray((a_np * 255).astype(np.uint8), "L")
    sh = sh.filter(ImageFilter.GaussianBlur(size * 0.022))
    sh = sh.transform(sh.size, Image.AFFINE, (1, 0, size * 0.012, 0, 1, size * 0.020))
    shadow_layer = Image.new("RGBA", bg.size, (0, 0, 0, 0))
    shadow_layer.putalpha(sh.point(lambda v: int(v * 0.72)))
    bg = Image.alpha_composite(bg, shadow_layer)

    # 2) dis rim glow (altin)
    blur_a = Image.fromarray((a_np * 255).astype(np.uint8), "L").filter(
        ImageFilter.GaussianBlur(size * 0.008))
    b_np = np.asarray(blur_a).astype(np.float32) / 255.0
    outer = np.clip(b_np - a_np, 0, 1)
    rim = np.zeros((size, size, 4), np.float32)
    rim[..., 0], rim[..., 1], rim[..., 2] = 255, 205, 140
    rim[..., 3] = outer * 150
    rim_img = Image.fromarray(np.clip(rim, 0, 255).astype(np.uint8), "RGBA")
    bg = Image.alpha_composite(bg, rim_img)

    # 3) kopek
    bg = Image.alpha_composite(bg, dog_rgba)

    # 4) ic isik: sol kenarda hafif parlama
    inner = np.clip(a_np - b_np, 0, 1)
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    left = np.clip(1 - (x / size) * 1.6, 0, 1)
    hl = np.zeros((size, size, 4), np.float32)
    hl[..., 0], hl[..., 1], hl[..., 2] = 255, 236, 200
    hl[..., 3] = inner * left * 120
    bg = Image.alpha_composite(bg, Image.fromarray(np.clip(hl, 0, 255).astype(np.uint8), "RGBA"))
    return bg


def render_one(look, rarities, out_dir=DOGS_DIR, write_svg=True, verbose=False):
    key = look["key"]
    rng = np.random.default_rng(look["id"] * 104729 + 7)
    svg_str, _meta = render_dog_svg(look)
    png = cairosvg.svg2png(bytestring=svg_str.encode("utf-8"),
                           output_width=RENDER, output_height=RENDER)
    import io
    dog = Image.open(io.BytesIO(png)).convert("RGBA")

    rar = rarities[look["rarity"]]
    bg = build_background(rar["color"], np.random.default_rng(look["id"] * 31 + 5))
    img = composite_dog(bg, dog)
    img = add_grain_and_vignette(img, np.random.default_rng(look["id"] * 17 + 3))

    os.makedirs(out_dir, exist_ok=True)
    webp_path = os.path.join(out_dir, key + ".webp")
    small = img.resize((OUT, OUT), RESAMPLE)
    small.save(webp_path, "WEBP", quality=82, method=5)
    if KEEP_PNG:
        small.save(os.path.join(out_dir, key + ".png"), "PNG", optimize=True)
    if write_svg:
        with open(os.path.join(out_dir, key + ".svg"), "w", encoding="utf-8") as f:
            f.write(svg_str)
    if verbose:
        print("  %s -> %s (%.0f KB webp)" % (key, look["name_tr"] if "name_tr" in look else "",
                                             os.path.getsize(webp_path) / 1024.0))
    return webp_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", type=int, help="yalnizca bu irk numaralari")
    ap.add_argument("--no-svg", action="store_true")
    ap.add_argument("--png", action="store_true", help="PNG kopyasi da yazilsin")
    args = ap.parse_args()
    global KEEP_PNG
    KEEP_PNG = args.png

    data = json.load(open(os.path.join(ROOT, "data", "_lookups.json"), encoding="utf-8"))
    rar = json.load(open(os.path.join(ROOT, "data", "rarities.json"), encoding="utf-8"))["rarities"]
    breeds = json.load(open(os.path.join(ROOT, "data", "breeds.json"), encoding="utf-8"))["breeds"]
    names = {b["key"]: b["name_tr"] for b in breeds}

    keys = sorted(data.keys())
    if args.only:
        keys = ["dog_%03d" % n for n in args.only]

    import time
    t0 = time.time()
    total_bytes = 0
    for i, k in enumerate(keys, 1):
        look = dict(data[k])
        look["name_tr"] = names.get(k, k)
        p = render_one(look, rar, write_svg=not args.no_svg)
        total_bytes += os.path.getsize(p)
        print("[%3d/%3d] %s  %-32s %6.0f KB" % (i, len(keys), k, look["name_tr"],
                                                os.path.getsize(p) / 1024.0))
    print("\nToplam: %d gorsel, %.1f MB (webp), sure %.1f sn"
          % (len(keys), total_bytes / 1048576.0, time.time() - t0))


if __name__ == "__main__":
    main()
