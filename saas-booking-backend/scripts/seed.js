// Loads two fictitious businesses into the Firebase emulators.
// Uses the current data shape (users/{uid}/settings/business + appointments)
// so the existing app works locally. Safe to run repeatedly.

import 'dotenv/config';
import dayjs from 'dayjs';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must be set, ' +
    'so demo data never reaches a real Firebase project.'
  );
  process.exit(1);
}

const { getAuth } = await import('firebase-admin/auth');
const { db, default: app } = await import('../config/firebase.js');
const auth = getAuth(app);

const PASSWORD = 'demo1234';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const hours = (start, end, closed = []) => Object.fromEntries(
  DAYS.map((day) => [day, { start, end, enabled: !closed.includes(day) }])
);

const BUSINESSES = [
  {
    uid: 'demo-owner-barberia',
    email: 'barberia@demo.test',
    displayName: 'Dueño Barbería Demo',
    business: {
      name: 'Barbería Demo',
      email: 'barberia@demo.test',
      phone: '+50620000001',
      address: 'San José, Costa Rica',
      allowStaffPreference: true,
      timeInterval: 30,
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
      { dayOffset: 0, time: '10:00 AM', service: 'Corte', staffMember: 'Ana', clientName: 'Cliente Uno' },
      { dayOffset: 0, time: '11:00 AM', service: 'Corte y barba', staffMember: 'Luis', clientName: 'Cliente Dos' },
      { dayOffset: 1, time: '9:30 AM', service: 'Barba', staffMember: 'Luis', clientName: 'Cliente Tres' },
    ],
  },
  {
    uid: 'demo-owner-salon',
    email: 'salon@demo.test',
    displayName: 'Dueña Salón Demo',
    business: {
      name: 'Salón Demo',
      email: 'salon@demo.test',
      phone: '+50620000002',
      address: 'Heredia, Costa Rica',
      allowStaffPreference: true,
      timeInterval: 30,
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
      { dayOffset: 1, time: '10:00 AM', service: 'Tinte', staffMember: 'Ana', clientName: 'Clienta Cuatro' },
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

const now = dayjs().toISOString();

for (const b of BUSINESSES) {
  await upsertUser(b);

  await db.doc(`users/${b.uid}`).set({ email: b.email, createdAt: now, updatedAt: now });
  await db.doc(`users/${b.uid}/settings/business`).set({
    business: b.business,
    businessHours: b.businessHours,
    ui: { language: 'es', notifications: false },
  });

  // Replace this business's demo appointments so reruns stay idempotent.
  const existing = await db.collection('appointments').where('userId', '==', b.uid).get();
  const batch = db.batch();
  existing.forEach((doc) => batch.delete(doc.ref));
  b.appointments.forEach((apt, i) => {
    batch.set(db.collection('appointments').doc(`${b.uid}-apt-${i + 1}`), {
      userId: b.uid,
      clientName: apt.clientName,
      email: `cliente${i + 1}@example.com`,
      phone: '',
      date: dayjs().add(apt.dayOffset, 'day').format('YYYY-MM-DD'),
      time: apt.time,
      service: apt.service,
      staffMember: apt.staffMember,
      notes: '',
      status: 'Pending',
      createdAt: now,
    });
  });
  await batch.commit();

  console.log(`Seeded ${b.business.name}: ${b.email} / ${PASSWORD} (${b.appointments.length} appointments)`);
}

console.log('Public booking links: /book/demo-owner-barberia and /book/demo-owner-salon');
process.exit(0);
