import { useEffect, useMemo, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../components/Icon';
import { RoundPlayer } from '../components/round/RoundPlayer';
import { ScoreCard, SolutionCompare, StepLines, useSolution } from '../components/result/Result';
import { TopBar, useTitle } from '../components/ui';
import { DAILY_TIME_LIMIT, dailyKey, dailyNumber, msUntilNextDaily } from '../game/daily';
import { formatDayKey, formatElapsed } from '../game/format';
import type { Best } from '../game/round';
import { getDailyPuzzle } from '../game/solverClient';
import type { Puzzle, RoundOutcome } from '../game/types';
import { readJSON, removeKey, writeJSON } from '../lib/storage';
import { shareOrCopy } from '../lib/share';
import { currentStreak, recordDaily, stats, type DailyRecord } from '../state/stats';
import { SaveStatus } from './SaveStatus';
import { useRoundScore } from './useRoundScore';
import './daily.css';

const PROGRESS_KEY = 'birislem:daily-progress';

interface Progress {
  key: string;
  startedAt: number;
  best: Best | null;
  /** Tur bittiyse sonucu; günlük kayıt yazılana kadar saklanır */
  outcome?: RoundOutcome;
}

type View = 'intro' | 'play' | 'result';

export default function Daily() {
  const key = useMemo(() => dailyKey(), []);
  useTitle('Günün sorusu');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const record = stats.value.daily[key];
  const saved = readJSON<Progress | null>(PROGRESS_KEY, null);
  const resumable = !record && saved?.key === key ? saved : null;
  const [view, setView] = useState<View>(record || resumable?.outcome ? 'result' : resumable ? 'play' : 'intro');
  const [progress, setProgress] = useState<Progress | null>(resumable);
  // Sayfa açılırken yarım kalmış bir deneme bulunduysa
  const [resumed] = useState(resumable !== null);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(resumable?.outcome ?? null);

  useEffect(() => {
    let alive = true;
    getDailyPuzzle(key).then((p) => alive && setPuzzle(p));
    return () => {
      alive = false;
    };
  }, [key]);

  const start = () => {
    const p: Progress = { key, startedAt: Date.now() + 3000, best: null };
    writeJSON(PROGRESS_KEY, p);
    setProgress(p);
    setView('play');
  };

  const finish = (o: RoundOutcome) => {
    // Sonuç hemen kalıcı olsun: puan hesaplanmadan yenilense bile ikinci hak doğmaz.
    writeJSON(PROGRESS_KEY, { ...progress, outcome: o });
    setOutcome(o);
    setView('result');
  };

  return (
    <main class="page">
      <TopBar title={`Günün sorusu #${dailyNumber(key)}`} />
      {!puzzle ? (
        <div class="center-note">
          <div class="spinner" aria-hidden="true" />
          <p class="muted">Soru hazırlanıyor…</p>
        </div>
      ) : view === 'intro' ? (
        <Intro dayKey={key} onStart={start} />
      ) : view === 'play' && progress ? (
        <Play puzzle={puzzle} progress={progress} resumed={resumed} onFinish={finish} />
      ) : (
        <Result dayKey={key} puzzle={puzzle} outcome={outcome} record={record ?? null} />
      )}
    </main>
  );
}

function Intro({ dayKey, onStart }: { dayKey: string; onStart: () => void }) {
  const streak = currentStreak(dayKey);
  return (
    <section class="daily-intro">
      <div class="daily-date">
        <span class="daily-date__day num">{Number(dayKey.slice(8))}</span>
        <span class="daily-date__rest">{formatDayKey(dayKey).split(' ').slice(1).join(' ')}</span>
      </div>
      <h2>Bugün herkes aynı soruyu çözüyor.</h2>
      <ul class="daily-rules">
        <li>
          <Icon name="clock" size={20} />
          <span>
            Süre <b>2 dakika</b>, işlem sınırı yok.
          </span>
        </li>
        <li>
          <Icon name="flag" size={20} />
          <span>
            <b>Tek hakkın var.</b> Başladıktan sonra sayfayı yenilesen de süre işlemeye devam eder.
          </span>
        </li>
        <li>
          <Icon name="trophy" size={20} />
          <span>Giriş yaptıysan skorun günün sıralamasına girer.</span>
        </li>
      </ul>
      {streak > 0 && <p class="daily-streak">{streak} gündür aralıksız çözüyorsun. Seriyi bozma!</p>}
      <button type="button" class="btn btn--primary btn--lg btn--block" onClick={onStart}>
        Başla
        <Icon name="arrow" />
      </button>
    </section>
  );
}

function Play({
  puzzle,
  progress,
  resumed,
  onFinish,
}: {
  puzzle: Puzzle;
  progress: Progress;
  resumed: boolean;
  onFinish: (o: RoundOutcome) => void;
}) {
  // Kalan süreyi duvar saatinden hesapla: yenileme ek süre kazandırmaz.
  const startAt = useMemo(() => performance.now() + (progress.startedAt - Date.now()), [progress]);
  const expired = Date.now() - progress.startedAt >= DAILY_TIME_LIMIT * 1000;

  useEffect(() => {
    if (!expired) return;
    const b = progress.best;
    onFinish({
      value: b?.value ?? null,
      diff: b?.diff ?? null,
      reachedAtMs: b?.atMs ?? null,
      endedAtMs: DAILY_TIME_LIMIT * 1000,
      steps: b?.steps ?? [],
      reason: 'timeout',
    });
  }, [expired]);

  if (expired) return null;
  return (
    <RoundPlayer
      puzzle={puzzle}
      timeLimit={DAILY_TIME_LIMIT}
      startAt={startAt}
      initialBest={progress.best}
      onBest={(b) => writeJSON(PROGRESS_KEY, { ...progress, best: b })}
      onFinish={onFinish}
      footer={resumed && <p class="challenge-note">Bu soruya daha önce başlamıştın; süre kaldığı yerden devam ediyor.</p>}
    />
  );
}

function Result({
  dayKey,
  puzzle,
  outcome,
  record,
}: {
  dayKey: string;
  puzzle: Puzzle;
  outcome: RoundOutcome | null;
  record: DailyRecord | null;
}) {
  const { route } = useLocation();
  const solution = useSolution(puzzle);
  const score = useRoundScore(outcome, solution, DAILY_TIME_LIMIT * 1000);

  // Puan hesaplanınca günlük kaydı yaz, yarım deneme kaydını temizle
  useEffect(() => {
    if (!outcome || !score) return;
    if (!record) {
      recordDaily({
        key: dayKey,
        value: outcome.value,
        diff: outcome.diff,
        reachedAtMs: outcome.reachedAtMs,
        score: score.total,
        steps: outcome.steps,
      });
    }
    removeKey(PROGRESS_KEY);
  }, [outcome, score, record]);

  const payload = useMemo(
    () =>
      outcome && score
        ? {
            mode: 'daily' as const,
            puzzleId: dayKey,
            score: score.total,
            numbers: puzzle.numbers,
            target: puzzle.target,
            value: outcome.value,
            diff: outcome.diff,
            reachedAtMs: outcome.reachedAtMs,
            timeLimit: DAILY_TIME_LIMIT,
            operationLimit: 0,
            steps: outcome.steps,
          }
        : null,
    [outcome, score],
  );

  const shown = outcome
    ? { value: outcome.value, diff: outcome.diff, reachedAtMs: outcome.reachedAtMs, steps: outcome.steps, total: score?.total }
    : record
      ? { value: record.value, diff: record.diff, reachedAtMs: record.reachedAtMs, steps: record.steps, total: record.score }
      : null;

  const share = () => {
    if (!shown || shown.total === undefined) return;
    const how =
      shown.diff === null ? 'sonuç yok' : shown.diff === 0 ? 'tam isabet' : `${shown.diff} fark`;
    const text = `Bir İşlem · Günün sorusu #${dailyNumber(dayKey)}\n${how[0].toLocaleUpperCase('tr-TR') + how.slice(1)} · ${formatElapsed(shown.reachedAtMs)} · ${shown.total} puan`;
    shareOrCopy({ title: 'Bir İşlem', text, url: `${location.origin}/gunun-sorusu` });
  };

  return (
    <div class="result-stack">
      {outcome ? (
        <ScoreCard outcome={outcome} score={score} target={puzzle.target} />
      ) : record ? (
        <section class="daily-done">
          <p class="eyebrow">Bugünkü sonucun</p>
          <p class="daily-done__score num">
            {record.score}
            <span>puan</span>
          </p>
          <p class="muted">
            Hedef {puzzle.target} · sonucun {record.value ?? '–'}
            {record.diff !== null && record.diff > 0 ? ` (${record.diff} fark)` : record.diff === 0 ? ' (tam)' : ''}
          </p>
          {record.steps.length > 0 && <StepLines steps={record.steps} />}
        </section>
      ) : null}

      {outcome && (
        <SolutionCompare mine={outcome.steps} myValue={outcome.value} solution={solution} target={puzzle.target} />
      )}

      <div class="result-actions">
        <button type="button" class="btn btn--primary btn--lg" onClick={share} disabled={!shown || shown.total === undefined}>
          <Icon name="share" />
          Paylaş
        </button>
        <button type="button" class="btn btn--lg" onClick={() => route('/leaderboard?tab=soru')}>
          <Icon name="trophy" />
          Günün sırası
        </button>
      </div>
      <NextCountdown />
      {outcome && <SaveStatus payload={payload} />}
      <button type="button" class="btn btn--block" onClick={() => route('/game')}>
        Beklerken tek başına oyna
      </button>
    </div>
  );
}

function NextCountdown() {
  const [left, setLeft] = useState(msUntilNextDaily());
  useEffect(() => {
    const t = setInterval(() => setLeft(msUntilNextDaily()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor(left / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return (
    <p class="next-daily">
      Yeni soru <b class="num">{`${hh}:${mm}:${ss}`}</b> sonra
    </p>
  );
}
