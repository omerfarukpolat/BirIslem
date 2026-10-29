import type { Page } from '@playwright/test';

/** Sayı yuvasına tıklar (0-5, soldan sağa, yukarıdan aşağıya) */
export const tile = (page: Page, slot: number) => page.locator('.tiles > *').nth(slot).click();

export const op = (page: Page, symbol: '+' | '−' | '×' | '÷') => page.locator('.op', { hasText: symbol }).click();

/** "Bitir" iki adımlıdır: ilk basış onay ister */
export async function finish(page: Page) {
  await page.locator('.actions .btn--primary').click();
  await page.locator('.actions .btn--dark').click();
}

export async function waitForPlay(page: Page) {
  await page.locator('.tiles button').first().waitFor({ timeout: 10_000 });
}

/** Görünürlük sorusunu yanıtlar (ana sayfadaki pencere, oyun sonu ya da sıralama) */
export async function choosePrivacy(page: Page, choice: 'Görünür' | 'Anonim') {
  await page.getByRole('button', { name: new RegExp(`^${choice}`) }).first().click();
  await page
    .locator('.toast')
    .filter({ hasText: choice === 'Anonim' ? 'Anonimsin' : 'adınla görünüyorsun' })
    .waitFor({ timeout: 10_000 });
}
