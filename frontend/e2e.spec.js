import { test, expect } from '@playwright/test';

test('runs glassbox-lang and exposes visualizer tabs', async ({ page }) => {
  await page.goto(process.env.BASE_URL || 'http://localhost');
  await page.getByRole('button', { name: '▶ Run' }).click();
  await expect(page.locator('.output')).toContainText('120', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Tokens' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'AST' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trace' })).toBeVisible();
});

test('opens the login modal', async ({ page }) => {
  await page.goto(process.env.BASE_URL || 'http://localhost');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Keep your work close.' })).toBeVisible();
});
