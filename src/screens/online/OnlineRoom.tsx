import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useLocation, useRoute } from 'preact-iso';
import { GoogleMark, Icon } from '../../components/Icon';
import { Podium, RoundSummaryView, StandingsTable, toEntries, useSolutions } from '../../components/match/Match';
import { RoundPlayer } from '../../components/round/RoundPlayer';
import { Confirm, Segmented, TopBar, useTitle } from '../../components/ui';
import { formatElapsed, formatTimeLimit } from '../../game/format';
import { standings } from '../../game/match';
import { generatePuzzle } from '../../game/rules';
import type { Puzzle, RoundOutcome } from '../../game/types';
import { shareOrCopy } from '../../lib/share';
import { ensureSession, signIn, type AppUser } from '../../state/auth';
import { cleanName, NAME_MAX, nickname } from '../../state/profile';
import { toast } from '../../state/toast';
import { needsGoogle, onlineErrorText } from './errors';
import {
  HEARTBEAT_MS,
  MAX_ROOM_PLAYERS,
  ROOM_ROUND_OPTIONS,
  ROOM_TIME_OPTIONS,
  completedRounds,
  currentPuzzle,
  derivePhase,
  effectiveHost,
  isActive,
  isValidCode,
  normalizeCode,
  resultsFor,
  roundWindow,
  type PlayerData,
  type ResultData,
  type RoomData,
} from './roomLogic';
import './online.css';

type RoomsModule = typeof import('../../services/rooms');

