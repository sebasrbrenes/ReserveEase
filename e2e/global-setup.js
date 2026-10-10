// Loads the demo businesses into the emulators before the tests.
import { execSync } from 'child_process';

export default function globalSetup() {
  execSync('npm --prefix saas-booking-backend run seed', {
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_ENV: 'local',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
      FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
      FIREBASE_PROJECT_ID: 'demo-reserveease',
    },
  });
}
