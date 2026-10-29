import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { googleSignInAvailable, prepareSignIn, signInReady } from '../state/auth';
import { signInWithGoogle } from '../state/player';
import { GoogleMark } from './Icon';

/**
 * Google ile giriş düğmesi. Görününce giriş penceresini hazırlatır ve hazırlık
 * bitene kadar pasif kalır: pencere tıklamayla hemen açılmazsa tarayıcı engelliyor.
 */
export function SignInButton({
  class: cls = 'btn btn--sm',
  label = 'Google ile giriş',
  ariaLabel,
  onSignedIn,
}: {
  class?: string;
  label?: ComponentChildren;
  ariaLabel?: string;
  onSignedIn?: () => void;
}) {
  useEffect(prepareSignIn, []);
  const ready = signInReady.value;
  if (!googleSignInAvailable) return null;
  return (
    <button
      type="button"
      class={cls}
      disabled={!ready}
      aria-busy={!ready}
      aria-label={ariaLabel}
      onClick={() => signInWithGoogle().then((ok) => ok && onSignedIn?.())}
    >
      <GoogleMark size={18} />
      {label}
    </button>
  );
}
