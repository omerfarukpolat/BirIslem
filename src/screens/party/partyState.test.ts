import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../game/rules';
import type { RoundOutcome } from '../../game/types';
import { createParty, currentPlayer, finishTurn, isParty, nextRound, restorable, startTurn, turnOrder, type Party } from './partyState';

const players = [
  { id: 'a', name: 'Ayşe' },
  { id: 'b', name: 'Mehmet' },
  { id: 'c', name: 'Can' },
];

const outcome = (value: number): RoundOutcome => ({
  value,
  diff: 0,
  reachedAtMs: 1000,
  endedAtMs: 1000,
  steps: [],
  reason: 'exact',
});

function playRound(p: Party): Party {
  for (let i = 0; i < p.config.players.length; i++) {
    p = finishTurn(startTurn(p), outcome(100 + i));
  }
  return p;
}

describe('party (same device)', () => {
  it('rotates who goes first each round', () => {
    const p = createParty({ players, rounds: 3, timeLimit: 60 }, mulberry32(1));
    expect(turnOrder(p, 0).map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(turnOrder(p, 1).map((x) => x.id)).toEqual(['b', 'c', 'a']);
    expect(turnOrder(p, 2).map((x) => x.id)).toEqual(['c', 'a', 'b']);
  });

  it('gives every player the same puzzle and moves through the phases', () => {
    let p = createParty({ players, rounds: 2, timeLimit: 60 }, mulberry32(1));
    expect(p.phase).toBe('handoff');
    expect(currentPlayer(p).id).toBe('a');
    p = startTurn(p);
    expect(p.phase).toBe('playing');
    p = finishTurn(p, outcome(500));
    expect(p).toMatchObject({ phase: 'handoff', turn: 1 });
    expect(p.outcomes[0].a.value).toBe(500);
    p = finishTurn(startTurn(p), outcome(501));
    p = finishTurn(startTurn(p), outcome(502));
    expect(p.phase).toBe('summary');
    expect(Object.keys(p.outcomes[0]).sort()).toEqual(['a', 'b', 'c']);
    expect(p.puzzles).toHaveLength(1);

    p = nextRound(p, mulberry32(2));
    expect(p).toMatchObject({ phase: 'handoff', round: 1, turn: 0 });
    expect(p.puzzles).toHaveLength(2);
    expect(currentPlayer(p).id).toBe('b');
    p = nextRound(playRound(p));
    expect(p.phase).toBe('final');
  });

  it('ignores out-of-order actions', () => {
    const p = createParty({ players, rounds: 1, timeLimit: 60 });
    expect(finishTurn(p, outcome(1))).toBe(p);
    expect(nextRound(p)).toBe(p);
    const playing = startTurn(p);
    expect(startTurn(playing)).toBe(playing);
  });

  it('restores an interrupted turn to the hand-off screen', () => {
    const p = startTurn(createParty({ players, rounds: 1, timeLimit: 60 }));
    expect(restorable(p).phase).toBe('handoff');
    expect(isParty(JSON.parse(JSON.stringify(p)))).toBe(true);
    expect(isParty({ nope: true })).toBe(false);
  });
});
