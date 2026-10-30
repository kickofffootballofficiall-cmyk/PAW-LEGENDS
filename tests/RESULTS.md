# PAW LEGENDS: DOG WORLD — Otomatik Test Sonuclari (Motor)

- Tarih: 2026-10-30T08:03:24.157Z
- Ortam: node v20.20.2 / linux
- Komut: `node tests/run_tests.js`
- Kapsam: veri butunlugu (100 irk, 6 rarity, 5 kasa), kasa olasilik dagilimlari,
  RNG determinizmi, stat/uretim/deger formulleri, genetik kalitim ve akraba cezasi,
  4v4 savas determinizmi ve denge, cevrimdisi kazanc + saat hilesi korumasi,
  pazar komisyonu/bot ilanlari, gorev/basarim/etkinlik, kayit sistemi, dosya sozlesmeleri.

## Ozet

| Toplam | Gecen | Kalan |
|---:|---:|---:|
| 80 | 80 | 0 |

**Durum: TUM TESTLER GECTI**

## Detay

```
PASS  01a 100 benzersiz irk var (id/anahtar/isim)
PASS  01b 100 irkin webp + svg gorseli diskte var ve bos degil
PASS  01c her irk gorseli farkli (ayni dosya 100 kez kopyalanmadi)
PASS  01d irk alanlari gecerli (rarity/6 stat/aciklama/uretim/deger/yetenek)
PASS  01e irk stat toplami rarity tablosuna birebir esit
PASS  01f rarity dagilimi 30/24/20/13/10/3
PASS  01g 6 rarity katmaninin renk/cerçeve/carpan verileri tam
PASS  01h data_bundle.js, data/*.json ile birebir ayni (bayat degil)
PASS  02a 5 kasa ve tam fiyatlar 10k / 50k / 100k / 200k / 500k
PASS  02b her kasanin olasilik toplami 1.000 ve odul karisimi 1.000
PASS  02c kasa kalitesi fiyati arttikca artiyor (yapilandirma)
PASS  02d 20000 Gumus acilisi: dagilim yapilandirilan olasiliklara uygun
PASS  02e 20000 Mitik acilisi: ust sinif orani dogru ve Gumus'un cok uzerinde
PASS  02f odul tipleri gecerli; kopek odulu cekilen rarity ile eslesiyor
PASS  02g luck carpani yuksek rarity olasiligini artirir
PASS  03a ayni seed ayni dizi, farkli seed farkli dizi
PASS  03b ri/rf/pick sinirlari ve gauss ortalamasi
PASS  03c weightedPick agirliklara uygun seciyor
PASS  03d hashStr kararli ve dagitici
PASS  04a makeDog: iv 0.82-1.18, 9 gen cifti, cinsiyet, enerji, soy
PASS  04b dogStats formulu elle hesapla birebir ayni
PASS  04c battleStats formulleri (HP/ATK/DEF/SPD) dogru
PASS  04d seviye ve egitim stati, uretimi, pazara degerini artirir
PASS  04e uretim: rarity carpani, evre carpani, global carpan
PASS  04f koleksiyon bonusu %0.4/kopek, tavan %35
PASS  04g xp / seviye atlama / egitim maliyetleri monoton ve formullere uygun
PASS  04h buyume evreleri yas esiklerine gore dogru
PASS  04i ozellik (trait) carpanlari: pazar, uretim, savas, egitim, cevrimdisi
PASS  05a crossAlleles her lokusta ebeveyn alellerinden seciyor
PASS  05b compatible: gecersiz ciftler reddediliyor
PASS  05c uretim maliyeti rarity toplamina, bekleme suresi rarity'ye bagli
PASS  05d breedPair: yavru irki/alelleri/soyu ebeveynden geliyor
PASS  05e ayni irk cifti safkan yavru verir ve purity bonusu alir
PASS  05f kardes ciftlesmesi: ortak ata sayisi ve ceza > 0
PASS  05g mutasyon: zorlaninca uygulanir, stat mutasyonu dogStats'a yansiyor
PASS  05h dogal uretimde nadir ozellik/mutasyon istatistiksel olarak gorulur
PASS  05i cift merle cezasi iv'leri dusurur
PASS  06a ayni seed -> birebir ayni savas (deterministik)
PASS  06b farkli seed -> farkli savas akisi
PASS  06c 4v4 yapisi: 8 birim, gecerli kazanan, tur tavani, HP tutarliligi
PASS  06d guclu takim zayif takimi belirgin sekilde yener (denge)
PASS  06e savas sirasi hiza bagli, savunma hasari azaltiyor
PASS  06f Elo: kazanan artar, kaybeden duser, beraberlik ara deger
PASS  06g bot takimi rating'e olcekleniyor
PASS  06h ozellik/yetenek carpanlari savasta etkili
PASS  06i savas odulleri ve arena istatistikleri tutarli
PASS  06j lig esikleri sirali ve kapsamli
PASS  07a toplam uretim pozitif ve global carpanla olcekleniyor
PASS  07b pending biriken puani dogru hesapliyor
PASS  07c cevrimdisi kazanc 8 saatte sinirlaniyor, %75 verimle
PASS  07d saat geri alinirsa kazanc 0 ve hile isareti true
PASS  07e saat ileri alinip monotonic delta kucukse kazanc kirpilir
PASS  07f offline_min_seconds altindaki cikis kazanc vermez
PASS  07g cevrimdisi kazanc trait ile artiyor (avci_buru +%10)
PASS  07h gain/spend: bakiye, omur boyu puan, islem gunlugu
PASS  08a komisyon %5, etkinlikte dusuyor
PASS  08b bot ilanlari: 14 kayit, deterministik, gecerli alanlar
PASS  08c bot satin alma olasiligi fiyat/deger oranina gore azaliyor
PASS  08d pazar degeri formulu birebir dogru
PASS  08e rarity pazar degerini carpan kadar artiriyor
PASS  08f satis/net gelir hesabi: alici fiyati oduyor, satici komisyon dusulmus aliyor
PASS  09a gunluk gorevler: 4 adet, benzersiz tipler, deterministik
PASS  09b gorev ilerlemesi: artis, tavan, tamamlanma, rarity filtresi
PASS  09c basarimlar: esik, tek seferlik acilis, odul alanlari
PASS  09d etkinlik takvimi: hafta sonu / hafta ici / gece
PASS  09e hafta sonu etkinligi uretimi 2 katina cikariyor
PASS  09f esya verisi tam ve ikonlar mevcut
PASS  09g gunluk giris odulleri 7 gunluk dongude tanimli
PASS  10a defaultState: baslangic puani, bolgeler, oyuncu kodu, ayarlar
PASS  10b starterDogs: 2 kopek, karsi cinsiyet, irk kaydi
PASS  10c export/import turu birebir korur, bozuk kod reddedilir
PASS  10d migrate eski kaydi v7'ye tamamlar, veriyi korur
PASS  10e bildirim ve islem gunlugu sinirlari
PASS  10f dayKey gun sinirlarini dogru ayiriyor
PASS  10g makeCode ayni id icin kararli, farkli id icin benzersiz
PASS  11a zorunlu dosyalar ve index.html referanslari mevcut
PASS  11b 18 ekran kayitli ve index.html dogru sirada yukluyor
PASS  11c arayuzde kullanilan tum ses dosyalari mevcut
PASS  11d CSS 6 rarity icin stil ve mobil uyum iceriyor
PASS  11e sunucu uclari istemcideki net.js ile eslesiyor
```
