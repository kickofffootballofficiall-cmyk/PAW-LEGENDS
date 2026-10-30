# PAW LEGENDS — Kendi Ücretsiz Sunucuna Kurulum Rehberi

Oyun **tek portta hepsi-bir-arada** çalışır: `node server/index.js` hem oyunu (statik dosyalar),
hem API'yi, hem admin panelini (`/admin`) servis eder. Telegram botu opsiyoneldir ve
`TG_BOT_TOKEN` verilirse aynı konteyner/süreçte otomatik başlar. **Sıfır npm bağımlılığı** — sadece Node 18+.

Oyunu bir kez sunucuya koyduktan sonra:
- **Telegram Mini App** → BotFather'daki Web App URL = sunucu adresin
- **APK** → `SERVER_URL=https://sunucun bash android/build_apk.sh` ile adres içine gömülür
- **Web** → tarayıcıdan aynı adres

`index.html` içinde `PAW_CONFIG.apiUrl` boşsa oyun **kendi sunucusuna** (same-origin) bağlanır;
yani web ve Mini App için hiçbir ek ayar gerekmez.

---

## Ortam değişkenleri (hepsi opsiyonel ama üretimde önerilir)

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` | 8787 | Tek port (oyun+API+admin) |
| `DB_FILE` | server/db.json | Veritabanı dosyası (volume'e bağla!) |
| `PAW_SECRET` | paw-legends-local-secret-v7 | **DEĞİŞTİR** — HMAC imza anahtarı |
| `ADMIN_PASS` | pawlegends-admin | **DEĞİŞTİR** — admin panel şifresi |
| `TG_BOT_TOKEN` | (yok) | BotFather token'ı — varsa bot + initData doğrulaması + Stars aktif |
| `TG_GAME_URL` | http://127.0.0.1:$PORT | Mini App'in HTTPS adresi (menü butonu buna ayarlanır) |
| `TG_ADMIN_IDS` | (yok) | Virgüllü TG ID listesi — bot admin komutları |

⚠️ Üretimde `PAW_SECRET` ve `ADMIN_PASS`'i mutlaka değiştir. `PAW_SECRET` değişirse mevcut
oyuncu kodlarının sunucu oturumları sıfırlanır (istemci tarafı kayıtlar etkilenmez, kodla yeniden giriş yapılır).

---

## Seçenek A — Render.com (en kolay, kart gerekmez)

1. Kodu bir **GitHub reposuna** yükle (ZIP'i açıp `git init && git add -A && git commit && git push`).
2. render.com → **New → Web Service** → repo'yu seç.
3. Ayarlar:
   - **Runtime: Docker** (Dockerfile otomatik algılanır)
   - Instance Type: **Free**
   - Environment variables: `PAW_SECRET`, `ADMIN_PASS`, `TG_BOT_TOKEN`, `TG_GAME_URL=https://<servis-adin>.onrender.com`, `TG_ADMIN_IDS`
4. Deploy et. Adres: `https://<servis-adin>.onrender.com` → oyun, `/admin` → panel.
5. BotFather'da menü butonu URL'ini bu adrese güncelle (bot açılışta `TG_GAME_URL` ile otomatik de yapar).

