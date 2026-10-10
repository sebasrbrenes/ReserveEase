import { businessSchema, publicBusinessSchema, serviceSchema, staffSchema } from '../domain/schemas.js';

// Returns the published projection for a slug, or null when it does not
// exist or is not published. Unknown fields are stripped by the schema.
export const getPublishedBusinessBySlug = async (db, slug) => {
  const snap = await db.doc(`publicBusinesses/${slug}`).get();
  if (!snap.exists) return null;
  const parsed = publicBusinessSchema.safeParse(snap.data());
  if (!parsed.success) {
    throw new Error(`publicBusinesses/${slug} does not match the public schema`);
  }
  return parsed.data.status === 'published' ? parsed.data : null;
};

const parseDoc = (schema, snap) => (snap.exists ? schema.parse(snap.data()) : null);

// Private business documents needed to compute availability for one service and staff member.
export const getBookingContext = async (db, businessId, serviceId, staffId) => {
  const base = db.doc(`businesses/${businessId}`);
  const [business, service, staff] = await Promise.all([
    base.get(),
    base.collection('services').doc(serviceId).get(),
    base.collection('staff').doc(staffId).get(),
  ]);
  return {
    business: parseDoc(businessSchema, business),
    service: parseDoc(serviceSchema, service),
    staff: parseDoc(staffSchema, staff),
  };
};

const toMs = (value) => (typeof value?.toMillis === 'function' ? value.toMillis() : Date.parse(value));

// Intervals in which a staff member is not bookable around a local date:
// confirmed appointments (buffers included) and schedule exceptions.
// The neighbouring days are included so buffers that cross midnight count.
// excludeAppointmentId leaves out the appointment being rescheduled.
export const getBusyIntervals = async (db, businessId, staffId, localDates, excludeAppointmentId) => {
  const base = db.doc(`businesses/${businessId}`);
  const [appointments, exceptions] = await Promise.all([
    base.collection('appointments')
      .where('staffId', '==', staffId)
      .where('localDate', 'in', localDates)
      .get(),
    base.collection('scheduleExceptions')
      .where('localDate', 'in', localDates)
      .get(),
  ]);
  const busy = [];
  appointments.forEach((doc) => {
    const a = doc.data();
    if (a.status === 'confirmed' && doc.id !== excludeAppointmentId) busy.push({ from: toMs(a.occupiedFrom), until: toMs(a.occupiedUntil) });
  });
  exceptions.forEach((doc) => {
    const e = doc.data();
    if (e.staffId == null || e.staffId === staffId) busy.push({ from: toMs(e.from), until: toMs(e.until) });
  });
  return busy;
};
