/**
 * Mağaza görselleri: Google Play ve App Store ekran görüntüleri, öne çıkan görsel,
 * mağaza simgeleri ve manifest ekran görüntüleri.
 *
 *   npm run store:assets
 *
 * Uygulamayı Firebase emülatör ayarlarıyla geçici bir klasöre derler, yerelde sunar
 * ve gerçek oyun ekranlarını Playwright ile çeker. Çıktı: store/ ve public/.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import ts from 'typescript';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'node_modules/.cache/store-build');
const PORT = 4185;
const BASE = `http://127.0.0.1:${PORT}`;
const PUZZLE = '/game?soru=2-5-6-8-9-45-354';

const env = {
  ...process.env,
  // Gerçek proje bilgisi gerekmez: giriş düğmesi ve çevrimiçi oda görünsün diye
  REACT_APP_FIREBASE_API_KEY: 'demo-key',
  REACT_APP_FIREBASE_PROJECT_ID: 'demo-birislem',
  REACT_APP_FIREBASE_AUTH_DOMAIN: 'demo-birislem.firebaseapp.com',
  REACT_APP_FIREBASE_APP_ID: '1:1:web:1',
  REACT_APP_USE_EMULATORS: 'true',
};

/** Mağazaların istediği boyutlar (CSS pikseli × ölçek) */
const DEVICES = [
  { dir: 'store/google-play/telefon', width: 432, height: 768, scale: 2.5 }, // 1080×1920
  { dir: 'store/app-store/iphone-6.9', width: 440, height: 956, scale: 3 }, // 1320×2868
  { dir: 'store/app-store/iphone-6.5', width: 428, height: 926, scale: 3 }, // 1284×2778
  { dir: 'store/app-store/ipad-13', width: 1032, height: 1376, scale: 2 }, // 2064×2752
];

/** Oyunun kendi çözücüsü (src/game/solver.ts): sahneler gerçek çözümlerle oynansın */
async function loadSolver() {
  const dir = join(ROOT, 'node_modules/.cache/store-solver');
  mkdirSync(dir, { recursive: true });
  for (const name of ['solver', 'rules']) {
    const src = readFileSync(join(ROOT, `src/game/${name}.ts`), 'utf8');
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    writeFileSync(join(dir, `${name}.mjs`), js.replace("from './rules'", "from './rules.mjs'"));
  }
  return (await import(join(dir, 'solver.mjs'))).solve;
}
const solve = await loadSolver();
const SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

