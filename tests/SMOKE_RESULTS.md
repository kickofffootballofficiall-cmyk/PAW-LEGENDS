# PAW LEGENDS: DOG WORLD — Headless Arayuz / Akis Testi

- Tarih: 2026-10-30T06:27:18.151Z
- Ortam: node v20.20.2 (minimal DOM taklidi, gercek oyun kodu)
- Komut: `node tests/smoke_ui.js`
- Kapsam: 18 ekrani render etme, kasa acma, uretim, 4v4 arena, pazar ilan/alim,
  gorev/basarim/gunluk odul, envanter, egitim, arkadas, liderlik, cevrimdisi kazanc,
  kaydet/geri yukle, ayarlar ve sunucusuz cevrimici katman.

## Ozet

| Toplam | Gecen | Kalan |
|---:|---:|---:|
| 64 | 64 | 0 |

**Durum: TUM ARAYUZ TESTLERI GECTI**

```
PASS  01 tum katmanlar yuklendi (PL.DB / engine / ui / game / net)
PASS  02 boot sonrasi login ekrani acildi ve icerik uretti
PASS  03 yeni oyun baslatildi: 30.000 puan + 2 baslangic kopegi
PASS  04.login          ekrani hatasiz render oldu
PASS  04.hub            ekrani hatasiz render oldu
PASS  04.collection     ekrani hatasiz render oldu
PASS  04.dogDetail      ekrani hatasiz render oldu
PASS  04.crates         ekrani hatasiz render oldu
PASS  04.breed          ekrani hatasiz render oldu
PASS  04.arena          ekrani hatasiz render oldu
PASS  04.market         ekrani hatasiz render oldu
PASS  04.friends        ekrani hatasiz render oldu
PASS  04.quests         ekrani hatasiz render oldu
PASS  04.achievements   ekrani hatasiz render oldu
PASS  04.events         ekrani hatasiz render oldu
PASS  04.leaderboard    ekrani hatasiz render oldu
PASS  04.inventory      ekrani hatasiz render oldu
PASS  04.profile        ekrani hatasiz render oldu
PASS  04.settings       ekrani hatasiz render oldu
PASS  04.notifications  ekrani hatasiz render oldu
PASS  04.help           ekrani hatasiz render oldu
PASS  04.wolf           ekrani hatasiz render oldu
PASS  04.agility        ekrani hatasiz render oldu
PASS  04.shop           ekrani hatasiz render oldu
PASS  04.invite         ekrani hatasiz render oldu
PASS  04.table          ekrani hatasiz render oldu
PASS  05 ust bar bakiye/uretim/bildirim gosteriyor
PASS  06 tick dongusu: enerji rejenerasyonu, gorev yenileme, otomatik kayit
PASS  07 collect: biriken puan bakiyeye eklendi
PASS  08 kasa acma: puan dustu, istatistik artti, odul uygulandi
PASS  08b yetersiz bakiye ile kasa acilamiyor
PASS  08c 5 kasanin tamami acilabiliyor ve odul veriyor
PASS  09 uretim: yavru eklendi, maliyet/enerji/bekleme uygulandi
PASS  09b gecersiz cift reddediliyor (olu buton korumasi)
PASS  10 arena savasi: 4v4 sonuclandi, odul/rating/gecmis islendi
PASS  10b savas deterministik: ayni takim + ayni seed = ayni sonuc
PASS  10c eksik takimla savas baslatilamiyor
PASS  11 ilan ver / iptal et akisi
PASS  11b bot ilanindan satin alma + cift harcama korumasi
PASS  11c yetersiz bakiye ile alim engelleniyor
PASS  11d kendi ilanin bot tarafindan satilinca net gelir ekleniyor
PASS  12 gorev odulu talep ediliyor, ikinci kez edilmiyor
PASS  12b gorev yenileme (reroll) maliyet karsiligi calisiyor
PASS  12c basarimlar kontrol ediliyor ve acilanlar odul veriyor
PASS  12d gunluk giris odulu serisi ilerliyor
PASS  13 esya kullanimi: mama enerji verir, sayi duser
PASS  13b olmayan esya kullanilamiyor
PASS  13c hizlandirici (booster) aktiflesiyor ve uretimi artiriyor
PASS  13d egitim: stat puani artiyor, maliyet duser, enerji harcanir
PASS  13e seviye atlama (IV yukseltme) maliyet karsiligi calisiyor
PASS  14 arkadas ekleme: demo oyuncu listesi ve kod ile arama
PASS  14a2 demo oyuncu istegi kabul ediyor (2.5 sn sonra arkadaşa eklenir)
PASS  14b gecersiz kod reddediliyor, kendin eklenemiyor
PASS  14c gelen istek kabul/red, arkadas cikarma, arena daveti
PASS  15 liderlik tablosu 4 metrikte de satir uretiyor
PASS  16 cevrimdisi kazanc hesaplaniyor ve modal aciliyor
PASS  16b saat geri alinirsa cevrimdisi kazanc 0
PASS  17 kaydet + geri yukle: durum birebir korunuyor
PASS  17b disa/ice aktarim kodu calisiyor
PASS  18 ayarlar: ses/muzik/kalite/dil degisiklikleri uygulanıyor
PASS  19 net.js sunucu yokken oyuna zarar vermiyor
PASS  20 konsol hatasi / yakalanmayan istisna yok
PASS  20b tum ekranlar gercek HTML uretti (bos ekran yok)
PASS  21 statik sozlesme: kodda cagrilan tum semboller gercekten var
```
