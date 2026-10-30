#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PAW LEGENDS: DOG WORLD - veri uretici
scripts/data/breeds_{a,b,c}.py icindeki 100 irk tablosundan su dosyalari uretir:
    data/breeds.json       data/rarities.json   data/crates.json
    data/balance.json      data/items.json      data/quests.json
    data/achievements.json data/events.json
Ayrica gorsel ureticinin (scripts/art/*) kullandigi ara dosyayi yazar:
    data/_lookups.json  (irki -> cizim parametreleri)
Calistirma:  python3 scripts/build_data.py
"""
import json
import math
import os
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from scripts.data.breeds_a import BREEDS_A  # noqa: E402
from scripts.data.breeds_b import BREEDS_B  # noqa: E402
from scripts.data.breeds_c import BREEDS_C  # noqa: E402

DATA = os.path.join(ROOT, "data")
ALL = BREEDS_A + BREEDS_B + BREEDS_C

STAT_KEYS = ["power", "speed", "stamina", "intelligence", "agility", "defense"]
STAT_TR = {
    "power": "Güç", "speed": "Hız", "stamina": "Dayanıklılık",
    "intelligence": "Zekâ", "agility": "Çeviklik", "defense": "Savunma",
}

RARITIES = {
    "yaygın": dict(
        order=1, name_tr="Yaygın", name_en="Common",
        color="#9fb0c4", color_dark="#5b6a7d", glow="rgba(159,176,196,0.55)",
        stat_sum=300, production_mult=1.0, price_mult=1.0, xp_mult=1.0,
        crate_base_weight=60.0),
    "seçkin": dict(
        order=2, name_tr="Seçkin", name_en="Uncommon",
        color="#43d17c", color_dark="#1c7a45", glow="rgba(67,209,124,0.55)",
        stat_sum=345, production_mult=2.0, price_mult=2.4, xp_mult=1.25,
        crate_base_weight=28.0),
    "nadir": dict(
        order=3, name_tr="Nadir", name_en="Rare",
        color="#3fa2ff", color_dark="#1552a8", glow="rgba(63,162,255,0.6)",
        stat_sum=390, production_mult=3.6, price_mult=5.2, xp_mult=1.55,
        crate_base_weight=16.0),
    "çok_nadir": dict(
        order=4, name_tr="Çok Nadir", name_en="Epic",
        color="#b06bff", color_dark="#5f2aa8", glow="rgba(176,107,255,0.65)",
        stat_sum=435, production_mult=6.5, price_mult=11.0, xp_mult=1.9,
        crate_base_weight=8.0),
    "efsanevi": dict(
        order=5, name_tr="Efsanevi", name_en="Legendary",
        color="#ffb03a", color_dark="#a85f06", glow="rgba(255,176,58,0.7)",
        stat_sum=485, production_mult=12.0, price_mult=24.0, xp_mult=2.4,
        crate_base_weight=3.0),
    "mitik": dict(
        order=6, name_tr="Mitik", name_en="Mythic",
        color="#ff4a6e", color_dark="#8d0f2c", glow="rgba(255,74,110,0.75)",
        stat_sum=545, production_mult=24.0, price_mult=52.0, xp_mult=3.0,
        crate_base_weight=1.0),
}

CRATES = [
    dict(id="silver", name_tr="Gümüş Kutu", name_en="Silver Crate",
         price=10000, image="assets/crates/crate_silver.webp",
         accent="#c9d4e0", accent2="#6b7787",
         odds={"yaygın": .60, "seçkin": .30, "nadir": .085, "çok_nadir": .0135,
               "efsanevi": .0014, "mitik": .0001},
         reward_mix={"dog": .80, "points": .14, "item": .06},
         points_min=2500, points_max=9000,
         item_pool=["xp_potion_s", "food_s", "booster_prod_s"],
         desc_tr="Başlangıç kasası. Çoğunlukla Yaygın ve Seçkin ırklar çıkar."),
    dict(id="gold", name_tr="Altın Kutu", name_en="Gold Crate",
         price=50000, image="assets/crates/crate_gold.webp",
         accent="#ffcf5c", accent2="#a8720c",
         odds={"yaygın": .26, "seçkin": .40, "nadir": .245, "çok_nadir": .070,
               "efsanevi": .0235, "mitik": .0015},
         reward_mix={"dog": .82, "points": .12, "item": .06},
         points_min=12000, points_max=42000,
         item_pool=["xp_potion_m", "food_m", "booster_prod_m", "breed_ticket"],
         desc_tr="Dengeli kasa. Nadir ve Çok Nadir ırk şansı belirgin şekilde yüksektir."),
    dict(id="diamond", name_tr="Elmas Kutu", name_en="Diamond Crate",
         price=100000, image="assets/crates/crate_diamond.webp",
         accent="#8fe3ff", accent2="#1d6f9c",
         odds={"yaygın": .04, "seçkin": .26, "nadir": .42, "çok_nadir": .205,
               "efsanevi": .070, "mitik": .005},
         reward_mix={"dog": .85, "points": .10, "item": .05},
         points_min=30000, points_max=95000,
         item_pool=["xp_potion_l", "food_l", "booster_prod_l", "breed_ticket", "luck_charm"],
         desc_tr="Yüksek seviye kasa. Efsanevi ırk şansı %7'nin üzerindedir."),
    dict(id="legendary", name_tr="Efsanevi Kutu", name_en="Legendary Crate",
         price=200000, image="assets/crates/crate_legendary.webp",
         accent="#ffb03a", accent2="#8d4a04",
         odds={"yaygın": .0, "seçkin": .05, "nadir": .33, "çok_nadir": .40,
               "efsanevi": .19, "mitik": .03},
         reward_mix={"dog": .88, "points": .08, "item": .04},
         points_min=70000, points_max=180000,
         item_pool=["xp_potion_l", "booster_prod_l", "breed_ticket", "luck_charm", "rename_token"],
         desc_tr="Usta kasası. Yaygın ırk çıkmaz; en az Seçkin, çoğunlukla Nadir+."),
    dict(id="mythic", name_tr="Mitik Kutu", name_en="Mythic Crate",
         price=500000, image="assets/crates/crate_mythic.webp",
         accent="#ff4a6e", accent2="#6d0a22",
         odds={"yaygın": .0, "seçkin": .0, "nadir": .12, "çok_nadir": .40,
               "efsanevi": .30, "mitik": .18},
         reward_mix={"dog": .92, "points": .05, "item": .03},
         points_min=180000, points_max=420000,
         item_pool=["booster_prod_l", "breed_ticket", "luck_charm", "rename_token", "mutation_serum"],
         desc_tr="Oyunun en değerli kasası. %18 Mitik, %30 Efsanevi ırk şansı."),
]

BALANCE = {
    "version": 7,
    "economy": {
        "start_balance": 30000,
        "start_dogs": 2,
        "points_per_second_base": 0.55,
        "production_formula": "pps = points_per_second_base * rarity.production_mult * (0.60 + level*0.085) * (0.85 + (stamina+power)/520) * size_mod * global_events",
        "size_mod": {"toy": 0.80, "küçük": 0.90, "orta": 1.00, "büyük": 1.10, "dev": 1.20},
        "offline_cap_hours": 8,
        "offline_efficiency": 0.75,
        "offline_min_seconds": 120,
        "max_dogs": 60,
        "collection_bonus_per_dog": 0.004,
        "collection_bonus_cap": 0.35
    },
    "anti_cheat": {
        "max_forward_jump_seconds": 300,
        "clock_rollback_penalty": "earnings_zero",
        "server_verified_online": True,
        "monotonic_anchor": True,
        "note": "Yerel modda ileri saat aldatmacasi: kaydedilen son zaman damgasi ile cihaz monotonic saati birlikte kullanilir. Sunucu modunda tum kazanc hesabi sunucu saatiyle yapilir."
    },
    "levels": {
        "max_level": 150,
        "xp_curve": "xp_needed(level) = round(120 * level^1.45 * 1.055^max(0,level-100))",
        "xp_base": 120,
        "xp_exp": 1.45,
        "post100_xp_mult": 1.055,
        "level_up_cost": "round(400 * level^1.62 * rarity.price_mult * 0.55 * 1.07^max(0,level-100))",
        "cost_base": 400,
        "cost_exp": 1.62,
        "post100_cost_mult": 1.07,
        "stat_gain_per_level": 0.011
    },
    "training": {
        "base_cost": 900,
        "cost_growth_per_point": 1.35,
        "max_extra_points_per_stat": 40,
        "energy_cost": 1,
        "energy_max": 100,
        "energy_regen_seconds": 180
    },
    "breeding": {
        "base_cost": 4000,
        "cost_by_rarity_sum": {
            "2": 1.0, "3": 1.4, "4": 2.0, "5": 3.0, "6": 4.2,
            "7": 5.8, "8": 7.8, "9": 10.5, "10": 14.0, "11": 18.0, "12": 24.0
        },
        "cooldown_minutes_by_rarity": {
            "yaygın": 2, "seçkin": 4, "nadir": 8, "çok_nadir": 15,
            "efsanevi": 30, "mitik": 60
        },
        "energy_cost": 35,
        "min_level": 5,
        "min_age_stage": "yetişkin",
        "max_age_stage": "yaşlı",
        "child_iv_sigma": 0.055,
        "mutation_chance": 0.045,
        "rare_trait_chance": 0.06,
        "inbreeding_penalty_per_shared_ancestor": 0.035,
        "inbreeding_max_penalty": 0.25,
        "purity_bonus": 0.06,
        "hybrid_bonus": 0.02,
        "growth_stages": {
            "yavru": {"min_hours": 0, "stat_mult": 0.55, "production_mult": 0.30, "can_battle": False},
            "genç": {"min_hours": 4, "stat_mult": 0.78, "production_mult": 0.65, "can_battle": True},
            "yetişkin": {"min_hours": 16, "stat_mult": 1.00, "production_mult": 1.00, "can_battle": True},
            "usta": {"min_hours": 48, "stat_mult": 1.06, "production_mult": 1.15, "can_battle": True},
            "yaşlı": {"min_hours": 120, "stat_mult": 1.02, "production_mult": 1.05, "can_battle": True}
        },
        "allele_rules": {
            "mask": {"dominance": 0.80, "note": "Melanistik maske baskin"},
            "merle": {"dominance": 0.55, "note": "Yari baskin; cift merle riski tasir"},
            "double_merle_risk": 0.25,
            "double_merle_penalty": 0.12,
            "white_spotting": {"dominance": 0.25, "note": "Beyaz lekeler çekinik"},
            "brindle": {"dominance": 0.70},
            "dilute": {"dominance": 0.30, "note": "Renk açilmasi çekinik"},
            "long_fur": {"dominance": 0.35},
            "prick_ear": {"dominance": 0.65},
            "short_muzzle": {"dominance": 0.40},
            "blue_eye": {"dominance": 0.45}
        }
    },
    "battle": {
        "team_size": 4,
        "turn_order_stat": "speed",
        "hp_formula": "maxHp = round(70 + stamina*2.1 + defense*0.55 + level*9)",
        "attack_formula": "atk = round(power*1.25 + intelligence*0.25 + level*2.2)",
        "defense_formula": "def = round(defense*1.05 + stamina*0.20 + level*1.35)",
        "speed_formula": "spd = round(speed*1.0 + agility*0.45 + level*0.8)",
        "damage_formula": "dmg = atk * skill_mult * (1 - def/(def+140)) * rarity_dmg_mult * crit * rand(0.92..1.08) * status_mods",
        "rarity_dmg_mult": {"yaygın": 1.00, "seçkin": 1.05, "nadir": 1.10,
                            "çok_nadir": 1.16, "efsanevi": 1.23, "mitik": 1.32},
        "crit_chance_base": 0.06,
        "crit_chance_from_agility": 0.0009,
        "crit_mult": 1.65,
        "flee_chance_from_agility": 0.0006,
        "reward_win_points": 6500,
        "reward_loss_points": 1400,
        "reward_draw_points": 2600,
        "elo_k_win": 26,
        "elo_k_loss": 22,
        "elo_start": 1000,
        "max_turns": 24,
        "bot_scaling": "bot_rating = player_rating * (0.82 + 0.36*rand)",
        "xp_win": 90,
        "xp_loss": 25
    },
    "market": {
        "fee": 0.05,
        "min_price": 1000,
        "max_price": 50000000,
        "max_active_listings": 6,
        "listing_duration_hours": 72,
        "base_price_formula": "breed_market_base * rarity.price_mult * (1 + level*0.045) * (1 + extra_training*0.01) * trait_mult * generation_mult",
        "trait_mult": {"yok": 1.0, "nadir_ozellik": 1.35, "mutasyon": 1.75, "safkan_sampiyon": 2.2},
        "local_demo_sellers": 14
    },
    "daily": {
        "quests_per_day": 4,
        "quest_reroll_cost": 2500,
        "login_reward_cycle": 7,
        "login_rewards": [
            {"day": 1, "type": "points", "amount": 5000, "label": "5.000 puan"},
            {"day": 2, "type": "item", "item": "food_s", "amount": 2, "label": "2x Temel Mama"},
            {"day": 3, "type": "points", "amount": 15000, "label": "15.000 puan"},
            {"day": 4, "type": "item", "item": "booster_prod_m", "amount": 1, "label": "1x Üretim Artırıcı (2s)"},
            {"day": 5, "type": "points", "amount": 30000, "label": "30.000 puan"},
            {"day": 6, "type": "item", "item": "crate_key_gold", "amount": 1, "label": "1x Altın Anahtar"},
            {"day": 7, "type": "crate", "crate": "diamond", "amount": 1, "label": "1x Elmas Kutu (bedava açılış)"}
        ],
        "daily_reset_hour_local": 4
    },
    "leaderboard": {"size": 100, "metrics": ["balance", "rating", "collection", "level"]}
}

ITEMS = [
    dict(id="crate_key_silver", name_tr="Gümüş Anahtar", name_en="Silver Key",
         icon="assets/ui/icon_key_silver.svg", kind="key", crate="silver",
         desc_tr="Gümüş Kutu'yu puan harcamadan bir kez açar.", value=7000),
    dict(id="crate_key_gold", name_tr="Altın Anahtar", name_en="Gold Key",
         icon="assets/ui/icon_key_gold.svg", kind="key", crate="gold",
         desc_tr="Altın Kutu'yu puan harcamadan bir kez açar.", value=38000),
    dict(id="crate_key_diamond", name_tr="Elmas Anahtar", name_en="Diamond Key",
         icon="assets/ui/icon_key_diamond.svg", kind="key", crate="diamond",
         desc_tr="Elmas Kutu'yu puan harcamadan bir kez açar.", value=78000),
    dict(id="xp_potion_s", name_tr="Küçük Deneyim İksiri", name_en="Small XP Potion",
         icon="assets/ui/icon_potion_xp.svg", kind="consumable",
         effect=dict(type="xp", amount=600), value=2500,
         desc_tr="Seçilen köpeğe 600 XP kazandırır."),
    dict(id="xp_potion_m", name_tr="Orta Deneyim İksiri", name_en="Medium XP Potion",
         icon="assets/ui/icon_potion_xp.svg", kind="consumable",
         effect=dict(type="xp", amount=2500), value=9000,
         desc_tr="Seçilen köpeğe 2.500 XP kazandırır."),
    dict(id="xp_potion_l", name_tr="Büyük Deneyim İksiri", name_en="Large XP Potion",
         icon="assets/ui/icon_potion_xp.svg", kind="consumable",
         effect=dict(type="xp", amount=9000), value=28000,
         desc_tr="Seçilen köpeğe 9.000 XP kazandırır."),
    dict(id="food_s", name_tr="Temel Mama", name_en="Basic Food",
         icon="assets/ui/icon_food.svg", kind="consumable",
         effect=dict(type="energy", amount=40), value=1200,
         desc_tr="Köpeğin enerjisini 40 puan yeniler."),
    dict(id="food_m", name_tr="Kaliteli Mama", name_en="Premium Food",
         icon="assets/ui/icon_food.svg", kind="consumable",
         effect=dict(type="energy", amount=100), value=3000,
         desc_tr="Köpeğin enerjisini tamamen yeniler."),
    dict(id="food_l", name_tr="Şampiyon Maması", name_en="Champion Food",
         icon="assets/ui/icon_food_champion.svg", kind="consumable",
         effect=dict(type="energy", amount=100, xp=1500), value=7500,
         desc_tr="Enerjiyi yeniler ve 1.500 XP verir."),
    dict(id="booster_prod_s", name_tr="Üretim Artırıcı (1 saat)", name_en="Production Booster 1h",
         icon="assets/ui/icon_booster.svg", kind="booster",
         effect=dict(type="production_mult", amount=1.5, hours=1), value=8000,
         desc_tr="1 saat boyunca tüm köpeklerin puan üretimini %50 artırır."),
    dict(id="booster_prod_m", name_tr="Üretim Artırıcı (3 saat)", name_en="Production Booster 3h",
         icon="assets/ui/icon_booster.svg", kind="booster",
         effect=dict(type="production_mult", amount=2.0, hours=3), value=20000,
         desc_tr="3 saat boyunca tüm köpeklerin puan üretimini 2 katına çıkarır."),
    dict(id="booster_prod_l", name_tr="Üretim Artırıcı (12 saat)", name_en="Production Booster 12h",
         icon="assets/ui/icon_booster.svg", kind="booster",
         effect=dict(type="production_mult", amount=2.5, hours=12), value=55000,
         desc_tr="12 saat boyunca tüm köpeklerin puan üretimini 2,5 katına çıkarır."),
    dict(id="breed_ticket", name_tr="Çiftleştirme Bileti", name_en="Breeding Ticket",
         icon="assets/ui/icon_ticket.svg", kind="consumable",
         effect=dict(type="breed_cooldown_reset", amount=1), value=25000,
         desc_tr="Bir köpeğin çiftleştirme bekleme süresini sıfırlar."),
    dict(id="luck_charm", name_tr="Şans Tılsımı", name_en="Luck Charm",
         icon="assets/ui/icon_charm.svg", kind="consumable",
         effect=dict(type="luck", amount=1.8, uses=1), value=45000,
         desc_tr="Bir sonraki kasa açılışında yüksek nadirlik şansını 1,8 katına çıkarır."),
    dict(id="rename_token", name_tr="İsim Değişim Kartı", name_en="Rename Token",
         icon="assets/ui/icon_rename.svg", kind="consumable",
         effect=dict(type="rename", amount=1), value=6000,
         desc_tr="Bir köpeğin adını değiştirmeni sağlar."),
    dict(id="mutation_serum", name_tr="Mutasyon Serumu", name_en="Mutation Serum",
         icon="assets/ui/icon_serum.svg", kind="consumable",
         effect=dict(type="mutation", amount=1), value=150000,
         desc_tr="Bir çiftleştirmede mutasyon şansını %100'e çıkarır."),
    dict(id="battle_banner", name_tr="Savaş Sancağı", name_en="Battle Banner",
         icon="assets/ui/icon_banner.svg", kind="consumable",
         effect=dict(type="battle_buff", amount=1.15, battles=3), value=30000,
         desc_tr="3 arena savaşı boyunca takımına %15 hasar bonusu verir."),
    dict(id="energy_drink", name_tr="Enerji İçeceği", name_en="Energy Drink",
         icon="assets/ui/icon_energy.svg", kind="consumable",
         effect=dict(type="player_energy", amount=60), value=2000,
         desc_tr="Oyuncu enerjisini 60 puan yeniler (eğitim için)."),
    dict(id="kurt_disi", name_tr="Kurt Dişi", name_en="Wolf Fang",
         icon="assets/ui/icon_sword.svg", kind="material",
         desc_tr="Kurt Akını'ndan alınan ganimet; koleksiyoncular yüksek ücret öder.", value=25000),
    dict(id="sans_tilismi", name_tr="Şans Tılsımı", name_en="Lucky Charm Token",
         icon="assets/ui/icon_charm.svg", kind="collectible",
         desc_tr="Koleksiyoncuların gözdesi nadir bir tılsım.", value=60000),
    dict(id="altin_tasma", name_tr="Altın Tasma", name_en="Golden Collar",
         icon="assets/ui/icon_key_gold.svg", kind="collectible",
         desc_tr="Efsanevi bir koleksiyon parçası; mağazada ve 10 davet ödülünde bulunur.", value=150000),
    dict(id="deri_tasma", name_tr="Deri Tasma", name_en="Leather Collar",
         icon="assets/ui/icon_charm.svg", kind="equipment",
         desc_tr="Sağlam deri tasma. Kuşanılan köpeğin gücünü %3 artırır.", value=200000,
         equip={"slot": "collar"}, buffs={"power": 0.03}),
    dict(id="boyunluk", name_tr="Boyunluk", name_en="Neck Guard",
         icon="assets/ui/icon_shield.svg", kind="equipment",
         desc_tr="Boyun koruyucu. Kuşanılan köpeğin savunmasını %4 artırır.", value=300000,
         equip={"slot": "guard"}, buffs={"defense": 0.04}),
    dict(id="vitamin", name_tr="Vitamin İlacı", name_en="Vitamin Tonic",
         icon="assets/ui/icon_serum.svg", kind="equipment",
         desc_tr="Düzenli vitamin kürü. Kuşanılan köpek %10 daha fazla XP kazanır.", value=150000,
         equip={"slot": "med"}, buffs={"xp": 0.10}),
    dict(id="civili_tasma", name_tr="Çivili Tasma", name_en="Spiked Collar",
         icon="assets/ui/icon_sword.svg", kind="equipment",
         desc_tr="Efsanevi çivili tasma! Gücü %10 artırır. Yalnızca Telegram Stars ile alınır.",
         value=1500000, equip={"slot": "collar"}, buffs={"power": 0.10},
         stars_only=True, stars_price=150),
    dict(id="civili_boyunluk", name_tr="Çivili Boyunluk", name_en="Spiked Neck Guard",
         icon="assets/ui/icon_shield.svg", kind="equipment",
         desc_tr="Çivili boyun koruma. Savunmayı %12 artırır. Yalnızca Telegram Stars ile alınır.",
         value=2000000, equip={"slot": "guard"}, buffs={"defense": 0.12},
         stars_only=True, stars_price=200),
    dict(id="efsane_iksir", name_tr="Efsane İksir", name_en="Legendary Elixir",
         icon="assets/ui/icon_potion_xp.svg", kind="equipment",
         desc_tr="Efsanevi iksir! XP kazancını %30 artırır. Yalnızca Telegram Stars ile alınır.",
         value=1200000, equip={"slot": "med"}, buffs={"xp": 0.30},
         stars_only=True, stars_price=120),
]

QUEST_POOL = [
    dict(id="q_collect", type="collect_income", count=1, points=4500, xp=40,
         text_tr="Ürettiğin puanları topla", text_en="Collect your produced points"),
    dict(id="q_crate1", type="open_crate", count=1, points=8000, xp=70,
         text_tr="1 kasa aç", text_en="Open 1 crate"),
    dict(id="q_crate3", type="open_crate", count=3, points=18000, xp=140,
         text_tr="3 kasa aç", text_en="Open 3 crates"),
    dict(id="q_battle1", type="battle_play", count=1, points=6000, xp=60,
         text_tr="1 arena savaşı yap", text_en="Play 1 arena battle"),
    dict(id="q_battlewin", type="battle_win", count=1, points=9000, xp=90,
         text_tr="1 arena savaşı kazan", text_en="Win 1 arena battle"),
    dict(id="q_battlewin3", type="battle_win", count=3, points=22000, xp=200,
         text_tr="3 arena savaşı kazan", text_en="Win 3 arena battles"),
    dict(id="q_breed", type="breed", count=1, points=14000, xp=130,
         text_tr="1 yavru üret", text_en="Breed 1 puppy"),
    dict(id="q_upgrade", type="upgrade_dog", count=2, points=7000, xp=65,
         text_tr="2 köpek seviyesi yükselt", text_en="Upgrade 2 dogs"),
    dict(id="q_train", type="train_dog", count=3, points=6500, xp=55,
         text_tr="3 eğitim uygula", text_en="Train 3 times"),
    dict(id="q_market_list", type="market_list", count=1, points=7500, xp=60,
         text_tr="Pazara 1 ilan ver", text_en="List 1 dog on the market"),
    dict(id="q_market_buy", type="market_buy", count=1, points=9500, xp=80,
         text_tr="Pazardan 1 köpek satın al", text_en="Buy 1 dog from the market"),
    dict(id="q_earn", type="earn_points", count=50000, points=11000, xp=95,
         text_tr="50.000 puan kazan", text_en="Earn 50,000 points"),
    dict(id="q_feed", type="use_item", count=2, points=5000, xp=45,
         text_tr="2 eşya kullan", text_en="Use 2 items"),
    dict(id="q_friend", type="add_friend", count=1, points=6000, xp=50,
         text_tr="1 arkadaş ekle", text_en="Add 1 friend"),
    dict(id="q_rare", type="obtain_rarity", rarity="nadir", count=1, points=16000, xp=150,
         text_tr="Nadir veya üstü bir köpek elde et", text_en="Obtain a Rare+ dog"),
    dict(id="q_epic", type="obtain_rarity", rarity="çok_nadir", count=1, points=30000, xp=260,
         text_tr="Çok Nadir veya üstü bir köpek elde et", text_en="Obtain an Epic+ dog"),
]

ACHIEVEMENTS = [
    dict(id="a_first_dog", name_tr="İlk Dost", desc_tr="İlk köpeğini edin", icon="🐾",
         metric="dogs_owned", target=1, reward_points=3000, reward_xp=30),
    dict(id="a_collector10", name_tr="Koleksiyoner", desc_tr="10 farklı köpeğe sahip ol", icon="🎖️",
         metric="dogs_owned", target=10, reward_points=25000, reward_xp=200),
    dict(id="a_collector25", name_tr="Usta Yetiştirici", desc_tr="25 farklı köpeğe sahip ol", icon="🏅",
         metric="dogs_owned", target=25, reward_points=90000, reward_xp=600),
    dict(id="a_collector50", name_tr="Efsane Kennel", desc_tr="50 farklı köpeğe sahip ol", icon="👑",
         metric="dogs_owned", target=50, reward_points=350000, reward_xp=1800),
    dict(id="a_catalog50", name_tr="Irk Bilimci", desc_tr="50 farklı ırk keşfet", icon="📖",
         metric="breeds_discovered", target=50, reward_points=150000, reward_xp=900),
    dict(id="a_catalog100", name_tr="Tam Katalog", desc_tr="100 ırkın tamamını keşfet", icon="🌟",
         metric="breeds_discovered", target=100, reward_points=2000000, reward_xp=8000),
    dict(id="a_crate10", name_tr="Kutucu", desc_tr="10 kasa aç", icon="📦",
         metric="crates_opened", target=10, reward_points=15000, reward_xp=120),
    dict(id="a_crate100", name_tr="Kasa Ustası", desc_tr="100 kasa aç", icon="🎁",
         metric="crates_opened", target=100, reward_points=200000, reward_xp=1200),
    dict(id="a_legend1", name_tr="Efsane Avcısı", desc_tr="Efsanevi bir köpek elde et", icon="⚡",
         metric="legendary_obtained", target=1, reward_points=50000, reward_xp=400),
    dict(id="a_mythic1", name_tr="Mitoloji", desc_tr="Mitik bir köpek elde et", icon="🔥",
         metric="mythic_obtained", target=1, reward_points=250000, reward_xp=1500),
    dict(id="a_breed10", name_tr="Genetikçi", desc_tr="10 yavru üret", icon="🧬",
         metric="puppies_bred", target=10, reward_points=60000, reward_xp=450),
    dict(id="a_breed50", name_tr="Soy Ağacı", desc_tr="50 yavru üret", icon="🌳",
         metric="puppies_bred", target=50, reward_points=400000, reward_xp=2500),
    dict(id="a_win10", name_tr="Arena Çaylağı", desc_tr="10 arena savaşı kazan", icon="⚔️",
         metric="battles_won", target=10, reward_points=30000, reward_xp=250),
    dict(id="a_win50", name_tr="Arena Şampiyonu", desc_tr="50 arena savaşı kazan", icon="🛡️",
         metric="battles_won", target=50, reward_points=250000, reward_xp=1600),
    dict(id="a_win200", name_tr="Arena Efsanesi", desc_tr="200 arena savaşı kazan", icon="🏆",
         metric="battles_won", target=200, reward_points=1500000, reward_xp=7000),
    dict(id="a_rating1500", name_tr="Dereceli", desc_tr="1500 arena puanına ulaş", icon="📈",
         metric="rating", target=1500, reward_points=120000, reward_xp=800),
    dict(id="a_rating2000", name_tr="Elit Lig", desc_tr="2000 arena puanına ulaş", icon="💠",
         metric="rating", target=2000, reward_points=500000, reward_xp=3000),
    dict(id="a_earn1m", name_tr="Milyoner", desc_tr="Toplam 1.000.000 puan kazan", icon="💰",
         metric="points_earned", target=1000000, reward_points=80000, reward_xp=600),
    dict(id="a_earn100m", name_tr="Puankolik", desc_tr="Toplam 100.000.000 puan kazan", icon="💎",
         metric="points_earned", target=100000000, reward_points=5000000, reward_xp=20000),
    dict(id="a_market5", name_tr="Tüccar", desc_tr="Pazarda 5 satış yap", icon="🪙",
         metric="market_sales", target=5, reward_points=45000, reward_xp=350),
    dict(id="a_market25", name_tr="Pazar Baronu", desc_tr="Pazarda 25 satış yap", icon="🏦",
         metric="market_sales", target=25, reward_points=400000, reward_xp=2500),
    dict(id="a_friend5", name_tr="Sosyal", desc_tr="5 arkadaş edin", icon="🤝",
         metric="friends", target=5, reward_points=20000, reward_xp=150),
    dict(id="a_streak7", name_tr="Sadık Oyuncu", desc_tr="7 gün üst üste giriş yap", icon="📅",
         metric="login_streak", target=7, reward_points=60000, reward_xp=500),
    dict(id="a_level50", name_tr="Zirve", desc_tr="Bir köpeği 50. seviyeye çıkar", icon="🚀",
         metric="max_dog_level", target=50, reward_points=750000, reward_xp=4000),
]

EVENTS = [
    dict(id="ev_golden_weekend", name_tr="Altın Hafta Sonu", name_en="Golden Weekend",
         window="weekend", effect=dict(production_mult=2.0, market_fee=0.02),
         desc_tr="Cumartesi-Pazar tüm üretim 2 katına çıkar, pazar komisyonu %2'ye düşer."),
    dict(id="ev_arena_festival", name_tr="Arena Festivali", name_en="Arena Festival",
         window="weekly", week_mod=0, effect=dict(battle_reward_mult=1.75, elo_k_mult=1.3),
         desc_tr="Her 4 haftada bir: arena ödülleri %75 artar, rating değişimi hızlanır."),
    dict(id="ev_breeding_season", name_tr="Çiftleşme Sezonu", name_en="Breeding Season",
         window="weekly", week_mod=1, effect=dict(breed_cost_mult=0.6, breed_cooldown_mult=0.5,
                                                 mutation_chance_bonus=0.03),
         desc_tr="Her 4 haftada bir: çiftleştirme maliyeti %40, süreler %50 azalır, mutasyon şansı artar."),
    dict(id="ev_crate_carnival", name_tr="Kasa Karnavalı", name_en="Crate Carnival",
         window="weekly", week_mod=2, effect=dict(crate_price_mult=0.75, luck_mult=1.5),
         desc_tr="Her 4 haftada bir: kasalar %25 indirimli, şans 1,5 kat."),
    dict(id="ev_night_hunt", name_tr="Gece Avı", name_en="Night Hunt",
         window="daily_night", effect=dict(offline_efficiency_bonus=0.25, production_mult=1.3),
         desc_tr="Her gece 22:00-06:00 arası üretim %30 artar, çevrimdışı verimlilik %25 yükselir."),
]


# ---------------------------------------------------------------------------
# Nadirlik denge tablosu (tasarim karari).
# Tablodaki 'rar' alanlari ilk taslak degerlerdir; oyun ekonomisi ve kasa
# havuzlarinin saglikli calismasi icin final dagilim burada sabitlenir:
#   yaygin 30 | sec kin 24 | nadir 20 | cok_nadir 13 | efsanevi 10 | mitik 3
# Nadirlik, irkin taban stat toplamini da belirledigi icin bu tablo
# normalize_stats() ile birlikte kullanilir.
# ---------------------------------------------------------------------------
RARITY_BY_N = {
    # --- MITIK (3) ---
    1: "mitik", 43: "mitik", 80: "mitik",
    # --- EFSANEVI (10) ---
    2: "efsanevi", 10: "efsanevi", 12: "efsanevi", 16: "efsanevi", 27: "efsanevi",
    28: "efsanevi", 29: "efsanevi", 63: "efsanevi", 78: "efsanevi", 81: "efsanevi",
    # --- COK NADIR (13) ---
    3: "çok_nadir", 4: "çok_nadir", 5: "çok_nadir", 6: "çok_nadir", 14: "çok_nadir",
    17: "çok_nadir", 20: "çok_nadir", 50: "çok_nadir", 58: "çok_nadir",
    59: "çok_nadir", 60: "çok_nadir", 61: "çok_nadir", 62: "çok_nadir",
    # --- NADIR (20) ---
    9: "nadir", 13: "nadir", 42: "nadir", 44: "nadir", 45: "nadir", 56: "nadir",
    57: "nadir", 64: "nadir", 66: "nadir", 67: "nadir", 68: "nadir", 69: "nadir",
    74: "nadir", 75: "nadir", 76: "nadir", 82: "nadir", 85: "nadir", 93: "nadir",
    98: "nadir", 100: "nadir",
    # --- SECKIN (24) ---
    7: "seçkin", 18: "seçkin", 21: "seçkin", 22: "seçkin", 23: "seçkin",
    31: "seçkin", 32: "seçkin", 33: "seçkin", 34: "seçkin", 37: "seçkin",
    41: "seçkin", 48: "seçkin", 52: "seçkin", 54: "seçkin", 71: "seçkin",
    77: "seçkin", 79: "seçkin", 83: "seçkin", 84: "seçkin", 88: "seçkin",
    89: "seçkin", 91: "seçkin", 94: "seçkin", 96: "seçkin",
    # --- YAYGIN (30) ---
    8: "yaygın", 11: "yaygın", 15: "yaygın", 19: "yaygın", 24: "yaygın",
    25: "yaygın", 26: "yaygın", 30: "yaygın", 35: "yaygın", 36: "yaygın",
    38: "yaygın", 39: "yaygın", 40: "yaygın", 46: "yaygın", 47: "yaygın",
    49: "yaygın", 51: "yaygın", 53: "yaygın", 55: "yaygın", 65: "yaygın",
    70: "yaygın", 72: "yaygın", 73: "yaygın", 86: "yaygın", 87: "yaygın",
    90: "yaygın", 92: "yaygın", 95: "yaygın", 97: "yaygın", 99: "yaygın",
}
EXPECTED_DIST = {"yaygın": 30, "seçkin": 24, "nadir": 20, "çok_nadir": 13,
                 "efsanevi": 10, "mitik": 3}


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def normalize_stats(vec, target_sum, lo=20, hi=100):
    """Karakter vektorunu nadirlik bandina olcekler; toplam ~= target_sum (sinirlar icinde)."""
    n = len(vec)
    target_sum = clamp(target_sum, lo * n, hi * n)
    s = float(sum(vec)) or 1.0
    # 1) en buyuk kalinti yontemi ile hedef toplami sinirlara uyan tam sayilara dagit
    raw = [v * target_sum / s for v in vec]
    out = [int(clamp(math.floor(r), lo, hi)) for r in raw]
    order = sorted(range(n), key=lambda i: (out[i] >= hi, -(raw[i] - math.floor(raw[i]))))
    guard = 0
    while sum(out) < target_sum and guard < 10000:
        guard += 1
        moved = False
        for i in order:
            if out[i] < hi:
                out[i] += 1
                moved = True
                if sum(out) >= target_sum:
                    break
        if not moved:
            break
    order2 = sorted(range(n), key=lambda i: (out[i] <= lo, (raw[i] - math.floor(raw[i]))))
    guard = 0
    while sum(out) > target_sum and guard < 10000:
        guard += 1
        moved = False
        for i in order2:
            if out[i] > lo:
                out[i] -= 1
                moved = True
                if sum(out) <= target_sum:
                    break
        if not moved:
            break
    return out


def dog_key(n):
    return "dog_%03d" % n


def main():
    os.makedirs(DATA, exist_ok=True)
    assert len(ALL) == 100, "100 irk bekleniyordu, bulunan: %d" % len(ALL)
    ids = [b["n"] for b in ALL]
    assert ids == list(range(1, 101)), "Irk numaralari 1..100 sirali ve benzersiz olmali"
    names = [b["tr"] for b in ALL]
    dup = [k for k, v in Counter(names).items() if v > 1]
    assert not dup, "Tekrar eden irk adi: %s" % dup

    breeds = []
    lookups = {}
    assert sorted(RARITY_BY_N) == ids, "RARITY_BY_N 1..100 icin eksiksiz olmali"
    for b in ALL:
        n = b["n"]
        b["rar"] = RARITY_BY_N[n]          # final denge tablosu uygulanir
        rar = RARITIES[b["rar"]]
        sv = normalize_stats(b["st"], rar["stat_sum"])
        assert sum(sv) == rar["stat_sum"], (b["tr"], sum(sv), rar["stat_sum"])
        stats = dict(zip(STAT_KEYS, sv))
        k = dog_key(n)
        # uretim / pazar fiyati taban degerleri (irka sabitlenir, seviye ile buyur)
        size_mod = BALANCE["economy"]["size_mod"].get(b["size"], 1.0)
        pps_lvl1 = round(BALANCE["economy"]["points_per_second_base"] * rar["production_mult"]
                         * (0.60 + 0.085) * (0.85 + (stats["stamina"] + stats["power"]) / 520.0)
                         * size_mod, 4)
        market_base = int(round((2200 + sum(stats.values()) * 26) * (0.85 + size_mod * 0.25)))
        ability = dict(zip(["name_tr", "type", "mult", "value", "cooldown", "desc_tr"], b["ab"]))
        ability["name_en"] = ability["name_tr"]
        entry = {
            "id": n,
            "key": k,
            "name_tr": b["tr"],
            "name_en": b["en"],
            "group": b["grp"],
            "origin": b["org"],
            "rarity": b["rar"],
            "rarity_order": rar["order"],
            "size": b["size"],
            "image": "assets/dogs/%s.webp" % k,
            "image_svg": "assets/dogs/%s.svg" % k,
            "stats": stats,
            "baseStats": stats,
            "statLabels": STAT_TR,
            "productionPerSecondLevel1": pps_lvl1,
            "marketBasePrice": market_base,
            "maxLevel": BALANCE["levels"]["max_level"],
            "description_tr": b["desc"],
            "description_en": b["desc"],
            "ability": ability,
        }
        breeds.append(entry)
        look = {kk: vv for kk, vv in b.items()
                if kk not in ("n", "tr", "en", "grp", "org", "rar", "size", "st", "desc", "ab")}
        look["id"] = n
        look["key"] = k
        look["rarity"] = b["rar"]
        look["size"] = b["size"]
        look["accent"] = rar["color"]
        lookups[k] = look

    # ---- data dosyalari ----
    def dump(name, obj):
        p = os.path.join(DATA, name)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
        print("  yazildi: data/%s (%d bayt)" % (name, os.path.getsize(p)))

    dump("breeds.json", {"version": BALANCE["version"], "count": len(breeds),
                         "statKeys": STAT_KEYS, "statLabels": STAT_TR, "breeds": breeds})
    dump("rarities.json", {"order": list(RARITIES.keys()), "rarities": RARITIES})
    dump("crates.json", {"crates": CRATES})
    dump("balance.json", BALANCE)
    dump("items.json", {"items": ITEMS})
    dump("quests.json", {"pool": QUEST_POOL})
    dump("achievements.json", {"achievements": ACHIEVEMENTS})
    dump("events.json", {"events": EVENTS})
    dump("_lookups.json", lookups)

    dist = Counter(b["rarity"] for b in breeds)
    assert dict(dist) == EXPECTED_DIST, "Nadirlik dagilimi beklenenden farkli: %s" % dict(dist)
    print("\nIrk sayisi: %d" % len(breeds))
    print("Nadirlik dagilimi: %s" % ", ".join("%s=%d" % (k, v) for k, v in sorted(
        dist.items(), key=lambda x: RARITIES[x[0]]["order"])))
    groups = Counter(b["group"].split(" / ")[0] for b in breeds)
    print("Grup dagilimi: %s" % ", ".join("%s=%d" % (k, v) for k, v in groups.most_common()))
    print("Stat toplami ornek: %s -> %d" % (breeds[0]["name_tr"], sum(breeds[0]["stats"].values())))
    print("OK: tum veri dosyalari uretildi.")


if __name__ == "__main__":
    main()
