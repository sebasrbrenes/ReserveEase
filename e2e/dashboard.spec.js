import { expect, test } from '@playwright/test';
import { login, nextOpenDate, openAllAppointments, pickDate } from './helpers.js';

const bookAsVisitor = async (page, slug, serviceId, staffId, name, offset) => {
  await page.goto(`/book/${slug}`);
  await page.selectOption('#serviceId', serviceId);
  await page.selectOption('#staffId', staffId);
  await pickDate(page, nextOpenDate(offset));
  await page.locator('fieldset button').first().click();
  await page.fill('#clientName', name);
  await page.fill('#email', 'cliente@example.com');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/booking\/success\//);
};

test('the owner sees a new booking, moves it and cancels it; another business never sees it', async ({ page, browser }) => {
  const name = `Cliente E2E ${Date.now()}`;
  await bookAsVisitor(page, 'barberia-demo', 'svc-combo', 'staff-luis', name, 4);

  await login(page, 'barberia@demo.test');
  let list = await openAllAppointments(page);
  const row = list.locator(':scope > div', { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText('Confirmed')).toBeVisible();
  await expect(row.getByText(/Email (pending|simulated)/)).toBeVisible();

  // Move it to the last free time that day.
  await row.hover();
  await row.getByRole('button', { name: 'Edit appointment' }).click();
  const time = page.locator('#apt-time');
  await expect(time.locator('option').nth(2)).toBeAttached();
  const options = await time.locator('option').allTextContents();
  await time.selectOption({ label: options[options.length - 1] });
  await page.fill('#apt-notes', 'Movida por la prueba');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Appointment moved')).toBeVisible();

  list = await openAllAppointments(page);
  const moved = list.locator(':scope > div', { hasText: name });
  await expect(moved.getByText(options[options.length - 1])).toBeVisible();
  await expect(moved.getByText('Movida por la prueba')).toBeVisible();

  await moved.hover();
  await moved.getByRole('button', { name: 'Cancel appointment' }).click();
  await page.getByRole('button', { name: 'Cancel appointment' }).last().click();
  await expect(page.getByText('Appointment cancelled')).toBeVisible();
  await expect(list.locator(':scope > div', { hasText: name }).getByText('Cancelled')).toBeVisible();

  // The salon owner's dashboard never contains the barbería's client.
  const other = await browser.newPage();
  await login(other, 'salon@demo.test');
  const salonList = await openAllAppointments(other);
  await expect(salonList.getByText('Clienta Cuatro')).toBeVisible();
  await expect(salonList.getByText(name)).toHaveCount(0);
  await other.close();
});

test('the settings page shows the public booking link', async ({ page }) => {
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  await expect(page.locator('input[readonly]').first()).toHaveValue(/\/book\/salon-demo$/);
});
