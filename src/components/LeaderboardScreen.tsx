import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard, getUserStats } from '../services/firebaseService';
import { LeaderboardEntry, LeaderboardPeriod } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import './LeaderboardScreen.css';

const LeaderboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  useEffect(() => {
    if (currentUser) {
      loadUserStats();
    }
  }, [currentUser]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLeaderboard(period);
      setLeaderboard(data);
    } catch (error) {
      console.error('Leaderboard yüklenirken hata:', error);
      setError(error instanceof Error ? error.message : 'Sıralama yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!currentUser) return;
    
    try {
      const stats = await getUserStats(currentUser.uid);
      setUserStats(stats);
    } catch (error) {
      console.error('Kullanıcı istatistikleri yüklenirken hata:', error);
      // Kullanıcı istatistikleri hata verirse sessizce geç, ana işlevselliği etkilemesin
    }
  };

  const getPeriodText = (period: LeaderboardPeriod): string => {
    switch (period) {
      case 'daily': return 'Günlük';
      case 'weekly': return 'Haftalık';
      case 'monthly': return 'Aylık';
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handlePlayGame = () => {
    navigate('/game');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="leaderboard-screen">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">🏆 Sıralama</h1>
          <div className="period-selector">
            <button 
              className={`period-button ${period === 'daily' ? 'active' : ''}`}
              onClick={() => setPeriod('daily')}
            >
              Günlük
            </button>
            <button 
              className={`period-button ${period === 'weekly' ? 'active' : ''}`}
              onClick={() => setPeriod('weekly')}
            >
              Haftalık
            </button>
            <button 
              className={`period-button ${period === 'monthly' ? 'active' : ''}`}
              onClick={() => setPeriod('monthly')}
            >
              Aylık
            </button>
          </div>
        </div>

        {currentUser && userStats && (
          <div className="user-stats-section">
            <h3>Senin İstatistiklerin</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{userStats.totalGames}</div>
                <div className="stat-label">Toplam Oyun</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.totalScore}</div>
                <div className="stat-label">Toplam Puan</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.averageScore}</div>
                <div className="stat-label">Ortalama Puan</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{userStats.bestScore}</div>
                <div className="stat-label">En İyi Puan</div>
              </div>
            </div>
          </div>
        )}

        <div className="leaderboard-content">
          {loading ? (
            <div className="loading">Yükleniyor...</div>
          ) : error ? (
            <div className="error-section">
              <div className="error-message">{error}</div>
              <button className="retry-button" onClick={loadLeaderboard}>
                Tekrar Dene
              </button>
            </div>
          ) : (
            <div className="leaderboard-list">
              {leaderboard.length === 0 ? (
                <div className="no-data">Henüz skor bulunmuyor.</div>
              ) : (
                leaderboard.map((entry, index) => (
                  <div 
                    key={entry.userId} 
                    className={`leaderboard-item ${currentUser?.uid === entry.userId ? 'current-user' : ''}`}
                  >
                    <div className="rank">{index + 1}</div>
                    <div className="user-info">
                      <div className="user-name">{entry.userName}</div>
                      <div className="user-details">
                        {entry.gamesPlayed} oyun • Ortalama: {entry.averageScore}
                      </div>
                    </div>
                    <div className="score-info">
                      <div className="total-score">{entry.totalScore}</div>
                      <div className="best-score">En İyi: {entry.bestScore}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button className="play-button" onClick={handlePlayGame}>
            Oyna
          </button>
          <button className="home-button" onClick={handleGoHome}>
            Ana Menü
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardScreen; 