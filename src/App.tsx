import React from 'react';
import './App.css';
import { useGame } from './hooks/useGame';
import IntroScreen from './components/IntroScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';

function App() {
  const { 
    gameState, 
    startGame, 
    performCalculation, 
    undoLastStep, 
    clearAllCalculations, 
    submitResult, 
    goToIntro 
  } = useGame();

  const renderScreen = () => {
    switch (gameState.currentScreen) {
      case 'intro':
        return <IntroScreen onStartGame={startGame} />;
      
      case 'game':
        return (
          <GameScreen
            numbers={gameState.numbers}
            target={gameState.target}
            timeLeft={gameState.timeLeft}
            availableNumbers={gameState.availableNumbers}
            currentResult={gameState.currentResult}
            calculationHistory={gameState.calculationHistory}
            closestResult={gameState.closestResult}
            closestDifference={gameState.closestDifference}
            bestCalculationHistory={gameState.bestCalculationHistory}
            onPerformCalculation={performCalculation}
            onUndoLastStep={undoLastStep}
            onClearAllCalculations={clearAllCalculations}
            onSubmitResult={submitResult}
          />
        );
      
      case 'result':
        return (
          <ResultScreen
            target={gameState.target}
            userResult={gameState.userResult}
            score={gameState.score}
            timeUsed={120 - gameState.timeLeft}
            expression={gameState.userExpression}
            calculationHistory={gameState.bestCalculationHistory}
            onPlayAgain={startGame}
            onGoToIntro={goToIntro}
          />
        );
      
      default:
        return <IntroScreen onStartGame={startGame} />;
    }
  };

  return (
    <div className="App">
      {renderScreen()}
    </div>
  );
}

export default App;
