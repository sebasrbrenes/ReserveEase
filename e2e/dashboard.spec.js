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
  await expect(row.getByText('Confirmada')).toBeVisible();
  await expect(row.getByText(/Correo (pendiente|simulado)/)).toBeVisible();

  // Move it to the last free time that day.
  await row.hover();
  await row.getByRole('button', { name: 'Editar cita' }).click();
  const time = page.locator('#apt-time');
  await expect(time.locator('option').nth(2)).toBeAttached();
  const options = await time.locator('option').allTextContents();
  await time.selectOption({ label: options[options.length - 1] });
  await page.fill('#apt-notes', 'Movida por la prueba');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cita movida')).toBeVisible();

  list = await openAllAppointments(page);
  const moved = list.locator(':scope > div', { hasText: name });
  await expect(moved.getByText(options[options.length - 1])).toBeVisible();
  await expect(moved.getByText('Movida por la prueba')).toBeVisible();

  await moved.hover();
  await moved.getByRole('button', { name: 'Cancelar cita' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar cita' }).click();
  await expect(page.getByText('Cita cancelada')).toBeVisible();
  await expect(list.locator(':scope > div', { hasText: name }).getByText('Cancelada')).toBeVisible();

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

test('T22: each date in the month calendar sits under its own weekday', async ({ page }) => {
  await login(page, 'salon@demo.test');
  const headers = await page.locator('.grid-cols-7 > div').allTextContents();
  expect(headers).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  const days = page.locator('.grid-cols-7 > button');
  const count = await days.count();
  expect(count % 7).toBe(0);
  expect(count).toBeGreaterThanOrEqual(28);
  const today = new Date();
  const weekday = today.toLocaleDateString('es', { weekday: 'long' });
  const label = `${weekday} ${today.getDate()} de ${today.toLocaleDateString('es', { month: 'long' })}`;
  const labels = await days.evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  const index = labels.findIndex((l) => l.startsWith(label));
  expect(index).toBeGreaterThanOrEqual(0);
  expect(index % 7).toBe((today.getDay() + 6) % 7); // Monday = 0
});

test('the list shows the next appointments across days, and a picked day on demand', async ({ page }) => {
  await login(page, 'salon@demo.test');
  const list = page.getByTestId('day-list');
  await expect(page.getByRole('heading', { name: 'Próximas citas' })).toBeVisible();
  const items = list.locator(':scope > div');
  await expect(items.first()).toBeVisible();
  const count = await items.count();
  expect(count).toBeLessThanOrEqual(7);
  // Soonest first, and more than one day when the seed has them.
  const times = (await items.evaluateAll((els) => els.map((el) => el.dataset.startsAt))).map(Date.parse);
  expect([...times].sort((a, b) => a - b)).toEqual(times);

  // The arrows change the month, not the selection.
  const title = page.locator('h2.hd-title.text-3xl');
  const month = await title.textContent();
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await expect(title).not.toHaveText(month);
  await page.getByRole('button', { name: 'Hoy' }).click();
  await expect(title).toHaveText(month);

  // Picking a day filters the list; "Show upcoming" brings the list back.
  const busy = page.locator('.grid-cols-7 > button[aria-label*="cita"]').first();
  await busy.click();
  await expect(busy).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Próximas citas' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver próximas' }).click();
  await expect(page.getByRole('heading', { name: 'Próximas citas' })).toBeVisible();
});

test('T29: the client email preference is saved and survives a reload', async ({ page }) => {
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  const toggle = page.getByRole('switch', { name: 'Enviar correos a los clientes sobre sus citas' });
  await expect(toggle).toBeChecked();
  await toggle.click({ force: true });
  await expect(page.getByText('Correos a clientes apagados')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Enviar correos a los clientes sobre sus citas' })).not.toBeChecked();
  await page.getByRole('switch', { name: 'Enviar correos a los clientes sobre sus citas' }).click({ force: true });
  await expect(page.getByText('Correos a clientes encendidos')).toBeVisible();
});

test('settings sections save on their own and show their errors next to the field', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  const name = page.locator('#businessName');
  await expect(name).toHaveValue('Salón Demo');
  const save = page.getByRole('button', { name: 'Guardar cambios' });
  await expect(save).toBeDisabled();

  await name.fill('');
  await save.click();
  await expect(page.getByText('Escribe el nombre de tu negocio.')).toBeVisible();

  await name.fill('Salón Demo Centro');
  await expect(page.getByText('Tienes cambios sin guardar en esta sección.')).toBeVisible();
  await save.click();
  await expect(page.getByText('Datos del negocio guardados')).toBeVisible();
  await page.reload();
  await expect(page.locator('#businessName')).toHaveValue('Salón Demo Centro');
  await page.locator('#businessName').fill('Salón Demo');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Datos del negocio guardados')).toBeVisible();

  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await expect(page.getByText('Ponle un nombre al servicio.')).toBeVisible();

  // Email is optional for staff.
  const staffName = `Prueba ${Date.now()}`;
  await page.fill('#staffName', staffName);
  await page.getByRole('button', { name: 'Agregar persona' }).click();
  await expect(page.getByText('Persona agregada')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: staffName })).toBeVisible();
  await page.getByRole('button', { name: `Eliminar a ${staffName}` }).click();
  await expect(page.getByText('Persona eliminada')).toBeVisible();
  await expect(page.getByRole('heading', { name: staffName })).toHaveCount(0);
});

test('the business can show its booking pages in English; Spanish is the default', async ({ page }) => {
  await login(page, 'salon@demo.test');
  await page.goto('/settings');
  const language = page.locator('#language');
  await expect(language).toHaveValue('es');
  await language.selectOption('en');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Datos del negocio guardados')).toBeVisible();

  try {
    await page.goto('/book/salon-demo');
    await expect(page.getByText('Book an appointment with')).toBeVisible();
    await page.selectOption('#serviceId', 'svc-peinado');
    await page.selectOption('#staffId', 'staff-ana-salon');
    await pickDate(page, nextOpenDate(5), 'en');
    await page.locator('fieldset button').first().click();
    await page.fill('#clientName', `Visitor ${Date.now()}`);
    await page.fill('#email', 'visitor@example.com');
    await page.getByRole('button', { name: 'Book appointment' }).click();
    await expect(page.getByText('Your appointment is confirmed')).toBeVisible();
    await page.getByRole('link', { name: 'Change or cancel this appointment' }).click();
    await expect(page.getByText('Your appointment with')).toBeVisible();
    await expect(page.getByText('Confirmed', { exact: true })).toBeVisible();
  } finally {
    await page.goto('/settings');
    await page.locator('#language').selectOption('es');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Datos del negocio guardados')).toBeVisible();
  }
  await page.goto('/book/salon-demo');
  await expect(page.getByText('Reserva tu cita con')).toBeVisible();
});
