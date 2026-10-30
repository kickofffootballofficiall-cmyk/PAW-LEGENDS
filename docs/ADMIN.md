# PAW LEGENDS — Sunucu Kurulumu ve Admin Paneli Rehberi

Bu rehber oyunu **gerçek bir sunucuya** bağlamanı ve oyunculara müdahale edebileceğin
**web tabanlı admin panelini** kullanmanı anlatır. Her şey ücretsiz/yerel araçlarla çalışır
(sadece Node.js, sıfır npm bağımlılığı).

---

## 1. Mimari (özet)

```
 Oyuncu (tarayıcı / APK)          Sen (admin)
        │                              │
        │ HTTP JSON                    │ HTTP + X-Admin token
        ▼                              ▼
   ┌─────────────────────────────────────────┐
   │  node server/index.js  (tek proses)     │
   │  • /api/*    oyun API'si (login, pazar, │
   │              liderlik, arkadaş, sync)   │
   │  • /admin    admin paneli (web UI)      │
   │  • /admin/api/*  yönetim endpoint'leri  │
   │  • db.json   tüm veri (dosya tabanlı)   │
   └─────────────────────────────────────────┘
```

- Oyun **yerel modda her zaman çalışır**; sunucu opsiyoneldir.
- Sunucuya bağlanan oyuncularda: profil senkronu, çevrimdışı kazanç doğrulaması,
  global pazar, arkadaşlar ve liderlik tablosu gerçek sunucudan geçer.
- Admin müdahaleleri (puan, mesaj, ban, duyuru…) sunucuda birikir; oyun istemcisi
  **60 saniyede bir** `/api/me` yoklayarak bunları uygular.

## 2. Hızlı başlangıç (yerel / LAN)

```bash
cd PAW_LEGENDS_COMPLETE
ADMIN_PASS="kendi-guclu-parolan" PAW_SECRET="kendi-gizli-anahtarin" node server/index.js 8787
```

| Ne | Adres |
|---|---|
| Oyun API'si | `http://localhost:8787/` |
| **Admin paneli** | `http://localhost:8787/admin` |
| Admin parolası | `ADMIN_PASS` (varsayılan: `pawlegends-admin` — **kesinlikle değiştir**) |

**Oyuncu tarafı:** oyunda `Ayarlar → Sunucu URL` alanına sunucu adresini yaz ve
"Bağlan" de. Aynı bilgisayarda `http://localhost:8787`; aynı Wi-Fi'daki telefonda
`http://192.168.x.x:8787` (PC'nin LAN IP'si); internetteki VPS'te `http://IP:8787`
veya HTTPS domain'in.

> APK'dan bağlanırken de aynı URL kullanılır. Halka açık yayında **HTTPS şarttır**
> (aşağıya bakın), yoksa token'lar düz metin gider.

## 3. Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `PORT` / 1. argüman | `8787` | Dinleme portu |
| `ADMIN_PASS` | `pawlegends-admin` | Admin paneli parolası |
| `PAW_SECRET` | yerel sabit | Oturum token HMAC anahtarı — **değiştir** |
| Veri | `server/db.json` | Otomatik oluşur; yedeklemen yeterli |

## 4. Admin paneli özellikleri (`/admin`)

