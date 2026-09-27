import { computed, signal } from '@preact/signals';
import { firebaseEnabled } from '../services/config';
import { toast } from './toast';

export interface AppUser {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
  anonymous: boolean;
}

/** Firebase oturumu (anonim olabilir: çevrimiçi odalar için) */
export const session = signal<AppUser | null>(null);
export const authReady = signal(!firebaseEnabled);
/** Google ile giriş yapmış gerçek kullanıcı: skorlar yalnızca bunun için kaydedilir */
export const user = computed(() => (session.value && !session.value.anonymous ? session.value : null));

let started = false;

type AuthService = typeof import('../services/authService');
/** Yüklendikten sonra modülün kendisi: giriş penceresi beklemeden açılabilsin diye */
let loaded: AuthService | null = null;

const service = (): Promise<AuthService> => import('../services/authService').then((m) => (loaded = m));

/** Giriş hatasını oyuncuya anlaşılır bir cümleye çevirir; kod destek için sonda kalır. */
function signInErrorText(code: string | undefined): string {
  switch (code) {
    case 'auth/popup-blocked':
      return 'Tarayıcı giriş penceresini engelledi. Bu site için açılır pencerelere izin verip tekrar dene.';
    case 'auth/unauthorized-domain':
      return 'Bu adresten giriş yapılamıyor: alan adı Firebase\'de yetkili değil.';
    case 'auth/network-request-failed':
      return 'Google\'a bağlanılamadı. İnternetini ya da reklam engelleyicini kontrol et.';
    case 'auth/internal-error':
      // Çoğunlukla Google'ın giriş betiği (apis.google.com) engellendiğinde çıkar
      return 'Google giriş penceresi yüklenemedi. Reklam/içerik engelleyici ya da tarayıcının gizlilik ayarı engelliyor olabilir.';
    case 'auth/operation-not-allowed':
      return 'Google ile giriş şu an kapalı.';
    case 'auth/operation-not-supported-in-this-environment':
    case 'auth/web-storage-unsupported':
      return 'Bu tarayıcıda giriş yapılamıyor. Gizli sekme ya da kapalı çerezler engelliyor olabilir.';
    default:
      return 'Giriş yapılamadı. Birazdan tekrar dene.';
  }
}

/** Firebase Auth'u ilk çizimden sonra, boşta kalınca yükler. */
export function initAuth(eager = false) {
  if (started || !firebaseEnabled) return;
  started = true;
  const run = () =>
    service()
      .then(({ watchAuth }) =>
        watchAuth((u) => {
          session.value = u
            ? {
                uid: u.uid,
                name: u.displayName || (u.isAnonymous ? 'Misafir' : 'Oyuncu'),
                email: u.email,
                photoURL: u.photoURL,
                anonymous: u.isAnonymous,
              }
            : null;
          authReady.value = true;
        }),
      )
      .catch((err) => {
        console.warn('Firebase Auth yüklenemedi', err);
        authReady.value = true;
      });
  if (eager) run();
  else if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 600);
}

export async function signIn(): Promise<boolean> {
  if (!firebaseEnabled) return false;
  initAuth(true);
  try {
    // Açılır pencere tıklamayla aynı anda açılmalı: araya bir bekleme girerse
    // Safari ve Firefox pencereyi engeller. Modül yüklüyse beklemeden çağır.
    const m = loaded ?? (await service());
    await m.googleSignIn();
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      console.warn('Giriş yapılamadı', err);
      toast(`${signInErrorText(code)}${code ? ` (${code.replace('auth/', '')})` : ''}`, 7000);
    }
    return false;
  }
}

export async function signOut(): Promise<void> {
  const { signOutUser } = await service();
  await signOutUser();
}

/** Çevrimiçi oda için kimlik: giriş yapılmışsa o, yoksa anonim oturum. */
export async function ensureSession(displayName: string): Promise<AppUser> {
  if (!firebaseEnabled) throw new Error('firebase-disabled');
  initAuth(true);
  const svc = await service();
  let u = svc.currentUser();
  if (!u) {
    // onAuthStateChanged ilk kez tetiklenene kadar bekle
    await new Promise<void>((resolve) => {
      const off = svc.watchAuth(() => {
        off();
        resolve();
      });
    });
    u = svc.currentUser();
  }
  if (!u) u = await svc.anonymousSignIn();
  if (u.isAnonymous) await svc.setDisplayName(displayName);
  return {
    uid: u.uid,
    name: u.isAnonymous ? displayName : u.displayName || displayName,
    email: u.email,
    photoURL: u.photoURL,
    anonymous: u.isAnonymous,
  };
}
