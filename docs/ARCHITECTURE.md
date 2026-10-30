# ARCHITECTURE.md — PAW LEGENDS: DOG WORLD mimarisi

Bu belge, kodun nasıl organize edildiğini, veri akışını, kritik formülleri ve
test stratejisini açıklar. Hedef: projeyi devralan birinin **hiçbir şeyi tahmin etmeden**
devam edebilmesi.

---

## 1. Katmanlar

```
                ┌──────────────────────────────────────────────────────────┐
                │  index.html  (tek giriş noktası, klasik <script> sırası) │
                └──────────────────────────────────────────────────────────┘
                        │ 0) depolama koruması + service worker kaydı
                        ▼
   data_bundle.js ──► engine.js ──► ui.js ──► screens_core.js / screens_play.js ──► net.js ──► app.js
        │                 │            │                  │                            │          │
     PL.DB            PL.engine      PL.ui          18 ekran (render)              PL.net     PL.game
   (veri, salt)      (saf mantık)  (DOM/ses/router)  kullanıcı olayları          (sunucu)   (durum+döngü)
```

| Katman | Dosya | Sorumluluk | Kural |
|---|---|---|---|
| Veri | `src/js/core/data_bundle.js` | `PL.DB`: 100 ırk, 6 nadirlik, 5 kasa, denge, 18 eşya, 16 görev tipi, 24 başarım, 5 etkinlik, 100 görünüm kaydı | **Otomatik üretilir**, elle düzenlenmez. Kaynak: `data/*.json` |
| Mantık | `src/js/core/engine.js` | Tüm oyun kuralları: statlar, üretim, genetik, kasa, savaş, ekonomi, pazar, görev, başarım, kayıt | **DOM'a dokunmaz**, `localStorage`'a dokunmaz (yalnızca `E.save.store/load` arayüzü), saf fonksiyonlar + seed'li RNG |
| Görünüm | `src/js/ui/ui.js` | `$/$$/el/clear/esc`, ses yöneticisi, router (`show/back/replace`), üst bar/nav, `toast/modal/confirm`, bileşenler (`dogCard/rarityBadge/statRow/progress/empty/screenShell/countUp`) | Durumu değiştirmez, yalnızca çizer + olayı `PL.game`'e iletir |
| Ekranlar | `scenes/screens_core.js`, `scenes/screens_play.js` | 18 ekranın `render(params)` fonksiyonu | `U.registerScreen(ad, {render, music, onShow})` ile kaydolur |
| Ağ | `src/js/net.js` | XHR istemcisi: `connect/syncProfile/leaderboard/listings/list/buy/addFriend/acceptFriend/verifyEarnings` | Sunucu yoksa sessizce başarısız olur, oyun yerel modda sürer |
| Kontrolcü | `src/js/app.js` | `PL.game`: durum, `boot/tick`, çevrimdışı kazanç, aksiyonlar (`A.*`), chrome/navigasyon, bot simülasyonu, otomatik kayıt | Tek yazma noktası: durumu yalnızca bu katman değiştirir |
| Sunucu | `server/index.js` | Node `http` ile sıfır bağımlılıklı API | Atomik pazar işlemi, HMAC oturum, kazanç doğrulama |

**Neden ES module yok?** Oyun `file://` üzerinden de (APK içinde `android_asset`, çift tıklamayla
açılan HTML) çalışmak zorunda. ES module'ler `file://` altında CORS'a takılır. Bu yüzden klasik
`<script>` sırası + `window.PL` global adı alanı kullanılır ve JSON verisi `fetch` yerine
`data_bundle.js` içine gömülür.

---

## 2. Durum (state) şekli

`E.save.defaultState(name)` → `PL.game.state`:

```
v: 7
profile      {id, code "PAW-XXXXXX", name, avatarBreed, title, createdAt, lastSeenAt}
balance      puan            lifetimePoints  toplam kazanılan
dogs[]       köpek (aşağıda)   inventory {esyaId: adet}   boosters[] {type, mult, endsAt}
luck         {mult, uses}     battleBanner {mult, battlesLeft}
arena        {rating, wins, losses, draws, tier, history[40]}
market       {listings[], history[], botSeed, botListings[14], botDay}
friends      {list[], incoming[], outgoing[]}      // her kayıt {code,name,rating,dogs,breeds,title,online}
quests       {date "YYYY-MM-DD", list[4]} | null
achievements {unlocked: {basarimId: ts}}
login        {streak, lastClaimKey}
stats        {cratesOpened, puppiesBred, battlesWon/Lost/Draw, marketSales/Buys, pointsEarned,
              itemsUsed, upgrades, trainings, friendsAdded, breedsDiscovered[], maxDogLevel,
              legendaryObtained, mythicObtained, offlineClaims}
settings     {music, sfx, quality, lang, notifications, reduceMotion}
time         {lastSeenAt, lastCollectAt, createdAt, monoBase, clockBase}
notifications[60]  log[200]  online {mode, server, user, token}  tutorialDone
```

