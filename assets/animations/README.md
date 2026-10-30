# assets/animations/

Bu oyunda **hazır video/GIF/sprite animasyonu kullanılmaz**; tüm hareketler
`src/css/style.css` içindeki 9 `@keyframes` animasyonu ve JavaScript
(`requestAnimationFrame` + zamanlanmış adımlar) ile gerçek zamanlı üretilir.
Bu yaklaşım APK boyutunu küçük tutar ve her çözünürlükte keskin görünür.

- `animations.json` — animasyon envanteri: adı, süresi, hangi ekranda ve hangi
  fonksiyon tarafından tetiklendiği.
- Kasa açılışı (sallama → patlama → kart çevrilmesi): `scenes/screens_play.js → openCrateFlow()`
- Arena hasar/iyileşme efektleri: `scenes/screens_play.js → playBattle()`
- Efsanevi/Mitik kart parıltısı: `src/css/style.css → .dogCard.rar-efsanevi/.rar-mitik`
- Hareket azaltma: Ayarlar → "Hareketi azalt" (`settings.reduceMotion`) ve
  CSS `@media (prefers-reduced-motion: reduce)`.
