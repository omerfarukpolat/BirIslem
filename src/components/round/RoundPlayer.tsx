import { memo } from 'preact/compat';
import { useEffect, useMemo } from 'preact/hooks';
import { formatClock } from '../../game/format';
import { bestOnBoard, opsLeft } from '../../game/round';
import { OP_SYMBOL, OPS } from '../../game/rules';
import type { Op } from '../../game/types';
import { Icon } from '../Icon';
import { createRoundController, type RoundController, type RoundOptions } from './controller';
import './round.css';

const KEY_OPS: Record<string, Op> = { '+': '+', '-': '-', '*': '*', x: '*', X: '*', '×': '*', '/': '/', '÷': '/' };

/**
 * Oynanabilir tur: hedef + süre, 6 sayı yuvası, işlemler ve kontroller.
 * Tek başına, günün sorusu ve karşılıklı modların hepsi bunu kullanır.
 *
 * Seçenekler yalnızca ilk çizimde okunur; üst bileşen ne kadar sık yeniden
 * çizilirse çizilsin tur etkilenmez (memo). Yeni soru için `key` değiştirilmeli.
 */
export const RoundPlayer = memo(RoundPlayerImpl, () => true);

function RoundPlayerImpl(props: RoundOptions & { footer?: preact.ComponentChildren }) {
  const ctl = useMemo(() => createRoundController(props), []);

  useEffect(() => ctl.dispose, [ctl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey || (e.target as HTMLElement)?.closest?.('input, textarea, dialog[open]')) return;
      if (e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          ctl.undoStep();
        }
        return;
      }
      if (KEY_OPS[e.key]) {
        e.preventDefault();
        ctl.pickOp(KEY_OPS[e.key]);
      } else if (e.key >= '1' && e.key <= '6') {
        ctl.pickTile(Number(e.key) - 1);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        ctl.undoStep();
      } else if (e.key === 'Escape') {
        ctl.clearSelection();
      } else if (e.key === 'Enter' && !(e.target as HTMLElement)?.closest?.('button')) {
        ctl.requestFinish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctl]);

  return (
    <div class="round">
      <Board ctl={ctl} />
      <Status ctl={ctl} />
      <Tiles ctl={ctl} />
      <Operators ctl={ctl} />
      <Actions ctl={ctl} />
      <Steps ctl={ctl} />
      {props.footer}
    </div>
  );
}

function Board({ ctl }: { ctl: RoundController }) {
  const phase = ctl.phase.value;
  const target = ctl.round.peek().puzzle.target;
  const hidden = phase === 'countdown';
  const hit = phase === 'celebrate' || (phase === 'done' && ctl.round.peek().best?.diff === 0);
  return (
    <section class={`board${hit ? ' is-hit' : ''}`} aria-label="Hedef">
      <div class="board__top">
        <span class="board__label">Hedef</span>
        <Clock ctl={ctl} />
      </div>
      <div class="board__digits" aria-live="polite">
        {hidden ? (
          <span class="board__count num" key={`c${ctl.countdown.value}`}>
            {ctl.countdown.value}
          </span>
        ) : (
          String(target)
            .split('')
            .map((d, i) => (
              <span class="flap num" style={{ animationDelay: `${i * 70}ms` }} key={i}>
                {d}
              </span>
            ))
        )}
        {!hidden && <span class="sr-only">{target}</span>}
      </div>
      <TimerBar ctl={ctl} />
      {hit && (
        <div class="stamp" aria-hidden="true">
          Tam isabet
        </div>
      )}
    </section>
  );
}

function Clock({ ctl }: { ctl: RoundController }) {
  const s = ctl.secondsLeft.value;
  const urgent = ctl.phase.value === 'playing' && s <= 10;
  return (
    <span class={`clock num${urgent ? ' is-urgent' : ''}`} role="timer" aria-label={`Kalan süre ${s} saniye`}>
      <Icon name="clock" size={16} />
      {formatClock(s)}
    </span>
  );
}

