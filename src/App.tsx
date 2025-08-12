import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import IntroScreen from './components/IntroScreen';
import GameScreen from './components/GameScreen';
import ResultScreen from './components/ResultScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import { applyPerformanceMode } from './utils/devicePerformance';
import PerformanceSettings from './components/PerformanceSettings';

function App() {
  // Performans modunu uygula
  useEffect(() => {
    applyPerformanceMode();

    // Pencere yeniden boyutlandırıldığında tekrar kontrol et
    const handleResize = () => {
      applyPerformanceMode();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="App">
          <Routes>
            <Route path="/" element={<IntroScreen />} />
            <Route path="/game" element={<GameScreen />} />
            <Route path="/result" element={<ResultScreen />} />
            <Route path="/leaderboard" element={<LeaderboardScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <PerformanceSettings />
      </Router>
    </AuthProvider>
  );
}

export default App;
