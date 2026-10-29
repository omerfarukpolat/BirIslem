import { useEffect, useMemo, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../components/Icon';
import { PrivacyChoice } from '../components/PrivacyChoice';
import { SignInButton } from '../components/SignInButton';
import { Segmented, TopBar, useTitle } from '../components/ui';
import { dailyKey, dailyNumber } from '../game/daily';
import { formatSeconds } from '../game/format';
import { LEADERBOARD_BEST_OF } from '../game/scoring';
import { firebaseEnabled } from '../services/config';
import {
  fetchDaily,
  fetchLeaderboard,
  fetchOwnBoard,
  fetchUserStats,
  type DailyEntry,
  type OwnBoard,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type UserStats,
} from '../services/scores';
import { authReady, googleSignInAvailable, initAuth, session } from '../state/auth';
import { joinAnonymously, loadProfile, player } from '../state/player';
import './leaderboard.css';

type Tab = 'soru' | LeaderboardPeriod;
type SortKey = 'bestOfScore' | 'totalScore' | 'averageScore' | 'bestScore' | 'gamesPlayed';

const TABS: { value: Tab; label: string }[] = [
  { value: 'soru', label: 'Günün sorusu' },
  { value: 'daily', label: 'Bugün' },
  { value: 'weekly', label: 'Bu hafta' },
  { value: 'monthly', label: 'Bu ay' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'bestOfScore', label: `En iyi ${LEADERBOARD_BEST_OF}` },
  { value: 'totalScore', label: 'Toplam' },
  { value: 'averageScore', label: 'Ortalama' },
  { value: 'bestScore', label: 'Rekor' },
  { value: 'gamesPlayed', label: 'Oyun' },
];

const SORT_NOTE: Partial<Record<SortKey, string>> = {
  bestOfScore: `Dönemdeki en iyi ${LEADERBOARD_BEST_OF} oyununun toplamı: çok oynamak değil iyi oynamak öne geçirir.`,
  bestScore: 'Dönemdeki en yüksek tek oyun puanı.',
};

type Load<T> = { state: 'loading' } | { state: 'error' } | { state: 'ok'; data: T };

type View = { kind: 'public' } | { kind: 'private'; uid: string; google: boolean } | { kind: 'ask' } | { kind: 'error' };

export default function Leaderboard() {
  useTitle('Sıralama');
  const { query, route } = useLocation();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.value === query.tab) ? (query.tab as Tab) : 'daily');
  const [sort, setSort] = useState<SortKey>('bestOfScore');
  const [reload, setReload] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const [board, setBoard] = useState<Load<LeaderboardEntry[]>>({ state: 'loading' });
  const [daily, setDaily] = useState<Load<DailyEntry[]>>({ state: 'loading' });
  const [own, setOwn] = useState<Load<OwnBoard>>({ state: 'loading' });
  const [mine, setMine] = useState<UserStats | null>(null);
  const [joining, setJoining] = useState(false);
  const ready = authReady.value;
  const s = session.value;
  const p = player.value;
  const today = dailyKey();

  useEffect(() => initAuth(true), []);

  // Anonim oyuncu herkese açık sıralamayı hiç yüklemez: önce oturum ve tercih belli olmalı
  useEffect(() => {
    if (!firebaseEnabled || !ready) return;
    if (!s) return setView({ kind: 'public' });
    let alive = true;
    setView(null);
    loadProfile(s.uid, !s.anonymous)
      .then((privacy) => {
        if (!alive) return;
        if (privacy === 'anonymous') setView({ kind: 'private', uid: s.uid, google: !s.anonymous });
        // Görünürlüğünü seçmemiş oyuncuya önce sorulur; seçene kadar sıralama yüklenmez
        else if (privacy === 'unknown' && !s.anonymous) setView({ kind: 'ask' });
        else setView({ kind: 'public' });
      })
      .catch(() => alive && setView({ kind: 'error' }));
    return () => {
      alive = false;
    };
  }, [ready, s?.uid, s?.anonymous, p?.privacy, reload]);

  useEffect(() => {
    if (view?.kind !== 'public') return;
    let alive = true;
    if (tab === 'soru') {
      setDaily({ state: 'loading' });
      fetchDaily(today)
        .then((data) => alive && setDaily({ state: 'ok', data }))
        .catch(() => alive && setDaily({ state: 'error' }));
    } else {
      setBoard({ state: 'loading' });
      fetchLeaderboard(tab)
        .then((data) => alive && setBoard({ state: 'ok', data }))
        .catch(() => alive && setBoard({ state: 'error' }));
    }
    return () => {
      alive = false;
    };
  }, [view, tab, reload]);

  useEffect(() => {
    if (view?.kind !== 'private') return;
    let alive = true;
    setOwn({ state: 'loading' });
    fetchOwnBoard(view.uid)
      .then((data) => alive && setOwn({ state: 'ok', data }))
      .catch(() => alive && setOwn({ state: 'error' }));
    return () => {
      alive = false;
    };
  }, [view, reload]);

  useEffect(() => {
    if (view?.kind === 'private') return setMine(own.state === 'ok' ? own.data.stats : null);
    if (view?.kind !== 'public' || !p?.google) return setMine(null);
    fetchUserStats(p.uid, { private: false })
      .then(setMine)
      .catch(() => setMine(null));
  }, [view, own, p?.uid]);

  const privateView = view?.kind === 'private';
  // Anonim oyuncu yalnızca kendi kayıtlarını görür
  const boardShown: Load<LeaderboardEntry[]> = privateView
    ? own.state === 'ok'
      ? { state: 'ok', data: own.data.period(tab === 'soru' ? 'daily' : tab) }
      : own
    : view?.kind === 'error'
      ? { state: 'error' }
      : view
        ? board
        : { state: 'loading' };
  const dailyShown: Load<DailyEntry[]> = privateView
    ? own.state === 'ok'
      ? { state: 'ok', data: own.data.daily(today) }
      : own
    : view?.kind === 'error'
      ? { state: 'error' }
      : view
        ? daily
        : { state: 'loading' };

  const sorted = useMemo(
    () =>
      boardShown.state === 'ok' ? boardShown.data.slice().sort((a, b) => b[sort] - a[sort] || b.averageScore - a.averageScore) : [],
    [boardShown, sort],
  );

  if (!firebaseEnabled) {
    return (
      <main class="page">
        <TopBar title="Sıralama" />
        <div class="center-note">
          <h2>Sıralama şu an kapalı</h2>
          <p class="muted">Sunucu bağlantısı yapılandırılmamış.</p>
        </div>
      </main>
    );
  }

  const retry = () => setReload((n) => n + 1);

  return (
    <main class="page">
      <TopBar title="Sıralama" />
      <div class="lb-tabs">
        <Segmented label="Dönem" value={tab} options={TABS} onChange={setTab} />
      </div>

      {privateView && (
        <p class="lb-anon" role="note">
          <Icon name="user" size={18} />
          <span>
            <b>Anonim moddasın.</b> Sıralamada yalnızca kendini görürsün, başkaları da seni görmez.
            {view.kind === 'private' && view.google ? ' Ana sayfada Hesap\'tan anonim modu kapatabilirsin.' : ''}
          </span>
        </p>
      )}

      {view?.kind === 'ask' ? (
        <div class="save-note save-note--choice">
          <p>
            <b>Sıralamada nasıl görünmek istersin?</b> Seçince sıralama açılır; istediğin zaman Hesap'tan
            değiştirebilirsin.
          </p>
          <PrivacyChoice />
        </div>
      ) : tab === 'soru' ? (
        <>
          <p class="lb-caption muted">
            #{dailyNumber(today)} · {privateView ? 'bugünkü sonucun' : 'herkes aynı soruyu, tek hakla çözdü'}
          </p>
          {dailyShown.state === 'loading' && <Skeleton />}
          {dailyShown.state === 'error' && <LoadError onRetry={retry} />}
          {dailyShown.state === 'ok' &&
            (dailyShown.data.length === 0 ? (
              <Empty
                text={privateView ? 'Bugünün sorusunu henüz çözmedin.' : 'Bugünün sorusunu henüz kimse kaydetmedi.'}
                cta="Soruyu çöz"
                onCta={() => route('/gunun-sorusu')}
              />
            ) : (
              <ol class="lb-list">
                {dailyShown.data.slice(0, 100).map((e, i) => (
                  <Row
                    key={e.userId}
                    rank={i + 1}
                    name={e.userName}
                    me={e.userId === p?.uid}
                    detail={`${e.diff === 0 ? 'Tam isabet' : e.diff === null ? 'Sonuç yok' : `${e.diff} fark`} · ${formatSeconds(e.timeUsedMs)}`}
                    value={e.score}
                  />
                ))}
              </ol>
            ))}
        </>
      ) : (
        <>
          <div class="lb-sort">
            <span class="eyebrow">Sırala</span>
            <Segmented label="Sıralama ölçütü" value={sort} options={SORTS} onChange={setSort} />
            {SORT_NOTE[sort] && <p class="lb-sort__note muted">{SORT_NOTE[sort]}</p>}
          </div>
          {boardShown.state === 'loading' && <Skeleton />}
          {boardShown.state === 'error' && <LoadError onRetry={retry} />}
          {boardShown.state === 'ok' &&
            (sorted.length === 0 ? (
              <Empty
                text={privateView ? 'Bu dönemde kayıtlı skorun yok.' : 'Bu dönemde henüz skor yok. İlk sen ol!'}
                cta="Oyna"
                onCta={() => route('/game')}
              />
            ) : (
              <ol class="lb-list">
                {sorted.slice(0, 100).map((e, i) => (
                  <Row
                    key={e.userId}
                    rank={i + 1}
                    name={e.userName}
                    me={e.userId === p?.uid}
                    detail={`${e.gamesPlayed} oyun · ort. ${e.averageScore} · ${e.exact} tam`}
                    value={e[sort]}
                  />
                ))}
              </ol>
            ))}
        </>
      )}

      {p && mine && mine.games > 0 && (
        <section class="lb-mine">
          <h2>Senin istatistiklerin</h2>
          <dl>
            <div>
              <dt>Oyun</dt>
              <dd class="num">{mine.games}</dd>
            </div>
            <div>
              <dt>Toplam</dt>
              <dd class="num">{mine.total}</dd>
            </div>
            <div>
              <dt>Ortalama</dt>
              <dd class="num">{mine.average}</dd>
            </div>
            <div>
              <dt>Rekor</dt>
              <dd class="num">{mine.best}</dd>
            </div>
          </dl>
        </section>
      )}

      {view && !p && (
        <div class="save-note save-note--choice">
          <p>
            {googleSignInAvailable ? 'Sıralamada yer almak için giriş yap. ' : ''}Anonim kaydedersen skorlarını yalnızca sen
            görürsün, sen de başkalarını görmezsin.
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
              {joining ? 'Açılıyor…' : 'Anonim devam et'}
            </button>
          </div>
        </div>
      )}
      <p class="lb-foot muted">Yalnızca yeni puanlama sistemiyle oynanan oyunlar listelenir.</p>
    </main>
  );
}

