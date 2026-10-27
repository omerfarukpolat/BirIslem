/**
 * Puanlama
 *
 * Yakınlık puanı: sonucun, o soruda ulaşılabilecek en iyi sonuca uzaklığına göre
 * verilir. En iyi sonuç her zaman sınırsız işlemle hesaplanır: işlem hakkı
 * oyuncunun kendine koyduğu bir zorluktur, puanı kolaylaştırmaz. Soruların
 * ~%99'unda tam sonuç mümkün olduğundan bu çoğu zaman doğrudan hedefe olan
 * farktır; tam sonuç imkânsızsa en iyi olası sonucu bulan oyuncu tam puan alır.
 *
 * Tek başına ve günün sorusu: en yakın sonuca ilk 10 saniyede ulaşılırsa yakınlık
 * puanının %25'i kadar hız bonusu eklenir; bonus 2. dakikanın sonunda sıfıra
 * iner. Süre ayarından bağımsızdır: aynı hız her ayarda aynı bonusu getirir.
 *
 * Karşılıklı: hız bonusu yerine tur sırası bonusu (bkz. match.ts). Her iki
 * bonusta da daha yakın bir sonuç, daha uzak ama hızlı bir sonucu geçer.
 */

export interface Band {
  /** Bu değere kadar (dahil) olan farklar */
  upTo: number;
  points: number;
}

export const BANDS: readonly Band[] = [
  { upTo: 0, points: 100 },
  { upTo: 1, points: 80 },
  { upTo: 2, points: 70 },
  { upTo: 5, points: 60 },
  { upTo: 10, points: 45 },
  { upTo: 20, points: 30 },
  { upTo: 50, points: 15 },
];

export const SPEED_SHARE = 0.25;
/** Bu süreye kadar tam hız bonusu */
export const SPEED_FULL_MS = 10_000;
/** Bu süreden sonra hız bonusu yok */
export const SPEED_ZERO_MS = 120_000;
export const MAX_SCORE = BANDS[0].points + Math.round(BANDS[0].points * SPEED_SHARE);

/** Karşılıklı modda tur sırası bonusu: 1. +25, 2. +15, 3. +10, sonrakiler +5 */
export const PLACE_BONUS: readonly number[] = [25, 15, 10, 5];

export function placeBonus(rank: number): number {
  return PLACE_BONUS[Math.min(Math.max(rank, 1), PLACE_BONUS.length) - 1];
}

/** Sıralamada her oyuncunun dönem içindeki en iyi bu kadar oyunu toplanır */
export const LEADERBOARD_BEST_OF = 20;

/** En yüksek `n` değerin toplamı */
export function sumOfBest(values: readonly number[], n: number = LEADERBOARD_BEST_OF): number {
  return values
    .slice()
    .sort((a, b) => b - a)
    .slice(0, n)
    .reduce((sum, v) => sum + v, 0);
}

/** 0–1: en yakın sonuca ne kadar erken ulaşıldı */
export function speedRatio(reachedAtMs: number): number {
  return Math.min(1, Math.max(0, (SPEED_ZERO_MS - reachedAtMs) / (SPEED_ZERO_MS - SPEED_FULL_MS)));
}

export function closenessPoints(effectiveDiff: number): number {
  for (const band of BANDS) if (effectiveDiff <= band.upTo) return band.points;
  return 0;
}

export interface Score {
  closeness: number;
  /** Tek başına modda hız bonusu, karşılıklı modda tur sırası bonusu */
  bonus: number;
  total: number;
  /** Ulaşılabilecek en iyi sonuca göre fark (sonuç yoksa null) */
  effectiveDiff: number | null;
}

export interface ScoreInput {
  diff: number | null;
  reachedAtMs: number | null;
  /** Bu soruda sınırsız işlemle ulaşılabilecek en küçük fark (bilinmiyorsa 0 kabul edilir) */
  bestPossibleDiff?: number | null;
}

export const ZERO_SCORE: Score = { closeness: 0, bonus: 0, total: 0, effectiveDiff: null };

/** En iyi olası sonuca göre fark; sonuç yoksa null */
export function effectiveDiffOf(diff: number | null, bestPossibleDiff?: number | null): number | null {
  return diff === null ? null : Math.max(0, diff - (bestPossibleDiff ?? 0));
}

/** Tek başına ve günün sorusu: yakınlık + hız bonusu */
export function scoreRound({ diff, reachedAtMs, bestPossibleDiff }: ScoreInput): Score {
  const effectiveDiff = effectiveDiffOf(diff, bestPossibleDiff);
  if (effectiveDiff === null || reachedAtMs === null) return ZERO_SCORE;
  const closeness = closenessPoints(effectiveDiff);
  const bonus = Math.round(closeness * SPEED_SHARE * speedRatio(reachedAtMs));
  return { closeness, bonus, total: closeness + bonus, effectiveDiff };
}

/** Sıralama için karşılaştırma: puan ↓, fark ↑, süre ↑ */
export interface Rankable {
  total: number;
  diff: number | null;
  reachedAtMs: number | null;
}

export function compareRankable(x: Rankable, y: Rankable): number {
  if (y.total !== x.total) return y.total - x.total;
  const dx = x.diff ?? Infinity;
  const dy = y.diff ?? Infinity;
  if (dx !== dy) return dx - dy;
  const tx = x.reachedAtMs ?? Infinity;
  const ty = y.reachedAtMs ?? Infinity;
  if (tx !== ty) return tx < ty ? -1 : 1;
  return 0;
}

/** Sıralanmış listeye 1'den başlayan sıra numarası verir; tam eşitlikte aynı sıra. */
export function rankBy<T>(items: readonly T[], cmp: (a: T, b: T) => number): { item: T; rank: number }[] {
  const sorted = items.slice().sort(cmp);
  const out: { item: T; rank: number }[] = [];
  sorted.forEach((item, i) => {
    const prev = out[i - 1];
    const rank = prev && cmp(prev.item, item) === 0 ? prev.rank : i + 1;
    out.push({ item, rank });
  });
  return out;
}

export function outcomeLabel(diff: number | null, effectiveDiff: number | null): string {
  if (diff === null) return 'Sonuç yok';
  if (diff === 0) return 'Tam isabet';
  if (effectiveDiff === 0) return 'En iyi sonuç';
  return `${diff} fark`;
}
