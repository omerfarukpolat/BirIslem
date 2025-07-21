import { Operator } from '../types/game';

// Rastgele sayı üretme (5 küçük sayı + 1 büyük sayı)
export const generateRandomNumbers = (): number[] => {
  const smallNumbers: number[] = [];
  const bigNumbers: number[] = [];
  
  // 5 adet küçük sayı (1-9)
  while (smallNumbers.length < 5) {
    const randomNum = Math.floor(Math.random() * 9) + 1;
    if (!smallNumbers.includes(randomNum)) {
      smallNumbers.push(randomNum);
    }
  }
  
  // 1 adet büyük sayı (10-99)
  const bigNumber = Math.floor(Math.random() * 90) + 10;
  bigNumbers.push(bigNumber);
  
  return [...smallNumbers, ...bigNumbers];
};

// Hedef sayı üretme (3 basamaklı: 100-999)
export const generateTargetNumber = (): number => {
  return Math.floor(Math.random() * 900) + 100;
};

// Matematiksel işlem yapma
export const calculateResult = (a: number, b: number, operator: Operator): number => {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b !== 0 ? a / b : 0;
    default:
      return 0;
  }
};

// Kullanıcının girdiği ifadeyi hesaplama
export const evaluateExpression = (expression: string): number | null => {
  try {
    // Güvenlik için sadece sayılar ve operatörlere izin ver
    const sanitizedExpression = expression.replace(/[^0-9+\-*/().]/g, '');
    const result = eval(sanitizedExpression);
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

// Puan hesaplama - Optimize edilmiş sistem
export const calculateScore = (target: number, userResult: number, timeUsed: number, timeLimit: number = 120): number => {
  // 1. Doğruluk Puanı (0-150 arası) - Ana faktör
  const difference = Math.abs(target - userResult);
  let accuracyScore = 0;
  
  if (difference === 0) {
    // Tam isabet: 150 puan (en yüksek)
    accuracyScore = 150;
  } else if (difference === 1) {
    // 1 fark: 135 puan
    accuracyScore = 135;
  } else if (difference === 2) {
    // 2 fark: 125 puan
    accuracyScore = 125;
  } else if (difference <= 5) {
    // 3-5 fark: 110-115 puan
    accuracyScore = 120 - (difference * 2);
  } else if (difference <= 10) {
    // 6-10 fark: 90-110 puan
    accuracyScore = 120 - (difference * 3);
  } else if (difference <= 20) {
    // 11-20 fark: 60-90 puan
    accuracyScore = 120 - (difference * 3);
  } else if (difference <= 35) {
    // 21-35 fark: 30-60 puan
    accuracyScore = 90 - ((difference - 20) * 2);
  } else if (difference <= 60) {
    // 36-60 fark: 10-30 puan
    accuracyScore = 40 - ((difference - 35) * 0.8);
  } else {
    // 60+ fark: 0-10 puan
    accuracyScore = Math.max(0, 10 - ((difference - 60) * 0.1));
  }
  
  // 2. Süre Çarpanı (0.7-1.3 arası) - Doğruluk puanını etkileyen multiplier
  const timeRatio = Math.min(timeUsed / timeLimit, 1.2); // Max 1.2 ile sınırla
  let timeMultiplier = 1.0;
  
  if (timeRatio <= 0.25) {
    // Çok hızlı (0-25% süre): 1.3x multiplier
    timeMultiplier = 1.3;
  } else if (timeRatio <= 0.4) {
    // Hızlı (25-40% süre): 1.2x multiplier
    timeMultiplier = 1.3 - ((timeRatio - 0.25) * 0.67);
  } else if (timeRatio <= 0.6) {
    // Orta (40-60% süre): 1.1x multiplier
    timeMultiplier = 1.2 - ((timeRatio - 0.4) * 0.5);
  } else if (timeRatio <= 0.8) {
    // Biraz yavaş (60-80% süre): 1.0x multiplier
    timeMultiplier = 1.1 - ((timeRatio - 0.6) * 0.5);
  } else if (timeRatio <= 1.0) {
    // Yavaş (80-100% süre): 0.9x multiplier
    timeMultiplier = 1.0 - ((timeRatio - 0.8) * 0.5);
  } else {
    // Süre aştı: 0.7x multiplier
    timeMultiplier = Math.max(0.7, 1.0 - ((timeRatio - 1.0) * 1.5));
  }
  
  // 3. Temel puan hesaplama
  let baseScore = accuracyScore * timeMultiplier;
  
  // 4. Mükemmellik Bonusu (sadece tam isabet için)
  let perfectionBonus = 0;
  if (difference === 0) {
    if (timeRatio <= 0.3) {
      perfectionBonus = 25; // Mükemmel + çok hızlı
    } else if (timeRatio <= 0.5) {
      perfectionBonus = 15; // Mükemmel + hızlı
    } else if (timeRatio <= 0.7) {
      perfectionBonus = 10; // Mükemmel + orta
    } else {
      perfectionBonus = 5; // Sadece mükemmel
    }
  }
  
  // 5. Toplam puan (maksimum ~220)
  const totalScore = Math.round(baseScore + perfectionBonus);
  
  return Math.max(0, totalScore);
};

// Oyun başlatma
export const initializeGame = () => {
  const numbers = generateRandomNumbers();
  const target = generateTargetNumber();
  
  return {
    numbers,
    target,
    timeLeft: 120, // 2 dakika
    score: 0,
    userExpression: '',
    userResult: null,
    isGameActive: true,
    currentScreen: 'game' as const
  };
}; 