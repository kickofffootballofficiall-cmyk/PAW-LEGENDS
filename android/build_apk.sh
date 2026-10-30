#!/usr/bin/env bash
# =============================================================================
#  PAW LEGENDS: DOG WORLD — APK derleyici (Gradle gerektirmez)
#  Kullanim:  bash android/build_apk.sh              -> android/PAW_LEGENDS.apk
#             bash android/build_apk.sh --prepare-only  (yalnizca android/www hazirla)
#  Gereksinim: Android SDK (build-tools + platforms/android-XX) ve JDK 11/17.
#  Ortam degiskenleri: ANDROID_HOME / ANDROID_SDK_ROOT, JAVA_HOME
#  Cikti: imzali, kurulabilir APK (zipalign + apksigner v2/v3)
# =============================================================================
set -euo pipefail
AND="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$AND/.." && pwd)"
APP="$AND/app"
BUILD="$AND/build"
OUT="${OUT_APK:-$AND/PAW_LEGENDS.apk}"

say() { printf "\033[1;36m[apk]\033[0m %s\n" "$*"; }
die() { printf "\033[1;31m[hata]\033[0m %s\n" "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1) web varliklari
say "android/www hazirlaniyor (oyun dosyalari kopyalaniyor)..."
rm -rf "$AND/www"; mkdir -p "$AND/www"
for item in index.html manifest.webmanifest sw.js src scenes assets data; do
  [ -e "$ROOT/$item" ] && cp -R "$ROOT/$item" "$AND/www/" || die "eksik kaynak: $item"
done
# index.html icindeki goreli yollar www/ altinda da ayni kaldigi icin degisiklik gerekmez
find "$AND/www" -name "*.pyc" -delete 2>/dev/null || true

# APK cihazda yerel calisir (file://) -> sunucu adresi gomulmek ZORUNDA.
# SERVER_URL verilmezse mevcut canli API tuneli kullanilir.
SERVER_URL="${SERVER_URL:-https://cork-believed-reservations-saw.trycloudflare.com}"
python3 - "$AND/www/index.html" "$SERVER_URL" <<'PYINJ'
import io, sys
p, u = sys.argv[1], sys.argv[2]
s = io.open(p, encoding="utf-8").read()
if 'apiUrl: ""' in s:
    s = s.replace('apiUrl: ""', 'apiUrl: "%s"' % u, 1)
elif 'apiUrl:' in s:
    import re
    s = re.sub(r'apiUrl: "[^"]*"', 'apiUrl: "%s"' % u, s, count=1)
io.open(p, "w", encoding="utf-8").write(s)
print("[apk] PAW_CONFIG.apiUrl = " + u)
PYINJ
say "www hazir: $(du -sh "$AND/www" | cut -f1)"
if [ "${1:-}" = "--prepare-only" ]; then say "yalnizca hazirlik istendi, bitti."; exit 0; fi

# ---------------------------------------------------------------- 2) SDK / JDK bul
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -z "$SDK" ] || [ ! -d "$SDK/build-tools" ]; then
  for c in "$HOME/.cache/android-sdk" "$HOME/Android/Sdk" "$HOME/Library/Android/sdk" \
           "/usr/lib/android-sdk" "/opt/android-sdk" "/usr/local/lib/android/sdk"; do
    if [ -d "$c/build-tools" ]; then SDK="$c"; break; fi
  done
fi
[ -n "$SDK" ] && [ -d "$SDK/build-tools" ] || die "Android SDK bulunamadi. ANDROID_HOME ayarla veya 'sdkmanager \"build-tools;34.0.0\" \"platforms;android-34\"' calistir."
BT="$(ls -d "$SDK"/build-tools/* | sort -V | tail -1)"
PLAT="$(ls -d "$SDK"/platforms/android-* | sort -V | tail -1)"
[ -f "$PLAT/android.jar" ] || die "platform android.jar yok: $PLAT"
say "SDK: $SDK"
say "build-tools: $(basename "$BT") | platform: $(basename "$PLAT")"

