import { computed, effect, signal } from '@preact/signals';
import { readJSON, writeJSON } from '../lib/storage';
import { cleanName, nickname } from './profile';
import { ensureSession, googleSignInAvailable, session, signIn } from './auth';
import { toast } from './toast';

/**
 * Sıralamadaki görünürlük. Görünür: skorlar adıyla herkese açık. Anonim: skorları
 * yalnızca kendisi görür, sıralamada da yalnızca kendini görür. Bilinmiyor: henüz
 * seçmedi (bu özellikten önce kaydolan herkes böyle başlar); seçene kadar sorulur.
 */
export type Privacy = 'visible' | 'anonymous' | 'unknown';

/**
 * Skorları kaydedilen oyuncu: Google ile giriş yapmış ya da anonim olarak
 * kaydolmuş (Google hesabı olmadan, yalnızca anonim).
 */
export interface Player {
  uid: string;
  name: string;
  /** Google ile giriş yaptı mı (değilse anonim oturum) */
  google: boolean;
  privacy: Privacy;
  anonymous: boolean;
}

interface CachedProfile {
  uid: string;
  privacy: Privacy;
}

const KEY = 'birislem:privacy';
const PRIVACIES: readonly Privacy[] = ['visible', 'anonymous', 'unknown'];

function readCache(): CachedProfile | null {
  const c = readJSON<Partial<CachedProfile> | null>(KEY, null);
  return c && typeof c.uid === 'string' && PRIVACIES.includes(c.privacy as Privacy) ? (c as CachedProfile) : null;
}

/** Son bilinen tercih: ekranlar sunucuyu beklemeden doğru görünsün */
const cached = signal<CachedProfile | null>(readCache());
effect(() => writeJSON(KEY, cached.value));

/** Tercihi bu oturumda sunucudan doğrulanan oyuncu (kimlik) */
export const confirmedUid = signal<string | null>(null);

/** Anonim oyuncunun kendi kayıtlarında görünen adı */
const anonymousName = () => cleanName(nickname.value) || 'Anonim';

export const player = computed<Player | null>(() => {
  const s = session.value;
  if (!s) return null;
  const privacy: Privacy = cached.value?.uid === s.uid ? cached.value.privacy : 'unknown';
  if (!s.anonymous) return { uid: s.uid, name: s.name, google: true, privacy, anonymous: privacy === 'anonymous' };
  // Anonim oturum (ör. yalnızca çevrimiçi odaya girmiş) kendiliğinden oyuncu sayılmaz
  return privacy === 'anonymous' ? { uid: s.uid, name: anonymousName(), google: false, privacy, anonymous: true } : null;
});

type Scores = typeof import('../services/scores');
const scores = (): Promise<Scores> => import('../services/scores');

const loads = new Map<string, Promise<Privacy>>();
const healed = new Set<string>();

function remember(uid: string, privacy: Privacy) {
  cached.value = { uid, privacy };
  confirmedUid.value = uid;
  loads.set(uid, Promise.resolve(privacy));
}

/** Tercih cihazda biliniyor mu (bilinmiyorsa sunucudan sorulmalı) */
export function knownLocally(uid: string): boolean {
  return cached.peek()?.uid === uid && cached.peek()!.privacy !== 'unknown';
}

/**
 * Sunucudaki tercihi yükler. Skor kaydetmeden ve sıralamayı açmadan önce çağrılır:
 * tercih başka bir cihazda değişmiş olabilir.
 */
export function loadProfile(uid: string, google: boolean): Promise<Privacy> {
  let p = loads.get(uid);
  if (!p) {
    p = scores().then(async (m) => {
      const profile = await m.fetchProfile(uid);
      const privacy: Privacy = profile ? (profile.anonymous ? 'anonymous' : 'visible') : 'unknown';
      // Bu arada tercih bu cihazda değiştiyse (anonim kayıt, seçim) eski cevap onu ezmesin
      const latest = loads.get(uid);
      if (latest && latest !== p) return latest;
      cached.value = { uid, privacy };
      confirmedUid.value = uid;
      // Açıkta kalmış skorlar (ör. başka cihazda eski sürümle kaydedilmiş) gizlenir
      if (privacy === 'anonymous' && google && !healed.has(uid)) {
        healed.add(uid);
        m.moveScores(uid, true).catch((err) => console.warn('Skorlar gizlenemedi', err));
      }
      return privacy;
    });
    loads.set(uid, p);
    p.catch(() => loads.delete(uid));
  }
  return p;
}

/**
 * Skor nereye kaydedilir: herkese açık ya da gizli; 'ask' = önce oyuncuya
 * sorulmalı (tercih bilinmiyor); null = oyuncu değil.
 */
export async function scoreTarget(): Promise<{ uid: string; name: string; private: boolean } | 'ask' | null> {
  const s = session.peek();
  if (!s) return null;
  const privacy = await loadProfile(s.uid, !s.anonymous);
  if (s.anonymous) return privacy === 'anonymous' ? { uid: s.uid, name: anonymousName(), private: true } : null;
  if (privacy === 'unknown') return 'ask';
  return { uid: s.uid, name: s.name, private: privacy === 'anonymous' };
}

/** Girişsiz oyuncu: Google hesabı olmadan, yalnızca kendine görünen skorlarla kaydolur */
export async function joinAnonymously(): Promise<boolean> {
  try {
    const u = await ensureSession(anonymousName());
    const m = await scores();
    await m.saveProfile(u.uid, { anonymous: true });
    remember(u.uid, 'anonymous');
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

/**
 * Görünürlüğü seçer ya da değiştirir. Anonime geçerken geçmiş skorlar gizli
 * koleksiyona taşınır, görünüre geçerken geri çıkar. Google hesabı olmayan anonim
 * oyuncu görünür olmak isterse önce Google hesabına bağlanır.
 */
export async function setPrivacy(anonymous: boolean): Promise<boolean> {
  const s = session.peek();
  const p = player.peek();
  if (!s || !p) return false;
  if (!p.google) {
    if (anonymous) return true;
    if (!googleSignInAvailable) {
      toast('Adınla görünmek için Google ile giriş gerekiyor; bu uygulamada Google girişi yok.', 7000);
      return false;
    }
    const res = await signIn();
    if (res === false) return false;
    if (res === 'switched') {
      toast('Bu Google hesabı daha önce kaydedilmiş; o hesaba geçtin. Bu cihazdaki anonim skorların bu hesaba taşınmadı.', 9000);
      return true;
    }
  }
  try {
    const m = await scores();
    await m.saveProfile(s.uid, { anonymous });
    remember(s.uid, anonymous ? 'anonymous' : 'visible');
    healed.add(s.uid);
    await m.moveScores(s.uid, anonymous);
    toast(anonymous ? 'Anonimsin: skorlarını yalnızca sen görüyorsun.' : 'Sıralamada adınla görünüyorsun.', 5000);
    return true;
  } catch (err) {
    console.warn('Görünürlük değiştirilemedi', err);
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
