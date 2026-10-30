# android/ — APK derleme ve durum raporu (dürüst)

## Bu klasörde ne var?

```
android/
├── build_apk.sh            Gradle gerektirmeyen APK derleyici (aapt2 → javac → d8 → zipalign → apksigner)
├── PAW_LEGENDS.apk         ← DERLENMİŞ, İMZALANMIŞ ÇIKTI (7.15 MB)
├── paw-legends.keystore    derleme sırasında üretilen kendinden imzalı anahtar (parola: pawlegends)
├── app/
│   ├── AndroidManifest.xml paket com.pawlegends.dogworld, minSdk 21, targetSdk 34
│   ├── src/com/pawlegends/dogworld/MainActivity.java   WebView kabuğu (tek Activity)
│   └── res/values/{strings,styles}.xml, res/mipmap-*/ic_launcher.png (5 yoğunluk)
├── www/                    derleme sırasında üretilen oyun kopyası (APK içine gömülür)
├── build/                  ara çıktılar (res.zip, base.apk, obj/, dex/)
├── capacitor.config.json   alternatif Capacitor yolu için hazır yapılandırma
└── package.json            alternatif yol için bağımlılık listesi (varsayılan derleme KULLANMAZ)
```

---

## APK durumu — ne yapıldı, ne yapılamadı

### ✅ Yapıldı ve doğrulandı
| Kontrol | Sonuç |
|---|---|
| Derleme | `bash android/build_apk.sh` → başarı, uyarı dışında hata yok |
| Paket kimliği | `package: name='com.pawlegends.dogworld' versionCode='7' versionName='7.0.0'` |
| SDK seviyeleri | `sdkVersion: 21` (Android 5.0+), `targetSdkVersion: 34` |
| Uygulama etiketi | `application-label: 'PAW LEGENDS'` |
| Başlatılabilir Activity | `launchable-activity: com.pawlegends.dogworld.MainActivity` |
| İmza | `apksigner verify` → v1 + v2 + v3 imzalar geçerli, sertifika DN: `CN=PAW LEGENDS DOG WORLD, OU=Oyun, O=PawLegends, L=Istanbul, C=TR` |
| Sertifica SHA-256 | `943f4f8cc08e816eabda107cde2d54384629b540bbd743061a7e4a83b35544f0` |
| İçerik | 319 giriş; `classes.dex`, `AndroidManifest.xml`, 5 launcher ikonu, **100 köpek WebP'si**, 24 WAV, 5 kasa, 6 arka plan, 48 ikon, tüm JS/CSS/HTML |
| Hizalama | `zipalign -p 4` uygulandı |

### ⚠️ Yapılamadı (dürüst beyan)
- **Cihaz/emülatörde çalıştırma testi yapılmadı.** Bu geliştirme ortamında `/dev/kvm` yok ve
  Android emülatörü kurulu değil; fiziksel cihaz da bağlı değil. Bu yüzden:
  - APK'nın *kurulabilirliği ve imzası* doğrulandı,
  - ancak *ekrana gelip gelmediği* yalnızca statik olarak garanti edilebilir
    (oyunun kendisi 59 headless arayüz testinden geçti; WebView ayarları DOM storage +
    `file://` XHR erişimi + medya oynatma izni açık olacak şekilde kuruldu).
- **Google Play yayını hazırlanmadı.** Play Store AAB ister ve kendi uygulama imza anahtarını
  kullanır. Buradaki keystore kendinden imzalıdır, yalnızca yan yükleme/test içindir.
- **iOS paketi yok** (ayrı bir geliştirici hesabı + macOS gerektirir). Aynı web uygulaması
  Safari'de PWA olarak ana ekrana kurulabilir.
- **Uygulama içi satın alma / reklam SDK'sı yok** (kasıtlı: oyun tamamen puan ekonomisiyle çalışır).

Cihazda test etmek istersen (5 dk):
```bash
adb install -r android/PAW_LEGENDS.apk
adb shell am start -n com.pawlegends.dogworld/.MainActivity
adb logcat -s chromium:V PAW*:V          # WebView konsolunu izlemek için
```

