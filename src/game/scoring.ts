/**
 * Puanlama (v2)
 *
 * Yakınlık puanı: sonucun, o soruda ulaşılabilecek en iyi sonuca uzaklığına göre
 * verilir. Soruların ~%99'unda tam sonuç mümkün olduğundan bu çoğu zaman
 * doğrudan hedefe olan farktır; tam sonuç imkânsızsa en iyi olası sonucu bulan
 * oyuncu tam puan alır.
 *
 * Hız bonusu: en yakın sonuca ne kadar erken ulaşıldıysa yakınlık puanının
 * %25'ine kadar eklenir. Bonus yakınlık puanıyla orantılı olduğu için hızlı
 * ama uzak bir sonuç, yavaş ama tam bir sonucu geçemez.
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
export const MAX_SCORE = BANDS[0].points + Math.round(BANDS[0].points * SPEED_SHARE);

export function closenessPoints(effectiveDiff: number): number {
  for (const band of BANDS) if (effectiveDiff <= band.upTo) return band.points;
  return 0;
}

export interface Score {
  closeness: number;
  speed: number;
  total: number;
  /** Ulaşılabilecek en iyi sonuca göre fark (sonuç yoksa null) */
  effectiveDiff: number | null;
}

export interface ScoreInput {
  diff: number | null;
  reachedAtMs: number | null;
  limitMs: number;
  /** Bu soruda ulaşılabilecek en küçük fark (bilinmiyorsa 0 kabul edilir) */
  bestPossibleDiff?: number | null;
}

export const ZERO_SCORE: Score = { closeness: 0, speed: 0, total: 0, effectiveDiff: null };

export function scoreRound({ diff, reachedAtMs, limitMs, bestPossibleDiff }: ScoreInput): Score {
  if (diff === null || reachedAtMs === null) return ZERO_SCORE;
  const effectiveDiff = Math.max(0, diff - (bestPossibleDiff ?? 0));
  const closeness = closenessPoints(effectiveDiff);
  const ratio = limitMs > 0 ? Math.min(1, Math.max(0, 1 - reachedAtMs / limitMs)) : 0;
  const speed = Math.round(closeness * SPEED_SHARE * ratio);
  return { closeness, speed, total: closeness + speed, effectiveDiff };
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
