import { useEffect, useMemo, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../../components/Icon';
import { RoundSummaryView, StandingsTable, Podium, toEntries, useSolutions } from '../../components/match/Match';
import { RoundPlayer } from '../../components/round/RoundPlayer';
import { Confirm, Segmented, TopBar, useTitle } from '../../components/ui';
import { formatTimeLimit } from '../../game/format';
import { standings, type RoundEntry } from '../../game/match';
import { readJSON, removeKey, safeSession, writeJSON } from '../../lib/storage';
import { cleanName, NAME_MAX } from '../../state/profile';
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  PARTY_TIME_OPTIONS,
  ROUND_OPTIONS,
  createParty,
  currentPlayer,
  finishTurn,
  isParty,
  nextRound,
  rematch,
  restorable,
  startTurn,
  turnOrder,
  type Party as PartyT,
  type PartyConfig,
} from './partyState';
import './party.css';

const STORE_KEY = 'birislem:party';
const NAMES_KEY = 'birislem:party-setup';

interface SetupPrefs {
  names: string[];
  rounds: number;
  timeLimit: number;
}

function loadParty(): PartyT | null {
  const p = readJSON<unknown>(STORE_KEY, null, safeSession());
  return isParty(p) ? restorable(p) : null;
}

export default function Party() {
  useTitle('Aynı cihazda');
  const { route } = useLocation();
  const [party, setParty] = useState<PartyT | null>(loadParty);
  const [quitOpen, setQuitOpen] = useState(false);

  useEffect(() => {
    if (party) writeJSON(STORE_KEY, party, safeSession());
    else removeKey(STORE_KEY, safeSession());
  }, [party]);

  const names = useMemo(
    () => Object.fromEntries((party?.config.players ?? []).map((p) => [p.id, p.name])),
    [party?.config],
  );
  const solutions = useSolutions(party?.puzzles ?? []);
  const limitMs = (party?.config.timeLimit ?? 60) * 1000;
  const ids = party?.config.players.map((p) => p.id) ?? [];

  const roundEntries: RoundEntry[][] = useMemo(
    () =>
      party
        ? party.outcomes.map((o, r) =>
            // Oynanmakta olan turun sonuçları, tur bitmeden genel duruma yansımaz
            r < party.round || party.phase === 'summary' || party.phase === 'final'
              ? toEntries(ids, o, limitMs, solutions[r]?.diff)
              : [],
          )
        : [],
    [party, solutions],
  );

  if (!party) {
    return (
      <main class="page">
        <TopBar title="Aynı cihazda" />
        <Setup onStart={(cfg) => setParty(createParty(cfg))} />
      </main>
    );
  }

  const exit = () => {
    setQuitOpen(false);
    setParty(null);
    route('/');
  };

  const { phase, round, config } = party;
  const player = currentPlayer(party);
  const table = standings(ids, roundEntries);
  const title =
    phase === 'final' ? 'Sonuçlar' : `Tur ${round + 1}/${config.rounds}${phase === 'playing' ? ` · ${player.name}` : ''}`;

  return (
    <main class="page">
      <TopBar title={title} onBack={() => (phase === 'final' ? exit() : setQuitOpen(true))} />

      {phase === 'handoff' && (
        <Handoff
          party={party}
          onReady={() => setParty(startTurn(party))}
          table={round > 0 ? table : null}
          names={names}
        />
      )}

      {phase === 'playing' && (
        <RoundPlayer
          key={`${round}-${party.turn}`}
          puzzle={party.puzzles[round]}
          timeLimit={config.timeLimit}
          startAt={performance.now() + 3000}
          onFinish={(o) => setParty((p) => (p ? finishTurn(p, o) : p))}
        />
      )}

      {phase === 'summary' && (
        <div class="party-stack">
          <RoundSummaryView
            round={round}
            rounds={config.rounds}
            puzzle={party.puzzles[round]}
            entries={roundEntries[round]}
            names={names}
            solution={solutions[round]}
          />
          {round > 0 && (
            <section class="party-standings">
              <h3 class="eyebrow">Genel durum</h3>
              <StandingsTable standings={table} names={names} compact />
            </section>
          )}
          <button type="button" class="btn btn--primary btn--lg btn--block" onClick={() => setParty(nextRound(party))}>
            {round >= config.rounds - 1 ? 'Sonuçları gör' : 'Sonraki tur'}
            <Icon name="arrow" />
          </button>
        </div>
      )}

      {phase === 'final' && (
        <div class="party-stack">
          <Podium standings={table} names={names} />
          <StandingsTable standings={table} names={names} />
          <div class="result-actions">
            <button type="button" class="btn btn--primary btn--lg" onClick={() => setParty(rematch(party))}>
              <Icon name="reset" />
              Rövanş
            </button>
            <button type="button" class="btn btn--lg" onClick={() => setParty(null)}>
              <Icon name="users" />
              Yeni maç
            </button>
          </div>
        </div>
      )}

      <Confirm
        open={quitOpen}
        title="Maçtan çık"
        message="Maç yarıda kalacak ve sonuçlar silinecek."
        confirmLabel="Çık"
        onConfirm={exit}
        onCancel={() => setQuitOpen(false)}
      />
    </main>
  );
}

