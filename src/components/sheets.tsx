import { formatTimeLimit } from '../game/format';
import { BANDS, MAX_SCORE } from '../game/scoring';
import { signOut, user } from '../state/auth';
import { OP_LIMIT_OPTIONS, TIME_OPTIONS, settings, soundOn, theme, type GameSettings, type Theme } from '../state/settings';
import { Icon } from './Icon';
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
          <b>Hız bonusu:</b> en yakın sonucuna ne kadar erken ulaştıysan yakınlık puanının %25'ine kadar eklenir. Bu yüzden
          yavaş ama tam sonuç, hızlı ama uzak bir sonucu her zaman geçer.
        </p>
        <p class="muted">
          Bazı sorularda hedef tam olarak bulunamaz. O zaman fark, <b>bulunabilecek en iyi sonuca</b> göre hesaplanır; en
          iyisini bulan tam puan alır.
        </p>
      </div>

      <div class="rules-table">
        <h3>Karşılıklı</h3>
        <p class="muted">
          Herkes aynı soruyu çözer, puanlar aynı şekilde hesaplanır. Turların toplamı kazananı belirler; eşitlikte daha çok
          tur kazanan öne geçer.
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

export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const u = user.value;
  return (
    <Sheet open={open} onClose={onClose} title="Hesap">
      {u ? (
        <div class="account">
          <Avatar name={u.name} photo={u.photoURL} size={56} />
          <div>
            <p class="account__name">{u.name}</p>
            {u.email && <p class="muted">{u.email}</p>}
          </div>
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
        </div>
      ) : (
        <p class="muted">Giriş yapmadın.</p>
      )}
    </Sheet>
  );
}

export function Avatar({ name, photo, size = 36 }: { name: string; photo: string | null; size?: number }) {
  const initial = (name.trim()[0] ?? '?').toLocaleUpperCase('tr-TR');
  return (
    <span class="avatar" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {photo ? <img src={photo} alt="" referrerpolicy="no-referrer" width={size} height={size} /> : initial}
    </span>
  );
}
