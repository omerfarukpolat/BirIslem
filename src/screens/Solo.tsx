import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../components/Icon';
import { RoundPlayer } from '../components/round/RoundPlayer';
import { ScoreCard, SolutionCompare, useSolution } from '../components/result/Result';
import { SettingsSheet } from '../components/sheets';
import { TopBar, useTitle } from '../components/ui';
import { formatSeconds, formatTimeLimit } from '../game/format';
import { decodePuzzle, encodePuzzle, generatePuzzle, MAX_OPS } from '../game/rules';
import { MAX_SCORE } from '../game/scoring';
import type { Puzzle, RoundOutcome } from '../game/types';
import { shareOrCopy } from '../lib/share';
import { user } from '../state/auth';
import { cleanName, nickname } from '../state/profile';
import { settings, type GameSettings } from '../state/settings';
import { recordGame } from '../state/stats';
import { SaveStatus } from './SaveStatus';
import { useRoundScore } from './useRoundScore';
import './screens.css';

interface Challenge {
  name: string;
  score: number;
  diff: number | null;
  seconds: number | null;
}

interface Game {
  id: number;
  puzzle: Puzzle;
  timeLimit: number;
  opLimit: number;
  /** Bağlantıyla gelen soru: sıralamaya kaydedilmez */
  custom: boolean;
  challenge: Challenge | null;
}

let gameSeq = 0;
const newGame = (s: GameSettings): Game => ({
  id: ++gameSeq,
  puzzle: generatePuzzle(),
  timeLimit: s.timeLimit,
  opLimit: s.operationLimit,
  custom: false,
  challenge: null,
});

const int = (v: string | undefined, min: number, max: number): number | null => {
  const n = Number(v);
  return v !== undefined && v !== '' && Number.isInteger(n) && n >= min && n <= max ? n : null;
};

/** /game?soru=2-5-6-8-9-45-354&t=120&i=0&rakip=Ayşe&puan=113&fark=0&sure=42.3 */
function gameFromQuery(q: Record<string, string>, s: GameSettings): Game | null {
  const puzzle = decodePuzzle(q.soru);
  if (!puzzle) return null;
  const rival = cleanName(q.rakip ?? '');
  const score = int(q.puan, 0, MAX_SCORE);
  const seconds = Number(q.sure);
  return {
    id: ++gameSeq,
    puzzle,
    timeLimit: int(q.t, 15, 600) ?? s.timeLimit,
    opLimit: int(q.i, 0, MAX_OPS) ?? s.operationLimit,
    custom: true,
    challenge:
      rival && score !== null
        ? { name: rival, score, diff: int(q.fark, 0, 999), seconds: Number.isFinite(seconds) ? seconds : null }
        : null,
  };
}

