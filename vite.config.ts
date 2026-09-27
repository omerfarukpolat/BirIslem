/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

// Eski CRA ortam değişkenleri (REACT_APP_*) Vercel'de aynen çalışmaya devam etsin.
const ENV_PREFIXES = ['VITE_', 'REACT_APP_'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ENV_PREFIXES);
  return {
    plugins: [preact()],
    envPrefix: ENV_PREFIXES,
    define: {
      // Derleme anında sabit: üretimde emülatör kodu paketten tamamen çıkar.
      __USE_EMULATORS__: JSON.stringify(env.REACT_APP_USE_EMULATORS === 'true'),
    },
    build: {
      // Vercel projesi CRA döneminden kalma "build" klasörünü bekliyor.
      outDir: 'build',
      target: 'es2020',
      sourcemap: false,
    },
    worker: {
      format: 'es',
    },
    server: {
      port: 3000,
    },
    preview: {
      port: 4173,
    },
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  };
});