### Köpek kaydı
```
uid, breedId, name, sex "m"/"f", rarity, level, xp,
ivs{6 stat: 0.82–1.18}, trained{6 stat: 0–40}, traits[], mutation{id,name,stat,mult,allMult}|null,
bornAt, energy(0–100), breedCooldownUntil, inMarket, locked,
lineage{mother, father, generation, ancestors[≤40]}, purebred,
genes{9 lokus: [alel, alel]}, look{...fenotip}, createdAt
```

**Kayıt:** anahtar `paw_legends_save_v7`; `E.save.export(state)` → base64 metin,
`E.save.import(str)` → state ya da `null`; `E.save.migrate(old)` eski kaydı v7'ye tamamlar.
`index.html` içindeki koruma katmanı `localStorage` kullanılamıyorsa bellek içi yedeğe geçer.

---

## 3. Kritik formüller (tek gerçek kaynak: `data/balance.json`)

```
dogStats[k]    = round( ırk.stats[k] × IV[k] × (1+(seviye-1)×0.011) × evre.stat_mult + trained[k]  (× mutasyon.mult) )
battleStats    HP  = round(70 + dayanıklılık×2.1 + savunma×0.55 + seviye×9)
               ATK = round(güç×1.25 + zekâ×0.25 + seviye×2.2)
               DEF = round(savunma×1.05 + dayanıklılık×0.20 + seviye×1.35)
               SPD = round(hız + çeviklik×0.45 + seviye×0.8)
hasar          = ATK × yetenekÇarp × (1 − DEF/(DEF+140)) × nadirlikHasarÇarp × rand(0.92..1.08) × (kritik ? 1.65 : 1)
               → min 1; kalkan varsa emilir (log'da dmg=0, absorbed>0 görünebilir)
kritik şansı   = 0.06 + agility×0.0009 (+ yetenek bonusu)
üretim/sn      = ırk.pps × seviyeFaktörü(seviye) × evre.production_mult × globalÇarpan × özellik.prod
seviyeFaktörü  = (0.60 + seviye×0.085) / 0.685
globalÇarpan   = Π(hızlandırıcı.mult) × Π(etkinlik.production_mult) × koleksiyonÇarpanı
koleksiyon     = 1 + min(0.35, keşfedilenIrk × 0.004)
pazarDeğeri    = round( ırk.marketBasePrice × nadirlik.price_mult × (1+seviye×0.045)
                        × (1+toplamEğitim×0.01) × özellikÇarp(1 / 1.35 / 1.75 / 2.2) × nesilÇarp(≤1.5) )
çevrimdışı     = min(süre, 8 saat) × üretim/sn × 0.75 (+etkinlik bonusu) × özellik.offline
XP eğrisi      = round(120 × seviye^1.45)         maks seviye 50
seviye maliyeti= round(400 × seviye^1.62 × nadirlik.price_mult × 0.55)
eğitim maliyeti= round(900 × 1.35^floor(puan/4))   stat başına +40 tavan
üretim maliyeti= 4000 × rarityToplamÇarpanı (2→1 … 12→24)   enerji 35, bekleme 2/4/8/15/30/60 dk
komisyon       = %5 (Altın Hafta Sonu'nda %2)
```

### Genetik
```
crossAlleles(anne[i], baba[i]) → [anne'den rastgele 1 alel, baba'dan rastgele 1 alel]
yavru IV[k]  = (anneIV+babaIV)/2 + gauss(σ=0.055)
             × (1 − akrabalıkCezası) × (safkan ? 1.03 : 1.02)   → [0.80, 1.22] kırp
akrabalık    = min(0.25, ortakAta × 0.035)      ortakAta = lineage.ancestors kesişimi
çift merle   = her iki ebeveynden merle aleli → IV × (1 − 0.12), taban 0.75
mutasyon     = %4.5 (+ etkinlik + serum)         nadir özellik = %6 (+ ebeveyn özelliği başına %2)
```

---

## 4. Determinizm ve hile koruması

- **RNG:** `E.rng.from(seed)` → mulberry32. Seed verilirse her şey (kasa, savaş, bot takımı,
  günlük görevler) **birebir tekrarlanabilir**. Testler bunu kanıtlar (`run_tests 06a`, `smoke_ui 10b`).
- **Savaş:** aynı takımlar + aynı seed → aynı log, aynı kazanan, aynı tur sayısı.
  Bot kimlikleri de seed'den türetilir (zaman damgası değil).
- **Saat hilesi:** iki çapa birlikte tutulur —
  `time.lastSeenAt` (duvar saati) ve `time.monoBase/clockBase` (cihazın monotonic saati).
  - Duvar saati geri alınmışsa → kazanç **0**, `tampered: true`.
  - Duvar saati ileri alınıp monotonic delta küçükse → süre `mono + 300 sn`'ye kırpılır.
  - Çevrim içi modda ayrıca `POST /api/verify/earnings` sunucu saatiyle karşılaştırır.
