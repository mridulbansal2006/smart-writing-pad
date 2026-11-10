import { expect, type Page } from '@playwright/test';

export type SheetPoint = { x: number; y: number };

/** Wait until an element's position stops changing between animation frames. */
export async function waitForStableBox(locator: ReturnType<Page['locator']>): Promise<void> {
  let previous = '';
  for (let attempt = 0; attempt < 20; attempt++) {
    const box = await locator.boundingBox();
    const current = JSON.stringify(box);
    if (current === previous) return;
    previous = current;
    await locator.page().waitForTimeout(50);
  }
}

/**
 * Read the guide paths straight out of the rendered SVG and convert them to
 * screen coordinates. The tests therefore trace exactly the path the child is
 * shown, with no layout maths duplicated from the application.
 */
export async function readGuidePaths(page: Page): Promise<SheetPoint[][]> {
  const svg = page.locator('svg[aria-hidden="true"]').first();
  await expect(svg).toBeVisible();
  // Coordinates are only usable once the sheet is on screen and has stopped
  // moving, so wait for the box to repeat before trusting it.
  await svg.scrollIntoViewIfNeeded();
  await waitForStableBox(svg);

  const viewBox = await svg.getAttribute('viewBox');
  const box = await svg.boundingBox();
  if (!viewBox || !box) throw new Error('Could not measure the guide layer');
  const [, , sheetWidth, sheetHeight] = viewBox.split(' ').map(Number);

  const pathData = await svg.locator('path').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('d') ?? ''),
  );

  return pathData
    .filter((d) => d.length > 0)
    .map((d) =>
      d
        .split(/(?=[ML])/)
        .map((command) => command.trim().replace(/^[ML]\s*/, ''))
        .filter(Boolean)
        .map((pair) => {
          const [x, y] = pair.split(/\s+/).map(Number);
          return {
            x: box.x + (x! / sheetWidth!) * box.width,
            y: box.y + (y! / sheetHeight!) * box.height,
          };
        }),
    );
}

/** Drag the mouse along a path, one stroke at a time. */
export async function drawStrokes(page: Page, strokes: SheetPoint[][]): Promise<void> {
  for (const stroke of strokes) {
    const [first, ...rest] = stroke;
    if (!first) continue;
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (const point of rest) await page.mouse.move(point.x, point.y);
    await page.mouse.up();
  }
}

/** Trace over the guide currently on screen. */
export async function traceCurrentGuide(page: Page): Promise<void> {
  await drawStrokes(page, await readGuidePaths(page));
}

/** Collect console errors so a test can assert the page stayed clean. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}