/** Ekrandaki sorunun en kısa çözümü */
async function solveScreen(p) {
  const target = Number(await p.locator('.board .sr-only').innerText());
  const numbers = (await p.locator('.tiles > button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))).map(Number);
  return { target, solution: solve(numbers, target) };
}

/** Çözümün ilk `count` adımını, adımlar arasında bekleyerek oynar */
async function playSolution(p, gapMs, count = Infinity) {
  const { solution } = await solveScreen(p);
  for (const st of solution.steps.slice(0, count)) {
    await p.waitForTimeout(gapMs);
    const selected = await p.locator('.tiles > button.is-selected').getAttribute('aria-label', { timeout: 200 }).catch(() => null);
    if (selected !== String(st.a)) await p.locator(`.tiles > button[aria-label="${st.a}"]:not(.is-selected)`).first().click();
    await op(p, SYMBOL[st.op]);
    await p.locator(`.tiles > button[aria-label="${st.b}"]:not(.is-selected)`).first().click();
  }
  return solution;
}

const tile = (p, i) => p.locator('.tiles > *').nth(i).click();
const op = (p, s) => p.locator('.op', { hasText: s }).click();
const finish = async (p) => {
  await p.locator('.actions .btn--primary').click();
  await p.locator('.actions .btn--dark').click();
};
const ready = (p) => p.locator('.tiles button').first().waitFor({ timeout: 10_000 });

const SCENES = [
  {
    name: '1-ana-sayfa',
    async run(p) {
      await p.goto(`${BASE}/`);
      await p.locator('.signin:not([disabled])').waitFor({ timeout: 10_000 }).catch(() => {});
    },
  },
  {
    name: '2-oyun',
    async run(p) {
      await p.goto(BASE + PUZZLE);
      await ready(p);
      await tile(p, 5);
      await op(p, '×');
      await tile(p, 3); // 45 × 8 = 360
      await op(p, '−');
    },
  },
  {
    name: '3-sonuc',
    async run(p) {
      await p.goto(`${BASE}/game`);
      await ready(p);
      const sol = await playSolution(p, 1600);
      if (sol.diff > 0) await finish(p);
      await p.locator('.compare__same, .compare .steplines').first().waitFor({ timeout: 10_000 });
    },
  },
  {
    name: '4-karsilikli',
    async run(p) {
      // Birkaç adımlı ve sondan bir önceki sonucu hedefe yakın bir soru gelene kadar yeniden başlat
      for (let attempt = 0; ; attempt++) {
        // Yarım kalan maç oturumda saklanıyor: karşılıklı ekranı açık değilken temizle
        await p.goto(`${BASE}/`);
        await p.evaluate(() => sessionStorage.clear());
        await p.goto(`${BASE}/karsilikli`);
        await p.getByLabel('1. oyuncunun adı').fill('Ayşe');
        await p.getByLabel('2. oyuncunun adı').fill('Mehmet');
        await p.getByRole('button', { name: /Başlat/ }).click();
        await p.getByRole('button', { name: 'Hazırım' }).click();
        await ready(p);
        const { target, solution } = await solveScreen(p);
        const near = solution.steps.at(-2)?.result ?? 0;
        if ((solution.diff === 0 && solution.steps.length >= 3 && Math.abs(target - near) <= 30) || attempt >= 20) break;
      }
      // Ayşe tam buluyor; Mehmet son adımı yapmadan bitiriyor
      await playSolution(p, 900);
      await p.getByRole('button', { name: 'Hazırım' }).click();
      await ready(p);
      const { solution } = await solveScreen(p);
      await playSolution(p, 1500, solution.steps.length - 1);
      await finish(p);
      await p.locator('.summary__solution .steplines').waitFor({ timeout: 10_000 });
    },
  },
];

/** App Store saydamlık kanalı olan simgeyi reddeder: RGBA PNG'yi RGB'ye çevirir. */
function pngWithoutAlpha(buf) {
  if (buf[25] !== 6) return buf;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const idat = [];
  for (let o = 8; o < buf.length; ) {
    const len = buf.readUInt32BE(o);
    const type = buf.toString('ascii', o + 4, o + 8);
    if (type === 'IDAT') idat.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const rgba = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? rgba[y * stride + x - 4] : 0;
      const b = y > 0 ? rgba[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? rgba[(y - 1) * stride + x - 4] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      rgba[y * stride + x] = (line[x] + pred) & 0xff;
    }
  }
  const rgb = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) rgba.copy(rgb, y * (width * 3 + 1) + 1 + x * 3, y * stride + x * 4, y * stride + x * 4 + 3);
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([buf.subarray(0, 8), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rgb, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

function crc32(data) {
  let c = ~0;
  for (const byte of data) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

/** Logo: favicon.svg'deki işaretler, verilen renkte */
const logo = (color, size) => `
  <svg width="${size}" height="${size}" viewBox="6 5 50 54" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.5 12H27.5V52H17.5V22L9.5 26.5V18.5Z" fill="${color}"/>
    <g fill="none" stroke="${color}" stroke-width="3.4" stroke-linecap="round">
      <path d="M40 13.5H50M45 8.5V18.5"/><path d="M40 26H50"/>
      <path d="M41.3 34.2L48.7 41.6M48.7 34.2L41.3 41.6"/><path d="M40 50.5H50"/>
    </g>
    <circle cx="45" cy="46.2" r="1.9" fill="${color}"/><circle cx="45" cy="54.8" r="1.9" fill="${color}"/>
  </svg>`;

async function graphics(browser, css) {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  // Yazı tipleri sitenin kendi kaynağından yüklensin (boş sayfadan yüklenemiyor)
  await page.goto(`${BASE}/robots.txt`);
  const shot = async (html, width, height, path, type = 'png') => {
    await page.setViewportSize({ width, height });
    await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${BASE}${css}">
      <style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}</style></head><body>${html}</body></html>`);
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('700 80px "Barlow Condensed"', 'Bir İşlem 354'),
        document.fonts.load('600 20px Barlow', 'Altı sayı'),
      ]);
      await document.fonts.ready;
    });
    const buf = await page.screenshot({ type, quality: type === 'jpeg' ? 92 : undefined });
    writeFileSync(join(ROOT, path), type === 'png' ? pngWithoutAlpha(buf) : buf);
  };
  // Kare, kenara kadar dolu simge: köşeleri mağaza yuvarlar
  const icon = (size) => `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;background:var(--paper)">${logo('#13273e', size * 0.62)}</div>`;
  await shot(icon(1024), 1024, 1024, 'public/icons/icon-1024.png');
  await shot(icon(512), 512, 512, 'store/google-play/simge-512.png');
  const flaps = [3, 5, 4]
    .map((d) => `<span class="flap num" style="width:118px;height:150px;font-size:120px;animation:none">${d}</span>`)
    .join('');
  await shot(
    `<div style="width:1024px;height:500px;box-sizing:border-box;padding:0 72px;display:flex;align-items:center;justify-content:space-between;background:var(--board);color:var(--paper)">
      <div style="display:grid;gap:18px">
        <div style="display:flex;align-items:center;gap:18px">${logo('#f3eee3', 84)}
          <span style="font-family:var(--font-display);font-weight:700;font-size:84px;line-height:1">Bir İşlem</span></div>
        <p style="margin:0;font-family:var(--font-display);font-weight:700;font-size:40px;line-height:1.15;color:var(--board-ink)">Altı sayı, dört işlem,<br>tek hedef.</p>
      </div>
      <div style="display:flex;gap:12px">${flaps}</div>
    </div>`,
    1024,
    500,
    'store/google-play/one-cikan-gorsel.jpg',
    'jpeg',
  );
  await page.close();
}

async function screenshots(browser) {
  for (const d of DEVICES) {
    mkdirSync(join(ROOT, d.dir), { recursive: true });
    for (const scene of SCENES) {
      const ctx = await browser.newContext({
        viewport: { width: d.width, height: d.height },
        deviceScaleFactor: d.scale,
        isMobile: true,
        hasTouch: true,
        locale: 'tr-TR',
        serviceWorkers: 'block',
      });
      const p = await ctx.newPage();
      await scene.run(p);
      await p.waitForTimeout(900); // giriş animasyonları otursun
      await p.screenshot({ path: join(ROOT, d.dir, `${scene.name}.jpg`), type: 'jpeg', quality: 90 });
      await ctx.close();
      console.log(`${d.dir}/${scene.name}.jpg`);
    }
  }
  // Tarayıcının "yükle" penceresinde görünen ekran görüntüleri (manifest.json)
  mkdirSync(join(ROOT, 'public/screenshots'), { recursive: true });
  for (const [name, scene, size, mobile] of [
    ['dar-1', SCENES[0], [432, 768, 2.5], true],
    ['dar-2', SCENES[1], [432, 768, 2.5], true],
    ['genis-1', SCENES[1], [1280, 800, 1], false],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: size[0], height: size[1] },
      deviceScaleFactor: size[2],
      isMobile: mobile,
      hasTouch: mobile,
      serviceWorkers: 'block',
    });
    const p = await ctx.newPage();
    await scene.run(p);
    await p.waitForTimeout(900);
    await p.screenshot({ path: join(ROOT, `public/screenshots/${name}.jpg`), type: 'jpeg', quality: 82 });
    await ctx.close();
  }
}

const VITE = join(ROOT, 'node_modules/vite/bin/vite.js');
const build = spawnSync(process.execPath, [VITE, 'build', '--outDir', OUT_DIR, '--emptyOutDir'], { cwd: ROOT, env, stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const css = readFileSync(join(OUT_DIR, 'index.html'), 'utf8').match(/href="(\/assets\/index-[^"]+\.css)"/)[1];

const server = spawn(process.execPath, [VITE, 'preview', '--outDir', OUT_DIR, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  env,
  stdio: 'ignore',
});
try {
  for (let i = 0; ; i++) {
    if (await fetch(BASE).then((r) => r.ok, () => false)) break;
    if (i > 60) throw new Error('önizleme sunucusu açılmadı');
    await new Promise((r) => setTimeout(r, 500));
  }
  mkdirSync(join(ROOT, 'store/google-play'), { recursive: true });
  const browser = await chromium.launch();
  await graphics(browser, css);
  await screenshots(browser);
  await browser.close();
} finally {
  server.kill();
}
