import React, { useState, useEffect, useRef } from 'react';
import './GameScreen.css';

interface GameScreenProps {
  numbers: number[];
  target: number;
  timeLeft: number;
  availableNumbers: number[];
  currentResult: number | null;
  calculationHistory: any[];
  closestResult: number | null;
  closestDifference: number | null;
  bestCalculationHistory: any[];
  onPerformCalculation: (firstNumber: number, secondNumber: number, operator: string) => void;
  onUndoLastStep: () => void;
  onClearAllCalculations: () => void;
  onSubmitResult: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({
  numbers,
  target,
  timeLeft,
  availableNumbers,
  currentResult,
  calculationHistory,
  closestResult,
  closestDifference,
  bestCalculationHistory,
  onPerformCalculation,
  onUndoLastStep,
  onClearAllCalculations,
  onSubmitResult
}) => {
  const [firstNumber, setFirstNumber] = useState<number | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [secondNumber, setSecondNumber] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Ses context'ini başlat
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  // Tik-tak sesi oluştur
  const playTickTock = () => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Tik sesi (yüksek frekans)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);

    // Tak sesi (düşük frekans) - 0.2 saniye sonra
    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();

      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);

      oscillator2.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
      
      gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.1);
    }, 200);
  };

  // Son 10 saniyede tik-tak sesi çal
  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0) {
      playTickTock();
    }
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNumberClick = (number: number) => {
    if (!firstNumber) {
      // İlk sayı seçimi
      setFirstNumber(number);
    } else if (selectedOperator && !secondNumber) {
      // İkinci sayı seçimi
      setSecondNumber(number);
    } else if (firstNumber && !selectedOperator) {
      // İlk sayıyı değiştir
      setFirstNumber(number);
    } else if (firstNumber && selectedOperator && secondNumber) {
      // İkinci sayıyı değiştir
      setSecondNumber(number);
    }
  };

  const handleOperatorClick = (operator: string) => {
    if (operator === '=') {
      // Eşittir operatörü - hesaplama yap
      if (firstNumber && selectedOperator && secondNumber) {
        // Bölme işleminde sonuç kontrolü
        if (selectedOperator === '/' && secondNumber !== 0) {
          const result = firstNumber / secondNumber;
          if (!Number.isInteger(result)) {
            // Sonuç tam sayı değilse işlemi engelle
            return;
          }
        }
        
        onPerformCalculation(firstNumber, secondNumber, selectedOperator);
        setFirstNumber(null);
        setSelectedOperator('');
        setSecondNumber(null);
      }
    } else {
      // Diğer operatörler
      if (firstNumber) {
        setSelectedOperator(operator);
        // İkinci sayı seçiliyse sıfırla
        if (secondNumber) {
          setSecondNumber(null);
        }
      }
    }
  };

  // Bölme işleminde sonuç kontrolü
  const isDivisionValid = () => {
    if (firstNumber && selectedOperator === '/' && secondNumber) {
      if (secondNumber === 0) return false; // Sıfıra bölme
      const result = firstNumber / secondNumber;
      return Number.isInteger(result);
    }
    return true;
  };

  // Eşittir operatörünün aktif olup olmadığını kontrol et
  const isEqualsEnabled = () => {
    if (!firstNumber || !selectedOperator || !secondNumber) return false;
    
    // Bölme işleminde özel kontrol
    if (selectedOperator === '/') {
      return isDivisionValid();
    }
    
    return true;
  };

  const handleClear = () => {
    setFirstNumber(null);
    setSelectedOperator('');
    setSecondNumber(null);
  };

  // Hedef sayıya ulaşıldığında otomatik sonuç ekranına geçiş
  useEffect(() => {
    if (currentResult === target) {
      // Kısa bir gecikme ile sonuç ekranına geç
      const timer = setTimeout(() => {
        onSubmitResult();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentResult, target, onSubmitResult]);

  const getTimeColor = () => {
    if (timeLeft <= 20) return '#e74c3c';
    if (timeLeft <= 60) return '#f39c12';
    return '#27ae60';
  };

  const isNumberSelected = (number: number) => {
    return firstNumber === number || secondNumber === number;
  };

  const isNumberAvailable = (number: number) => {
    return availableNumbers.includes(number);
  };

  const isOriginalNumber = (number: number) => {
    return numbers.includes(number);
  };

  const getOperatorSymbol = (operator: string) => {
    switch (operator) {
      case '+': return '+';
      case '-': return '-';
      case '*': return '×';
      case '/': return '÷';
      case '=': return '=';
      default: return operator;
    }
  };

  // Orijinal sayıları ve yeni oluşan sayıları ayır
  const originalNumbers = availableNumbers.filter(num => isOriginalNumber(num));
  const calculatedNumbers = availableNumbers.filter(num => !isOriginalNumber(num));

  // Tüm sayıları sıralı şekilde birleştir (orijinal + hesaplanan)
  const allNumbers = [...originalNumbers, ...calculatedNumbers].sort((a, b) => a - b);

  // Seçim durumuna göre mesaj
  const getSelectionMessage = () => {
    if (!firstNumber) return 'İlk sayıyı seçin';
    if (!selectedOperator) return 'İşlem seçin';
    if (!secondNumber) return 'İkinci sayıyı seçin';
    return '= tuşuna basın';
  };

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="target-section">
          <h2>Hedef: <span className="target-number">{target}</span></h2>
        </div>
        <div className="timer-section">
          <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`} style={{ color: getTimeColor() }}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="results-section">
        <div className="current-result-section">
          <h3>Mevcut Sonuç:</h3>
          <div className="current-result-display">
            {currentResult !== null ? currentResult : 'Henüz işlem yapılmadı'}
          </div>
        </div>

        {closestResult !== null && (
          <div className="closest-result-section">
            <h3>En Yakın Sonuç:</h3>
            <div className="closest-result-display">
              {closestResult} (Fark: {closestDifference})
            </div>
          </div>
        )}
      </div>

      <div className="selection-status">
        <div className="status-message">{getSelectionMessage()}</div>
      </div>

      <div className="main-game-area">
        <div className="left-panel">
          <div className="numbers-operators-section">
            <h3>Sayılar ve İşlemler:</h3>
            <div className="numbers-row">
              {allNumbers.map((number, index) => (
                <button
                  key={`number-${index}`}
                  className={`number-button ${
                    !isNumberAvailable(number) ? 'used' : 
                    isNumberSelected(number) ? 'selected' : ''
                  } ${!isOriginalNumber(number) ? 'calculated' : ''}`}
                  onClick={() => isNumberAvailable(number) && handleNumberClick(number)}
                  disabled={!isNumberAvailable(number)}
                >
                  {number}
                </button>
              ))}
            </div>
            
            <div className="operators-row">
              <button 
                className={`operator-button ${selectedOperator === '+' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('+')}
                disabled={!firstNumber}
              >
                +
              </button>
              <button 
                className={`operator-button ${selectedOperator === '-' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('-')}
                disabled={!firstNumber}
              >
                -
              </button>
              <button 
                className={`operator-button ${selectedOperator === '*' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('*')}
                disabled={!firstNumber}
              >
                ×
              </button>
              <button 
                className={`operator-button ${selectedOperator === '/' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('/')}
                disabled={!firstNumber}
              >
                ÷
              </button>
              <button 
                className={`operator-button equals ${selectedOperator === '=' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('=')}
                disabled={!isEqualsEnabled()}
              >
                =
              </button>
              <button 
                className="operator-button clear"
                onClick={handleClear}
              >
                ←
              </button>
            </div>

            <div className="action-controls-row">
              <button 
                className="control-button undo"
                onClick={onUndoLastStep}
                disabled={calculationHistory.length === 0}
              >
                ← Geri Al
              </button>
              <button 
                className="control-button clear-all"
                onClick={onClearAllCalculations}
                disabled={calculationHistory.length === 0}
              >
                Tümünü Temizle
              </button>
              <button className="control-button submit" onClick={onSubmitResult}>
                Sonucu Gönder
              </button>
            </div>
          </div>

          <div className="calculation-section">
            <div className="calculation-display">
              {firstNumber && (
                <div className="selected-numbers">
                  {firstNumber}
                  {selectedOperator && (
                    <>
                      <span className="operator-display">{getOperatorSymbol(selectedOperator)}</span>
                      {secondNumber ? (
                        <>
                          {secondNumber}
                          <span className="equals">=</span>
                          <span className="result-preview">
                            {(() => {
                              const a = firstNumber;
                              const b = secondNumber;
                              switch (selectedOperator) {
                                case '+': return a + b;
                                case '-': return a - b;
                                case '*': return a * b;
                                case '/': 
                                  if (b === 0) return 'Hata';
                                  const result = a / b;
                                  return Number.isInteger(result) ? result : 'Geçersiz';
                                default: return '?';
                              }
                            })()}
                          </span>
                        </>
                      ) : (
                        <span className="waiting">?</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="right-panel">
          {bestCalculationHistory.length > 0 && (
            <div className="history-section">
              <h3>En İyi Sonuç İşlem Geçmişi:</h3>
              <div className="history-list">
                {bestCalculationHistory.map((step, index) => (
                  <div key={index} className="history-item">
                    {step.firstNumber} {getOperatorSymbol(step.operator)} {step.secondNumber} = {step.result}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
