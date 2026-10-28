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

  await page.getByRole('link', { name: 'Change or cancel this appointment' }).click();
  await expect(page).toHaveURL(/\/manage\/.+\?k=/);
  await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Change time' }).click();
  const newSlots = page.locator('fieldset button');
  await expect(newSlots.nth(1)).toBeVisible();
  const chosen = (await newSlots.last().textContent()).trim();
  await newSlots.last().click();
  await page.getByRole('button', { name: 'Move my appointment' }).click();
  await expect(page.getByText('Your appointment has a new time.')).toBeVisible();
  await expect(page.getByText(new RegExp(`at ${chosen}$`))).toBeVisible();

  await page.getByRole('button', { name: 'Cancel appointment' }).click();
  await page.getByRole('button', { name: 'Yes, cancel it' }).click();
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Book a new appointment' })).toBeVisible();

  // The same link with another key shows nothing.
  await page.goto(page.url().replace(/k=[^&]+/, 'k=wrongwrongwrongwrongwrong'));
  await expect(page.getByText('Appointment not found')).toBeVisible();
});
