import { useState, useEffect, useCallback } from 'react';

export interface WordGameSettings {
  timeLimit: number;
  vowelCount: number;
  consonantCount: number;
}

export interface WordGameState {
  isGameActive: boolean;
  timeLeft: number;
  letters: string[];
  currentWord: string;
  bestWord: string;
  bestScore: number;
  isGameOver: boolean;
  usedLetters: Set<number>; // Kullanılan harflerin indekslerini tut
}

const defaultSettings: WordGameSettings = {
  timeLimit: 120, // 2 dakika
  vowelCount: 3,
  consonantCount: 5
};

const vowels = ['A', 'E', 'I', 'O', 'U'];
const consonants = ['B', 'C', 'Ç', 'D', 'F', 'G', 'Ğ', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'Ş', 'T', 'V', 'Y', 'Z'];

export const useWordGame = () => {
  const [gameState, setGameState] = useState<WordGameState>({
    isGameActive: false,
    timeLeft: defaultSettings.timeLimit,
    letters: [],
    currentWord: '',
    bestWord: '',
    bestScore: 0,
    isGameOver: false,
    usedLetters: new Set()
  });

  const [gameSettings, setGameSettings] = useState<WordGameSettings>(defaultSettings);

  // Harfleri karıştır
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Rastgele harfler oluştur
  const generateLetters = useCallback((settings: WordGameSettings) => {
    const selectedVowels = [];
    const selectedConsonants = [];

    // Sesli harfleri seç
    for (let i = 0; i < settings.vowelCount; i++) {
      const randomVowel = vowels[Math.floor(Math.random() * vowels.length)];
      selectedVowels.push(randomVowel);
    }

    // Sessiz harfleri seç
    for (let i = 0; i < settings.consonantCount; i++) {
      const randomConsonant = consonants[Math.floor(Math.random() * consonants.length)];
      selectedConsonants.push(randomConsonant);
    }

    // Normal harfleri karıştır (joker harf olmadan)
    const normalLetters = [...selectedVowels, ...selectedConsonants];
    const shuffledNormalLetters = shuffleArray(normalLetters);
    
    // Joker harfi en sona ekle
    return [...shuffledNormalLetters, '?'];
  }, []);

  // Oyunu başlat
  const startGame = useCallback((settings: WordGameSettings = gameSettings) => {
    const letters = generateLetters(settings);
    
    setGameState({
      isGameActive: true,
      timeLeft: settings.timeLimit,
      letters,
      currentWord: '',
      bestWord: '',
      bestScore: 0,
      isGameOver: false,
      usedLetters: new Set()
    });
    
    setGameSettings(settings);
  }, [generateLetters, gameSettings]);

  // Harf ekle
  const addLetter = useCallback((letter: string, letterIndex: number) => {
    if (!gameState.isGameActive || gameState.isGameOver) return;

    setGameState(prev => {
      const newUsedLetters = new Set(prev.usedLetters);
      
      // Eğer joker harf kullanılıyorsa (letterIndex === -1), joker harfin indeksini bul
      if (letterIndex === -1) {
        const jokerIndex = prev.letters.findIndex(l => l === '?');
        if (jokerIndex !== -1 && !prev.usedLetters.has(jokerIndex)) {
          newUsedLetters.add(jokerIndex);
        }
      } else {
        newUsedLetters.add(letterIndex);
      }
      
      return {
        ...prev,
        currentWord: prev.currentWord + letter,
        usedLetters: newUsedLetters
      };
    });
  }, [gameState.isGameActive, gameState.isGameOver]);

  // Son harfi sil
  const removeLastLetter = useCallback(() => {
    if (!gameState.isGameActive || gameState.isGameOver) return;

    setGameState(prev => {
      const newWord = prev.currentWord.slice(0, -1);
      const newUsedLetters = new Set(prev.usedLetters);
      
      // Son kullanılan harfi bul ve kaldır
      const letterIndices = Array.from(prev.usedLetters).sort((a, b) => b - a); // En son kullanılanı bul
      if (letterIndices.length > 0) {
        newUsedLetters.delete(letterIndices[0]);
      }
      
      return {
        ...prev,
        currentWord: newWord,
        usedLetters: newUsedLetters
      };
    });
  }, [gameState.isGameActive, gameState.isGameOver]);

  // Kelimeyi temizle
  const clearWord = useCallback(() => {
    if (!gameState.isGameActive || gameState.isGameOver) return;

    setGameState(prev => ({
      ...prev,
      currentWord: '',
      usedLetters: new Set()
    }));
  }, [gameState.isGameActive, gameState.isGameOver]);

  // Kelimeyi gönder
  const submitWord = useCallback(async (word: string) => {
    if (!gameState.isGameActive || gameState.isGameOver || !word.trim()) return;

    const wordLength = word.length;
    const score = wordLength * 10; // Her harf 10 puan

    setGameState(prev => ({
      ...prev,
      bestWord: word, // Her zaman gönderilen kelimeyi bestWord olarak kaydet
      bestScore: score, // Her zaman gönderilen kelimenin skorunu bestScore olarak kaydet
      currentWord: '',
      isGameActive: false, // Oyunu bitir
      isGameOver: true // Oyunu bitir
    }));
  }, [gameState.isGameActive, gameState.isGameOver]);

  // Oyunu bitir
  const endGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      isGameActive: false,
      isGameOver: true
    }));
  }, []);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameState.isGameActive && gameState.timeLeft > 0) {
      interval = setInterval(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          
          if (newTimeLeft <= 0) {
            return {
              ...prev,
              timeLeft: 0,
              isGameActive: false,
              isGameOver: true
            };
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [gameState.isGameActive, gameState.timeLeft]);

  return {
    gameState,
    gameSettings,
    startGame,
    addLetter,
    removeLastLetter,
    clearWord,
    submitWord,
    endGame
  };
}; 