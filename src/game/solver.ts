import { MAX_OPS } from './rules';
import type { Op, SimpleStep } from './types';

export interface Solution {
  value: number;
  diff: number;
  steps: SimpleStep[];
}

/**
 * Oyunun kurallarıyla (çıkarma negatif olamaz, bölme tam olmalı, her sayı bir kez)
 * hedefe en yakın sonucu bulur. Eşit yakınlıkta en az işlemli çözümü tercih eder.
 *
 * Aynı sayı kümesine farklı yollardan ulaşılabildiği için ziyaret edilen
 * kümeler ezberlenir; bir kümenin derinliği (yapılan işlem sayısı) eleman
 * sayısından belli olduğundan bu ezber kayıpsızdır.
 */
export function solve(numbers: readonly number[], target: number, maxOps: number = MAX_OPS): Solution | null {
  const limit = maxOps > 0 ? Math.min(maxOps, numbers.length - 1) : numbers.length - 1;
  let bestDiff = Infinity;
  let bestDepth = Infinity;
  let bestValue = 0;
  let bestPath: SimpleStep[] = [];
  const path: SimpleStep[] = [];
  const seen = new Set<string>();

  const visit = (nums: number[], depth: number) => {
    // Bu düğümden üretilecek her sonuç depth+1 işlemli olur.
    if (bestDiff === 0 && bestDepth <= depth + 1) return;
    if (depth >= limit || nums.length < 2) return;
    const key = nums.join(',');
    if (seen.has(key)) return;
    seen.add(key);

    const n = nums.length;
    for (let i = 0; i < n; i++) {
      if (i > 0 && nums[i] === nums[i - 1]) continue;
      for (let j = i + 1; j < n; j++) {
        if (j > i + 1 && nums[j] === nums[j - 1]) continue;
        const small = nums[i];
        const big = nums[j]; // sıralı: small <= big
        const rest: number[] = [];
        for (let k = 0; k < n; k++) if (k !== i && k !== j) rest.push(nums[k]);

        // Hiçbir şey kazandırmayan işlemler atlanır: x·1, x÷1, x−x, ve sonucu
        // işlenenlerden birine eşit olanlar (kullanılmayan sayı zaten serbest).
        for (let o = 0; o < 4; o++) {
          let op: Op;
          let value: number;
          if (o === 0) {
            op = '+';
            value = big + small;
          } else if (o === 1) {
            if (small === 1) continue;
            op = '*';
            value = big * small;
          } else if (o === 2) {
            if (big === small || big - small === small) continue;
            op = '-';
            value = big - small;
          } else {
            if (small === 1 || big % small !== 0 || big / small === small) continue;
            op = '/';
            value = big / small;
          }

          path.push({ a: big, op, b: small, result: value });
          const diff = Math.abs(target - value);
          const d = depth + 1;
          if (diff < bestDiff || (diff === bestDiff && d < bestDepth)) {
            bestDiff = diff;
            bestDepth = d;
            bestValue = value;
            bestPath = path.slice();
          }
          const next = rest.slice();
          let p = 0;
          while (p < next.length && next[p] < value) p++;
          next.splice(p, 0, value);
          visit(next, d);
          path.pop();
          if (bestDiff === 0 && bestDepth <= d) return;
        }
      }
    }
  };

  visit(numbers.slice().sort((a, b) => a - b), 0);
  if (bestDiff === Infinity) return null;
  return { value: bestValue, diff: bestDiff, steps: pruneSteps(bestPath) };
}

/** Sonuca katkısı olmayan adımları atar (arama yolu fazladan adım içerebilir). */
function pruneSteps(steps: SimpleStep[]): SimpleStep[] {
  if (steps.length <= 1) return steps;
  const needed = new Array(steps.length).fill(false);
  needed[steps.length - 1] = true;
  // Her adım için işlenenlerini üreten önceki adımları işaretle (geriye doğru).
  const available: { value: number; from: number }[] = [];
  const producers: number[][] = steps.map(() => []);
  steps.forEach((s, idx) => {
    for (const v of [s.a, s.b]) {
      const at = findLastIndex(available, (x) => x.value === v);
      if (at >= 0) {
        producers[idx].push(available[at].from);
        available.splice(at, 1);
      }
    }
    available.push({ value: s.result, from: idx });
  });
  for (let i = steps.length - 1; i >= 0; i--) {
    if (!needed[i]) continue;
    for (const p of producers[i]) needed[p] = true;
  }
  return steps.filter((_, i) => needed[i]);
}

function findLastIndex<T>(arr: T[], pred: (x: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}
