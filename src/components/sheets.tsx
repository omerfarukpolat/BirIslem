import { useEffect, useState } from 'preact/hooks';
import { formatTimeLimit } from '../game/format';
import { BANDS, LEADERBOARD_BEST_OF, MAX_SCORE, PLACE_BONUS, SPEED_FULL_MS, SPEED_ZERO_MS } from '../game/scoring';
import { deleteAccount, googleSignInAvailable, prepareReauth, session, signOut } from '../state/auth';
import { player, setAnonymousMode } from '../state/player';
import { OP_LIMIT_OPTIONS, TIME_OPTIONS, settings, soundOn, theme, type GameSettings, type Theme } from '../state/settings';
import { Icon } from './Icon';
import { SignInButton } from './SignInButton';
import { Segmented, Sheet } from './ui';
import './sheets.css';

export function SettingsSheet({
  open,
  onClose,
  onGameSettingsChange,
  showGameSettings = true,
}: {
  open: boolean;
  onClose: () => void;
  /** Oyun sırasında değişirse yeni soru başlatmak için */
  onGameSettingsChange?: (s: GameSettings) => void;
  showGameSettings?: boolean;
}) {
  const s = settings.value;
  const update = (patch: Partial<GameSettings>) => {
    const next = { ...s, ...patch };
    settings.value = next;
    onGameSettingsChange?.(next);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Ayarlar">
      {showGameSettings && (
        <>
          <div class="setting">
            <div class="setting__head">
              <h3>Süre</h3>
              <span class="muted">Tek başına modda her soru için</span>
            </div>
            <Segmented
              label="Süre"
              value={s.timeLimit}
              options={TIME_OPTIONS.map((t) => ({ value: t, label: formatTimeLimit(t) }))}
              onChange={(timeLimit) => update({ timeLimit })}
            />
          </div>
          <div class="setting">
            <div class="setting__head">
              <h3>İşlem hakkı</h3>
              <span class="muted">Az işlemle hedefe ulaşmak daha zor</span>
            </div>
            <Segmented
              label="İşlem hakkı"
              value={s.operationLimit}
              options={OP_LIMIT_OPTIONS.map((n) => ({ value: n, label: n === 0 ? 'Sınırsız' : String(n) }))}
              onChange={(operationLimit) => update({ operationLimit })}
            />
          </div>
          {onGameSettingsChange && <p class="setting__note">Süreyi ya da işlem hakkını değiştirince yeni bir soru başlar.</p>}
          <hr class="hr" />
        </>
      )}
      <div class="setting setting--row">
        <h3>Ses</h3>
        <Segmented
          label="Ses"
          value={soundOn.value ? 'on' : 'off'}
          options={[
            { value: 'on', label: 'Açık' },
            { value: 'off', label: 'Kapalı' },
          ]}
          onChange={(v) => (soundOn.value = v === 'on')}
        />
      </div>
      <div class="setting setting--row">
        <h3>Görünüm</h3>
        <Segmented<Theme>
          label="Görünüm"
          value={theme.value}
          options={[
            { value: 'system', label: 'Sistem' },
            { value: 'light', label: 'Açık' },
            { value: 'dark', label: 'Koyu' },
          ]}
          onChange={(v) => (theme.value = v)}
        />
      </div>
    </Sheet>
  );
}

