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

const service = () => import('../services/authService');

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
    const { googleSignIn } = await service();
    await googleSignIn();
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      console.warn('Giriş yapılamadı', err);
      toast('Giriş yapılamadı. Açılır pencere engelleyicisini kontrol edip tekrar dene.', 4000);
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
