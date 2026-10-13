import { expect, test } from '@playwright/test';
import { op, tile } from './helpers';

// Mağaza paketleri (TWA / WKWebView) bağlantı yokken de açılabilmeli.
test('opens and plays offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.locator('.hero h1')).toBeVisible();
  // Service worker kurulup sayfayı devralana kadar bekle
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 15_000 });

  await context.setOffline(true);
  await page.goto('/game?soru=2-5-6-8-9-45-354');
  await expect(page.locator('.board .sr-only')).toHaveText('354');
  await tile(page, 5); // 45
  await op(page, '×');
  await tile(page, 3); // 8 → 360
  await op(page, '−');
  await tile(page, 2); // 6 → 354
  await expect(page.locator('.scorecard__verdict')).toHaveText('Tam isabet!', { timeout: 5000 });

  await page.goto('/gunun-sorusu');
  await expect(page.getByRole('button', { name: /Başla/ })).toBeVisible();
});
