import { useEffect, useMemo, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { Icon } from '../components/Icon';
import { SignInButton } from '../components/SignInButton';
import { Segmented, TopBar, useTitle } from '../components/ui';
import { dailyKey, dailyNumber } from '../game/daily';
import { formatSeconds } from '../game/format';
import { firebaseEnabled } from '../services/config';
import {
  fetchDaily,
  fetchLeaderboard,
  fetchUserStats,
  type DailyEntry,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type UserStats,
} from '../services/scores';
import { user } from '../state/auth';
import './leaderboard.css';

type Tab = 'soru' | LeaderboardPeriod;
type SortKey = 'totalScore' | 'bestScore' | 'averageScore' | 'gamesPlayed';

const TABS: { value: Tab; label: string }[] = [
  { value: 'soru', label: 'Günün sorusu' },
  { value: 'daily', label: 'Bugün' },
  { value: 'weekly', label: 'Bu hafta' },
  { value: 'monthly', label: 'Bu ay' },
];

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'totalScore', label: 'Toplam' },
  { value: 'bestScore', label: 'En iyi' },
  { value: 'averageScore', label: 'Ortalama' },
  { value: 'gamesPlayed', label: 'Oyun' },
];

type Load<T> = { state: 'loading' } | { state: 'error' } | { state: 'ok'; data: T };

export default function Leaderboard() {
  useTitle('Sıralama');
  const { query, route } = useLocation();
  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.value === query.tab) ? (query.tab as Tab) : 'daily');
  const [sort, setSort] = useState<SortKey>('totalScore');
  const [reload, setReload] = useState(0);
  const [board, setBoard] = useState<Load<LeaderboardEntry[]>>({ state: 'loading' });
  const [daily, setDaily] = useState<Load<DailyEntry[]>>({ state: 'loading' });
  const [mine, setMine] = useState<UserStats | null>(null);
  const u = user.value;
  const today = dailyKey();

  useEffect(() => {
    if (!firebaseEnabled) return;
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
  }, [tab, reload]);

  useEffect(() => {
    if (!u) return setMine(null);
    fetchUserStats(u.uid)
      .then(setMine)
      .catch(() => setMine(null));
  }, [u?.uid]);

  const sorted = useMemo(
    () => (board.state === 'ok' ? board.data.slice().sort((a, b) => b[sort] - a[sort] || b.totalScore - a.totalScore) : []),
    [board, sort],
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

      {tab === 'soru' ? (
        <>
          <p class="lb-caption muted">
            #{dailyNumber(today)} · herkes aynı soruyu, tek hakla çözdü
          </p>
          {daily.state === 'loading' && <Skeleton />}
          {daily.state === 'error' && <LoadError onRetry={retry} />}
          {daily.state === 'ok' &&
            (daily.data.length === 0 ? (
              <Empty text="Bugünün sorusunu henüz kimse kaydetmedi." cta="Soruyu çöz" onCta={() => route('/gunun-sorusu')} />
            ) : (
              <ol class="lb-list">
                {daily.data.slice(0, 100).map((e, i) => (
                  <Row
                    key={e.userId}
                    rank={i + 1}
                    name={e.userName}
                    me={e.userId === u?.uid}
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
          </div>
          {board.state === 'loading' && <Skeleton />}
          {board.state === 'error' && <LoadError onRetry={retry} />}
          {board.state === 'ok' &&
            (sorted.length === 0 ? (
              <Empty text="Bu dönemde henüz skor yok. İlk sen ol!" cta="Oyna" onCta={() => route('/game')} />
            ) : (
              <ol class="lb-list">
                {sorted.slice(0, 100).map((e, i) => (
                  <Row
                    key={e.userId}
                    rank={i + 1}
                    name={e.userName}
                    me={e.userId === u?.uid}
                    detail={`${e.gamesPlayed} oyun · ort. ${e.averageScore} · ${e.exact} tam`}
                    value={e[sort]}
                  />
                ))}
              </ol>
            ))}
        </>
      )}

      {u && mine && mine.games > 0 && (
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
              <dt>En iyi</dt>
              <dd class="num">{mine.best}</dd>
            </div>
          </dl>
        </section>
      )}

      {!u && (
        <div class="save-note">
          <p>Sıralamada yer almak için giriş yap.</p>
          <SignInButton />
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
