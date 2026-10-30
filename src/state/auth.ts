import { computed, signal } from '@preact/signals';
import { appShell, IN_APP_UA } from '../lib/platform';
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
/** Oturum durumu ilk kez belli oldu mu (oturum yoksa da) */
export const authReady = signal(!firebaseEnabled);
/** Giriş düğmesine basılabilir mi: Google penceresi tıklamayla hemen açılabilecek durumda */
export const signInReady = signal(!firebaseEnabled);
/**
 * iOS uygulamasında Google girişi yok: Google gömülü tarayıcıda (WKWebView) girişi
 * engelliyor, Apple da Google girişi sunan uygulamadan "Apple ile giriş" istiyor.
 * Oyun, sıralama ve çevrimiçi odalar girişsiz çalışır.
 */
export const googleSignInAvailable = firebaseEnabled && appShell !== 'ios';
/** Google ile giriş yapmış kullanıcı (anonim modda olabilir, bkz. state/player.ts) */
export const user = computed(() => (session.value && !session.value.anonymous ? session.value : null));

let started = false;

type AuthService = typeof import('../services/authService');
/** Yüklendikten sonra modülün kendisi: giriş penceresi beklemeden açılabilsin diye */
let loaded: AuthService | null = null;

const service = (): Promise<AuthService> => import('../services/authService').then((m) => (loaded = m));

const whenIdle = (fn: () => void) => {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2000 });
  else setTimeout(fn, 600);
};

