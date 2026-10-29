import { expect, test, type Browser, type Page } from '@playwright/test';
import { choosePrivacy, finish, op, tile, waitForPlay } from './helpers';

// Firebase Emulator Suite gerekir: `npm run emulators` ve `E2E_EMULATORS=1 npm run e2e`
test.skip(process.env.E2E_EMULATORS !== '1', 'Firebase emülatörleri kapalı');

const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-birislem/databases/(default)/documents';

/** Emülatördeki belgeler (kurallar atlanarak): bir koleksiyonda bu oyuncunun kaç kaydı var */
async function count(page: Page, collection: 'scores' | 'privateScores', uid: string): Promise<number> {
  const res = await page.request.get(`${FIRESTORE}/${collection}?pageSize=500`, { headers: { Authorization: 'Bearer owner' } });
  const body = (await res.json()) as { documents?: { fields: { userId?: { stringValue: string } } }[] };
  return (body.documents ?? []).filter((d) => d.fields.userId?.stringValue === uid).length;
}

const hooks = (page: Page) =>
  page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).__emulatorGoogleSignIn === 'function', null, {
    timeout: 15_000,
  });

const uidOf = (page: Page) => page.evaluate(() => (window as unknown as { __emulatorUid: () => string | null }).__emulatorUid());

async function googleSignIn(page: Page, name: string) {
  await hooks(page);
  await page.evaluate((n) => (window as unknown as { __emulatorGoogleSignIn: (n: string) => Promise<unknown> }).__emulatorGoogleSignIn(n), name);
}

/** Rastgele bir soruda bir işlem yapıp bitirir */
async function playOne(page: Page) {
  await page.goto('/game');
  await waitForPlay(page);
  await tile(page, 5);
  await op(page, '+');
  await tile(page, 0);
  await finish(page);
}

async function publicPlayer(browser: Browser, name: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/');
  await googleSignIn(page, name);
  await expect(page.locator('.avatar-btn')).toBeVisible();
  await choosePrivacy(page, 'Görünür');
  await playOne(page);
  await expect(page.locator('.save-note')).toContainText('Skorun kaydedildi', { timeout: 10_000 });
  return page;
}

test('a visitor saves scores anonymously, sees only themselves and stays hidden from others', async ({ page, browser }) => {
  const other = await publicPlayer(browser, `Görünür ${Date.now()}`);

  await playOne(page);
  await page.getByRole('button', { name: 'Anonim kaydet' }).click();
  await expect(page.locator('.save-note')).toContainText('anonimsin, yalnızca sen görürsün', { timeout: 10_000 });
  const uid = await uidOf(page);
  expect(uid).toBeTruthy();
  expect(await count(page, 'privateScores', uid!)).toBe(1);
  expect(await count(page, 'scores', uid!)).toBe(0);

  // Sıralamada yalnızca kendisi: başkasının herkese açık skoru olsa da
  await page.goto('/leaderboard');
  await expect(page.locator('.lb-anon')).toContainText('Anonim moddasın');
  await expect(page.locator('.lb-list .lb-row')).toHaveCount(1);
  await expect(page.locator('.lb-row')).toContainText('sen');

  // Diğer oyuncunun sıralamasında anonim oyuncu yok
  await other.goto('/leaderboard');
  await expect(other.locator('.lb-row.is-me')).toBeVisible();
  await expect(other.locator('.lb-anon')).toHaveCount(0);
  await expect(other.locator('.lb-row', { hasText: 'Anonim' })).toHaveCount(0);

  // Sonraki oyunlar da sormadan, gizli olarak kaydedilir
  await playOne(page);
  await expect(page.locator('.save-note')).toContainText('anonimsin', { timeout: 10_000 });
  expect(await count(page, 'privateScores', uid!)).toBe(2);
});

test('a Google player can switch to anonymous mode and back', async ({ browser }) => {
  const name = `Gizlenen ${Date.now()}`;
  const page = await publicPlayer(browser, name);
  const uid = (await uidOf(page))!;
  expect(await count(page, 'scores', uid)).toBe(1);
  const watcher = await publicPlayer(browser, `İzleyen ${Date.now()}`);
  await watcher.goto('/leaderboard');
  await expect(watcher.locator('.lb-row', { hasText: name })).toHaveCount(1);

  await page.goto('/');
  await page.locator('.avatar-btn').click();
  await page.getByRole('radio', { name: 'Anonim' }).click();
  await expect(page.locator('.toast')).toContainText('Anonimsin', { timeout: 10_000 });
  expect(await count(page, 'scores', uid)).toBe(0);
  expect(await count(page, 'privateScores', uid)).toBe(1);

  await page.goto('/leaderboard');
  await expect(page.locator('.lb-anon')).toContainText('anonim modu kapatabilirsin');
  await expect(page.locator('.lb-list .lb-row')).toHaveCount(1);
  await watcher.reload();
  await expect(watcher.locator('.lb-row.is-me')).toBeVisible();
  await expect(watcher.locator('.lb-row', { hasText: name })).toHaveCount(0);

  await page.goto('/');
  await page.locator('.avatar-btn').click();
  await page.getByRole('radio', { name: 'Görünür' }).click();
  await expect(page.locator('.toast')).toContainText('adınla görünüyorsun', { timeout: 10_000 });
  expect(await count(page, 'scores', uid)).toBe(1);
  expect(await count(page, 'privateScores', uid)).toBe(0);
});