JH="${JAVA_HOME:-}"
if [ -z "$JH" ] || [ ! -x "$JH/bin/javac" ]; then
  for c in "$HOME/.cache/jdk17" /usr/lib/jvm/java-17-openjdk-amd64 /usr/lib/jvm/java-11-openjdk-amd64 \
           /Library/Java/JavaVirtualMachines/*/Contents/Home; do
    if [ -x "$c/bin/javac" ]; then JH="$c"; break; fi
  done
fi
if [ -n "$JH" ] && [ -x "$JH/bin/javac" ]; then
  JAVAC="$JH/bin/javac"; KEYTOOL="$JH/bin/keytool"
  # aapt2/d8/apksigner betikleri PATH'teki `java`'yi kullanir: ayni JDK'yi one al
  export JAVA_HOME="$JH"; export PATH="$JH/bin:$PATH"
  say "JDK: $JH"
else JAVAC="$(command -v javac || true)"; KEYTOOL="$(command -v keytool || true)"; fi
[ -n "$JAVAC" ] || die "javac bulunamadi (JDK kur veya JAVA_HOME ayarla)."
[ -n "$KEYTOOL" ] || die "keytool bulunamadi."

# ---------------------------------------------------------------- 3) derleme
rm -rf "$BUILD"; mkdir -p "$BUILD/gen" "$BUILD/obj" "$BUILD/dex"
say "kaynaklar aapt2 ile derleniyor..."
"$BT/aapt2" compile --dir "$APP/res" -o "$BUILD/res.zip"
say "manifest + varliklar baglaniyor (assets/www APK icine gomuluyor)..."
"$BT/aapt2" link -o "$BUILD/base.apk" -I "$PLAT/android.jar" \
  --manifest "$APP/AndroidManifest.xml" \
  --java "$BUILD/gen" -A "$AND/www" \
  --min-sdk-version 21 --target-sdk-version 34 \
  "$BUILD/res.zip"

say "Java kodu derleniyor (MainActivity + R.java)..."
"$JAVAC" -encoding UTF-8 -source 8 -target 8 -nowarn \
  -bootclasspath "$PLAT/android.jar" -classpath "$PLAT/android.jar" \
  -d "$BUILD/obj" $(find "$BUILD/gen" "$APP/src" -name "*.java") 2>/dev/null \
  || "$JAVAC" -encoding UTF-8 -nowarn -classpath "$PLAT/android.jar" \
       -d "$BUILD/obj" $(find "$BUILD/gen" "$APP/src" -name "*.java")

say "DEX uretiliyor..."
"$BT/d8" --lib "$PLAT/android.jar" --min-api 21 --output "$BUILD/dex" \
  $(find "$BUILD/obj" -name "*.class")
cp "$BUILD/base.apk" "$BUILD/unsigned.apk"
(cd "$BUILD/dex" && zip -q "$BUILD/unsigned.apk" classes.dex)

say "zipalign..."
"$BT/zipalign" -f -p 4 "$BUILD/unsigned.apk" "$BUILD/aligned.apk"

# ---------------------------------------------------------------- 4) imzalama
KS="${KEYSTORE_PATH:-$AND/paw-legends.keystore}"
KSPASS="${KEYSTORE_PASS:-pawlegends}"
if [ ! -f "$KS" ]; then
  say "imza anahtari uretiliyor (kendinden imzali): $KS"
  "$KEYTOOL" -genkeypair -v -keystore "$KS" -storetype PKCS12 -alias pawlegends -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$KSPASS" -keypass "$KSPASS" \
    -dname "CN=PAW LEGENDS DOG WORLD, OU=Oyun, O=PawLegends, L=Istanbul, C=TR" >/dev/null 2>&1
fi
say "APK imzalaniyor..."
"$BT/apksigner" sign --ks "$KS" --ks-key-alias pawlegends \
  --ks-pass "pass:$KSPASS" --key-pass "pass:$KSPASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT" "$BUILD/aligned.apk"

say "dogrulaniyor..."
"$BT/apksigner" verify --print-certs "$OUT" | head -6
"$BT/aapt2" dump badging "$OUT" 2>/dev/null | grep -E "^package|^application-label|sdkVersion|targetSdkVersion|launchable-activity" || true
say "TAMAM: $OUT ($(du -h "$OUT" | cut -f1))"
