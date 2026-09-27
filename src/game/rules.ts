import type { Op, Puzzle } from './types';

export const SMALL_COUNT = 5;
export const SMALL_MIN = 1;
export const SMALL_MAX = 9;
export const BIG_MIN = 10;
export const BIG_MAX = 99;
export const TARGET_MIN = 100;
export const TARGET_MAX = 999;
/** 6 sayıyla en fazla 5 işlem yapılabilir */
export const MAX_OPS = 5;

export type Rng = () => number;

const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1));

/** 5 farklı rakam (1-9) + 1 büyük sayı (10-99), hedef 100-999 */
export function generatePuzzle(rng: Rng = Math.random): Puzzle {
  const small: number[] = [];
  while (small.length < SMALL_COUNT) {
    const n = randInt(rng, SMALL_MIN, SMALL_MAX);
    if (!small.includes(n)) small.push(n);
  }
  small.sort((a, b) => a - b);
  const big = randInt(rng, BIG_MIN, BIG_MAX);
  const target = randInt(rng, TARGET_MIN, TARGET_MAX);
  return { numbers: [...small, big], target };
}

/**
 * Oyunun işlem kuralı: çıkarmada sonuç negatif olamaz,
 * bölmede sonuç tam sayı olmalı. Geçersizse null döner.
 */
export function applyOp(a: number, op: Op, b: number): number | null {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a >= b ? a - b : null;
    case '*':
      return a * b;
    case '/':
      return b !== 0 && a % b === 0 ? a / b : null;
  }
}

export const OP_SYMBOL: Record<Op, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

export const OPS: readonly Op[] = ['+', '-', '*', '/'];

export function isValidPuzzle(p: unknown): p is Puzzle {
  if (!p || typeof p !== 'object') return false;
  const { numbers, target } = p as Puzzle;
  if (!Array.isArray(numbers) || numbers.length !== SMALL_COUNT + 1) return false;
  const small = numbers.slice(0, SMALL_COUNT);
  const big = numbers[SMALL_COUNT];
  return (
    small.every((n) => Number.isInteger(n) && n >= SMALL_MIN && n <= SMALL_MAX) &&
    new Set(small).size === SMALL_COUNT &&
    Number.isInteger(big) &&
    big >= BIG_MIN &&
    big <= BIG_MAX &&
    Number.isInteger(target) &&
    target >= TARGET_MIN &&
    target <= TARGET_MAX
  );
}

/** "2-5-6-8-9-45-354" biçimi: altı sayı ve en sonda hedef */
export function encodePuzzle(p: Puzzle): string {
  return [...p.numbers, p.target].join('-');
}

export function decodePuzzle(code: string | null | undefined): Puzzle | null {
  if (!code) return null;
  const parts = code.split(/[-,.]/).map((x) => Number(x));
  if (parts.length !== SMALL_COUNT + 2 || parts.some((n) => !Number.isFinite(n))) return null;
  const small = parts.slice(0, SMALL_COUNT).sort((a, b) => a - b);
  const p = { numbers: [...small, parts[SMALL_COUNT]], target: parts[SMALL_COUNT + 1] };
  return isValidPuzzle(p) ? p : null;
}

/** Deterministik, hızlı 32-bit PRNG (günün sorusu için) */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
