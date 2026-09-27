import { batch, computed, signal } from '@preact/signals';
import {
  canContinue,
  check,
  combine,
  createRound,
  outcomeOf,
  reset,
  undo,
  type Best,
  type CheckFail,
  type RoundState,
} from '../../game/round';
import type { FinishReason, Op, Puzzle, RoundOutcome } from '../../game/types';
import { buzz, sfx } from '../../state/sound';

export type Phase = 'countdown' | 'playing' | 'celebrate' | 'done';

export interface RoundOptions {
  puzzle: Puzzle;
  /** saniye */
  timeLimit: number;
  opLimit?: number;
  /** performance.now() cinsinden saatin başlayacağı an; gelecekteyse geri sayım gösterilir */
  startAt?: number;
  /** Yarım kalan turu sürdürürken önceki en yakın sonuç */
  initialBest?: Best | null;
  /** En yakın sonuç her iyileştiğinde */
  onBest?: (best: Best) => void;
  onFinish: (o: RoundOutcome) => void;
}

const FAIL_TEXT: Record<CheckFail, string> = {
  negative: 'Sonuç eksi olamaz',
  fraction: 'Bölme tam çıkmalı',
  limit: 'İşlem hakkın doldu',
  same: '',
  empty: '',
};

const EXACT_PAUSE_MS = 1100;

/**
 * Bir turun tüm etkileşim durumu. Arayüz parçaları yalnızca ihtiyaç duydukları
 * sinyalleri okur; böylece saniyede bir sadece süre göstergesi yeniden çizilir.
 */
