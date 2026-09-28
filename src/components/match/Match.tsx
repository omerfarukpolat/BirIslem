import { useEffect, useState } from 'preact/hooks';
import { formatSeconds } from '../../game/format';
import { rankRound, type RankedEntry, type RoundEntry, type Standing } from '../../game/match';
import { OP_SYMBOL } from '../../game/rules';
import { scoreRound } from '../../game/scoring';
import type { Solution } from '../../game/solver';
import { peekSolution, solvePuzzle } from '../../game/solverClient';
import type { Puzzle, RoundOutcome } from '../../game/types';
import { Icon } from '../Icon';
import { StepLines } from '../result/Result';
import './match.css';

/** Birden çok bulmacanın çözümleri (undefined = hesaplanıyor) */
export function useSolutions(puzzles: Puzzle[]): (Solution | null | undefined)[] {
  const [sols, setSols] = useState<(Solution | null | undefined)[]>(() => puzzles.map((p) => peekSolution(p)));
  const key = puzzles.map((p) => `${p.numbers.join(',')}:${p.target}`).join('|');
  useEffect(() => {
    let alive = true;
    setSols(puzzles.map((p) => peekSolution(p)));
    puzzles.forEach((p, i) =>
      solvePuzzle(p).then((s) => {
        if (!alive) return;
        setSols((prev) => {
          const next = prev.slice();
          next[i] = s;
          return next;
        });
      }),
    );
    return () => {
      alive = false;
    };
  }, [key]);
  return sols;
}

/** Oyuncu sonuçlarını puanlı tur kayıtlarına çevirir; sonucu olmayan oyuncu 0 alır. */
export function toEntries(
  playerIds: string[],
  outcomes: Record<string, Pick<RoundOutcome, 'value' | 'diff' | 'reachedAtMs' | 'steps'> | undefined>,
  limitMs: number,
  bestPossibleDiff: number | null | undefined,
): RoundEntry[] {
  return playerIds.map((playerId) => {
    const o = outcomes[playerId];
    return {
      playerId,
      value: o?.value ?? null,
      diff: o?.diff ?? null,
      reachedAtMs: o?.reachedAtMs ?? null,
      steps: o?.steps ?? [],
      score: scoreRound({
        diff: o?.diff ?? null,
        reachedAtMs: o?.reachedAtMs ?? null,
        limitMs,
        bestPossibleDiff: bestPossibleDiff ?? 0,
      }),
    };
  });
}

export function RoundTable({
  ranked,
  names,
  pending = [],
}: {
  ranked: RankedEntry[];
  names: Record<string, string>;
  /** Henüz sonucu gelmeyen oyuncular */
  pending?: string[];
}) {
  return (
    <ol class="rt">
      {ranked.map(({ entry, rank, winner }) => {
        const waiting = pending.includes(entry.playerId);
        return (
          <li key={entry.playerId} class={`rt__row${winner ? ' is-winner' : ''}`}>
            <span class="rt__rank num">{winner ? <Icon name="crown" size={20} /> : rank}</span>
            <span class="rt__who">
              <span class="rt__name">{names[entry.playerId] ?? 'Oyuncu'}</span>
              <span class="rt__detail">
                {waiting
                  ? 'bekleniyor…'
                  : entry.value === null
                    ? 'sonuç yok'
                    : `${entry.value} · ${entry.diff === 0 ? 'tam' : `${entry.diff} fark`} · ${formatSeconds(entry.reachedAtMs)}`}
              </span>
              {!waiting && entry.steps.length > 0 && (
                <span class="rt__path num" aria-label="İşlemleri">
                  {entry.steps.map((st, i) => (
                    <span key={i}>
                      {st.a} {OP_SYMBOL[st.op]} {st.b} = {st.result}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <span class="rt__pts num">{waiting ? '–' : entry.score.total}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function RoundSummaryView({
  round,
  rounds,
  puzzle,
  entries,
  names,
  solution,
  pending,
}: {
  round: number;
  rounds: number;
  puzzle: Puzzle;
  entries: RoundEntry[];
  names: Record<string, string>;
  solution: Solution | null | undefined;
  pending?: string[];
}) {
  const ranked = rankRound(entries);
  const winners = ranked.filter((r) => r.winner && !pending?.includes(r.entry.playerId));
  return (
    <section class="summary">
      <header class="summary__head">
        <p class="sr-only">
          Tur {round + 1} / {rounds}
        </p>
        <h2>
          {pending && pending.length > 0
            ? 'Sonuçlar geliyor…'
            : winners.length === 1
              ? `${names[winners[0].entry.playerId]} kazandı`
              : winners.length > 1
                ? 'Berabere'
                : 'Kimse puan alamadı'}
        </h2>
        <p class="summary__target">
          <span class="muted">Hedef</span> <b class="num">{puzzle.target}</b>
          <span class="muted summary__nums">{puzzle.numbers.join(' · ')}</span>
        </p>
      </header>
      <RoundTable ranked={ranked} names={names} pending={pending} />
      <div class="summary__solution">
        <p class="eyebrow">{solution && solution.diff > 0 ? 'Olası en iyi sonuç' : 'En kısa çözüm'}</p>
        {solution === undefined ? (
          <p class="muted">Hesaplanıyor…</p>
        ) : solution ? (
          <StepLines steps={solution.steps} />
        ) : (
          <p class="muted">Çözüm bulunamadı.</p>
        )}
      </div>
    </section>
  );
}

export function StandingsTable({
  standings,
  names,
  compact = false,
}: {
  standings: Standing[];
  names: Record<string, string>;
  compact?: boolean;
}) {
  const rounds = standings[0]?.perRound.length ?? 0;
  return (
    <div class="standings-wrap">
      <table class="table standings">
        <thead>
          <tr>
            <th>#</th>
            <th>Oyuncu</th>
            {!compact && Array.from({ length: rounds }, (_, i) => <th class="r" key={i}>{`T${i + 1}`}</th>)}
            <th class="r" title="Kazanılan tur">
              <Icon name="crown" size={15} />
              <span class="sr-only">Kazanılan tur</span>
            </th>
            <th class="r">Puan</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.playerId}>
              <td class="num">{s.rank}</td>
              <td class="standings__name">{names[s.playerId] ?? 'Oyuncu'}</td>
              {!compact &&
                s.perRound.map((p, i) => (
                  <td class="r num standings__round" key={i}>
                    {p ?? '–'}
                  </td>
                ))}
              <td class="r num">{s.wins}</td>
              <td class="r num standings__total">{s.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Podium({ standings, names }: { standings: Standing[]; names: Record<string, string> }) {
  const top = standings.filter((s) => s.rank <= 3).slice(0, 3);
  const champions = standings.filter((s) => s.rank === 1);
  const order = [top[1], top[0], top[2]].filter(Boolean);
  return (
    <section class="podium">
      <p class="eyebrow">Maç bitti</p>
      <h2 class="podium__title">
        {champions.length > 1 ? 'Berabere bitti!' : `${names[champions[0]?.playerId] ?? ''} kazandı!`}
      </h2>
      <div class="podium__steps">
        {order.map((s) => (
          <div key={s.playerId} class={`podium__step is-${s.rank}`}>
            <span class="podium__name">{names[s.playerId]}</span>
            <span class="podium__pts num">{s.total}</span>
            <span class="podium__block num">{s.rank === 1 ? <Icon name="crown" size={28} /> : s.rank}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
