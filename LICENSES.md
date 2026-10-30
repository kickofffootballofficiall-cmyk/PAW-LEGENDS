# LICENSES.md — PAW LEGENDS: DOG WORLD

Bu proje **tek lisansla** dağıtılır ve **hiçbir üçüncü taraf telifli materyal içermez**.

## 1. Kod lisansı: MIT

```
MIT License

Copyright (c) 2026 PAW LEGENDS: DOG WORLD proje sahipleri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Kapsam: `index.html`, `sw.js`, `manifest.webmanifest`, `src/**`, `scenes/**`,
`scripts/**`, `server/**`, `android/**` (Java/manifest/betik), `tests/**`, `docs/**`, `data/**`.

## 2. Görseller: tamamı bu proje için üretildi (özgün)

| Varlık | Adet | Nasıl üretildi | Kaynak/lisans |
|---|---|---|---|
| `assets/dogs/*.svg` + `*.webp` | 100 + 100 | `scripts/art/dogart.py` — ırk başına benzersiz tohum (`id × 7919`), kafa yapısı, vücut tipi, kulak formu, 15 tüy deseni, ırka özgü palet; 720×720 vektör → LANCZOS → WebP (q82) | Özgün, MIT |
| `assets/crates/*` | 5 + 5 SVG | `scripts/art/build_other_assets.py` | Özgün, MIT |
| `assets/backgrounds/*` | 6 | aynı betik (gradyan + doku + vinyet) | Özgün, MIT |
| `assets/ui/*.svg` | 48 | aynı betik (elle çizilmiş ikon yolları) | Özgün, MIT |
| `android/app/res/mipmap-*/ic_launcher.png` | 5 | `assets/ui/icon_paw.svg` → cairosvg → PIL (yuvarlak maske) | Özgün, MIT |

- **Hiçbir stok fotoğraf, AI servisi çıktısı veya internetten indirilmiş görsel kullanılmadı.**
  Bu nedenle atıf/izin yükümlülüğü yoktur.
- Irk adları (Kangal, Akita, Border Collie…) genel kabul görmüş **kamu malı** ırk isimleridir;
  açıklamalar bu proje için sıfırdan yazılmıştır. Hiçbir kulüp/dernek metni kopyalanmamıştır.
- Köpek görselleri **fotoğraf değil, stilize vektör illüstrasyondur** (README §8'de belirtildiği gibi).

## 3. Sesler: tamamı prosedürel sentez (özgün)

| Varlık | Adet | Nasıl üretildi |
|---|---|---|
| `assets/sounds/*.wav` | 24 (72,5 sn) | `scripts/audio/build_sounds.py` — numpy ile 22.050 Hz mono sentez: frekans süpürme (havlamalar), gürültü + filtre (UI tık/hover), zarf + rezonans (kasa, ödül, madeni para), çok katmanlı döngü (3 müzik) |

- Kayıt, örneklem paketi (sample pack) veya üçüncü taraf müzik **kullanılmadı** → telif/CC atıf gerekmez.
- Müzikler: `music_menu`, `music_farm`, `music_battle` (döngülenebilir, `loop=true`).

## 4. Yazı tipleri
Yalnızca **sistem yazı tipleri** kullanılır (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`).
Web fontu indirilmez → lisans yükümlülüğü yoktur, çevrimdışı çalışmayı bozmaz.

## 5. Üçüncü taraf çalışma zamanı bağımlılıkları
| Bileşen | Bağımlılık | Lisans notu |
|---|---|---|
| İstemci (oyun) | **yok** — saf vanilla JS, klasik `<script>`, ES module yok | — |
| Sunucu (`server/index.js`) | **yok** — yalnızca `node:http`, `fs`, `path`, `crypto` (Node standart kütüphanesi) | Node.js lisansı (MIT) |
| Testler | **yok** — `node:test` bile kullanılmadı; kendi test koşucusu + Python `PIL`/`wave` (yalnızca geliştirme sırasında) | Pillow: HPND (MIT benzeri) — sadece geliştirme aracı, çalışma zamanına girmez |
| APK derlemesi | Android SDK build-tools 34.0.0, platform android-34, JDK 17 | Apache-2.0 / GPL+CE — **yalnızca derleme aracı**, APK içine kod girmez |
| Üretici betikler | Python 3, Pillow, numpy, cairosvg | Geliştirme zamanı; çıktı özgündür |
| `android/package.json` (opsiyonel Capacitor yolu) | `@capacitor/*` | MIT — **varsayılan derleme kullanmaz**; yalnızca alternatif yol için referans |

## 6. İmza anahtarı (dikkat)
`android/paw-legends.keystore` **kendinden imzalı bir geliştirme anahtarıdır**
(parola: `pawlegends`, takma ad: `pawlegends`, geçerlilik 10.000 gün).

- Yan yükleme (sideload) ve test için uygundur.
- **Google Play'e yüklemek için kullanma.** Play Store kendi yayın anahtarını ister ve
  APK yerine AAB bekler. Yayına çıkmadan önce:
  ```bash
  rm android/paw-legends.keystore
  KEYSTORE_PATH=$HOME/keys/release.keystore KEYSTORE_PASS='gizli-parola' bash android/build_apk.sh
  ```
- Bu ZIP'i herkese açık paylaşıyorsan keystore dosyasını çıkarman önerilir
  (aynı anahtarı elinde tutan biri senin paket adınla imzalı güncelleme üretebilir).

## 7. Marka
"PAW LEGENDS: DOG WORLD" bu projenin özgün adıdır; mevcut bir markayla ilişkisi yoktur.
Uygulama paketi: `com.pawlegends.dogworld`.

## Gorsel Varliklarin Kaynagi (2026-10-30 yenilemesi)
- 100 irk portresi, 5 sandik ve 6 arka planin TAMAMI Arena.ai Agent Mode gorsel uretimiyle
  ozgun olarak uretilmistir (fotorealistik studyo portreleri / AAA oyun ikonu renderlari).
  Ucguncu taraf fotograf veya stok gorsel KULLANILMAMISTIR; atif gerektirmez.
- Master ciktilar 1024x1024 (arkaplanlar 1280x1280) olarak WebP'ye donusturulmustur
  (kopekler/sandiklar q92, arkaplanlar q90). Eski prosedurel vektor gorseller yalnizca
  `*.svg` yedekleri olarak korunmustur, arayuzde kullanilmaz.
