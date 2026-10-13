/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import preact from '@preact/preset-vite';

// Eski CRA ortam değişkenleri (REACT_APP_*) Vercel'de aynen çalışmaya devam etsin.
const ENV_PREFIXES = ['VITE_', 'REACT_APP_'];

/** Açılışta önbelleğe alınan, public/ klasöründen gelen dosyalar */
const PRECACHE_PUBLIC = ['/index.html', '/manifest.json', '/favicon.svg', '/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png'];
/** Bundan büyük paketler (Firestore) önceden indirilmez; kullanılınca önbelleğe girer */
const PRECACHE_MAX_BYTES = 200_000;

/**
 * Derlenen dosyaların listesiyle build/sw.js'i yazar (bkz. pwa/sw.js). Sürüm,
 * dosyaların içeriğinden türetilir: bir dosya değişince tarayıcı yeni sürümü kurar.
 */
function serviceWorker(): Plugin {
  let root = '.';
  let outDir = 'build';
  return {
    name: 'birislem-sw',
    apply: 'build',
    configResolved(config) {
      root = config.root;
      outDir = resolve(root, config.build.outDir);
    },
    closeBundle() {
      const assetsDir = join(outDir, 'assets');
      if (!existsSync(join(outDir, 'index.html')) || !existsSync(assetsDir)) return;
      const assets = readdirSync(assetsDir)
        .filter((f) => !f.endsWith('.woff') && statSync(join(assetsDir, f)).size <= PRECACHE_MAX_BYTES)
        .sort()
        .map((f) => `/assets/${f}`);
      const files = [...PRECACHE_PUBLIC, ...assets];
      const hash = createHash('sha256');
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const template = readFileSync(resolve(root, 'pwa/sw.js'), 'utf8');
      writeFileSync(
        join(outDir, 'sw.js'),
        `self.__VERSION = ${JSON.stringify(version)};\nself.__PRECACHE = ${JSON.stringify(files)};\n${template}`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ENV_PREFIXES);
  return {
    plugins: [preact(), serviceWorker()],
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
