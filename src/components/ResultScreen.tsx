import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { soundManager } from '../utils/soundEffects';
import Fireworks from './Fireworks';
import './ResultScreen.css';

interface ResultData {
  target: number;
  userResult: number | null;
  score: number;
  timeUsed: number;
  expression: string;
  calculationHistory: any[];
  isLoggedIn?: boolean;
}

const ResultScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, signIn } = useAuth();
  const resultData = location.state as ResultData;
  const [showFireworks, setShowFireworks] = useState(false);

  // Eğer result data yoksa ana sayfaya yönlendir
  if (!resultData) {
    navigate('/');
    return null;
  }

  const { target, userResult, score, timeUsed, expression, calculationHistory, isLoggedIn } = resultData;

  // Yüksek puan kontrolü ve havai fişek
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (score >= 130) {
      // Yüksek puan sesi çal
      soundManager.playHighScore();

      // Havai fişekleri başlat
      setShowFireworks(true);

      // 5 saniye sonra havai fişekleri durdur
      const timer = setTimeout(() => {
        setShowFireworks(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [score]);

  const handlePlayAgain = () => {
    navigate('/game');
  };

  const handleGoToIntro = () => {
    navigate('/');
  };

  const handleSignIn = async () => {
    try {
      await signIn();
      // Giriş yaptıktan sonra leaderboard'a yönlendir
      navigate('/leaderboard');
    } catch (error) {
      console.error('Giriş yapılırken hata:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreMessage = (score: number): string => {
    if (score >= 130) return 'Mükemmel! Harika bir performans!';
    if (score >= 100) return 'Çok iyi! Güzel bir sonuç!';
    if (score >= 70) return 'İyi! Biraz daha pratik yapabilirsin.';
    if (score >= 40) return 'Orta! Daha fazla çalışmaya ihtiyacın var.';
    return 'Tekrar denemeye ne dersin?';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 130) return '#27ae60';
    if (score >= 100) return '#f39c12';
    if (score >= 70) return '#e67e22';
    if (score >= 40) return '#e74c3c';
    return '#c0392b';
  };

  const getOperatorSymbol = (operator: string) => {
    switch (operator) {
      case '+': return '+';
      case '-': return '-';
      case '*': return '×';
      case '/': return '÷';
      default: return operator;
    }
  };

  const difference = userResult ? Math.abs(target - userResult) : 0;

  // Yeni puanlama sistemi
  let accuracyScore = 0;
  if (difference === 0) {
    accuracyScore = 100;
  } else if (difference <= 10) {
    accuracyScore = 95 - (difference * 1.5);
  } else if (difference <= 50) {
    accuracyScore = 80 - ((difference - 10) * 0.75);
  } else if (difference <= 100) {
    accuracyScore = 50 - ((difference - 50) * 0.6);
  } else {
    accuracyScore = Math.max(0, 20 - ((difference - 100) * 0.1));
  }

  // Süre puanı (varsayılan 120 saniye için)
  const timeLimit = 120; // Bu değer ayarlardan gelmeli
  const timeRatio = timeUsed / timeLimit;
  let timeScore = 0;

  if (timeRatio <= 0.25) {
    timeScore = 50;
  } else if (timeRatio <= 0.5) {
    timeScore = 50 - ((timeRatio - 0.25) * 40);
  } else if (timeRatio <= 0.75) {
    timeScore = 40 - ((timeRatio - 0.5) * 60);
  } else if (timeRatio <= 1) {
    timeScore = 25 - ((timeRatio - 0.75) * 100);
  } else {
    timeScore = 0;
  }

  const accuracy = Math.round(accuracyScore);
  const timeBonus = Math.round(timeScore);

  return (
    <div className="result-screen">
      <div className="result-container">
        <div className="result-content">
          <h1 className="result-title">Oyun Bitti!</h1>

          <div className="score-section">
            <div className="final-score" style={{ color: getScoreColor(score) }}>
              {score} Puan
            </div>
            <div className="score-message">
              {getScoreMessage(score)}
            </div>
          </div>

          <div className="action-buttons">
            <button className="play-again-button" onClick={handlePlayAgain}>
              Tekrar Oyna
            </button>
            <button className="intro-button" onClick={handleGoToIntro}>
              Ana Menü
            </button>
          </div>

          {/* Giriş yapmamış kullanıcılar için özel mesaj */}
          {!currentUser && (
            <div className="login-notice">
              <div className="notice-icon">🏆</div>
              <div className="notice-content">
                <h3>Skorunuzu Kaydetmek İster misiniz?</h3>
                <p>Giriş yaparak skorunuzu kaydedebilir ve sıralamalarda yer alabilirsiniz!</p>
                <button className="signin-notice-button" onClick={handleSignIn}>
                  Google ile Giriş Yap
                </button>
              </div>
            </div>
          )}

          {/* Giriş yapmış kullanıcılar için skor kaydedildi mesajı */}
          {currentUser && (
            <div className="score-saved-notice">
              <div className="notice-icon">✅</div>
              <div className="notice-content">
                <h3>Skorunuz Kaydedildi!</h3>
                <p>Sıralamalarda yer almak için leaderboard'u kontrol edin.</p>
                <button className="leaderboard-notice-button" onClick={() => navigate('/leaderboard')}>
                  Sıralamayı Görüntüle
                </button>
              </div>
            </div>
          )}

          <div className="result-details">
            <div className="detail-row">
              <span className="detail-label">Hedef:</span>
              <span className="detail-value target">{target}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Sonucunuz:</span>
              <span className="detail-value result">
                {userResult !== null ? userResult : 'İşlem yapılmadı'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Fark:</span>
              <span className="detail-value difference">
                {userResult !== null ? difference : '-'}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Kullanılan Süre:</span>
              <span className="detail-value time">{formatTime(timeUsed)}</span>
            </div>
          </div>

          <div className="score-breakdown">
            <h3>Puan Dağılımı:</h3>
            <div className="breakdown-item">
              <span>Doğruluk Puanı:</span>
              <span>{accuracy} puan</span>
            </div>
            <div className="breakdown-item">
              <span>Süre Bonusu:</span>
              <span>{timeBonus} puan</span>
            </div>
            <div className="breakdown-item total">
              <span>Toplam:</span>
              <span>{score} puan</span>
            </div>
          </div>
        </div>

        {calculationHistory.length > 0 && (
          <div className="history-sidebar">
            <h3>İşlem Geçmişi</h3>
            <div className="history-list">
              {calculationHistory.map((step, index) => (
                <div key={index} className="history-item">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-calculation">
                    {step.firstNumber} {getOperatorSymbol(step.operator)} {step.secondNumber} = {step.result}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showFireworks && <Fireworks isActive={showFireworks} />}
    </div>
  );
};

export default ResultScreen;