/** Giriş hatasını oyuncuya anlaşılır bir cümleye çevirir; kod destek için sonda kalır. */
function signInErrorText(code: string | undefined): string {
  switch (code) {
    case 'auth/popup-blocked':
      return 'Tarayıcı giriş penceresini engelledi. Düğmeye bir kez daha bas; yine olmazsa bu site için açılır pencerelere izin ver.';
    case 'auth/unauthorized-domain':
      return 'Bu adresten giriş yapılamıyor: alan adı Firebase\'de yetkili değil.';
    case 'auth/network-request-failed':
      return 'Google\'a bağlanılamadı. İnternetini ya da reklam engelleyicini kontrol et.';
    case 'auth/internal-error':
      // Çoğunlukla Google'ın giriş betiği (apis.google.com) engellendiğinde çıkar
      return 'Google giriş penceresi yüklenemedi. Reklam/içerik engelleyici ya da tarayıcının gizlilik ayarı engelliyor olabilir.';
    case 'auth/operation-not-allowed':
      return 'Google ile giriş şu an kapalı.';
    case 'auth/requires-recent-login':
      return 'Güvenlik için yeniden giriş gerekiyor. Çıkış yapıp tekrar giriş yaptıktan sonra hemen yeniden dene.';
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
      .then((m) => {
        // Android uygulaması yönlendirmeli giriş kullanır: dönüşteki hatayı göster
        if (appShell === 'android') m.finishRedirect().catch((err) => err instanceof m.SwitchedAccount || reportSignInError(err));
        return m;
      })
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
  else whenIdle(run);
}

let prep: 'idle' | 'busy' | 'done' = 'idle';

/**
 * Giriş düğmesi görününce çağrılır. Google penceresi tıklamayla aynı anda açılmazsa
 * tarayıcı engelliyor; pencerenin beklediği yükleme burada, boşta kalınca yapılır.
 * Hazırlık uzarsa düğme yine açılır, eksik kalan kısım tıklamada tamamlanır.
 */
export function prepareSignIn(): void {
  if (!googleSignInAvailable || prep !== 'idle') return;
  prep = 'busy';
  signInReady.value = false;
  whenIdle(() => {
    initAuth(true);
    const fallback = setTimeout(() => (signInReady.value = true), 6000);
    service()
      .then((m) => m.preparePopup())
      // Google ile girmiş kullanıcıda düğme kaybolur; çıkış yaparsa yeniden hazırlanır
      .then((warmed) => (prep = warmed ? 'done' : 'idle'))
      .catch((err) => {
        // Ağ ya da içerik engelleyici: tıklamada yeniden denenir, hata orada anlatılır
        console.warn('Google girişi hazırlanamadı', err);
        prep = 'idle';
      })
      .finally(() => {
        clearTimeout(fallback);
        signInReady.value = true;
      });
  });
}

function reportSignInError(err: unknown): void {
  const code = (err as { code?: string }).code;
  if (code === 'auth/cancelled-popup-request') return;
  const suffix = code ? ` (${code.replace('auth/', '')})` : '';
  if (IN_APP_UA.test(navigator.userAgent)) {
    // Pencere ya hiç açılmıyor ya da Google'ın "erişim engellendi" sayfası çıkıyor
    toast(`Uygulama içindeki tarayıcıda Google girişi çalışmıyor. Menüden sayfayı Safari ya da Chrome'da açıp tekrar dene.${suffix}`, 9000);
  } else if (code !== 'auth/popup-closed-by-user') {
    console.warn('Giriş yapılamadı', err);
    toast(`${signInErrorText(code)}${suffix}`, 7000);
  }
}

/**
 * Google ile giriş. Anonim oturum varsa Google hesabına bağlanır (kimlik ve skorlar
 * korunur); Google hesabı daha önce kaydedilmişse o hesaba geçilir: 'switched'.
 */
export async function signIn(): Promise<'ok' | 'switched' | false> {
  if (!googleSignInAvailable) return false;
  initAuth(true);
  try {
    // Açılır pencere tıklamayla aynı anda açılmalı: araya bir bekleme girerse
    // Safari ve Firefox pencereyi engeller. Modül yüklüyse beklemeden çağır.
    const m = loaded ?? (await service());
    // Android uygulamasında (TWA) açılır pencere ayrı bir Chrome sekmesine düşebiliyor;
    // giriş sayfası sitenin kendi alan adındaysa sayfa içi yönlendirme daha sağlam.
    try {
      await m.googleSignIn(appShell === 'android' && m.firstPartyAuthDomain());
    } catch (err) {
      if (err instanceof m.SwitchedAccount) return 'switched';
      throw err;
    }
    return 'ok';
  } catch (err) {
    reportSignInError(err);
    return false;
  }
}

/** Hesap ekranı açılınca: silme onayında kimlik doğrulama penceresi hemen açılabilsin */
export function prepareReauth(): void {
  loaded?.preparePopup(true).catch(() => {});
}

/**
 * Hesabı, bütün skorları ve tercihleri siler (mağazaların istediği hesap silme).
 * Tıklamayla çağrılmalı: Google hesabında gerekirse önce kimlik doğrulama penceresi açılır.
 */
export async function deleteAccount(): Promise<boolean> {
  const u = session.peek();
  const m = loaded ?? (u?.anonymous ? await service() : null);
  if (!m || !u) return false;
  try {
    if (!u.anonymous && !m.recentlySignedIn()) await m.reauthenticate();
    const { deleteUserData } = await import('../services/scores');
    await deleteUserData(u.uid);
    if (u.anonymous) await m.deleteAnonymousUser();
    else await m.deleteCurrentUser();
    toast(u.anonymous ? 'Anonim kaydın ve skorların silindi.' : 'Hesabın ve skorların silindi.', 5000);
    return true;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
      console.warn('Hesap silinemedi', err);
      const text = code?.startsWith('auth/') ? signInErrorText(code) : 'Hesap silinemedi. Bağlantını kontrol edip tekrar dene.';
      toast(`${text}${code ? ` (${code.replace('auth/', '')})` : ''}`, 8000);
    }
    return false;
  }
}

export async function signOut(): Promise<void> {
  const { signOutUser } = await service();
  await signOutUser();
}

/** Çevrimiçi oda ve anonim kayıt için kimlik: giriş yapılmışsa o, yoksa anonim oturum. */
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
    // Odada oyuncunun seçtiği ad görünür (anonim modda Google adı görünmesin)
    name: displayName,
    email: u.email,
    photoURL: u.photoURL,
    anonymous: u.isAnonymous,
  };
}
