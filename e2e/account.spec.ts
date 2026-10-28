import { expect, test, type Page } from '@playwright/test';
import { finish, op, tile, waitForPlay } from './helpers';

// Firebase Emulator Suite gerekir: `npm run emulators` ve `E2E_EMULATORS=1 npm run e2e`
test.skip(process.env.E2E_EMULATORS !== '1', 'Firebase emülatörleri kapalı');

const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-birislem/databases/(default)/documents';

/** Emülatördeki skor belgeleri (kurallar atlanarak) */
async function scoresOf(page: Page, uid: string): Promise<number> {
  const res = await page.request.get(`${FIRESTORE}/scores?pageSize=300`, { headers: { Authorization: 'Bearer owner' } });
  const body = (await res.json()) as { documents?: { fields: { userId?: { stringValue: string } } }[] };
  return (body.documents ?? []).filter((d) => d.fields.userId?.stringValue === uid).length;
}

test('a signed-in player can delete the account and all scores', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).__emulatorGoogleSignIn === 'function', null, { timeout: 15_000 });
  const uid = await page.evaluate(async () => {
    const signIn = (window as unknown as { __emulatorGoogleSignIn: (n: string) => Promise<{ user: { uid: string } }> }).__emulatorGoogleSignIn;
    return (await signIn(`Silinecek ${Date.now()}`)).user.uid;
  });
  await expect(page.locator('.avatar-btn')).toBeVisible();

  await page.goto('/game');
  await waitForPlay(page);
  await tile(page, 5);
  await op(page, '+');
  await tile(page, 0);
  await finish(page);
  await expect(page.locator('.save-note')).toContainText('Skorun kaydedildi', { timeout: 10_000 });
  expect(await scoresOf(page, uid)).toBe(1);

  await page.goto('/');
  await page.locator('.avatar-btn').click();
  await page.getByRole('button', { name: 'Hesabımı sil' }).click();
  await page.getByRole('button', { name: 'Hesabı sil' }).click();
  await expect(page.locator('.toast')).toContainText('Hesabın ve skorların silindi');
  await expect(page.locator('.signin')).toBeVisible();
  expect(await scoresOf(page, uid)).toBe(0);
});

test('the leaderboard ranks by the sum of the best 20 games by default', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).__emulatorGoogleSignIn === 'function', null, { timeout: 15_000 });
  const name = `Sıralama ${Date.now()}`;
  await page.evaluate((n) => (window as unknown as { __emulatorGoogleSignIn: (n: string) => Promise<unknown> }).__emulatorGoogleSignIn(n), name);
  await expect(page.locator('.avatar-btn')).toBeVisible();

  let total = 0;
  for (let i = 0; i < 2; i++) {
    await page.goto('/game');
    await waitForPlay(page);
    await tile(page, 5);
    await op(page, '+');
    await tile(page, 0);
    await finish(page);
    await expect(page.locator('.save-note')).toContainText('Skorun kaydedildi', { timeout: 10_000 });
    total += Number((await page.locator('.scorecard__score').innerText()).replace(/\D/g, ''));
  }

  await page.goto('/leaderboard');
  await expect(page.getByRole('radio', { name: 'En iyi 20' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.lb-sort__note')).toContainText('en iyi 20 oyununun toplamı');
  const row = page.locator('.lb-row', { hasText: name });
  await expect(row).toContainText('2 oyun');
  await expect(row.locator('.lb-value')).toHaveText(String(total));
});

test('the iOS app shell hides Google sign-in but keeps the game', async ({ page }) => {
  await page.goto('/?app=ios');
  await expect(page.locator('.hero h1')).toBeVisible();
  // İşaret adresten silinir, cihazda saklanır
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await page.waitForTimeout(2500); // giriş düğmesi boşta kalınca hazırlanırdı
  await expect(page.locator('.signin')).toHaveCount(0);
  await page.goto('/leaderboard');
  await expect(page.locator('.topbar__title')).toHaveText('Sıralama');
  await expect(page.getByRole('button', { name: /Google ile giriş/ })).toHaveCount(0);
});