/** Süre çubuğu tek bir CSS animasyonudur; JS her karede çalışmaz. */
function TimerBar({ ctl }: { ctl: RoundController }) {
  const since = ctl.playingSince.value;
  const phase = ctl.phase.value;
  const style = useMemo(() => {
    if (since === null) return undefined;
    const offset = Math.max(0, since - ctl.startAt);
    return {
      animationDuration: `${ctl.limitMs}ms`,
      animationDelay: `-${offset}ms`,
    };
  }, [since]);
  const urgent = ctl.secondsLeft.value <= 10;
  return (
    <div class="timebar" aria-hidden="true">
      {since !== null && (
        <div
          class={`timebar__fill${phase !== 'playing' ? ' is-paused' : ''}${urgent ? ' is-urgent' : ''}`}
          style={style}
        />
      )}
    </div>
  );
}

function Status({ ctl }: { ctl: RoundController }) {
  const s = ctl.round.value;
  const last = s.steps[s.steps.length - 1];
  const left = opsLeft(s);
  return (
    <section class={`status${s.opLimit > 0 ? ' has-ops' : ''}`}>
      {/* Tahtadaki son işlemin sonucu: geri alınca bir öncekine döner */}
      <Stat kind="last" label="Son işlem" value={last ? last.result.value : null} target={s.puzzle.target} empty="–" />
      <Stat kind="best" label="En yakın" value={s.best ? s.best.value : null} target={s.puzzle.target} empty="henüz yok" />
      {s.opLimit > 0 && (
        <div class={`status__ops${left === 0 ? ' is-out' : ''}`}>
          <span class="eyebrow">İşlem hakkı</span>
          <span class="num">
            {left}/{s.opLimit}
          </span>
        </div>
      )}
      <Hint ctl={ctl} />
    </section>
  );
}

function Stat({
  kind,
  label,
  value,
  target,
  empty,
}: {
  kind: 'last' | 'best';
  label: string;
  value: number | null;
  target: number;
  empty: string;
}) {
  const diff = value === null ? null : Math.abs(target - value);
  return (
    <div
      class={`status__stat status__${kind}`}
      aria-live={kind === 'last' ? 'polite' : undefined}
      aria-atomic={kind === 'last' ? 'true' : undefined}
    >
      <span class="eyebrow">{label}</span>
      {value === null ? (
        <span class="status__value is-empty">{empty}</span>
      ) : (
        <span class={`status__value num${diff === 0 ? ' is-exact' : ''}`}>
          {value}
          <small>{diff === 0 ? 'tam' : `${diff} fark`}</small>
        </span>
      )}
    </div>
  );
}

function Hint({ ctl }: { ctl: RoundController }) {
  const flash = ctl.flash.value;
  const phase = ctl.phase.value;
  const s = ctl.round.value;
  const f = ctl.first.value;
  const o = ctl.op.value;

  let content: preact.ComponentChildren;
  let tone = 'info';
  if (phase === 'countdown') {
    content = <span class="hint__help">Hazır ol…</span>;
  } else if (phase === 'celebrate') {
    content = <span class="hint__expr num">{s.puzzle.target}!</span>;
    tone = 'good';
  } else if (phase === 'done') {
    content = <span class="hint__help">Tur bitti</span>;
  } else if (flash) {
    content = <span class="hint__help">{flash.text}</span>;
    tone = flash.tone;
  } else if (f !== null && s.slots[f]) {
    const a = s.slots[f]!.value;
    content = (
      <>
        <span class="hint__expr num">
          {a} {o ? OP_SYMBOL[o] : ''} {o ? <span class="hint__q">?</span> : ''}
        </span>
        <span class="hint__help">
          {!o
            ? 'bir işlem seç'
            : o === '-'
              ? 'daha küçük bir sayı seç'
              : o === '/'
                ? 'tam bölen bir sayı seç'
                : 'ikinci sayıyı seç'}
        </span>
      </>
    );
  } else {
    const last = s.steps[s.steps.length - 1];
    content = last ? (
      <span class="hint__help">Yeni bir sayı seç ya da sonucu kullan</span>
    ) : (
      <span class="hint__help">Bir sayı seç</span>
    );
  }

  return (
    <div class={`hint is-${tone}`} aria-live="polite" key={flash?.id}>
      {content}
    </div>
  );
}