function Row({ rank, name, detail, value, me }: { rank: number; name: string; detail: string; value: number; me: boolean }) {
  return (
    <li class={`lb-row${me ? ' is-me' : ''}${rank <= 3 ? ` is-top is-top${rank}` : ''}`}>
      <span class="lb-rank num">{rank}</span>
      <span class="lb-who">
        <span class="lb-name">
          {name}
          {me && <span class="lb-you">sen</span>}
        </span>
        <span class="lb-detail">{detail}</span>
      </span>
      <span class="lb-value num">{value}</span>
    </li>
  );
}

function Skeleton() {
  return (
    <ol class="lb-list is-loading" aria-busy="true" aria-label="Yükleniyor">
      {[0, 1, 2, 3, 4].map((i) => (
        <li class="lb-row" key={i}>
          <span class="lb-rank num">{i + 1}</span>
          <span class="lb-who">
            <span class="lb-bar" style={{ width: `${60 - i * 7}%` }} />
            <span class="lb-bar is-thin" style={{ width: `${40 - i * 4}%` }} />
          </span>
          <span class="lb-bar" style={{ width: 40 }} />
        </li>
      ))}
    </ol>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div class="center-note">
      <p>Sıralama yüklenemedi.</p>
      <button type="button" class="btn" onClick={onRetry}>
        <Icon name="reset" />
        Tekrar dene
      </button>
    </div>
  );
}

function Empty({ text, cta, onCta }: { text: string; cta: string; onCta: () => void }) {
  return (
    <div class="center-note">
      <p>{text}</p>
      <button type="button" class="btn btn--primary" onClick={onCta}>
        {cta}
        <Icon name="arrow" />
      </button>
    </div>
  );
}
