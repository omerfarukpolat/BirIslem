# Google Play ve App Store'da yayınlama

Uygulamalar ayrı bir kod tabanı değil, sitenin kendisi:

- **Android:** Trusted Web Activity (TWA). Uygulama, telefondaki Chrome ile siteyi adres çubuğu olmadan tam ekran açar.
- **iOS:** PWABuilder'ın hazırladığı küçük bir Xcode projesi siteyi WKWebView içinde açar.

Site Vercel'de güncellendiğinde uygulamalar da güncellenir. Mağazaya yeniden yüklemek yalnızca ad, simge ya da paket ayarı değişince gerekir.

|                | Google Play                              | App Store                                   |
| -------------- | ---------------------------------------- | ------------------------------------------- |
| Hesap          | Play Console, tek seferlik 25 $          | Apple Developer Program, yıllık 99 $        |
| Bilgisayar     | Herhangi biri                            | Mac ve Xcode (ya da kiralık bulut Mac)      |
| Paket          | pwabuilder.com → Android                 | pwabuilder.com → iOS, sonra Xcode           |
| Google girişi  | Var                                      | Yok (aşağıda neden)                         |
| Dikkat         | Yeni kişisel hesapta 14 gün kapalı test  | "Web sitesi paketi" diye reddedilebilir     |

PWABuilder ve mağaza panellerindeki menü adları zamanla biraz değişebiliyor; aşağıdaki adımlar Ekim 2026 itibarıyla.

## 1. Önce sitede (bir kez)

1. Bu değişiklikleri içeren PR'ı birleştir. Gelenler: çevrimdışı açılış, gizlilik sayfası, hesap silme, iOS uygulamasında Google girişinin gizlenmesi.
2. **Firestore kuralları:** Hesap silme için skor silme izni eklendi. Firebase Console → Firestore Database → Rules'a `firestore.rules` dosyasının tamamını yapıştır → Publish.
3. **İletişim adresi:** Vercel → Settings → Environment Variables'a `REACT_APP_CONTACT_EMAIL` ekle. Değeri, gizlilik sayfasında görünecek ve mağazalara yazacağın e-posta. Sonra Redeploy.
4. **Odaların silinmesi:** Gizlilik sayfası, oda kayıtlarının 24 saatte silindiğini söylüyor; bunun için TTL açık olmalı. Firestore → Time-to-live'da `rooms`, `players` ve `results` koleksiyon grupları için `expiresAt` alanını seç.
5. https://www.birislem.app/gizlilik sayfasının açıldığını kontrol et.

## 2. Android uygulamasında Google girişi

Android uygulamasında giriş, açılır pencere yerine sayfa içi yönlendirmeyle yapılır. Bunun güvenilir çalışması için Google giriş sayfasının sitenin kendi alan adında olması gerekiyor. `vercel.json`'daki `/__/auth` yönlendirmesi bunun için hazır.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=birislem-4d364) → Credentials.
   - **OAuth 2.0 Client IDs** altındaki "Web client (auto created by Google Service)" istemcisini aç.
   - **Authorized redirect URIs**'e `https://www.birislem.app/__/auth/handler` ekle → Save.
2. Firebase Console → Authentication → Settings → Authorized domains listesinde `birislem.app` ya da `www.birislem.app` olduğunu kontrol et.
3. Vercel'de `REACT_APP_FIREBASE_AUTH_DOMAIN` değişkeninin değerini `www.birislem.app` yap → Redeploy.
4. Sitede çıkış yapıp yeniden Google ile giriş yap.
   - Google'ın hesap seçme ekranında artık "birislem.app'e devam et" yazar.
   - Sorun çıkarsa değişkeni eski değerine (`birislem-4d364.firebaseapp.com`) döndürüp Redeploy et.

## 3. Google Play

### Hesap