- **Genel Bakış:** oyuncu sayısı, anlık çevrimiçi, yasaklı sayısı, aktif ilanlar,
  pazar hacmi, çalışma süresi + son işlemler (15 sn'de bir otomatik yenilenir).
- **Oyuncular:** arama (isim/PAW-KOD), tablo (puan, Elo, G/S, köpek, son görülme,
  durum) ve satır başına müdahaleler:
  - `+Puan` → oyuncunun bakiyesine eklenir/çıkarılır (oyunda bildirim olarak düşer)
  - `Mesaj` → oyuncuya oyun içi toast mesajı
  - `Banla / Ban Aç` → süre (saat) veya kalıcı; banlı hesap girişte 403 alır,
    oyunda çevrimiçiyse otomatik çevrimdışı moda alınır
  - `İsim`, `Elo` → profil düzeltme / hile cezalandırma
  - `Sıfırla` → sunucu profilini sıfırlar (puan/Elo/G-S)
  - `Sil` → hesabı ve ilanlarını **kalıcı** siler
- **Pazar:** tüm ilanlar; uygunsuz/hileli ilanı tek tıkla kaldırma.
- **Duyuru:** tüm bağlı oyunculara oyun içi bildirim (📢) gönderme.
- **İşlem Kaydı:** her admin müdahalesi zaman damgasıyla loglanır (300 kayıt).

Tüm müdahaleler `X-Admin` token'ı ister; token yalnızca doğru `ADMIN_PASS` ile
`POST /admin/login`'den alınır ve tarayıcıda `sessionStorage`'da tutulur.

## 5. İnternete açma (VPS)

1. **Sunucu:** Ubuntu VPS'e Node 18+ kur (`apt install nodejs`), projeyi yükle.
2. **systemd birimi** `/etc/systemd/system/pawlegends.service`:

   ```ini
   [Unit]
   Description=PAW LEGENDS API
   After=network.target
   [Service]
   WorkingDirectory=/opt/pawlegends
   Environment=ADMIN_PASS=COOK_GUCLU_PAROLA
   Environment=PAW_SECRET=UZUN_RASTGELE_ANAHTAR
   ExecStart=/usr/bin/node server/index.js 8787
   Restart=always
   User=www-data
   [Install]
   WantedBy=multi-user.target
   ```

   `systemctl enable --now pawlegends`
3. **HTTPS + ters proxy (nginx):** `certbot --nginx -d api.oyunundomain.com` ile
   ücretsiz Let's Encrypt sertifikası; nginx'te `proxy_pass http://127.0.0.1:8787;`.
   Oyunculara ve admin paneline **yalnızca HTTPS adresini** ver.
4. **Güvenlik duvarı:** `ufw allow 80,443` (8787'yi dışarıya AÇMA, nginx yeter).
5. **Yedek:** `server/db.json`'u cron ile günlük kopyala
   (`cp /opt/pawlegends/server/db.json /yedek/db-$(date +%F).json`).

## 6. Güvenlik notları (dürüst uyarılar)

- Varsayılan `ADMIN_PASS`/`PAW_SECRET` ile **asla** halka açma.
- Panel tek faktörlüdür (parola). Kurumsal seviye gerekirse nginx'e
  `auth_basic` veya IP beyaz listesi ekle (`allow 1.2.3.4; deny all;`).
- Oyun istemcisi.balance istemci-taraflıdır; sunucu pazar/çevrimdışı kazanç/elo
  doğrular ama istemci modlamasına karşı %100 koruma yoktur (bkz. README "sınırlar").
  Admin paneli tam da bunun için var: şüpheliyi banla/sıfırla.
- `db.json` silinirse hesaplar silinir; yedekle.

## 7. Test

```bash
node tests/admin_api.js     # 32 senaryo: login, ban, posta, duyuru, pazar, log…
```

Sonuç raporu: `tests/ADMIN_RESULTS.md`.

## 8. Sorun giderme

| Belirti | Çözüm |
|---|---|
| Oyuncu "Sunucuya ulaşılamadı" | URL doğru mu? Aynı LAN'da mısınız? `ufw`/modem port yönlendirme (8787) açık mı? |
| Panel 403 | Parola = `ADMIN_PASS` mi? Farklı portta başka sunucu mu çalışıyor? |
| Müdahale oyuncuya geç düşüyor | İstemci 60 sn'de bir yoklar; oyuncu ekranı açık olmalı |
| Ban işe yaramıyor gibi | Ban yalnızca **çevrim içi** katmanı engeller; yerel (offline) oyun tasarımı gereği çalışmaya devam eder |

## Panel Oyuncuları ve Köpek Vekâleti (yeni)

Admin artık oyunun dışında da oyuncu ve köpek yönetebilir:

### Yeni oyuncu oluşturma
- Panel → Oyuncular → **+ Yeni Oyuncu**: ad, (opsiyonel) kod, başlangıç puanı, köpek sayısı (0-20),
  ilk köpeğin ırk id'si, Elo. Köpekler oyunun **gerçek motoruyla** üretilir (sunucu, `src/js/core/engine.js`'i
  yükler): gerçek IV'ler, nadirlik, isim — ve 26 saatlik `bornAt` ile **yetişkin/savaşa hazır** doğarlar.
- Oluşan kod (`PAW-XXXXXX`) panelde gösterilir. Oyuncu, oyunun giriş ekranındaki
  **"Sunucu Kodu ile Giriş"** ile bu kodu girer → sunucudaki köpekleri + puanı cihazına iner
  (`loginOnly` akışı; kod kayıtlı değilse dürüst 404). Köpekler inince istemci `/api/dogs/ack` ile
  sunucu kuyruğunu boşaltır (aynı köpek bir daha yeniden eklenmez).

### Oyuncu yönetimi ("Yönet" butonu)
- **Sunucu kennel'i**: oyuncunun sunucudaki köpekleri (ad/ırk/nadirlik/seviye/uid).
  - **+ Köpek Ver** → `give_dog` (ırk id opsiyonel, boşsa rastgele)
  - **Pazara Koy** → `list_for {dogUid, price}` (köpek kennel'den düşer, gerçek ilan açılır, oyuncuya `dog_removed` maili gider)
  - **Sil** → `remove_dog`
- **Pazardan oyuncu adına satın al** → `buy_for {id}`: aktif ilanlar listelenir; oyuncunun **sunucu bakiyesinden** düşer,
  satıcıya gelir eklenir (komisyonsuz), ledger'a `admin:true` kaydı düşer, oyuncuya `-fiyat` puan maili gider.
  Bakiye yetmezse 402.
- **Puanı Ayarla** → `set_balance {amount}`: fark, oyuncuya mail delta'sı olarak gider (istemci çevrimiçi olunca
  bakiyesine işler — mevcut puan-mail hattıyla aynı mekanizma).
- Oyuncu çevrimiçiyken her şey 60 sn'lik `pollAdmin` döngüsüyle cihazına otomatik yansır
  (yeni köpek toast'ı, bakiye deltaları, kennel'den çıkan köpekler).

### İstemci senkron kuralları
- `dogsList` = **bekleyen teslimat kuyruğu**dur; istemci birleştirince ack'ler. Böylece oyuncu köpeği
  sonradan pazarda satarsa sunucu onu geri yüklemez.
- `loginOnly` girişleri oyuncunun adını **değiştirmez** (boş isim gönderilir).

### Dürüst sınırlar
- Sunucu bakiyesi ile istemci bakiyesi mail-delta mekanizmasiyla senkron kalır; oyuncu hiç bağlanmazsa
  ödüller sunucuda birikir, ilk bağlanışta teslim edilir.
- Admin alımlarında pazar komisyonu (%5) uygulanmaz (satıcı tam fiyatı alır).

## Eşya Verme (give_item) — v8

- Panel → Oyuncular → **Yönet** → "Eşya ver" bölümü: katalogdaki **her eşya** (Çivili Tasma, Çivili Boyunluk,
  Efsane İksir dahil — normalde yalnızca Telegram Stars ile satılır) seçilip adet girilerek herhangi bir
  oyuncuya verilebilir: `give_item {code, itemId, qty}`.
- Eşya, oyuncunun sunucu kaydına (`usr.items`) işlenir ve **mail** olarak gönderilir; oyuncu çevrimiçi olunca
  (60 sn'lik poll) envanterine otomatik düşer ve toast görür.
- Katalog ucu: `GET /admin/api/items` (27 eşya; `stars_only` ve `stars_price` alanlarıyla).

## Yeni Stars Paketleri (donanım)

| Paket | Yıldız | İçerik |
|---|---|---|
| eq_civili_tasma | 150⭐ | Çivili Tasma (Güç +%10, kalıcı donanım) |
| eq_efsane_iksir | 120⭐ | Efsane İksir (XP +%30) |
| eq_civili_boyunluk | 200⭐ | Çivili Boyunluk (Savunma +%12) |

Ayrıca oyun tarafı: seviye sınırı **150**'ye çıktı; 100'den sonra XP ve seviye-atlama maliyeti üstel duvar
(`1.055^` ve `1.07^` çarpanları) ile ciddi şekilde pahalanır. Donanım (tasma/boyunluk/ilaç) kuşanma sistemi
köpek detay ekranındadır; bonuslar savaş istatistiklerine ve XP kazancına anında yansır.
