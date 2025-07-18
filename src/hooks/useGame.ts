import { useState, useEffect, useCallback } from 'react';
import { GameState, GameResult, CalculationStep } from '../types/game';
import { initializeGame, evaluateExpression, calculateScore, calculateResult } from '../utils/gameLogic';

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    currentScreen: 'intro',
    numbers: [],
    target: 0,
    timeLeft: 120,
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
    bestResult: null
  });

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
              ? calculateScore(prev.target, finalResult, 120 - newTimeLeft)
              : 0;
            
            return {
              ...prev,
              timeLeft: 0,
              isGameActive: false,
              currentScreen: 'result',
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
  }, [gameState.isGameActive, gameState.timeLeft]);

  // Oyunu başlat
  const startGame = useCallback(() => {
    const newGame = initializeGame();
    setGameState({
      ...newGame,
      availableNumbers: [...newGame.numbers],
      currentResult: null,
      calculationHistory: [],
      closestResult: null,
      closestDifference: null,
      bestCalculationHistory: [],
      bestResult: null
    });
  }, []);

  // İki sayı arasında işlem yap
  const performCalculation = useCallback((firstNumber: number, secondNumber: number, operator: string) => {
    setGameState(prev => {
      const result = calculateResult(firstNumber, secondNumber, operator as any);
      const newStep: CalculationStep = {
        firstNumber,
        secondNumber,
        operator: operator as any,
        result
      };
      
      // Kullanılan sayıları listeden çıkar
      const newAvailableNumbers = prev.availableNumbers.filter(num => 
        num !== firstNumber && num !== secondNumber
      );
      
      // Sonucu kullanılabilir sayılara ekle
      newAvailableNumbers.push(result);
      
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
        closestResult: newClosestResult,
        closestDifference: newClosestDifference,
        bestResult: newBestResult,
        bestCalculationHistory: newBestCalculationHistory
      };
    });
  }, []);

  // Son adımı geri al
  const undoLastStep = useCallback(() => {
    setGameState(prev => {
      if (prev.calculationHistory.length === 0) return prev;
      
      const lastStep = prev.calculationHistory[prev.calculationHistory.length - 1];
      const newHistory = prev.calculationHistory.slice(0, -1);
      
      // Kullanılan sayıları geri ekle, sonucu çıkar
      const newAvailableNumbers = prev.availableNumbers.filter(num => num !== lastStep.result);
      newAvailableNumbers.push(lastStep.firstNumber, lastStep.secondNumber);
      
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
        closestResult: newClosestResult,
        closestDifference: newClosestDifference,
        bestResult: newBestResult,
        bestCalculationHistory: newBestCalculationHistory
      };
    });
  }, []);

  // Tüm işlemleri temizle
  const clearAllCalculations = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentResult: null,
      calculationHistory: [],
      availableNumbers: [...prev.numbers]
    }));
  }, []);

  // Sonucu hesapla ve oyunu bitir
  const submitResult = useCallback(() => {
    const finalResult = gameState.closestResult || gameState.currentResult;
    const timeUsed = 120 - gameState.timeLeft;
    const score = finalResult ? calculateScore(gameState.target, finalResult, timeUsed) : 0;

    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      currentScreen: 'result',
      userResult: finalResult,
      score
    }));
  }, [gameState.closestResult, gameState.currentResult, gameState.target, gameState.timeLeft]);

  // Ana menüye dön
  const goToIntro = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      currentScreen: 'intro'
    }));
  }, []);

  return {
    gameState,
    startGame,
    performCalculation,
    undoLastStep,
    clearAllCalculations,
    submitResult,
    goToIntro
  };
}; 