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
  // 1. Doğruluk Puanı (0-140 arası) - Ana faktör
  const difference = Math.abs(target - userResult);
  let accuracyScore = 0;
  
  if (difference === 0) {
    // Tam isabet: 140 puan
    accuracyScore = 140;
  } else if (difference <= 3) {
    // Çok yakın (1-3 fark): 135-139 puan
    accuracyScore = 139 - (difference * 1.33);
  } else if (difference <= 8) {
    // Yakın (4-8 fark): 125-135 puan
    accuracyScore = 135 - ((difference - 3) * 2);
  } else if (difference <= 15) {
    // Orta yakın (9-15 fark): 110-125 puan
    accuracyScore = 125 - ((difference - 8) * 2.14);
  } else if (difference <= 25) {
    // Orta (16-25 fark): 85-110 puan
    accuracyScore = 110 - ((difference - 15) * 2.5);
  } else if (difference <= 40) {
    // Uzak (26-40 fark): 50-85 puan
    accuracyScore = 85 - ((difference - 25) * 2.33);
  } else if (difference <= 60) {
    // Çok uzak (41-60 fark): 20-50 puan
    accuracyScore = 50 - ((difference - 40) * 1.5);
  } else {
    // Çok çok uzak (60+ fark): 0-20 puan
    accuracyScore = Math.max(0, 20 - ((difference - 60) * 0.1));
  }
  
  // 2. Süre Puanı (0-20 arası) - Minimal faktör
  const timeRatio = timeUsed / timeLimit;
  let timeScore = 0;
  
  if (timeRatio <= 0.3) {
    // Çok hızlı (30% süre): 20 puan
    timeScore = 20;
  } else if (timeRatio <= 0.5) {
    // Hızlı (30-50% süre): 15-20 puan
    timeScore = 20 - ((timeRatio - 0.3) * 25);
  } else if (timeRatio <= 0.7) {
    // Orta (50-70% süre): 10-15 puan
    timeScore = 15 - ((timeRatio - 0.5) * 25);
  } else if (timeRatio <= 0.9) {
    // Yavaş (70-90% süre): 5-10 puan
    timeScore = 10 - ((timeRatio - 0.7) * 25);
  } else if (timeRatio <= 1) {
    // Çok yavaş (90-100% süre): 0-5 puan
    timeScore = 5 - ((timeRatio - 0.9) * 50);
  } else {
    // Süre aştı: 0 puan
    timeScore = 0;
  }
  
  // 3. Bonus Puanı - Mükemmel performans için
  let bonusScore = 0;
  
  if (difference === 0 && timeRatio <= 0.4) {
    // Tam isabet + hızlı: 15 bonus puan
    bonusScore = 15;
  } else if (difference <= 2 && timeRatio <= 0.5) {
    // Çok yakın + hızlı: 10 bonus puan
    bonusScore = 10;
  } else if (difference <= 5 && timeRatio <= 0.4) {
    // Yakın + hızlı: 5 bonus puan
    bonusScore = 5;
  }
  
  // 4. Toplam Puan (0-175 arası)
  const totalScore = Math.round(accuracyScore + timeScore + bonusScore);
  
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