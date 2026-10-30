/* =============================================================================
   PAW LEGENDS — cok dilli arayuz motoru (11 dil)
   tr (kaynak), en, ru, ar, de, es, fr, pt, zh, ja, az
   Kalip ceviri: I.pats icindeki regex'ler dinamik yazilari da cevirir.
   ========================================================================== */
(function (root) {
  "use strict";
  var PL = root.PL = root.PL || {};
  var I = PL.i18n = { lang: "tr" };

  I.names = {
    tr: "Türkçe", en: "English", ru: "Русский", ar: "العربية", de: "Deutsch",
    es: "Español", fr: "Français", pt: "Português", zh: "中文", ja: "日本語", az: "Azərbaycanca"
  };
  I.list = function () {
    return Object.keys(I.names).map(function (k) { return { code: k, name: I.names[k] }; });
  };

  var D = {};
  D.en = {
    "Üs": "Base", "Köpekler": "Dogs", "Kasa": "Crates", "Arena": "Arena", "Pazar": "Market", "Menü": "Menu",
    "Ayarlar": "Settings", "Koleksiyon": "Collection", "Kasalar": "Crates", "Arena — 4'e 4": "Arena — 4v4",
    "Oyuncular Arası Pazar": "Player Market", "Arkadaşlar": "Friends", "Günlük Görevler": "Daily Quests",
    "Başarımlar & Rozetler": "Achievements & Badges", "Etkinlikler": "Events", "Sıralama Tablosu": "Leaderboard",
    "Profil": "Profile", "Envanter": "Inventory", "Bildirimler": "Notifications", "Yardım & Rehber": "Help & Guide",
    "Çiftleştirme & Genetik": "Breeding & Genetics", "Köpek": "Dog",
    "Ses": "Sound", "Arka plan müziği": "Background music", "Efekt sesleri": "Sound effects",
    "Müzik seviyesi": "Music volume", "Efekt seviyesi": "Effects volume",
    "Görüntü & Erişilebilirlik": "Graphics & Accessibility", "Grafik kalitesi": "Graphics quality",
    "Animasyonları azalt": "Reduce animations", "Bildirimler": "Notifications", "Dil": "Language",
    "Arayüz dili": "Interface language", "Bağlantı": "Connection", "Mod": "Mode", "Bağlan": "Connect",
    "Ayrıl": "Disconnect", "Hakkında": "About", "Yerel / çevrimdışı": "Local / offline",
    "Satın Al": "Buy", "Aç": "Open", "Kapat": "Close", "Geri": "Back", "Kaydet": "Save", "Yenile": "Refresh",
    "Topla": "Collect", "Savaş!": "Battle!", "Eğit": "Train", "Besle": "Feed", "Dinlendir": "Rest",
    "İlan Ver": "List", "Pazardan Çek": "Unlist", "Çiftleştir": "Breed", "Gönder": "Send", "Kabul Et": "Accept",
    "Reddet": "Reject", "Ekle": "Add", "Sil": "Delete", "İptal": "Cancel", "Tamam": "OK",
    "Seviye": "Level", "Enerji": "Energy", "Puan": "Points", "Elo": "Elo", "Galibiyet": "Wins", "Yenilgi": "Losses",
    "Berabere": "Draws", "Irk": "Breed", "Nadirlik": "Rarity", "Yaş": "Age", "Cinsiyet": "Sex", "Erkek": "Male",
    "Dişi": "Female", "Yavru": "Puppy", "Genç": "Young", "Yetişkin": "Adult", "Usta": "Master", "Yaşlı": "Senior",
    "Fiyat": "Price", "Üretim": "Production", "Güç": "Power", "Hız": "Speed", "Dayanıklılık": "Stamina",
    "Zekâ": "Intelligence", "Çeviklik": "Agility", "Savunma": "Defense",
    "Şu an yavru yok.": "No puppies right now.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Puppies cannot battle until they grow up (first 4 hours). Battle-ready dogs are listed below.",
    "Sv {0}": "Lv {0}", "{0}G / {1}M / {2}B": "{0}W / {1}L / {2}D",
    "Düşük": "Low", "Orta": "Medium", "Yüksek": "High", "Ultra": "Ultra"
  };
  D.ru = {
    "Üs": "База", "Köpekler": "Собаки", "Kasa": "Ящики", "Arena": "Арена", "Pazar": "Рынок", "Menü": "Меню",
    "Ayarlar": "Настройки", "Koleksiyon": "Коллекция", "Kasalar": "Ящики", "Arena — 4'e 4": "Арена — 4 на 4",
    "Oyuncular Arası Pazar": "Рынок игроков", "Arkadaşlar": "Друзья", "Günlük Görevler": "Ежедневные задания",
    "Başarımlar & Rozetler": "Достижения и значки", "Etkinlikler": "События", "Sıralama Tablosu": "Таблица лидеров",
    "Profil": "Профиль", "Envanter": "Инвентарь", "Bildirimler": "Уведомления", "Yardım & Rehber": "Помощь и гид",
    "Çiftleştirme & Genetik": "Разведение и генетика", "Köpek": "Собака",
    "Ses": "Звук", "Arka plan müziği": "Фоновая музыка", "Efekt sesleri": "Звуковые эффекты",
    "Müzik seviyesi": "Громкость музыки", "Efekt seviyesi": "Громкость эффектов",
    "Görüntü & Erişilebilirlik": "Графика и доступность", "Grafik kalitesi": "Качество графики",
    "Animasyonları azalt": "Меньше анимаций", "Bildirimler": "Уведомления", "Dil": "Язык",
    "Arayüz dili": "Язык интерфейса", "Bağlantı": "Подключение", "Mod": "Режим", "Bağlan": "Подключиться",
    "Ayrıl": "Отключиться", "Hakkında": "О игре", "Yerel / çevrimdışı": "Локально / офлайн",
    "Satın Al": "Купить", "Aç": "Открыть", "Kapat": "Закрыть", "Geri": "Назад", "Kaydet": "Сохранить",
    "Yenile": "Обновить", "Topla": "Собрать", "Savaş!": "В бой!", "Eğit": "Тренировать", "Besle": "Кормить",
    "Dinlendir": "Отдых", "İlan Ver": "Выставить", "Pazardan Çek": "Снять", "Çiftleştir": "Развести",
    "Gönder": "Отправить", "Kabul Et": "Принять", "Reddet": "Отклонить", "Ekle": "Добавить", "Sil": "Удалить",
    "İptal": "Отмена", "Tamam": "ОК",
    "Seviye": "Уровень", "Enerji": "Энергия", "Puan": "Очки", "Elo": "Эло", "Galibiyet": "Победы",
    "Yenilgi": "Поражения", "Berabere": "Ничьи", "Irk": "Порода", "Nadirlik": "Редкость", "Yaş": "Возраст",
    "Cinsiyet": "Пол", "Erkek": "Самец", "Dişi": "Самка", "Yavru": "Щенок", "Genç": "Юный", "Yetişkin": "Взрослый",
    "Usta": "Мастер", "Yaşlı": "Старший", "Fiyat": "Цена", "Üretim": "Производство", "Güç": "Сила",
    "Hız": "Скорость", "Dayanıklılık": "Выносливость", "Zekâ": "Интеллект", "Çeviklik": "Ловкость",
    "Savunma": "Защита",
    "Şu an yavru yok.": "Сейчас щенков нет.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Щенки не сражаются, пока не вырастут (первые 4 часа). Боевые собаки перечислены ниже.",
    "Sv {0}": "Ур. {0}", "{0}G / {1}M / {2}B": "{0}П / {1}ПОР / {2}Н",
    "Düşük": "Низкое", "Orta": "Среднее", "Yüksek": "Высокое", "Ultra": "Ультра"
  };
  D.ar = {
    "Üs": "القاعدة", "Köpekler": "الكلاب", "Kasa": "الصناديق", "Arena": "الحلبة", "Pazar": "السوق", "Menü": "القائمة",
    "Ayarlar": "الإعدادات", "Koleksiyon": "المجموعة", "Kasalar": "الصناديق", "Arena — 4'e 4": "الحلبة — 4 ضد 4",
    "Oyuncular Arası Pazar": "سوق اللاعبين", "Arkadaşlar": "الأصدقاء", "Günlük Görevler": "المهام اليومية",
    "Başarımlar & Rozetler": "الإنجازات والأوسمة", "Etkinlikler": "الفعاليات", "Sıralama Tablosu": "لوحة الصدارة",
    "Profil": "الملف", "Envanter": "الحقيبة", "Bildirimler": "الإشعارات", "Yardım & Rehber": "المساعدة والدليل",
    "Çiftleştirme & Genetik": "التزاوج والوراثة", "Köpek": "كلب",
    "Ses": "الصوت", "Arka plan müziği": "موسيقى الخلفية", "Efekt sesleri": "المؤثرات الصوتية",
    "Müzik seviyesi": "مستوى الموسيقى", "Efekt seviyesi": "مستوى المؤثرات",
    "Görüntü & Erişilebilirlik": "الرسوم والوصول", "Grafik kalitesi": "جودة الرسوم",
    "Animasyonları azalt": "تقليل الحركة", "Bildirimler": "الإشعارات", "Dil": "اللغة",
    "Arayüz dili": "لغة الواجهة", "Bağlantı": "الاتصال", "Mod": "الوضع", "Bağlan": "اتصال",
    "Ayrıl": "قطع", "Hakkında": "حول", "Yerel / çevrimdışı": "محلي / دون اتصال",
    "Satın Al": "شراء", "Aç": "فتح", "Kapat": "إغلاق", "Geri": "رجوع", "Kaydet": "حفظ", "Yenile": "تحديث",
    "Topla": "اجمع", "Savaş!": "قاتل!", "Eğit": "درّب", "Besle": "أطعم", "Dinlendir": "أرح",
    "İlan Ver": "أعلن", "Pazardan Çek": "اسحب", "Çiftleştir": "زاوج", "Gönder": "أرسل", "Kabul Et": "اقبل",
    "Reddet": "ارفض", "Ekle": "أضف", "Sil": "احذف", "İptal": "إلغاء", "Tamam": "حسناً",
    "Seviye": "المستوى", "Enerji": "الطاقة", "Puan": "النقاط", "Elo": "إيلو", "Galibiyet": "فوز",
    "Yenilgi": "خسارة", "Berabere": "تعادل", "Irk": "سلالة", "Nadirlik": "الندرة", "Yaş": "العمر",
    "Cinsiyet": "الجنس", "Erkek": "ذكر", "Dişi": "أنثى", "Yavru": "جرو", "Genç": "يافع", "Yetişkin": "بالغ",
    "Usta": "خبير", "Yaşlı": "مسن", "Fiyat": "السعر", "Üretim": "الإنتاج", "Güç": "قوة", "Hız": "سرعة",
    "Dayanıklılık": "تحمل", "Zekâ": "ذكاء", "Çeviklik": "رشاقة", "Savunma": "دفاع",
    "Şu an yavru yok.": "لا جراء حالياً.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 الجراء لا تقاتل حتى تكبر (أول 4 ساعات). الكلاب الجاهزة للقتال بالأسفل.",
    "Sv {0}": "مستوى {0}", "{0}G / {1}M / {2}B": "{0}ف / {1}خ / {2}ت",
    "Düşük": "منخفضة", "Orta": "متوسطة", "Yüksek": "عالية", "Ultra": "فائقة"
  };
  D.de = {
    "Üs": "Basis", "Köpekler": "Hunde", "Kasa": "Kisten", "Arena": "Arena", "Pazar": "Markt", "Menü": "Menü",
    "Ayarlar": "Einstellungen", "Koleksiyon": "Sammlung", "Kasalar": "Kisten", "Arena — 4'e 4": "Arena — 4v4",
    "Oyuncular Arası Pazar": "Spielermarkt", "Arkadaşlar": "Freunde", "Günlük Görevler": "Tagesaufgaben",
    "Başarımlar & Rozetler": "Erfolge & Abzeichen", "Etkinlikler": "Events", "Sıralama Tablosu": "Bestenliste",
    "Profil": "Profil", "Envanter": "Inventar", "Bildirimler": "Benachrichtigungen", "Yardım & Rehber": "Hilfe & Guide",
    "Çiftleştirme & Genetik": "Zucht & Genetik", "Köpek": "Hund",
    "Ses": "Ton", "Arka plan müziği": "Hintergrundmusik", "Efekt sesleri": "Soundeffekte",
    "Müzik seviyesi": "Musiklautstärke", "Efekt seviyesi": "Effektlautstärke",
    "Görüntü & Erişilebilirlik": "Grafik & Barrierefreiheit", "Grafik kalitesi": "Grafikqualität",
    "Animasyonları azalt": "Animationen reduzieren", "Bildirimler": "Benachrichtigungen", "Dil": "Sprache",
    "Arayüz dili": "Oberflächensprache", "Bağlantı": "Verbindung", "Mod": "Modus", "Bağlan": "Verbinden",
    "Ayrıl": "Trennen", "Hakkında": "Über", "Yerel / çevrimdışı": "Lokal / offline",
    "Satın Al": "Kaufen", "Aç": "Öffnen", "Kapat": "Schließen", "Geri": "Zurück", "Kaydet": "Speichern",
    "Yenile": "Aktualisieren", "Topla": "Sammeln", "Savaş!": "Kampf!", "Eğit": "Trainieren", "Besle": "Füttern",
    "Dinlendir": "Ausruhen", "İlan Ver": "Inserieren", "Pazardan Çek": "Zurückziehen", "Çiftleştir": "Züchten",
    "Gönder": "Senden", "Kabul Et": "Annehmen", "Reddet": "Ablehnen", "Ekle": "Hinzufügen", "Sil": "Löschen",
    "İptal": "Abbrechen", "Tamam": "OK",
    "Seviye": "Level", "Enerji": "Energie", "Puan": "Punkte", "Elo": "Elo", "Galibiyet": "Siege",
    "Yenilgi": "Niederlagen", "Berabere": "Unentschieden", "Irk": "Rasse", "Nadirlik": "Seltenheit",
    "Yaş": "Alter", "Cinsiyet": "Geschlecht", "Erkek": "Rüde", "Dişi": "Hündin", "Yavru": "Welpe",
    "Genç": "Jung", "Yetişkin": "Erwachsen", "Usta": "Meister", "Yaşlı": "Senior", "Fiyat": "Preis",
    "Üretim": "Produktion", "Güç": "Kraft", "Hız": "Tempo", "Dayanıklılık": "Ausdauer", "Zekâ": "Intelligenz",
    "Çeviklik": "Agilität", "Savunma": "Verteidigung",
    "Şu an yavru yok.": "Aktuell keine Welpen.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Welpen kämpfen erst, wenn sie erwachsen sind (erste 4 Stunden). Kampfbereite Hunde unten.",
    "Sv {0}": "Lv {0}", "{0}G / {1}M / {2}B": "{0}S / {1}N / {2}U",
    "Düşük": "Niedrig", "Orta": "Mittel", "Yüksek": "Hoch", "Ultra": "Ultra"
  };
  D.es = {
    "Üs": "Base", "Köpekler": "Perros", "Kasa": "Cofres", "Arena": "Arena", "Pazar": "Mercado", "Menü": "Menú",
    "Ayarlar": "Ajustes", "Koleksiyon": "Colección", "Kasalar": "Cofres", "Arena — 4'e 4": "Arena — 4v4",
    "Oyuncular Arası Pazar": "Mercado de jugadores", "Arkadaşlar": "Amigos", "Günlük Görevler": "Misiones diarias",
    "Başarımlar & Rozetler": "Logros e insignias", "Etkinlikler": "Eventos", "Sıralama Tablosu": "Clasificación",
    "Profil": "Perfil", "Envanter": "Inventario", "Bildirimler": "Avisos", "Yardım & Rehber": "Ayuda y guía",
    "Çiftleştirme & Genetik": "Cría y genética", "Köpek": "Perro",
    "Ses": "Sonido", "Arka plan müziği": "Música de fondo", "Efekt sesleri": "Efectos de sonido",
    "Müzik seviyesi": "Volumen música", "Efekt seviyesi": "Volumen efectos",
    "Görüntü & Erişilebilirlik": "Gráficos y accesibilidad", "Grafik kalitesi": "Calidad gráfica",
    "Animasyonları azalt": "Reducir animaciones", "Bildirimler": "Avisos", "Dil": "Idioma",
    "Arayüz dili": "Idioma de interfaz", "Bağlantı": "Conexión", "Mod": "Modo", "Bağlan": "Conectar",
    "Ayrıl": "Desconectar", "Hakkında": "Acerca de", "Yerel / çevrimdışı": "Local / sin conexión",
    "Satın Al": "Comprar", "Aç": "Abrir", "Kapat": "Cerrar", "Geri": "Atrás", "Kaydet": "Guardar",
    "Yenile": "Actualizar", "Topla": "Recoger", "Savaş!": "¡Lucha!", "Eğit": "Entrenar", "Besle": "Alimentar",
    "Dinlendir": "Descansar", "İlan Ver": "Publicar", "Pazardan Çek": "Retirar", "Çiftleştir": "Criar",
    "Gönder": "Enviar", "Kabul Et": "Aceptar", "Reddet": "Rechazar", "Ekle": "Añadir", "Sil": "Borrar",
    "İptal": "Cancelar", "Tamam": "OK",
    "Seviye": "Nivel", "Enerji": "Energía", "Puan": "Puntos", "Elo": "Elo", "Galibiyet": "Victorias",
    "Yenilgi": "Derrotas", "Berabere": "Empates", "Irk": "Raza", "Nadirlik": "Rareza", "Yaş": "Edad",
    "Cinsiyet": "Sexo", "Erkek": "Macho", "Dişi": "Hembra", "Yavru": "Cachorro", "Genç": "Joven",
    "Yetişkin": "Adulto", "Usta": "Maestro", "Yaşlı": "Senior", "Fiyat": "Precio", "Üretim": "Producción",
    "Güç": "Fuerza", "Hız": "Velocidad", "Dayanıklılık": "Resistencia", "Zekâ": "Inteligencia",
    "Çeviklik": "Agilidad", "Savunma": "Defensa",
    "Şu an yavru yok.": "No hay cachorros ahora.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Los cachorros no luchan hasta crecer (primeras 4 horas). Los perros listos para luchar están abajo.",
    "Sv {0}": "Nv {0}", "{0}G / {1}M / {2}B": "{0}V / {1}D / {2}E",
    "Düşük": "Baja", "Orta": "Media", "Yüksek": "Alta", "Ultra": "Ultra"
  };
  D.fr = {
    "Üs": "Base", "Köpekler": "Chiens", "Kasa": "Coffres", "Arena": "Arène", "Pazar": "Marché", "Menü": "Menu",
    "Ayarlar": "Paramètres", "Koleksiyon": "Collection", "Kasalar": "Coffres", "Arena — 4'e 4": "Arène — 4v4",
    "Oyuncular Arası Pazar": "Marché des joueurs", "Arkadaşlar": "Amis", "Günlük Görevler": "Quêtes du jour",
    "Başarımlar & Rozetler": "Succès et badges", "Etkinlikler": "Événements", "Sıralama Tablosu": "Classement",
    "Profil": "Profil", "Envanter": "Inventaire", "Bildirimler": "Notifications", "Yardım & Rehber": "Aide et guide",
    "Çiftleştirme & Genetik": "Élevage et génétique", "Köpek": "Chien",
    "Ses": "Son", "Arka plan müziği": "Musique de fond", "Efekt sesleri": "Effets sonores",
    "Müzik seviyesi": "Volume musique", "Efekt seviyesi": "Volume effets",
    "Görüntü & Erişilebilirlik": "Graphismes et accessibilité", "Grafik kalitesi": "Qualité graphique",
    "Animasyonları azalt": "Réduire les animations", "Bildirimler": "Notifications", "Dil": "Langue",
    "Arayüz dili": "Langue de l'interface", "Bağlantı": "Connexion", "Mod": "Mode", "Bağlan": "Connecter",
    "Ayrıl": "Déconnecter", "Hakkında": "À propos", "Yerel / çevrimdışı": "Local / hors ligne",
    "Satın Al": "Acheter", "Aç": "Ouvrir", "Kapat": "Fermer", "Geri": "Retour", "Kaydet": "Enregistrer",
    "Yenile": "Actualiser", "Topla": "Collecter", "Savaş!": "Combat !", "Eğit": "Entraîner", "Besle": "Nourrir",
    "Dinlendir": "Reposer", "İlan Ver": "Publier", "Pazardan Çek": "Retirer", "Çiftleştir": "Élever",
    "Gönder": "Envoyer", "Kabul Et": "Accepter", "Reddet": "Refuser", "Ekle": "Ajouter", "Sil": "Supprimer",
    "İptal": "Annuler", "Tamam": "OK",
    "Seviye": "Niveau", "Enerji": "Énergie", "Puan": "Points", "Elo": "Elo", "Galibiyet": "Victoires",
    "Yenilgi": "Défaites", "Berabere": "Nuls", "Irk": "Race", "Nadirlik": "Rareté", "Yaş": "Âge",
    "Cinsiyet": "Sexe", "Erkek": "Mâle", "Dişi": "Femelle", "Yavru": "Chiot", "Genç": "Jeune",
    "Yetişkin": "Adulte", "Usta": "Maître", "Yaşlı": "Senior", "Fiyat": "Prix", "Üretim": "Production",
    "Güç": "Force", "Hız": "Vitesse", "Dayanıklılık": "Endurance", "Zekâ": "Intelligence",
    "Çeviklik": "Agilité", "Savunma": "Défense",
    "Şu an yavru yok.": "Aucun chiot pour le moment.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Les chiots ne combattent qu'une fois adultes (4 premières heures). Chiens prêts au combat ci-dessous.",
    "Sv {0}": "Niv {0}", "{0}G / {1}M / {2}B": "{0}V / {1}D / {2}N",
    "Düşük": "Basse", "Orta": "Moyenne", "Yüksek": "Haute", "Ultra": "Ultra"
  };
  D.pt = {
    "Üs": "Base", "Köpekler": "Cães", "Kasa": "Baús", "Arena": "Arena", "Pazar": "Mercado", "Menü": "Menu",
    "Ayarlar": "Configurações", "Koleksiyon": "Coleção", "Kasalar": "Baús", "Arena — 4'e 4": "Arena — 4v4",
    "Oyuncular Arası Pazar": "Mercado de jogadores", "Arkadaşlar": "Amigos", "Günlük Görevler": "Missões diárias",
    "Başarımlar & Rozetler": "Conquistas e selos", "Etkinlikler": "Eventos", "Sıralama Tablosu": "Classificação",
    "Profil": "Perfil", "Envanter": "Inventário", "Bildirimler": "Notificações", "Yardım & Rehber": "Ajuda e guia",
    "Çiftleştirme & Genetik": "Criação e genética", "Köpek": "Cão",
    "Ses": "Som", "Arka plan müziği": "Música de fundo", "Efekt sesleri": "Efeitos sonoros",
    "Müzik seviyesi": "Volume da música", "Efekt seviyesi": "Volume dos efeitos",
    "Görüntü & Erişilebilirlik": "Gráficos e acessibilidade", "Grafik kalitesi": "Qualidade gráfica",
    "Animasyonları azalt": "Reduzir animações", "Bildirimler": "Notificações", "Dil": "Idioma",
    "Arayüz dili": "Idioma da interface", "Bağlantı": "Conexão", "Mod": "Modo", "Bağlan": "Conectar",
    "Ayrıl": "Desconectar", "Hakkında": "Sobre", "Yerel / çevrimdışı": "Local / offline",
    "Satın Al": "Comprar", "Aç": "Abrir", "Kapat": "Fechar", "Geri": "Voltar", "Kaydet": "Salvar",
    "Yenile": "Atualizar", "Topla": "Coletar", "Savaş!": "Lutar!", "Eğit": "Treinar", "Besle": "Alimentar",
    "Dinlendir": "Descansar", "İlan Ver": "Anunciar", "Pazardan Çek": "Retirar", "Çiftleştir": "Cruzar",
    "Gönder": "Enviar", "Kabul Et": "Aceitar", "Reddet": "Recusar", "Ekle": "Adicionar", "Sil": "Excluir",
    "İptal": "Cancelar", "Tamam": "OK",
    "Seviye": "Nível", "Enerji": "Energia", "Puan": "Pontos", "Elo": "Elo", "Galibiyet": "Vitórias",
    "Yenilgi": "Derrotas", "Berabere": "Empates", "Irk": "Raça", "Nadirlik": "Raridade", "Yaş": "Idade",
    "Cinsiyet": "Sexo", "Erkek": "Macho", "Dişi": "Fêmea", "Yavru": "Filhote", "Genç": "Jovem",
    "Yetişkin": "Adulto", "Usta": "Mestre", "Yaşlı": "Sênior", "Fiyat": "Preço", "Üretim": "Produção",
    "Güç": "Força", "Hız": "Velocidade", "Dayanıklılık": "Vigor", "Zekâ": "Inteligência",
    "Çeviklik": "Agilidade", "Savunma": "Defesa",
    "Şu an yavru yok.": "Sem filhotes agora.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Filhotes não lutam até crescer (primeiras 4 horas). Cães prontos para luta abaixo.",
    "Sv {0}": "Nv {0}", "{0}G / {1}M / {2}B": "{0}V / {1}D / {2}E",
    "Düşük": "Baixa", "Orta": "Média", "Yüksek": "Alta", "Ultra": "Ultra"
  };
  D.zh = {
    "Üs": "基地", "Köpekler": "犬只", "Kasa": "宝箱", "Arena": "竞技场", "Pazar": "市场", "Menü": "菜单",
    "Ayarlar": "设置", "Koleksiyon": "收藏", "Kasalar": "宝箱", "Arena — 4'e 4": "竞技场 — 4v4",
    "Oyuncular Arası Pazar": "玩家市场", "Arkadaşlar": "好友", "Günlük Görevler": "每日任务",
    "Başarımlar & Rozetler": "成就与徽章", "Etkinlikler": "活动", "Sıralama Tablosu": "排行榜",
    "Profil": "资料", "Envanter": "背包", "Bildirimler": "通知", "Yardım & Rehber": "帮助与指南",
    "Çiftleştirme & Genetik": "繁殖与遗传", "Köpek": "狗",
    "Ses": "声音", "Arka plan müziği": "背景音乐", "Efekt sesleri": "音效",
    "Müzik seviyesi": "音乐音量", "Efekt seviyesi": "音效音量",
    "Görüntü & Erişilebilirlik": "画面与无障碍", "Grafik kalitesi": "画质",
    "Animasyonları azalt": "减少动画", "Bildirimler": "通知", "Dil": "语言",
    "Arayüz dili": "界面语言", "Bağlantı": "连接", "Mod": "模式", "Bağlan": "连接",
    "Ayrıl": "断开", "Hakkında": "关于", "Yerel / çevrimdışı": "本地 / 离线",
    "Satın Al": "购买", "Aç": "打开", "Kapat": "关闭", "Geri": "返回", "Kaydet": "保存",
    "Yenile": "刷新", "Topla": "领取", "Savaş!": "战斗！", "Eğit": "训练", "Besle": "喂食",
    "Dinlendir": "休息", "İlan Ver": "上架", "Pazardan Çek": "下架", "Çiftleştir": "繁殖",
    "Gönder": "发送", "Kabul Et": "接受", "Reddet": "拒绝", "Ekle": "添加", "Sil": "删除",
    "İptal": "取消", "Tamam": "好",
    "Seviye": "等级", "Enerji": "能量", "Puan": "积分", "Elo": "Elo", "Galibiyet": "胜",
    "Yenilgi": "负", "Berabere": "平", "Irk": "品种", "Nadirlik": "稀有度", "Yaş": "年龄",
    "Cinsiyet": "性别", "Erkek": "公", "Dişi": "母", "Yavru": "幼犬", "Genç": "青年",
    "Yetişkin": "成年", "Usta": "大师", "Yaşlı": "老年", "Fiyat": "价格", "Üretim": "产出",
    "Güç": "力量", "Hız": "速度", "Dayanıklılık": "耐力", "Zekâ": "智力", "Çeviklik": "敏捷",
    "Savunma": "防御",
    "Şu an yavru yok.": "当前没有幼犬。",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 幼犬在长大前（前4小时）不能战斗。可出战的犬只在下方列出。",
    "Sv {0}": "等级 {0}", "{0}G / {1}M / {2}B": "{0}胜 / {1}负 / {2}平",
    "Düşük": "低", "Orta": "中", "Yüksek": "高", "Ultra": "极致"
  };
  D.ja = {
    "Üs": "拠点", "Köpekler": "犬", "Kasa": "クレート", "Arena": "アリーナ", "Pazar": "市場", "Menü": "メニュー",
    "Ayarlar": "設定", "Koleksiyon": "コレクション", "Kasalar": "クレート", "Arena — 4'e 4": "アリーナ — 4v4",
    "Oyuncular Arası Pazar": "プレイヤー市場", "Arkadaşlar": "フレンド", "Günlük Görevler": "デイリークエスト",
    "Başarımlar & Rozetler": "実績とバッジ", "Etkinlikler": "イベント", "Sıralama Tablosu": "リーダーボード",
    "Profil": "プロフィール", "Envanter": "所持品", "Bildirimler": "通知", "Yardım & Rehber": "ヘルプとガイド",
    "Çiftleştirme & Genetik": "繁殖と遺伝", "Köpek": "犬",
    "Ses": "サウンド", "Arka plan müziği": "BGM", "Efekt sesleri": "効果音",
    "Müzik seviyesi": "BGM音量", "Efekt seviyesi": "効果音音量",
    "Görüntü & Erişilebilirlik": "グラフィックとアクセシビリティ", "Grafik kalitesi": "画質",
    "Animasyonları azalt": "アニメーション軽減", "Bildirimler": "通知", "Dil": "言語",
    "Arayüz dili": "表示言語", "Bağlantı": "接続", "Mod": "モード", "Bağlan": "接続",
    "Ayrıl": "切断", "Hakkında": "情報", "Yerel / çevrimdışı": "ローカル / オフライン",
    "Satın Al": "購入", "Aç": "開く", "Kapat": "閉じる", "Geri": "戻る", "Kaydet": "保存",
    "Yenile": "更新", "Topla": "受け取る", "Savaş!": "戦闘！", "Eğit": "訓練", "Besle": "給餌",
    "Dinlendir": "休息", "İlan Ver": "出品", "Pazardan Çek": "取り下げ", "Çiftleştir": "繁殖",
    "Gönder": "送信", "Kabul Et": "承認", "Reddet": "拒否", "Ekle": "追加", "Sil": "削除",
    "İptal": "キャンセル", "Tamam": "OK",
    "Seviye": "レベル", "Enerji": "エネルギー", "Puan": "ポイント", "Elo": "Elo", "Galibiyet": "勝利",
    "Yenilgi": "敗北", "Berabere": "引分", "Irk": "犬種", "Nadirlik": "レアリティ", "Yaş": "年齢",
    "Cinsiyet": "性別", "Erkek": "オス", "Dişi": "メス", "Yavru": "子犬", "Genç": "若犬",
    "Yetişkin": "成犬", "Usta": "マスター", "Yaşlı": "老犬", "Fiyat": "価格", "Üretim": "生産",
    "Güç": "力", "Hız": "速度", "Dayanıklılık": "スタミナ", "Zekâ": "知性", "Çeviklik": "敏捷",
    "Savunma": "防御",
    "Şu an yavru yok.": "現在子犬はいません。",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 子犬は成長するまで（最初の4時間）戦闘できません。出戦可能な犬は下記に表示。",
    "Sv {0}": "Lv {0}", "{0}G / {1}M / {2}B": "{0}勝 / {1}敗 / {2}分",
    "Düşük": "低", "Orta": "中", "Yüksek": "高", "Ultra": "ウルトラ"
  };
  D.az = {
    "Üs": "Baza", "Köpekler": "İtlər", "Kasa": "Sandıqlar", "Arena": "Arena", "Pazar": "Bazar", "Menü": "Menyu",
    "Ayarlar": "Parametrlər", "Koleksiyon": "Kolleksiya", "Kasalar": "Sandıqlar", "Arena — 4'e 4": "Arena — 4x4",
    "Oyuncular Arası Pazar": "Oyunçular arası bazar", "Arkadaşlar": "Dostlar", "Günlük Görevler": "Günlük tapşırıqlar",
    "Başarımlar & Rozetler": "Nailiyyətlər və nişanlar", "Etkinlikler": "Tədbirlər", "Sıralama Tablosu": "Lider lövhəsi",
    "Profil": "Profil", "Envanter": "İnventar", "Bildirimler": "Bildirişlər", "Yardım & Rehber": "Kömək və bələdçi",
    "Çiftleştirme & Genetik": "Çoxalma və genetika", "Köpek": "İt",
    "Ses": "Səs", "Arka plan müziği": "Fon musiqisi", "Efekt sesleri": "Səs effektləri",
    "Müzik seviyesi": "Musiqi səviyyəsi", "Efekt seviyesi": "Effekt səviyyəsi",
    "Görüntü & Erişilebilirlik": "Qrafika və əlçatanlıq", "Grafik kalitesi": "Qrafik keyfiyyəti",
    "Animasyonları azalt": "Animasiyaları azalt", "Bildirimler": "Bildirişlər", "Dil": "Dil",
    "Arayüz dili": "İnterfeys dili", "Bağlantı": "Bağlantı", "Mod": "Rejim", "Bağlan": "Qoşul",
    "Ayrıl": "Ayrıl", "Hakkında": "Haqqında", "Yerel / çevrimdışı": "Yerli / oflayn",
    "Satın Al": "Al", "Aç": "Aç", "Kapat": "Bağla", "Geri": "Geri", "Kaydet": "Yadda saxla",
    "Yenile": "Yenilə", "Topla": "Topla", "Savaş!": "Döyüş!", "Eğit": "Məşq et", "Besle": "Yemlə",
    "Dinlendir": "Dincəlt", "İlan Ver": "Elan et", "Pazardan Çek": "Geri götür", "Çiftleştir": "Cütləşdir",
    "Gönder": "Göndər", "Kabul Et": "Qəbul et", "Reddet": "İmtina et", "Ekle": "Əlavə et", "Sil": "Sil",
    "İptal": "Ləğv et", "Tamam": "OK",
    "Seviye": "Səviyyə", "Enerji": "Enerji", "Puan": "Xal", "Elo": "Elo", "Galibiyet": "Qələbə",
    "Yenilgi": "Məğlubiyyət", "Berabere": "Heç-heçə", "Irk": "Cins", "Nadirlik": "Nadirlik", "Yaş": "Yaş",
    "Cinsiyet": "Cins", "Erkek": "Erkək", "Dişi": "Dişi", "Yavru": "Küçük", "Genç": "Gənc",
    "Yetişkin": "Yetkin", "Usta": "Usta", "Yaşlı": "Yaşlı", "Fiyat": "Qiymət", "Üretim": "İstehsal",
    "Güç": "Güc", "Hız": "Sürət", "Dayanıklılık": "Dözümlülük", "Zekâ": "Zəka", "Çeviklik": "Çeviklik",
    "Savunma": "Müdafiə",
    "Şu an yavru yok.": "İndi balaca yoxdur.",
    "🍼 Yavru köpekler yetişkin olana kadar savaşamaz (ilk 4 saat). Savaşabilecek köpekler aşağıda listelenir.": "🍼 Balacalar böyüyənə qədər (ilk 4 saat) döyüşə bilməz. Döyüşə hazır itlər aşağıdadır.",
    "Sv {0}": "Sv {0}", "{0}G / {1}M / {2}B": "{0}Q / {1}M / {2}H",
    "Düşük": "Aşağı", "Orta": "Orta", "Yüksek": "Yüksək", "Ultra": "Ultra"
  };
  var EXTRA = {
    en: { "Kurt Akını": "Wolf Raid", "Çeviklik Parkuru": "Agility Course", "Dalga": "Wave", "Başlat": "Start", "DUR!": "STOP!", "Zafer!": "Victory!", "Yenilgi...": "Defeat...", "Ödül": "Reward", "Kurt Dişi": "Wolf Fang", "Tur": "Round", "En iyi skor": "Best score" },
    ru: { "Kurt Akını": "Волчий рейд", "Çeviklik Parkuru": "Полоса ловкости", "Dalga": "Волна", "Başlat": "Старт", "DUR!": "СТОП!", "Zafer!": "Победа!", "Yenilgi...": "Поражение...", "Ödül": "Награда", "Kurt Dişi": "Волчий клык", "Tur": "Раунд", "En iyi skor": "Лучший счёт" },
    ar: { "Kurt Akını": "غارة الذئاب", "Çeviklik Parkuru": "مضمار الرشاقة", "Dalga": "موجة", "Başlat": "ابدأ", "DUR!": "توقف!", "Zafer!": "نصر!", "Yenilgi...": "هزيمة...", "Ödül": "مكافأة", "Kurt Dişi": "ناب الذئب", "Tur": "جولة", "En iyi skor": "أفضل نتيجة" },
    de: { "Kurt Akını": "Wolfsüberfall", "Çeviklik Parkuru": "Agility-Parcours", "Dalga": "Welle", "Başlat": "Start", "DUR!": "STOPP!", "Zafer!": "Sieg!", "Yenilgi...": "Niederlage...", "Ödül": "Belohnung", "Kurt Dişi": "Wolfsfang", "Tur": "Runde", "En iyi skor": "Bestwert" },
    es: { "Kurt Akını": "Asalto de lobos", "Çeviklik Parkuru": "Circuito de agilidad", "Dalga": "Ola", "Başlat": "Iniciar", "DUR!": "¡ALTO!", "Zafer!": "¡Victoria!", "Yenilgi...": "Derrota...", "Ödül": "Recompensa", "Kurt Dişi": "Colmillo de lobo", "Tur": "Ronda", "En iyi skor": "Mejor puntuación" },
    fr: { "Kurt Akını": "Raid des loups", "Çeviklik Parkuru": "Parcours d'agilité", "Dalga": "Vague", "Başlat": "Démarrer", "DUR!": "STOP !", "Zafer!": "Victoire !", "Yenilgi...": "Défaite...", "Ödül": "Récompense", "Kurt Dişi": "Croc de loup", "Tur": "Manche", "En iyi skor": "Meilleur score" },
    pt: { "Kurt Akını": "Ataque de lobos", "Çeviklik Parkuru": "Circuito de agilidade", "Dalga": "Onda", "Başlat": "Iniciar", "DUR!": "PARE!", "Zafer!": "Vitória!", "Yenilgi...": "Derrota...", "Ödül": "Recompensa", "Kurt Dişi": "Presa de lobo", "Tur": "Rodada", "En iyi skor": "Melhor pontuação" },
    zh: { "Kurt Akını": "狼群袭击", "Çeviklik Parkuru": "敏捷赛道", "Dalga": "波次", "Başlat": "开始", "DUR!": "停！", "Zafer!": "胜利！", "Yenilgi...": "失败…", "Ödül": "奖励", "Kurt Dişi": "狼牙", "Tur": "回合", "En iyi skor": "最佳成绩" },
    ja: { "Kurt Akını": "狼の襲撃", "Çeviklik Parkuru": "アジリティコース", "Dalga": "ウェーブ", "Başlat": "スタート", "DUR!": "ストップ！", "Zafer!": "勝利！", "Yenilgi...": "敗北…", "Ödül": "報酬", "Kurt Dişi": "狼の牙", "Tur": "ラウンド", "En iyi skor": "ベストスコア" },
    az: { "Kurt Akını": "Qurd basqını", "Çeviklik Parkuru": "Çeviklik parkuru", "Dalga": "Dalğa", "Başlat": "Başlat", "DUR!": "DAYAN!", "Zafer!": "Qələbə!", "Yenilgi...": "Məğlubiyyət...", "Ödül": "Mükafat", "Kurt Dişi": "Qurd dişi", "Tur": "Mərhələ", "En iyi skor": "Ən yaxşı nəticə" }
  };
  for (var ek in EXTRA) if (D[ek]) for (var ek2 in EXTRA[ek]) D[ek][ek2] = EXTRA[ek][ek2];
  
  var EXTRA2 = {
    en: { "Mağaza": "Shop", "Davet Et": "Invite", "Puan ile Satın Al": "Buy with Points", "Telegram Stars": "Telegram Stars", "Satın Al": "Buy", "Kodunu paylaş": "Share your code", "Hoş geldin bonusu": "Welcome bonus", "Onayla": "Confirm", "Kopyala": "Copy", "Davet ödülleri": "Invite rewards", "davet": "invites", "Ödülü al": "Claim", "Kopyalandı!": "Copied!", "Satın alındı!": "Purchased!", "Ödeme alındı!": "Payment received!", "Yetersiz puan!": "Not enough points!", "Enerji Dolumu": "Energy Refill", "Şans Tılsımı": "Lucky Charm", "Altın Tasma": "Golden Collar", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Stars purchases only work inside the Telegram app." },
    ru: { "Mağaza": "Магазин", "Davet Et": "Пригласить", "Puan ile Satın Al": "Купить за очки", "Telegram Stars": "Telegram Stars", "Satın Al": "Купить", "Kodunu paylaş": "Поделись кодом", "Hoş geldin bonusu": "Приветственный бонус", "Onayla": "Подтвердить", "Kopyala": "Копировать", "Davet ödülleri": "Награды за приглашения", "davet": "приглашений", "Ödülü al": "Забрать", "Kopyalandı!": "Скопировано!", "Satın alındı!": "Куплено!", "Ödeme alındı!": "Оплата получена!", "Yetersiz puan!": "Недостаточно очков!", "Enerji Dolumu": "Пополнение энергии", "Şans Tılsımı": "Талисман удачи", "Altın Tasma": "Золотой ошейник", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Покупки за Stars работают только в приложении Telegram." },
    ar: { "Mağaza": "المتجر", "Davet Et": "ادعُ", "Puan ile Satın Al": "اشترِ بالنقاط", "Telegram Stars": "نجوم تيليجرام", "Satın Al": "شراء", "Kodunu paylaş": "شارك رمزك", "Hoş geldin bonusu": "مكافأة الترحيب", "Onayla": "تأكيد", "Kopyala": "نسخ", "Davet ödülleri": "مكافآت الدعوة", "davet": "دعوات", "Ödülü al": "استلام", "Kopyalandı!": "تم النسخ!", "Satın alındı!": "تم الشراء!", "Ödeme alındı!": "تم استلام الدفع!", "Yetersiz puan!": "نقاط غير كافية!", "Enerji Dolumu": "تعبئة الطاقة", "Şans Tılsımı": "تميمة الحظ", "Altın Tasma": "طوق ذهبي", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "الشراء بالنجوم يعمل فقط داخل تطبيق تيليجرام." },
    de: { "Mağaza": "Shop", "Davet Et": "Einladen", "Puan ile Satın Al": "Mit Punkten kaufen", "Telegram Stars": "Telegram Stars", "Satın Al": "Kaufen", "Kodunu paylaş": "Code teilen", "Hoş geldin bonusu": "Willkommensbonus", "Onayla": "Bestätigen", "Kopyala": "Kopieren", "Davet ödülleri": "Einlade-Belohnungen", "davet": "Einladungen", "Ödülü al": "Abholen", "Kopyalandı!": "Kopiert!", "Satın alındı!": "Gekauft!", "Ödeme alındı!": "Zahlung erhalten!", "Yetersiz puan!": "Nicht genug Punkte!", "Enerji Dolumu": "Energie-Auffüllung", "Şans Tılsımı": "Glücksbringer", "Altın Tasma": "Goldenes Halsband", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Stars-Käufe funktionieren nur in der Telegram-App." },
    es: { "Mağaza": "Tienda", "Davet Et": "Invitar", "Puan ile Satın Al": "Comprar con puntos", "Telegram Stars": "Telegram Stars", "Satın Al": "Comprar", "Kodunu paylaş": "Comparte tu código", "Hoş geldin bonusu": "Bono de bienvenida", "Onayla": "Confirmar", "Kopyala": "Copiar", "Davet ödülleri": "Recompensas por invitar", "davet": "invitaciones", "Ödülü al": "Reclamar", "Kopyalandı!": "¡Copiado!", "Satın alındı!": "¡Comprado!", "Ödeme alındı!": "¡Pago recibido!", "Yetersiz puan!": "¡Puntos insuficientes!", "Enerji Dolumu": "Recarga de energía", "Şans Tılsımı": "Amuleto de la suerte", "Altın Tasma": "Collar dorado", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Las compras con Stars solo funcionan en la app de Telegram." },
    fr: { "Mağaza": "Boutique", "Davet Et": "Inviter", "Puan ile Satın Al": "Acheter avec des points", "Telegram Stars": "Telegram Stars", "Satın Al": "Acheter", "Kodunu paylaş": "Partage ton code", "Hoş geldin bonusu": "Bonus de bienvenue", "Onayla": "Confirmer", "Kopyala": "Copier", "Davet ödülleri": "Récompenses d'invitation", "davet": "invitations", "Ödülü al": "Réclamer", "Kopyalandı!": "Copié !", "Satın alındı!": "Acheté !", "Ödeme alındı!": "Paiement reçu !", "Yetersiz puan!": "Points insuffisants !", "Enerji Dolumu": "Recharge d'énergie", "Şans Tılsımı": "Porte-bonheur", "Altın Tasma": "Collier doré", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Les achats Stars ne fonctionnent que dans l'application Telegram." },
    pt: { "Mağaza": "Loja", "Davet Et": "Convidar", "Puan ile Satın Al": "Comprar com pontos", "Telegram Stars": "Telegram Stars", "Satın Al": "Comprar", "Kodunu paylaş": "Compartilhe seu código", "Hoş geldin bonusu": "Bônus de boas-vindas", "Onayla": "Confirmar", "Kopyala": "Copiar", "Davet ödülleri": "Recompensas de convite", "davet": "convites", "Ödülü al": "Resgatar", "Kopyalandı!": "Copiado!", "Satın alındı!": "Comprado!", "Ödeme alındı!": "Pagamento recebido!", "Yetersiz puan!": "Pontos insuficientes!", "Enerji Dolumu": "Recarga de energia", "Şans Tılsımı": "Amuleto da sorte", "Altın Tasma": "Coleira dourada", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Compras com Stars só funcionam no app do Telegram." },
    zh: { "Mağaza": "商店", "Davet Et": "邀请", "Puan ile Satın Al": "用积分购买", "Telegram Stars": "Telegram 星星", "Satın Al": "购买", "Kodunu paylaş": "分享你的代码", "Hoş geldin bonusu": "欢迎奖励", "Onayla": "确认", "Kopyala": "复制", "Davet ödülleri": "邀请奖励", "davet": "次邀请", "Ödülü al": "领取", "Kopyalandı!": "已复制！", "Satın alındı!": "已购买！", "Ödeme alındı!": "已收到付款！", "Yetersiz puan!": "积分不足！", "Enerji Dolumu": "能量补充", "Şans Tılsımı": "幸运护符", "Altın Tasma": "金项圈", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "星星购买仅在 Telegram 应用内有效。" },
    ja: { "Mağaza": "ショップ", "Davet Et": "招待", "Puan ile Satın Al": "ポイントで購入", "Telegram Stars": "Telegram Stars", "Satın Al": "購入", "Kodunu paylaş": "コードを共有", "Hoş geldin bonusu": "歓迎ボーナス", "Onayla": "確認", "Kopyala": "コピー", "Davet ödülleri": "招待報酬", "davet": "件の招待", "Ödülü al": "受け取る", "Kopyalandı!": "コピーしました！", "Satın alındı!": "購入しました！", "Ödeme alındı!": "支払い完了！", "Yetersiz puan!": "ポイント不足！", "Enerji Dolumu": "エネルギー補充", "Şans Tılsımı": "幸運のお守り", "Altın Tasma": "黄金の首輪", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Starsでの購入はTelegramアプリ内でのみ可能です。" },
    az: { "Mağaza": "Mağaza", "Davet Et": "Dəvət et", "Puan ile Satın Al": "Xalla al", "Telegram Stars": "Telegram Stars", "Satın Al": "Al", "Kodunu paylaş": "Kodunu paylaş", "Hoş geldin bonusu": "Xoş gəlmisən bonusu", "Onayla": "Təsdiq et", "Kopyala": "Kopyala", "Davet ödülleri": "Dəvət mükafatları", "davet": "dəvət", "Ödülü al": "Mükafatı al", "Kopyalandı!": "Kopyalandı!", "Satın alındı!": "Alındı!", "Ödeme alındı!": "Ödəniş alındı!", "Yetersiz puan!": "Xal kifayət etmir!", "Enerji Dolumu": "Enerji doldurma", "Şans Tılsımı": "Şans tilsimi", "Altın Tasma": "Qızın yaxalıq", "Stars ile alım yalnızca Telegram uygulamasında çalışır.": "Stars ilə alış yalnız Telegram tətbiqində işləyir." }
  };
  for (var e2 in EXTRA2) if (D[e2]) for (var e3 in EXTRA2[e2]) D[e2][e3] = EXTRA2[e2][e3];
  
  var EXTRA3 = {
    en: { "Dörtlü Masa": "Quad Table", "Başla": "Start", "El": "Trick", "Sıra": "Turn", "PAS": "PASS", "Bot": "Bot", "Sen": "You", "Oyuncu": "Player", "Katılım": "Participation", "Berabere!": "Draw!", "Oyunu kazandın!": "You won the game!", "Oyunu kaybettin": "You lost", "Tekrar Oyna": "Play Again", "El kazananı": "Trick winner", "Masadaki en güçlü": "Strongest at table", "Donanım": "Gear" },
    ru: { "Dörtlü Masa": "Квадро-стол", "Başla": "Старт", "El": "Взятка", "Sıra": "Ход", "PAS": "ПАС", "Bot": "Бот", "Sen": "Вы", "Oyuncu": "Игрок", "Katılım": "Участие", "Berabere!": "Ничья!", "Oyunu kazandın!": "Вы победили!", "Oyunu kaybettin": "Вы проиграли", "Tekrar Oyna": "Ещё раз", "El kazananı": "Победитель взятки", "Masadaki en güçlü": "Сильнейший на столе", "Donanım": "Снаряжение" },
    ar: { "Dörtlü Masa": "طاولة رباعية", "Başla": "ابدأ", "El": "جولة", "Sıra": "الدور", "PAS": "تمرير", "Bot": "بوت", "Sen": "أنت", "Oyuncu": "لاعب", "Katılım": "مشاركة", "Berabere!": "تعادل!", "Oyunu kazandın!": "فزت باللعبة!", "Oyunu kaybettin": "خسرت", "Tekrar Oyna": "العب مجدداً", "El kazananı": "فائز الجولة", "Masadaki en güçlü": "الأقوى على الطاولة", "Donanım": "العتاد" },
    de: { "Dörtlü Masa": "Vierer-Tisch", "Başla": "Start", "El": "Stich", "Sıra": "Zug", "PAS": "PASSE", "Bot": "Bot", "Sen": "Du", "Oyuncu": "Spieler", "Katılım": "Teilnahme", "Berabere!": "Unentschieden!", "Oyunu kazandın!": "Du hast gewonnen!", "Oyunu kaybettin": "Du hast verloren", "Tekrar Oyna": "Nochmal", "El kazananı": "Stichgewinner", "Masadaki en güçlü": "Stärkster am Tisch", "Donanım": "Ausrüstung" },
    es: { "Dörtlü Masa": "Mesa Cuádruple", "Başla": "Empezar", "El": "Baza", "Sıra": "Turno", "PAS": "PASO", "Bot": "Bot", "Sen": "Tú", "Oyuncu": "Jugador", "Katılım": "Participación", "Berabere!": "¡Empate!", "Oyunu kazandın!": "¡Ganaste!", "Oyunu kaybettin": "Perdiste", "Tekrar Oyna": "Jugar otra vez", "El kazananı": "Ganador de la baza", "Masadaki en güçlü": "El más fuerte en la mesa", "Donanım": "Equipo" },
    fr: { "Dörtlü Masa": "Table à quatre", "Başla": "Commencer", "El": "Pli", "Sıra": "Tour", "PAS": "PASSE", "Bot": "Bot", "Sen": "Toi", "Oyuncu": "Joueur", "Katılım": "Participation", "Berabere!": "Égalité !", "Oyunu kazandın!": "Tu as gagné !", "Oyunu kaybettin": "Tu as perdu", "Tekrar Oyna": "Rejouer", "El kazananı": "Gagnant du pli", "Masadaki en güçlü": "Le plus fort à table", "Donanım": "Équipement" },
    pt: { "Dörtlü Masa": "Mesa Quádrupla", "Başla": "Começar", "El": "Vaza", "Sıra": "Vez", "PAS": "PASSO", "Bot": "Bot", "Sen": "Você", "Oyuncu": "Jogador", "Katılım": "Participação", "Berabere!": "Empate!", "Oyunu kazandın!": "Você venceu!", "Oyunu kaybettin": "Você perdeu", "Tekrar Oyna": "Jogar de novo", "El kazananı": "Vencedor da vaza", "Masadaki en güçlü": "O mais forte na mesa", "Donanım": "Equipamento" },
    zh: { "Dörtlü Masa": "四人牌桌", "Başla": "开始", "El": "轮次", "Sıra": "轮到", "PAS": "过", "Bot": "机器人", "Sen": "你", "Oyuncu": "玩家", "Katılım": "参与", "Berabere!": "平局！", "Oyunu kazandın!": "你赢了！", "Oyunu kaybettin": "你输了", "Tekrar Oyna": "再玩一次", "El kazananı": "本轮赢家", "Masadaki en güçlü": "桌上最强", "Donanım": "装备" },
    ja: { "Dörtlü Masa": "4人テーブル", "Başla": "スタート", "El": "トリック", "Sıra": "ターン", "PAS": "パス", "Bot": "ボット", "Sen": "あなた", "Oyuncu": "プレイヤー", "Katılım": "参加賞", "Berabere!": "引き分け！", "Oyunu kazandın!": "あなたの勝ち！", "Oyunu kaybettin": "あなたの負け", "Tekrar Oyna": "もう一度", "El kazananı": "トリック勝者", "Masadaki en güçlü": "テーブル最強", "Donanım": "装備" },
    az: { "Dörtlü Masa": "Dördlük Masası", "Başla": "Başlat", "El": "Əl", "Sıra": "Növbə", "PAS": "PAS", "Bot": "Bot", "Sen": "Sən", "Oyuncu": "Oyunçu", "Katılım": "İştirak", "Berabere!": "Heç-heçə!", "Oyunu kazandın!": "Qazandın!", "Oyunu kaybettin": "Uduzdun", "Tekrar Oyna": "Yenidən oyna", "El kazananı": "Əlin qalibi", "Masadaki en güçlü": "Masadakı ən güclü", "Donanım": "Avadanlıq" }
  };
  for (var e4 in EXTRA3) if (D[e4]) for (var e5 in EXTRA3[e4]) D[e4][e5] = EXTRA3[e4][e5];
  I.dicts = D;

  /* Dinamik yazilar icin kaliplar (TR kaynak → ceviride {n} yer tutucu) */
  I.pats = [
    { re: /^Sv (\d+)$/, key: "Sv {0}" },
    { re: /^(\d+)G \/ (\d+)M \/ (\d+)B$/, key: "{0}G / {1}M / {2}B" }
  ];

  I.t = function (s) {
    if (s == null || I.lang === "tr") return s;
    var d = D[I.lang];
    if (!d) return s;
    if (d[s]) return d[s];
    for (var i = 0; i < I.pats.length; i++) {
      var m = String(s).match(I.pats[i].re);
      if (m && d[I.pats[i].key]) {
        return d[I.pats[i].key].replace(/\{(\d+)\}/g, function (_, n) {
          return m[Number(n) + 1] !== undefined ? m[Number(n) + 1] : "";
        });
      }
    }
    return s;
  };

  I.apply = function (rootEl) {
    if (I.lang === "tr" || !rootEl || typeof document === "undefined") return;
    var w = document.createTreeWalker(rootEl, 4 /* NodeFilter.SHOW_TEXT */, null);
    var n;
    while ((n = w.nextNode())) {
      var v = n.nodeValue;
      var t = v.trim();
      if (!t) continue;
      var tv = I.t(t);
      if (tv !== t) n.nodeValue = v.replace(t, tv);
    }
  };

  I.set = function (lang) {
    I.lang = D[lang] || lang === "tr" ? lang : "tr";
    if (!I.names[I.lang]) I.lang = "tr";
    try {
      document.documentElement.lang = I.lang;
      document.documentElement.dir = I.lang === "ar" ? "rtl" : "ltr";
    } catch (e) { }
    if (PL.game && PL.game.state && PL.game.state.settings) {
      PL.game.state.settings.lang = I.lang;
      PL.game.save();
      if (PL.game.applySettings) PL.game.applySettings();
    }
    if (PL.game && PL.game._buildChrome) PL.game._buildChrome();
    if (PL.ui && PL.ui.currentName && PL.ui.replace) PL.ui.replace(PL.ui.currentName());
  };
})(typeof window !== "undefined" ? window : globalThis);
