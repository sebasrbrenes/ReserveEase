import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login, nextOpenDate, pickDate } from './helpers.js';

// Serious and critical WCAG 2.1 A/AA problems on the main screens.
const check = async (page, name) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = violations
    .filter((v) => ['serious', 'critical'].includes(v.impact))
    .map((v) => `${name}: ${v.id} (${v.nodes.length}) ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(blocking, blocking.join('\n')).toEqual([]);
};

test('public booking pages have no serious accessibility problems', async ({ page }) => {
  await page.goto('/book/barberia-demo');
  await page.selectOption('#serviceId', 'svc-corte');
  await page.selectOption('#staffId', 'staff-ana');
  await pickDate(page, nextOpenDate(4));
  await expect(page.locator('fieldset button').first()).toBeVisible();
  await check(page, 'booking');
  await page.goto('/login');
  await check(page, 'login');
  await page.goto('/signup');
  await check(page, 'signup');
});

test('dashboard and settings have no serious accessibility problems', async ({ page }) => {
  await login(page, 'barberia@demo.test');
  await expect(page.getByRole('button', { name: 'Ver todas' })).toBeVisible();
  // Let the appointment cards finish fading in before measuring contrast.
  const card = page.getByTestId('day-list').locator(':scope > div').first();
  await expect(card).toHaveCSS('opacity', '1');
  await check(page, 'dashboard');
  await page.goto('/settings');
  await expect(page.locator('#businessName')).toHaveValue(/./);
  await check(page, 'settings');
});

// A 1280px screen at 200% zoom lays out like a 640px-wide viewport.
test.describe('at 200% zoom', () => {
  test.use({ viewport: { width: 640, height: 400 } });

  test('no screen scrolls sideways', async ({ page }) => {
    const noSideScroll = async (name) => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${name} is ${overflow}px wider than the screen`).toBeLessThanOrEqual(0);
    };
    await page.goto('/book/barberia-demo');
    await expect(page.locator('#serviceId')).toBeVisible();
    await noSideScroll('booking');
    await login(page, 'barberia@demo.test');
    await expect(page.getByRole('button', { name: 'Ver todas' })).toBeVisible();
    await noSideScroll('dashboard');
    await page.goto('/settings');
    await expect(page.locator('#businessName')).toHaveValue(/./);
    await noSideScroll('settings');
  });
});