export function createRoundController(opts: RoundOptions) {
  const limitMs = opts.timeLimit * 1000;
  const startAt = opts.startAt ?? performance.now();
  const now = () => performance.now();
  const elapsed = () => Math.min(limitMs, Math.max(0, now() - startAt));

  const round = signal<RoundState>({ ...createRound(opts.puzzle, opts.opLimit ?? 0), best: opts.initialBest ?? null });
  const first = signal<number | null>(null);
  const op = signal<Op | null>(null);
  const phase = signal<Phase>(now() < startAt ? 'countdown' : 'playing');
  const secondsLeft = signal(Math.ceil((limitMs - elapsed()) / 1000));
  const countdown = signal(Math.max(0, Math.ceil((startAt - now()) / 1000)));
  const flash = signal<{ text: string; tone: 'bad' | 'good' | 'info'; id: number } | null>(null);
  const confirmFinish = signal(false);
  /** Oyun başladığında (performance.now) — süre çubuğunu senkronlamak için */
  const playingSince = signal<number | null>(phase.value === 'playing' ? now() : null);

  const interactive = computed(() => phase.value === 'playing');

  /** İkinci sayı seçilirken hangi yuvaların geçerli olduğu */
  const validity = computed<(CheckFail | null)[]>(() => {
    const s = round.value;
    const f = first.value;
    const o = op.value;
    return s.slots.map((tile, slot) => {
      if (!tile || f === null || o === null || slot === f) return null;
      const r = check(s, f, o, slot);
      return r.ok ? null : r.reason;
    });
  });

  let flashTimer: ReturnType<typeof setTimeout> | undefined;
  let confirmTimer: ReturnType<typeof setTimeout> | undefined;
  let exactTimer: ReturnType<typeof setTimeout> | undefined;
  let flashSeq = 0;
  let finished = false;
  let endedAt = 0;

  const say = (text: string, tone: 'bad' | 'good' | 'info' = 'info', ms = 1400) => {
    clearTimeout(flashTimer);
    flash.value = { text, tone, id: ++flashSeq };
    flashTimer = setTimeout(() => (flash.value = null), ms);
  };

  const finish = (reason: FinishReason) => {
    if (finished) return;
    finished = true;
    const at = reason === 'timeout' ? limitMs : reason === 'exact' ? endedAt : elapsed();
    batch(() => {
      phase.value = 'done';
      first.value = null;
      op.value = null;
      confirmFinish.value = false;
    });
    stop();
    if (reason === 'timeout') sfx.end();
    opts.onFinish(outcomeOf(round.value, at, reason));
  };

  const tick = () => {
    if (finished) return;
    const t = now();
    if (phase.value === 'countdown') {
      const left = Math.ceil((startAt - t) / 1000);
      if (left > 0) {
        if (left !== countdown.value) {
          countdown.value = left;
          sfx.count();
        }
        return;
      }
      batch(() => {
        countdown.value = 0;
        phase.value = 'playing';
        playingSince.value = t;
      });
      sfx.go();
    }
    if (phase.value !== 'playing') return;
    const left = Math.max(0, Math.ceil((limitMs - (t - startAt)) / 1000));
    if (left !== secondsLeft.value) {
      secondsLeft.value = left;
      if (left > 0 && left <= 10) sfx.tick();
    }
    if (t - startAt >= limitMs) finish('timeout');
  };

  const interval = setInterval(tick, 200);
  const onVisible = () => document.visibilityState === 'visible' && tick();
  document.addEventListener('visibilitychange', onVisible);

  function stop() {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  }

  function dispose() {
    stop();
    clearTimeout(flashTimer);
    clearTimeout(confirmTimer);
    clearTimeout(exactTimer);
  }

  function pickTile(slot: number) {
    if (!interactive.value) return;
    const s = round.value;
    if (!s.slots[slot]) return;
    const f = first.value;
    confirmFinish.value = false;

    if (f === null || op.value === null) {
      if (f === slot) {
        first.value = null;
        return;
      }
      first.value = slot;
      sfx.pick();
      return;
    }
    if (f === slot) {
      batch(() => {
        first.value = null;
        op.value = null;
      });
      return;
    }

    const res = check(s, f, op.value, slot);
    if (!res.ok) {
      say(FAIL_TEXT[res.reason] || 'Bu işlem yapılamaz', 'bad');
      sfx.nope();
      buzz(25);
      return;
    }

    const at = elapsed();
    const next = combine(s, f, op.value, slot, at);
    const exact = res.value === s.puzzle.target;
    batch(() => {
      round.value = next;
      op.value = null;
      first.value = exact || !canContinue(next) ? null : slot;
    });

    if (next.best && next.best !== s.best) opts.onBest?.(next.best);

    if (exact) {
      endedAt = at;
      phase.value = 'celebrate';
      sfx.exact();
      buzz([30, 40, 60]);
      exactTimer = setTimeout(() => finish('exact'), EXACT_PAUSE_MS);
      return;
    }
    sfx.combine();
    if (!canContinue(next)) {
      say(next.opLimit > 0 && next.steps.length >= next.opLimit ? 'İşlem hakkın doldu' : 'Birleştirecek sayı kalmadı', 'info', 2200);
    }
  }

  function pickOp(o: Op) {
    if (!interactive.value) return;
    confirmFinish.value = false;
    if (first.value === null) {
      say('Önce bir sayı seç');
      return;
    }
    op.value = op.value === o ? null : o;
    sfx.op();
  }

  function clearSelection() {
    batch(() => {
      first.value = null;
      op.value = null;
    });
  }

  function undoStep() {
    if (!interactive.value || round.value.steps.length === 0) return;
    batch(() => {
      round.value = undo(round.value);
      first.value = null;
      op.value = null;
      confirmFinish.value = false;
    });
    sfx.undo();
  }

  function resetAll() {
    if (!interactive.value || round.value.steps.length === 0) return;
    batch(() => {
      round.value = reset(round.value);
      first.value = null;
      op.value = null;
      confirmFinish.value = false;
    });
    sfx.undo();
  }

  /** İlk basışta onay ister (yanlışlıkla bitirmeye karşı). */
  function requestFinish() {
    if (!interactive.value) return;
    if (!confirmFinish.value) {
      confirmFinish.value = true;
      clearTimeout(confirmTimer);
      confirmTimer = setTimeout(() => (confirmFinish.value = false), 2500);
      return;
    }
    clearTimeout(confirmTimer);
    finish('submit');
  }

  return {
    limitMs,
    startAt,
    round,
    first,
    op,
    phase,
    secondsLeft,
    countdown,
    flash,
    confirmFinish,
    playingSince,
    validity,
    interactive,
    pickTile,
    pickOp,
    clearSelection,
    undoStep,
    resetAll,
    requestFinish,
    dispose,
    tick,
  };
}

export type RoundController = ReturnType<typeof createRoundController>;
