import { useEffect, useRef, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../components/Icon';
import { SignInButton } from '../components/SignInButton';
import { googleSignInAvailable, session } from '../state/auth';
import { joinAnonymously, player, scoreTarget } from '../state/player';
import { firebaseEnabled } from '../services/config';
import type { SaveScoreInput } from '../services/scores';

type State = 'idle' | 'checking' | 'saving' | 'saved' | 'error' | 'duplicate';

/**
 * Skoru oyuncu için bir kez kaydeder: Google ile girmişse herkese açık sıralamaya
 * (anonim moddaysa gizli), anonim oyuncuysa yalnızca kendisinin görebileceği yere.
 * Oyun bittikten sonra giriş yapılır ya da anonim kayıt açılırsa o oyunu da kaydeder.
 */
export function SaveStatus({ payload }: { payload: Omit<SaveScoreInput, 'uid' | 'name'> | null }) {
  const [state, setState] = useState<State>('idle');
  const [isPrivate, setPrivate] = useState(false);
  const [joining, setJoining] = useState(false);
  const saved = useRef(false);
  const mounted = useRef(true);
  const s = session.value;
  const p = player.value;
  const { route } = useLocation();

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!payload || !s || saved.current) return;
    let alive = true;
    setState('checking');
    scoreTarget()
      .then(async (target) => {
        // Kayıt başlamadan oturum değiştiyse yeni çalıştırma karar verir
        if (!alive || saved.current) return;
        if (!target) return setState('idle');
        saved.current = true;
        setPrivate(target.private);
        setState('saving');
        const { saveScore } = await import('../services/scores');
        // Kayıt başladıktan sonra oturum bilgisi yenilense de sonuç gösterilir
        await saveScore({ ...payload, uid: target.uid, name: target.name }, { private: target.private })
          .then(() => mounted.current && setState('saved'))
          .catch((err) => {
            console.warn('Skor kaydedilemedi', err);
            const code = (err as { code?: string }).code;
            if (mounted.current) setState(code === 'permission-denied' && payload.mode === 'daily' ? 'duplicate' : 'error');
          });
      })
      .catch((err) => {
        console.warn('Oyuncu bilgisi alınamadı', err);
        if (alive && !saved.current) setState('error');
      });
    return () => {
      alive = false;
    };
  }, [payload, s?.uid, s?.anonymous, p?.uid, p?.anonymous]);

  if (!firebaseEnabled || !payload) return null;

  if (!p && state !== 'saving' && state !== 'saved') {
    if (state === 'checking') return null;
    return (
      <div class="save-note save-note--choice">
        <p>
          <b>Skorun kaydedilsin mi?</b>
          {googleSignInAvailable ? ' Giriş yaparsan sıralamaya adınla girer.' : ''} Anonim kaydedersen skorlarını yalnızca
          sen görürsün, sen de başkalarını görmezsin.
        </p>
        <div class="save-note__actions">
          <SignInButton />
          <button
            type="button"
            class="btn btn--sm"
            disabled={joining}
            onClick={async () => {
              setJoining(true);
              await joinAnonymously();
              setJoining(false);
            }}
          >
            <Icon name="user" size={18} />
            {joining ? 'Açılıyor…' : 'Anonim kaydet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class={`save-note is-${state}`}>
      <p>
        {(state === 'saving' || state === 'checking' || state === 'idle') && 'Skor kaydediliyor…'}
        {state === 'saved' && (
          <>
            <Icon name="check" size={18} /> {isPrivate ? 'Skorun kaydedildi; anonimsin, yalnızca sen görürsün.' : 'Skorun kaydedildi.'}
          </>
        )}
        {state === 'error' && 'Skor kaydedilemedi. Bağlantını kontrol et.'}
        {state === 'duplicate' && 'Bugünün sorusunu zaten kaydettin; sıralamada ilk sonucun geçerli.'}
      </p>
      {state === 'saved' && (
        <button type="button" class="link-btn" onClick={() => route('/leaderboard')}>
          {isPrivate ? 'Skorlarına bak' : 'Sıralamaya bak'}
        </button>
      )}
    </div>
  );
}
