import { useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { GoogleMark, Icon, LogoMark } from '../components/Icon';
import { AccountSheet, Avatar, HowToSheet, SettingsSheet } from '../components/sheets';
import { useTitle } from '../components/ui';
import { dailyKey, dailyNumber } from '../game/daily';
import { formatTimeLimit } from '../game/format';
import { authReady, signIn, user } from '../state/auth';
import { firebaseEnabled } from '../services/config';
import { settings } from '../state/settings';
import { currentStreak, stats } from '../state/stats';
import './home.css';

export default function Home() {
  useTitle('');
  const { route } = useLocation();
  const [sheet, setSheet] = useState<null | 'settings' | 'howto' | 'account'>(null);
  const close = () => setSheet(null);

  const today = dailyKey();
  const todayRecord = stats.value.daily[today];
  const streak = currentStreak(today);
  const s = settings.value;
  const st = stats.value;
  const u = user.value;

  return (
    <main class="page home">
      <header class="home__bar">
        <a class="brand" href="/" aria-label="Bir İşlem ana sayfa">
          <LogoMark size={34} />
          <span>Bir İşlem</span>
        </a>
        <div class="home__bar-right">
          <button type="button" class="icon-btn" aria-label="Ayarlar" onClick={() => setSheet('settings')}>
            <Icon name="sliders" />
          </button>
          {firebaseEnabled &&
            (u ? (
              <button type="button" class="avatar-btn" aria-label="Hesap" onClick={() => setSheet('account')}>
                <Avatar name={u.name} photo={u.photoURL} size={36} />
              </button>
            ) : (
              <button
                type="button"
                class="btn btn--sm signin"
                onClick={() => signIn()}
                disabled={!authReady.value}
                aria-label="Google ile giriş yap"
              >
                <GoogleMark size={18} />
                <span>Giriş</span>
              </button>
            ))}
        </div>
      </header>

      <section class="hero">
        <h1>
          Altı sayı,
          <br />
          dört işlem,
          <br />
          <em>tek hedef.</em>
        </h1>
        <p class="muted">
          Verilen sayılarla toplama, çıkarma, çarpma ve bölme yaparak üç basamaklı hedefe ulaş. Tam bulamazsan en
          yakını da puan getirir.
        </p>
      </section>

      <nav class="modes" aria-label="Oyun modları">
        {/* <a> tıklamalarını preact-iso yönlendirir */}
        <a class="mode mode--solo" href="/game">
          <span class="mode__badge num">1</span>
          <span class="mode__text">
            <span class="mode__title">Tek başına</span>
            <span class="mode__desc">
              Rastgele soru · {formatTimeLimit(s.timeLimit)}
              {s.operationLimit ? ` · ${s.operationLimit} işlem hakkı` : ''}
            </span>
          </span>
          <Icon name="arrow" class="mode__arrow" />
        </a>

        <a class="mode mode--daily" href="/gunun-sorusu">
          <span class="mode__badge num">{Number(today.slice(8))}</span>
          <span class="mode__text">
            <span class="mode__title">Günün sorusu</span>
            <span class="mode__desc">
              {todayRecord
                ? `Bugün çözdün: ${todayRecord.score} puan`
                : `#${dailyNumber(today)} · herkese aynı soru, tek hak`}
              {streak > 1 && <span class="mode__streak"> · {streak} gündür seri</span>}
            </span>
          </span>
          <Icon name="arrow" class="mode__arrow" />
        </a>

        <div class="mode mode--versus">
          <span class="mode__badge num">2+</span>
          <span class="mode__text">
            <span class="mode__title">Karşılıklı</span>
            <span class="mode__desc">Herkese aynı soru. En yakın ve en hızlı kazanır.</span>
          </span>
          <div class="mode__split">
            <button type="button" class="btn btn--sm" onClick={() => route('/karsilikli')}>
              <Icon name="phone" size={18} />
              Aynı cihazda
            </button>
            <button
              type="button"
              class="btn btn--sm"
              onClick={() => route('/oda')}
              disabled={!firebaseEnabled}
              title={firebaseEnabled ? undefined : 'Çevrimiçi oyun şu an kullanılamıyor'}
            >
              <Icon name="globe" size={18} />
              Çevrimiçi oda
            </button>
          </div>
        </div>
      </nav>

      <div class="home__links">
        <button type="button" class="chip" onClick={() => route('/leaderboard')}>
          <Icon name="trophy" size={18} />
          Sıralama
        </button>
        <button type="button" class="chip" onClick={() => setSheet('howto')}>
          <Icon name="help" size={18} />
          Nasıl oynanır?
        </button>
      </div>

      {st.played > 0 && (
        <dl class="mystats" aria-label="Bu cihazdaki istatistiklerin">
          <div>
            <dt>Oyun</dt>
            <dd class="num">{st.played}</dd>
          </div>
          <div>
            <dt>Tam isabet</dt>
            <dd class="num">{st.exact}</dd>
          </div>
          <div>
            <dt>En iyi</dt>
            <dd class="num">{st.best}</dd>
          </div>
          <div>
            <dt>Ortalama</dt>
            <dd class="num">{Math.round(st.total / st.played)}</dd>
          </div>
        </dl>
      )}

      <SettingsSheet open={sheet === 'settings'} onClose={close} />
      <HowToSheet open={sheet === 'howto'} onClose={close} />
      <AccountSheet open={sheet === 'account'} onClose={close} />
    </main>
  );
}
