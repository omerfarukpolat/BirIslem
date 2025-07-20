// Ses efektleri için yardımcı fonksiyonlar
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.initAudioContext();
    this.loadSoundPreference();
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Ses desteği mevcut değil:', error);
      this.isEnabled = false;
    }
  }

  // Ses tercihini localStorage'dan yükle
  private loadSoundPreference() {
    try {
      const savedPreference = localStorage.getItem('soundEnabled');
      if (savedPreference !== null) {
        this.isEnabled = JSON.parse(savedPreference);
        console.log('Ses tercihi yüklendi:', this.isEnabled);
      } else {
        console.log('Ses tercihi bulunamadı, varsayılan olarak açık');
      }
    } catch (error) {
      console.warn('Ses tercihi yüklenirken hata:', error);
      this.isEnabled = true; // Varsayılan olarak açık
    }
  }

  // Ses tercihini localStorage'a kaydet
  private saveSoundPreference() {
    try {
      localStorage.setItem('soundEnabled', JSON.stringify(this.isEnabled));
      console.log('Ses tercihi kaydedildi:', this.isEnabled);
    } catch (error) {
      console.warn('Ses tercihi kaydedilirken hata:', error);
    }
  }

  // Ses çalma fonksiyonu
  private playSound(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    if (!this.audioContext || !this.isEnabled) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Ses çalınamadı:', error);
    }
  }

  // Sayı seçme sesi
  playNumberSelect() {
    this.playSound(800, 0.1, 'sine', 0.2);
  }

  // Operatör seçme sesi
  playOperatorSelect() {
    this.playSound(600, 0.15, 'square', 0.25);
  }

  // Hesaplama yapma sesi
  playCalculation() {
    this.playSound(400, 0.2, 'triangle', 0.3);
  }

  // Geri alma sesi
  playUndo() {
    this.playSound(300, 0.3, 'sawtooth', 0.25);
  }

  // Temizleme sesi
  playClear() {
    this.playSound(200, 0.4, 'sawtooth', 0.3);
  }

  // Sonuç bulma sesi (başarılı)
  playSuccess() {
    // Yükselen akor
    this.playSound(523, 0.2, 'sine', 0.3); // C
    setTimeout(() => this.playSound(659, 0.2, 'sine', 0.3), 100); // E
    setTimeout(() => this.playSound(784, 0.3, 'sine', 0.3), 200); // G
  }

  // Sonuç gönderme sesi
  playSubmit() {
    // Düşen akor
    this.playSound(784, 0.2, 'sine', 0.3); // G
    setTimeout(() => this.playSound(659, 0.2, 'sine', 0.3), 100); // E
    setTimeout(() => this.playSound(523, 0.3, 'sine', 0.3), 200); // C
  }

  // Yüksek puan sesi (130+)
  playHighScore() {
    // Özel başarı melodisi
    this.playSound(523, 0.3, 'sine', 0.4); // C
    setTimeout(() => this.playSound(659, 0.3, 'sine', 0.4), 150); // E
    setTimeout(() => this.playSound(784, 0.3, 'sine', 0.4), 300); // G
    setTimeout(() => this.playSound(1047, 0.5, 'sine', 0.4), 450); // C (yüksek)
  }

  // Tik-tak sesi (süre azaldığında)
  playTickTock() {
    // Tik sesi (yüksek frekans)
    this.playSound(800, 0.1, 'sine', 0.3);
    
    // Tak sesi (düşük frekans) - 0.2 saniye sonra
    setTimeout(() => {
      this.playSound(400, 0.1, 'sine', 0.3);
    }, 200);
  }

  // Hata sesi
  playError() {
    this.playSound(200, 0.5, 'sawtooth', 0.2);
  }

  // Ses açma/kapama
  toggleSound() {
    this.isEnabled = !this.isEnabled;
    this.saveSoundPreference(); // Tercihi kaydet
    return this.isEnabled;
  }

  // Ses durumunu al
  getSoundEnabled() {
    return this.isEnabled;
  }
}

// Global ses yöneticisi
export const soundManager = new SoundManager(); 