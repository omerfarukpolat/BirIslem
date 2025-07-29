import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWordGame } from '../hooks/useWordGame';
import { useAuth } from '../contexts/AuthContext';
import { saveWordGameScore } from '../services/firebaseService';
import { soundManager } from '../utils/soundEffects';
import SettingsModal, { GameSettings } from './SettingsModal';
import UserModal from './UserModal';
import './WordGameScreen.css';

const WordGameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, signOut, signIn } = useAuth();
  const { 
    gameState, 
    gameSettings,
    startGame, 
    addLetter,
    removeLastLetter,
    clearWord,
    submitWord,
    endGame
  } = useWordGame();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isJokerModalOpen, setIsJokerModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [wordList, setWordList] = useState<string[]>([]);

  // Türkçe karakterleri normalize et
  const normalizeTurkish = (str: string): string => {
    return str
      .toUpperCase() // Normal toUpperCase kullan
      .replace(/Ğ/g, 'Ğ')
      .replace(/Ü/g, 'Ü')
      .replace(/Ş/g, 'Ş')
      .replace(/İ/g, 'İ')
      .replace(/Ö/g, 'Ö')
      .replace(/Ç/g, 'Ç')
      .replace(/I/g, 'I'); // Küçük i'yi büyük I'ya çevir
  };

  // Avatar resim yükleme hatası durumunda
  const handleAvatarError = () => {
    setAvatarError(true);
  };

  // Avatar resim yükleme başarılı olduğunda
  const handleAvatarLoad = () => {
    setAvatarError(false);
  };

  // Oyun bittiğinde butonları disable et
  const isGameOver = !gameState.isGameActive || gameState.timeLeft <= 0 || gameState.isGameOver;

  // Çıkış yap ve ana sayfaya yönlendir
  const handleSignOut = async () => {
    try {
      await signOut();
      setIsUserModalOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  // Google ile giriş yap
  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      // Sayfa yenilenmesi için kısa bir gecikme
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Google ile giriş yapılırken hata:', error);
    }
  };

  // Avatar'a tıklandığında
  const handleAvatarClick = () => {
    setIsUserModalOpen(true);
  };

  // Settings modal'ını aç
  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  // Settings'i kaydet ve oyunu sıfırla
  const handleSaveSettings = (newSettings: GameSettings) => {
    // Oyunu yeni ayarlarla başlat
    const wordSettings = {
      timeLimit: newSettings.timeLimit,
      vowelCount: newSettings.vowelCount || 3,
      consonantCount: newSettings.consonantCount || 5
    };
    startGame(wordSettings);
  };

  // Oyunu başlat
  useEffect(() => {
    startGame(gameSettings);
  }, [startGame, gameSettings]);

  // Kelime listesini yükle
  useEffect(() => {
    const loadWordList = async () => {
      try {
        console.log('Kelime listesi yükleniyor...');
        const response = await fetch('/words.txt');
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        console.log('Ham kelime listesi uzunluğu:', text.length);
        console.log('İlk 200 karakter:', text.substring(0, 200));
        console.log('Son 200 karakter:', text.substring(text.length - 200));
        
        const lines = text.split('\n');
        console.log('Satır sayısı:', lines.length);
        console.log('İlk 10 satır:', lines.slice(0, 10));
        console.log('Son 10 satır:', lines.slice(-10));
        
        const words = lines
          .map(word => normalizeTurkish(word.trim()))
          .filter(word => word.length > 0);
        
        console.log('Filtrelenmiş kelime sayısı:', words.length);
        console.log('İlk 10 kelime:', words.slice(0, 10));
        console.log('Son 10 kelime:', words.slice(-10));
        
        setWordList(words);
        console.log('Kelime listesi state\'e kaydedildi. Toplam kelime sayısı:', words.length);
        console.log('BUĞU kelimesi var mı:', words.includes('BUĞU'));
        console.log('TAHIL kelimesi var mı:', words.includes('TAHIL'));
        console.log('ÇAP kelimesi var mı:', words.includes('ÇAP'));
        console.log('ŞAKA kelimesi var mı:', words.includes('ŞAKA'));
        console.log('HACİZ kelimesi var mı:', words.includes('HACİZ'));
        console.log('HACİZ kelimesi arama:', words.filter(w => w.includes('HACİZ')));
        console.log('TAHIL kelimesi arama:', words.filter(w => w.includes('TAHIL')));
        console.log('TAHIL kelimesi tam eşleşme:', words.filter(w => w === 'TAHIL'));
      } catch (error) {
        console.error('Kelime listesi yüklenirken hata:', error);
        console.error('Hata detayı:', error);
      }
    };

    loadWordList();
  }, []);

  // Sonuç ekranına geçiş ve skor kaydetme
  useEffect(() => {
    if (gameState.isGameOver && gameState.bestWord) {
      // Sadece giriş yapmış kullanıcıların skorlarını kaydet
      if (currentUser) {
        const scoreData = {
          userId: currentUser.uid,
          userName: currentUser.displayName,
          userEmail: currentUser.email,
          score: gameState.bestScore,
          word: gameState.bestWord,
          wordLength: gameState.bestWord.length,
          timeUsed: gameSettings.timeLimit - gameState.timeLeft,
          letters: gameState.letters
        };

        saveWordGameScore(scoreData).catch(error => {
          console.error('Skor kaydedilirken hata:', error);
        });
      }

      // Sonuç ekranına yönlendir
      navigate('/word-result', {
        state: {
          word: gameState.bestWord,
          score: gameState.bestScore,
          timeUsed: gameSettings.timeLimit - gameState.timeLeft,
          letters: gameState.letters,
          isLoggedIn: !!currentUser
        }
      });
    }
  }, [gameState.isGameOver, gameState.bestWord, navigate, gameState, currentUser, gameSettings.timeLimit]);

  // Son 10 saniyede tik-tak sesi çal
  useEffect(() => {
    if (gameState.timeLeft <= 10 && gameState.timeLeft > 0) {
      soundManager.playTickTock();
    }
  }, [gameState.timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLetterClick = (letter: string, letterIndex: number) => {
    if (isGameOver) return;
    
    if (letter === '?') {
      // Joker harf kullanılmışsa modal'ı açma
      if (gameState.usedLetters.has(letterIndex)) {
        return;
      }
      setIsJokerModalOpen(true);
    } else {
      soundManager.playNumberSelect();
      addLetter(letter, letterIndex);
    }
  };

  const handleJokerLetterSelect = (selectedLetter: string) => {
    soundManager.playNumberSelect();
    // Joker harf için özel indeks kullan (örn: -1)
    addLetter(selectedLetter, -1);
    setIsJokerModalOpen(false);
  };

  const handleSubmitWord = () => {
    if (isGameOver || !gameState.currentWord.trim()) return;

    const word = normalizeTurkish(gameState.currentWord.trim());
    
    console.log('=== KELİME KONTROLÜ ===');
    console.log('Kontrol edilen kelime:', word);
    console.log('State\'teki kelime listesi uzunluğu:', wordList.length);
    console.log('State\'teki kelime listesi ilk 10 kelime:', wordList.slice(0, 10));
    console.log('State\'teki kelime listesi son 10 kelime:', wordList.slice(-10));
    console.log('Kelime listede var mı:', wordList.includes(word));
    console.log('HACİZ kelimesi var mı:', wordList.includes('HACİZ'));
    console.log('Benzer kelimeler:', wordList.filter(w => w.includes(word) || word.includes(w)).slice(0, 5));
    console.log('Tam eşleşen kelimeler:', wordList.filter(w => w === word));
    console.log('=== KONTROL BİTTİ ===');
    
    // Kelime listesinde var mı kontrol et
    if (wordList.includes(word)) {
      soundManager.playSuccess();
      submitWord(word);
    } else {
      soundManager.playError();
      // Hata mesajı göster
      alert('Bu kelime sözlükte bulunamadı!');
    }
  };

  const handleClearWord = () => {
    soundManager.playClear();
    clearWord();
  };

  const handleRemoveLastLetter = () => {
    soundManager.playUndo();
    removeLastLetter();
  };

  const getTimeColor = () => {
    if (gameState.timeLeft <= 20) return '#e74c3c';
    if (gameState.timeLeft <= 60) return '#f39c12';
    return '#27ae60';
  };

  return (
    <div className="word-game-screen">
      {/* Oyun Header'ı */}
      <div className="game-page-header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/')}>
            ← Ana Menü
          </button>
          <h1 className="game-title">Kelime Mühendisi</h1>
        </div>
        <div className="header-right">
          <div className="clickable-avatar" onClick={handleAvatarClick}>
            {currentUser ? (
              currentUser.photoURL && !avatarError ? (
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
              )
            ) : (
              <div className="avatar-placeholder">
                ?
              </div>
            )}
          </div>
          <button className="settings-button" onClick={handleOpenSettings} title="Oyun Ayarları">
            ⚙️
          </button>
        </div>
      </div>

      {/* Oyun Header'ı (Süre) */}
      <div className="game-header">
        <div className="timer-section">
          <div className={`timer ${gameState.timeLeft <= 10 ? 'warning' : ''}`} style={{ color: getTimeColor() }}>
            {formatTime(gameState.timeLeft)}
          </div>
        </div>
      </div>

      <div className="results-section">
        <div className="current-word-section">
          <h3>Mevcut Kelime:</h3>
          <div className="current-word-display">
            {gameState.currentWord || 'Henüz kelime yazılmadı'}
          </div>
        </div>

        {gameState.bestWord && (
          <div className="best-word-section">
            <h3>Gönderilen Kelime:</h3>
            <div className="best-word-display">
              {gameState.bestWord} (Puan: {gameState.bestScore})
            </div>
          </div>
        )}

        {gameState.bestWord && (
          <div className="game-complete-message">
            <h3>🎉 Kelime Gönderildi!</h3>
            <p>Sonuç ekranına yönlendiriliyorsunuz...</p>
          </div>
        )}
      </div>

      <div className="main-game-area">
        <div className="letters-section">
          <h3>Harf Seçin:</h3>
          <div className="letters-grid">
            {gameState.letters.map((letter, index) => {
              const isUsed = gameState.usedLetters.has(index);
              return (
                <button
                  key={`letter-${index}`}
                  className={`letter-button ${letter === '?' ? 'joker' : ''} ${isUsed ? 'used' : ''}`}
                  onClick={() => handleLetterClick(letter, index)}
                  disabled={isGameOver || isUsed}
                  title={
                    isUsed ? 'Bu harf kullanıldı' :
                    letter === '?' ? 'Joker Harf (Herhangi bir harf)' : 
                    `Harf: ${letter}`
                  }
                >
                  {letter}
                </button>
              );
            })}
          </div>
          
          {/* Kontrol Butonları */}
          <div className="control-buttons-grid">
            <button
              className="control-button undo"
              onClick={handleRemoveLastLetter}
              disabled={!gameState.currentWord || isGameOver}
              title="Son Harfi Sil"
            >
              ↶
            </button>
            <button
              className="control-button clear"
              onClick={handleClearWord}
              disabled={!gameState.currentWord || isGameOver}
              title="Kelimeyi Temizle"
            >
              🗑️
            </button>
            <button
              className="control-button submit"
              onClick={handleSubmitWord}
              disabled={!gameState.currentWord.trim() || isGameOver || !!gameState.bestWord}
              title={gameState.bestWord ? "Kelime zaten gönderildi" : "Kelimeyi Gönder"}
            >
              ✅
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={gameSettings}
        gameType="word"
      />

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSignOut={handleSignOut}
        onSignIn={handleGoogleSignIn}
        user={currentUser}
      />

      {/* Joker Harf Modal */}
      {isJokerModalOpen && (
        <div className="joker-modal-overlay" onClick={() => setIsJokerModalOpen(false)}>
          <div className="joker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="joker-modal-header">
              <h3>Joker Harf Seçin</h3>
              <button className="joker-modal-close" onClick={() => setIsJokerModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="joker-modal-content">
              <p>Hangi harfi kullanmak istiyorsunuz?</p>
              <div className="joker-letters-grid">
                {['A', 'B', 'C', 'Ç', 'D', 'E', 'F', 'G', 'Ğ', 'H', 'I', 'İ', 'J', 'K', 'L', 'M', 'N', 'O', 'Ö', 'P', 'R', 'S', 'Ş', 'T', 'U', 'Ü', 'V', 'Y', 'Z'].map((letter) => (
                  <button
                    key={letter}
                    className="joker-letter-button"
                    onClick={() => handleJokerLetterSelect(letter)}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordGameScreen; 