test('linking an anonymous player to Google keeps the account and its scores', async ({ page }) => {
  await playOne(page);
  await page.getByRole('button', { name: 'Anonim kaydet' }).click();
  await expect(page.locator('.save-note')).toContainText('anonimsin', { timeout: 10_000 });
  const uid = await uidOf(page);

  await googleSignIn(page, `Bağlanan ${Date.now()}`);
  expect(await uidOf(page)).toBe(uid);
  await page.goto('/leaderboard');
  // Artık Google hesabı ama anonim kalır: skorları yerinde, anonim mod kapatılabilir
  await expect(page.locator('.lb-anon')).toContainText('anonim modu kapatabilirsin');
  await expect(page.locator('.lb-list .lb-row')).toHaveCount(1);
  expect(await count(page, 'privateScores', uid!)).toBe(1);
});

test('an anonymous player can delete their record', async ({ page }) => {
  await playOne(page);
  await page.getByRole('button', { name: 'Anonim kaydet' }).click();
  await expect(page.locator('.save-note')).toContainText('anonimsin', { timeout: 10_000 });
  const uid = (await uidOf(page))!;

  await page.goto('/');
  await page.locator('.avatar-btn').click();
  await expect(page.locator('.account__name')).toHaveText('Anonim oyuncu');
  await page.getByRole('button', { name: 'Anonim kaydımı sil' }).click();
  await page.getByRole('button', { name: 'Kaydı sil' }).click();
  await expect(page.locator('.toast')).toContainText('Anonim kaydın ve skorların silindi');
  await expect(page.locator('.avatar-btn')).toHaveCount(0);
  expect(await count(page, 'privateScores', uid)).toBe(0);
});

test('an existing Google user is asked on first entry and can stay hidden', async ({ browser }) => {
  // Bu özellikten önce kaydolmuş oyuncu: skoru herkese açık, tercihi yok (bilinmiyor)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/');
  await googleSignIn(page, `Eski Oyuncu ${Date.now()}`);
  const dialog = page.locator('dialog[open]', { hasText: 'Sıralamada nasıl görünmek istersin?' });
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  // Kapatırsa bu oturumda yeniden sorulmaz; oyun sonunda soru ekranın içinde çıkar
  await dialog.getByRole('button', { name: 'Kapat' }).click();
  await expect(dialog).toHaveCount(0);
  await playOne(page);
  await expect(page.locator('.save-note')).toContainText('Skorun sıralamada nasıl görünsün?', { timeout: 10_000 });
  await choosePrivacy(page, 'Görünür');
  await expect(page.locator('.save-note')).toContainText('Skorun kaydedildi.', { timeout: 10_000 });
  const uid = (await uidOf(page))!;
  expect(await count(page, 'scores', uid)).toBe(1);

  // Tercihi sil: eski kullanıcı durumu (skor herkese açık, tercih bilinmiyor)
  await page.request.delete(`${FIRESTORE}/profiles/${uid}`, { headers: { Authorization: 'Bearer owner' } });
  await page.evaluate(() => localStorage.removeItem('birislem:privacy'));
  const next = await ctx.newPage();
  await next.goto('/');
  const ask = next.locator('dialog[open]', { hasText: 'Sıralamada nasıl görünmek istersin?' });
  await expect(ask).toBeVisible({ timeout: 10_000 });
  await choosePrivacy(next, 'Anonim');
  await expect(ask).toHaveCount(0);
  expect(await count(next, 'scores', uid)).toBe(0);
  expect(await count(next, 'privateScores', uid)).toBe(1);
  await next.locator('.avatar-btn').click();
  await expect(next.getByRole('radio', { name: 'Anonim' })).toHaveAttribute('aria-checked', 'true');
});

test('the leaderboard asks for visibility before showing anyone', async ({ page }) => {
  await page.goto('/leaderboard');
  await googleSignIn(page, `Kararsız ${Date.now()}`);
  await expect(page.locator('.save-note--choice')).toContainText('Sıralamada nasıl görünmek istersin?', { timeout: 10_000 });
  await expect(page.locator('.lb-list')).toHaveCount(0);
  await choosePrivacy(page, 'Anonim');
  await expect(page.locator('.lb-anon')).toContainText('Anonim moddasın');
});