**Dürüst sınırlar (ücretsiz plan):**
- 15 dk istek gelmezse servis **uyur**; ilk açılış ~30-60 sn sürer (bot polling'i sürekli istek attığı için genelde uyanık kalır).
- Disk **geçicidir**: redeploy/restart'ta `db.json` SIFIRLANIR. Çözüm: her gün admin token'la
  `GET /admin/api/backup` çekip sakla, gerekince `POST /admin/api/restore` ile geri yükle
  (aşağıda "Yedekleme" bölümü). Ücretli disk veya Fly volume bunu kalıcı çözer.

## Seçenek B — Oracle Cloud "Always Free" VPS (en sağlam, kalıcı)

Gerçekten ücretsiz ve sonsuz: 4 çekirdek ARM / 24 GB RAM'e kadar. Tek eksik: kayıtta kredi kartı doğrulaması ister (ücret kesmez).

1. oracle.com/cloud/free → hesap aç → **VM.Standard.A1.Flex** (Always Free) instance oluştur (Ubuntu 22.04).
2. SSH ile bağlan, kur:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo mkdir -p /opt/paw /paw-data
   # ZIP'i scp ile at:  scp PAW_LEGENDS_COMPLETE.zip ubuntu@IP:/tmp/
   sudo unzip -q /tmp/PAW_LEGENDS_COMPLETE.zip -d /opt/paw
   ```
3. systemd servisi (kalıcı, yeniden başlatmada otomatik kalkar):
   ```bash
   sudo tee /etc/systemd/system/paw.service <<'EOF'
   [Unit]
   Description=PAW LEGENDS (oyun+api+bot)
   After=network.target
   [Service]
   WorkingDirectory=/opt/paw
   Environment=PORT=8787 DB_FILE=/paw-data/db.json
   Environment=PAW_SECRET=<GUCLU-BIR-ANAHTAR>
   Environment=ADMIN_PASS=<GUCLU-BIR-SIFRE>
   Environment=TG_BOT_TOKEN=<BOTFATHER-TOKEN>
   Environment=TG_GAME_URL=https://paw.senindomainin.com
   Environment=TG_ADMIN_IDS=2084906139
   ExecStart=/usr/bin/node deploy/run.sh
   Restart=always
   [Install]
   WantedBy=multi-user.target
   EOF
   sudo systemctl enable --now paw
   ```
   (`deploy/run.sh` sh ile de çalışır: gerekirse `ExecStart=/bin/sh deploy/run.sh`)
4. HTTPS: en kolayı **Cloudflare Tunnel** (domain ücretsiz değilse `trycloudflare` quick tunnel geçicidir;
   kalıcı için kendi domainini Cloudflare'e ekle → `cloudflared tunnel create paw` → ingress 127.0.0.1:8787).
   Portu doğrudan açacaksan: `sudo iptables -I INPUT 6 -p tcp --dport 8787 -j ACCEPT` + Caddy/nginx ile TLS.
5. BotFather URL'ini güncelle, bitti. Veriler `/paw-data/db.json`'da **kalıcıdır**.

## Seçenek C — Fly.io (volume ile kalıcı disk)

1. `flyctl launch` (Dockerfile algılanır) → uygulama oluşur.
2. `fly volumes create paw_data --size 1` → `fly.toml`'a mount:
   ```toml
   [mounts]
     source = "paw_data"
     destination = "/data"
   ```
3. `fly secrets set PAW_SECRET=... ADMIN_PASS=... TG_BOT_TOKEN=... TG_GAME_URL=https://<app>.fly.dev TG_ADMIN_IDS=2084906139`
4. `fly deploy` → `https://<app>.fly.dev`. (Kayıtta kart ister; küçük kullanım ücretsiz plana sığar.)

## Seçenek D — Kendi bilgisayarın / evdeki eski telefon (tamamen ücretsiz + kalıcı)

1. Node kur, klasörü aç: `PAW_SECRET=... ADMIN_PASS=... TG_BOT_TOKEN=... TG_GAME_URL=https://xxx.trycloudflare.com TG_ADMIN_IDS=2084906139 node deploy/run.sh`
2. Cloudflare quick tunnel (geçici adres, restart'ta değişir):
   `cloudflared tunnel --url http://127.0.0.1:8787` → çıkan `https://...trycloudflare.com` adresini
   `TG_GAME_URL` olarak ver ve BotFather menü butonuna yaz.
3. Kendi domainin varsa **named tunnel** ile adres sabitlenir (ücretsiz):
   `cloudflared tunnel create paw && cloudflared tunnel route dns paw paw.senindomainin.com`
   → config.yml: `ingress: [{hostname: paw.senindomainin.com, service: http://127.0.0.1:8787}, {service: http_status:404}]`
4. Bilgisayar açık kaldığı sürece servis verir; db.json diskinde kalıcıdır.

---

## APK'yı sunucuna bağlama

```bash
export ANDROID_HOME=~/android-sdk JAVA_HOME=~/jdk17
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/build-tools/34.0.0:$PATH"
SERVER_URL="https://sunucun.onrender.com" bash android/build_apk.sh
```
`SERVER_URL` APK'nın `index.html` içine gömülür → uygulama internet olan her yerde bu sunucuya bağlanır
(oyun içeriği cihazda yereldir, internet koparsa çevrimdışı modda oynanmaya devam eder).
Sunucu adresi değişirse APK'yı bu komutla yeniden derlemen yeterli.

## Telegram tarafını yeni adrese taşıma

1. Sunucu ayakta: `https://YENI-ADRES/api/ping` → `{"ok":true}` doğrula.
2. Botu yeni `TG_GAME_URL=https://YENI-ADRES` ile başlat → açılışta menü butonunu otomatik günceller.
   (BotFather'da elle: `/setmenubutton` → URL gir.)
3. API de aynı adreste olduğu için `PAW_CONFIG.apiUrl` boş kalır — oyun same-origin bağlanır, ekstra ayar yok.

## Yedekleme / taşıma (tüm platformlarda aynı)

```bash
ATOK=$(python3 -c "import hmac,hashlib;print(hmac.new(b'<PAW_SECRET>',b'admin:<ADMIN_PASS>',hashlib.sha256).hexdigest()[:40])")
# Yedek al:
curl -s https://SUNUCU/admin/api/backup -H "X-Admin: $ATOK" -o db-yedek.json
# Geri yükle (ör. Render'da disk sıfırlandıktan sonra):
curl -s -X POST https://SUNUCU/admin/api/restore -H "X-Admin: $ATOK" -H "Content-Type: application/json" -d @db-yedek.json
```
VPS'te otomatik günlük yedek: `0 4 * * * curl -s ... -o /paw-data/yedek-$(date +\%F).json` (crontab).

## Doğrulama listesi (kurulum sonrası 2 dakika)

- [ ] `https://SUNUCU/` → oyun açılıyor, giriş yapılabiliyor
- [ ] `https://SUNUCU/api/ping` → `{"ok":true,...}`
- [ ] `https://SUNUCU/admin` → panel, ADMIN_PASS ile giriş
- [ ] Oyunda Ayarlar → "Sunucuya Bağlan" → adres kendiliğinden dolu, bağlanınca ✅
- [ ] @botun → /start → "🎮 Oyunu Aç" → Mini App açılıp **otomatik** giriş yapıyor (kod: PAW-XXXXXX)
- [ ] Mağaza → ⭐ Stars → fatura penceresi açılıyor
- [ ] Admin: /oyuncular, /duyuru test