[Play Console](https://play.google.com/console)'da geliştirici hesabı aç. Kimlik doğrulama birkaç gün sürebilir.

**Önemli:** Yeni açılan kişisel hesaplarda uygulamayı herkese açmadan önce kapalı test şartı var: en az 12 test kullanıcısı, 14 gün kesintisiz. Arkadaşlarını bunun için şimdiden ayarla.

### Paketi oluştur

1. https://www.pwabuilder.com → `https://www.birislem.app` yaz → **Package for stores** → **Android** → **Generate package**.
2. Seçenekler:
   - **Package ID:** `app.birislem`. Sonradan değiştirilemez.
   - **App name / Short name:** `Bir İşlem`
   - **Start URL:** `/?app=android`
   - **Signing key:** *Create new*
3. İnen zip'te `.aab` (Play'e yüklenecek), `.apk` (telefonda denemek için), `assetlinks.json` ve imza anahtarı (`signing.keystore`, `signing-key-info.txt`) var.
   - **Anahtarı ve şifresini güvenli bir yerde sakla, GitHub'a koyma.** Güncellemeler aynı anahtarla imzalanır.

### Play Console'da uygulama

1. **Create app:**
   - Ad: Bir İşlem
   - Varsayılan dil: Türkçe
   - Tür: Oyun, Ücretsiz
2. **Mağaza kaydı** (dosyalar repoda):
   - Uygulama simgesi: `store/google-play/simge-512.png`
   - Öne çıkan görsel: `store/google-play/one-cikan-gorsel.jpg`
   - Telefon ekran görüntüleri: `store/google-play/telefon/*.jpg`
   - Kısa ve uzun açıklama için aşağıdaki metinleri kullanabilirsin.
3. **Uygulama içeriği:**
   - Gizlilik politikası: `https://www.birislem.app/gizlilik`
   - Reklam: Yok
   - Uygulama erişimi: Tüm özellikler özel erişim gerekmeden kullanılabilir. Google girişi isteğe bağlı.
   - Hedef kitle: 13 yaş ve üzeri önerilir. 13 yaş altını seçmek, Aileler programının ek kurallarını getirir.
   - İçerik derecelendirmesi anketi: şiddet, kumar ve sohbet yok. Oyuncular yalnızca takma ad görür.
   - **Veri güvenliği:**
     - Toplananlar: Ad, E-posta adresi, Kullanıcı kimlikleri (hesap yönetimi, uygulama işlevi; isteğe bağlı) ve oyun sonuçları ile takma ad (uygulama işlevi).
     - Paylaşım: Yok. Aktarımda şifreleme: Evet.
     - Silme: Evet. Hesap silme bağlantısı: `https://www.birislem.app/gizlilik#silme`
4. **Test ve yayınlama → Kapalı test:** `.aab`'yi yükle, test kullanıcılarını ekle. 14 gün sonra **Üretim**'e başvur.

### Adres çubuğunu kaldır (Digital Asset Links)

Site ile uygulamanın aynı sahibe ait olduğu doğrulanmazsa uygulama üstte adres çubuğuyla açılır.

1. Play Console → uygulama → **Test ve yayınlama → Uygulama bütünlüğü → Uygulama imzalama**. Eski arayüzde: Kurulum → Uygulama imzalama.
2. **Uygulama imzalama anahtarı sertifikası**nın SHA-256 parmak izini kopyala.
3. Bu parmak izini ve PWABuilder'ın verdiği `assetlinks.json` içeriğini Claude'a gönder.
   - Dosyayı `public/.well-known/assetlinks.json` olarak ekleyecek; içinde iki parmak izi olacak: Google'ın imza anahtarı ve senin yükleme anahtarın.
4. Yayınlandıktan sonra https://www.birislem.app/.well-known/assetlinks.json adresinin açıldığını kontrol et. Uygulamayı kapatıp açınca adres çubuğu kaybolur.

## 4. App Store

### Neden iOS'ta Google girişi yok

- Google, uygulama içindeki tarayıcılarda (WKWebView) Google girişini engelliyor.
- Apple da Google girişi sunan uygulamalardan, ona denk ve gizlilik odaklı bir giriş seçeneği daha istiyor (kural 4.8). Bu genelde "Apple ile giriş" demek.

Bu yüzden iOS uygulamasında giriş düğmeleri gizli. Oyun, günün sorusu, karşılıklı modlar, çevrimiçi odalar ve sıralamayı görmek girişsiz çalışıyor; yalnızca skor kaydı yok. İleride istenirse "Apple ile giriş" eklenebilir.

### Paketi oluştur

