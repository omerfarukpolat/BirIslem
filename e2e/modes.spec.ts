import { expect, test } from '@playwright/test';
import { finish, op, tile, waitForPlay } from './helpers';

test('home links to every mode', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hero h1')).toContainText('tek hedef');
  await page.getByRole('link', { name: /Tek başına/ }).click();
  await expect(page).toHaveURL(/\/game$/);
  await page.goBack();
  await page.getByRole('link', { name: /Günün sorusu/ }).click();
  await expect(page).toHaveURL(/\/gunun-sorusu$/);
  await page.goBack();
  await page.getByRole('button', { name: /Aynı cihazda/ }).click();
  await expect(page).toHaveURL(/\/karsilikli$/);
});

test('daily puzzle allows a single attempt and survives a reload', async ({ page }) => {
  await page.goto('/gunun-sorusu');
  await page.getByRole('button', { name: /Başla/ }).click();
  await waitForPlay(page);
  await tile(page, 5);
  await op(page, '+');
  await tile(page, 0);
  await page.reload();
  // Yenileme ek hak vermez: süre kaldığı yerden devam eder, en yakın sonuç korunur
  await waitForPlay(page);
  await expect(page.locator('.challenge-note')).toContainText('daha önce başlamıştın');
  await expect(page.locator('.status__value')).not.toContainText('henüz yok');
  await finish(page);
  await expect(page.locator('.scorecard')).toBeVisible();
  // Puan hesaplanmadan hemen yenilense bile sonuç korunur, yeni deneme açılmaz
  await page.reload();
  await expect(page.locator('.scorecard, .daily-done')).toBeVisible();
  await expect(page.getByRole('button', { name: /Başla/ })).toHaveCount(0);
  // Puan hesaplanınca günlük kayıt yazılır; sonraki açılışta özet görünür
  await expect(page.locator('.scorecard__parts, .daily-done')).toBeVisible();
  await page.reload();
  await expect(page.locator('.daily-done')).toContainText('Bugünkü sonucun');
  await expect(page.getByRole('button', { name: /Paylaş/ })).toBeEnabled();
});

test('same-device versus: two players, two rounds, final standings', async ({ page }) => {
  await page.goto('/karsilikli');
  await page.getByLabel('1. oyuncunun adı').fill('Ayşe');
  await page.getByLabel('2. oyuncunun adı').fill('Mehmet');
  await page.locator('.seg__opt', { hasText: /^3$/ }).click();
  await page.getByRole('button', { name: /Başlat/ }).click();

  for (let round = 0; round < 3; round++) {
    for (let turn = 0; turn < 2; turn++) {
      await expect(page.locator('.handoff__name')).toBeVisible();
      await page.getByRole('button', { name: 'Hazırım' }).click();
      await expect(page.locator('.board__count')).toBeVisible();
      await waitForPlay(page);
      await tile(page, 5);
      await op(page, turn === 0 ? '×' : '+');
      await tile(page, 4);
      await finish(page);
    }
    await expect(page.locator('.summary')).toBeVisible();
    await expect(page.locator('.rt__row')).toHaveCount(2);
    await page.locator('.party-stack > .btn--primary').click();
  }
  await expect(page.locator('.podium')).toBeVisible();
  await expect(page.locator('.standings tbody tr')).toHaveCount(2);
  await page.getByRole('button', { name: /Rövanş/ }).click();
  await expect(page.locator('.handoff__name')).toBeVisible();
});
