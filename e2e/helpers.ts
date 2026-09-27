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
