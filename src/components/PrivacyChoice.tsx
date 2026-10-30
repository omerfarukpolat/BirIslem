import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import { readJSON, safeSession, writeJSON } from '../lib/storage';
import { session } from '../state/auth';
import { confirmedUid, knownLocally, loadProfile, player, setPrivacy } from '../state/player';
import { toast } from '../state/toast';
import { Icon } from './Icon';
import { Sheet } from './ui';
import './privacy-choice.css';

/** Görünür / anonim seçimi: ilk girişte, oyun sonunda ve sıralamada aynı iki seçenek */
export function PrivacyChoice({ onChosen }: { onChosen?: () => void }) {
  const [busy, setBusy] = useState<null | 'visible' | 'anonymous'>(null);
  const choose = async (anonymous: boolean) => {
    setBusy(anonymous ? 'anonymous' : 'visible');
    const ok = await setPrivacy(anonymous);
    setBusy(null);
    if (ok) onChosen?.();
  };
  return (
    <div class="privacy-choice">
      <button type="button" class="privacy-choice__opt" disabled={busy !== null} onClick={() => choose(false)}>
        <Icon name="users" />
        <span>
          <b>{busy === 'visible' ? 'Kaydediliyor…' : 'Görünür'}</b>
          <small>Skorların adınla sıralamaya girer, sen de herkesi görürsün.</small>
        </span>
      </button>
      <button type="button" class="privacy-choice__opt" disabled={busy !== null} onClick={() => choose(true)}>
        <Icon name="user" />
        <span>
          <b>{busy === 'anonymous' ? 'Kaydediliyor…' : 'Anonim'}</b>
          <small>Skorlarını yalnızca sen görürsün; sıralamada da yalnızca kendini görürsün.</small>
        </span>
      </button>
    </div>
  );
}

const LATER_KEY = 'birislem:privacy-later';
/** Okuma hatası bu oturumda bir kez söylenir */
let reported = false;

/**
 * Görünürlüğünü henüz seçmemiş Google kullanıcısına (bu özellikten önce kaydolan
 * herkes dahil) ana sayfaya girince sorar. Kapatırsa bu oturumda bir daha sorulmaz;
 * skor kaydederken ve sıralamada soru ekranın içinde yeniden çıkar.
 */
export function PrivacyPrompt() {
  const { path } = useLocation();
  const s = session.value;
  const p = player.value;
  const confirmed = confirmedUid.value;
  const [later, setLater] = useState<string | null>(() => readJSON<string | null>(LATER_KEY, null, safeSession()));

  // Tercih cihazda bilinmiyorsa sunucuya sor (bilinen tercih için Firestore yüklenmez).
  // Okunamazsa sessiz kalmaz; ana sayfaya her dönüşte yeniden dener.
  useEffect(() => {
    if (!s || s.anonymous || path !== '/' || knownLocally(s.uid)) return;
    const t = setTimeout(
      () =>
        loadProfile(s.uid, true).catch((err) => {
          const code = (err as { code?: string }).code;
          console.warn('Görünürlük tercihi okunamadı', err);
          if (reported) return;
          reported = true;
          toast(`Sıralama tercihin yüklenemedi; biraz sonra tekrar dene.${code ? ` (${code})` : ''}`, 7000);
        }),
      300,
    );
    return () => clearTimeout(t);
  }, [s?.uid, s?.anonymous, path]);

  const open = path === '/' && !!s && !s.anonymous && confirmed === s.uid && p?.privacy === 'unknown' && later !== s.uid;
  const close = () => {
    if (!s) return;
    setLater(s.uid);
    writeJSON(LATER_KEY, s.uid, safeSession());
  };

  return (
    <Sheet open={open} onClose={close} title="Sıralamada nasıl görünmek istersin?">
      <div class="privacy-prompt">
        <p class="muted">Bunu bir kez seçmen yeterli; istediğin zaman Hesap'tan değiştirebilirsin.</p>
        <PrivacyChoice />
      </div>
    </Sheet>
  );
}
