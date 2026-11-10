import { test } from '@playwright/test';

import { drawStrokes, readGuidePaths, traceCurrentGuide } from './helpers';

/**
 * Captures the screenshots used in the README and docs. Run with
 * `npm run screenshots`. Every image is a real screen of the running app with
 * data produced by driving the UI — nothing is mocked up.
 */

const DIR = 'docs/screenshots';
const shot = (name: string) => ({ path: `${DIR}/${name}.png`, fullPage: false as const });

test('capture every screen', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Nickname for this device (optional)').fill('Class 3 tablet');
  await page.screenshot(shot('01-dashboard-empty'));

  // Writing pad with some free writing on it.
  await page.goto('/#/pad');
  const pad = page.getByRole('img', { name: 'Blank writing pad' });
  await pad.scrollIntoViewIfNeeded();
  const padBox = (await pad.boundingBox())!;
  const at = (fx: number, fy: number) => ({
    x: padBox.x + padBox.width * fx,
    y: padBox.y + padBox.height * fy,
  });
  await drawStrokes(page, [
    [at(0.12, 0.3), at(0.14, 0.1), at(0.14, 0.26)],
    [at(0.18, 0.26), at(0.2, 0.14), at(0.24, 0.26), at(0.22, 0.18), at(0.26, 0.16)],
    [at(0.3, 0.1), at(0.3, 0.26)],
    [at(0.34, 0.16), at(0.36, 0.26), at(0.4, 0.14)],
  ]);
  await page.screenshot(shot('02-writing-pad'));

  // Letter tracing, traced and checked.
  await page.goto('/#/letters');
  await page.screenshot(shot('03-letter-tracing'));
  await traceCurrentGuide(page);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await page.getByText('Well done. You covered the whole shape.').waitFor();
  await page.screenshot({ path: `${DIR}/04-tracing-measured.png`, fullPage: true });

  // Number tracing on a lowercase-height digit.
  await page.goto('/#/numbers');
  await page.getByRole('button', { name: '3', exact: true }).click();
  await page.screenshot(shot('05-number-tracing'));

  // Word tracing.
  await page.goto('/#/words');
  await page.getByRole('button', { name: 'milk', exact: true }).click();
  await traceCurrentGuide(page);
  await page.screenshot(shot('06-word-tracing'));

  // Practice mode with the reference beside a blank sheet.
  await page.goto('/#/practice');
  await page.getByRole('button', { name: 'a–z', exact: true }).click();
  const sheet = page.getByRole('img', { name: /Blank writing sheet/ });
  await sheet.scrollIntoViewIfNeeded();
  const sheetBox = (await sheet.boundingBox())!;
  await drawStrokes(page, [
    [
      { x: sheetBox.x + sheetBox.width * 0.42, y: sheetBox.y + sheetBox.height * 0.42 },
      { x: sheetBox.x + sheetBox.width * 0.5, y: sheetBox.y + sheetBox.height * 0.38 },
      { x: sheetBox.x + sheetBox.width * 0.55, y: sheetBox.y + sheetBox.height * 0.5 },
      { x: sheetBox.x + sheetBox.width * 0.48, y: sheetBox.y + sheetBox.height * 0.62 },
      { x: sheetBox.x + sheetBox.width * 0.42, y: sheetBox.y + sheetBox.height * 0.52 },
    ],
  ]);
  await page.getByRole('button', { name: '🙂 Okay' }).click();
  await page.screenshot(shot('07-practice-mode'));

  // Build up a little real history for the dashboards.
  for (const letter of ['B', 'C', 'D']) {
    await page.goto('/#/letters');
    await page.getByRole('button', { name: letter, exact: true }).click();
    await traceCurrentGuide(page);
    await page.getByRole('button', { name: '✓ Check my tracing' }).click();
    await page.getByRole('meter', { name: 'Shape covered by your ink' }).waitFor();
    if (letter === 'C') await page.getByRole('button', { name: '💾 Save writing sample' }).click();
  }
  await page.goto('/#/letters');
  await page.getByRole('button', { name: 'G', exact: true }).click();
  // A deliberately partial trace, so "worth revisiting" has a real entry.
  const partial = await readGuidePaths(page);
  await drawStrokes(page, [partial[0]!.slice(0, Math.round(partial[0]!.length / 3))]);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await page.getByRole('meter', { name: 'Shape covered by your ink' }).waitFor();
  await page.goto('/#/letters');
  await page.getByRole('button', { name: 'G', exact: true }).click();
  const partial2 = await readGuidePaths(page);
  await drawStrokes(page, [partial2[0]!.slice(0, Math.round(partial2[0]!.length / 2))]);
  await page.getByRole('button', { name: '✓ Check my tracing' }).click();
  await page.getByRole('meter', { name: 'Shape covered by your ink' }).waitFor();

  await page.goto('/#/progress');
  await page.screenshot({ path: `${DIR}/08-progress.png`, fullPage: true });

  await page.goto('/#/review');
  await page.screenshot({ path: `${DIR}/09-review.png`, fullPage: true });

  await page.goto('/#/settings');
  await page.screenshot({ path: `${DIR}/10-settings.png`, fullPage: true });

  // High contrast mode on the tracing screen.
  await page.getByLabel('High contrast').check();
  await page.getByLabel('Larger buttons').check();
  await page.goto('/#/letters');
  await page.getByRole('button', { name: 'E', exact: true }).click();
  await page.screenshot(shot('11-high-contrast'));
  await page.goto('/#/settings');
  await page.getByLabel('High contrast').uncheck();
  await page.getByLabel('Larger buttons').uncheck();

  // Mobile layout.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/letters');
  await page.getByRole('button', { name: 'S', exact: true }).click();
  await page.screenshot(shot('12-mobile-tracing'));
  await page.goto('/');
  await page.screenshot(shot('13-mobile-dashboard'));
});

/**
 * Close-ups of the trickiest glyph shapes. The unit tests check that every
 * stroke sits inside its writing lines; these images are how a human checks
 * that the shapes actually read as letters.
 */
test('capture glyph close-ups', async ({ page }) => {
  const targets = [
    { route: '/#/letters', case: 'A–Z', chars: ['A', 'B', 'G', 'J', 'K', 'Q', 'R', 'S', 'W'] },
    { route: '/#/letters', case: 'a–z', chars: ['a', 'e', 'f', 'g', 'j', 'k', 's', 'u', 'w', 'y'] },
    { route: '/#/numbers', case: null, chars: ['2', '3', '4', '5', '6', '8', '9'] },
  ];

  for (const group of targets) {
    await page.goto(group.route);
    if (group.case) await page.getByRole('button', { name: group.case, exact: true }).click();
    for (const char of group.chars) {
      await page.getByRole('button', { name: char, exact: true }).click();
      const sheet = page.getByRole('img', { name: /Writing sheet with a guide/ });
      await sheet.scrollIntoViewIfNeeded();
      const prefix = /[A-Z]/.test(char) ? 'upper' : /[a-z]/.test(char) ? 'lower' : 'digit';
      await sheet.screenshot({ path: `${DIR}/glyphs/${prefix}-${char}.png` });
    }
  }
});