function Tiles({ ctl }: { ctl: RoundController }) {
  const s = ctl.round.value;
  const f = ctl.first.value;
  const validity = ctl.validity.value;
  const hidden = ctl.phase.value === 'countdown';
  const active = ctl.interactive.value;
  return (
    <section class="tiles" aria-label="Sayılar">
      {s.slots.map((tile, slot) => {
        if (hidden) {
          return (
            <div class="tile is-hidden" key={`h${slot}`}>
              ?
            </div>
          );
        }
        if (!tile) return <div class="tile is-empty" key={`e${slot}`} aria-hidden="true" />;
        const blocked = validity[slot] !== null;
        const cls = ['tile', 'num', !tile.base && 'is-result', f === slot && 'is-selected', blocked && 'is-blocked']
          .filter(Boolean)
          .join(' ');
        return (
          <button
            key={`t${tile.id}`}
            type="button"
            class={cls}
            style={tile.base && tile.id < 6 ? { animationDelay: `${slot * 35}ms` } : undefined}
            aria-pressed={f === slot}
            aria-disabled={blocked || !active}
            aria-label={`${tile.value}${blocked ? ', kullanılamaz' : ''}`}
            onClick={() => ctl.pickTile(slot)}
          >
            <span class="tile__key" aria-hidden="true">
              {slot + 1}
            </span>
            {tile.value}
          </button>
        );
      })}
    </section>
  );
}

function Operators({ ctl }: { ctl: RoundController }) {
  const o = ctl.op.value;
  const ready = ctl.first.value !== null && ctl.interactive.value;
  return (
    <section class="ops" aria-label="İşlemler">
      {OPS.map((op) => (
        <button
          key={op}
          type="button"
          class={`op${o === op ? ' is-active' : ''}`}
          aria-pressed={o === op}
          aria-disabled={!ready}
          aria-label={{ '+': 'Artı', '-': 'Eksi', '*': 'Çarpı', '/': 'Bölü' }[op]}
          onClick={() => ctl.pickOp(op)}
        >
          {OP_SYMBOL[op]}
        </button>
      ))}
    </section>
  );
}

function Actions({ ctl }: { ctl: RoundController }) {
  const steps = ctl.round.value.steps.length;
  const active = ctl.interactive.value;
  const confirm = ctl.confirmFinish.value;
  return (
    <section class="actions">
      <button type="button" class="btn" disabled={!active || steps === 0} onClick={ctl.undoStep}>
        <Icon name="undo" />
        <span>Geri al</span>
      </button>
      <button type="button" class="btn" disabled={!active || steps === 0} onClick={ctl.resetAll}>
        <Icon name="reset" />
        <span>Baştan</span>
      </button>
      <button
        type="button"
        class={`btn ${confirm ? 'btn--dark' : 'btn--primary'}`}
        disabled={!active}
        onClick={ctl.requestFinish}
      >
        <Icon name={confirm ? 'flag' : 'check'} />
        <span>{confirm ? 'Emin misin?' : 'Bitir'}</span>
      </button>
    </section>
  );
}

function Steps({ ctl }: { ctl: RoundController }) {
  const s = ctl.round.value;
  // Geri alınan ya da baştan alınan en yakın sonucun nasıl bulunduğu kaybolmasın
  const best = s.best && !bestOnBoard(s) ? s.best : null;
  if (s.steps.length === 0 && !best) return null;
  return (
    <section class="trail">
      {s.steps.length > 0 && (
        <ol class="steps" aria-label="İşlemlerin">
          {s.steps.map((st, i) => (
            <li key={i} class="num">
              {st.a.value} {OP_SYMBOL[st.op]} {st.b.value} = <b>{st.result.value}</b>
            </li>
          ))}
        </ol>
      )}
      {best && (
        <div class="bestpath">
          <span class="eyebrow">En yakın sonucun yolu</span>
          <ol class="steps steps--best" aria-label="En yakın sonucun işlemleri">
            {best.steps.map((st, i) => (
              <li key={i} class="num">
                {st.a} {OP_SYMBOL[st.op]} {st.b} = <b>{st.result}</b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
