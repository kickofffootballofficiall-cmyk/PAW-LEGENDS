# PAW LEGENDS — Telegram Mini App + Bot Rehberi

Oyunu **Telegram Mini App** olarak yayınlayıp bir **bot** üzerinden oynatmanın adımları.
Tamamı ücretsiz: BotFather ücretsiz, bot kodu sıfır npm bağımlılığı (saf Node).

---

## 1. Mimari

```
 Telegram uygulaması (oyuncu)
   │  Mini App WebView (HTTPS url)
   ▼
 ┌──────────────────────────────┐      ┌────────────────────────────┐
 │ Oyun (index.html + assets)   │      │ telegram/bot.js            │
 │ — Telegram WebApp SDK        │      │ /start → 🎮 Oyunu Aç       │
 │ — initData → /api/tg/login   │      │ menu butonu → Mini App     │
 └──────────────┬───────────────┘      │ /liderlik, /ban, /duyuru…  │
                │ HTTPS                └──────────┬─────────────────┘
                ▼                                 │ (aynı makineden)
        ┌───────────────────┐                     ▼
        │ server/index.js   │ ◄────── admin API (X-Admin)
        │ /api/* + /admin   │
        └───────────────────┘
```

- Oyuncu butona dokununca oyun **Telegram'ın içinde** açılır; SDK (`telegram-web-app.js`)
  `initData` imzasını verir, oyun sunucusu bunu **resmi HMAC şemasıyla doğrular**
  (`/api/tg/login`) → oyuncunun Telegram hesabı oyun hesabına **kalıcı** bağlanır.
- Bot ayrıca sohbet komutlarıyla liderlik çeker ve admin'e **Telegram'dan yönetim**
  (`/ban`, `/duyuru`, `/oyuncular`, `/istatistik`) verir.

## 2. Bot oluşturma (BotFather)

1. Telegram'da **@BotFather** → `/newbot` → isim + kullanıcı adı seç → **token** al
   (`123456789:AA...` biçiminde).
2. İstersen `/setname`, `/setdescription`, `/setuserpic` ile marka giydir.
3. Mini App URL'si olarak **HTTPS** oyun adresini vereceğiz (aşağıda).

## 3. Sunucuyu halka açma (HTTPS şart)

Telegram Mini App'ler yalnızca **geçerli HTTPS** adreslerden yüklenir. İki yol:

**A) Kendi VPS'in (önerilen):** `docs/ADMIN.md` bölüm 5'teki nginx + Let's Encrypt
kurulumunu yap. Oyun statik dosyaları + API aynı domain'de olsun, örn:
`https://paw.example.com/` (oyun) — API de aynı origin (`/api/*`).

**B) Ücretsiz tünel (deneme için):** `cloudflared tunnel --url http://localhost:8080`
veya `ngrok http 8080` → verdiği `https://...` adresini kullan.
> Not: Bu Arena sandbox önizlemesi token'lı proxy arkasında olduğu için Telegram
> onu açamaz; gerçek dağıtımda A veya B şarttır.

## 4. Çalıştırma

```bash
# 1) Oyun + API + admin
ADMIN_PASS="guclu-parola" PAW_SECRET="gizli-anahtar" TG_BOT_TOKEN="123:AA..." \
  node server/index.js 8787

# 2) Bot (ayrı proses, aynı makine)
TG_BOT_TOKEN="123:AA..." \
TG_GAME_URL="https://paw.example.com" \
TG_API_URL="http://127.0.0.1:8787" \
TG_ADMIN_IDS="telegram-user-id-n" \
ADMIN_PASS="guclu-parola" PAW_SECRET="gizli-anahtar" \
  node telegram/bot.js
```

