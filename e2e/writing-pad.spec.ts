import { expect, test } from '@playwright/test';

import { collectConsoleErrors, drawStrokes } from './helpers';

/** Draw a short diagonal somewhere inside the pad. */
async function scribble(page: import('@playwright/test').Page, offset = 0) {
  const canvas = page.getByRole('img', { name: 'Blank writing pad' });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  await drawStrokes(page, [
    [
      { x: box.x + box.width * (0.2 + offset), y: box.y + box.height * 0.3 },
      { x: box.x + box.width * (0.3 + offset), y: box.y + box.height * 0.5 },
      { x: box.x + box.width * (0.4 + offset), y: box.y + box.height * 0.35 },
    ],
  ]);
}

test('drawing, undo, redo and clear all work on the free pad', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/#/pad');

  const undo = page.getByRole('button', { name: '↶ Undo' });
  const redo = page.getByRole('button', { name: '↷ Redo' });
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeVisible();

  await scribble(page);
  // The empty-state hint disappears, which means a stroke was recorded.
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeHidden();
  await expect(undo).toBeEnabled();

  await undo.click();
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeVisible();
  await expect(redo).toBeEnabled();

  await redo.click();
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeHidden();

  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the eraser removes a stroke that has been drawn', async ({ page }) => {
  await page.goto('/#/pad');
  await scribble(page);
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeHidden();

  await page.getByRole('button', { name: '🧽 Eraser' }).click();
  await scribble(page);
  await expect(page.getByText('Start writing anywhere on the pad.')).toBeVisible();
});

test('pen colour and thickness are remembered across a reload', async ({ page }) => {
  await page.goto('/#/pad');
  await page.getByRole('button', { name: 'Green pen' }).click();
  await page.getByLabel('Thickness').fill('15');

  await page.reload();
  await expect(page.getByRole('button', { name: 'Green pen' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Thickness')).toHaveValue('15');
});

test('saving a sample records it for review, and nothing is recorded before that', async ({ page }) => {
  await page.goto('/#/review');
  await expect(page.getByText('No samples saved yet.')).toBeVisible();

  await page.goto('/#/pad');
  await page.getByRole('button', { name: '💾 Save writing sample' }).click();
  await expect(page.getByText('Write something on the pad first.')).toBeVisible();

  await scribble(page);
  await page.getByRole('button', { name: '💾 Save writing sample' }).click();
  await expect(page.getByText('Saved. You can find it on the Review page.')).toBeVisible();

  await page.goto('/#/review');
  const sample = page.getByRole('img', { name: 'Writing sample for free writing' });
  await expect(sample).toBeVisible();
  // A real PNG was stored, not a placeholder.
  await expect(sample).toHaveAttribute('src', /^data:image\/png;base64,/);
});

test('downloading the pad produces a PNG file', async ({ page }) => {
  await page.goto('/#/pad');
  await scribble(page);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '⬇️ Download as image' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^smart-writing-pad-free-writing-.*\.png$/);
});
