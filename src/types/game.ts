export interface NumberWithId {
  id: string;
  value: number;
  isOriginal: boolean;
}

export interface GameState {
  numbers: number[];
  target: number;
  timeLeft: number;
  score: number;
  userExpression: string;
  userResult: number | null;
  isGameActive: boolean;
  availableNumbers: NumberWithId[]; // Kullanılabilir sayılar (benzersiz ID'lerle)
  currentResult: number | null; // Mevcut ara sonuç
  calculationHistory: CalculationStep[]; // İşlem geçmişi
  closestResult: number | null; // En yakın sonuç
  closestDifference: number | null; // En yakın sonucun hedeften farkı
  bestCalculationHistory: CalculationStep[]; // En iyi sonuca ulaşılan işlem geçmişi
  bestResult: number | null; // En iyi sonuç
  usedNumbers: string[]; // Kullanılmış sayıların ID'leri
}

export interface CalculationStep {
  firstNumber: number;
  secondNumber: number;
  operator: Operator;
  result: number;
}

export interface GameResult {
  target: number;
  userResult: number;
  score: number;
  timeUsed: number;
  expression: string;
  calculationHistory: CalculationStep[];
  closestResult: number | null;
  closestDifference: number | null;
}

export type Operator = '+' | '-' | '*' | '/';

export interface GameConfig {
  timeLimit: number; // saniye cinsinden
  numberCount: number;
  targetRange: {
    min: number;
    max: number;
  };
} 