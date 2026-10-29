import { TopBar, useTitle } from '../components/ui';
import './privacy.css';

/** Mağaza kayıtlarında "gizlilik politikası" ve "veri silme" bağlantısı olarak verilir. */
const CONTACT: string | undefined = import.meta.env.REACT_APP_CONTACT_EMAIL || undefined;

export default function Privacy() {
  useTitle('Gizlilik');
  return (
    <main class="page privacy">
      <TopBar title="Gizlilik" />
      <article class="privacy__body">
        <h1>Gizlilik politikası</h1>
        <p class="muted">Son güncelleme: 29 Ekim 2026</p>
        <p>
          Bir İşlem; birislem.app sitesi ve Android, iOS uygulamalarıyla oynanan bir matematik oyunudur. Bu sayfa hangi
          verilerin neden tutulduğunu ve onları nasıl silebileceğini anlatır.
        </p>

        <h2>Giriş yapmadan oynarken</h2>
        <p>
          Ayarların, istatistiklerin ve günün sorusundaki ilerlemen yalnızca cihazında saklanır, sunucuya gönderilmez.
          Uygulamayı kaldırınca ya da tarayıcı verilerini silince bunlar da silinir.
        </p>

        <h2>Google ile giriş yaparsan</h2>
        <ul>
          <li>Google hesabının adı, e-posta adresi ve profil fotoğrafı, giriş için Firebase Authentication'da (Google) tutulur.</li>
          <li>
            Sıralama için her oyunun sonucu kaydedilir: adın, kullanıcı kimliğin, puanın, soru, bulduğun sonuç, süre ve
            yaptığın işlemler. Sıralamada adın ve puanların herkese görünür.
          </li>
          <li>E-posta adresin skor kayıtlarına yazılmaz ve kimseye gösterilmez.</li>
        </ul>
        <p>iOS uygulamasında Google ile giriş yoktur; orada skorlarını anonim olarak kaydedebilirsin.</p>

        <h2 id="anonim">Anonim oyuncu ve anonim mod</h2>
        <ul>
          <li>
            Google hesabı olmadan <b>Anonim kaydet</b>'i seçersen Firebase'de (Google) senin için bir anonim kullanıcı
            kimliği oluşturulur. Ad ya da e-posta istenmez; skorların ve oyun sonuçların bu kimlikle saklanır.
          </li>
          <li>
            Google ile giriş yaptığında sıralamada adınla mı görüneceğin, yoksa anonim mi olacağın sorulur. Seçene kadar
            yeni skorların kaydedilmez; daha önce kaydedilenler olduğu gibi kalır.
          </li>
          <li>
            Seçimini istediğin zaman Hesap'tan değiştirebilirsin. Anonim olunca geçmiş ve sonraki skorların herkese açık
            sıralamadan kaldırılır; görünür olunca geri gelir.
          </li>
          <li>
            Anonim skorları yalnızca sen görebilirsin; sunucu kuralları başka kullanıcıların onları okumasına izin vermez.
            Anonimken sıralamada da yalnızca kendi sonuçlarını görürsün.
          </li>
          <li>Anonim kimlik bu cihaza bağlıdır. Google hesabına bağlarsan skorların korunur.</li>
        </ul>

        <h2>Çevrimiçi odalar</h2>
        <p>
          Odaya girerken yazdığın takma ad, anonim bir kullanıcı kimliği ve tur sonuçların, odadaki oyunculara göstermek
          için Firebase'de (Google) tutulur. Oda kayıtları 24 saat sonra silinir.
        </p>

        <h2>Kullanmadıklarımız</h2>
        <p>
          Reklam, analiz ya da takip aracı yok. Verilerin satılmaz ve reklam için kullanılmaz. Yalnızca hizmeti
          çalıştıran altyapı firmaları işler: Google Firebase (giriş ve veritabanı) ve Vercel (sitenin barındırılması ve
          erişim kayıtları).
        </p>

        <h2 id="silme">Hesap ve veri silme</h2>
        <p>
          Hesabını ve bütün skorlarını istediğin zaman silebilirsin: sağ üstteki profil resmine dokun ve{' '}
          <b>Hesabımı sil</b>'i (anonim oyuncuysan <b>Anonim kaydımı sil</b>'i) seç. Bu işlem uygulamada ve birislem.app sitesinde aynıdır. Silinen veriler geri
          getirilemez. Silme işlemini yapamıyorsan aşağıdaki adresten yazabilirsin; hesabın 30 gün içinde silinir.
        </p>

        <h2>Çocuklar</h2>
        <p>
          Oyun her yaşa uygundur ve giriş yapmadan oynanabilir. Google ile giriş, Google'ın yaş koşullarına tabidir.
        </p>

        <h2>İletişim</h2>
        <p>
          {CONTACT ? (
            <>
              Sorular ve silme talepleri için: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
            </>
          ) : (
            'Sorular ve silme talepleri için mağaza sayfasındaki geliştirici iletişim adresini kullanabilirsin.'
          )}
        </p>
        <p class="muted">Bu politika değişirse bu sayfa güncellenir.</p>
      </article>
    </main>
  );
}
