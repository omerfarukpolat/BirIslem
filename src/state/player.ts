import { computed, effect, signal } from '@preact/signals';
import { readJSON, writeJSON } from '../lib/storage';
import { cleanName, nickname } from './profile';
import { ensureSession, session, signIn } from './auth';
import { toast } from './toast';

/**
 * Skorları kaydedilen oyuncu: Google ile giriş yapmış ya da anonim olarak
 * kaydolmuş. Anonim oyuncunun skorları yalnızca kendisine görünür, sıralamada
 * da yalnızca kendini görür. Google ile giren de anonim moda geçebilir.
 */
export interface Player {
  uid: string;
  name: string;
  /** Google ile giriş yaptı mı (değilse anonim oturum) */
  google: boolean;
  anonymous: boolean;
}

interface CachedProfile {
  uid: string;
  anonymous: boolean;
}

const KEY = 'birislem:profile';

/** Anonim oyuncunun kendi kayıtlarında görünen adı */
const anonymousName = () => cleanName(nickname.value) || 'Anonim';

/** Son bilinen tercih: ekranlar sunucuyu beklemeden doğru görünsün */
const cached = signal<CachedProfile | null>(readJSON<CachedProfile | null>(KEY, null));
effect(() => writeJSON(KEY, cached.value));

export const player = computed<Player | null>(() => {
  const s = session.value;
  if (!s) return null;
  const anonymous = cached.value?.uid === s.uid && cached.value.anonymous;
  if (!s.anonymous) return { uid: s.uid, name: s.name, google: true, anonymous };
  // Anonim oturum (ör. yalnızca çevrimiçi odaya girmiş) kendiliğinden oyuncu sayılmaz
  return anonymous ? { uid: s.uid, name: anonymousName(), google: false, anonymous: true } : null;
});

type Scores = typeof import('../services/scores');
const scores = (): Promise<Scores> => import('../services/scores');

const loads = new Map<string, Promise<boolean>>();
const healed = new Set<string>();

function remember(uid: string, anonymous: boolean) {
  cached.value = { uid, anonymous };
  loads.set(uid, Promise.resolve(anonymous));
}

/**
 * Sunucudaki tercihi yükler (anonim mi). Skor kaydetmeden ve sıralamayı açmadan
 * önce çağrılır: tercih başka bir cihazda değişmiş olabilir.
 */
export function loadProfile(uid: string, google: boolean): Promise<boolean> {
  let p = loads.get(uid);
  if (!p) {
    p = scores().then(async (m) => {
      const anonymous = (await m.fetchProfile(uid))?.anonymous ?? false;
      // Bu arada tercih bu cihazda değiştiyse (anonim kayıt, anonim mod) eski cevap onu ezmesin
      const latest = loads.get(uid);
      if (latest && latest !== p) return latest;
      cached.value = { uid, anonymous };
      // Açıkta kalmış skorlar (ör. başka cihazda eski sürümle kaydedilmiş) gizlenir
      if (anonymous && google && !healed.has(uid)) {
        healed.add(uid);
        m.moveScores(uid, true).catch((err) => console.warn('Skorlar gizlenemedi', err));
      }
      return anonymous;
    });
    loads.set(uid, p);
    p.catch(() => loads.delete(uid));
  }
  return p;
}

/** Skor nereye kaydedilir: herkese açık, gizli ya da hiç (oyuncu değil) */
export async function scoreTarget(): Promise<{ uid: string; name: string; private: boolean } | null> {
  const s = session.peek();
  if (!s) return null;
  const anonymous = await loadProfile(s.uid, !s.anonymous);
  if (s.anonymous && !anonymous) return null;
  return { uid: s.uid, name: s.anonymous ? anonymousName() : s.name, private: anonymous };
}

/** Girişsiz oyuncu: Google hesabı olmadan, yalnızca kendine görünen skorlarla kaydolur */
export async function joinAnonymously(): Promise<boolean> {
  try {
    const u = await ensureSession(anonymousName());
    const m = await scores();
    await m.saveProfile(u.uid, { anonymous: true });
    remember(u.uid, true);
    healed.add(u.uid);
    return true;
  } catch (err) {
    console.warn('Anonim kayıt açılamadı', err);
    const code = (err as { code?: string }).code;
    toast(
      code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation'
        ? 'Anonim kayıt şu an kapalı.'
        : 'Anonim kayıt açılamadı. Bağlantını kontrol edip tekrar dene.',
      6000,
    );
    return false;
  }
}

/** Google ile giren oyuncu için anonim mod: skorlar gizli koleksiyona taşınır ya da geri çıkar */
export async function setAnonymousMode(on: boolean): Promise<boolean> {
  const p = player.peek();
  if (!p?.google) return false;
  try {
    const m = await scores();
    await m.saveProfile(p.uid, { anonymous: on });
    remember(p.uid, on);
    healed.add(p.uid);
    await m.moveScores(p.uid, on);
    toast(on ? 'Anonim moddasın: skorlarını artık yalnızca sen görüyorsun.' : 'Artık sıralamada adınla görünüyorsun.', 5000);
    return true;
  } catch (err) {
    console.warn('Anonim mod değiştirilemedi', err);
    toast('Değiştirilemedi. Bağlantını kontrol edip tekrar dene.', 6000);
    return false;
  }
}

/** Google ile giriş; anonim oyuncunun hesabı bağlanırsa skorları ve anonim modu korunur */
export async function signInWithGoogle(): Promise<boolean> {
  const before = player.peek();
  const res = await signIn();
  if (res === 'switched' && before && !before.google) {
    toast('Bu Google hesabı daha önce kaydedilmiş; o hesaba geçtin. Bu cihazdaki anonim skorların bu hesaba taşınmadı.', 9000);
  }
  return res !== false;
}
