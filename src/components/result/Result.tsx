import { useEffect, useState } from 'preact/hooks';
import { formatElapsed } from '../../game/format';
import { OP_SYMBOL } from '../../game/rules';
import type { Score } from '../../game/scoring';
import type { Solution } from '../../game/solver';
import { solvePuzzle } from '../../game/solverClient';
import type { Puzzle, RoundOutcome, SimpleStep } from '../../game/types';
import './result.css';

/** Bulmacanın en iyi çözümü: undefined = hesaplanıyor */
export function useSolution(puzzle: Puzzle | null, opLimit = 0): Solution | null | undefined {
  const [sol, setSol] = useState<Solution | null | undefined>(undefined);
  useEffect(() => {
    if (!puzzle) return;
    let alive = true;
    setSol(undefined);
    solvePuzzle(puzzle, opLimit).then((s) => alive && setSol(s));
    return () => {
      alive = false;
    };
  }, [puzzle, opLimit]);
  return sol;
}

export function verdict(outcome: Pick<RoundOutcome, 'diff' | 'reason'>, score: Score | null): { title: string; tone: string } {
  if (outcome.diff === null) {
    return { title: outcome.reason === 'timeout' ? 'Süre doldu' : 'Sonuç yok', tone: 'bad' };
  }
  if (outcome.diff === 0) return { title: 'Tam isabet!', tone: 'good' };
  if (score?.effectiveDiff === 0) return { title: 'En iyi sonuç!', tone: 'good' };
  if (outcome.diff === 1) return { title: 'Bir farkla kaçtı', tone: 'near' };
  if (outcome.diff <= 5) return { title: `${outcome.diff} fark, çok yakın`, tone: 'near' };
  if (outcome.diff <= 20) return { title: `${outcome.diff} fark`, tone: 'mid' };
  return { title: `${outcome.diff} fark, uzak kaldı`, tone: 'bad' };
}

export function ScoreCard({
  outcome,
  score,
  target,
  extra,
}: {
  outcome: RoundOutcome;
  score: Score | null;
  target: number;
  extra?: preact.ComponentChildren;
}) {
  const v = verdict(outcome, score);
  return (
    <section class={`scorecard tone-${v.tone}`}>
      <div class="scorecard__main">
        <p class="scorecard__verdict">{v.title}</p>
        <p class="scorecard__score num" aria-live="polite">
          {score ? score.total : '…'}
          <span>puan</span>
        </p>
        {score && (
          <p class="scorecard__parts">
            <span>
              Yakınlık <b class="num">{score.closeness}</b>
            </span>
            <span>
              Hız <b class="num">+{score.speed}</b>
            </span>
          </p>
        )}
      </div>
      <dl class="scorecard__facts">
        <div>
          <dt>Hedef</dt>
          <dd class="num">{target}</dd>
        </div>
        <div>
          <dt>Sonucun</dt>
          <dd class="num">{outcome.value ?? '–'}</dd>
        </div>
        <div>
          <dt>Ulaştığın an</dt>
          <dd class="num">{formatElapsed(outcome.reachedAtMs)}</dd>
        </div>
      </dl>
      {extra}
    </section>
  );
}

export function StepLines({ steps }: { steps: SimpleStep[] }) {
  return (
    <ol class="steplines">
      {steps.map((s, i) => (
        <li key={i} class="num">
          <span class="steplines__n">{i + 1}</span>
          <span>
            {s.a} {OP_SYMBOL[s.op]} {s.b} = <b>{s.result}</b>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function SolutionCompare({
  mine,
  myValue,
  solution,
  target,
}: {
  mine: SimpleStep[];
  myValue: number | null;
  solution: Solution | null | undefined;
  target: number;
}) {
  const sameLength = solution && myValue === solution.value && mine.length <= solution.steps.length;
  return (
    <section class="compare">
      <div class="compare__col">
        <h3 class="eyebrow">Senin yolun</h3>
        {mine.length ? <StepLines steps={mine} /> : <p class="muted">Hiç işlem yapmadın.</p>}
      </div>
      <div class="compare__col">
        <h3 class="eyebrow">{solution && solution.diff > 0 ? 'Olası en iyi sonuç' : 'En kısa çözüm'}</h3>
        {solution === undefined ? (
          <p class="muted">Hesaplanıyor…</p>
        ) : solution === null ? (
          <p class="muted">Çözüm bulunamadı.</p>
        ) : sameLength ? (
          <p class="compare__same">Senin çözümün de en kısası. Tebrikler!</p>
        ) : (
          <>
            <StepLines steps={solution.steps} />
            {solution.diff > 0 && (
              <p class="muted compare__note">
                Bu sayılarla {target} tam olarak bulunamıyor; en yakın {solution.value}.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
