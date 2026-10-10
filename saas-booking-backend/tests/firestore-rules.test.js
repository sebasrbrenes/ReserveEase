// Firestore security rules (master document T15, T17): the browser cannot read
// or write bookings, locks or other businesses; it keeps its own settings.
import { readFileSync } from 'fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('firestore.rules', () => {
  let env;

  beforeAll(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
    env = await initializeTestEnvironment({
      projectId: 'demo-reserveease',
      firestore: { host, port: Number(port), rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
    });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'businesses/rules-biz-a'), { ownerUid: 'owner-a' });
      await setDoc(doc(db, 'businesses/rules-biz-a/members/owner-a'), { role: 'owner' });
      await setDoc(doc(db, 'businesses/rules-biz-a/appointments/apt-1'), { client: { email: 'privado@example.com' } });
      await setDoc(doc(db, 'publicBusinesses/rules-biz-a'), { status: 'published' });
      await setDoc(doc(db, 'appointments/legacy-1'), { userId: 'owner-a' });
      await setDoc(doc(db, 'users/owner-a/settings/business'), { business: { name: 'A' } });
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  it('T17: no client, not even the owner, writes appointments or slot locks', async () => {
    const owner = env.authenticatedContext('owner-a', { email_verified: true }).firestore();
    const visitor = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(owner, 'businesses/rules-biz-a/appointments/apt-2'), { status: 'confirmed' }));
    await assertFails(setDoc(doc(owner, 'businesses/rules-biz-a/slotLocks/ana_1'), { appointmentId: 'x' }));
    await assertFails(setDoc(doc(visitor, 'businesses/rules-biz-a/slotLocks/ana_1'), { appointmentId: 'x' }));
    await assertFails(addDoc(collection(visitor, 'appointments'), { userId: 'owner-a' }));
    await assertFails(addDoc(collection(owner, 'appointments'), { userId: 'owner-a' }));
    await assertFails(setDoc(doc(owner, 'notificationJobs/job-1'), { status: 'queued' }));
    await assertFails(setDoc(doc(owner, 'businesses/rules-biz-a'), { ownerUid: 'owner-a', status: 'published' }));
    await assertFails(setDoc(doc(owner, 'publicBusinesses/rules-biz-a'), { status: 'published' }));
  });

  it('T15: clients cannot read appointments, their own or another business\'s', async () => {
    const ownerB = env.authenticatedContext('owner-b', { email_verified: true }).firestore();
    const visitor = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(ownerB, 'businesses/rules-biz-a/appointments/apt-1')));
    await assertFails(getDocs(collection(ownerB, 'businesses/rules-biz-a/appointments')));
    await assertFails(getDoc(doc(visitor, 'businesses/rules-biz-a/appointments/apt-1')));
    await assertFails(getDocs(query(collection(visitor, 'appointments'), where('userId', '==', 'owner-a'))));
    await assertFails(getDoc(doc(ownerB, 'users/owner-a/settings/business')));
  });

  it('keeps the owner\'s own profile and settings writable, and nobody else\'s', async () => {
    const owner = env.authenticatedContext('owner-a').firestore();
    const ownerB = env.authenticatedContext('owner-b').firestore();
    await assertSucceeds(getDoc(doc(owner, 'users/owner-a/settings/business')));
    await assertSucceeds(setDoc(doc(owner, 'users/owner-a/settings/business'), { business: { name: 'A2' } }));
    await assertSucceeds(setDoc(doc(owner, 'users/owner-a'), { email: 'a@demo.test' }, { merge: true }));
    await assertFails(setDoc(doc(ownerB, 'users/owner-a/settings/business'), { business: { name: 'hijacked' } }));
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'users/owner-a'), { email: 'x' }));
  });

  it('accepts feedback from signed-in users only, with no extra fields', async () => {
    const owner = env.authenticatedContext('owner-a').firestore();
    await assertSucceeds(addDoc(collection(owner, 'feedback'), { feedback: 'útil', createdAt: '2026-10-10' }));
    await assertFails(addDoc(collection(owner, 'feedback'), { feedback: 'x', createdAt: 'y', admin: true }));
    await assertFails(addDoc(collection(env.unauthenticatedContext().firestore(), 'feedback'), { feedback: 'x', createdAt: 'y' }));
    await assertFails(getDocs(collection(owner, 'feedback')));
  });
});
