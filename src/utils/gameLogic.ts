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

// Puan hesaplama
export const calculateScore = (target: number, userResult: number, timeUsed: number): number => {
  const difference = Math.abs(target - userResult);
  const accuracyScore = Math.max(0, 100 - difference * 5); // Hedeften uzaklık (3 basamaklı için daha az ceza)
  const timeBonus = Math.max(0, 120 - timeUsed) * 1; // Kalan süre bonusu (2 dakika için ayarlandı)
  
  return Math.round(accuracyScore + timeBonus);
};

// Oyun başlatma
export const initializeGame = () => {
  const numbers = generateRandomNumbers();
  const target = generateTargetNumber();
  
  return {
    numbers,
    target,
    timeLeft: 10, // Test için 10 saniye (normal: 120)
    score: 0,
    userExpression: '',
    userResult: null,
    isGameActive: true,
    currentScreen: 'game' as const
  };
}; 