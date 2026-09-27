import type { Puzzle, SimpleStep } from '../../game/types';

/** Soru yayınlandıktan sonra oyun saatine kadar geri sayım */
export const COUNTDOWN_MS = 3000;
/** Süre bittikten sonra geç gelen sonuçlar için tolerans */
export const GRACE_MS = 4000;
/** Bu kadar süredir sinyal vermeyen oyuncu "koptu" sayılır */
export const ACTIVE_MS = 45_000;
export const HEARTBEAT_MS = 15_000;
export const MAX_ROOM_PLAYERS = 8;
export const ROOM_ROUND_OPTIONS = [3, 5, 7, 10] as const;
export const ROOM_TIME_OPTIONS = [30, 45, 60, 90, 120] as const;
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface RoomData {
  code: string;
  hostUid: string;
  status: RoomStatus;
  rounds: number;
  /** saniye */
  timeLimit: number;
  /** Rövanş sayacı (1'den başlar) */
  game: number;
  /** 0 = lobi, 1..rounds = oynanan tur */
  round: number;
  /** puzzles[i] = (i+1). turun sorusu */
  puzzles: Puzzle[];
  /** Sunucu saatiyle sorunun yayınlandığı an (ms) */
  roundStartedAt: number | null;
}

export interface PlayerData {
  uid: string;
  name: string;
  joinedAt: number | null;
  /** null: yazma henüz sunucuya ulaşmadı */
  lastSeen: number | null;
}

export interface ResultData {
  uid: string;
  game: number;
  round: number;
  value: number | null;
  diff: number | null;
  reachedAtMs: number | null;
  steps: SimpleStep[];
}

export function normalizeCode(raw: string): string {
  return raw
    .toLocaleUpperCase('en-US')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH);
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

export function randomCode(rand: (n: number) => number = cryptoInt): string {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return s;
}

function cryptoInt(n: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

export function currentPuzzle(room: RoomData): Puzzle | null {
  return room.round >= 1 ? (room.puzzles[room.round - 1] ?? null) : null;
}

export function isActive(p: PlayerData, now: number): boolean {
  return p.lastSeen === null || now - p.lastSeen < ACTIVE_MS;
}

/** Oda sahibi koptuysa en eski aktif oyuncu yönetimi devralır. */
export function effectiveHost(room: RoomData, players: PlayerData[], now: number): string | null {
  const host = players.find((p) => p.uid === room.hostUid);
  if (host && isActive(host, now)) return host.uid;
  const next = players
    .filter((p) => isActive(p, now))
    .sort((a, b) => (a.joinedAt ?? Infinity) - (b.joinedAt ?? Infinity) || a.uid.localeCompare(b.uid))[0];
  return next?.uid ?? null;
}

export interface RoundWindow {
  /** Oyun saatinin başladığı an (sunucu ms) */
  playStart: number;
  playEnd: number;
  /** Bu andan sonra tur, eksik sonuç olsa da biter */
  deadline: number;
}

export function roundWindow(room: RoomData): RoundWindow | null {
  if (room.status !== 'playing' || room.round < 1 || room.roundStartedAt === null) return null;
  const playStart = room.roundStartedAt + COUNTDOWN_MS;
  const playEnd = playStart + room.timeLimit * 1000;
  return { playStart, playEnd, deadline: playEnd + GRACE_MS };
}

export function resultsFor(results: ResultData[], game: number, round: number): Map<string, ResultData> {
  const m = new Map<string, ResultData>();
  for (const r of results) if (r.game === game && r.round === round) m.set(r.uid, r);
  return m;
}

/** Tur, aktif herkesin sonucu geldiğinde ya da süre + tolerans dolduğunda biter. */
export function isRoundComplete(room: RoomData, players: PlayerData[], results: ResultData[], now: number): boolean {
  const w = roundWindow(room);
  if (!w) return false;
  if (now >= w.deadline) return true;
  const got = resultsFor(results, room.game, room.round);
  const needed = players.filter((p) => isActive(p, now) || got.has(p.uid));
  return needed.length > 0 && needed.every((p) => got.has(p.uid));
}

export type RoomPhase =
  | 'join' // oyuncu değil, lobiye katılabilir
  | 'closed' // oyuncu değil, maç başlamış
  | 'lobby'
  | 'play'
  | 'waiting'
  | 'summary'
  | 'final';

export function derivePhase(
  room: RoomData,
  players: PlayerData[],
  results: ResultData[],
  me: string,
  now: number,
  /** Bu cihazda bitirilmiş ama henüz dinleyiciye düşmemiş tur (game:round) */
  localDone: string | null,
): RoomPhase {
  const member = players.some((p) => p.uid === me);
  if (!member) return room.status === 'lobby' ? 'join' : 'closed';
  if (room.status === 'lobby') return 'lobby';
  if (room.status === 'finished') return 'final';
  const complete = isRoundComplete(room, players, results, now);
  if (complete) return room.round >= room.rounds ? 'final' : 'summary';
  const mine = resultsFor(results, room.game, room.round).has(me) || localDone === `${room.game}:${room.round}`;
  if (mine) return 'waiting';
  const w = roundWindow(room)!;
  return now < w.playEnd ? 'play' : 'waiting';
}

/** Genel sıralamada sayılacak (bitmiş) turlar: 1..n */
export function completedRounds(room: RoomData, players: PlayerData[], results: ResultData[], now: number): number {
  if (room.status === 'lobby') return 0;
  if (room.status === 'finished') return room.round;
  return isRoundComplete(room, players, results, now) ? room.round : room.round - 1;
}