export function HowToSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Nasıl oynanır?">
      <ol class="howto">
        <li>
          <b>Altı sayın var:</b> beş farklı rakam (1–9) ve bir iki basamaklı sayı (10–99). Hedef 100 ile 999 arasında.
        </li>
        <li>
          <b>İki sayı seç, arasına bir işlem koy:</b> sonuç yeni bir sayı olarak tahtaya gelir ve kendiliğinden seçili
          olur, istersen hemen bir sonraki işlemi yaparsın.
        </li>
        <li>
          <b>Her sayı bir kez kullanılır.</b> Çıkarmada sonuç eksi, bölmede küsuratlı olamaz; uymayan sayılar soluk görünür.
        </li>
        <li>
          <b>En yakın sonucun otomatik kaydedilir.</b> Geri alsan ya da baştan başlasan da kaybolmaz. Hedefi tam bulursan
          tur hemen biter.
        </li>
      </ol>

      <div class="rules-table">
        <h3>Puanlama</h3>
        <p class="muted">
          Puan iki parçadır: <b>yakınlık</b> ve <b>hız</b>. En fazla {MAX_SCORE} puan.
        </p>
        <table class="table">
          <thead>
            <tr>
              <th>Fark</th>
              <th class="r">Yakınlık</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((b, i) => {
              const from = i === 0 ? 0 : BANDS[i - 1].upTo + 1;
              return (
                <tr key={b.upTo}>
                  <td>{b.upTo === 0 ? 'Tam isabet' : from === b.upTo ? `${b.upTo}` : `${from}–${b.upTo}`}</td>
                  <td class="r num">{b.points}</td>
                </tr>
              );
            })}
            <tr>
              <td>{BANDS[BANDS.length - 1].upTo + 1} ve üstü</td>
              <td class="r num">0</td>
            </tr>
          </tbody>
        </table>
        <p class="muted">
          <b>Hız bonusu:</b> en yakın sonucuna ilk {SPEED_FULL_MS / 1000} saniyede ulaşırsan yakınlık puanının %25'i
          eklenir; bonus {SPEED_ZERO_MS / 60_000}. dakikanın sonunda sıfıra iner. Süre ayarı bonusu değiştirmez. Yavaş
          ama tam sonuç, hızlı ama uzak bir sonucu her zaman geçer.
        </p>
        <p class="muted">
          Bazı sorularda hedef tam olarak bulunamaz. O zaman fark, <b>bulunabilecek en iyi sonuca</b> göre hesaplanır; en
          iyisini bulan tam puan alır. İşlem hakkı seçtiysen de en iyi sonuç sınırsız işlemle hesaplanır: işlem hakkı
          kendine koyduğun bir zorluktur.
        </p>
        <p class="muted">
          <b>Sıralama:</b> her oyuncunun dönemdeki en iyi {LEADERBOARD_BEST_OF} oyununun toplamı.
        </p>
      </div>

      <div class="rules-table">
        <h3>Karşılıklı</h3>
        <p class="muted">
          Herkes aynı soruyu çözer. Yakınlık puanına hız bonusu yerine <b>tur sırası bonusu</b> eklenir: daha yakın olan,
          eşitse daha hızlı olan öne geçer. 1. +{PLACE_BONUS[0]}, 2. +{PLACE_BONUS[1]}, 3. +{PLACE_BONUS[2]}, diğerleri +
          {PLACE_BONUS[3]} (yakınlık puanı alanlar). Turların toplamı kazananı belirler; eşitlikte daha çok tur kazanan öne
          geçer.
        </p>
      </div>

      <div class="rules-table keys">
        <h3>Klavye</h3>
        <p class="muted">
          <kbd>1</kbd>–<kbd>6</kbd> sayılar · <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> işlemler ·{' '}
          <kbd>⌫</kbd> geri al · <kbd>Esc</kbd> seçimi bırak · <kbd>Enter</kbd> bitir
        </p>
      </div>
    </Sheet>
  );
}

