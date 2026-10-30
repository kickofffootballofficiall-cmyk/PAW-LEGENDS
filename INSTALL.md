# INSTALL.md — Kurulum (3 hedef: telefon APK, tarayıcı, geliştirme)

İçindekiler
1. [Android: hazır APK'yı kur](#1-android-hazır-apkyı-kur)
2. [Tarayıcıda çalıştır (masaüstü + mobil)](#2-tarayıcıda-çalıştır)
3. [PWA olarak ana ekrana kur](#3-pwa-olarak-ana-ekrana-kur)
4. [APK'yı kendin derle](#4-apkyı-kendin-derle)
5. [Çevrim içi sunucuyu kur](#5-çevrim-içi-sunucuyu-kur)
6. [Geliştirme: testleri çalıştır, veriyi yeniden üret](#6-geliştirme)
7. [Sorun giderme](#7-sorun-giderme)

---

## 1. Android: hazır APK'yı kur

**Dosya:** `android/PAW_LEGENDS.apk` (7.15 MB, imzalı, `minSdk 21` = Android 5.0+, `targetSdk 34`).

1. APK'yı telefona aktar (USB, e-posta, bulut veya `adb install`).
2. Dosya yöneticisinden APK'ya dokun.
3. Android **"Bilinmeyen kaynaklardan yükleme"** izni ister → Ayarlar'da izin ver → **Yükle**.
4. Uygulama çekmecesinde **PAW LEGENDS** simgesi belirir (pati ikonu).
5. İlk açılışta yetiştirici adını yaz → **Yeni Maceraya Başla**.
   30.000 puan + 2 başlangıç köpeği ile başlarsın.

`adb` ile kurulum:
```bash
adb install -r android/PAW_LEGENDS.apk
adb shell am start -n com.pawlegends.dogworld/.MainActivity
```

**Kaldırma:** Ayarlar → Uygulamalar → PAW LEGENDS → Kaldır.
**Kayıtlar:** uygulama verisi içinde (WebView localStorage). Uygulamayı kaldırırsan kayıt da silinir;
öncesinde *Profil → Kaydı dışa aktar* ile kod al.

> Not: APK bu ortamda derlenip imza/paket doğrulamasından geçirildi; fiziksel cihazda çalıştırma
> testi yapılamadı (emülatör/KVM yok). Kurulumda sorun yaşarsan §7'ye bak.

---

## 2. Tarayıcıda çalıştır

### Yöntem A — doğrudan aç (kurulum yok)
`index.html` dosyasına çift tıkla. Oyun `file://` üzerinde çalışır çünkü:
- ES module kullanılmaz (klasik `<script>` sırası),
- tüm veri `src/js/core/data_bundle.js` içine gömülüdür (`fetch` gerekmez),
- sesler XHR ile yüklenir ve yüklenemezse oyun sessiz devam eder.

> Bazı tarayıcılar `file://` altında `localStorage`'ı kısıtlar. Bu durumda `index.html` içindeki
> koruma katmanı otomatik olarak bellek içi yedeğe geçer (sekme kapanınca kayıt kaybolur) —
> kalıcı kayıt için Yöntem B'yi kullan.

### Yöntem B — yerel HTTP sunucusu (önerilen)
```bash
cd PAW_LEGENDS_COMPLETE
python3 -m http.server 8080 --bind 0.0.0.0
# http://localhost:8080
```
Alternatifler:
```bash
npx serve -l 8080 .          # Node varsa
php -S 0.0.0.0:8080          # PHP varsa
```
Ağdaki telefondan denemek için: `http://<bilgisayarın-IP'si>:8080` (aynı Wi-Fi).

---

## 3. PWA olarak ana ekrana kur

Yöntem B ile `http://` üzerinden açtıktan sonra:
- **Android/Chrome:** menü (⋮) → **"Ana ekrana ekle"** → tam ekran uygulama gibi açılır,
  `sw.js` sayesinde çevrimdışı çalışır.
- **iOS/Safari:** Paylaş → **"Ana Ekrana Ekle"**.
- **Masaüstü Chrome/Edge:** adres çubuğundaki kurulum simgesi → **"Yükle"**.

`manifest.webmanifest` uygulama adı, simge, tema rengi (`#070a12`) ve `standalone` görünümü tanımlar.

---

## 4. APK'yı kendin derle

### Gereksinimler
| Araç | Sürüm | Neden |
|---|---|---|
| JDK | 11 veya 17 | `javac`, `keytool`, `apksigner` |
| Android SDK build-tools | 34.0.0 (30+ olur) | `aapt2`, `d8`, `zipalign`, `apksigner` |
| Android SDK platform | android-34 (30+ olur) | `android.jar` |
| bash, zip, python3 | herhangi | derleme betiği |

**Gradle gerekmez** — betik doğrudan `aapt2 → javac → d8 → zipalign → apksigner` zincirini çalıştırır.

### SDK kurulumu (bir kez)
```bash
# cmdline-tools indir: https://developer.android.com/studio#command-line-tools-only
export ANDROID_HOME=$HOME/Android/Sdk
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
  "platform-tools" "platforms;android-34" "build-tools;34.0.0"
export JAVA_HOME=/path/to/jdk17
```

### Derleme
```bash
cd PAW_LEGENDS_COMPLETE
bash android/build_apk.sh
# çıktı: android/PAW_LEGENDS.apk
```
Betik sırayla: `android/www` hazırlar (oyun dosyaları) → kaynakları derler → manifest + assets
bağlar → Java'yı derler → DEX üretir → hizalar → **kendi anahtarın yoksa üretir** → imzalar → doğrular.

### Kendi imza anahtarınla (yayın için)
```bash
keytool -genkeypair -v -keystore $HOME/keys/release.keystore -alias pawlegends \
  -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12
KEYSTORE_PATH=$HOME/keys/release.keystore KEYSTORE_PASS='parolan' bash android/build_apk.sh
```
Çıktıyı farklı yere yazmak için: `OUT_APK=/tmp/oyun.apk bash android/build_apk.sh`

### Alternatif: Capacitor / Gradle yolu
`android/capacitor.config.json` ve `android/package.json` hazır. Bu yolu seçersen:
```bash
cd PAW_LEGENDS_COMPLETE/android
bash build_apk.sh --prepare-only      # android/www üretir (webDir = www)
npm install
npx cap add android && npx cap sync
npx cap open android                  # Android Studio -> Build > Build APK(s)
```
Bu yol Android Studio + Gradle gerektirir; varsayılan betik bunu **gerektirmez**.

### CI ile derleme (bilgisayarında SDK olmadan)
`.github/workflows/build-apk.yml` depo GitHub'a yüklendiğinde APK'yı otomatik derler ve
**artifact** olarak indirilebilir sunar (ücretsiz, ek servis gerekmez):
```bash
mkdir -p .github/workflows && cp PAW_LEGENDS_COMPLETE/.github/workflows/build-apk.yml .github/workflows/
git add . && git commit -m "APK CI" && git push
# GitHub → Actions → "build-apk" → Artifacts → PAW_LEGENDS-apk
```

---

## 5. Çevrim içi sunucuyu kur

Oyun sunucusuz tam çalışır (yerel mod). Çevrim içi pazar/arkadaş/liderlik ve sunucu taraflı
kazanç doğrulaması için:

```bash
cd PAW_LEGENDS_COMPLETE
node server/index.js 8787            # sıfır bağımlılık, npm install gerekmez
# PAW LEGENDS API dinlemede: http://0.0.0.0:8787
```
Oyunda: **Ayarlar → Çevrim içi → sunucu adresi** `http://<IP>:8787` → **Bağlan**.
Veri dosyası: `server/db.json` (ilk çalıştırmada oluşur).
Üretim gizliliği için: `PAW_SECRET='uzun-rastgele-metin' node server/index.js 8787`.

Kalıcı servis (Linux):
```ini
# /etc/systemd/system/pawlegends.service
[Unit]
Description=PAW LEGENDS API
After=network.target
[Service]
WorkingDirectory=/opt/PAW_LEGENDS_COMPLETE
ExecStart=/usr/bin/node server/index.js 8787
Environment=PAW_SECRET=degistir-bunu
Restart=always
[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl enable --now pawlegends
```

Uçlar: `/api/ping`, `/api/auth/login`, `/api/me`, `/api/sync`, `/api/leaderboard`,
`/api/market/listings|list|buy`, `/api/friends[/request|/accept]`, `/api/verify/earnings`.

---

## 6. Geliştirme

```bash
# testler (bağımlılık yok)
node tests/run_tests.js         # 80 motor testi       -> tests/RESULTS.md
node tests/smoke_ui.js          # 59 arayüz/akış testi -> tests/SMOKE_RESULTS.md
python3 tests/check_assets.py   # 947 varlık kontrolü  -> tests/ASSET_REPORT.md

# veri/sanat üretimi (Python 3 + Pillow + numpy + cairosvg)
python3 scripts/build_data.py
python3 scripts/art/dogart.py
python3 scripts/art/build_other_assets.py
python3 scripts/audio/build_sounds.py
python3 scripts/build_game_bundle.py    # data/ değiştiyse ZORUNLU
```
Python bağımlılıkları (yalnızca üretici betikler için):
```bash
pip install pillow numpy cairosvg
```

---

## 7. Sorun giderme

| Belirti | Neden | Çözüm |
|---|---|---|
| `index.html` açılıyor ama ekran boş | Eski tarayıcı / JS kapalı | Modern tarayıcı kullan; `<noscript>` uyarısını görüyorsan JS'i aç |
| Kayıt tutulmuyor (`file://`) | Tarayıcı `file://` altında localStorage'ı engelliyor | `python3 -m http.server 8080` ile aç (Yöntem B) |
| Ses yok | Tarayıcı otomatik oynatmayı engelliyor | Ekrana bir kez dokun/tıkla; Ayarlar → Ses açık mı bak |
| Görseller görünmüyor | Dosyalar eksik taşınmış | `python3 tests/check_assets.py` çalıştır (947 kontrol) |
| APK kurulamıyor | Eski Android / imza uyarısı | Android 5.0+ gerekli; "bilinmeyen kaynak" iznini ver |
| APK açılıyor, ekran siyah | WebView çok eski | Android System WebView'i Play Store'dan güncelle |
| `aapt2: unknown option` | build-tools < 30 | `sdkmanager "build-tools;34.0.0"` |
| `javac: source 8 obsolete` uyarısı | Normal | Uyarıdır, derleme başarılıdır |
| `apksigner: HmacPBESHA256 not available` | PATH'te eski Java | `export JAVA_HOME=<jdk17>` ve betiği yeniden çalıştır |
| Sunucuya bağlanamıyor | Adres/CORS/güvenlik duvarı | `curl http://<IP>:8787/api/ping` dene; sunucu tüm originlere açıktır |
| Testlerde `bundle != data/...` | `data/` düzenlendi ama bundle üretilmedi | `python3 scripts/build_game_bundle.py` |
