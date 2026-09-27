/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  // Eski CRA ortam değişkenleri (REACT_APP_*) Vercel'de aynen çalışmaya devam etsin.
  envPrefix: ['VITE_', 'REACT_APP_'],
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
});
