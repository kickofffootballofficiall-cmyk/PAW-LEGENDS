#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""data/*.json -> src/js/core/data_bundle.js  (file:// uyumlulugu icin gomulu veri).
Boylece oyun yerel dosyadan acildiginda fetch/CORS gerektirmez."""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "src", "js", "core", "data_bundle.js")


def rd(n):
    with open(os.path.join(DATA, n), encoding="utf-8") as f:
        return json.load(f)


def main():
    breeds = rd("breeds.json")["breeds"]
    rarities = rd("rarities.json")["rarities"]
    crates = rd("crates.json")["crates"]
    balance = rd("balance.json")
    items = rd("items.json")["items"]
    quests = rd("quests.json")
    achievements = rd("achievements.json")["achievements"]
    events = rd("events.json")["events"]
    lookups = rd("_lookups.json")

    bundle = {
        "version": balance["version"],
        "breeds": breeds,
        "rarities": rarities,
        "crates": crates,
        "balance": balance,
        "items": items,
        "quests": quests,
        "achievements": achievements,
        "events": events,
        "lookups": lookups,
        "statKeys": rd("breeds.json")["statKeys"],
        "statLabels": rd("breeds.json")["statLabels"],
    }
    js = ("/* OTOMATIK URETILDI - scripts/build_game_bundle.py (elle duzenlemeyin) */\n"
          "(function (root) {\n\"use strict\";\nvar PL = root.PL = root.PL || {};\n"
          "PL.DB = " + json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + ";\n"
          "PL.DB.breedsById = {};\nPL.DB.breedsByKey = {};\nPL.DB.itemsById = {};\n"
          "for (var i=0;i<PL.DB.breeds.length;i++){PL.DB.breedsById[PL.DB.breeds[i].id]=PL.DB.breeds[i];"
          "PL.DB.breedsByKey[PL.DB.breeds[i].key]=PL.DB.breeds[i];}\n"
          "for (var j=0;j<PL.DB.items.length;j++){PL.DB.itemsById[PL.DB.items[j].id]=PL.DB.items[j];}\n"
          "})(typeof window !== \"undefined\" ? window : globalThis);\n")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)
    print("yazildi: src/js/core/data_bundle.js (%.1f KB)" % (os.path.getsize(OUT) / 1024.0))


if __name__ == "__main__":
    main()
