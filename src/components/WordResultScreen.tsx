import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './WordResultScreen.css';

interface WordResultState {
  word: string;
  score: number;
  timeUsed: number;
  letters: string[];
  isLoggedIn: boolean;
}

const WordResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const resultData = location.state as WordResultState;

  const handlePlayAgain = () => {
    navigate('/word-game');
  };

  const handleBackToMenu = () => {
    navigate('/');
  };

  const handleLeaderboard = () => {
    navigate('/leaderboard');
  };

  const handleSignIn = async () => {
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreMessage = (score: number): string => {
    if (score >= 100) return 'Mükemmel! Kelime mühendisliğinde ustasın! 🏆';
    if (score >= 80) return 'Harika! Çok iyi bir performans! 🌟';
    if (score >= 60) return 'Güzel! İyi bir skor elde ettin! 👍';
    if (score >= 40) return 'Fena değil! Daha iyisini yapabilirsin! 💪';
    return 'Tekrar dene, daha uzun kelimeler bulabilirsin! 💡';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#ffd700'; // Altın
    if (score >= 60) return '#c0c0c0'; // Gümüş
    if (score >= 40) return '#cd7f32'; // Bronz
    return '#667eea'; // Mavi
  };

  if (!resultData) {
    return (
      <div className="word-result-screen">
        <div className="loading">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="word-result-screen">
      <div className="result-container">
        <div className="result-header">
          <h1 className="result-title">Kelime Mühendisi</h1>
          <h2 className="result-subtitle">Oyun Sonucu</h2>
        </div>

        <div className="action-buttons">
          <button className="action-button play-again" onClick={handlePlayAgain}>
            🔄 Tekrar Oyna
          </button>
          <button className="action-button leaderboard" onClick={handleLeaderboard}>
            🏆 Sıralama
          </button>
          <button className="action-button menu" onClick={handleBackToMenu}>
            🏠 Ana Menü
          </button>
        </div>

        <div className="result-content">
          {/* Sol Panel - Skor ve Kelime */}
          <div className="left-panel">
            <div className="score-section">
              <div className="score-display" style={{ color: getScoreColor(resultData.score) }}>
                <div className="score-number">{resultData.score}</div>
                <div className="score-label">Puan</div>
              </div>
              <div className="score-message">
                {getScoreMessage(resultData.score)}
              </div>
            </div>

            <div className="word-section">
              <h3>Bulduğun Kelime:</h3>
              <div className="word-display">
                {resultData.word}
              </div>
              <div className="word-info">
                <span className="word-length">{resultData.word.length} harf</span>
              </div>
            </div>
          </div>

          {/* Sağ Panel - İstatistikler ve Harfler */}
          <div className="right-panel">
            <div className="stats-section">
              <h3>Oyun İstatistikleri</h3>
              <div className="stat-item">
                <div className="stat-label">Kullanılan Süre</div>
                <div className="stat-value">{formatTime(resultData.timeUsed)}</div>
              </div>
            </div>

            <div className="letters-section">
              <h3>Verilen Harfler</h3>
              <div className="letters-display">
                {resultData.letters.map((letter, index) => (
                  <span 
                    key={index} 
                    className={`letter-chip ${letter === '?' ? 'joker' : ''}`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {!resultData.isLoggedIn && (
            <div className="login-reminder">
              <p>💡 Skorunu kaydetmek ve sıralamada yer almak için giriş yap!</p>
              <button className="sign-in-button" onClick={handleSignIn}>
                🔐 Google ile Giriş Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordResultScreen; 