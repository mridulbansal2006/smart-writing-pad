import { expect, test } from '@playwright/test';

import { collectConsoleErrors } from './helpers';

const PAGES = [
  { link: 'Writing Pad', heading: 'Writing pad' },
  { link: 'Letters', heading: 'Trace capital letters' },
  { link: 'Numbers', heading: 'Trace numbers 0–9' },
  { link: 'Words', heading: 'Trace short words' },
  { link: 'Practice', heading: 'Practice on your own' },
  { link: 'Progress', heading: 'My progress' },
  { link: 'Review', heading: 'Teacher and parent review' },
  { link: 'Settings', heading: 'Accessibility settings' },
];

test('every screen is reachable from the main navigation', async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to Smart Writing Pad' })).toBeVisible();

  for (const target of PAGES) {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: target.link }).click();
    await expect(page.getByRole('heading', { level: 1, name: target.heading })).toBeVisible();
  }

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Smart Writing Pad');
  expect(errors).toEqual([]);
});

test('the dashboard activity cards open their exercise', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Letter tracing/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Trace capital letters' })).toBeVisible();
});

test('an unknown route falls back to the dashboard', async ({ page }) => {
  await page.goto('/#/not-a-real-page');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Smart Writing Pad');
});

test('no button or link on the dashboard is a dead end', async ({ page }) => {
  await page.goto('/');
  const links = page.getByRole('main').getByRole('link');
  const count = await links.count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    expect(href, 'every link points somewhere').toBeTruthy();
    expect(href).not.toBe('#');
  }
});
