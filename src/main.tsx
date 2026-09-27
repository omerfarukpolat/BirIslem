import { render } from 'preact';
import { App } from './app';
import { initAuth } from './state/auth';
import './state/settings';
import './styles/fonts.css';
import './styles/base.css';

render(<App />, document.getElementById('app')!);

// Firebase Auth ilk çizimi geciktirmesin: tarayıcı boşa çıkınca yüklenir.
initAuth();