1. https://www.pwabuilder.com → **Package for stores** → **iOS**.
2. Seçenekler:
   - **Bundle ID:** `app.birislem`
   - **App name:** `Bir İşlem`
   - **URL:** `https://www.birislem.app/?app=ios`
   - **Image URL:** `https://www.birislem.app/icons/icon-1024.png`
   - **Status bar color:** `#f3eee3`
3. Zip'i Mac'te aç. İçindeki talimatla (`pod install`) projeyi hazırla ve `.xcworkspace` dosyasını Xcode'da aç.
4. **Signing & Capabilities**'te Apple Developer hesabını (Team) seç. Simülatörde ya da telefonda bir kez çalıştırıp dene.

### App Store Connect

1. https://appstoreconnect.apple.com → **Apps → +**:
   - Platform: iOS
   - Ad: Bir İşlem
   - Dil: Türkçe
   - Bundle ID: `app.birislem`
   - SKU: `birislem`
2. Xcode'da **Product → Archive → Distribute App → App Store Connect**.
3. Uygulama sayfası:
   - Ekran görüntüleri: `store/app-store/iphone-6.9/`, `store/app-store/iphone-6.5/`, `store/app-store/ipad-13/`
   - Gizlilik politikası URL'si: `https://www.birislem.app/gizlilik`
   - Kategori: Oyunlar → Bulmaca (ikincil: Eğitim)
   - Yaş derecesi: 4+
4. **Uygulama gizliliği:**
   - Takip: Hayır
   - Toplanan veri: "Kimlik bilgileri → Kullanıcı kimliği" ve "Kullanıcı içeriği → Diğer" (çevrimiçi oda takma adı ve sonuçları), amaç "Uygulama işlevselliği"
5. İnceleme notu önerisi: "Giriş gerekmez. Oyunun tamamı ve çevrimiçi odalar (Karşılıklı → Çevrimiçi oda) hesapsız oynanır. Oyun çevrimdışı da açılır."

### Ret riski

Apple, sitenin aynısı olan uygulamaları kural 4.2 ("asgari işlevsellik") ile reddedebiliyor.

Lehimize olanlar:
- Gerçek bir oyun.
- Çevrimdışı açılıyor.
- Tarayıcı arayüzü yok.

Reddedilirse sonraki adım, oyun dosyalarını uygulamanın içine koyan bir Capacitor uygulaması.

## Mağaza metinleri (öneri)

**Kısa açıklama (Play, en fazla 80 karakter):**
Altı sayı, dört işlem, tek hedef. Hedefe en yakın sonucu bul!

**Alt başlık (App Store, en fazla 30 karakter):**
Sayılarla hedefi bul

**Uzun açıklama:**

> Bir İşlem, sayılarla oynanan bir zekâ oyunu. Beş rakam ve bir iki basamaklı sayıyı toplama, çıkarma, çarpma ve bölmeyle birleştirip üç basamaklı hedefe ulaşmaya çalış. Tam bulamazsan en yakın sonuç da puan getirir; ne kadar hızlıysan o kadar çok.
>
> • Tek başına: süreyi ve işlem hakkını sen seç.
> • Günün sorusu: herkes için aynı soru, tek hak. Serini koru, sonucunu paylaş.
> • Karşılıklı: arkadaşlarınla aynı telefonda sırayla ya da çevrimiçi odada aynı anda yarış.
> • Meydan okuma: çözdüğün soruyu bağlantıyla gönder, arkadaşın seni geçebilecek mi?
> • Her oyunun sonunda en kısa çözümü gör.
>
> Reklam yok. Kayıt gerekmez. İnternet yokken de oynanır.

**Anahtar kelimeler (App Store, en fazla 100 karakter):**
matematik,sayı,işlem,zeka,bulmaca,hesap,beyin,günün sorusu,akıl oyunu

Başka bir oyunun ya da yarışmanın adını anahtar kelimelerde kullanma; Apple bunu reddediyor.

## Görselleri yeniden üretmek

Arayüz değişirse ekran görüntülerini, öne çıkan görseli ve simgeleri yeniden üretmek için:

```bash
npm run store:assets
```

Komut uygulamayı geçici bir klasöre derler ve gerçek oyunları oynayıp ekran görüntülerini çeker. Çıktılar `store/` klasörüne, `public/screenshots/` klasörüne ve `public/icons/icon-1024.png` dosyasına yazılır.
