import { generatePuzzle, hashString, mulberry32 } from './rules';
import { solve } from './solver';
import type { Puzzle } from './types';

/**
 * Tarihten türetilen, herkes için aynı soru. Sıradan oyunla aynı dağılımdan
 * gelir; yalnızca tam çözümü olan ve en az 3 işlem gerektiren sorular seçilir.
 */
export function dailyPuzzle(key: string): Puzzle {
  const rng = mulberry32(hashString(`bir-islem:${key}`));
  let fallback: Puzzle | null = null;
  for (let attempt = 0; attempt < 40; attempt++) {
    const p = generatePuzzle(rng);
    const s = solve(p.numbers, p.target);
    if (s && s.diff === 0) {
      if (s.steps.length >= 3) return p;
      fallback ??= p;
    }
  }
  return fallback ?? generatePuzzle(rng);
}