- **Çift harcama:** yerel modda satılan ilan `sold=true` olur ve ikinci alım reddedilir;
  sunucu modunda `server/index.js` içinde basit bir kilit + yeniden kontrol (`409 Conflict`) vardır.

---

## 5. Oyun döngüsü (`app.js → G.tick`, 1 sn)

1. Enerji rejenerasyonu (180 sn'de +1, 100 tavan)
2. `G.simulateBotPurchases(1)` — ilanların botlara satılma olasılığı
3. Süresi dolan hızlandırıcıları temizle
4. `G.ensureDailyQuests()` — gün değiştiyse görevleri yenile
5. Her 15 tik'te bir otomatik kayıt
6. `U.updateTopBar()` — bakiye, üretim/dk, bildirim sayacı

Ayrıca: `visibilitychange` ve `beforeunload` → anında kayıt; açılışta `G.checkOfflineEarnings()`.

---

## 6. Yönlendirme (router)

`U.show(ad, params, {noHistory})` → geçiş animasyonu → `def.render(params)` → `#screenHost` içine
ekle → `onShow` → üst bar/nav güncelle → ekran müziği (`def.music`, yoksa `music_farm`).
Geçmiş 24 adım tutulur; `U.back()` önceki ekrana döner. Ekran bazlı arka plan görselleri
`SCREEN_BG` haritasından gelir (arena/market/breed/crates/collection).

**Kayıtlı 18 ekran:** `login, hub, collection, dogDetail, crates, breed, arena, market, friends,
quests, achievements, events, leaderboard, inventory, profile, settings, notifications, help`.

---

## 7. Android kabuğu

`android/app/src/.../MainActivity.java` — tek Activity, tam ekran WebView:
- `setJavaScriptEnabled`, `setDomStorageEnabled` (kayıt), `setAllowFileAccess`
- `setAllowUniversalAccessFromFileURLs(true)` → `file:///android_asset/` altında XHR ile ses yükleme
- `setMediaPlaybackRequiresUserGesture(false)` → müzik/SFX dokunma beklemeden çalar
- Geri tuşu → `PL.ui.back()` (hub/login'de çıkış onayı), `onPause` → `PL.game.save()`
- `JavascriptInterface` ("AndroidBridge") → platform bilgisi + native toast

Derleme zinciri (`android/build_apk.sh`, Gradle yok):
```
android/www (oyun kopyası) → aapt2 compile/link (-A assets, R.java) → javac (source/target 8)
→ d8 (--min-api 21) → zipalign -p 4 → apksigner (v1+v2+v3) → PAW_LEGENDS.apk
```

---

## 8. Test stratejisi

| Paket | Dosya | Ne yapar | Çıktı |
|---|---|---|---|
| Motor | `tests/run_tests.js` | 80 test: veri bütünlüğü, olasılık dağılımları, formüllerin elle hesapla karşılaştırılması, genetik, savaş determinizmi/denge, ekonomi+hile koruması, pazar, görev/başarım/etkinlik, kayıt, dosya sözleşmeleri | `tests/RESULTS.md` |
| Arayüz | `tests/smoke_ui.js` | Kendi mini DOM taklidiyle **gerçek oyun kodunu** çalıştırır: 18 ekranı render eder, modal butonlarına gerçekten tıklar, aksiyonları çağırır, konsol hatası/yakalanmayan istisna olmadığını doğrular, statik sözleşme taraması yapar | `tests/SMOKE_RESULTS.md` |
| Varlık | `tests/check_assets.py` | 947 kontrol: 100 WebP'nin açılması/720×720/benzersiz MD5, kasa-arka plan-ikon-ses dosyaları, kodda kullanılan her ses/ikon/arka planın varlığı, `index.html` referansları, bundle↔data eşitliği | `tests/ASSET_REPORT.md` |

Üçü de **sıfır bağımlılıkla** çalışır (`node` ve `python3` yeter); CI'da
`.github/workflows/build-apk.yml` hem testleri hem APK derlemesini yapar.

---

## 9. Bilinen sınırlar / bilinçli tercihler

- **Gerçek zamanlı PvP eşleştirme yok.** Arena rakipleri yerel botlardır ve arayüzde
  "Bot Takımı (rating)" olarak etiketlenir. Sunucu modu yalnızca pazar/arkadaş/liderlik/
  kazanç doğrulamasını taşır. Bunu eklemek için `server/index.js` içine bir kuyruk +
  WebSocket katmanı gerekir (mevcut tasarımda bilinçli olarak dışarıda bırakıldı).
- **Görseller fotoğraf değil**, ırka özgü parametrelerle üretilen vektör illüstrasyonlardır.
- Animasyonlar CSS+JS'tir; `assets/animations/` klasöründe hazır video/GIF yerine envanter dosyası vardır.
- `E.traits`/`E.mutations` motor içinde tanımlıdır (veri dosyasında değil); yeni özellik eklerken
  `engine.js` + ilgili formül çarpanlarını birlikte güncelle.