---

## APK içine hangi oyun dosyaları giriyor?

`build_apk.sh`, kök dizindeki şu öğeleri `android/www/` altına kopyalar ve
`aapt2 link -A android/www` ile APK'nın `assets/` köküne gömer:

```
index.html  manifest.webmanifest  sw.js  src/  scenes/  assets/  data/
```
`MainActivity` bu yüzden `file:///android_asset/index.html` adresini yükler
(dikkat: `assets/www/...` değil, `assets/...` kökü).

Oyunun APK içinde çalışması için gereken koşullar ve karşılıkları:
| Gereksinim | WebView ayarı |
|---|---|
| JavaScript | `setJavaScriptEnabled(true)` |
| Kayıt (localStorage) | `setDomStorageEnabled(true)` + `setDatabaseEnabled(true)` |
| Ses dosyalarını XHR ile okuma (`assets/sounds/*.wav`) | `setAllowUniversalAccessFromFileURLs(true)`, `setAllowFileAccessFromFileURLs(true)` |
| Müziğin dokunma olmadan başlaması | `setMediaPlaybackRequiresUserGesture(false)` |
| Mobil ölçek | `setUseWideViewPort(true)`, `setLoadWithOverviewMode(true)`, zoom kapalı |
| Donanım hızlandırma | manifest `hardwareAccelerated="true"` + pencere bayrağı |
| Yerel sunucuya bağlanma (http) | manifest `usesCleartextTraffic="true"` + `INTERNET` izni |

---

## Yeniden derleme

```bash
export ANDROID_HOME=$HOME/Android/Sdk        # veya SDK'nın olduğu yer
export JAVA_HOME=/path/to/jdk17              # JDK 11 de olur
bash android/build_apk.sh                    # -> android/PAW_LEGENDS.apk
OUT_APK=/tmp/test.apk bash android/build_apk.sh          # farklı çıktı yolu
bash android/build_apk.sh --prepare-only                 # yalnızca android/www üret
KEYSTORE_PATH=~/keys/release.keystore KEYSTORE_PASS='...' bash android/build_apk.sh
```
Betik SDK'yı şu sırayla arar: `$ANDROID_HOME` → `$ANDROID_SDK_ROOT` → `~/.cache/android-sdk`
→ `~/Android/Sdk` → `~/Library/Android/sdk` → `/usr/lib/android-sdk` → `/opt/android-sdk`.
JDK'yı bulursa `PATH`'in önüne koyar (apksigner'ın doğru `java`'yı kullanması için).

---

## Neden Gradle/Capacitor değil?

- **Bağımlılık yok:** Gradle + Android Gradle Plugin + Capacitor zinciri yüzlerce MB indirme ve
  sürüm uyumu gerektirir. `build_apk.sh` yalnızca SDK build-tools + JDK ile çalışır
  (bu projede ~6 saniyede APK üretiyor).
- **Şeffaflık:** her adım (kaynak derleme, link, dex, hizalama, imza) görünür ve denetlenebilir.
- **Yine de istersen:** `capacitor.config.json` + `package.json` hazır; `INSTALL.md §4` içinde
  Capacitor/Gradle ve GitHub Actions yolları adım adım anlatılıyor.

## Yayına hazırlık kontrol listesi
1. Kendi anahtarını üret: `KEYSTORE_PATH`/`KEYSTORE_PASS` ile derle, keystore'u **yedekle** (kaybedersen güncelleme yayınlayamazsın).
2. `android/app/AndroidManifest.xml` içinde `versionCode`'u artır.
3. Play için AAB gerekirse: Android Studio'da `android/` projesini aç → *Build > Generate Signed Bundle*.
4. Gizlilik politikası ve veri güvenliği formu hazırla (oyun veri toplamıyor; sunucu modu kullanılıyorsa beyan et).
5. Bu ZIP'i herkese açık paylaşıyorsan `paw-legends.keystore` dosyasını paketten çıkar.
