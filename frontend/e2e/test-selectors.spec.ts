import { test } from '@playwright/test';
import { setupAuthenticatedMocks } from './helpers/auth';

test('debug selectors', async ({ page }) => {
  await setupAuthenticatedMocks(page);
  await page.goto('/settings/profile');
  await page.waitForTimeout(2000); // Wait for render
  
  // Print all input elements
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const name = await input.getAttribute('name');
    const id = await input.getAttribute('id');
    const type = await input.getAttribute('type');
    console.log(`Input: id="${id}", name="${name}", type="${type}"`);
  }
});
