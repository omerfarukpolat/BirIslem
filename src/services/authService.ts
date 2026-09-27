import {
  GoogleAuthProvider,
  connectAuthEmulator,
  signInWithCredential,
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { firebaseApp } from './app';
import { useEmulators } from './config';

let auth: Auth | null = null;

export function authInstance(): Auth {
  if (!auth) {
    auth = getAuth(firebaseApp());
    auth.languageCode = 'tr';
    if (useEmulators) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      // Yalnızca emülatör derlemesinde: uçtan uca testler için açılır pencere olmadan Google girişi.
      // Üretim derlemesinde useEmulators sabiti false olduğundan bu blok paketten çıkarılır.
      const a = auth;
      (window as unknown as Record<string, unknown>).__emulatorGoogleSignIn = (name: string) =>
        signInWithCredential(
          a,
          GoogleAuthProvider.credential(
            JSON.stringify({ sub: name, email: `${name.replace(/\W/g, '').toLowerCase()}@example.com`, email_verified: true, name }),
          ),
        );
    }
  }
  return auth;
}

export function watchAuth(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(authInstance(), cb);
}

type ResolverHost = { _popupRedirectResolver?: { _initialize?: (auth: Auth) => Promise<unknown> } };

/**
 * Giriş penceresinin tıklamayla hemen açılabilmesi için Firebase'in yardımcı
 * çerçevesini önceden yükler. Firebase bunu yalnızca mobilde ve Safari'de kendisi
 * yapıyor; masaüstü Firefox/Chrome'da yükleme tıklamaya kalınca pencere, tarayıcının
 * tanıdığı kısa süreden sonra açılıyor ve engelleniyor. İç API değişirse sessizce
 * hiçbir şey yapmaz. Google ile girmiş kullanıcı için yüklemez ve false döner.
 */
export async function preparePopup(): Promise<boolean> {
  const a = authInstance();
  await a.authStateReady();
  if (a.currentUser && !a.currentUser.isAnonymous) return false;
  const resolver = (a as unknown as ResolverHost)._popupRedirectResolver;
  if (resolver?._initialize) await resolver._initialize(a);
  return true;
}

export async function googleSignIn(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const res = await signInWithPopup(authInstance(), provider);
  return res.user;
}

export async function anonymousSignIn(): Promise<User> {
  const res = await signInAnonymously(authInstance());
  return res.user;
}

export async function setDisplayName(name: string): Promise<void> {
  const u = authInstance().currentUser;
  if (u && u.isAnonymous && u.displayName !== name) await updateProfile(u, { displayName: name });
}

export async function signOutUser(): Promise<void> {
  await signOut(authInstance());
}

export function currentUser(): User | null {
  return authInstance().currentUser;
}
