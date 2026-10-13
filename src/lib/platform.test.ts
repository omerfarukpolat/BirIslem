import { describe, expect, it } from 'vitest';
import { detectShell, type ShellInput } from './platform';

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const WKWEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const IPAD_APP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const INSTAGRAM = `${WKWEBVIEW} Instagram 350.0.0.0 (iPhone15,2; iOS 18_0; tr_TR)`;
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const MAC_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

const base: ShellInput = { search: '', saved: null, referrer: '', ua: CHROME_ANDROID, standalone: false, maxTouchPoints: 5 };
const shell = (o: Partial<ShellInput>) => detectShell({ ...base, ...o });

describe('app shell detection', () => {
  it('uses the start URL marker and remembers it', () => {
    expect(shell({ search: '?app=ios' })).toBe('ios');
    expect(shell({ search: '?app=android' })).toBe('android');
    expect(shell({ saved: 'android' })).toBe('android');
    expect(shell({ search: '?app=nope' })).toBe(null);
  });

  it('recognises a Trusted Web Activity by its referrer', () => {
    expect(shell({ referrer: 'android-app://app.birislem.twa/' })).toBe('android');
  });

  it('treats an iOS web view without Safari as the app shell', () => {
    expect(shell({ ua: WKWEBVIEW })).toBe('ios');
    expect(shell({ ua: IPAD_APP, maxTouchPoints: 5 })).toBe('ios');
  });

  it('leaves browsers, home screen web apps and other apps alone', () => {
    expect(shell({ ua: SAFARI })).toBe(null);
    expect(shell({ ua: WKWEBVIEW, standalone: true })).toBe(null);
    expect(shell({ ua: INSTAGRAM })).toBe(null);
    expect(shell({ ua: MAC_SAFARI, maxTouchPoints: 0 })).toBe(null);
    expect(shell({ ua: IPAD_APP, maxTouchPoints: 0 })).toBe(null);
    expect(shell({ ua: CHROME_ANDROID })).toBe(null);
  });
});
