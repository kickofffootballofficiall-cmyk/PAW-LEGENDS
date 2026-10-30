# -*- coding: utf-8 -*-
"""PAW LEGENDS - Irk veri tablosu (1-34).
Tek kaynak: bu tablodan hem data/breeds.json hem assets/dogs/*.webp uretilir.
Alanlar:
  n   : sira no (1-100) -> dosya adi dog_XXX
  tr  : Turkce irk adi
  en  : Ingilizce irk adi
  grp : irk grubu
  org : koken ulke
  rar : nadirlik anahtari (yaygin|seckin|nadir|cok_nadir|efsanevi|mitik)
  size: toy|kucuk|orta|buyuk|dev
  st  : (guc, hiz, dayaniklilik, zeka, ceviklik, savunma) karakter vektoru 0-100
  c1/c2/c3 : ana tuy rengi / ikincil renk (eyer,maske,leke) / ucuncu renk (points, beyaz)
  pat : desen (solid, mask, points, bicolor, tricolor, saddle, brindle, merle,
        patched, harlequin, ticked, spotted, urajiro, blanket)
  fur : tuy uzunlugu 0..1      fluff: tuy hacmi 0..1
  ear : kulak tipi (prick, semi, floppy, rose, bat, button, folded, tiny)
  muz : burun uzunlugu 0..1    muzW: burun genisligi 0..1
  head: wedge|round|square|domed|narrow|egg
  build: slim|athletic|stocky|bulky
  eye : goz rengi
  wrk : kirisiklik 0..1        flews: sarkik dudak 0..1
  mane: boyun yelesi 0..1      beard: sakal/biyik 0..1
  cords: ip tuy (Komondor) 0..1  topknot: bas tutami 0..1
  desc: Turkce aciklama
  ab  : (yetenek adi, tur, carpan, deger, bekleme, aciklama)
"""


def B(**kw):
    return kw


