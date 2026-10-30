import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  aggregate,
  dailyEntries,
  periodStart,
  SCORE_VERSION,
  userStats,
  type DailyEntry,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type ScoreRow,
  type UserStats,
} from '../lib/leaderboard';
import type { SimpleStep } from '../game/types';
import { firestore } from './db';

export { periodStart, SCORE_VERSION };
export type { DailyEntry, LeaderboardEntry, LeaderboardPeriod, UserStats };

/** Herkese açık sıralama */
const PUBLIC = 'scores';
/** Anonim oyuncuların skorları: kurallar gereği yalnızca sahibi okuyabilir */
const PRIVATE = 'privateScores';
/** Oyuncu tercihleri (anonim mod); yalnızca sahibi okur ve yazar */
const PROFILES = 'profiles';

export interface SaveScoreInput {
  uid: string;
  name: string;
  mode: 'solo' | 'daily';
  score: number;
  numbers: number[];
  target: number;
  value: number | null;
  diff: number | null;
  reachedAtMs: number | null;
  timeLimit: number;
  operationLimit: number;
  steps: SimpleStep[];
  /** Günün sorusu için "YYYY-MM-DD" */
  puzzleId?: string;
}

export interface Profile {
  /** Anonim oyuncu: skorları başkasına görünmez, sıralamada yalnızca kendini görür */
  anonymous: boolean;
}

const toRow = (d: QueryDocumentSnapshot<DocumentData>): ScoreRow => {
  const s = d.data();
  return { ...(s as Omit<ScoreRow, 'createdAtMs'>), createdAtMs: s.createdAt instanceof Timestamp ? s.createdAt.toMillis() : 0 };
};

const ownDocs = (name: string, uid: string) => getDocs(query(collection(firestore(), name), where('userId', '==', uid)));

export async function saveScore(s: SaveScoreInput, opts: { private: boolean }): Promise<void> {
  const data = {
    v: SCORE_VERSION,
    mode: s.mode,
    userId: s.uid,
    userName: s.name,
    score: s.score,
    numbers: s.numbers,
    target: s.target,
    userResult: s.value,
    diff: s.diff,
    timeUsed: s.reachedAtMs === null ? null : Math.round(s.reachedAtMs / 100) / 10,
    timeUsedMs: s.reachedAtMs === null ? null : Math.round(s.reachedAtMs),
    timeLimit: s.timeLimit,
    operationLimit: s.operationLimit,
    // Eski alan adlarıyla uyumlu işlem geçmişi
    calculationHistory: s.steps.map((st) => ({
      firstNumber: st.a,
      secondNumber: st.b,
      operator: st.op,
      result: st.result,
    })),
    ...(s.puzzleId ? { puzzleId: s.puzzleId } : {}),
    createdAt: Timestamp.now(),
  };
  const col = collection(firestore(), opts.private ? PRIVATE : PUBLIC);
  if (s.mode === 'daily' && s.puzzleId) {
    // Günde tek hak: belge kimliği sabit, kurallar yalnızca oluşturmaya izin verir.
    await setDoc(doc(col, `daily_${s.puzzleId}_${s.uid}`), data);
  } else {
    await addDoc(col, data);
  }
}

export async function fetchLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardEntry[]> {
  const since = periodStart(period);
  const snap = await getDocs(query(collection(firestore(), PUBLIC), where('createdAt', '>=', Timestamp.fromDate(since))));
  return aggregate(snap.docs.map(toRow), since.getTime());
}

export async function fetchDaily(puzzleId: string): Promise<DailyEntry[]> {
  const snap = await getDocs(query(collection(firestore(), PUBLIC), where('puzzleId', '==', puzzleId)));
  return dailyEntries(snap.docs.map(toRow), puzzleId);
}

export interface OwnBoard {
  period: (p: LeaderboardPeriod) => LeaderboardEntry[];
  daily: (puzzleId: string) => DailyEntry[];
  stats: UserStats;
}

/** Anonim oyuncunun sıralaması: yalnızca kendi kayıtları */
export async function fetchOwnBoard(uid: string): Promise<OwnBoard> {
  const rows = (await ownDocs(PRIVATE, uid)).docs.map(toRow);
  return {
    period: (p) => aggregate(rows, periodStart(p).getTime()),
    daily: (puzzleId) => dailyEntries(rows, puzzleId),
    stats: userStats(rows),
  };
}

export async function fetchUserStats(uid: string, opts: { private: boolean }): Promise<UserStats> {
  // Bileşik indeks gerektirmesin diye yalnızca eşitlik filtresi; gerisi istemcide.
  return userStats((await ownDocs(opts.private ? PRIVATE : PUBLIC, uid)).docs.map(toRow));
}

export async function fetchProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(firestore(), PROFILES, uid));
  return snap.exists() ? { anonymous: snap.data().anonymous === true } : null;
}

export async function saveProfile(uid: string, profile: Profile): Promise<void> {
  await setDoc(doc(firestore(), PROFILES, uid), { anonymous: profile.anonymous, updatedAt: Timestamp.now() });
}

/**
 * Oyuncunun skorlarını herkese açık ve gizli koleksiyonlar arasında taşır.
 * Hedefte aynı kimlikle belge varsa (günün sorusu) hedefteki kalır. Gizliden
 * açığa yalnızca yeni puanlama sistemindeki kayıtlar taşınır; eski biçimdeki
 * kayıtlar (eskiden e-posta da içeriyordu) gizli kalır.
 */
export async function moveScores(uid: string, toPrivate: boolean): Promise<number> {
  const db = firestore();
  const [from, to] = toPrivate ? [PUBLIC, PRIVATE] : [PRIVATE, PUBLIC];
  const [source, existing] = await Promise.all([ownDocs(from, uid), ownDocs(to, uid)]);
  const taken = new Set(existing.docs.map((d) => d.id));
  const docs = source.docs.filter((d) => toPrivate || d.data().v === SCORE_VERSION);
  // Her belge için iki işlem; toplu yazma 500 işlemle sınırlı
  for (let i = 0; i < docs.length; i += 200) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + 200)) {
      if (!taken.has(d.id)) batch.set(doc(db, to, d.id), d.data());
      batch.delete(d.ref);
    }
    await batch.commit();
  }
  return docs.length;
}

/** Hesap silinirken: iki koleksiyondaki bütün skorlar (eski sürümdekiler dahil) ve profil */
export async function deleteUserData(uid: string): Promise<void> {
  const db = firestore();
  const snaps = await Promise.all([ownDocs(PUBLIC, uid), ownDocs(PRIVATE, uid)]);
  const refs = snaps.flatMap((s) => s.docs.map((d) => d.ref));
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + 400)) batch.delete(ref);
    await batch.commit();
  }
  await deleteDoc(doc(db, PROFILES, uid));
}
