import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './IntroScreen.css';

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

const IntroScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, signIn, signOut } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Avatar resim yükleme hatası durumunda
  const handleAvatarError = () => {
    setAvatarError(true);
  };

  // Avatar resim yükleme başarılı olduğunda
  const handleAvatarLoad = () => {
    setAvatarError(false);
  };

  const handleStartGame = () => {
    navigate('/game');
  };

  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Giriş yapılırken hata:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordion(openAccordion === id ? null : id);
  };

  const accordionItems: AccordionItem[] = [
    {
      id: 'how-to-play',
      title: 'Nasıl Oynanır?',
      content: (
        <ul>
          <li>Size 5 adet rakam (1-9) ve 1 adet büyük sayı (10-99) verilecek</li>
          <li>2 dakika içinde adım adım işlemler yaparak hedefe ulaşmaya çalışın</li>
          <li>Her adımda: 1. sayı seçin → işlem seçin → 2. sayı seçin → hesaplayın</li>
          <li>Toplama (+), çıkarma (-), çarpma (×), bölme (÷) işlemlerini kullanabilirsiniz</li>
          <li>Kullandığınız sayılar tekrar kullanılamaz</li>
        </ul>
      )
    },
    {
      id: 'scoring-rules',
      title: 'Puanlama ve Kurallar',
      content: (
        <ul>
          <li>Hedef 3 basamaklı bir sayıdır (100-999 arası)</li>
          <li>En yakın sonuç otomatik olarak kaydedilir ve puanlanır</li>
          <li>Hedefe ne kadar yakın olursanız o kadar yüksek puan alırsınız</li>
          <li>Kalan süre de bonus puan kazandırır</li>
          <li>Geri al ve temizle butonları ile hatalarınızı düzeltebilirsiniz</li>
          <li>Hedefe ulaştığınızda otomatik olarak sonuç ekranına geçersiniz</li>
          <li><strong>Giriş yaparak skorlarınızı kaydedebilir ve sıralamalarda yer alabilirsiniz!</strong></li>
        </ul>
      )
    },
    {
      id: 'example-game',
      title: 'Örnek Oyun',
      content: (
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
      )
    }
  ];

  return (
    <div className="intro-screen">
      <div className="intro-content">
        <h1 className="game-title">Bir İşlem</h1>
        
        {currentUser && (
          <div className="user-info">
            <div className="user-avatar">
              {currentUser.photoURL && !avatarError ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'Kullanıcı'} 
                  onError={handleAvatarError}
                  onLoad={handleAvatarLoad}
                />
              ) : (
                <div className="avatar-placeholder">
                  {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="user-details">
              <div className="user-name">{currentUser.displayName}</div>
              <div className="user-email">{currentUser.email}</div>
            </div>
          </div>
        )}

        {/* Butonlar kullanıcı bilgilerinin altında */}
        <div className="action-buttons">
          <button className="start-button" onClick={handleStartGame}>
            Oyunu Başlat
          </button>
          
          {currentUser ? (
            <>
              <button className="leaderboard-button" onClick={handleLeaderboard}>
                🏆 Sıralama
              </button>
              <button className="signout-button" onClick={handleSignOut}>
                Çıkış Yap
              </button>
            </>
          ) : (
            <>
              <button className="signin-button" onClick={handleSignIn}>
                Google ile Giriş Yap
              </button>
              <button className="leaderboard-button" onClick={handleLeaderboard}>
                🏆 Sıralama
              </button>
            </>
          )}
        </div>
        
        {/* Akordiyon Bilgi Bölümü */}
        <div className="accordion-section">
          <h2 className="accordion-title">Oyun Hakkında Bilgiler</h2>
          <div className="accordion-container">
            {accordionItems.map((item) => (
              <div key={item.id} className="accordion-item">
                <button
                  className={`accordion-header ${openAccordion === item.id ? 'open' : ''}`}
                  onClick={() => toggleAccordion(item.id)}
                >
                  <span className="accordion-title-text">{item.title}</span>
                  <span className="accordion-icon">
                    {openAccordion === item.id ? '−' : '+'}
                  </span>
                </button>
                <div className={`accordion-content ${openAccordion === item.id ? 'open' : ''}`}>
                  <div className="accordion-body">
                    {item.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
