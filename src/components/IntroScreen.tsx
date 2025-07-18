import React from 'react';
import './IntroScreen.css';

interface IntroScreenProps {
  onStartGame: () => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onStartGame }) => {
  return (
    <div className="intro-screen">
      <div className="intro-content">
        <h1 className="game-title">Bir İşlem</h1>
        
        <div className="instructions-grid">
          <div className="left-column">
            <div className="game-description">
              <h2>Nasıl Oynanır?</h2>
              <ul>
                <li>Size 5 adet rakam (1-9) ve 1 adet büyük sayı (10-99) verilecek</li>
                <li>2 dakika içinde adım adım işlemler yaparak hedefe ulaşmaya çalışın</li>
                <li>Her adımda: 1. sayı seçin → işlem seçin → 2. sayı seçin → hesaplayın</li>
                <li>Toplama (+), çıkarma (-), çarpma (×), bölme (÷) işlemlerini kullanabilirsiniz</li>
                <li>Kullandığınız sayılar tekrar kullanılamaz</li>
              </ul>
            </div>
          </div>

          <div className="right-column">
            <div className="game-description">
              <h2>Puanlama ve Kurallar</h2>
              <ul>
                <li>Hedef 3 basamaklı bir sayıdır (100-999 arası)</li>
                <li>En yakın sonuç otomatik olarak kaydedilir ve puanlanır</li>
                <li>Hedefe ne kadar yakın olursanız o kadar yüksek puan alırsınız</li>
                <li>Kalan süre de bonus puan kazandırır</li>
                <li>Geri al ve temizle butonları ile hatalarınızı düzeltebilirsiniz</li>
                <li>Hedefe ulaştığınızda otomatik olarak sonuç ekranına geçersiniz</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="example">
          <h3>Örnek Oyun:</h3>
          <div className="example-content">
            <div className="example-numbers">
              <p><strong>Sayılar:</strong> 5, 6, 8, 2, 5, 45</p>
              <p><strong>Hedef:</strong> 234</p>
            </div>
            <div className="example-steps">
              <p>Adım 1: 45 × 8 = 360</p>
              <p>Adım 2: 360 - 6 = 354</p>
              <p>Adım 3: 354 - 5 = 349</p>
              <p>Adım 4: 349 - 2 = 347</p>
              <p>Adım 5: 347 - 5 = 342</p>
              <p><strong>Sonuç:</strong> 342 (Hedef 234'e yakın)</p>
            </div>
          </div>
        </div>

        <button className="start-button" onClick={onStartGame}>
          Oyunu Başlat
        </button>
      </div>
    </div>
  );
};

export default IntroScreen;
