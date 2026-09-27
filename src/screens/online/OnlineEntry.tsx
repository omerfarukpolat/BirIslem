import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { GoogleMark, Icon } from '../../components/Icon';
import { Segmented, TopBar, useTitle } from '../../components/ui';
import { formatTimeLimit } from '../../game/format';
import { firebaseEnabled } from '../../services/config';
import { ensureSession, signIn, user } from '../../state/auth';
import { cleanName, NAME_MAX, nickname } from '../../state/profile';
import { readJSON, writeJSON } from '../../lib/storage';
import { needsGoogle, onlineErrorText } from './errors';
import { isValidCode, normalizeCode, ROOM_ROUND_OPTIONS, ROOM_TIME_OPTIONS } from './roomLogic';
import './online.css';

const PREFS_KEY = 'birislem:room-setup';

export default function OnlineEntry() {
  useTitle('Çevrimiçi oda');
  const { route } = useLocation();
  const prefs = readJSON(PREFS_KEY, { rounds: 5, timeLimit: 60 });
  const [name, setName] = useState(nickname.value || user.value?.name.split(' ')[0] || '');
  const [rounds, setRounds] = useState<number>(prefs.rounds);
  const [timeLimit, setTimeLimit] = useState<number>(prefs.timeLimit);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<null | 'create' | 'join'>(null);
  const [error, setError] = useState<{ text: string; google: boolean } | null>(null);

  const checkName = (): string | null => {
    const n = cleanName(name);
    if (!n) {
      setError({ text: 'Önce adını yaz; diğer oyuncular seni böyle görecek.', google: false });
      return null;
    }
    nickname.value = n;
    return n;
  };

  const create = async () => {
    const n = checkName();
    if (!n) return;
    setBusy('create');
    setError(null);
    writeJSON(PREFS_KEY, { rounds, timeLimit });
    try {
      const me = await ensureSession(n);
      const { createRoom } = await import('../../services/rooms');
      const roomCode = await createRoom({ uid: me.uid, name: n }, rounds, timeLimit);
      route(`/oda/${roomCode}`);
    } catch (err) {
      console.warn(err);
      setError({ text: onlineErrorText(err), google: needsGoogle(err) });
      setBusy(null);
    }
  };

  const join = () => {
    const c = normalizeCode(code);
    if (!isValidCode(c)) {
      setError({ text: 'Oda kodu 5 karakterden oluşur, örneğin K7P2Q.', google: false });
      return;
    }
    if (!checkName()) return;
    setBusy('join');
    route(`/oda/${c}?katil=1`);
  };

  if (!firebaseEnabled) {
    return (
      <main class="page">
        <TopBar title="Çevrimiçi oda" />
        <div class="center-note">
          <h2>Şu an kullanılamıyor</h2>
          <p class="muted">Sunucu bağlantısı yapılandırılmamış. Aynı cihazda oynamayı deneyebilirsin.</p>
          <button type="button" class="btn btn--primary" onClick={() => route('/karsilikli')}>
            Aynı cihazda oyna
          </button>
        </div>
      </main>
    );
  }

  return (
    <main class="page">
      <TopBar title="Çevrimiçi oda" />
      <div class="online-entry">
        <p class="setup__lead">
          Arkadaşların kendi telefonlarından odaya katılır. Her turda herkes aynı soruyu aynı anda çözer; en yakın ve en
          hızlı olan kazanır.
        </p>

        <label class="field">
          <span class="field__label">Adın</span>
          <input
            class="input"
            value={name}
            maxLength={NAME_MAX}
            placeholder="Örn. Deniz"
            autocomplete="nickname"
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>

        <section class="online-card">
          <h2>Oda kur</h2>
          <div class="online-card__row">
            <span class="field__label">Tur sayısı</span>
            <Segmented
              label="Tur sayısı"
              value={rounds}
              options={ROOM_ROUND_OPTIONS.map((r) => ({ value: r, label: String(r) }))}
              onChange={setRounds}
            />
          </div>
          <div class="online-card__row">
            <span class="field__label">Her tur için süre</span>
            <Segmented
              label="Süre"
              value={timeLimit}
              options={ROOM_TIME_OPTIONS.map((t) => ({ value: t, label: formatTimeLimit(t) }))}
              onChange={setTimeLimit}
            />
          </div>
          <button type="button" class="btn btn--primary btn--lg btn--block" onClick={create} disabled={busy !== null}>
            {busy === 'create' ? 'Oda kuruluyor…' : 'Oda kur'}
            {busy !== 'create' && <Icon name="arrow" />}
          </button>
        </section>

        <div class="or">
          <span>ya da</span>
        </div>

        <form
          class="online-card"
          onSubmit={(e) => {
            e.preventDefault();
            join();
          }}
        >
          <h2>Koda katıl</h2>
          <div class="join-row">
            <input
              class="input code-input num"
              value={code}
              placeholder="K7P2Q"
              maxLength={7}
              autocapitalize="characters"
              autocomplete="off"
              spellcheck={false}
              aria-label="Oda kodu"
              onInput={(e) => setCode(normalizeCode((e.target as HTMLInputElement).value))}
            />
            <button type="submit" class="btn btn--dark btn--lg" disabled={busy !== null}>
              Katıl
            </button>
          </div>
        </form>

        {error && (
          <div class="online-error" role="alert">
            <p>{error.text}</p>
            {error.google && (
              <button type="button" class="btn btn--sm" onClick={() => signIn().then((ok) => ok && setError(null))}>
                <GoogleMark size={18} />
                Google ile giriş
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
