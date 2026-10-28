// End-to-end tests: the app and the API against the Firebase emulators with
// the seeded demo businesses. Run with `npm run test:e2e` from the repo root.
import { defineConfig, devices } from '@playwright/test';

const emulatorEnv = {
  APP_ENV: 'local',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_PROJECT_ID: 'demo-reserveease',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.js',
  use: {
    baseURL: 'http://localhost:3000',
    // The interface is in English unless the visitor picks Spanish; these tests
    // read the Spanish copy, so they start with Spanish chosen.
    // e2e/language.spec.js checks the English default.
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://localhost:3000', localStorage: [{ name: 'reserveease.language', value: 'es' }] }],
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /public-booking|accessibility/ },
  ],
  webServer: [
    {
      command: 'node server.js',
      cwd: './saas-booking-backend',
      port: 3001,
      env: { ...emulatorEnv, PORT: '3001', FRONTEND_URL: 'http://localhost:3000', NOTIFICATIONS_MODE: 'mock', BOOKING_RATE_MAX: '1000' },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx vite --port 3000 --strictPort',
      cwd: './saas-booking-app',
      port: 3000,
      env: { VITE_USE_EMULATORS: 'true', VITE_BACKEND_URL: 'http://localhost:3001' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