function Setup({ onStart }: { onStart: (cfg: PartyConfig) => void }) {
  const prefs = readJSON<SetupPrefs>(NAMES_KEY, { names: ['', ''], rounds: 5, timeLimit: 60 });
  const [names, setNames] = useState<string[]>(prefs.names.length >= MIN_PLAYERS ? prefs.names : ['', '']);
  const [rounds, setRounds] = useState<number>(prefs.rounds);
  const [timeLimit, setTimeLimit] = useState<number>(prefs.timeLimit);

  const setName = (i: number, v: string) => setNames((n) => n.map((x, j) => (j === i ? v : x)));

  const start = () => {
    writeJSON(NAMES_KEY, { names, rounds, timeLimit });
    const used = new Map<string, number>();
    const players = names.map((raw, i) => {
      let name = cleanName(raw) || `Oyuncu ${i + 1}`;
      const seen = used.get(name.toLocaleLowerCase('tr-TR')) ?? 0;
      used.set(name.toLocaleLowerCase('tr-TR'), seen + 1);
      if (seen > 0) name = `${name} ${seen + 1}`;
      return { id: `p${i + 1}`, name };
    });
    onStart({ players, rounds, timeLimit });
  };

  return (
    <form
      class="setup"
      onSubmit={(e) => {
        e.preventDefault();
        start();
      }}
    >
      <p class="setup__lead">
        Herkes aynı soruyu sırayla çözer. Sonuçlar tur bitince açıklanır, o yüzden sıra sende değilken ekrana bakma.
      </p>

      <fieldset class="setup__group">
        <legend>Oyuncular</legend>
        {names.map((n, i) => (
          <div class="player-field" key={i}>
            <span class="player-field__n num">{i + 1}</span>
            <input
              class="input"
              value={n}
              placeholder={`Oyuncu ${i + 1}`}
              maxLength={NAME_MAX}
              autocomplete="off"
              aria-label={`${i + 1}. oyuncunun adı`}
              onInput={(e) => setName(i, (e.target as HTMLInputElement).value)}
            />
            {names.length > MIN_PLAYERS && (
              <button
                type="button"
                class="icon-btn"
                aria-label={`${i + 1}. oyuncuyu çıkar`}
                onClick={() => setNames((x) => x.filter((_, j) => j !== i))}
              >
                <Icon name="close" />
              </button>
            )}
          </div>
        ))}
        {names.length < MAX_PLAYERS && (
          <button type="button" class="btn btn--sm setup__add" onClick={() => setNames((x) => [...x, ''])}>
            <Icon name="plus" size={18} />
            Oyuncu ekle
          </button>
        )}
      </fieldset>

      <fieldset class="setup__group">
        <legend>Tur sayısı</legend>
        <Segmented
          label="Tur sayısı"
          value={rounds}
          options={ROUND_OPTIONS.map((r) => ({ value: r, label: String(r) }))}
          onChange={setRounds}
        />
      </fieldset>

      <fieldset class="setup__group">
        <legend>Her tur için süre</legend>
        <Segmented
          label="Süre"
          value={timeLimit}
          options={PARTY_TIME_OPTIONS.map((t) => ({ value: t, label: formatTimeLimit(t) }))}
          onChange={setTimeLimit}
        />
      </fieldset>

      <button type="submit" class="btn btn--primary btn--lg btn--block">
        Başlat
        <Icon name="arrow" />
      </button>
    </form>
  );
}

function Handoff({
  party,
  onReady,
  table,
  names,
}: {
  party: PartyT;
  onReady: () => void;
  table: ReturnType<typeof standings> | null;
  names: Record<string, string>;
}) {
  const order = turnOrder(party);
  const player = currentPlayer(party);
  const prev = party.turn > 0 ? order[party.turn - 1] : null;
  return (
    <section class="handoff">
      {prev && <p class="handoff__done">{prev.name} tamamladı.</p>}
      <p class="eyebrow">Sıradaki oyuncu</p>
      <h2 class="handoff__name">{player.name}</h2>
      <p class="muted">Cihaz sıradaki oyuncuda olsun, diğerleri ekrana bakmasın. Hazır olunca 3 saniyelik geri sayım başlar.</p>
      <button type="button" class="btn btn--primary btn--lg btn--block" onClick={onReady} autofocus>
        Hazırım
      </button>
      <ol class="handoff__order" aria-label="Bu turun sırası">
        {order.map((p, i) => (
          <li key={p.id} class={i < party.turn ? 'is-done' : i === party.turn ? 'is-now' : ''}>
            {i < party.turn && <Icon name="check" size={16} />}
            {p.name}
          </li>
        ))}
      </ol>
      {table && (
        <section class="party-standings">
          <h3 class="eyebrow">Genel durum</h3>
          <StandingsTable standings={table} names={names} compact />
        </section>
      )}
    </section>
  );
}
