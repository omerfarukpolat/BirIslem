import { describe, expect, it } from 'vitest';
import {
  ACTIVE_MS,
  COUNTDOWN_MS,
  GRACE_MS,
  completedRounds,
  derivePhase,
  effectiveHost,
  isRoundComplete,
  isValidCode,
  normalizeCode,
  randomCode,
  type PlayerData,
  type ResultData,
  type RoomData,
} from './roomLogic';

const T0 = 1_000_000;
const room = (patch: Partial<RoomData> = {}): RoomData => ({
  code: 'K7P2Q',
  hostUid: 'a',
  status: 'playing',
  rounds: 3,
  timeLimit: 60,
  game: 1,
  round: 1,
  puzzles: [1, 2, 3].map((i) => ({ numbers: [1, 2, 3, 4, 5, 50], target: 300 + i })),
  roundStartedAt: T0,
  ...patch,
});
const player = (uid: string, lastSeen: number | null = T0, joinedAt = T0): PlayerData => ({ uid, name: uid, joinedAt, lastSeen });
const result = (uid: string, round = 1, game = 1): ResultData => ({
  uid,
  game,
  round,
  value: 300,
  diff: 0,
  reachedAtMs: 1000,
  steps: [],
});

describe('room codes', () => {
  it('normalizes confusable characters and validates', () => {
    expect(normalizeCode(' k7p-2q ')).toBe('K7P2Q');
    expect(normalizeCode('abcdefgh')).toBe('ABCDE');
    expect(normalizeCode('k7pi2')).toBe('K7PI2');
    expect(isValidCode('K7PI2')).toBe(false); // I alfabede yok
    expect(isValidCode('K7P2Q')).toBe(true);
    expect(isValidCode('K7P2')).toBe(false);
    expect(isValidCode('K7P2O')).toBe(false);
    const c = randomCode();
    expect(isValidCode(c)).toBe(true);
  });
});

describe('room phases', () => {
  const players = [player('a'), player('b'), player('c')];
  const during = T0 + COUNTDOWN_MS + 10_000;

  it('lets outsiders join only from the lobby', () => {
    expect(derivePhase(room({ status: 'lobby', round: 0 }), players, [], 'z', T0, null)).toBe('join');
    expect(derivePhase(room(), players, [], 'z', T0, null)).toBe('closed');
    expect(derivePhase(room({ status: 'lobby', round: 0 }), players, [], 'a', T0, null)).toBe('lobby');
  });

  it('plays, then waits for the others after finishing', () => {
    expect(derivePhase(room(), players, [], 'a', during, null)).toBe('play');
    expect(derivePhase(room(), players, [result('a')], 'a', during, null)).toBe('waiting');
    // Yerelde bitti ama yazma henüz görünmedi
    expect(derivePhase(room(), players, [], 'a', during, '1:1')).toBe('waiting');
  });

  it('completes when every active player has a result', () => {
    const all = [result('a'), result('b'), result('c')];
    expect(isRoundComplete(room(), players, all, during)).toBe(true);
    expect(derivePhase(room(), players, all, 'b', during, null)).toBe('summary');
    expect(derivePhase(room({ round: 3 }), players, all.map((r) => ({ ...r, round: 3 })), 'b', during, null)).toBe('final');
  });

  it('does not wait for disconnected players, and ends at the deadline', () => {
    const withGhost = [player('a'), player('b'), player('c', T0 - ACTIVE_MS - 1)];
    expect(isRoundComplete(room(), withGhost, [result('a'), result('b')], during)).toBe(true);
    expect(isRoundComplete(room(), players, [result('a')], during)).toBe(false);
    const deadline = T0 + COUNTDOWN_MS + 60_000 + GRACE_MS;
    expect(isRoundComplete(room(), players, [result('a')], deadline)).toBe(true);
  });

  it('ignores results from other rounds or earlier games', () => {
    const stale = [result('a', 1, 0), result('b', 2), result('c')];
    expect(isRoundComplete(room(), players, stale, during)).toBe(false);
  });

  it('counts completed rounds for the standings', () => {
    expect(completedRounds(room({ round: 2 }), players, [], during)).toBe(1);
    expect(completedRounds(room({ round: 2 }), players, ['a', 'b', 'c'].map((u) => result(u, 2)), during)).toBe(2);
    expect(completedRounds(room({ status: 'finished', round: 3 }), players, [], during)).toBe(3);
  });
});

describe('host hand-over', () => {
  it('keeps an active host and otherwise picks the earliest active player', () => {
    const now = T0 + 1000;
    expect(effectiveHost(room(), [player('a'), player('b', T0, T0 - 5)], now)).toBe('a');
    const hostGone = [player('a', T0 - ACTIVE_MS - 5000), player('c', T0, T0 + 2), player('b', T0, T0 + 1)];
    expect(effectiveHost(room(), hostGone, now)).toBe('b');
    expect(effectiveHost(room(), [player('b', T0, T0 + 9)], now)).toBe('b');
    expect(effectiveHost(room(), [], now)).toBeNull();
  });
});