export default function Solo() {
  useTitle('Tek başına');
  const { route, query } = useLocation();
  const [game, setGame] = useState(() => gameFromQuery(query, settings.value) ?? newGame(settings.value));
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const solution = useSolution(game.puzzle, game.opLimit);
  const score = useRoundScore(outcome, solution, game.timeLimit * 1000);
  const recorded = useRef(0);

  useEffect(() => {
    if (score && outcome && recorded.current !== game.id) {
      recorded.current = game.id;
      recordGame(score.total, outcome.diff);
    }
  }, [score, outcome, game.id]);

  const payload = useMemo(
    () =>
      score && outcome && !game.custom
        ? {
            mode: 'solo' as const,
            score: score.total,
            numbers: game.puzzle.numbers,
            target: game.puzzle.target,
            value: outcome.value,
            diff: outcome.diff,
            reachedAtMs: outcome.reachedAtMs,
            timeLimit: game.timeLimit,
            operationLimit: game.opLimit,
            steps: outcome.steps,
          }
        : null,
    [score, outcome, game],
  );

  const restart = (s: GameSettings = settings.value) => {
    setOutcome(null);
    setGame(newGame(s));
    if (game.custom) route('/game', true);
  };

  const challengeFriend = () => {
    if (!score || !outcome) return;
    const name = cleanName(nickname.value) || user.value?.name || 'Bir arkadaşın';
    const params = new URLSearchParams({
      soru: encodePuzzle(game.puzzle),
      t: String(game.timeLimit),
      i: String(game.opLimit),
      rakip: name,
      puan: String(score.total),
      fark: outcome.diff === null ? '' : String(outcome.diff),
      sure: outcome.reachedAtMs === null ? '' : (outcome.reachedAtMs / 1000).toFixed(1),
    });
    const url = `${location.origin}/game?${params}`;
    const text =
      outcome.diff === 0
        ? `Bir İşlem: ${game.puzzle.target} hedefini ${formatSeconds(outcome.reachedAtMs)} içinde tam buldum, ${score.total} puan. Sen geçebilir misin?`
        : `Bir İşlem: ${game.puzzle.target} hedefinde ${score.total} puan aldım. Sen geçebilir misin?`;
    shareOrCopy({ title: 'Bir İşlem meydan okuma', text, url });
  };

  const meta = `${formatTimeLimit(game.timeLimit)} · ${game.opLimit ? `${game.opLimit} işlem hakkı` : 'sınırsız işlem'}`;
  const ch = game.challenge;

  return (
    <main class="page">
      <TopBar
        title={ch ? 'Meydan okuma' : 'Tek başına'}
        right={
          !game.custom && (
            <button type="button" class="icon-btn" aria-label="Ayarlar" onClick={() => setSettingsOpen(true)}>
              <Icon name="sliders" />
            </button>
          )
        }
      />
      {!outcome ? (
        <RoundPlayer
          key={game.id}
          puzzle={game.puzzle}
          timeLimit={game.timeLimit}
          opLimit={game.opLimit}
          startAt={ch ? performance.now() + 3000 : undefined}
          onFinish={setOutcome}
          footer={
            ch && (
              <p class="challenge-note">
                <b>{ch.name}</b> bu soruda <b class="num">{ch.score}</b> puan aldı.
              </p>
            )
          }
        />
      ) : (
        <div class="result-stack">
          {ch && score && <ChallengeVerdict ch={ch} mine={score.total} />}
          <ScoreCard outcome={outcome} score={score} target={game.puzzle.target} />
          <SolutionCompare mine={outcome.steps} myValue={outcome.value} solution={solution} target={game.puzzle.target} />
          <div class="result-actions">
            <button type="button" class="btn btn--primary btn--lg" onClick={() => restart()} autofocus>
              Yeni soru
              <Icon name="arrow" />
            </button>
            <button type="button" class="btn btn--lg" onClick={challengeFriend} disabled={!score}>
              <Icon name="share" />
              Meydan oku
            </button>
          </div>
          <p class="result-meta muted">
            {game.puzzle.numbers.join(' · ')} → {game.puzzle.target} · {meta}
          </p>
          {game.custom ? (
            <p class="save-note">Paylaşılan sorular sıralamaya kaydedilmez.</p>
          ) : (
            <SaveStatus payload={payload} />
          )}
        </div>
      )}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onGameSettingsChange={(s) => {
          if (!outcome) restart(s);
        }}
      />
    </main>
  );
}

function ChallengeVerdict({ ch, mine }: { ch: Challenge; mine: number }) {
  const won = mine > ch.score;
  const tie = mine === ch.score;
  return (
    <section class={`challenge-verdict ${won ? 'is-won' : tie ? 'is-tie' : 'is-lost'}`}>
      <p class="challenge-verdict__title">
        {won ? `${ch.name} geride kaldı!` : tie ? 'Berabere!' : `${ch.name} önde`}
      </p>
      <div class="challenge-verdict__row num">
        <span>
          Sen <b>{mine}</b>
        </span>
        <span>
          {ch.name} <b>{ch.score}</b>
        </span>
      </div>
    </section>
  );
}
