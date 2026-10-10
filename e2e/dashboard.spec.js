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
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel appointment' }).click();
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

test('T22: each date in the weekly calendar sits under its own weekday', async ({ page }) => {
  await login(page, 'salon@demo.test');
  const headers = await page.locator('.grid-cols-7 > div').allTextContents();
  expect(headers).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const days = page.locator('.grid-cols-7 > button');
  await expect(days).toHaveCount(7);
  const today = new Date();
  const column = (today.getDay() + 6) % 7; // Monday = 0
  await expect(days.nth(column)).toHaveText(String(today.getDate()));
});

test('T29: the client email preference is saved and survives a reload', async ({ page }) => {
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  const toggle = page.getByRole('switch', { name: 'Email clients about their appointments' });
  await expect(toggle).toBeChecked();
  await toggle.click({ force: true });
  await expect(page.getByText('Client emails turned off')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Email clients about their appointments' })).not.toBeChecked();
  await page.getByRole('switch', { name: 'Email clients about their appointments' }).click({ force: true });
  await expect(page.getByText('Client emails turned on')).toBeVisible();
});

test('settings sections save on their own and show their errors next to the field', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  const name = page.locator('#businessName');
  await expect(name).toHaveValue('Salón Demo');
  const save = page.getByRole('button', { name: 'Save Changes' });
  await expect(save).toBeDisabled();

  await name.fill('');
  await save.click();
  await expect(page.getByText('Give your business a name.')).toBeVisible();

  await name.fill('Salón Demo Centro');
  await expect(page.getByText('You have unsaved changes in this section.')).toBeVisible();
  await save.click();
  await expect(page.getByText('Business information saved')).toBeVisible();
  await page.reload();
  await expect(page.locator('#businessName')).toHaveValue('Salón Demo Centro');
  await page.locator('#businessName').fill('Salón Demo');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByText('Business information saved')).toBeVisible();

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Give the service a name.')).toBeVisible();

  // Email is optional for staff.
  const staffName = `Prueba ${Date.now()}`;
  await page.fill('#staffName', staffName);
  await page.getByRole('button', { name: 'Add Staff Member' }).click();
  await expect(page.getByText('Staff member added')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: staffName })).toBeVisible();
  await page.getByRole('button', { name: `Delete ${staffName}` }).click();
  await expect(page.getByText('Staff member deleted')).toBeVisible();
  await expect(page.getByRole('heading', { name: staffName })).toHaveCount(0);
});
