import { expect, test } from '@playwright/test';

import { collectConsoleErrors, traceCurrentGuide } from './helpers';

test('accessibility settings are applied and remembered', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/settings');

  await page.getByLabel('High contrast').check();
  await page.getByLabel('Larger buttons').check();
  await page.getByLabel('Reduce visual distractions').check();
  await page.getByLabel('Letter size').fill('1.5');
  await page.getByLabel('Tracing difficulty').selectOption('precise');

  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-contrast', 'high');
  await expect(html).toHaveAttribute('data-large-controls', 'true');
  await expect(html).toHaveAttribute('data-calm', 'true');

  await page.reload();
  await expect(html).toHaveAttribute('data-contrast', 'high');
  await expect(page.getByLabel('High contrast')).toBeChecked();
  await expect(page.getByLabel('Letter size')).toHaveValue('1.5');
  await expect(page.getByLabel('Tracing difficulty')).toHaveValue('precise');

  // The setting is shared with the exercise screens.
  await page.goto('/#/letters');
  await expect(page.getByLabel('How close do I have to stay?')).toHaveValue('precise');
  expect(errors).toEqual([]);
});

test('reduced distractions hides decorative content', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Handwriting practice, one stroke at a time')).toBeVisible();

  await page.goto('/#/settings');
  await page.getByLabel('Reduce visual distractions').check();
  await page.goto('/');
  await expect(page.getByText('Handwriting practice, one stroke at a time')).toBeHidden();
});

test('turning off start markers and ruled lines changes the sheet', async ({ page }) => {
  await page.goto('/#/letters');
  await expect(page.getByText('Start on the orange dot and follow the arrow.')).toBeVisible();
  const guide = page.locator('svg[aria-hidden="true"]').first();
  const markersBefore = await guide.locator('circle').count();
  expect(markersBefore).toBeGreaterThan(0);
  const linesBefore = await guide.locator('line').count();
  expect(linesBefore).toBeGreaterThan(0);

  await page.goto('/#/settings');
  await page.getByLabel('Show start dots and arrows').uncheck();
  await page.getByLabel('Show ruled writing lines').uncheck();

  await page.goto('/#/letters');
  expect(await guide.locator('circle').count()).toBe(0);
  expect(await guide.locator('line').count()).toBe(0);
});

test('the skip link reaches the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#main')).toBeVisible();
});

test('every exercise sheet has an accessible name', async ({ page }) => {
  for (const route of ['/#/pad', '/#/letters', '/#/numbers', '/#/words', '/#/practice']) {
    await page.goto(route);
    const sheet = page.getByRole('img').first();
    await expect(sheet).toBeVisible();
    const name = await sheet.getAttribute('aria-label');
    expect(name, `${route} canvas has a label`).toBeTruthy();
  }
});

test('deleting all data clears progress and samples', async ({ page }) => {
  await page.goto('/#/letters');
  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await page.getByRole('button', { name: '💾 Save writing sample' }).click();
  await expect(page.getByText('Picture saved. You can see it on the Review page.')).toBeVisible();

  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'Delete all data on this device' }).click();
  await page.getByRole('button', { name: 'Yes, delete everything' }).click();
  await expect(page.getByText(/All locally stored settings, progress and writing samples/)).toBeVisible();

  await page.goto('/#/progress');
  await expect(page.getByText('Nothing has been recorded on this device yet.')).toBeVisible();
  await page.goto('/#/review');
  await expect(page.getByText('No samples saved yet.')).toBeVisible();
});

test('progress and review export files', async ({ page }) => {
  await page.goto('/#/letters');
  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await expect(page.getByText('Well done. You covered the whole shape.')).toBeVisible();

  await page.goto('/#/progress');
  const csvPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '⬇️ Export history (CSV)' }).click();
  expect((await csvPromise).suggestedFilename()).toBe('writing-practice-history.csv');

  await page.goto('/#/review');
  const summaryPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '⬇️ Export summary (text)' }).click();
  expect((await summaryPromise).suggestedFilename()).toBe('writing-practice-summary.txt');
});

test('an adult can flag a letter as needing more practice', async ({ page }) => {
  await page.goto('/#/letters');
  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await expect(page.getByText('Well done. You covered the whole shape.')).toBeVisible();

  await page.goto('/#/review');
  await expect(page.getByText('Nothing listed.')).toBeVisible();
  await page.getByRole('checkbox', { name: /Flag A as needing more practice/ }).check();
  await expect(page.getByRole('listitem').filter({ hasText: 'flagged' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Flag A as needing more practice/ })).toBeChecked();
});
