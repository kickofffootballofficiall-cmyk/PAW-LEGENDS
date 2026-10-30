#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAW LEGENDS - ozgun ses varliklari sentezleyici (harici dosya/ kutuphane yok).
Tum sesler numpy ile sentezlenir, 16-bit WAV olarak yazilir.

Cikti (assets/sounds/):
  bark_small.wav bark_medium.wav bark_large.wav puppy_yip.wav
  ui_click.wav ui_hover.wav ui_back.wav ui_error.wav
  crate_shake.wav crate_open.wav reward_chime.wav reward_epic.wav reward_mythic.wav
  coin.wav battle_hit.wav battle_crit.wav battle_heal.wav battle_win.wav battle_lose.wav
  breed_done.wav level_up.wav
  music_menu.wav music_battle.wav music_farm.wav   (dongu-uyumlu)
"""
import os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SND = os.path.join(ROOT, "assets", "sounds")
SR = 44100
SR_M = 22050          # muzik icin dusuk oran (boyut)


def env(n, a=0.005, d=0.1, s=0.6, r=0.2, total=None):
    """ADSR zarf."""
    total = total or n
    t = np.arange(total) / SR
    e = np.zeros(total)
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(1, total - a_n - d_n - r_n)
    e[:a_n] = np.linspace(0, 1, a_n)
    e[a_n:a_n + d_n] = np.linspace(1, s, d_n)
    e[a_n + d_n:a_n + d_n + s_n] = s
    e[a_n + d_n + s_n:] = np.linspace(s, 0, r_n)
    return e[:total]


def tone(freq, dur, sr=SR, shape="sine", detune=0.0, phase=0.0):
    t = np.arange(int(dur * sr)) / sr
    f = freq * (1 + detune)
    if shape == "sine":
        return np.sin(2 * np.pi * f * t + phase)
    if shape == "square":
        return np.sign(np.sin(2 * np.pi * f * t + phase)) * 0.5
    if shape == "saw":
        return 2 * ((f * t + phase / (2 * np.pi)) % 1) - 1
    if shape == "tri":
        return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    if shape == "noise":
        rng = np.random.default_rng(int(freq) % 10000)
        return rng.standard_normal(len(t))
    return np.sin(2 * np.pi * f * t)


def sweep(f0, f1, dur, sr=SR, curve=1.0):
    t = np.arange(int(dur * sr)) / sr
    f = f0 + (f1 - f0) * (t / dur) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / sr)


def noise(dur, sr=SR, seed=1):
    rng = np.random.default_rng(seed)
    return rng.standard_normal(int(dur * sr))


def lowpass(x, cutoff, sr=SR, order=4):
    """Basit IIR alçak geciren (biquad kaskadi)."""
    from numpy import clip
    wc = np.tan(np.pi * cutoff / sr)
    for _ in range(order):
        y = np.zeros_like(x)
        a = wc / (1 + wc)
        for i in range(1, len(x)):
            y[i] = y[i - 1] + a * (x[i] - y[i - 1])
        x = y
    return x


def write_wav(name, x, sr=SR, gain=0.85):
    os.makedirs(SND, exist_ok=True)
    x = np.asarray(x, np.float64)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * gain
    xi = np.clip(x * 32767, -32768, 32767).astype(np.int16)
    import wave
    p = os.path.join(SND, name)
    with wave.open(p, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(xi.tobytes())
    return p, os.path.getsize(p)


# --------------------------------------------------------------------------- #
def bark(kind="medium", seed=3):
    """Havlama: dusuk frekansli darbe + gurultu patlamasi + formant."""
    rng = np.random.default_rng(seed)
    if kind == "small":
        f0, dur, reps = 520, 0.16, 2
    elif kind == "large":
        f0, dur, reps = 130, 0.34, 2
    else:
        f0, dur, reps = 260, 0.24, 2
    out = []
    gap = int(0.10 * SR)
    for r in range(reps):
        n = int(dur * SR)
        t = np.arange(n) / SR
        f = f0 * (1 - 0.35 * t / dur) + rng.uniform(-20, 20)
        pulse = np.sin(2 * np.pi * np.cumsum(f) / SR)
        pulse = np.tanh(pulse * 2.2)
        nz = noise(dur, seed=seed + r) * np.exp(-t * 26)
        nz = nz - lowpass(nz, 900)          # bant geciren etkisi
        growl = np.sin(2 * np.pi * (f * 2.7) * t) * 0.35
        x = (pulse * 0.75 + nz * 0.5 + growl) * np.exp(-t * 9)
        x *= (1 - np.exp(-t * 400))
        out.append(x)
        out.append(np.zeros(gap))
    x = np.concatenate(out)
    return x


def yip(seed=7):
    rng = np.random.default_rng(seed)
    parts = []
    for i in range(3):
        dur = 0.10
        n = int(dur * SR)
        t = np.arange(n) / SR
        f = rng.uniform(700, 900) * (1 + 0.5 * t / dur)
        x = np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * 2.5) * np.exp(-t * 14)
        parts.append(x)
        parts.append(np.zeros(int(0.07 * SR)))
    return np.concatenate(parts)


def click(freq=1800, dur=0.06, seed=1):
    x = tone(freq, dur) * env(int(dur * SR), a=.002, d=.02, s=.2, r=.03)
    x += noise(dur, seed=seed) * 0.15 * np.exp(-np.arange(int(dur * SR)) / SR * 90)
    return x


def hover():
    return tone(2400, 0.045) * env(int(0.045 * SR), a=.002, d=.015, s=.15, r=.02) * 0.5


def back():
    return sweep(900, 420, 0.14) * env(int(0.14 * SR), a=.003, d=.05, s=.3, r=.06)


def error():
    x = tone(220, 0.16, shape="square") * 0.4
    x += tone(180, 0.16, shape="square") * 0.3
    return x * env(int(0.16 * SR), a=.004, d=.04, s=.6, r=.08)


def crate_shake():
    n = int(0.9 * SR)
    x = noise(0.9, seed=11) * 0.5
    x = x - lowpass(x, 400)
    trem = (np.sin(2 * np.pi * 9 * np.arange(n) / SR) > 0) * 1.0
    x *= trem * np.linspace(0.4, 1.0, n)
    x += sweep(120, 90, 0.9) * 0.25 * np.linspace(0.3, 1, n)
    return x * env(n, a=.02, d=.2, s=.8, r=.25)


def crate_open():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    whoosh = noise(1.6, seed=21)
    whoosh = whoosh - lowpass(whoosh, 300)
    whoosh *= np.linspace(0, 1, n) ** 2 * np.exp(-np.maximum(0, t - 0.9) * 6)
    creak = np.zeros(n)
    _c = sweep(300, 700, 0.5) * 0.2 * np.exp(-np.arange(int(0.5 * SR)) / SR * 4)
    creak[:len(_c)] = _c
    burst = np.zeros(n)
    b0 = int(0.85 * SR)
    bt = np.arange(n - b0) / SR
    burst[b0:] = (noise(1.6 - 0.85, seed=31) * np.exp(-bt * 12)) * 0.9
    shimmer = np.zeros(n)
    for i, f in enumerate((1046.5, 1318.5, 1568.0, 2093.0)):
        st = b0 + int(i * 0.05 * SR)
        ln = min(n - st, int(0.7 * SR))
        tt = np.arange(ln) / SR
        shimmer[st:st + ln] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 5) * 0.22
    return whoosh + creak + burst + shimmer


def chime(notes, dur=0.5, sr=SR, bright=1.0):
    n = int(dur * SR * len(notes) * 0.55)
    x = np.zeros(n)
    for i, f in enumerate(notes):
        st = int(i * dur * 0.45 * SR)
        ln = min(n - st, int(dur * SR))
        t = np.arange(ln) / SR
        x[st:st + ln] += (np.sin(2 * np.pi * f * t) * 0.6 +
                          np.sin(2 * np.pi * f * 2 * t) * 0.22 * bright +
                          np.sin(2 * np.pi * f * 3.01 * t) * 0.10 * bright) * np.exp(-t * 4.5)
    return x


def coin():
    x = np.zeros(int(0.22 * SR))
    for i, f in enumerate((1568.0, 2093.0)):
        st = int(i * 0.06 * SR)
        ln = len(x) - st
        t = np.arange(ln) / SR
        x[st:] += np.sin(2 * np.pi * f * t) * np.exp(-t * 18) * 0.6
    return x


def _pad(x, n):
    o = np.zeros(n)
    o[:min(n, len(x))] = x[:min(n, len(x))]
    return o


def hit(power=1.0):
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    thump = _pad(sweep(180 * power, 60, 0.25), n) * np.exp(-t * 16)
    snap = (noise(0.28, seed=41) * np.exp(-t * 40)) * 0.6
    snap = snap - lowpass(snap, 500)
    return (thump * 0.9 + snap) * power


def crit():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    x = _pad(sweep(900, 180, 0.45), n) * np.exp(-t * 7) * 0.7
    x += noise(0.5, seed=51) * np.exp(-t * 22) * 0.5
    x += np.sin(2 * np.pi * 2200 * t) * np.exp(-t * 30) * 0.3
    return x


def heal():
    n = int(0.8 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for f in (523.25, 659.25, 783.99):
        x += np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * 5 * t) * .4) * np.exp(-t * 3) * 0.25
    return x * np.linspace(0, 1, n) ** .5


def win():
    return chime([523.25, 659.25, 783.99, 1046.5, 1318.5], dur=0.55, bright=1.2)


def lose():
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * (300 - 120 * t / 1.1) * t) * 0.5
    x += np.sin(2 * np.pi * (220 - 90 * t / 1.1) * t) * 0.4
    return x * env(n, a=.01, d=.3, s=.6, r=.5)


def level_up():
    return chime([392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5], dur=0.4, bright=1.4)


# --------------------------------------------------------------------------- #
# MUZIK (dongu uyumlu)
# --------------------------------------------------------------------------- #
def music_track(kind="menu", bars=8, bpm=92, sr=SR_M):
    spb = 60.0 / bpm
    beat = int(spb * sr)
    total = bars * 4 * beat
    t = np.arange(total) / sr
    out = np.zeros(total)

    chords = {
        "menu":   [(0, [0, 3, 7, 10]), (5, [0, 4, 7, 11]), (3, [0, 3, 7, 10]), (4, [0, 4, 7, 10])],
        "battle": [(0, [0, 3, 7]), (0, [0, 3, 7]), (5, [0, 4, 7]), (3, [0, 3, 7])],
        "farm":   [(0, [0, 4, 7, 9]), (3, [0, 4, 7, 11]), (4, [0, 4, 7, 9]), (0, [0, 4, 7, 12])],
    }[kind]
    root_hz = {"menu": 220.0, "battle": 146.83, "farm": 196.0}[kind]

    for bar in range(bars):
        deg, intervals = chords[bar % len(chords)]
        st = bar * 4 * beat
        ln = 4 * beat
        bt = np.arange(ln) / sr
        # pad
        for iv in intervals:
            f = root_hz * (2 ** (iv / 12.0))
            vib = 1 + 0.002 * np.sin(2 * np.pi * 4.5 * bt)
            pad = (np.sin(2 * np.pi * f * bt * vib) * 0.5 +
                   np.sin(2 * np.pi * f * 2 * bt) * 0.14 +
                   np.sin(2 * np.pi * f * 0.5 * bt) * 0.22)
            e = np.minimum(bt / (spb * 0.8), 1) * np.minimum((ln / sr - bt) / (spb * 0.8), 1)
            out[st:st + ln] += pad * e * 0.10
        # bas
        f = root_hz * 0.5 * (2 ** (deg / 12.0))
        for b in range(4):
            s2 = st + b * beat
            l2 = min(beat, total - s2)
            tt = np.arange(l2) / sr
            bass = np.tanh(np.sin(2 * np.pi * f * tt) * 1.6) * np.exp(-tt * 3.2)
            out[s2:s2 + l2] += bass * (0.22 if kind != "menu" else 0.16)
        # ritim
        if kind == "battle":
            for b in range(4):
                s2 = st + b * beat
                l2 = min(int(0.12 * sr), total - s2)
                tt = np.arange(l2) / sr
                rng = np.random.default_rng(bar * 4 + b)
                kick = np.sin(2 * np.pi * (120 - 60 * tt / 0.12) * tt) * np.exp(-tt * 22)
                out[s2:s2 + l2] += kick * 0.5
                if b in (1, 3):
                    hh = rng.standard_normal(l2) * np.exp(-tt * 90) * 0.16
                    out[s2:s2 + l2] += hh
            s3 = st + int(2.5 * beat)
            l3 = min(int(0.2 * sr), total - s3)
            tt = np.arange(l3) / sr
            rng = np.random.default_rng(bar * 9 + 1)
            out[s3:s3 + l3] += rng.standard_normal(l3) * np.exp(-tt * 40) * 0.22
        elif kind == "farm":
            for b in (0, 2):
                s2 = st + b * beat + beat // 2
                l2 = min(int(0.1 * sr), total - s2)
                tt = np.arange(l2) / sr
                rng = np.random.default_rng(bar * 4 + b)
                out[s2:s2 + l2] += rng.standard_normal(l2) * np.exp(-tt * 70) * 0.10
        # melodi (menu/farm)
        if kind != "battle":
            rng = np.random.default_rng(bar * 31 + 7)
            scale = [0, 3, 5, 7, 10] if kind == "menu" else [0, 2, 4, 7, 9]
            for b in range(4):
                if rng.random() < 0.75:
                    iv = deg + scale[rng.integers(0, len(scale))] + (12 if rng.random() < .3 else 0)
                    f = root_hz * 2 * (2 ** (iv / 12.0))
                    s2 = st + b * beat
                    l2 = min(int(beat * 0.9), total - s2)
                    tt = np.arange(l2) / sr
                    mel = (np.sin(2 * np.pi * f * tt) * 0.5 +
                           np.sin(2 * np.pi * f * 2 * tt) * 0.15)
                    out[s2:s2 + l2] += mel * np.exp(-tt * 3.5) * 0.16
    # dongu icin capraz solma
    xf = int(0.35 * sr)
    w = np.linspace(0, 1, xf)
    out[:xf] = out[:xf] * w + out[-xf:] * (1 - w)
    out[-xf:] = out[-xf:] * (1 - w) + out[:xf] * w
    return out


def main():
    jobs = [
        ("bark_small.wav", bark("small", 3), SR),
        ("bark_medium.wav", bark("medium", 5), SR),
        ("bark_large.wav", bark("large", 9), SR),
        ("puppy_yip.wav", yip(7), SR),
        ("ui_click.wav", click(), SR),
        ("ui_hover.wav", hover(), SR),
        ("ui_back.wav", back(), SR),
        ("ui_error.wav", error(), SR),
        ("crate_shake.wav", crate_shake(), SR),
        ("crate_open.wav", crate_open(), SR),
        ("reward_chime.wav", chime([659.25, 830.61, 987.77], 0.45), SR),
        ("reward_epic.wav", chime([523.25, 659.25, 783.99, 1046.5], 0.5, bright=1.3), SR),
        ("reward_mythic.wav", chime([392, 523.25, 659.25, 783.99, 1046.5, 1567.98], 0.55, bright=1.5), SR),
        ("coin.wav", coin(), SR),
        ("battle_hit.wav", hit(1.0), SR),
        ("battle_crit.wav", crit(), SR),
        ("battle_heal.wav", heal(), SR),
        ("battle_win.wav", win(), SR),
        ("battle_lose.wav", lose(), SR),
        ("breed_done.wav", yip(13), SR),
        ("level_up.wav", level_up(), SR),
        ("music_menu.wav", music_track("menu", 8, 84), SR_M),
        ("music_battle.wav", music_track("battle", 8, 128), SR_M),
        ("music_farm.wav", music_track("farm", 8, 100), SR_M),
    ]
    total = 0
    for name, x, sr in jobs:
        p, sz = write_wav(name, x, sr)
        total += sz
        print("  %-20s %6.1f KB  (%.2f sn)" % (name, sz / 1024.0, len(x) / sr))
    print("Toplam ses: %.2f MB" % (total / 1048576.0))


if __name__ == "__main__":
    main()
