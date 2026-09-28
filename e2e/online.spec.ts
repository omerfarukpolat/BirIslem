import { expect, test, type Browser, type Page } from '@playwright/test';
import { finish, op, tile, waitForPlay } from './helpers';

// Firebase Emulator Suite gerekir: `npm run emulators` ve `E2E_EMULATORS=1 npm run e2e`
test.skip(process.env.E2E_EMULATORS !== '1', 'Firebase emülatörleri kapalı');

async function player(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  return ctx.newPage();
}

test('two players finish a room match and see the same standings', async ({ browser }) => {
  const host = await player(browser);
  const guest = await player(browser);

  await host.goto('/oda');
  await host.getByPlaceholder('Örn. Deniz').fill('Ayşe');
  const create = host.locator('.online-card').first();
  await create.locator('.seg__opt', { hasText: /^3$/ }).click();
  await create.locator('.seg__opt', { hasText: '30 sn' }).click();
  await host.getByRole('button', { name: 'Oda kur' }).click();
  await host.waitForURL(/\/oda\/[A-Z0-9]{5}$/);
  const code = host.url().split('/').pop()!;

  await guest.goto('/oda');
  await guest.getByPlaceholder('Örn. Deniz').fill('Mehmet');
  await guest.getByLabel('Oda kodu').fill(code.toLowerCase());
  await guest.getByRole('button', { name: 'Katıl' }).click();
  await expect(guest.locator('.lobby')).toBeVisible();
  await expect(host.locator('.lobby__players li')).toHaveCount(2);

  await host.getByRole('button', { name: /Maçı başlat/ }).click();
  for (let round = 1; round <= 3; round++) {
    await Promise.all([waitForPlay(host), waitForPlay(guest)]);
    await tile(host, 5);
    await op(host, '×');
    await tile(host, 4);
    await finish(host);
    await expect(host.locator('.waiting')).toBeVisible();
    await tile(guest, 5);
    await op(guest, '+');
    await tile(guest, 0);
    await finish(guest);
    if (round < 3) {
      await expect(guest.locator('.summary')).toBeVisible();
      // Rakibin sonuca nasıl ulaştığı da görünür (sonuçlar Firestore'dan gelir)
      await expect(guest.locator('.rt__path')).toHaveCount(2);
      await expect(guest.locator('.rt__path', { hasText: '×' })).toHaveCount(1);
      await host.getByRole('button', { name: /Sonraki tur/ }).click();
    }
  }
  await expect(host.locator('.podium')).toBeVisible();
  await expect(guest.locator('.podium')).toBeVisible();
  const table = (p: Page) => p.locator('.standings tbody').innerText();
  expect(await table(host)).toEqual(await table(guest));

  await host.getByRole('button', { name: /Rövanş/ }).click();
  await expect(guest.locator('.lobby')).toBeVisible();
});
