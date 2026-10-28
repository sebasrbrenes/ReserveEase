// Findings of the QA report of 2026-10-13 (H01, H02, H03, H08).
import { expect, test } from '@playwright/test';
import { login, nextOpenDate, pickDate } from './helpers.js';

test('H01: the dashboard cards say they are loading instead of showing zeros', async ({ page }) => {
  await login(page, 'salon@demo.test');
  // Hold the business until the cards have been checked.
  let release;
  const held = new Promise((resolve) => { release = resolve; });
  await page.route('**/api/v1/me/business/sync', async (route) => {
    await held;
    await route.continue();
  });
  await page.reload();
  const metrics = page.getByTestId('metrics');
  await expect(metrics).toHaveAttribute('aria-busy', 'true');
  await expect(metrics).not.toContainText('0,00');
  await expect(metrics).not.toContainText('Sin personal');
  await expect(page.getByRole('button', { name: 'Nueva cita' })).toHaveAttribute('title', 'Cargando tu negocio...');
  release();
  await expect(metrics).toHaveAttribute('aria-busy', 'false');
  await expect(metrics).toContainText('₡');
});

test('H02: the appointment form is a modal dialog that keeps and returns the focus', async ({ page }) => {
  await login(page, 'salon@demo.test');
  const open = page.getByRole('button', { name: 'Nueva cita' });
  await expect(open).toBeEnabled();
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Nueva cita' });
  // The dialog element only wraps fixed layers; its form is what shows.
  await expect(dialog.locator('form')).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');

  // Tab and Shift+Tab never leave the dialog.
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
});

test('H03: Back on a settings page opened directly goes to the dashboard', async ({ page }) => {
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Volver' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('H08: a short phone is explained next to the field and nothing is booked', async ({ page }) => {
  await page.goto('/book/barberia-demo');
  // The business is in Costa Rica, so the phone starts on +506.
  await expect(page.getByLabel('Código de país')).toHaveValue('+506');

  await page.selectOption('#serviceId', 'svc-corte');
  await page.selectOption('#staffId', 'staff-ana');
  await pickDate(page, nextOpenDate(5));
  await page.locator('fieldset button').first().click();
  await page.fill('#clientName', 'Teléfono Corto');
  await page.fill('#email', 'corto@example.com');
  await page.fill('#phone', '12');
  await page.click('button[type=submit]');

  const phone = page.locator('#phone');
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).toBeFocused();
  await expect(page.locator('#phone-error')).toContainText('muy corto o muy largo');
  await expect(page).toHaveURL(/\/book\/barberia-demo$/);
  // The rest of the form is kept.
  await expect(page.locator('#clientName')).toHaveValue('Teléfono Corto');

  await page.fill('#phone', '88887777');
  await expect(phone).not.toHaveAttribute('aria-invalid', 'true');
});
