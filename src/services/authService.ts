import {
  GoogleAuthProvider,
  connectAuthEmulator,
  deleteUser,
  getAuth,
  getRedirectResult,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  onIdTokenChanged,
  reauthenticateWithPopup,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type Auth,
  type AuthCredential,
  type User,
  type UserCredential,
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
      // Anonim oyuncuysa gerçek girişte olduğu gibi hesaba bağlar.
      const a = auth;
      (window as unknown as Record<string, unknown>).__emulatorGoogleSignIn = (name: string) => {
        const cred = GoogleAuthProvider.credential(
          JSON.stringify({ sub: name, email: `${name.replace(/\W/g, '').toLowerCase()}@example.com`, email_verified: true, name }),
        );
        return connectGoogle(() => (a.currentUser?.isAnonymous ? linkWithCredential(a.currentUser, cred) : signInWithCredential(a, cred)))
          .catch((err) => {
            if (err instanceof SwitchedAccount) return err.user;
            throw err;
          })
          .then((user) => ({ user }));
      };
      (window as unknown as Record<string, unknown>).__emulatorUid = () => a.currentUser?.uid ?? null;
    }
  }
  return auth;
}

/**
 * Oturum değişiklikleri. Anonim hesap Google'a bağlanınca kullanıcı kimliği aynı
 * kaldığı için onAuthStateChanged tetiklenmez; kimlik belirteci ise yenilenir.
 */
export function watchAuth(cb: (u: User | null) => void): () => void {
  return onIdTokenChanged(authInstance(), cb);
}

type ResolverHost = { _popupRedirectResolver?: { _initialize?: (auth: Auth) => Promise<unknown> } };

/**
 * Giriş penceresinin tıklamayla hemen açılabilmesi için Firebase'in yardımcı
 * çerçevesini önceden yükler. Firebase bunu yalnızca mobilde ve Safari'de kendisi
 * yapıyor; masaüstü Firefox/Chrome'da yükleme tıklamaya kalınca pencere, tarayıcının
 * tanıdığı kısa süreden sonra açılıyor ve engelleniyor. İç API değişirse sessizce
 * hiçbir şey yapmaz. Google ile girmiş kullanıcı için yüklemez ve false döner.
 */
export async function preparePopup(forSignedIn = false): Promise<boolean> {
  const a = authInstance();
  await a.authStateReady();
  if (!forSignedIn && a.currentUser && !a.currentUser.isAnonymous) return false;
  const resolver = (a as unknown as ResolverHost)._popupRedirectResolver;
  if (resolver?._initialize) await resolver._initialize(a);
  return true;
}

function googleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/**
 * Giriş sayfası sitenin kendi alan adında mı (Vercel'de /__/auth yönlendirmesi)?
 * Öyleyse yönlendirmeli giriş tarayıcının çerez kısıtlarına takılmaz.
 */
export function firstPartyAuthDomain(): boolean {
  return authInstance().config.authDomain === location.host;
}

/** Google hesabı daha önce başka bir oyuncuya bağlıydı: anonim hesap ona bağlanamadı, o hesaba geçildi */
export class SwitchedAccount extends Error {
  constructor(readonly user: User) {
    super('switched-account');
  }
}

/**
 * Anonim hesabı Google'a bağlar (kimlik ve skorlar korunur). Google hesabı zaten
 * kayıtlıysa o hesapla girilir ve SwitchedAccount fırlatılır.
 */
async function connectGoogle(run: () => Promise<UserCredential>): Promise<User> {
  try {
    return (await run()).user;
  } catch (err) {
    const credential = (err as { code?: string }).code === 'auth/credential-already-in-use' ? credentialFrom(err) : null;
    if (!credential) throw err;
    throw new SwitchedAccount((await signInWithCredential(authInstance(), credential)).user);
  }
}

function credentialFrom(err: unknown): AuthCredential | null {
  return GoogleAuthProvider.credentialFromError(err as Parameters<typeof GoogleAuthProvider.credentialFromError>[0]);
}

/** redirect: sayfa Google'a gider ve geri döner (Android uygulaması); yoksa açılır pencere */
export async function googleSignIn(redirect = false): Promise<User | null> {
  const a = authInstance();
  const anon = a.currentUser?.isAnonymous ? a.currentUser : null;
  if (redirect) {
    await (anon ? linkWithRedirect(anon, googleProvider()) : signInWithRedirect(a, googleProvider()));
    return null;
  }
  return connectGoogle(() => (anon ? linkWithPopup(anon, googleProvider()) : signInWithPopup(a, googleProvider())));
}

/** Yönlendirmeli girişten dönünce hatayı yakalamak için */
export async function finishRedirect(): Promise<void> {
  await connectGoogle(async () => {
    const res = await getRedirectResult(authInstance());
    if (!res) throw Object.assign(new Error('no-redirect'), { code: 'no-redirect' });
    return res;
  }).catch((err) => {
    if ((err as { code?: string }).code !== 'no-redirect') throw err;
  });
}

/** Anonim hesabı ve oturumu kapatır (silinemezse oturum kapanır, hesap boş kalır) */
export async function deleteAnonymousUser(): Promise<void> {
  const u = authInstance().currentUser;
  if (!u?.isAnonymous) return;
  await deleteUser(u).catch(() => signOut(authInstance()));
}

/** Firebase hesap silmek için girişin birkaç dakika içinde yapılmış olmasını istiyor */
export function recentlySignedIn(): boolean {
  const at = authInstance().currentUser?.metadata.lastSignInTime;
  return !!at && Date.now() - Date.parse(at) < 4 * 60_000;
}

export async function reauthenticate(): Promise<void> {
  const u = authInstance().currentUser;
  if (u) await reauthenticateWithPopup(u, googleProvider());
}

export async function deleteCurrentUser(): Promise<void> {
  const u = authInstance().currentUser;
  if (u) await deleteUser(u);
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
