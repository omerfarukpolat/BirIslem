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
