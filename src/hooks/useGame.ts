import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameState, GameResult, CalculationStep, NumberWithId } from '../types/game';
import { initializeGame, evaluateExpression, calculateScore, calculateResult } from '../utils/gameLogic';
import { GameSettings } from '../components/SettingsModal';

// localStorage key'leri
const GAME_SETTINGS_KEY = 'gameSettings';

// localStorage'dan ayarları yükle
const loadGameSettings = (): GameSettings => {
  try {
    const savedSettings = localStorage.getItem(GAME_SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Ayarlar yüklenirken hata:', error);
  }
  
  // Varsayılan ayarlar
  return {
    timeLimit: 120, // 2 dakika varsayılan
    operationLimit: 0 // Sınırsız varsayılan
  };
};

// Ayarları localStorage'a kaydet
const saveGameSettings = (settings: GameSettings) => {
  try {
    localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Ayarlar kaydedilirken hata:', error);
  }
};

export const useGame = () => {
  // localStorage'dan ayarları yükle
  const [gameSettings, setGameSettings] = useState<GameSettings>(loadGameSettings);
  
  const [gameState, setGameState] = useState<GameState>({
    numbers: [],
    target: 0,
    timeLeft: gameSettings.timeLimit,
    score: 0,
    userExpression: '',
    userResult: null,
    isGameActive: false,
    availableNumbers: [],
    currentResult: null,
    calculationHistory: [],
    closestResult: null,
    closestDifference: null,
    bestCalculationHistory: [],
    bestResult: null,
    usedNumbers: []
  });

  // Ayarlar değiştiğinde localStorage'a kaydet
  useEffect(() => {
    saveGameSettings(gameSettings);
  }, [gameSettings]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState.isGameActive && gameState.timeLeft > 0) {
      interval = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          
          if (newTimeLeft <= 0) {
            // Süre doldu, oyunu bitir
            const finalResult = prev.closestResult || prev.currentResult;
            const finalScore = finalResult 
              ? calculateScore(prev.target, finalResult, gameSettings.timeLimit)
              : 0;
            
            return {
              ...prev,
              timeLeft: 0,
              isGameActive: false,
              userResult: finalResult,
              score: finalScore
            };
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameState.isGameActive, gameState.timeLeft, gameSettings.timeLimit]);

  // Oyunu başlat
  const startGame = useCallback((settings?: GameSettings) => {
    const settingsToUse = settings || gameSettings;
    const newGame = initializeGame();
    const availableNumbersWithIds: NumberWithId[] = newGame.numbers.map((num, index) => ({
      id: `original-${index}`,
      value: num,
      isOriginal: true
    }));
    
    setGameState({
      ...newGame,
      timeLeft: settingsToUse.timeLimit,
      availableNumbers: availableNumbersWithIds,
      currentResult: null,
      calculationHistory: [],
      closestResult: null,
      closestDifference: null,
      bestCalculationHistory: [],
      bestResult: null,
      usedNumbers: []
    });
    
    // Eğer yeni settings verildiyse güncelle
    if (settings) {
      setGameSettings(settings);
    }
  }, [gameSettings]);

  // İki sayı arasında işlem yap
  const performCalculation = useCallback((firstNumber: number, secondNumber: number, operator: string, firstNumberId?: string, secondNumberId?: string) => {
    setGameState(prev => {
      // İşlem sınırı kontrolü
      if (gameSettings.operationLimit > 0 && prev.calculationHistory.length >= gameSettings.operationLimit) {
        return prev; // İşlem sınırına ulaşıldıysa işlemi yapma
      }
      
      const result = calculateResult(firstNumber, secondNumber, operator as any);
      const newStep: CalculationStep = {
        firstNumber,
        secondNumber,
        operator: operator as any,
        result
      };
      
      // Kullanılan sayıların ID'lerini bul (eğer parametre olarak verilmemişse)
      const firstId = firstNumberId || prev.availableNumbers.find(num => num.value === firstNumber)?.id;
      const secondId = secondNumberId || prev.availableNumbers.find(num => num.value === secondNumber)?.id;
      
      // Kullanılan sayıları usedNumbers'a ekle
      const newUsedNumbers = [...prev.usedNumbers];
      if (firstId) newUsedNumbers.push(firstId);
      if (secondId) newUsedNumbers.push(secondId);
      
      // Sonucu her zaman kullanılabilir sayılara ekle
      const newNumberId = `calculated-${Date.now()}-${Math.random()}`;
      const newAvailableNumbers = [...prev.availableNumbers, {
        id: newNumberId,
        value: result,
        isOriginal: false
      }];
      
      // En yakın sonucu güncelle
      const currentDifference = Math.abs(prev.target - result);
      const newClosestResult = prev.closestResult === null || currentDifference < (prev.closestDifference || Infinity)
        ? result
        : prev.closestResult;
      const newClosestDifference = prev.closestResult === null || currentDifference < (prev.closestDifference || Infinity)
        ? currentDifference
        : prev.closestDifference;
      
      // En iyi sonucu güncelle
      const newBestResult = prev.bestResult === null || currentDifference < Math.abs(prev.target - (prev.bestResult || 0))
        ? result
        : prev.bestResult;
      const newBestCalculationHistory = prev.bestResult === null || currentDifference < Math.abs(prev.target - (prev.bestResult || 0))
        ? [...prev.calculationHistory, newStep]
        : prev.bestCalculationHistory;
      
      return {
        ...prev,
        currentResult: result,
        calculationHistory: [...prev.calculationHistory, newStep],
        availableNumbers: newAvailableNumbers,
        usedNumbers: newUsedNumbers,
        closestResult: newClosestResult,
        closestDifference: newClosestDifference,
        bestResult: newBestResult,
        bestCalculationHistory: newBestCalculationHistory
      };
    });
  }, [gameSettings.operationLimit]);

  // Son adımı geri al
  const undoLastStep = useCallback(() => {
    setGameState(prev => {
      if (prev.calculationHistory.length === 0) return prev;
      
      const lastStep = prev.calculationHistory[prev.calculationHistory.length - 1];
      const newHistory = prev.calculationHistory.slice(0, -1);
      
      // Sonucu her zaman çıkar (en son eklenen calculated number)
      const newAvailableNumbers = prev.availableNumbers.filter(num => {
        // En son eklenen calculated number'ı çıkar
        if (!num.isOriginal && num.value === lastStep.result) {
          // Aynı değere sahip birden fazla calculated number varsa sadece en sonunu çıkar
          const calculatedNumbersWithSameValue = prev.availableNumbers.filter(n => 
            !n.isOriginal && n.value === lastStep.result
          );
          if (calculatedNumbersWithSameValue.length > 1) {
            // En son eklenen calculated number'ı bul ve çıkar
            const lastCalculatedNumber = calculatedNumbersWithSameValue[calculatedNumbersWithSameValue.length - 1];
            return num.id !== lastCalculatedNumber.id;
          }
          return false; // Tek calculated number varsa çıkar
        }
        return true;
      });
      
      // Kullanılan sayıları usedNumbers'dan çıkar
      const newUsedNumbers = prev.usedNumbers.filter(id => {
        const num = prev.availableNumbers.find(n => n.id === id);
        return num && num.value !== lastStep.firstNumber && num.value !== lastStep.secondNumber;
      });
      
      // Yeni current result'ı belirle
      const newCurrentResult = newHistory.length > 0 
        ? newHistory[newHistory.length - 1].result 
        : null;
      
      // En yakın sonucu yeniden hesapla
      let newClosestResult = null;
      let newClosestDifference = null;
      let newBestResult = null;
      let newBestCalculationHistory: CalculationStep[] = [];
      
      if (newHistory.length > 0) {
        const allResults = newHistory.map(step => step.result);
        const differences = allResults.map(result => Math.abs(prev.target - result));
        const minDifferenceIndex = differences.indexOf(Math.min(...differences));
        newClosestResult = allResults[minDifferenceIndex];
        newClosestDifference = differences[minDifferenceIndex];
        
        // En iyi sonucu yeniden hesapla
        const bestDifferenceIndex = differences.indexOf(Math.min(...differences));
        newBestResult = allResults[bestDifferenceIndex];
        newBestCalculationHistory = newHistory.slice(0, bestDifferenceIndex + 1);
      }
      
      return {
        ...prev,
        currentResult: newCurrentResult,
        calculationHistory: newHistory,
        availableNumbers: newAvailableNumbers,
        usedNumbers: newUsedNumbers,
        closestResult: newClosestResult,
        closestDifference: newClosestDifference,
        bestResult: newBestResult,
        bestCalculationHistory: newBestCalculationHistory
      };
    });
  }, []);

  // Tüm işlemleri temizle
  const clearAllCalculations = useCallback(() => {
    setGameState(prev => {
      const originalNumbersWithIds: NumberWithId[] = prev.numbers.map((num, index) => ({
        id: `original-${index}`,
        value: num,
        isOriginal: true
      }));
      
      return {
        ...prev,
        currentResult: null,
        calculationHistory: [],
        availableNumbers: originalNumbersWithIds,
        usedNumbers: []
      };
    });
  }, []);

  // Sonucu hesapla ve oyunu bitir
  const submitResult = useCallback(() => {
    const finalResult = gameState.closestResult || gameState.currentResult;
    const timeUsed = gameSettings.timeLimit - gameState.timeLeft;
    const score = finalResult ? calculateScore(gameState.target, finalResult, timeUsed) : 0;

    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      userResult: finalResult,
      score
    }));
  }, [gameState.closestResult, gameState.currentResult, gameState.target, gameState.timeLeft, gameSettings.timeLimit]);

  return {
    gameState,
    startGame,
    performCalculation,
    undoLastStep,
    clearAllCalculations,
    submitResult,
    gameSettings
  };
}; 