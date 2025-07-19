# Bir İşlem - Matematik Oyunu

Bu proje, kullanıcıların verilen sayılarla matematik işlemleri yaparak hedef sayıya ulaşmaya çalıştığı bir oyundur.

## 🚀 Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone https://github.com/your-username/birislem.git
cd birislem
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment variables ayarlayın:**
```bash
# .env dosyası oluşturun
cp .env.example .env
```

4. **Firebase konfigürasyonunu ayarlayın:**
`.env` dosyasını açın ve Firebase projenizin bilgilerini girin:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

5. **Uygulamayı başlatın:**
```bash
npm start
```

Uygulama [http://localhost:3000](http://localhost:3000) adresinde açılacaktır.

## 🔥 Firebase Kurulumu

### 1. Firebase Projesi Oluşturun
1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. "Add project" butonuna tıklayın
3. Proje adını girin (örn: "birislem")
4. Google Analytics'i etkinleştirin (opsiyonel)
5. "Create project" butonuna tıklayın

### 2. Web Uygulaması Ekleyin
1. Firebase Console'da projenizi seçin
2. "Add app" butonuna tıklayın
3. Web simgesini seçin
4. Uygulama adını girin
5. "Register app" butonuna tıklayın
6. Konfigürasyon bilgilerini kopyalayın

### 3. Authentication Ayarlayın
1. Sol menüden "Authentication" seçin
2. "Get started" butonuna tıklayın
3. "Sign-in method" sekmesine gidin
4. "Google" sağlayıcısını etkinleştirin
5. Proje destek e-postasını seçin

### 4. Firestore Database Ayarlayın
1. Sol menüden "Firestore Database" seçin
2. "Create database" butonuna tıklayın
3. "Start in test mode" seçin (geliştirme için)
4. Veritabanı konumunu seçin

### 5. Security Rules Ayarlayın
Firestore Database → Rules sekmesinde şu kuralları ekleyin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📦 Deployment

### Vercel ile Deploy
1. [Vercel](https://vercel.com/)'e gidin
2. GitHub hesabınızı bağlayın
3. Projeyi import edin
4. Environment variables'ları Vercel dashboard'da ayarlayın
5. Deploy edin

### Environment Variables (Vercel)
Vercel dashboard'da şu environment variables'ları ekleyin:
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID`

## 🎮 Oyun Özellikleri

- **6 sayı ile hedef sayıya ulaşma**
- **4 matematik işlemi** (+, -, ×, ÷)
- **2 dakikalık süre sınırı**
- **Google ile giriş yapma**
- **Skor kaydetme ve sıralama**
- **Günlük, haftalık, aylık leaderboard**

## 🛠️ Teknolojiler

- React 18
- TypeScript
- Firebase (Auth, Firestore)
- React Router
- CSS3

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
