import { readJSON, writeJSON } from './storage';

/**
 * Mağaza paketi: Android'de Trusted Web Activity (Chrome), iOS'ta WKWebView kabuğu.
 * Paketler başlangıç adresine ?app=android / ?app=ios ekler; değer cihazda saklanır.
 */
export type AppShell = 'ios' | 'android' | null;

/** Instagram, Facebook, TikTok… içindeki tarayıcılar ve Android WebView */
export const IN_APP_UA = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Snapchat|BytedanceWebview|musical_ly|TikTok|\bLine\/|; wv\)/i;

const KEY = 'birislem:app';

export interface ShellInput {
  search: string;
  saved: unknown;
  referrer: string;
  ua: string;
  /** iOS'ta ana ekrana eklenmiş web uygulaması (Safari) */
  standalone: boolean;
  maxTouchPoints: number;
}

export function detectShell(i: ShellInput): AppShell {
  const param = new URLSearchParams(i.search).get('app');
  if (param === 'ios' || param === 'android') return param;
  if (i.saved === 'ios' || i.saved === 'android') return i.saved;
  // Trusted Web Activity ilk sayfayı uygulamanın yönlendiricisiyle açar
  if (i.referrer.startsWith('android-app://')) return 'android';
  // iOS'ta Safari belirteci olmayan, ana ekran uygulaması da olmayan gömülü tarayıcı:
  // bir uygulamanın WKWebView'i. iPad masaüstü kimliğiyle (Macintosh) görünür.
  const apple = /iPhone|iPad|iPod/.test(i.ua) || (/Macintosh/.test(i.ua) && i.maxTouchPoints > 1);
  if (apple && !/Safari\//.test(i.ua) && !i.standalone && !IN_APP_UA.test(i.ua)) return 'ios';
  return null;
}

function currentShell(): AppShell {
  if (typeof window === 'undefined') return null;
  const shell = detectShell({
    search: location.search,
    saved: readJSON<unknown>(KEY, null),
    referrer: document.referrer,
    ua: navigator.userAgent,
    standalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  });
  if (shell) writeJSON(KEY, shell);
  // ?app=… paylaşılan bağlantılara taşınmasın
  const url = new URL(location.href);
  if (url.searchParams.has('app')) {
    url.searchParams.delete('app');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
  return shell;
}

export const appShell: AppShell = currentShell();
