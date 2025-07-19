export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface GameScore {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  target: number;
  userResult: number;
  timeUsed: number;
  createdAt: Date;
  calculationHistory: any[];
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userEmail: string;
  totalScore: number;
  gamesPlayed: number;
  averageScore: number;
  bestScore: number;
  lastPlayed: Date;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly';

export interface LeaderboardData {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  lastUpdated: Date;
} 