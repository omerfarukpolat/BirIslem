import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../contexts/AuthContext';
import { saveGameScore } from '../services/firebaseService';
import { calculateScore } from '../utils/gameLogic';
import './GameScreen.css';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, signOut } = useAuth();
  const { 
    gameState, 
    startGame, 
    performCalculation, 
    undoLastStep, 
    clearAllCalculations, 
    submitResult 
  } = useGame();

  const [firstNumber, setFirstNumber] = useState<number | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [secondNumber, setSecondNumber] = useState<number | null>(null);
  const [firstNumberId, setFirstNumberId] = useState<string | null>(null);
  const [secondNumberId, setSecondNumberId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Oyun bittiğinde butonları disable et
  const isGameOver = !gameState.isGameActive || gameState.timeLeft <= 0;

  // Çıkış yap ve ana sayfaya yönlendir
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    }
  };

  // Oyunu başlat
  useEffect(() => {
    startGame();
  }, [startGame]);

  // Sonuç ekranına geçiş ve skor kaydetme
  useEffect(() => {
    if (!gameState.isGameActive && gameState.userResult !== null) {
      // Sadece giriş yapmış kullanıcıların skorlarını kaydet
      if (currentUser) {
        const scoreData = {
          userId: currentUser.uid,
          userName: currentUser.displayName,
          userEmail: currentUser.email,
          score: gameState.score,
          target: gameState.target,
          userResult: gameState.userResult,
          timeUsed: 120 - gameState.timeLeft, // Normal oyun süresi: 120 saniye
          calculationHistory: gameState.bestCalculationHistory
        };
        
        saveGameScore(scoreData).catch(error => {
          console.error('Skor kaydedilirken hata:', error);
        });
      }
      
      // Sonuç ekranına yönlendir
      navigate('/result', { 
        state: { 
          target: gameState.target,
          userResult: gameState.userResult,
          score: gameState.score,
          timeUsed: 120 - gameState.timeLeft, // Normal oyun süresi: 120 saniye
          expression: gameState.userExpression,
          calculationHistory: gameState.bestCalculationHistory,
          isLoggedIn: !!currentUser
        } 
      });
    }
  }, [gameState.isGameActive, gameState.userResult, navigate, gameState, currentUser]);

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
    if (gameState.timeLeft <= 10 && gameState.timeLeft > 0) {
      playTickTock();
    }
  }, [gameState.timeLeft]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNumberClick = (number: number, numberId: string) => {
    if (!firstNumber) {
      // İlk sayı seçimi
      setFirstNumber(number);
      setFirstNumberId(numberId);
    } else if (selectedOperator && !secondNumber) {
      // İkinci sayı seçimi
      setSecondNumber(number);
      setSecondNumberId(numberId);
    } else if (firstNumber && !selectedOperator) {
      // İlk sayıyı değiştir
      setFirstNumber(number);
      setFirstNumberId(numberId);
    } else if (firstNumber && selectedOperator && secondNumber) {
      // İkinci sayıyı değiştir
      setSecondNumber(number);
      setSecondNumberId(numberId);
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
        
        // ID'leri de gönder
        performCalculation(firstNumber, secondNumber, selectedOperator, firstNumberId || undefined, secondNumberId || undefined);
        setFirstNumber(null);
        setSelectedOperator('');
        setSecondNumber(null);
        setFirstNumberId(null);
        setSecondNumberId(null);
      }
    } else {
      // Diğer operatörler
      if (firstNumber) {
        setSelectedOperator(operator);
        // İkinci sayı seçiliyse sıfırla
        if (secondNumber) {
          setSecondNumber(null);
          setSecondNumberId(null);
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
    setFirstNumberId(null);
    setSecondNumberId(null);
  };

  // Oyun bittiğinde otomatik sonuç ekranına geçiş
  useEffect(() => {
    if (isGameOver) {
      // Kısa bir gecikme ile sonuç ekranına geç
      const timer = setTimeout(() => {
        // Final result'ı hesapla
        const finalResult = gameState.closestResult || gameState.currentResult;
        const timeUsed = 120 - gameState.timeLeft;
        const score = finalResult ? calculateScore(gameState.target, finalResult, timeUsed) : 0;
        
        // Skor kaydet (eğer kullanıcı giriş yapmışsa)
        if (currentUser && finalResult !== null) {
          const scoreData = {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            userEmail: currentUser.email,
            score: score,
            target: gameState.target,
            userResult: finalResult,
            timeUsed: timeUsed,
            calculationHistory: gameState.bestCalculationHistory
          };
          
          saveGameScore(scoreData)
            .then(docId => {
              console.log('Skor başarıyla kaydedildi, docId:', docId);
            })
            .catch(error => {
              console.error('Skor kaydedilirken hata:', error);
            });
        }
        
        // Sonuç ekranına yönlendir
        navigate('/result', { 
          state: { 
            target: gameState.target,
            userResult: finalResult,
            score: score,
            timeUsed: timeUsed,
            expression: gameState.userExpression,
            calculationHistory: gameState.bestCalculationHistory,
            isLoggedIn: !!currentUser
          } 
        });
      }, 2000); // 2 saniye bekle
      
      return () => clearTimeout(timer);
    }
  }, [isGameOver, gameState, navigate, currentUser]);

  // Hedef sayıya ulaşıldığında otomatik sonuç ekranına geçiş
  useEffect(() => {
    if (gameState.currentResult === gameState.target) {
      // Kısa bir gecikme ile sonuç ekranına geç
      const timer = setTimeout(() => {
        submitResult();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.currentResult, gameState.target, submitResult]);

  const getTimeColor = () => {
    if (gameState.timeLeft <= 20) return '#e74c3c';
    if (gameState.timeLeft <= 60) return '#f39c12';
    return '#27ae60';
  };

  // Tüm kullanılabilir sayıları al ve sırala
  const allNumbers = [...gameState.availableNumbers].sort((a, b) => a.value - b.value);

  // Sayının orijinal olup olmadığını kontrol et
  const isOriginalNumber = (number: any) => {
    return number.isOriginal;
  };

  // Sayının hesaplama sonucu olup olmadığını kontrol et
  const isCalculatedNumber = (number: any) => {
    return !number.isOriginal;
  };

  // Sayının seçili olup olmadığını kontrol et
  const isNumberSelected = (number: any) => {
    return firstNumberId === number.id || secondNumberId === number.id;
  };

  // Sayının kullanılıp kullanılmadığını kontrol et
  const isNumberUsed = (number: any) => {
    return gameState.usedNumbers.includes(number.id);
  };

  // Sayının kullanılabilir olup olmadığını kontrol et
  const isNumberAvailable = (number: any) => {
    return !isNumberUsed(number) && !isGameOver;
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

  // Seçim durumuna göre mesaj
  const getSelectionMessage = () => {
    if (isGameOver) return 'Süre doldu! Sonuç ekranına yönlendiriliyorsunuz...';
    if (!firstNumber) return 'İlk sayıyı seçin';
    if (!selectedOperator) return 'İşlem seçin';
    if (!secondNumber) return 'İkinci sayıyı seçin';
    return '= tuşuna basın';
  };

  return (
    <div className="game-screen">
      <div className="game-header">
        <div className="target-section">
          <div className="target-number">{gameState.target}</div>
        </div>
        <div className="timer-section">
          <div className={`timer ${gameState.timeLeft <= 10 ? 'warning' : ''}`} style={{ color: getTimeColor() }}>
            {formatTime(gameState.timeLeft)}
          </div>
        </div>
        <div className="user-section">
          <div className="user-info">
            {currentUser ? (
              <>
                <div className="user-avatar">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt={currentUser.displayName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {currentUser.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-details">
                  <span className="user-name">{currentUser.displayName}</span>
                  <span className="user-email">{currentUser.email}</span>
                </div>
                <button className="sign-out-button" onClick={handleSignOut}>
                  Çıkış Yap
                </button>
              </>
            ) : (
              <>
                <div className="user-avatar">
                  <div className="avatar-placeholder">
                    ?
                  </div>
                </div>
                <div className="user-details">
                  <span className="user-name">Giriş Yapılmamış</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="results-section">
        <div className="current-result-section">
          <h3>Mevcut Sonuç:</h3>
          <div className="current-result-display">
            {gameState.currentResult !== null ? gameState.currentResult : 'Henüz işlem yapılmadı'}
          </div>
        </div>

        {gameState.closestResult !== null && (
          <div className="closest-result-section">
            <h3>En Yakın Sonuç:</h3>
            <div className="closest-result-display">
              {gameState.closestResult} (Fark: {gameState.closestDifference})
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
            <h3>Sayılar ve İşlemler (Hedef Sayı: {gameState.target}):</h3>
            <div className="numbers-row">
              {allNumbers.map((number, index) => (
                <button
                  key={`number-${number.id}`}
                  className={`number-button ${
                    isNumberUsed(number) ? 'used' : 
                    isNumberSelected(number) ? 'selected' : ''
                  } ${isCalculatedNumber(number) ? 'calculated' : ''}`}
                  onClick={() => isNumberAvailable(number) && handleNumberClick(number.value, number.id)}
                  disabled={isNumberUsed(number) || isGameOver}
                >
                  {number.value}
                </button>
              ))}
            </div>
            
            <div className="operators-row">
              <button 
                className={`operator-button ${selectedOperator === '+' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('+')}
                disabled={!firstNumber || isGameOver}
              >
                +
              </button>
              <button 
                className={`operator-button ${selectedOperator === '-' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('-')}
                disabled={!firstNumber || isGameOver}
              >
                -
              </button>
              <button 
                className={`operator-button ${selectedOperator === '*' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('*')}
                disabled={!firstNumber || isGameOver}
              >
                ×
              </button>
              <button 
                className={`operator-button ${selectedOperator === '/' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('/')}
                disabled={!firstNumber || isGameOver}
              >
                ÷
              </button>
              <button 
                className={`operator-button equals ${selectedOperator === '=' ? 'selected' : ''}`}
                onClick={() => handleOperatorClick('=')}
                disabled={!isEqualsEnabled() || isGameOver}
              >
                =
              </button>
              <button 
                className="operator-button clear"
                onClick={handleClear}
                disabled={isGameOver}
              >
                ←
              </button>
            </div>

            <div className="action-controls-row">
              <button 
                className="control-button undo"
                onClick={undoLastStep}
                disabled={gameState.calculationHistory.length === 0 || isGameOver}
              >
                ← Geri Al
              </button>
              <button 
                className="control-button clear-all"
                onClick={clearAllCalculations}
                disabled={gameState.calculationHistory.length === 0 || isGameOver}
              >
                Tümünü Temizle
              </button>
              <button 
                className="control-button submit" 
                onClick={submitResult}
                disabled={isGameOver}
              >
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
            <div className="history-section">
              <h3>En İyi Sonuç İşlem Geçmişi:</h3>
              <div className="history-list">
                {gameState.bestCalculationHistory.length > 0 && gameState.bestCalculationHistory.map((step, index) => (
                  <div key={index} className="history-item">
                    {step.firstNumber} {getOperatorSymbol(step.operator)} {step.secondNumber} = {step.result}
                  </div>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;
