import { expect, test } from '@playwright/test';

import { collectConsoleErrors, drawStrokes, readGuidePaths, traceCurrentGuide } from './helpers';

test('tracing over the guide is measured and counted as met', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/letters');
  await expect(page.getByRole('img', { name: /guide for capital A/ })).toBeVisible();

  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await expect(page.getByText('Trace over the letter first, then press Check my tracing.')).toBeVisible();

  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();

  await expect(page.getByText('Well done. You covered the whole shape.')).toBeVisible();
  const coverage = page.getByRole('meter', { name: 'Shape covered by your ink' });
  await expect(coverage).toBeVisible();
  expect(Number(await coverage.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(75);

  const onGuide = page.getByRole('meter', { name: 'Your ink that stayed on the shape' });
  expect(Number(await onGuide.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(60);
  expect(errors).toEqual([]);
});

test('ink still registers when the sheet sits at the very top of the viewport', async ({ page }) => {
  // Regression test: a sticky page header used to cover the top of the sheet
  // and swallow the pointer events for strokes drawn there, so part of a
  // child's tracing simply went missing.
  await page.goto('/#/letters');
  await page.locator('svg[aria-hidden="true"]').first().evaluate((el) => el.scrollIntoView({ block: 'start' }));

  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();

  const coverage = page.getByRole('meter', { name: 'Shape covered by your ink' });
  expect(Number(await coverage.getAttribute('aria-valuenow'))).toBeGreaterThanOrEqual(75);
});

test('scribbling over the sheet does not pass the exercise', async ({ page }) => {
  await page.goto('/#/letters');
  const canvas = page.getByRole('img', { name: /guide for capital A/ });
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');

  // Vertical zig-zags across the whole sheet touch most of the letter, but
  // most of the ink is nowhere near it.
  const strokes = [];
  for (let i = 0; i <= 20; i++) {
    const x = box.x + (box.width * i) / 20;
    strokes.push([
      { x, y: box.y + box.height * 0.1 },
      { x, y: box.y + box.height * 0.9 },
    ]);
  }
  await drawStrokes(page, strokes);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();

  await expect(page.getByText('Good try. Some parts of the shape still need ink.')).toBeVisible();
  const onGuide = page.getByRole('meter', { name: 'Your ink that stayed on the shape' });
  expect(Number(await onGuide.getAttribute('aria-valuenow'))).toBeLessThan(60);
});

test('progress survives a page reload', async ({ page }) => {
  await page.goto('/#/letters');
  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await expect(page.getByText('Well done. You covered the whole shape.')).toBeVisible();

  await page.goto('/#/progress');
  await expect(page.getByText('Exercises attempted')).toBeVisible();
  const attempts = page.locator('dt', { hasText: 'Exercises attempted' }).locator('+ dd');
  await expect(attempts).toHaveText('1');

  await page.reload();
  await expect(attempts).toHaveText('1');
  await expect(page.locator('dt', { hasText: 'Traces that met the target' }).locator('+ dd')).toHaveText('1');

  // And the letter picker marks A as traced.
  await page.goto('/#/letters');
  await expect(page.getByRole('button', { name: 'A already traced' })).toBeVisible();
});

test('letters, numbers and words all present a guide to trace', async ({ page }) => {
  await page.goto('/#/letters');
  expect((await readGuidePaths(page)).length).toBeGreaterThan(0);
  await expect(page.getByText('Slide down, slide down, then across the middle.')).toBeVisible();

  await page.getByRole('button', { name: 'a–z', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Trace small letters' })).toBeVisible();
  await expect(page.getByRole('img', { name: /guide for small a/ })).toBeVisible();

  await page.goto('/#/numbers');
  await expect(page.getByRole('img', { name: /guide for the number 0/ })).toBeVisible();
  await page.getByRole('button', { name: '7', exact: true }).click();
  await expect(page.getByRole('img', { name: /guide for the number 7/ })).toBeVisible();
  expect((await readGuidePaths(page)).length).toBeGreaterThan(0);

  await page.goto('/#/words');
  await expect(page.getByRole('img', { name: /guide for the word cat/ })).toBeVisible();
  // Three letters, so more guide strokes than a single character has.
  expect((await readGuidePaths(page)).length).toBeGreaterThanOrEqual(4);
});

test('the guide can be faded and hidden', async ({ page }) => {
  await page.goto('/#/letters');
  const before = (await readGuidePaths(page)).length;
  expect(before).toBeGreaterThan(0);

  await page.getByLabel('Guide letter').selectOption('off');
  // With the guide hidden only the ruled lines remain, and they are not paths.
  expect((await readGuidePaths(page)).length).toBe(0);

  await page.getByLabel('Guide letter').selectOption('faint');
  expect((await readGuidePaths(page)).length).toBe(before);
});

test('next and back move through the alphabet', async ({ page }) => {
  await page.goto('/#/letters');
  await expect(page.getByRole('button', { name: '← Back' })).toBeDisabled();

  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByRole('img', { name: /guide for capital B/ })).toBeVisible();
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.getByRole('img', { name: /guide for capital A/ })).toBeVisible();
});

test('practice mode records an attempt without measuring it', async ({ page }) => {
  await page.goto('/#/practice');
  const canvas = page.getByRole('img', { name: /Blank writing sheet for practising capital A/ });
  await expect(canvas).toBeVisible();
  // No guide to trace in this mode.
  expect((await readGuidePaths(page)).length).toBe(0);
  await expect(page.getByRole('img', { name: 'Example of capital A' })).toBeVisible();

  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  await drawStrokes(page, [
    [
      { x: box.x + box.width * 0.4, y: box.y + box.height * 0.7 },
      { x: box.x + box.width * 0.5, y: box.y + box.height * 0.3 },
      { x: box.x + box.width * 0.6, y: box.y + box.height * 0.7 },
    ],
  ]);
  await page.getByRole('button', { name: '🙂 Okay' }).click();
  await expect(page.getByText('Attempt saved to the practice history.')).toBeVisible();

  await page.goto('/#/review');
  await expect(page.getByRole('cell', { name: 'not measured' }).first()).toBeVisible();

  // The rating column is only shown once the table has room for it.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('cell', { name: 'okay' })).toBeVisible();
});

test('a tracing sample can be saved and reviewed', async ({ page }) => {
  await page.goto('/#/letters');
  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '💾 Save writing sample' }).click();
  await expect(page.getByText('Picture saved. You can see it on the Review page.')).toBeVisible();

  await page.goto('/#/review');
  await expect(page.getByRole('img', { name: 'Writing sample for A' })).toBeVisible();
});
