import { readFileSync } from 'fs';
import { expect, test } from '@playwright/test';
import { createVerifiedAccount, login } from './helpers.js';

test('the owner downloads their appointments as CSV', async ({ page }) => {
  await login(page, 'barberia@demo.test');
  await page.goto('/settings');
  const section = page.locator('#cuenta');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    section.getByRole('button', { name: 'Descargar CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^reserveease-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = readFileSync(await download.path(), 'utf8');
  expect(text).toContain('client_email');
});

test('an owner deletes their account after typing the word and their password', async ({ page, request }) => {
  const email = `borrar-${Date.now()}@demo.test`;
  await createVerifiedAccount(request, email);
  await login(page, email);
  await page.goto('/settings');

  const section = page.locator('#cuenta');
  await section.getByRole('button', { name: 'Borrar mi cuenta...' }).click();
  const confirm = section.getByRole('button', { name: 'Borrar mi cuenta para siempre' });
  await expect(confirm).toBeDisabled();
  await section.getByLabel('Escribe BORRAR para confirmar').fill('borrar');
  await section.getByLabel('Tu contraseña').fill('demo1234');
  await expect(confirm).toBeEnabled();
  await confirm.click();

  // Sent to the landing; the login no longer exists.
  await page.waitForURL((url) => !url.pathname.startsWith('/settings'));
  await page.goto('/login');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await expect(page).not.toHaveURL(/\/dashboard/);
});

test('the owner sees Basic with email included and requests SMS, which waits for carrier approval', async ({ page }) => {
  await login(page, 'barberia@demo.test');
  await page.goto('/settings#suscripcion');
  const sms = page.getByTestId('sms-addon');
  await expect(sms).toContainText('+$10 USD al mes · hasta 100 mensajes por ciclo de facturación');
  await expect(sms).toContainText('Complemento SMS: desactivado');
  await sms.getByRole('button', { name: 'Solicitar SMS' }).click();
  await expect(sms.getByTestId('sms-status')).toContainText('Pendiente de aprobación');
  // Nothing promises immediate texts or offers a charge before approval.
  await expect(sms.getByRole('button', { name: /Activar SMS/ })).toHaveCount(0);
});
