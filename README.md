# 🐾 PAW LEGENDS: DOG WORLD

**Gerçek kodla çalışan** köpek koleksiyonu / üretimi / yetiştirme / 4v4 arena / oyuncular arası pazar
strateji oyunu. Tamamı Türkçe arayüz, Android öncelikli (mobil) tasarım, masaüstü tarayıcı desteği.

Bu klasör bir maket (mockup) değildir: 100 ırk, genetik motoru, savaş motoru, ekonomi, pazar,
arkadaş sistemi, görev/başarım/etkinlik sistemi, kayıt sistemi, 24 ses dosyası, **derlenmiş ve
imzalanmış bir APK** ve **çalışan otomatik test paketi** içerir.

---

## 1. Hızlı başlangıç (3 yol)

### A) Android telefonda — APK (en hızlısı)
```
android/PAW_LEGENDS.apk      ← derlenmiş, imzalanmış, kurulabilir (7.15 MB)
```
1. Bu dosyayı telefona kopyala (USB, e-posta veya bulut).
2. Dosyaya dokun → "Bilinmeyen kaynaklara izin ver" → **Yükle**.
3. Uygulamayı aç: **PAW LEGENDS**. İnternet gerekmez, tamamen çevrimdışı oynanır.

> APK hakkında dürüst not: bu ortamda derlendi, `apksigner verify` ile imzası ve
> `aapt2 dump badging` ile paket kimliği doğrulandı; **fiziksel cihaz/emülatörde çalıştırma
> testi yapılamadı** (bu sandbox'ta `/dev/kvm` ve Android emülatörü yok). Ayrıntı: `android/README_APK.md`.

### B) Masaüstü/telefon tarayıcısında — doğrudan aç
`index.html` dosyasına çift tıkla. Oyun `file://` üzerinden de çalışır
(ES module yok, tüm veri `src/js/core/data_bundle.js` içine gömülü).

### C) Yerel sunucu ile (PWA olarak kurmak için önerilen)
```bash
cd PAW_LEGENDS_COMPLETE
python3 -m http.server 8080 --bind 0.0.0.0
# tarayıcıda: http://localhost:8080
```
Bu modda `sw.js` devreye girer → oyun önbelleğe alınır, **çevrimdışı çalışır** ve
Android'de Chrome menüsünden **"Ana ekrana ekle"** ile uygulama gibi kurulur.

---

## 2. Ne var, ne çalışıyor? (dürüst durum tablosu)

| Özellik | Durum | Nerede / nasıl doğrulandı |
|---|---|---|
| 100 farklı köpek ırkı (isim, açıklama, 6 stat, nadirlik, özgün görsel) | ✅ Çalışıyor | `data/breeds.json`, `assets/dogs/*.webp` (100 benzersiz MD5) |
| Her ırk için **ayrı** görsel (aynı görsel 100 kez kopyalanmadı) | ✅ Çalışıyor | `tests/run_tests.js → 01c` (100/100 benzersiz md5) |
| 6 nadirlik katmanı (renk/çerçeve/parıltı/olasılık/stat/değer çarpanları) | ✅ Çalışıyor | `data/rarities.json`, `tests → 01f/01g` |
| 5 kasa: 10.000 / 50.000 / 100.000 / 200.000 / 500.000 puan | ✅ Çalışıyor | `tests → 02a` (fiyatlar birebir) |
| Kasa açılış animasyonu (sallama → patlama → kart çevirme → ödül ekranı) | ✅ Çalışıyor | `scenes/screens_play.js → openCrateFlow()` |
| Kasa olasılıkları görünür + gerçek dağılım test edildi | ✅ Çalışıyor | `tests → 02d/02e` (20.000'er çekiliş, yapılandırma ±%1,2) |
| Bakiye yetmiyorsa kasa açılamaz | ✅ Çalışıyor | `tests/smoke_ui.js → 08b` |
| Pasif puan üretimi (saniyelik/günlük hesap) | ✅ Çalışıyor | `E.economy.totalPerSec`, `tests → 07a/07b` |
| Çevrimdışı kazanç (8 saat tavan, %75 verim) | ✅ Çalışıyor | `tests → 07c` |
| Saat değiştirme koruması (geri alma → 0, ileri alma → kırpma) | ✅ Çalışıyor | `tests → 07d/07e`, `tests/smoke_ui.js → 16b` |
| Günlük giriş ödülleri (7 günlük seri), günlük görevler, başarımlar, etkinlikler | ✅ Çalışıyor | `tests → 09a–09g`, `smoke_ui → 12/12c/12d` |
| Kazanç geçmişi / işlem günlüğü | ✅ Çalışıyor | `E.txLog` (200 kayıt), Profil ekranı |
| **Gerçek genetik**: 9 lokus × 2 alel, ebeveyn seçimi, IV kalıtımı, safkan/melez, mutasyon, nadir özellik, akrabalık cezası, çift merle | ✅ Çalışıyor | `E.genetics`, `tests → 05a–05i` |
| Büyüme evreleri (yavru→genç→yetişkin→usta→yaşlı) | ✅ Çalışıyor | `tests → 04h` |
| Üretim maliyeti + bekleme süresi + soğuma | ✅ Çalışıyor | `tests → 05c`, `smoke_ui → 09` |
| 4v4 arena savaş motoru (HP/ATK/DEF/SPD, özel yetenek, kritik, kalkan, sersemletme, karşı saldırı) | ✅ Çalışıyor | `E.battle.simulate`, `tests → 06a–06j` |
| Savaş **deterministik** (aynı seed → aynı log) | ✅ Çalışıyor | `tests → 06a`, `smoke_ui → 10b` |
| Arena ödülleri + Elo rating + lig + geçmiş | ✅ Çalışıyor | `tests → 06i/06j`, `smoke_ui → 10` |
| Oyuncular arası pazar: ilan ver/iptal, filtre, arama, sıralama, satın al, geçmiş | ✅ Çalışıyor | `scenes/screens_play.js → market`, `smoke_ui → 11/11b/11c/11d` |
| Çift harcama / çift satış koruması | ✅ Çalışıyor | `smoke_ui → 11b` (satılan ilan ikinci kez alınamıyor) |
| %5 komisyon, net gelir hesabı | ✅ Çalışıyor | `tests → 08a/08f` |
| Arkadaş sistemi: benzersiz oyuncu kodu, arama, istek/kabul/red/silme, profil, arena daveti | ✅ Çalışıyor (yerel demo oyuncular + sunucu modu) | `smoke_ui → 14/14a2/14b/14c` |
| Sunucu tarafı doğrulama (çevrim içi mod) | ✅ Kod çalışıyor | `server/index.js` (sıfır bağımlılık, Node) |
| **Çevrim içi gerçek PvP eşleştirme** | ❌ Yok | Yalnızca yerel botlar; botlar arayüzde **"Bot Takımı"** diye açıkça yazılır |
| Kayıt sistemi (localStorage + dışa/ice aktarım kodu) | ✅ Çalışıyor | `tests → 10a–10g`, `smoke_ui → 17/17b` |
| 18 ekran (giriş, hub, koleksiyon, köpek detayı, kasalar, üretim, arena, pazar, arkadaşlar, görevler, başarımlar, etkinlikler, liderlik, envanter, profil, ayarlar, bildirimler, yardım) | ✅ Çalışıyor | `smoke_ui → 04.*` (18/18 render) |
| Ses: havlama, menü, kasa, ödül, arena SFX, 3 arka plan müziği + aç/kapa | ✅ Çalışıyor (24 WAV, toplam 72,5 sn) | `assets/sounds/`, `tests → 11c` |
| Türkçe arayüz | ✅ Tamamı Türkçe | Tüm ekranlar |
| Android APK | ✅ **Derlendi ve imzalandı** | `android/PAW_LEGENDS.apk` |
| APK'nın cihazda çalıştırma testi | ⚠️ Yapılamadı | Emülatör/KVM yok; `android/README_APK.md` |
| Google Play'e yükleme (AAB + yayın anahtarı) | ❌ Yapılmadı | Kendi anahtarınla üretmen gerekir |
| `assets/animations/` içinde hazır video/GIF | ⚠️ Yok (kasıtlı) | Tüm animasyonlar CSS+JS; envanter: `assets/animations/animations.json` |

**Özet:** 80 motor testi + 59 arayüz/akış testi + 947 varlık kontrolü **tamamı geçiyor**
(aşağıda §7). Yapılamayan tek şey APK'nın gerçek cihazda denenmesi ve çevrim içi PvP eşleştirmesi.

---

## 3. Oyun sistemleri

### 3.1 Irklar ve nadirlik
- 100 ırk; her birinde: Türkçe ad, köken, grup, boyut (toy/küçük/orta/büyük/dev), açıklama,
  6 stat (Güç, Hız, Dayanıklılık, Zekâ, Çeviklik, Savunma), saniyelik üretim, pazar taban fiyatı,
  özgün **özel yetenek** ve ırka özgü üretilmiş görsel.
- Nadirlik dağılımı: Yaygın 30 · Seçkin 24 · Nadir 20 · Çok Nadir 13 · Efsanevi 10 · Mitik 3.

| Nadirlik | Stat toplamı | Üretim | Pazar değeri | XP | Kasa taban ağırlığı | Renk |
|---|---:|---:|---:|---:|---:|---|
| Yaygın | 300 | ×1 | ×1 | ×1 | 60 | `#9fb0c4` |
| Seçkin | 345 | ×2 | ×2,4 | ×1,25 | 28 | `#43d17c` |
| Nadir | 390 | ×3,6 | ×5,2 | ×1,55 | 16 | `#3fa2ff` |
| Çok Nadir | 435 | ×6,5 | ×11 | ×1,9 | 8 | `#b06bff` |
| Efsanevi | 485 | ×12 | ×24 | ×2,4 | 3 | `#ffb03a` |
| Mitik | 545 | ×24 | ×52 | ×3 | 1 | `#ff4a6e` |

### 3.2 Kasalar
Gümüş 10.000 · Altın 50.000 · Elmas 100.000 · Efsanevi 200.000 · Mitik 500.000 puan.
Her kasada olasılık tablosu ekranda görünür; ödül tipi karışımı: köpek / puan / eşya.
Örnek (Mitik kutu): Çok Nadir %40 · Efsanevi %30 · Mitik %18 · Nadir %12.

### 3.3 Ekonomi ve formüller
```
köpek statı  = ırk.stat × IV × (1 + (seviye-1) × 0.011) × evre.stat_mult + eğitim (+ mutasyon çarpanı)
üretim/sn    = ırk.pps × seviyeFaktörü × evre.üretim_mult × globalÇarpan × özellikÇarpanı
seviyeFaktörü= (0.60 + seviye × 0.085) / 0.685
globalÇarpan = hızlandırıcılar × etkinlikler × (1 + min(0.35, köpekSayısı × 0.004))
pazar değeri = ırk.tabanFiyat × nadirlik.çarp × (1+seviye×0.045) × (1+eğitim×0.01) × özellik × nesil
çevrimdışı   = min(süre, 8 saat) × üretim/sn × 0.75 × özellik(çevrimdışı)
XP eğrisi    = round(120 × seviye^1.45)      seviye atlama maliyeti = round(400 × seviye^1.62 × nadirlikÇarp × 0.55)
```

### 3.4 Genetik (gerçek kod, ekranda rastgele yazı değil)
- 9 lokus (maske, merle, beyaz leke, brindle, dilute, uzun tüy, dik kulak, kısa burun, mavi göz),
  her lokusta 2 alel; yavruya her lokusta **bir alel anneden, bir alel babadan** geçer
  (`E.genetics.crossAlleles`), baskınlık oranları `data/balance.json → breeding.allele_rules`.
- IV kalıtımı: `ebeveynOrtalaması + gauss(σ=0.055)`, safkan bonusu +%3, melez bonusu +%2,
  akrabalık cezası = ortak ata × %3,5 (tavan %25), sonuç 0.80–1.22 aralığına kırpılır.
- Çift merle riski gerçekleşirse IV'ler %12 düşer (0.75 taban).
- Mutasyon şansı %4,5 (+ etkinlik/serum), nadir özellik şansı %6 (+ ebeveyn özellikleri).
- Soyağacı: anne/baba uid, nesil sayısı, 40 ataya kadar geçmiş → akrabalık tespiti buradan yapılır.

### 3.5 Arena (4v4)
```
HP  = round(70 + dayanıklılık×2.1 + savunma×0.55 + seviye×9)
ATK = round(güç×1.25 + zekâ×0.25 + seviye×2.2)
DEF = round(savunma×1.05 + dayanıklılık×0.20 + seviye×1.35)
SPD = round(hız + çeviklik×0.45 + seviye×0.8)
hasar = ATK × yetenekÇarp × (1 - DEF/(DEF+140)) × nadirlikÇarp × rand(0.92..1.08) [× kritik 1.65]
```
Sıra SPD'ye göre; 24 tur tavanı; tur sonunda HP oranına göre kazanan/beraberlik.
Yetenek tipleri: `damage, heal, guard(kalkan), stun, bleed, drain, howl(rally), counter, crit_up, fortify`.
Ödüller: galibiyet 6.500 · beraberlik 2.600 · mağlubiyet 1.400 puan (+XP), Elo K=26/22.
Ligler: Bronz → Gümüş (1150) → Altın (1400) → Efsanevi (1700) → Elmas (2000) → Mitik Lig (2400).

### 3.6 Pazar
İlan ver (min 1.000, maks 50.000.000, en fazla 6 aktif ilan, 72 saat), iptal et, filtrele
(nadirlik/fiyat), ara, sırala (fiyat/değer/seviye/nadirlik), satın al.
Komisyon %5 (Altın Hafta Sonu etkinliğinde %2). Yerel modda 14 demo satıcı bot ilanı üretir;
botların satın alma olasılığı fiyat/değer oranına göre düşer (%55 → %1,5/saat).

---

## 4. Klasör yapısı
```
PAW_LEGENDS_COMPLETE/
├── index.html                  oyun girişi (tüm ekranlar tek sayfa uygulaması)
├── manifest.webmanifest        PWA bildirimi (kurulabilir uygulama)
├── sw.js                       service worker (çevrimdışı önbellek)
├── README.md / LICENSES.md / INSTALL.md
├── src/
│   ├── css/style.css           tüm tema, rarity çerçeveleri, 9 @keyframes animasyonu, mobil düzen
│   └── js/
│       ├── core/data_bundle.js  OTOMATİK ÜRETİLDİ (data/*.json → tek dosya, 150 KB)
│       ├── core/engine.js      oyun mantığı: E.stats/genetics/crates/battle/economy/market/quests/...
│       ├── ui/ui.js            DOM yardımcıları, ses yöneticisi, yönlendirici, bileşenler (kart/modal/toast)
│       ├── app.js              PL.game: durum, oyun döngüsü (tick), aksiyonlar, chrome/navigasyon
│       └── net.js              sunucu istemcisi (çevrim içi mod)
├── scenes/
│   ├── screens_core.js         12 ekran (giriş, hub, koleksiyon, köpek detayı, envanter, profil,
│   │                           ayarlar, yardım, bildirimler, görevler, başarımlar, etkinlikler, liderlik)
│   └── screens_play.js         6 ekran (kasalar, üretim, arena, pazar, arkadaşlar)
├── scripts/                    üretici betikler (Python): veri, 100 köpek görseli, kasa/arka plan/ikon, 24 ses
│   ├── build_game_bundle.py    data/*.json → src/js/core/data_bundle.js
│   ├── build_data.py           ırk/denge verisini üretir
│   ├── art/dogart.py           ırka özgü vektör köpek sanatı (720×720 SVG → WebP)
│   ├── art/build_other_assets.py  kasalar, arka planlar, 48 arayüz ikonu
│   └── audio/build_sounds.py   numpy ile özgün ses sentezi (22050 Hz mono WAV)
├── data/*.json                 tek gerçek kaynak: breeds, rarities, crates, balance, items,
│                               quests, achievements, events, _lookups (9 dosya)
├── assets/
│   ├── dogs/        100 × WebP + 100 × SVG (ırka özgü, benzersiz)
│   ├── crates/      5 × WebP + 5 × SVG
│   ├── backgrounds/ 6 × WebP (menü, çiftlik, arena, pazar, orman, dağ)
│   ├── ui/          48 SVG ikon
│   ├── sounds/      24 WAV (havlamalar, UI, kasa, ödül, arena, 3 müzik) — 72,5 sn
│   └── animations/  animasyon envanteri (CSS+JS; hazır video yok)
├── server/index.js             sıfır bağımlılıklı Node API (auth, pazar atomik alış, arkadaş,
│                               liderlik, çevrimdışı kazanç doğrulama)
├── android/                    WebView kabuğu + APK derleyici + DERLENMİŞ APK
│   ├── build_apk.sh            Gradle gerektirmeden imzalı APK üretir
│   ├── PAW_LEGENDS.apk         ← kurulabilir çıktı (7.15 MB)
│   ├── app/AndroidManifest.xml, app/src/.../MainActivity.java, app/res/...
│   └── README_APK.md
├── tests/
│   ├── run_tests.js            80 motor testi     → RESULTS.md
│   ├── smoke_ui.js             59 arayüz/akış testi (headless DOM) → SMOKE_RESULTS.md
│   └── check_assets.py         947 varlık kontrolü → ASSET_REPORT.md
└── docs/ARCHITECTURE.md        mimari, veri akışı, formüller, test stratejisi
```

---

## 5. Veri/sanat yeniden üretimi
```bash
python3 scripts/build_data.py             # data/*.json (100 ırk + denge)
python3 scripts/art/dogart.py             # assets/dogs/*.svg + *.webp  (~132 sn, 100 görsel)
python3 scripts/art/build_other_assets.py # kasalar, arka planlar, ikonlar
python3 scripts/audio/build_sounds.py     # 24 WAV
python3 scripts/build_game_bundle.py      # data/*.json -> src/js/core/data_bundle.js  (ZORUNLU son adım)
```
`data/` içinde bir şey değiştirirsen **mutlaka** `build_game_bundle.py` çalıştır;
`tests/run_tests.js → 01h` bu ikisinin birebir aynı olduğunu doğrular (bayat bundle testi).

---

## 6. Çevrim içi mod (opsiyonel sunucu)
```bash
node server/index.js 8787          # sıfır bağımlılık, sadece node:http
# oyunda: Ayarlar → Çevrim içi → sunucu adresi: http://<IP>:8787
```
Sunucu; hesap oturumu (HMAC token), liderlik tablosu, **atomik pazar alış/satışı**
(kilit + `sold` kontrolü → çift harcama yok), arkadaş istekleri ve
**çevrimdışı kazanç doğrulaması** (istemcinin iddia ettiği süre sunucu saatiyle kırpılır) sağlar.
Veri: `server/db.json`. Sunucu yoksa oyun otomatik olarak yerel modda çalışmaya devam eder.

> Dürüstlük notu: sunucu modu pazarı/arkadaşları/liderliği ve kazanç doğrulamasını gerçek
> sunucuya taşır; **gerçek zamanlı PvP eşleştirme (canlı oyuncuya karşı savaş) yoktur.**
> Yerel savaşlar her zaman "Bot Takımı" olarak etiketlenir.

---

## 7. Testler ve sonuçlar
```bash
node tests/run_tests.js        # 80 motor testi       -> tests/RESULTS.md
node tests/smoke_ui.js         # 59 arayüz/akış testi -> tests/SMOKE_RESULTS.md
python3 tests/check_assets.py  # 947 varlık kontrolü  -> tests/ASSET_REPORT.md
```
- **Motor (80/80 geçti):** veri bütünlüğü, 100 benzersiz görsel (MD5), rarity dağılımı,
  kasa olasılık dağılımları (20.000 çekiliş × 2 kasa), RNG determinizmi, stat/üretim/değer
  formüllerinin elle hesapla birebir doğrulanması, genetik alel geçişi + akrabalık cezası +
  çift merle, 4v4 savaş determinizmi ve denge, çevrimdışı kazanç + saat hilesi koruması,
  pazar komisyonu/bot ilanları, görev/başarım/etkinlik, kayıt export/import/migrate.
- **Arayüz (59/59 geçti):** 18 ekranın tamamı gerçek HTML üretiyor (boş ekran yok),
  kasa açma (yetersiz bakiye dahil), üretim, arena (eksik takım reddi), pazar ilan/al/iptal +
  çift harcama koruması, bot satışı, görev/başarım/günlük ödül (modal butonuna gerçekten tıklanır),
  envanter/hızlandırıcı/eğitim/yükseltme, arkadaş akışı (2,5 sn sonra demo kabul),
  liderlik, çevrimdışı kazanç modalı, kaydet/geri yükle, ayarlar, sunucusuz `net.js`.
  Ayrıca **statik sözleşme testi**: kodda çağrılan tüm `U.*`, `PL.game.*`, `E.*.*`, `DB.*`
  sembollerinin gerçekten var olduğunu doğrular (ölü referans avcısı).
- **Varlık (947 kontrol, 0 sorun):** 100 WebP 720×720 açılıyor, MD5'ler benzersiz, 5 kasa,
  6 arka plan, 48 ikon, 24 WAV geçerli başlık/süre, `index.html` referansları,
  `data_bundle.js ↔ data/*.json` eşitliği.

Testlerin bulup **düzeltilen gerçek hatalar** (bu sürümde giderildi):
1. `E.economy.globalMult` içinde `evs.effect` → `evs[i].effect` (hafta sonu/etkinlik varken üretim hesabı çöküyordu).
2. `E.economy.offlineGain` içinde aynı hata (etkinlik sırasında çevrimdışı kazanç çöküyordu).
3. Çevrimdışı kazanç "saat geri alındı" dalında `pps` alanı yoktu → karşılama modalı çöküyordu.
4. Sıralama Tablosu ekranı `PL.game.leaderboard()` sonucunu fonksiyon gibi çağırıyordu → ekran hiç çizilemiyordu.
5. `E.dayKey` sıfır dolgusuz tarih üretiyordu (`2026-3-5`) → günlük anahtarlar tutarsızdı.
6. `E.battle.botTeam` bot kimlikleri zamana bağlıydı → aynı seed aynı savaşı üretse de log kimlikleri değişiyordu.

---

## 8. Bilinen sınırlar (dürüst beyan)
- **APK cihazda test edilmedi:** imza/paket doğrulaması yapıldı, ancak bu sandbox'ta
  emülatör (`/dev/kvm` yok) veya fiziksel cihaz bulunmadığı için çalışma testi yapılamadı.
- **Google Play yayını yok:** Play Store AAB + kendi yayın anahtarını ister;
  `android/paw-legends.keystore` kendinden imzalı geliştirme anahtarıdır (parola: `pawlegends`).
- **Gerçek zamanlı çevrim içi PvP yok** (yalnızca sunucu destekli pazar/arkadaş/liderlik + yerel botlar).
- **Görseller fotoğraf değil:** her ırk için `scripts/art/dogart.py` tarafından üretilen
  özgün vektör illüstrasyonlardır (kafa yapısı, kulak tipi, 15 tüy deseni, ırka özgü renkler).
  Hiçbir üçüncü taraf görsel/ses lisansı kullanılmadı → ayrıntı `LICENSES.md`.
- `assets/animations/` içinde hazır video/GIF yoktur; animasyonlar CSS+JS ile üretilir (envanter dosyada).
- iOS için ayrı paket üretilmedi (aynı web uygulaması Safari'de PWA olarak kurulabilir).

---

## 9. Lisans
Kod ve üretilmiş tüm varlıklar **MIT** lisansındadır → `LICENSES.md`.

## Gorsel Varliklarin Kaynagi (2026-10-30 yenilemesi)
- 100 irk portresi, 5 sandik ve 6 arka planin TAMAMI Arena.ai Agent Mode gorsel uretimiyle
  ozgun olarak uretilmistir (fotorealistik studyo portreleri / AAA oyun ikonu renderlari).
  Ucguncu taraf fotograf veya stok gorsel KULLANILMAMISTIR; atif gerektirmez.
- Master ciktilar 1024x1024 (arkaplanlar 1280x1280) olarak WebP'ye donusturulmustur
  (kopekler/sandiklar q92, arkaplanlar q90). Eski prosedurel vektor gorseller yalnizca
  `*.svg` yedekleri olarak korunmustur, arayuzde kullanilmaz.
