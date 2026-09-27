import { effect, signal } from '@preact/signals';
import { readJSON, writeJSON } from '../lib/storage';

export type Theme = 'system' | 'light' | 'dark';

export interface GameSettings {
  /** saniye */
  timeLimit: number;
  /** 0 = sınırsız */
  operationLimit: number;
}

export const TIME_OPTIONS = [30, 45, 60, 90, 120, 180, 240, 300] as const;
export const OP_LIMIT_OPTIONS = [0, 1, 2, 3, 4, 5] as const;
export const DEFAULT_SETTINGS: GameSettings = { timeLimit: 120, operationLimit: 0 };

// Anahtar adları eski sürümle aynı: oyuncuların kayıtlı tercihleri korunur.
const SETTINGS_KEY = 'gameSettings';
const SOUND_KEY = 'soundEnabled';
const THEME_KEY = 'theme';

function loadSettings(): GameSettings {
  const saved = readJSON<Partial<GameSettings>>(SETTINGS_KEY, {});
  const timeLimit = TIME_OPTIONS.includes(saved.timeLimit as never) ? saved.timeLimit! : DEFAULT_SETTINGS.timeLimit;
  const operationLimit = OP_LIMIT_OPTIONS.includes(saved.operationLimit as never)
    ? saved.operationLimit!
    : DEFAULT_SETTINGS.operationLimit;
  return { timeLimit, operationLimit };
}

export const settings = signal<GameSettings>(loadSettings());
export const soundOn = signal<boolean>(readJSON(SOUND_KEY, true));
export const theme = signal<Theme>(readJSON<Theme>(THEME_KEY, 'system'));

effect(() => writeJSON(SETTINGS_KEY, settings.value));
effect(() => writeJSON(SOUND_KEY, soundOn.value));
effect(() => {
  writeJSON(THEME_KEY, theme.value);
  applyTheme(theme.value);
});

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e1826' : '#f3eee3');
}
