// Bridge from the settings the current app edits (users/{uid}/settings/business)
// to model v2 (businesses/{id}, services, staff, members, publicBusinesses/{slug}).
// It runs on the server after each settings change, so the owner keeps the
// same settings screen while bookings already use the new core.

import crypto from 'crypto';
import {
  businessSchema, DAYS, languageSchema, publicBusinessSchema, SCHEMA_VERSION, serviceSchema, slugSchema, staffSchema,
} from './schemas.js';

const DEFAULT_TIMEZONE = 'America/Costa_Rica';
const DEFAULT_CURRENCY = 'USD';

const hashOf = (uid) => crypto.createHash('sha256').update(uid).digest('hex');

// Derived from the UID without revealing it: the business id is public
// (it appears in the public projection), the owner UID is not.
export const businessIdFor = (uid) => `biz_${hashOf(uid).slice(0, 20)}`;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const roundUp5 = (n) => Math.ceil(n / 5) * 5;
const safeId = (id) => String(id ?? '').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 64) || null;

// "9:00 AM" -> minutes since midnight, rounded to the 5-minute grid.
const parse12h = (value) => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(value ?? '').trim());
  if (!match) return null;
  const hour = (Number(match[1]) % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return Math.round((hour * 60 + Number(match[2])) / 5) * 5;
};
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

const toInterval = (day) => {
  if (!day?.enabled) return [];
  const start = parse12h(day.start);
  let end = parse12h(day.end);
  if (start === null || end === null) return [];
  if (end === 0 || end >= 24 * 60) end = 24 * 60 - 5; // "12:00 AM" as closing time means midnight
  return end > start ? [{ start: hhmm(start), end: hhmm(end) }] : [];
};

const isTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return Boolean(tz);
  } catch {
    return false;
  }
};

export const slugFor = (uid, name) => {
  const base = String(name ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 40).replace(/-+$/g, '') || 'negocio';
  const suffix = hashOf(`slug:${uid}`).slice(0, 6);
  return slugSchema.parse(`${base}-${suffix}`);
};

/**
 * Builds the v2 documents from legacy settings. Pure: no Firestore access.
 * @returns {{ business, services, staff, publicBusiness, problems: string[] }}
 */
export const legacyToV2 = ({ uid, settings = {}, existingSlug }) => {
  const legacy = settings.business ?? {};
  const currency = /^[A-Z]{3}$/.test(legacy.currency ?? '') ? legacy.currency : DEFAULT_CURRENCY;
  const timezone = isTimeZone(legacy.timezone) ? legacy.timezone : DEFAULT_TIMEZONE;
  const name = String(legacy.name ?? '').trim().slice(0, 100);
  const language = languageSchema.parse(legacy.language);

  const services = [];
  for (const svc of legacy.services ?? []) {
    const id = safeId(svc?.id);
    const serviceName = String(svc?.name ?? '').trim().slice(0, 100);
    if (!id || !serviceName || services.some((s) => s.id === id)) continue;
    services.push(serviceSchema.parse({
      id,
      name: serviceName,
      durationMinutes: clamp(roundUp5(Number(svc.duration) || 30), 5, 480),
      priceMinor: Math.max(0, Math.round((Number(svc.price) || 0) * 100)),
      currency,
      active: true,
    }));
  }
  const serviceIds = new Set(services.map((s) => s.id));

  const staff = [];
  for (const member of legacy.staff ?? []) {
    const id = safeId(member?.id);
    const displayName = String(member?.name ?? '').trim().slice(0, 100);
    if (!id || !displayName || staff.some((s) => s.id === id)) continue;
    staff.push(staffSchema.parse({
      id,
      displayName,
      active: member.active !== false,
      serviceIds: (member.availableServices ?? []).map(safeId).filter((s) => serviceIds.has(s)),
    }));
  }

  const weeklySchedule = Object.fromEntries(DAYS.map((d) => [d, toInterval(settings.businessHours?.[d])]));

  // What still keeps the booking page from being published.
  const problems = [];
  if (!name) problems.push('NAME_MISSING');
  if (!services.length) problems.push('NO_SERVICES');
  if (!staff.some((m) => m.active && m.serviceIds.length)) problems.push('NO_STAFF_WITH_SERVICES');
  if (!DAYS.some((d) => weeklySchedule[d].length)) problems.push('NO_OPENING_HOURS');

  const business = businessSchema.parse({
    id: businessIdFor(uid),
    ownerUid: uid,
    name: name || 'Mi negocio',
    slug: existingSlug ?? slugFor(uid, name),
    timezone,
    currency,
    status: problems.length ? 'draft' : 'published',
    bookingPolicy: {
      confirmationMode: 'automatic',
      slotStepMinutes: clamp(roundUp5(Number(legacy.timeInterval) || 30), 5, 240),
      minNoticeMinutes: 60,
      maxAdvanceDays: 60,
      cancellationNoticeMinutes: 120,
    },
    weeklySchedule,
    clientEmails: legacy.clientEmails !== false,
    language,
    schemaVersion: SCHEMA_VERSION,
  });

  const publicBusiness = publicBusinessSchema.parse({
    businessId: business.id,
    slug: business.slug,
    name: business.name,
    timezone,
    currency,
    language,
    status: business.status,
    services: services.filter((s) => s.active),
    staff: staff.filter((m) => m.active),
  });

  return { business, services, staff, publicBusiness, problems };
};

// Reads the legacy settings and writes the v2 documents in one transaction.
// Services or staff removed from settings stay stored (past appointments
// refer to them) but are marked inactive.
export const syncLegacyBusiness = (db, uid) => {
  const businessId = businessIdFor(uid);
  const base = db.doc(`businesses/${businessId}`);
  return db.runTransaction(async (tx) => {
    const [settingsSnap, businessSnap] = await tx.getAll(db.doc(`users/${uid}/settings/business`), base);
    const [oldServices, oldStaff] = await Promise.all([
      tx.get(base.collection('services')), tx.get(base.collection('staff')),
    ]);
    const v2 = legacyToV2({
      uid,
      settings: settingsSnap.exists ? settingsSnap.data() : {},
      existingSlug: businessSnap.exists ? businessSnap.data().slug : undefined,
    });

    tx.set(base, v2.business);
    tx.set(base.collection('members').doc(uid), { role: 'owner' });
    v2.services.forEach((s) => tx.set(base.collection('services').doc(s.id), s));
    v2.staff.forEach((m) => tx.set(base.collection('staff').doc(m.id), m));
    const keep = (list) => new Set(list.map((x) => x.id));
    const keptServices = keep(v2.services);
    const keptStaff = keep(v2.staff);
    oldServices.docs.filter((d) => !keptServices.has(d.id)).forEach((d) => tx.update(d.ref, { active: false }));
    oldStaff.docs.filter((d) => !keptStaff.has(d.id)).forEach((d) => tx.update(d.ref, { active: false }));
    tx.set(db.doc(`publicBusinesses/${v2.business.slug}`), v2.publicBusiness);

    return {
      businessId,
      slug: v2.business.slug,
      status: v2.business.status,
      problems: v2.problems,
      name: v2.business.name,
      timezone: v2.business.timezone,
      currency: v2.business.currency,
      language: v2.business.language,
      services: v2.services,
      staff: v2.staff,
    };
  });
};
