import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLeaderboard, getUserStats } from '../services/firebaseService';
import { LeaderboardEntry, LeaderboardPeriod } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import './LeaderboardScreen.css';

type SortType = 'bestScore' | 'averageScore' | 'totalScore' | 'gamesPlayed';

const LeaderboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily');
  const [sortType, setSortType] = useState<SortType>('totalScore');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<any>(null);

  // Sıralama seçenekleri
  const sortOptions = [
    { value: 'bestScore', label: 'En İyi Skor', icon: '🏆' },
    { value: 'averageScore', label: 'Ortalama Skor', icon: '📊' },
    { value: 'totalScore', label: 'Toplam Skor', icon: '📈' },
    { value: 'gamesPlayed', label: 'Oyun Sayısı', icon: '🎮' }
  ];

  // Sıralanmış leaderboard
  const sortedLeaderboard = useMemo(() => {
    if (!leaderboard.length) return [];
    
    return [...leaderboard].sort((a, b) => {
      switch (sortType) {
        case 'bestScore':
          return b.bestScore - a.bestScore;
        case 'averageScore':
          return b.averageScore - a.averageScore;
        case 'totalScore':
          return b.totalScore - a.totalScore;
        case 'gamesPlayed':
          return b.gamesPlayed - a.gamesPlayed;
        default:
          return 0;
      }
    });
  }, [leaderboard, sortType]);

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

  const getSortLabel = (type: SortType): string => {
    const option = sortOptions.find(opt => opt.value === type);
    return option ? option.label : '';
  };

  return (
    <div className="leaderboard-screen">
      <div className="leaderboard-container">
        <div className="leaderboard-header">
          <h1 className="leaderboard-title">🏆 Sıralama</h1>
          
          {/* Dönem Seçici */}
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

          {/* Sıralama Seçici */}
          <div className="sort-selector">
            <div className="sort-label">Sıralama:</div>
            <div className="sort-options">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`sort-button ${sortType === option.value ? 'active' : ''}`}
                  onClick={() => setSortType(option.value as SortType)}
                  title={option.label}
                >
                  <span className="sort-icon">{option.icon}</span>
                  <span className="sort-text">{option.label}</span>
                </button>
              ))}
            </div>
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
              {sortedLeaderboard.length === 0 ? (
                <div className="no-data">Henüz skor bulunmuyor.</div>
              ) : (
                <>
                  {/* Sıralama Başlığı */}
                  <div className="sort-header">
                    <span className="sort-indicator">
                      {sortOptions.find(opt => opt.value === sortType)?.icon} 
                      {getSortLabel(sortType)}'e göre sıralanıyor
                    </span>
                  </div>
                  
                  {/* Sıralama Listesi */}
                  {sortedLeaderboard.map((entry, index) => (
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
                  ))}
                </>
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