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

// Puan hesaplama - Yeni sistem
export const calculateScore = (target: number, userResult: number, timeUsed: number, timeLimit: number = 120): number => {
  // 1. Doğruluk Puanı (0-100 arası)
  const difference = Math.abs(target - userResult);
  let accuracyScore = 0;
  
  if (difference === 0) {
    // Tam isabet: 100 puan
    accuracyScore = 100;
  } else if (difference <= 10) {
    // Çok yakın (1-10 fark): 80-95 puan
    accuracyScore = 95 - (difference * 1.5);
  } else if (difference <= 50) {
    // Yakın (11-50 fark): 50-80 puan
    accuracyScore = 80 - ((difference - 10) * 0.75);
  } else if (difference <= 100) {
    // Orta (51-100 fark): 20-50 puan
    accuracyScore = 50 - ((difference - 50) * 0.6);
  } else {
    // Uzak (100+ fark): 0-20 puan
    accuracyScore = Math.max(0, 20 - ((difference - 100) * 0.1));
  }
  
  // 2. Süre Puanı (0-50 arası)
  const timeRatio = timeUsed / timeLimit; // 0 = çok hızlı, 1 = süre doldu
  let timeScore = 0;
  
  if (timeRatio <= 0.25) {
    // Çok hızlı (25% süre): 50 puan
    timeScore = 50;
  } else if (timeRatio <= 0.5) {
    // Hızlı (25-50% süre): 40-50 puan
    timeScore = 50 - ((timeRatio - 0.25) * 40);
  } else if (timeRatio <= 0.75) {
    // Orta (50-75% süre): 25-40 puan
    timeScore = 40 - ((timeRatio - 0.5) * 60);
  } else if (timeRatio <= 1) {
    // Yavaş (75-100% süre): 0-25 puan
    timeScore = 25 - ((timeRatio - 0.75) * 100);
  } else {
    // Süre aştı: 0 puan
    timeScore = 0;
  }
  
  // 3. Toplam Puan (0-150 arası)
  const totalScore = Math.round(accuracyScore + timeScore);
  
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