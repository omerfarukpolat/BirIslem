import { defineConfig, devices } from '@playwright/test';

/**
 * Uçtan uca testler üretim derlemesine karşı çalışır.
 * Çevrimiçi oda testi için önce `npm run emulators`, sonra `E2E_EMULATORS=1 npm run e2e`.
 */
const withEmulators = process.env.E2E_EMULATORS === '1';
const PORT = 4180;

const firebaseEnv: Record<string, string> = withEmulators
  ? {
      REACT_APP_FIREBASE_API_KEY: 'demo-key',
      REACT_APP_FIREBASE_PROJECT_ID: 'demo-birislem',
      REACT_APP_FIREBASE_AUTH_DOMAIN: 'demo-birislem.firebaseapp.com',
      REACT_APP_FIREBASE_APP_ID: '1:1:web:1',
      REACT_APP_USE_EMULATORS: 'true',
    }
  : {
      // Firebase kapalıyken de oyun tamamen oynanabilir olmalı
      REACT_APP_FIREBASE_API_KEY: '',
      REACT_APP_FIREBASE_PROJECT_ID: '',
    };

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    ...devices['Pixel 7'],
  },
  webServer: {
    command: `npx vite build --outDir build-e2e --emptyOutDir && npx vite preview --outDir build-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: firebaseEnv,
  },
});
