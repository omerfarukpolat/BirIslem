# Bir İşlem

Altı sayı, dört işlem, tek hedef. Beş farklı rakam (1–9) ve bir iki basamaklı sayıyla (10–99) üç basamaklı hedefe (100–999) ulaşmaya çalıştığın matematik oyunu.

**Modlar**

- **Tek başına:** rastgele soru; süre (30 sn – 5 dk) ve işlem hakkı (sınırsız ya da 1–5) ayarlanabilir.
- **Günün sorusu:** Türkiye saatiyle her gece değişen, herkes için aynı soru. Tek hak, 2 dakika; seri tutulur, sonuç paylaşılabilir.
- **Karşılıklı · aynı cihazda:** 2–6 oyuncu, 3/5/7/10 tur. Herkes aynı soruyu sırayla çözer, sonuçlar tur sonunda açıklanır.
- **Karşılıklı · çevrimiçi oda:** 5 karakterlik kodla ya da bağlantıyla katılım (en fazla 8 oyuncu). Herkes aynı soruyu aynı anda kendi telefonunda çözer.
- **Meydan okuma:** bitirdiğin soruyu puanınla birlikte bağlantı olarak gönder; arkadaşın aynı soruyu çözüp seni geçmeye çalışsın.

Oyun bittiğinde **en kısa çözüm** gösterilir (tüm olasılıkları tarayan çözücü, Web Worker'da çalışır).

## Puanlama

| Fark (en iyi olası sonuca göre) | Yakınlık puanı |
| --- | --- |
| Tam isabet | 100 |
| 1 | 80 |
| 2 | 70 |
| 3–5 | 60 |
| 6–10 | 45 |
| 11–20 | 30 |
| 21–50 | 15 |
| 51+ | 0 |

**Hız bonusu:** en yakın sonuca ne kadar erken ulaşıldıysa yakınlık puanının %25'ine kadar eklenir (en fazla 125 puan). Bonus yakınlık puanıyla orantılı olduğu için hızlı ama uzak bir sonuç, yavaş ama tam bir sonucu geçemez. Soruların ~%99'unda hedef tam olarak bulunabilir; bulunamadığında fark, çözücünün bulduğu en iyi sonuca göre hesaplanır.

Karşılıklı modlarda her tur aynı şekilde puanlanır; toplam puan eşitse daha çok tur kazanan öne geçer.

## Geliştirme

Gereksinim: Node.js 20.19+ (22 önerilir).

```bash
npm install
cp .env.example .env   # Firebase bilgilerini gir
npm run dev            # http://localhost:3000
```

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Tip denetimi + üretim derlemesi (`build/`) |
| `npm run preview` | Derlemeyi yerelde sun |
| `npm test` | Birim testleri (Vitest): oyun motoru, puanlama, çözücü, oda mantığı |
| `npm run e2e` | Uçtan uca testler (Playwright) |
| `npm run emulators` | Firebase Auth + Firestore emülatörleri (firebase-tools gerekir) |

Firebase ayarları olmadan da oyun (tek başına, günün sorusu, aynı cihazda) tamamen çalışır; giriş, sıralama ve çevrimiçi odalar gizlenir.

**Emülatörle çalışmak:** `npm i -g firebase-tools`, ardından `npm run emulators`. `.env` içinde `REACT_APP_USE_EMULATORS=true` yapıp `npm run dev`. Çevrimiçi oda testini de kapsayan uçtan uca testler için: `E2E_EMULATORS=1 npm run e2e`.

## Teknoloji

- [Vite](https://vite.dev) + [Preact](https://preactjs.com) + [Signals](https://preactjs.com/guide/v10/signals/) + [preact-iso](https://github.com/preactjs/preact-iso) yönlendirici, TypeScript
- Firebase (Auth, Firestore) yalnızca gerektiğinde yüklenir; açılışta indirilen JavaScript ~35 KB (gzip)
- Yazı tipleri: Barlow ve Barlow Condensed (yerel, yalnızca latin + latin-ext)

Kod düzeni:

```
src/game/        Saf oyun mantığı: kurallar, tur motoru, puanlama, çözücü, günün sorusu
src/components/  Tur oynatıcı, sonuç ve maç tabloları, ortak arayüz parçaları
src/screens/     Sayfalar (tek başına, günün sorusu, sıralama, karşılıklı, çevrimiçi oda)
src/services/    Firebase (tembel yüklenir)
src/state/       Ayarlar, oturum, ses, yerel istatistikler
e2e/             Playwright testleri
```

## Yayınlama

Vercel ayarları `vercel.json` içinde (Vite, çıktı klasörü `build/`, tek sayfa yönlendirmesi). Ortam değişkenleri eski adlarıyla (`REACT_APP_FIREBASE_*`) kullanılmaya devam eder.

### Firebase kurulumu

1. **Authentication → Sign-in method:** Google'ı etkinleştir. Çevrimiçi odalara girişsiz katılım için **Anonim** girişi de etkinleştir (kapalıysa oyuncudan Google ile giriş istenir).
2. **Firestore kuralları:** Firebase Console → Firestore Database → Rules'a `firestore.rules` içeriğini yapıştırıp Publish, ya da `firebase deploy --only firestore:rules`.
   - **Dikkat:** Canlı projede Console'dan eklenmiş bir `gameRooms` kuralı var; bu depo onu kullanmıyor ama başka bir şey kullanıyor olabilir. Yüklemeden önce o bölümü `firestore.rules` içindeki işaretli yere ekle, yoksa silinir.
   - Skorlar yalnızca Google ile giriş yapmış kullanıcı tarafından, kendi adına ve bir kez yazılabilir; günün sorusu kullanıcı başına günde bir kayıttır.
   - Odalar kodla okunur, listelenemez; turu yalnızca oda sahibi ilerletir, oda sahibi koparsa bir oyuncu yönetimi devralabilir; herkes yalnızca kendi sonucunu, o anki tur için bir kez gönderebilir.
3. **(İsteğe bağlı) Eski odaları temizleme:** Firestore → TTL ilkeleri'nde `rooms`, `players` ve `results` koleksiyon grupları için `expiresAt` alanını seç. Odalar 24 saat sonra silinir.

### Sıralama

Yeni puanlama sistemiyle kaydedilen skorlar `v: 2` alanı taşır ve sıralamada yalnızca bunlar listelenir; eski kayıtlar silinmez. Yeni kayıtlarda e-posta adresi saklanmaz.

## Lisans

MIT
