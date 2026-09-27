import { generatePuzzle, type Rng } from '../../game/rules';
import type { Puzzle, RoundOutcome } from '../../game/types';

export interface PartyPlayer {
  id: string;
  name: string;
}

export interface PartyConfig {
  players: PartyPlayer[];
  rounds: number;
  /** saniye */
  timeLimit: number;
}

/**
 * handoff: cihaz sıradaki oyuncuya veriliyor
 * playing: oyuncu turu oynuyor
 * summary: turun sonuçları
 * final: maç bitti
 */
export type PartyPhase = 'handoff' | 'playing' | 'summary' | 'final';

export interface Party {
  config: PartyConfig;
  puzzles: Puzzle[];
  /** outcomes[tur][oyuncuId] */
  outcomes: Record<string, RoundOutcome>[];
  round: number;
  turn: number;
  phase: PartyPhase;
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const ROUND_OPTIONS = [3, 5, 7, 10] as const;
export const PARTY_TIME_OPTIONS = [30, 45, 60, 90, 120] as const;

export function createParty(config: PartyConfig, rng?: Rng): Party {
  return {
    config,
    puzzles: [generatePuzzle(rng)],
    outcomes: [{}],
    round: 0,
    turn: 0,
    phase: 'handoff',
  };
}

/** Her tur başlayan oyuncu değişir; kimse hep ilk ya da son oynamaz. */
export function turnOrder(p: Party, round = p.round): PartyPlayer[] {
  const n = p.config.players.length;
  return p.config.players.map((_, i) => p.config.players[(i + round) % n]);
}

export function currentPlayer(p: Party): PartyPlayer {
  return turnOrder(p)[p.turn];
}

export function startTurn(p: Party): Party {
  return p.phase === 'handoff' ? { ...p, phase: 'playing' } : p;
}

export function finishTurn(p: Party, outcome: RoundOutcome): Party {
  if (p.phase !== 'playing') return p;
  const player = currentPlayer(p);
  const outcomes = p.outcomes.slice();
  outcomes[p.round] = { ...outcomes[p.round], [player.id]: outcome };
  const lastTurn = p.turn >= p.config.players.length - 1;
  return lastTurn
    ? { ...p, outcomes, phase: 'summary' }
    : { ...p, outcomes, turn: p.turn + 1, phase: 'handoff' };
}

export function nextRound(p: Party, rng?: Rng): Party {
  if (p.phase !== 'summary') return p;
  if (p.round >= p.config.rounds - 1) return { ...p, phase: 'final' };
  return {
    ...p,
    puzzles: [...p.puzzles, generatePuzzle(rng)],
    outcomes: [...p.outcomes, {}],
    round: p.round + 1,
    turn: 0,
    phase: 'handoff',
  };
}

export function rematch(p: Party, rng?: Rng): Party {
  return createParty(p.config, rng);
}

/** Sayfa yenilenirse yarım kalan tur baştan oynanır (aynı soru). */
export function restorable(p: Party): Party {
  return p.phase === 'playing' ? { ...p, phase: 'handoff' } : p;
}

export function isParty(x: unknown): x is Party {
  const p = x as Party;
  return (
    !!p &&
    typeof p === 'object' &&
    Array.isArray(p.config?.players) &&
    p.config.players.length >= MIN_PLAYERS &&
    Array.isArray(p.puzzles) &&
    Array.isArray(p.outcomes) &&
    typeof p.round === 'number' &&
    typeof p.turn === 'number' &&
    ['handoff', 'playing', 'summary', 'final'].includes(p.phase)
  );
}