| Değişken | Anlamı |
|---|---|
| `TG_BOT_TOKEN` | BotFather token'ı (bot + sunucu initData doğrulaması için aynı olmalı) |
| `TG_GAME_URL` | Mini App'in açılacağı HTTPS oyun adresi |
| `TG_API_URL` | Bot'un konuştuğu oyun API'si (yerelde 127.0.0.1:8787) |
| `TG_ADMIN_IDS` | Virgülle ayrılmış Telegram user id'lerin (admin komutları) |
| `ADMIN_PASS` / `PAW_SECRET` | admin paneliyle aynı olmalı (bot admin API'yi böyle çağırır) |

Bot açılışta **sohbet menü butonunu** Mini App'e ayarlar (`setChatMenuButton`);
yani bot sohbetinde kutunun yanındaki buton da oyunu açar. Kendi Telegram user
id'ni bilmiyorsan: @userinfobot'a yaz, söyler.

## 5. Oyuncu tarafında ne olur?

1. Bot'a `/start` → "🎮 Oyunu Aç" butonu.
2. Oyun Telegram içinde tam ekran açılır (`TG.expand()`).
3. Oyun otomatik olarak `initData`'yı sunucuya doğrulatır → **Telegram hesabın =
   oyun hesabın** (kod: `PAW-XXXXXX`, türetilmiş ve kalıcı).
4. Bağlantı koparsa oyun yerel modda devam eder; tekrar açınca aynı hesap gelir.
5. Admin seni banladıysa Mini App girişte "HESAP YASAKLI" der (403).

## 6. Bot komutları

| Komut | Kim | İş |
|---|---|---|
| `/start` | herkes | Mini App butonu |
| `/liderlik` | herkes | Canlı top-10 |
| `/yardim` | herkes | Yardım |
| `/istatistik` | admin | Oyuncu/çevrimiçi/yasaklı/pazar özeti |
| `/oyuncular` | admin | Son 15 oyuncu listesi |
| `/ban PAW-KOD [saat]` | admin | Yasakla (0 = kalıcı) |
| `/unban PAW-KOD` | admin | Banı aç |
| `/duyuru <metin>` | admin | Oyun içi 📢 bildirim |

## 7. Test

```bash
node tests/telegram_test.js   # 8 senaryo: HMAC dogrulama, sahte hash, eski tarih, kalici eslesme
```
Rapor: `tests/TELEGRAM_RESULTS.md`.

## 8. Dürüst sınırlar

- Mini App **HTTPS'siz çalışmaz**; sandbox önizlemesi Telegram'a açılamaz (token'lı proxy).
- Bot long-polling kullanır (webhook değil) → yeniden başlatınca kaldığı yerden devam
  eder ama offset bellekte tutulur (proses ölürse birkaç eski mesajı yeniden işleyebilir).
- Telegram ödeme/yıldız entegrasyonu yok (oyun içi ekonomi yerel puandır).
- initData doğrulaması sahte istemciyi engeller ama istemci tarafı modlama için
  `docs/ADMIN.md` güvenlik notları geçerlidir.

## Telegram Stars ile Mağaza Satın Alımı

- İstemci: Mağaza ekranındaki ⭐ paketleri yalnızca Telegram Mini App içinde (`Telegram.WebApp.openInvoice`) çalışır.
- Sunucu: `POST /api/stars/invoice` → `TG_BOT_TOKEN` env tanımı gerektirir; Bot API `createInvoiceLink` ile
  `currency: "XTR"` (Stars) faturası üretir. Token yoksa dürüst 503 hatası döner.
- Paketler: `s25` (25⭐ → 250.000 puan), `s60` (60⭐ → 700.000 puan + Altın Tasma).
- Ödeme doğrulama: openInvoice `paid` callback'i istemci tarafındadır; sunucuya `POST /api/stars/paid`
  ile kaydedilir. **Dürüst not:** sunucu tarafı kesin doğrulama için bot webhook'u (`successful_payment`)
  gereklidir — bu sürümde istemci beyanına dayalı kayıt tutulur.

## Davet Sistemi (Invite)

- `POST /api/invite {ref}` — davet edilen +25.000 puanı istemcide alır; sunucu davet edene +50.000 puan
  işler, `invited[]` listesine kaydeder. Tek kullanımlık (`usedRef`), kendini davet engelli, çift işleme 409.
- `GET /api/invite/status` — `{invited, usedRef}`; istemci davet ekranındaki kilometre taşlarını
  (1/3/5/10 davet) bununla günceller.
- Çevrimdışı modda: kod girişi ve hoş geldin bonusu yerel çalışır; davet edenin ödülü ancak iki taraf da
  sunucuya bağlıyken işlenir (ekranda dürüstçe belirtilir).

## Canlı Bağlantı (bu oturum)

- 🎮 **Mini App URL = API URL (TEK PORT):** https://cork-believed-reservations-saw.trycloudflare.com
  — server/index.js artık oyunu, API'yi ve admin panelini (`/admin`) aynı porttan servis ediyor.
  `index.html`'de `PAW_CONFIG.apiUrl` boş → oyun **same-origin** bağlanır (kurulumda adres taşımak yok).
  Oyun Telegram içinde açılınca initData ile **otomatik** giriş yapar (`G.tgAutoConnect` → `POST /api/tg/login` → hub).
- 📦 Kendi ücretsiz sunucuna taşımak için: **docs/DEPLOY.md** (Render / Oracle VPS / Fly / ev bilgisayarın + Dockerfile + yedekleme).
- Bot + API'yi tek komutla başlat:
  `TG_BOT_TOKEN="..." TG_ADMIN_IDS="..." bash telegram/start_bot.sh`
- BotFather'da Mini App tanımlama: bota `/setmenubutton` (veya bot.js ilk açılışta
  `setChatMenuButton` ile otomatik kurar) → URL olarak Mini App URL'i gir.
- 🛡 **Admin TG ID:** 2084906139 (start_bot.sh varsayılanı; /ban /unban /duyuru /oyuncular /istatistik bu ID'ye açık)
- ⚠️ Ücretsiz quick-tunnel adresleri sandbox yeniden başlayınca DEĞİŞİR. Kalıcı yayın için
  kendi domaininle `cloudflared` named tunnel veya ücretsiz hosting (Render/Fly) kullan;
  değişirse `index.html`'deki `PAW_CONFIG.apiUrl` ve BotFather URL'ini güncelle.
