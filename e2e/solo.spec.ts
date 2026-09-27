import { expect, test } from '@playwright/test';
import { finish, op, tile } from './helpers';

// 2 · 5 · 6 · 8 · 9 · 45 → 354  (45 × 8 = 360, 360 − 6 = 354)
const PUZZLE = '/game?soru=2-5-6-8-9-45-354';

test('reaches the target exactly and shows the score and solution', async ({ page }) => {
  await page.goto(PUZZLE);
  await expect(page.locator('.board .sr-only')).toHaveText('354');

  await tile(page, 5); // 45
  await op(page, '×');
  await tile(page, 3); // 8 → 360, sonuç otomatik seçili
  await expect(page.locator('.tiles > *').nth(3)).toHaveText(/360/);
  await expect(page.locator('.tiles > *').nth(3)).toHaveClass(/is-selected/);
  await op(page, '−');
  await tile(page, 2); // 6 → 354

  await expect(page.locator('.stamp')).toBeVisible();
  await expect(page.locator('.scorecard__verdict')).toHaveText('Tam isabet!', { timeout: 5000 });
  const score = Number((await page.locator('.scorecard__score').innerText()).replace(/\D/g, ''));
  expect(score).toBeGreaterThanOrEqual(120);
  expect(score).toBeLessThanOrEqual(125);
  await expect(page.locator('.compare')).toContainText('45 × 8 = 360');
  await expect(page.locator('.compare__same')).toBeVisible();
});

test('blocks invalid operations and keeps the closest result after undo', async ({ page }) => {
  await page.goto(PUZZLE);
  await tile(page, 0); // 2
  await op(page, '−');
  // 2'den büyük sayılar çıkarma için soluk
  await expect(page.locator('.tiles > *').nth(5)).toHaveClass(/is-blocked/);
  // Soluk sayı aria-disabled; yine de basılınca nedenini söyler
  await page.locator('.tiles > *').nth(5).click({ force: true });
  await expect(page.locator('.hint')).toContainText('Sonuç eksi olamaz');

  await tile(page, 0); // seçimi bırak
  await tile(page, 5); // 45
  await op(page, '×');
  await tile(page, 4); // 9 → 405 (fark 51)
  await expect(page.locator('.status__value')).toContainText('405');
  await page.getByRole('button', { name: 'Geri al' }).click();
  await expect(page.locator('.tiles > *').nth(5)).toHaveText(/45/);
  // En yakın sonuç geri almada kaybolmaz
  await expect(page.locator('.status__value')).toContainText('405');

  await finish(page);
  await expect(page.locator('.scorecard__verdict')).toContainText('51 fark');
});

test('can be played with the keyboard', async ({ page }) => {
  await page.goto(PUZZLE);
  await page.keyboard.press('6'); // 45
  await page.keyboard.press('*');
  await page.keyboard.press('4'); // 8
  await page.keyboard.press('-');
  await page.keyboard.press('3'); // 6
  await expect(page.locator('.scorecard__verdict')).toHaveText('Tam isabet!', { timeout: 5000 });
});

test('challenge links show the rival and the verdict', async ({ page }) => {
  await page.goto(`${PUZZLE}&t=60&i=0&rakip=Deniz&puan=90&fark=2&sure=12.5`);
  await expect(page.locator('.topbar__title')).toHaveText('Meydan okuma');
  await expect(page.locator('.challenge-note')).toContainText('Deniz');
  await page.locator('.tiles button').first().waitFor({ timeout: 6000 });
  await tile(page, 5);
  await op(page, '×');
  await tile(page, 3);
  await op(page, '−');
  await tile(page, 2);
  await expect(page.locator('.challenge-verdict')).toContainText('Deniz geride kaldı', { timeout: 5000 });
  await expect(page.locator('.save-note')).toContainText('sıralamaya kaydedilmez');
});
