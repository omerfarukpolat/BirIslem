import { render } from 'preact';
import { App } from './app';
import { initAuth } from './state/auth';
import './state/settings';
import './styles/fonts.css';
import './styles/base.css';

render(<App />, document.getElementById('app')!);

// Firebase Auth ilk çizimi geciktirmesin: tarayıcı boşa çıkınca yüklenir.
initAuth();

// Çevrimdışı açılış (pwa/sw.js). Sayfa yüklendikten sonra kurulur, ilk açılışı yavaşlatmaz.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('Service worker kurulamadı', err));
  });
}
