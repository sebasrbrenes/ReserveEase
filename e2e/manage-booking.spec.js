import { expect, test } from '@playwright/test';
import { nextOpenDate, pickDate } from './helpers.js';

test('a client moves and then cancels their own booking from its link', async ({ page }) => {
  await page.goto('/book/barberia-demo');
  await page.selectOption('#serviceId', 'svc-corte');
  await page.selectOption('#staffId', 'staff-ana');
  await pickDate(page, nextOpenDate(4));
  const slots = page.locator('fieldset button');
  await expect(slots.first()).toBeVisible();
  await slots.first().click();
  await page.fill('#clientName', `Cliente link ${Date.now()}`);
  await page.fill('#email', 'link@example.com');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/booking\/success\/barberia-demo/);

  await page.getByRole('link', { name: 'Cambiar o cancelar esta cita' }).click();
  await expect(page).toHaveURL(/\/manage\/.+\?k=/);
  await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Cambiar la hora' }).click();
  const newSlots = page.locator('fieldset button');
  await expect(newSlots.nth(1)).toBeVisible();
  const chosen = (await newSlots.last().textContent()).trim();
  await newSlots.last().click();
  await page.getByRole('button', { name: 'Mover mi cita' }).click();
  await expect(page.getByText('Tu cita tiene una nueva hora.')).toBeVisible();
  await expect(page.getByText(new RegExp(`a las ${chosen}$`))).toBeVisible();

  await page.getByRole('button', { name: 'Cancelar la cita' }).click();
  await page.getByRole('button', { name: 'Sí, cancelarla' }).click();
  await expect(page.getByText('Cancelada', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reservar una cita nueva' })).toBeVisible();

  // The same link with another key shows nothing.
  await page.goto(page.url().replace(/k=[^&]+/, 'k=wrongwrongwrongwrongwrong'));
  await expect(page.getByText('No encontramos la cita')).toBeVisible();
});
