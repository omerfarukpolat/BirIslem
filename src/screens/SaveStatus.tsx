import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../components/Icon';
import { SignInButton } from '../components/SignInButton';
import { user } from '../state/auth';
import { firebaseEnabled } from '../services/config';
import type { SaveScoreInput } from '../services/scores';

type State = 'idle' | 'saving' | 'saved' | 'error' | 'duplicate';

/**
 * Skoru giriş yapmış kullanıcı için bir kez kaydeder. Oyun bittikten sonra giriş
 * yapılırsa o oyunu da kaydeder.
 */
export function SaveStatus({ payload }: { payload: Omit<SaveScoreInput, 'uid' | 'name'> | null }) {
  const [state, setState] = useState<State>('idle');
  const saved = useRef(false);
  const u = user.value;
  const { route } = useLocation();

  useEffect(() => {
    if (!payload || !u || saved.current) return;
    saved.current = true;
    setState('saving');
    import('../services/scores')
      .then(({ saveScore }) => saveScore({ ...payload, uid: u.uid, name: u.name }))
      .then(() => setState('saved'))
      .catch((err) => {
        console.warn('Skor kaydedilemedi', err);
        setState((err as { code?: string }).code === 'permission-denied' && payload.mode === 'daily' ? 'duplicate' : 'error');
      });
  }, [payload, u]);

  if (!firebaseEnabled || !payload) return null;

  if (!u) {
    return (
      <div class="save-note">
        <p>
          <b>Skorun sıralamaya girsin mi?</b> Giriş yaparsan bu oyun da kaydedilir.
        </p>
        <SignInButton />
      </div>
    );
  }

  return (
    <div class={`save-note is-${state}`}>
      <p>
        {state === 'saving' && 'Skor kaydediliyor…'}
        {state === 'saved' && (
          <>
            <Icon name="check" size={18} /> Skorun kaydedildi.
          </>
        )}
        {state === 'error' && 'Skor kaydedilemedi. Bağlantını kontrol et.'}
        {state === 'duplicate' && 'Bugünün sorusunu zaten kaydettin; sıralamada ilk sonucun geçerli.'}
      </p>
      {state === 'saved' && (
        <button type="button" class="link-btn" onClick={() => route('/leaderboard')}>
          Sıralamaya bak
        </button>
      )}
    </div>
  );
}