const PRIVACY: { value: 'visible' | 'anonymous'; label: string }[] = [
  { value: 'visible', label: 'Görünür' },
  { value: 'anonymous', label: 'Anonim' },
];

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = player.value;
  const s = session.value;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (open && p?.google) prepareReauth();
    if (!open) setConfirming(false);
  }, [open, p?.google]);

  return (
    <Sheet open={open} onClose={onClose} title="Hesap">
      {p ? (
        <div class="account">
          {p.google ? <Avatar name={p.name} photo={s?.photoURL ?? null} size={56} /> : <Avatar anonymous size={56} />}
          <div>
            <p class="account__name">{p.google ? p.name : 'Anonim oyuncu'}</p>
            {p.google ? (
              s?.email && <p class="muted">{s.email}</p>
            ) : (
              <p class="muted">Google hesabı olmadan, bu cihazda kayıtlısın.</p>
            )}
          </div>

          <div class="account__privacy">
            {p.google ? (
              <>
                <Segmented
                  label="Sıralamada görünürlük"
                  value={p.anonymous ? 'anonymous' : 'visible'}
                  options={PRIVACY}
                  onChange={async (v) => {
                    if (switching || (v === 'anonymous') === p.anonymous) return;
                    setSwitching(true);
                    await setAnonymousMode(v === 'anonymous');
                    setSwitching(false);
                  }}
                />
                <p class="muted">
                  {switching
                    ? 'Skorların taşınıyor…'
                    : p.anonymous
                      ? 'Anonimsin: skorlarını yalnızca sen görürsün, sıralamada da yalnızca kendini görürsün.'
                      : 'Sıralamada adınla görünürsün. Anonim olursan geçmiş skorların da gizlenir; başkalarını da görmezsin.'}
                </p>
              </>
            ) : (
              <>
                <p class="muted">
                  Skorlarını yalnızca sen görürsün, sıralamada da yalnızca kendini görürsün.
                  {googleSignInAvailable && ' Google hesabına bağlarsan skorların korunur, istediğin cihazdan devam edersin.'}
                </p>
                <SignInButton class="btn btn--block" label="Google hesabına bağla" />
              </>
            )}
          </div>

          {p.google && (
            <button
              type="button"
              class="btn btn--block"
              onClick={async () => {
                await signOut();
                onClose();
              }}
            >
              <Icon name="logout" />
              Çıkış yap
            </button>
          )}
          {confirming ? (
            <div class="account__danger" role="alert">
              <p>
                {p.google
                  ? 'Hesabın ve bütün skorların kalıcı olarak silinir. Gerekirse Google seni bir kez daha doğrular.'
                  : 'Anonim kaydın ve bütün skorların kalıcı olarak silinir.'}
              </p>
              <div class="confirm-actions">
                <button type="button" class="btn" onClick={() => setConfirming(false)} disabled={busy}>
                  Vazgeç
                </button>
                <button
                  type="button"
                  class="btn btn--primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await deleteAccount();
                    setBusy(false);
                    if (ok) onClose();
                  }}
                >
                  {busy ? 'Siliniyor…' : p.google ? 'Hesabı sil' : 'Kaydı sil'}
                </button>
              </div>
            </div>
          ) : (
            <p class="account__links">
              <button type="button" class="link-btn" onClick={() => setConfirming(true)}>
                {p.google ? 'Hesabımı sil' : 'Anonim kaydımı sil'}
              </button>
              <a href="/gizlilik" onClick={onClose}>
                Gizlilik
              </a>
            </p>
          )}
        </div>
      ) : (
        <p class="muted">Giriş yapmadın.</p>
      )}
    </Sheet>
  );
}

export function Avatar({
  name = '',
  photo = null,
  size = 36,
  anonymous = false,
}: {
  name?: string;
  photo?: string | null;
  size?: number;
  /** Anonim oyuncu: ad ya da fotoğraf yerine simge */
  anonymous?: boolean;
}) {
  const initial = (name.trim()[0] ?? '?').toLocaleUpperCase('tr-TR');
  return (
    <span class={`avatar${anonymous ? ' avatar--anon' : ''}`} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {anonymous ? (
        <Icon name="user" size={Math.round(size * 0.55)} />
      ) : photo ? (
        <img src={photo} alt="" referrerpolicy="no-referrer" width={size} height={size} />
      ) : (
        initial
      )}
    </span>
  );
}
