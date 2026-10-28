import { expect, test } from '@playwright/test';
import { createVerifiedAccount, login } from './helpers.js';

// A first visit, with no language chosen yet.
test.use({ storageState: { cookies: [], origins: [] } });

test('the app opens in English and keeps the language the visitor picks', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.getByRole('button', { name: 'Español' }).click();
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();

  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('a link from the landing opens the app in the landing’s language', async ({ page }) => {
  await page.goto('/signup?lang=es');
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Hola de nuevo' })).toBeVisible();
});

test('the dashboard and settings are in English, and a new business starts with English booking pages', async ({ page, request }) => {
  const email = `english${Date.now()}@demo.test`;
  await createVerifiedAccount(request, email);
  await login(page, email);
  await expect(page.getByRole('heading', { name: 'Getting started' })).toBeVisible();
  await expect(page.getByText('Today’s appointments')).toBeVisible();
  // US calendars start the week on Sunday.
  await expect(page.getByText('Sun', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Business details' })).toBeVisible();
  await expect(page.locator('#language')).toHaveValue('en');
});

test('a booking page follows the business’s language, not the visitor’s', async ({ page }) => {
  await page.goto('/book/barberia-demo');
  await expect(page.getByText('Reserva tu cita con')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
});