export default function OnlineRoom() {
  const { params } = useRoute();
  const { route, query } = useLocation();
  const code = normalizeCode(params.code ?? '');
  useTitle(`Oda ${code}`);

  const [me, setMe] = useState<AppUser | null>(null);
  const [svc, setSvc] = useState<RoomsModule | null>(null);
  const [fatal, setFatal] = useState<{ text: string; google: boolean } | null>(null);
  const [room, setRoom] = useState<RoomData | null | undefined>(undefined);
  const [players, setPlayers] = useState<PlayerData[] | null>(null);
  const [results, setResults] = useState<ResultData[]>([]);
  const offset = useRef(0);
  const serverNow = () => Date.now() + offset.current;
  const [now, setNow] = useState(serverNow);
  const [localDone, setLocalDone] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<RoundOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const autoJoined = useRef(false);

  const onError = (err: Error) => {
    console.warn(err);
    setFatal({ text: onlineErrorText(err), google: false });
  };

  // 1) Kimlik: giriş yapılmışsa o, yoksa misafir (anonim) oturum
  useEffect(() => {
    if (!isValidCode(code)) return;
    let alive = true;
    ensureSession(cleanName(nickname.value) || 'Misafir')
      .then((u) => alive && setMe(u))
      .catch((err) => alive && setFatal({ text: onlineErrorText(err), google: needsGoogle(err) }));
    return () => {
      alive = false;
    };
  }, [code]);

  // 2) Oda ve oyuncuları dinle
  useEffect(() => {
    if (!me) return;
    let alive = true;
    const unsubs: (() => void)[] = [];
    import('../../services/rooms').then((s) => {
      if (!alive) return;
      setSvc(() => s);
      unsubs.push(s.watchRoom(code, setRoom, onError));
      unsubs.push(s.watchPlayers(code, me.uid, setPlayers, (o) => (offset.current = o), onError));
    }, onError);
    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, [me, code]);

  // 3) Bu maçın sonuçları
  const game = room?.game;
  useEffect(() => {
    if (!svc || !game) return;
    setResults([]);
    return svc.watchResults(code, game, setResults, onError);
  }, [svc, game]);

  const member = !!(me && players?.some((p) => p.uid === me.uid));

  // 4) Varlık sinyali
  useEffect(() => {
    if (!member || !svc || !me) return;
    const beat = () => svc.heartbeat(code, me.uid).catch(() => {});
    const t = setInterval(beat, HEARTBEAT_MS);
    const onVisible = () => document.visibilityState === 'visible' && beat();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [member, svc, me]);

  // 5) Zamana bağlı geçişler (tur sonu, kopan oyuncular) için saat
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, []);

  const join = async (name: string) => {
    if (!svc || !me) return;
    const clean = cleanName(name);
    if (!clean) return toast('Önce adını yaz');
    setBusy(true);
    try {
      nickname.value = clean;
      await svc.joinRoom(code, { uid: me.uid, name: clean });
    } catch (err) {
      toast(onlineErrorText(err), 4000);
    } finally {
      setBusy(false);
    }
  };

  // Giriş ekranından "Katıl" ile gelindiyse otomatik katıl
  useEffect(() => {
    if (!query.katil || autoJoined.current || !svc || !me || !players || member) return;
    if (room?.status !== 'lobby') return;
    autoJoined.current = true;
    join(nickname.value);
  }, [svc, me, players, member, room?.status]);

  const solutions = useSolutions(room?.puzzles ?? []);

  // ---------- Erken dönüşler ----------
  if (!isValidCode(code)) {
    return (
      <Shell code={code}>
        <Note title="Geçersiz oda kodu" text="Oda kodları 5 karakterden oluşur." action={['Yeni oda', () => route('/oda')]} />
      </Shell>
    );
  }
  if (fatal) {
    return (
      <Shell code={code}>
        <div class="center-note">
          <h2>Bağlanamadık</h2>
          <p class="muted">{fatal.text}</p>
          {fatal.google ? (
            <button type="button" class="btn" onClick={() => signIn().then((ok) => ok && location.reload())}>
              <GoogleMark size={18} />
              Google ile giriş
            </button>
          ) : (
            <button type="button" class="btn" onClick={() => location.reload()}>
              <Icon name="reset" />
              Tekrar dene
            </button>
          )}
        </div>
      </Shell>
    );
  }
  if (!me || room === undefined || players === null) {
    return (
      <Shell code={code}>
        <div class="center-note">
          <div class="spinner" aria-hidden="true" />
          <p class="muted">Odaya bağlanılıyor…</p>
        </div>
      </Shell>
    );
  }
  if (room === null) {
    return (
      <Shell code={code}>
        <Note
          title="Oda bulunamadı"
          text="Kod yanlış olabilir ya da oda kapanmış olabilir."
          action={['Yeni oda kur', () => route('/oda')]}
        />
      </Shell>
    );
  }

  // ---------- Türetilmiş durum ----------
  const phase = derivePhase(room, players, results, me.uid, now, localDone);
  const hostUid = effectiveHost(room, players, now);
  const iAmHost = hostUid === me.uid;
  const hostName = players.find((p) => p.uid === hostUid)?.name ?? 'Oda sahibi';
  const ids = players.map((p) => p.uid);
  const names = Object.fromEntries(players.map((p) => [p.uid, p.name]));
  const limitMs = room.timeLimit * 1000;
  const done = completedRounds(room, players, results, now);
  const roundEntries = Array.from({ length: done }, (_, i) =>
    toEntries(ids, Object.fromEntries(resultsFor(results, room.game, i + 1)), limitMs, solutions[i]?.diff),
  );
  const table = standings(ids, roundEntries);

  const asHost = async (fn: (s: RoomsModule) => Promise<void>) => {
    if (!svc) return;
    setBusy(true);
    try {
      if (room.hostUid !== me.uid) await svc.claimHost(code, me.uid);
      await fn(svc);
    } catch (err) {
      console.warn(err);
      toast(onlineErrorText(err), 4000);
    } finally {
      setBusy(false);
    }
  };

  const startNext = () => asHost((s) => s.startRound(code, room.round, generatePuzzle()));

  const leave = async () => {
    setLeaveOpen(false);
    try {
      if (member && svc) await svc.leaveRoom(code, me.uid);
    } finally {
      route('/');
    }
  };

  const title =
    phase === 'lobby' || phase === 'join' || phase === 'closed'
      ? `Oda ${code}`
      : phase === 'final'
        ? 'Sonuçlar'
        : `Tur ${room.round}/${room.rounds}`;

  return (
    <Shell code={code} title={title} onBack={() => (member ? setLeaveOpen(true) : route('/'))}>
      {phase === 'join' && <JoinForm players={players} onJoin={join} busy={busy} full={players.length >= MAX_ROOM_PLAYERS} />}

      {phase === 'closed' && (
        <Note
          title="Maç başlamış"
          text="Bu odada oyun sürüyor. Maç bitince oda sahibi rövanş başlatırsa katılabilirsin."
          action={['Ana menü', () => route('/')]}
        />
      )}

      {phase === 'lobby' && (
        <Lobby
          room={room}
          players={players}
          me={me.uid}
          hostUid={hostUid}
          now={now}
          iAmHost={iAmHost}
          busy={busy}
          onStart={startNext}
          onSettings={(rounds, timeLimit) => asHost((s) => s.updateRoomSettings(code, rounds, timeLimit))}
        />
      )}

      {phase === 'play' && (
        <>
          <OnlinePlay
            key={`${room.game}-${room.round}`}
            room={room}
            serverNow={serverNow}
            onFinish={(o) => {
              const g = room.game;
              const r = room.round;
              setLocalDone(`${g}:${r}`);
              setLastOutcome(o);
              svc
                ?.submitResult(code, { uid: me.uid, game: g, round: r, value: o.value, diff: o.diff, reachedAtMs: o.reachedAtMs, steps: o.steps })
                .catch((err) => toast(`Sonucun gönderilemedi: ${onlineErrorText(err)}`, 5000));
            }}
          />
          <DoneCounter players={players} results={results} room={room} now={now} />
        </>
      )}

      {phase === 'waiting' && (
        <Waiting room={room} players={players} results={results} me={me.uid} now={now} outcome={lastOutcome} />
      )}

      {phase === 'summary' && currentPuzzle(room) && (
        <div class="party-stack">
          <RoundSummaryView
            round={room.round - 1}
            rounds={room.rounds}
            puzzle={currentPuzzle(room)!}
            entries={roundEntries[room.round - 1] ?? []}
            names={names}
            solution={solutions[room.round - 1]}
          />
          {room.round > 1 && (
            <section class="party-standings">
              <h3 class="eyebrow">Genel durum</h3>
              <StandingsTable standings={table} names={names} compact />
            </section>
          )}
          {iAmHost ? (
            <button type="button" class="btn btn--primary btn--lg btn--block" onClick={startNext} disabled={busy}>
              Sonraki tur
              <Icon name="arrow" />
            </button>
          ) : (
            <p class="wait-host">Sonraki turu {hostName} başlatacak.</p>
          )}
        </div>
      )}

      {phase === 'final' && (
        <div class="party-stack">
          <Podium standings={table} names={names} />
          <StandingsTable standings={table} names={names} />
          {iAmHost ? (
            <div class="result-actions">
              <button
                type="button"
                class="btn btn--primary btn--lg"
                disabled={busy}
                onClick={() => asHost((s) => s.rematch(code, room.game))}
              >
                <Icon name="reset" />
                Rövanş
              </button>
              <button type="button" class="btn btn--lg" onClick={leave}>
                Odadan çık
              </button>
            </div>
          ) : (
            <>
              <p class="wait-host">Rövanş için {hostName} bekleniyor.</p>
              <button type="button" class="btn btn--block" onClick={leave}>
                Odadan çık
              </button>
            </>
          )}
        </div>
      )}

      <Confirm
        open={leaveOpen}
        title="Odadan çık"
        message={phase === 'lobby' ? 'Odadan ayrılacaksın.' : 'Maç senin için bitecek; diğerleri devam edebilir.'}
        confirmLabel="Çık"
        onConfirm={leave}
        onCancel={() => setLeaveOpen(false)}
      />
    </Shell>
  );
}

function Shell({
  code,
  title,
  onBack,
  children,
}: {
  code: string;
  title?: string;
  onBack?: () => void;
  children: preact.ComponentChildren;
}) {
  return (
    <main class="page">
      <TopBar title={title ?? `Oda ${code}`} onBack={onBack} />
      {children}
    </main>
  );
}

function Note({ title, text, action }: { title: string; text: string; action?: [string, () => void] }) {
  return (
    <div class="center-note">
      <h2>{title}</h2>
      <p class="muted">{text}</p>
      {action && (
        <button type="button" class="btn btn--primary" onClick={action[1]}>
          {action[0]}
        </button>
      )}
    </div>
  );
}

function JoinForm({
  players,
  onJoin,
  busy,
  full,
}: {
  players: PlayerData[];
  onJoin: (name: string) => void;
  busy: boolean;
  full: boolean;
}) {
  const [name, setName] = useState(nickname.value);
  return (
    <form
      class="online-entry"
      onSubmit={(e) => {
        e.preventDefault();
        onJoin(name);
      }}
    >
      <h2 class="join-title">Odaya katıl</h2>
      {players.length > 0 && (
        <p class="muted">
          İçeride: {players.map((p) => p.name).join(', ')}
        </p>
      )}
      <label class="field">
        <span class="field__label">Adın</span>
        <input
          class="input"
          value={name}
          maxLength={NAME_MAX}
          placeholder="Örn. Deniz"
          autocomplete="nickname"
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
      </label>
      <button type="submit" class="btn btn--primary btn--lg btn--block" disabled={busy || full}>
        {full ? 'Oda dolu' : busy ? 'Katılınıyor…' : 'Katıl'}
      </button>
    </form>
  );
}

function Lobby({
  room,
  players,
  me,
  hostUid,
  now,
  iAmHost,
  busy,
  onStart,
  onSettings,
}: {
  room: RoomData;
  players: PlayerData[];
  me: string;
  hostUid: string | null;
  now: number;
  iAmHost: boolean;
  busy: boolean;
  onStart: () => void;
  onSettings: (rounds: number, timeLimit: number) => void;
}) {
  const active = players.filter((p) => isActive(p, now));
  const link = `${location.origin}/oda/${room.code}`;
  const invite = () =>
    shareOrCopy({
      title: 'Bir İşlem',
      text: `Bir İşlem'de benimle yarış! Oda kodu: ${room.code}`,
      url: link,
    });
  const sorted = players.slice().sort((a, b) => (a.joinedAt ?? Infinity) - (b.joinedAt ?? Infinity));
  return (
    <section class="lobby">
      <div class="lobby__code">
        <span class="eyebrow">Oda kodu</span>
        <div class="code-flaps" aria-label={`Oda kodu ${room.code.split('').join(' ')}`}>
          {room.code.split('').map((c, i) => (
            <span class="flap num" key={i} style={{ animationDelay: `${i * 60}ms` }}>
              {c}
            </span>
          ))}
        </div>
        <div class="lobby__share">
          <button type="button" class="btn btn--sm" onClick={invite}>
            <Icon name="share" size={18} />
            Davet et
          </button>
          <button
            type="button"
            class="btn btn--sm"
            onClick={() =>
              navigator.clipboard?.writeText(room.code).then(
                () => toast('Kod kopyalandı'),
                () => toast(room.code),
              )
            }
          >
            <Icon name="copy" size={18} />
            Kodu kopyala
          </button>
        </div>
      </div>

      <div class="lobby__players">
        <h3 class="eyebrow">
          Oyuncular · {players.length}/{MAX_ROOM_PLAYERS}
        </h3>
        <ul>
          {sorted.map((p) => (
            <li key={p.uid} class={isActive(p, now) ? '' : 'is-away'}>
              <span class={`dot${isActive(p, now) ? ' is-on' : ''}`} aria-hidden="true" />
              <span class="lobby__name">{p.name}</span>
              {p.uid === me && <span class="tag">sen</span>}
              {p.uid === hostUid && <span class="tag tag--host">oda sahibi</span>}
              {!isActive(p, now) && <span class="lobby__away">bağlantı koptu</span>}
            </li>
          ))}
        </ul>
      </div>

      <div class="lobby__settings">
        {iAmHost ? (
          <>
            <div class="online-card__row">
              <span class="field__label">Tur sayısı</span>
              <Segmented
                label="Tur sayısı"
                value={room.rounds}
                options={ROOM_ROUND_OPTIONS.map((r) => ({ value: r, label: String(r) }))}
                onChange={(r) => onSettings(r, room.timeLimit)}
              />
            </div>
            <div class="online-card__row">
              <span class="field__label">Her tur için süre</span>
              <Segmented
                label="Süre"
                value={room.timeLimit}
                options={ROOM_TIME_OPTIONS.map((t) => ({ value: t, label: formatTimeLimit(t) }))}
                onChange={(t) => onSettings(room.rounds, t)}
              />
            </div>
          </>
        ) : (
          <p class="muted">
            {room.rounds} tur · her tur {formatTimeLimit(room.timeLimit)}
          </p>
        )}
      </div>

      {iAmHost ? (
        <button
          type="button"
          class="btn btn--primary btn--lg btn--block"
          disabled={busy || active.length < 2}
          onClick={onStart}
        >
          {active.length < 2 ? 'Arkadaşların bekleniyor…' : 'Maçı başlat'}
          {active.length >= 2 && <Icon name="arrow" />}
        </button>
      ) : (
        <p class="wait-host">Oda sahibi başlatınca ilk soru gelecek.</p>
      )}
    </section>
  );
}

/** Oyun saati sunucu saatine göre ayarlanır: herkes aynı anda başlar, yenilemek süre kazandırmaz. */
function OnlinePlay({
  room,
  serverNow,
  onFinish,
}: {
  room: RoomData;
  serverNow: () => number;
  onFinish: (o: RoundOutcome) => void;
}) {
  const puzzle = currentPuzzle(room) as Puzzle;
  const startAt = useMemo(() => {
    const w = roundWindow(room)!;
    return performance.now() + (w.playStart - serverNow());
  }, []);
  return <RoundPlayer puzzle={puzzle} timeLimit={room.timeLimit} startAt={startAt} onFinish={onFinish} />;
}

function DoneCounter({ players, results, room, now }: { players: PlayerData[]; results: ResultData[]; room: RoomData; now: number }) {
  const got = resultsFor(results, room.game, room.round);
  const active = players.filter((p) => isActive(p, now) || got.has(p.uid));
  return (
    <p class="done-counter">
      <b class="num">
        {got.size}/{active.length}
      </b>{' '}
      oyuncu bitirdi
    </p>
  );
}

function Waiting({
  room,
  players,
  results,
  me,
  now,
  outcome,
}: {
  room: RoomData;
  players: PlayerData[];
  results: ResultData[];
  me: string;
  now: number;
  outcome: RoundOutcome | null;
}) {
  const got = resultsFor(results, room.game, room.round);
  const mine = got.get(me) ?? outcome;
  const w = roundWindow(room);
  const left = w ? Math.max(0, Math.ceil((w.playEnd - now) / 1000)) : 0;
  return (
    <section class="waiting">
      <p class="eyebrow">Sonucun gönderildi</p>
      <p class="waiting__mine num">
        {mine?.value ?? '–'}
        <span>
          {mine?.diff === 0
            ? 'tam isabet'
            : mine?.diff != null
              ? `${mine.diff} fark · ${formatElapsed(mine.reachedAtMs)}`
              : 'sonuç yok'}
        </span>
      </p>
      <ul class="waiting__list">
        {players.map((p) => {
          const has = got.has(p.uid);
          const away = !isActive(p, now) && !has;
          return (
            <li key={p.uid} class={has ? 'is-done' : away ? 'is-away' : ''}>
              {has ? <Icon name="check" size={18} /> : <span class={`dot${away ? '' : ' is-on is-pulse'}`} />}
              <span>{p.name}</span>
              <span class="waiting__state">{has ? 'bitirdi' : away ? 'bağlantı koptu' : 'çözüyor'}</span>
            </li>
          );
        })}
      </ul>
      <p class="muted waiting__left">
        {left > 0 ? `Tur en geç ${left} saniye içinde bitecek.` : 'Son sonuçlar bekleniyor…'}
      </p>
    </section>
  );
}
