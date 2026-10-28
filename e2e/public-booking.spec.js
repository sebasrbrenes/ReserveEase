import { expect, test } from '@playwright/test';
import { nextOpenDate, pickDate } from './helpers.js';

test('a visitor books a free time and cannot take the same time twice', async ({ page }) => {
  const name = `Visitante ${Date.now()}`;
  await page.goto('/book/barberia-demo');
  await expect(page.getByText('Barbería Demo', { exact: true })).toBeVisible();

  await page.selectOption('#serviceId', 'svc-corte');
  await page.selectOption('#staffId', 'staff-ana');
  await pickDate(page, nextOpenDate(3));
  const slots = page.locator('fieldset button');
  await expect(slots.first()).toBeVisible();
  const chosen = await slots.first().textContent();
  await slots.first().click();

  await page.fill('#clientName', name);
  await page.fill('#email', 'visitante@example.com');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/booking\/success\/barberia-demo/);
  await expect(page.getByText('Tu cita está confirmada')).toBeVisible();
  await expect(page.getByText(chosen.trim())).toBeVisible();

  // The same time is no longer offered for that staff member.
  await page.goto('/book/barberia-demo');
  await page.selectOption('#serviceId', 'svc-corte');
  await page.selectOption('#staffId', 'staff-ana');
  await pickDate(page, nextOpenDate(3));
  await expect(page.locator('fieldset button').first()).toBeVisible();
  await expect(page.locator('fieldset button', { hasText: new RegExp(`^${chosen.trim()}$`) })).toHaveCount(0);
});

test('an unknown booking link shows a clear message', async ({ page }) => {
  await page.goto('/book/no-existe-123');
  await expect(page.getByText('No encontramos esta página de reservas')).toBeVisible();
});
