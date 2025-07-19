import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, GameScore, LeaderboardEntry, LeaderboardPeriod } from '../types/user';

// Google ile giriş
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  
  const user: User = {
    uid: result.user.uid,
    email: result.user.email || '',
    displayName: result.user.displayName || 'Anonim Kullanıcı',
    photoURL: result.user.photoURL || undefined,
    createdAt: new Date(),
    lastLoginAt: new Date()
  };
  
  return user;
};

// Çıkış yap
export const signOutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Auth state değişikliklerini dinle
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      const user: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || 'Anonim Kullanıcı',
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: new Date(),
        lastLoginAt: new Date()
      };
      callback(user);
    } else {
      callback(null);
    }
  });
};

// Skor kaydet
export const saveGameScore = async (score: Omit<GameScore, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const scoreData = {
      ...score,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'scores'), scoreData);
    return docRef.id;
  } catch (error) {
    console.error('Skor kaydedilirken hata:', error);
    throw new Error(`Skor kaydedilemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
  }
};

// Belirli bir dönem için leaderboard getir
export const getLeaderboard = async (period: LeaderboardPeriod): Promise<LeaderboardEntry[]> => {
  try {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const q = query(
      collection(db, 'scores'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const scores = querySnapshot.docs.map(doc => doc.data() as GameScore);
    
    // Kullanıcı bazında toplam skorları hesapla
    const userScores = new Map<string, {
      totalScore: number;
      gamesPlayed: number;
      bestScore: number;
      lastPlayed: Date;
      userName: string;
      userEmail: string;
    }>();
    
    scores.forEach(score => {
      const existing = userScores.get(score.userId);
      if (existing) {
        existing.totalScore += score.score;
        existing.gamesPlayed += 1;
        existing.bestScore = Math.max(existing.bestScore, score.score);
        existing.lastPlayed = new Date(score.createdAt);
      } else {
        userScores.set(score.userId, {
          totalScore: score.score,
          gamesPlayed: 1,
          bestScore: score.score,
          lastPlayed: new Date(score.createdAt),
          userName: score.userName,
          userEmail: score.userEmail
        });
      }
    });
    
    // Leaderboard entry'lerini oluştur ve sırala
    const leaderboard: LeaderboardEntry[] = Array.from(userScores.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      userEmail: data.userEmail,
      totalScore: data.totalScore,
      gamesPlayed: data.gamesPlayed,
      averageScore: Math.round(data.totalScore / data.gamesPlayed),
      bestScore: data.bestScore,
      lastPlayed: data.lastPlayed
    }));
    
    const sortedLeaderboard = leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    return sortedLeaderboard;
  } catch (error) {
    console.error('Leaderboard yüklenirken hata:', error);
    throw new Error(`Leaderboard yüklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
  }
};

// Kullanıcının kendi istatistiklerini getir
export const getUserStats = async (userId: string): Promise<{
  totalGames: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  lastPlayed: Date | null;
}> => {
  try {
    const q = query(
      collection(db, 'scores'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const scores = querySnapshot.docs.map(doc => doc.data() as GameScore);
    
    if (scores.length === 0) {
      return {
        totalGames: 0,
        totalScore: 0,
        averageScore: 0,
        bestScore: 0,
        lastPlayed: null
      };
    }
    
    const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
    const bestScore = Math.max(...scores.map(score => score.score));
    const lastPlayed = new Date(scores[0].createdAt);
    
    return {
      totalGames: scores.length,
      totalScore,
      averageScore: Math.round(totalScore / scores.length),
      bestScore,
      lastPlayed
    };
  } catch (error) {
    console.error('Kullanıcı istatistikleri yüklenirken hata:', error);
    throw new Error(`İstatistikler yüklenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
  }
}; 