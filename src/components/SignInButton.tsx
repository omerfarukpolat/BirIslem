import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { prepareSignIn, signIn, signInReady } from '../state/auth';
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
  return (
    <button
      type="button"
      class={cls}
      disabled={!ready}
      aria-busy={!ready}
      aria-label={ariaLabel}
      onClick={() => signIn().then((ok) => ok && onSignedIn?.())}
    >
      <GoogleMark size={18} />
      {label}
    </button>
  );
}
