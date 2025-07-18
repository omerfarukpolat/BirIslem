import React from 'react';
import './ResultScreen.css';

interface ResultScreenProps {
  target: number;
  userResult: number | null;
  score: number;
  timeUsed: number;
  expression: string;
  calculationHistory: any[];
  onPlayAgain: () => void;
  onGoToIntro: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({
  target,
  userResult,
  score,
  timeUsed,
  expression,
  calculationHistory,
  onPlayAgain,
  onGoToIntro
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreMessage = (score: number): string => {
    if (score >= 150) return 'Mükemmel! Harika bir performans!';
    if (score >= 100) return 'Çok iyi! Güzel bir sonuç!';
    if (score >= 50) return 'İyi! Biraz daha pratik yapabilirsin.';
    return 'Tekrar denemeye ne dersin?';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 150) return '#27ae60';
    if (score >= 100) return '#f39c12';
    if (score >= 50) return '#e67e22';
    return '#e74c3c';
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
  const accuracy = userResult ? Math.max(0, 100 - difference * 5) : 0; // 3 basamaklı için daha az ceza
  const timeBonus = Math.max(0, 120 - timeUsed) * 1; // 2 dakika için ayarlandı

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

          <div className="action-buttons">
            <button className="play-again-button" onClick={onPlayAgain}>
              Tekrar Oyna
            </button>
            <button className="intro-button" onClick={onGoToIntro}>
              Ana Menü
            </button>
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
    </div>
  );
};

export default ResultScreen;
