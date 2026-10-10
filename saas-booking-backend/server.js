import app from './app.js';
import { db } from './config/firebase.js';
import { adapterFromEnv } from './src/notifications/adapters.js';
import { startNotificationWorker } from './src/notifications/worker.js';

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Sends queued notifications from this process. NOTIFICATIONS_WORKER=off
// disables it (for example, when a separate worker runs).
if (process.env.NOTIFICATIONS_WORKER !== 'off') {
  const adapter = adapterFromEnv();
  startNotificationWorker(db, { adapter });
  console.log(`Notification worker started (${adapter.name})`);
}
