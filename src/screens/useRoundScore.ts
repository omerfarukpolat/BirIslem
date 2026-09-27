import { useEffect, useMemo, useState } from 'preact/hooks';
import { scoreRound, type Score } from '../game/scoring';
import type { Solution } from '../game/solver';
import type { RoundOutcome } from '../game/types';

/**
 * Turun puanı. Çözücü sonucu (ulaşılabilecek en iyi fark) gelince hesaplanır;
 * çözücü takılırsa kısa bir beklemeden sonra hedefe göre puanlanır.
 */
export function useRoundScore(outcome: RoundOutcome | null, solution: Solution | null | undefined, limitMs: number): Score | null {
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setTimedOut(false);
    if (!outcome || solution !== undefined) return;
    const t = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, [outcome, solution]);

  return useMemo(() => {
    if (!outcome) return null;
    if (solution === undefined && !timedOut) return null;
    return scoreRound({
      diff: outcome.diff,
      reachedAtMs: outcome.reachedAtMs,
      limitMs,
      bestPossibleDiff: solution?.diff ?? 0,
    });
  }, [outcome, solution === undefined ? undefined : solution?.diff ?? null, timedOut, limitMs]);
}
