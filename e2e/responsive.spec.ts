import { expect, test } from '@playwright/test';

import { collectConsoleErrors, traceCurrentGuide } from './helpers';

const ROUTES = ['/', '/#/pad', '/#/letters', '/#/numbers', '/#/words', '/#/practice', '/#/progress', '/#/review', '/#/settings'];

test('no screen scrolls sideways at the current viewport', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator('#main')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // The horizontally scrolling nav strip and wide tables are inside their own
    // containers, so the page itself must not overflow.
    expect(overflow, `${route} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

test('the writing sheet fits the viewport and can be traced', async ({ page }) => {
  await page.goto('/#/letters');
  const canvas = page.getByRole('img', { name: /guide for capital A/ });
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error('could not measure the sheet');

  expect(box.width).toBeGreaterThan(200);
  expect(box.width).toBeLessThanOrEqual(viewport.width);

  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await expect(page.getByRole('meter', { name: 'Shape covered by your ink' })).toBeVisible();
});

test('the toolbar controls stay reachable', async ({ page }) => {
  await page.goto('/#/pad');
  for (const name of ['✏️ Pen', '🧽 Eraser', 'Clear', '💾 Save writing sample']) {
    const control = page.getByRole('button', { name });
    await expect(control).toBeVisible();
    const box = await control.boundingBox();
    // Large enough to hit reliably with a finger.
    expect(box!.height, `${name} is tall enough`).toBeGreaterThanOrEqual(40);
  }
});
