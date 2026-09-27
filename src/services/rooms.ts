import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Puzzle } from '../game/types';
import { randomCode, type PlayerData, type ResultData, type RoomData, type RoomStatus } from '../screens/online/roomLogic';
import { firestore } from './db';

const DAY_MS = 24 * 60 * 60 * 1000;
const rooms = () => collection(firestore(), 'rooms');
const roomRef = (code: string) => doc(rooms(), code);
const playerRef = (code: string, uid: string) => doc(firestore(), 'rooms', code, 'players', uid);
const resultRef = (code: string, id: string) => doc(firestore(), 'rooms', code, 'results', id);
/** Firestore TTL ilkesi etkinse eski odalar kendiliğinden silinir */
const expiry = () => Timestamp.fromMillis(Date.now() + DAY_MS);
const ms = (t: unknown): number | null => (t instanceof Timestamp ? t.toMillis() : null);

function toRoom(code: string, d: DocumentData): RoomData {
  return {
    code,
    hostUid: d.hostUid,
    status: d.status as RoomStatus,
    rounds: d.rounds,
    timeLimit: d.timeLimit,
    game: d.game,
    round: d.round,
    puzzles: Array.isArray(d.puzzles) ? d.puzzles : [],
    roundStartedAt: ms(d.roundStartedAt),
  };
}

export async function createRoom(host: { uid: string; name: string }, rounds: number, timeLimit: number): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode();
    const created = await runTransaction(firestore(), async (tx) => {
      const snap = await tx.get(roomRef(code));
      if (snap.exists()) return false;
      tx.set(roomRef(code), {
        code,
        hostUid: host.uid,
        status: 'lobby',
        rounds,
        timeLimit,
        game: 1,
        round: 0,
        puzzles: [],
        roundStartedAt: null,
        createdAt: serverTimestamp(),
        expiresAt: expiry(),
      });
      return true;
    });
    if (created) {
      await joinRoom(code, host);
      return code;
    }
  }
  throw new Error('room-code-exhausted');
}

export async function roomExists(code: string): Promise<boolean> {
  return (await getDoc(roomRef(code))).exists();
}

export async function joinRoom(code: string, me: { uid: string; name: string }): Promise<void> {
  const ref = playerRef(code, me.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { name: me.name, lastSeen: serverTimestamp() });
  } else {
    await setDoc(ref, {
      uid: me.uid,
      name: me.name,
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      expiresAt: expiry(),
    });
  }
}

export async function leaveRoom(code: string, uid: string): Promise<void> {
  await deleteDoc(playerRef(code, uid));
}

export async function heartbeat(code: string, uid: string): Promise<void> {
  await updateDoc(playerRef(code, uid), { lastSeen: serverTimestamp() });
}

export function watchRoom(code: string, cb: (room: RoomData | null) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    roomRef(code),
    (snap) => cb(snap.exists() ? toRoom(code, snap.data({ serverTimestamps: 'estimate' })) : null),
    onError,
  );
}

/**
 * Oyuncular. Kendi belgemizdeki sunucu zaman damgası çözüldüğünde
 * cihaz saatiyle sunucu saati arasındaki farkı da bildirir.
 */
export function watchPlayers(
  code: string,
  me: string,
  cb: (players: PlayerData[]) => void,
  onClockOffset: (offsetMs: number) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firestore(), 'rooms', code, 'players'),
    (snap) => {
      const list: PlayerData[] = [];
      snap.forEach((d) => {
        const x = d.data();
        list.push({ uid: d.id, name: x.name ?? 'Oyuncu', joinedAt: ms(x.joinedAt), lastSeen: ms(x.lastSeen) });
      });
      // Saat farkı yalnızca kendi yazdığımız zaman damgası sunucudan yeni döndüğünde ölçülür
      for (const ch of snap.docChanges()) {
        const lastSeen = ch.doc.get('lastSeen');
        if (ch.doc.id === me && ch.type !== 'removed' && !ch.doc.metadata.hasPendingWrites && lastSeen instanceof Timestamp) {
          onClockOffset(lastSeen.toMillis() - Date.now());
        }
      }
      cb(list);
    },
    onError,
  );
}

export function watchResults(code: string, game: number, cb: (results: ResultData[]) => void, onError: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(collection(firestore(), 'rooms', code, 'results'), where('game', '==', game)),
    (snap) => {
      const list: ResultData[] = [];
      snap.forEach((d) => {
        const x = d.data();
        list.push({
          uid: x.uid,
          game: x.game,
          round: x.round,
          value: x.value ?? null,
          diff: x.diff ?? null,
          reachedAtMs: x.reachedAtMs ?? null,
          steps: Array.isArray(x.steps) ? x.steps : [],
        });
      });
      cb(list);
    },
    onError,
  );
}

export async function submitResult(code: string, r: ResultData): Promise<void> {
  await setDoc(resultRef(code, `${r.game}_${r.round}_${r.uid}`), {
    ...r,
    submittedAt: serverTimestamp(),
    expiresAt: expiry(),
  });
}

/** Oda sahibi: bir sonraki turu başlatır. Aynı anda iki istemci basarsa biri kazanır. */
export async function startRound(code: string, expectedRound: number, puzzle: Puzzle): Promise<void> {
  await runTransaction(firestore(), async (tx) => {
    const snap = await tx.get(roomRef(code));
    if (!snap.exists() || snap.data().round !== expectedRound) return;
    const history: Puzzle[] = expectedRound === 0 ? [] : (snap.data().puzzles ?? []);
    tx.update(roomRef(code), {
      status: 'playing',
      round: expectedRound + 1,
      puzzles: [...history.slice(0, expectedRound), puzzle],
      roundStartedAt: serverTimestamp(),
    });
  });
}

export async function finishGame(code: string): Promise<void> {
  await updateDoc(roomRef(code), { status: 'finished' });
}

export async function rematch(code: string, game: number): Promise<void> {
  await updateDoc(roomRef(code), {
    status: 'lobby',
    game: game + 1,
    round: 0,
    puzzles: [],
    roundStartedAt: null,
    expiresAt: expiry(),
  });
}

export async function updateRoomSettings(code: string, rounds: number, timeLimit: number): Promise<void> {
  await updateDoc(roomRef(code), { rounds, timeLimit });
}

/** Oda sahibi koptuysa yönetimi devral (kurallar yalnızca bu durumda izin verir). */
export async function claimHost(code: string, uid: string): Promise<void> {
  await updateDoc(roomRef(code), { hostUid: uid });
}