BREEDS_A = [
    B(n=1, tr="Kangal", en="Kangal Shepherd Dog", grp="Çoban / Bekçi", org="Türkiye",
      rar="mitik", size="dev", st=(88, 62, 95, 72, 52, 92),
      c1="#cbb387", c2="#3a2c22", c3="#e8dcc0", pat="mask", fur=.22, fluff=.30,
      ear="folded", muz=.80, muzW=.62, head="wedge", build="bulky", eye="#8a5a2b",
      wrk=.10, mane=.25,
      desc="Anadolu'nun dev sürü koruyucusu; kurtlara tek başına karşı koyabilmesiyle dünyaca ünlüdür.",
      ab=("Sürü Kalkanı", "guard", 0, 25, 3,
          "Kendine ve en düşük canlı müttefike 3 tur boyunca %25 hasar kalkanı uygular.")),

    B(n=2, tr="Alman Çoban Köpeği", en="German Shepherd", grp="Çoban / Çalışma", org="Almanya",
      rar="efsanevi", size="büyük", st=(85, 78, 88, 95, 80, 82),
      c1="#b98a4e", c2="#2a2622", c3="#e0c9a0", pat="saddle", fur=.45, fluff=.45,
      ear="prick", muz=.78, muzW=.58, head="wedge", build="athletic", eye="#7a4a20",
      mane=.45,
      desc="Dünyanın en çok yönlü çalışan köpeği; polis, arama-kurtarma ve koruma görevlerinin vazgeçilmezi.",
      ab=("Emir Komuta", "howl", 0, 22, 3, "Tüm takıma 3 tur boyunca %22 saldırı artışı sağlar.")),

    B(n=3, tr="Belçika Malinois", en="Belgian Malinois", grp="Çoban / Çalışma", org="Belçika",
      rar="efsanevi", size="büyük", st=(84, 92, 84, 92, 90, 72),
      c1="#c1873f", c2="#1e1a17", c3="#e6d3ab", pat="mask", fur=.20, fluff=.20,
      ear="prick", muz=.82, muzW=.55, head="wedge", build="athletic", eye="#6d4a1f",
      desc="Sınırsız enerjisi ve odaklanmasıyla özel kuvvetlerin bir numaralı tercih ettiği ırk.",
      ab=("Yıldırım Baskını", "strike", 2.1, 0, 2,
          "Hedefe %210 hasar verir; bu hamle tur sıralamasında her zaman ilk yapılır.")),

    B(n=4, tr="Rottweiler", en="Rottweiler", grp="Bekçi / Çalışma", org="Almanya",
      rar="çok_nadir", size="büyük", st=(92, 58, 90, 74, 55, 93),
      c1="#231a17", c2="#231a17", c3="#a8632c", pat="points", fur=.18, fluff=.18,
      ear="rose", muz=.55, muzW=.80, head="square", build="bulky", eye="#4a2b16",
      wrk=.25, flews=.35,
      desc="Roma lejyonlarının sürü köpeklerinden miras kalan, kaslı ve kendinden emin bir koruyucu.",
      ab=("Demir Yumruk", "strike", 1.95, 0, 2, "%195 hasar verir, %30 şansla hedefi 1 tur sersemletir.")),

    B(n=5, tr="Doberman Pinscher", en="Doberman Pinscher", grp="Bekçi", org="Almanya",
      rar="çok_nadir", size="büyük", st=(88, 93, 78, 88, 90, 70),
      c1="#1d1a1c", c2="#1d1a1c", c3="#b06a2c", pat="points", fur=.10, fluff=.08,
      ear="prick", muz=.90, muzW=.48, head="wedge", build="slim", eye="#5a3418",
      desc="Zarif, korkusuz ve son derece sadık; dünyanın en hızlı koruma köpeklerinden biri.",
      ab=("Keskin Nişan", "pierce", 1.7, 40, 2, "Hedefin savunmasının %40'ını yok sayarak %170 hasar verir.")),

    B(n=6, tr="Sibirya Kurdu", en="Siberian Husky", grp="Kızak / Spitz", org="Rusya (Sibirya)",
      rar="çok_nadir", size="orta", st=(78, 90, 95, 72, 84, 68),
      c1="#b9bec6", c2="#4a5560", c3="#f2f4f7", pat="bicolor", fur=.50, fluff=.60,
      ear="prick", muz=.70, muzW=.55, head="wedge", build="athletic", eye="#6fc7e8",
      mane=.55,
      desc="Buzulların kızak köpeği; dayanıklılığı, maskesi ve buz mavisi gözleriyle efsaneleşmiştir.",
      ab=("Kutup Uluması", "rally", 0, 18, 3, "Takımın hızını %18 artırır ve bir köpeğe ekstra hamle şansı verir.")),

    B(n=7, tr="Golden Retriever", en="Golden Retriever", grp="Av / Getirici", org="İskoçya",
      rar="seçkin", size="büyük", st=(72, 74, 84, 88, 76, 70),
      c1="#d9a94f", c2="#e8c783", c3="#f6e6c4", pat="solid", fur=.55, fluff=.50,
      ear="floppy", muz=.72, muzW=.58, head="wedge", build="athletic", eye="#4a2f14",
      mane=.35,
      desc="Altın rengi tüyleri ve sonsuz sabrıyla ailelerin en sevdiği, yumuşak huylu dost.",
      ab=("Sadık Kalp", "heal", 0, 22, 3, "En düşük canlı müttefikin canını %22 oranında yeniler.")),

    B(n=8, tr="Labrador Retriever", en="Labrador Retriever", grp="Av / Getirici", org="Kanada",
      rar="yaygın", size="büyük", st=(74, 72, 88, 84, 72, 74),
      c1="#d3a552", c2="#c08f3c", c3="#efd9a8", pat="solid", fur=.30, fluff=.28,
      ear="floppy", muz=.74, muzW=.62, head="square", build="athletic", eye="#4b2f14",
      desc="Suda çalışmak için doğmuş, neşeli, zeki ve dünyanın en popüler aile köpeği.",
      ab=("Getir!", "drain", 1.4, 50, 2, "%140 hasar verir ve verdiği hasarın %50'sini can olarak emer.")),

    B(n=9, tr="Border Collie", en="Border Collie", grp="Çoban", org="İngiltere / İskoçya",
      rar="nadir", size="orta", st=(66, 92, 90, 99, 95, 62),
      c1="#1f2124", c2="#1f2124", c3="#f4f1ea", pat="bicolor", fur=.45, fluff=.40,
      ear="semi", muz=.76, muzW=.52, head="wedge", build="slim", eye="#8a5a20",
      mane=.40, blaze=1,
      desc="Dünyanın en zeki köpeği; tek bakışıyla koca bir sürüyü yönlendirebilir.",
      ab=("Göz Hapsi", "stun", 0.6, 0, 3, "%60 hasar verir ve hedefi hipnotize ederek 1 tur kilitler.")),

    B(n=10, tr="Cane Corso", en="Cane Corso", grp="Bekçi / Mastiff", org="İtalya",
      rar="efsanevi", size="dev", st=(94, 66, 92, 76, 60, 94),
      c1="#4a3a2c", c2="#221a14", c3="#d9cbb8", pat="brindle", fur=.15, fluff=.15,
      ear="folded", muz=.58, muzW=.85, head="square", build="bulky", eye="#4a3220",
      wrk=.20, flews=.45,
      desc="Roma savaş köpeklerinin torunu; sessiz, son derece güçlü ve mutlak bir koruyucu.",
      ab=("Roma Duvarı", "fortify", 0, 30, 4, "Kendine %30 savunma artışı ve 3 tur boyunca can yenilenmesi sağlar.")),

    B(n=11, tr="Amerikan Pitbull Terrier", en="American Pit Bull Terrier", grp="Terrier", org="ABD",
      rar="nadir", size="orta", st=(90, 76, 86, 70, 72, 80),
      c1="#9c6b45", c2="#7d5234", c3="#e8dcc8", pat="solid", fur=.10, fluff=.08,
      ear="rose", muz=.50, muzW=.80, head="square", build="stocky", eye="#5a3a1c",
      desc="Sarsılmaz cesareti, geniş göğsü ve atletik yapısıyla tanınan güçlü bir terrier.",
      ab=("Yılmaz Saldırı", "execute", 1.8, 0, 2, "%180 hasar verir; hedefin canı %40'ın altındaysa hasar %60 artar.")),

    B(n=12, tr="Akita İnu", en="Akita Inu", grp="Spitz / Bekçi", org="Japonya",
      rar="efsanevi", size="dev", st=(88, 68, 92, 80, 64, 90),
      c1="#d98f3c", c2="#b06a24", c3="#f6efe2", pat="urajiro", fur=.60, fluff=.65,
      ear="prick", muz=.60, muzW=.70, head="round", build="bulky", eye="#3d2a14",
      mane=.70,
      desc="Japonya'nın onur sembolü; Hachiko'nun sadakatiyle tüm dünyaya mal olmuş bir ırk.",
      ab=("Onur Yemini", "counter", 1.2, 0, 3, "3 tur boyunca aldığı hasarın %40'ını saldırgana yansıtır.")),

    B(n=13, tr="Samoyed", en="Samoyed", grp="Spitz / Kızak", org="Rusya (Sibirya)",
      rar="nadir", size="büyük", st=(66, 76, 90, 82, 72, 72),
      c1="#f7f4ee", c2="#e8e2d6", c3="#ffffff", pat="solid", fur=.70, fluff=.85,
      ear="prick", muz=.60, muzW=.60, head="round", build="athletic", eye="#3a2a1c",
      mane=.85,
      desc="Sibirya'nın gülümseyen beyaz bulutu; kutup soğuğuna meydan okuyan bir kızak köpeği.",
      ab=("Kutup Gülüşü", "heal", 0, 24, 3, "En düşük canlı müttefike %24 can yeniler ve takım moralini artırır.")),

    B(n=14, tr="Chow Chow", en="Chow Chow", grp="Spitz / Bekçi", org="Çin",
      rar="çok_nadir", size="büyük", st=(78, 52, 88, 72, 48, 88),
      c1="#c8873f", c2="#a86a2c", c3="#e6c9a0", pat="solid", fur=.80, fluff=.95,
      ear="tiny", muz=.35, muzW=.85, head="round", build="bulky", eye="#3a2410",
      mane=.90, tongue="blue",
      desc="Aslan yelesi ve mavi diliyle Çin saraylarının gizemli, mesafeli bekçisi.",
      ab=("Aslan Yelesi", "guard", 0, 28, 4, "Kendine %28 kalkan uygular ve düşman saldırılarını üzerine çeker.")),

    B(n=15, tr="Beagle", en="Beagle", grp="Av / Koku", org="İngiltere",
      rar="yaygın", size="küçük", st=(58, 72, 74, 80, 76, 60),
      c1="#ffffff", c2="#2b2118", c3="#b5762f", pat="tricolor", fur=.15, fluff=.12,
      ear="floppy", muz=.55, muzW=.60, head="domed", build="stocky", eye="#4a2c12",
      flews=.45,
      desc="Burnuyla iz süren, neşeli, inatçı ve her zaman bir koku peşinde olan av köpeği.",
      ab=("İz Sürme", "pierce", 1.5, 30, 2, "Savunmanın %30'unu yok sayar ve %150 hasar verir.")),

    B(n=16, tr="Dogo Argentino", en="Dogo Argentino", grp="Av / Bekçi", org="Arjantin",
      rar="mitik", size="büyük", st=(92, 84, 90, 76, 80, 84),
      c1="#f4f2ee", c2="#dcd8d0", c3="#ffffff", pat="solid", fur=.10, fluff=.10,
      ear="folded", muz=.60, muzW=.75, head="square", build="athletic", eye="#3a2a1c",
      desc="Arjantin'in bembeyaz avcısı; büyük avlara karşı sürü hâlinde savaşmak için yetiştirildi.",
      ab=("Beyaz Avcı", "aoe", 1.0, 0, 3, "Tüm düşmanlara %100 hasar verir ve %20 kanama uygular.")),

    B(n=17, tr="İngiliz Mastiff", en="English Mastiff", grp="Mastiff", org="İngiltere",
      rar="efsanevi", size="dev", st=(98, 40, 95, 66, 40, 98),
      c1="#c19a5c", c2="#2a2118", c3="#d9c39a", pat="mask", fur=.18, fluff=.20,
      ear="rose", muz=.45, muzW=.95, head="square", build="bulky", eye="#4a3018",
      wrk=.35, flews=.80,
      desc="Devasa cüssesi ve ağır kemik yapısıyla tarihin en büyük köpek ırklarından biri.",
      ab=("Dev Gövde", "fortify", 0, 38, 4, "%38 savunma artışı ve tur başına %6 can yenilenmesi sağlar.")),

    B(n=18, tr="Shiba Inu", en="Shiba Inu", grp="Spitz", org="Japonya",
      rar="seçkin", size="küçük", st=(62, 82, 76, 84, 88, 64),
      c1="#d1793a", c2="#b5622a", c3="#f7f0e2", pat="urajiro", fur=.45, fluff=.40,
      ear="prick", muz=.55, muzW=.58, head="round", build="athletic", eye="#3a2410",
      mane=.45,
      desc="Japonya'nın küçük ama gururlu ulusal hazinesi; tilkiyi andıran keskin bir yüzü vardır.",
      ab=("Çevik Atak", "strike", 1.6, 0, 1, "Hızlı bir atakla %160 hasar verir; bekleme süresi çok kısadır.")),

    B(n=19, tr="Pomeranian", en="Pomeranian", grp="Oyuncak / Spitz", org="Polonya / Almanya",
      rar="yaygın", size="toy", st=(40, 72, 58, 82, 86, 44),
      c1="#e08a3c", c2="#c06f28", c3="#f6e2c0", pat="solid", fur=.85, fluff=.95,
      ear="tiny", muz=.25, muzW=.50, head="round", build="stocky", eye="#2a1a0c",
      mane=.80, topknot=.6,
      desc="Tilki suratlı minik bir tüy topu; boyundan çok büyük bir karaktere sahiptir.",
      ab=("Minik Havlama", "stun", 1.0, 0, 3, "%100 hasar verir, %35 şansla hedefi 1 tur sersemletir.")),

    B(n=20, tr="Danua", en="Great Dane", grp="Çalışma / Dev", org="Almanya",
      rar="çok_nadir", size="dev", st=(90, 72, 88, 78, 70, 86),
      c1="#f2f0ea", c2="#23262b", c3="#ffffff", pat="harlequin", fur=.12, fluff=.12,
      ear="folded", muz=.80, muzW=.70, head="narrow", build="athletic", eye="#4a3418",
      desc="Köpeklerin Apollon'u; dev boyuna rağmen son derece zarif ve nazik bir dev.",
      ab=("Dev Adım", "execute", 1.9, 0, 3, "%190 hasar verir; hedef kendinden küçükse %25 ek hasar uygular.")),

    B(n=21, tr="Bern Dağ Köpeği", en="Bernese Mountain Dog", grp="Çoban / Dağ", org="İsviçre",
      rar="çok_nadir", size="dev", st=(88, 58, 94, 80, 56, 90),
      c1="#21191a", c2="#b5712f", c3="#ffffff", pat="tricolor", fur=.70, fluff=.70,
      ear="floppy", muz=.65, muzW=.68, head="square", build="bulky", eye="#3a2410",
      mane=.60, blaze=1,
      desc="İsviçre Alpleri'nin üç renkli devi; eskiden yük arabası çeken güçlü bir çiftlik köpeğiydi.",
      ab=("Alp Gücü", "strike", 1.85, 0, 2, "%185 hasar verir, %25 şansla hedefin sırasını bir tur kaybettirir.")),

    B(n=22, tr="Boxer", en="Boxer", grp="Çalışma", org="Almanya",
      rar="seçkin", size="büyük", st=(84, 80, 84, 76, 78, 78),
      c1="#c07a34", c2="#2a1e16", c3="#f0e4d2", pat="brindle", fur=.12, fluff=.12,
      ear="floppy", muz=.35, muzW=.90, head="square", build="athletic", eye="#3a2410",
      wrk=.20, flews=.50,
      desc="Oyuncu ruhu, kaslı gövdesi ve hiç bitmeyen enerjisiyle büyümeyen bir savaşçı.",
      ab=("Boksör Kombosu", "strike", 1.3, 0, 1, "%130 hasar verir; düşük bekleme süresiyle sık sık kullanılabilir.")),

    B(n=23, tr="Avustralya Çoban Köpeği", en="Australian Shepherd", grp="Çoban", org="ABD",
      rar="nadir", size="orta", st=(70, 88, 88, 94, 90, 68),
      c1="#4a4f57", c2="#d9c9a8", c3="#f4f1ea", pat="merle", fur=.45, fluff=.45,
      ear="semi", muz=.72, muzW=.54, head="wedge", build="athletic", eye="#7fc9e0",
      mane=.45, blaze=1,
      desc="Sınırsız enerjili, göz alıcı merle tüylü, gerçek bir çiftlik ve çeviklik ustası.",
      ab=("Sürü Yönetimi", "rally", 0, 20, 3, "Takımın hızını %20 artırır ve bir müttefike ekstra hamle verir.")),

    B(n=24, tr="İngiliz Springer Spaniel", en="English Springer Spaniel", grp="Av", org="İngiltere",
      rar="yaygın", size="orta", st=(62, 80, 80, 84, 82, 64),
      c1="#ffffff", c2="#4a3121", c3="#f2e8da", pat="patched", fur=.55, fluff=.50,
      ear="floppy", muz=.68, muzW=.56, head="domed", build="athletic", eye="#4a2c12",
      mane=.35,
      desc="Avı kaldırıp getiren, kuyruğu hiç durmayan, her zaman hevesli bir spaniel.",
      ab=("Çalı Baskını", "strike", 1.55, 0, 2, "%155 hasar verir ve hedefe 2 tur %20 kanama uygular.")),

    B(n=25, tr="Cocker Spaniel", en="Cocker Spaniel", grp="Av", org="İngiltere",
      rar="yaygın", size="küçük", st=(54, 72, 70, 84, 80, 58),
      c1="#b5762f", c2="#96601f", c3="#e8cfa4", pat="solid", fur=.70, fluff=.60,
      ear="floppy", muz=.55, muzW=.58, head="domed", build="stocky", eye="#3a2410",
      mane=.45,
      desc="İpeksi uzun kulakları ve tatlı bakışıyla ünlü, neşeli bir av ve aile köpeği.",
      ab=("Tatlı Bakış", "heal", 0, 18, 3, "Bir müttefike %18 can yeniler, düşmanın hasarını 1 tur %10 azaltır.")),

    B(n=26, tr="Dalmaçyalı", en="Dalmatian", grp="Refakat / Av", org="Hırvatistan",
      rar="nadir", size="büyük", st=(68, 90, 88, 78, 88, 66),
      c1="#f6f4ef", c2="#1e1e22", c3="#ffffff", pat="spotted", fur=.12, fluff=.12,
      ear="floppy", muz=.78, muzW=.52, head="wedge", build="athletic", eye="#4a3418",
      desc="Beyaz tüylerine serpilmiş siyah benekleriyle dünyanın en tanınan ırklarından biri.",
      ab=("Benekli Hız", "rally", 0, 22, 2, "Kendi hızını %22 artırır ve ekstra hamle yapma şansı verir.")),

    B(n=27, tr="Saint Bernard", en="Saint Bernard", grp="Çalışma / Dağ", org="İsviçre",
      rar="efsanevi", size="dev", st=(94, 44, 96, 78, 44, 94),
      c1="#f2ece0", c2="#b5712f", c3="#2a2118", pat="patched", fur=.70, fluff=.80,
      ear="floppy", muz=.50, muzW=.95, head="square", build="bulky", eye="#3a2410",
      wrk=.30, flews=.70, mane=.55,
      desc="Alplerin kar fırtınasında kaybolan insanları arayan efsanevi kurtarma devi.",
      ab=("Kurtarma", "heal", 0, 34, 4, "En düşük canlı müttefike %34 can yeniler ve %15 kalkan verir.")),

    B(n=28, tr="Newfoundland", en="Newfoundland", grp="Çalışma / Su", org="Kanada",
      rar="efsanevi", size="dev", st=(92, 48, 98, 80, 46, 92),
      c1="#231d1a", c2="#3a302a", c3="#4a3d34", pat="solid", fur=.85, fluff=.90,
      ear="floppy", muz=.60, muzW=.90, head="square", build="bulky", eye="#3a2410",
      flews=.60, mane=.70,
      desc="Suda can kurtarmak için yaratılmış, devasa cüsseli ve inanılmaz nazik bir köpek.",
      ab=("Can Simidi", "guard", 0, 30, 3, "Takımın en zayıf üyesine %30 kalkan uygular ve taunt çeker.")),

    B(n=29, tr="Alaskan Malamute", en="Alaskan Malamute", grp="Kızak / Spitz", org="ABD (Alaska)",
      rar="efsanevi", size="dev", st=(90, 68, 98, 72, 64, 88),
      c1="#7d8794", c2="#5a6472", c3="#f4f2ec", pat="bicolor", fur=.75, fluff=.80,
      ear="prick", muz=.68, muzW=.70, head="wedge", build="bulky", eye="#6b4a22",
      mane=.75,
      desc="Kutup yüklerini kilometrelerce çeken, kurt görünümlü güçlü bir kızak atleti.",
      ab=("Kutup Fırtınası", "aoe", 0.95, 0, 3, "Tüm düşmanlara %95 hasar verir ve hızlarını 2 tur %10 azaltır.")),

    B(n=30, tr="Basset Hound", en="Basset Hound", grp="Av / Koku", org="Fransa",
      rar="seçkin", size="küçük", st=(52, 38, 84, 76, 42, 72),
      c1="#ffffff", c2="#b5762f", c3="#2a2118", pat="tricolor", fur=.15, fluff=.15,
      ear="floppy", muz=.60, muzW=.70, head="domed", build="stocky", eye="#4a2c12",
      wrk=.35, flews=.80,
      desc="Yere değen uzun kulakları ve hüzünlü bakışıyla gerçek bir koku dahisi.",
      ab=("Koku İzci", "pierce", 1.45, 45, 2, "Savunmanın %45'ini yok sayarak %145 hasar verir.")),

    B(n=31, tr="Bloodhound", en="Bloodhound", grp="Av / Koku", org="Belçika",
      rar="nadir", size="dev", st=(60, 52, 96, 74, 44, 78),
      c1="#8a4a24", c2="#5a2f16", c3="#a86a3a", pat="saddle", fur=.18, fluff=.18,
      ear="floppy", muz=.70, muzW=.72, head="domed", build="bulky", eye="#3a2410",
      wrk=.60, flews=.95,
      desc="Dünyanın en keskin burnu; günler öncesinden kalma bir izi bile sürer.",
      ab=("Kaybolmayan İz", "stun", 1.2, 0, 3,
          "%120 hasar verir; hedefin kritik yapma şansını 2 tur boyunca %50 azaltır.")),

    B(n=32, tr="Bull Terrier", en="Bull Terrier", grp="Terrier", org="İngiltere",
      rar="nadir", size="orta", st=(86, 74, 90, 68, 66, 84),
      c1="#f2efe8", c2="#2a2a2e", c3="#ffffff", pat="patched", fur=.10, fluff=.10,
      ear="prick", muz=.55, muzW=.62, head="egg", build="stocky", eye="#2a1a0c",
      desc="Yumurta şeklindeki benzersiz kafası ve kaslı gövdesiyle gerçek bir gladyatör.",
      ab=("Gladyatör", "counter", 1.3, 0, 3, "Aldığı hasarın %45'ini yansıtır ve %130 hasarla karşı saldırır.")),

    B(n=33, tr="Fransız Bulldog", en="French Bulldog", grp="Refakat", org="Fransa",
      rar="seçkin", size="küçük", st=(66, 54, 80, 78, 58, 76),
      c1="#8a8f96", c2="#2a2a2e", c3="#f0e8dc", pat="brindle", fur=.10, fluff=.10,
      ear="bat", muz=.22, muzW=.95, head="round", build="stocky", eye="#2a1a0c",
      wrk=.45, flews=.40,
      desc="Yarasa kulakları ve sevimli suratıyla şehir hayatının inatçı maskotu.",
      ab=("Küçük Dev", "guard", 0, 24, 3, "Kendine %24 kalkan uygular ve düşman saldırılarını üzerine çeker.")),

    B(n=34, tr="İngiliz Bulldog", en="English Bulldog", grp="Refakat", org="İngiltere",
      rar="seçkin", size="orta", st=(72, 42, 90, 72, 44, 84),
      c1="#e8dcc4", c2="#b5762f", c3="#ffffff", pat="patched", fur=.10, fluff=.10,
      ear="rose", muz=.18, muzW=1.0, head="square", build="stocky", eye="#2a1a0c",
      wrk=.70, flews=.80,
      desc="Kıvrımlı yüzü, ağır gövdesi ve inatçı mizacıyla İngiltere'nin ulusal sembolü.",
      ab=("İnatçı Duruş", "fortify", 0, 32, 4, "%32 savunma artışı sağlar ve 3 tur boyunca can yeniler.")),
]
