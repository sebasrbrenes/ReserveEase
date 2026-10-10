// Loads two fictitious businesses into the Firebase emulators: the settings the
// app edits (users/{uid}/settings/business) and the model v2 documents the API
// uses, built from those settings by the same bridge as the app
// (src/domain/legacySync.js), plus a few confirmed appointments.
// Safe to run repeatedly.

import 'dotenv/config';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set, ' +
    'so demo data never reaches a real Firebase project.'
  );
  process.exit(1);
}

const { getAuth } = await import('firebase-admin/auth');
const { db, default: app } = await import('../config/firebase.js');
const { legacyToV2 } = await import('../src/domain/legacySync.js');
const { createBooking } = await import('../src/domain/booking.js');
const { localDateOf, shiftLocalDate, zonedToUtc } = await import('../src/domain/time.js');
const auth = getAuth(app);

const PASSWORD = 'demo1234';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const hours = (start, end, closed = []) => Object.fromEntries(
  DAYS.map((day) => [day, { start, end, enabled: !closed.includes(day) }])
);

const BUSINESSES = [
  {
    uid: 'demo-owner-barberia',
    slug: 'barberia-demo',
    email: 'barberia@demo.test',
    displayName: 'Dueño Barbería Demo',
    business: {
      name: 'Barbería Demo',
      email: 'barberia@demo.test',
      phone: '+50620000001',
      address: 'San José, Costa Rica',
      allowStaffPreference: true,
      timeInterval: 30,
      timezone: 'America/Costa_Rica',
      currency: 'CRC',
      services: [
        { id: 'svc-corte', name: 'Corte', duration: 30, price: 6000 },
        { id: 'svc-barba', name: 'Barba', duration: 20, price: 4000 },
        { id: 'svc-combo', name: 'Corte y barba', duration: 60, price: 9000 },
      ],
      staff: [
        { id: 'staff-ana', name: 'Ana', email: '', phone: '', availableServices: ['svc-corte', 'svc-combo'], active: true },
        { id: 'staff-luis', name: 'Luis', email: '', phone: '', availableServices: ['svc-corte', 'svc-barba', 'svc-combo'], active: true },
      ],
    },
    businessHours: hours('9:00 AM', '6:00 PM', ['sunday']),
    appointments: [
      { day: 0, time: '10:00', serviceId: 'svc-corte', staffId: 'staff-ana', clientName: 'Cliente Uno' },
      { day: 0, time: '11:00', serviceId: 'svc-combo', staffId: 'staff-luis', clientName: 'Cliente Dos' },
      { day: 1, time: '09:30', serviceId: 'svc-barba', staffId: 'staff-luis', clientName: 'Cliente Tres' },
    ],
  },
  {
    uid: 'demo-owner-salon',
    slug: 'salon-demo',
    email: 'salon@demo.test',
    displayName: 'Dueña Salón Demo',
    business: {
      name: 'Salón Demo',
      email: 'salon@demo.test',
      phone: '+50620000002',
      address: 'Heredia, Costa Rica',
      allowStaffPreference: true,
      timeInterval: 30,
      timezone: 'America/Costa_Rica',
      currency: 'CRC',
      services: [
        { id: 'svc-tinte', name: 'Tinte', duration: 90, price: 25000 },
        { id: 'svc-peinado', name: 'Peinado', duration: 45, price: 12000 },
      ],
      staff: [
        // Same display name as the barbería on purpose: agendas must stay independent.
        { id: 'staff-ana-salon', name: 'Ana', email: '', phone: '', availableServices: ['svc-tinte', 'svc-peinado'], active: true },
      ],
    },
    businessHours: hours('10:00 AM', '7:00 PM', ['sunday', 'monday']),
    appointments: [
      { day: 1, time: '10:00', serviceId: 'svc-tinte', staffId: 'staff-ana-salon', clientName: 'Clienta Cuatro' },
    ],
  },
];

const upsertUser = async ({ uid, email, displayName }) => {
  const props = { email, displayName, password: PASSWORD, emailVerified: true };
  try {
    await auth.updateUser(uid, props);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    await auth.createUser({ uid, ...props });
  }
};

const TZ = 'America/Costa_Rica';

// Next local dates (from tomorrow) on which the business is open.
const openDates = (business, count) => {
  const dates = [];
  for (let i = 1; dates.length < count && i < 14; i += 1) {
    const date = shiftLocalDate(localDateOf(Date.now(), TZ), i);
    const weekday = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
    if (business.weeklySchedule[weekday].length) dates.push(date);
  }
  return dates;
};

const removeBusiness = async (businessId) => {
  await db.recursiveDelete(db.doc(`businesses/${businessId}`));
  const jobs = await db.collection('notificationJobs').where('businessId', '==', businessId).get();
  await Promise.all(jobs.docs.map((d) => d.ref.delete()));
};

for (const b of BUSINESSES) {
  await upsertUser(b);
  const settings = { business: b.business, businessHours: b.businessHours, ui: { language: 'es', notifications: false } };
  const stamp = new Date().toISOString();
  await db.doc(`users/${b.uid}`).set({ email: b.email, createdAt: stamp, updatedAt: stamp });
  await db.doc(`users/${b.uid}/settings/business`).set(settings);

  const v2 = legacyToV2({ uid: b.uid, settings, existingSlug: b.slug });
  await removeBusiness(v2.business.id);
  const batch = db.batch();
  batch.set(db.doc(`businesses/${v2.business.id}`), v2.business);
  batch.set(db.doc(`businesses/${v2.business.id}/members/${b.uid}`), { role: 'owner' });
  v2.services.forEach((svc) => batch.set(db.doc(`businesses/${v2.business.id}/services/${svc.id}`), svc));
  v2.staff.forEach((m) => batch.set(db.doc(`businesses/${v2.business.id}/staff/${m.id}`), m));
  batch.set(db.doc(`publicBusinesses/${v2.business.slug}`), v2.publicBusiness);
  await batch.commit();

  // Appointments go through the same booking path as real ones.
  const dates = openDates(v2.business, 2);
  for (const [i, apt] of b.appointments.entries()) {
    const [h, m] = apt.time.split(':').map(Number);
    await createBooking(db, {
      businessId: v2.business.id,
      idempotencyKey: `seed-${b.uid}-${i}`,
      source: 'admin',
      command: {
        serviceId: apt.serviceId,
        staffId: apt.staffId,
        startsAt: new Date(zonedToUtc(dates[apt.day], h * 60 + m, TZ)).toISOString(),
        client: { name: apt.clientName, email: `cliente${i + 1}@example.com`, phoneE164: null },
        notes: '',
        privacyNoticeVersion: 'seed',
        smsConsent: false,
      },
    });
  }

  console.log(`Seeded ${b.business.name}: ${b.email} / ${PASSWORD} (${b.appointments.length} appointments)`);
}

console.log('Public booking links: /book/barberia-demo and /book/salon-demo');
process.exit(0);
