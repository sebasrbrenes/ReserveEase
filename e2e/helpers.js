import { expect } from '@playwright/test';

// A date picked in the react-datepicker field, typed as "12/10/2026".
export const pickDate = async (page, date) => {
  const pad = (n) => String(n).padStart(2, '0');
  const label = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  const input = page.locator('.react-datepicker__input-container input').first();
  await input.fill(label);
  await input.press('Escape');
};

// Next date (from two days ahead) that is not a Sunday: the demo businesses close on Sundays.
export const nextOpenDate = (offset = 2) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  while (d.getDay() === 0 || d.getDay() === 1) d.setDate(d.getDate() + 1); // the salon also closes Mondays
  return d;
};

export const login = async (page, email) => {
  await page.goto('/login');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'demo1234');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/dashboard/);
};

// Opens "Ver todas" and returns the list container.
export const openAllAppointments = async (page) => {
  await page.getByRole('button', { name: 'Ver todas' }).click();
  return page.locator('.max-h-\\[60vh\\]');
};
