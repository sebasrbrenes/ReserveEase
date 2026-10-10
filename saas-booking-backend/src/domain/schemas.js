// Data model v2 (master document, sections 11 and 13).
// Durations and buffers are whole minutes in multiples of 5, amounts are
// integer minor units with an explicit currency, instants are UTC ISO strings.

import { z } from 'zod';

export const SCHEMA_VERSION = 2;
export const BLOCK_MINUTES = 5;

const isTimeZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Invalid id');
export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Invalid slug').min(3).max(60);
export const timeZoneSchema = z.string().refine(isTimeZone, 'Invalid IANA time zone');
export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Invalid ISO 4217 currency');
export const phoneE164Schema = z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164, e.g. +50688887777');
const utcInstantSchema = z.string().datetime({ offset: false });

const minutes = (max) => z.number().int().min(0).max(max)
  .refine((m) => m % BLOCK_MINUTES === 0, `Must be a multiple of ${BLOCK_MINUTES} minutes`);

// "HH:mm" in the business time zone, aligned to the 5-minute grid.
const localTimeSchema = z.string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm')
  .refine((t) => Number(t.slice(3)) % BLOCK_MINUTES === 0, `Must be a multiple of ${BLOCK_MINUTES} minutes`);

const toMinutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

const intervalSchema = z.object({ start: localTimeSchema, end: localTimeSchema })
  .refine((i) => toMinutes(i.end) > toMinutes(i.start), 'end must be after start');

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Each day lists its open intervals; an empty list means closed.
export const weeklyScheduleSchema = z.object(
  Object.fromEntries(DAYS.map((d) => [d, z.array(intervalSchema).max(4)]))
);

export const bookingPolicySchema = z.object({
  confirmationMode: z.literal('automatic'),
  slotStepMinutes: minutes(240).refine((m) => m > 0, 'Must be positive'),
  minNoticeMinutes: minutes(7 * 24 * 60),
  maxAdvanceDays: z.number().int().min(1).max(365),
  cancellationNoticeMinutes: minutes(7 * 24 * 60),
});

export const businessSchema = z.object({
  id: idSchema,
  ownerUid: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  slug: slugSchema,
  timezone: timeZoneSchema,
  currency: currencySchema,
  status: z.enum(['draft', 'published']),
  bookingPolicy: bookingPolicySchema,
  weeklySchedule: weeklyScheduleSchema,
  // Whether clients receive booking emails (confirmation, changes, reminders).
  clientEmails: z.boolean().default(true),
  schemaVersion: z.literal(SCHEMA_VERSION),
});

export const serviceSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).default(''),
  durationMinutes: minutes(8 * 60).refine((m) => m > 0, 'Must be positive'),
  bufferBeforeMinutes: minutes(120).default(0),
  bufferAfterMinutes: minutes(120).default(0),
  priceMinor: z.number().int().min(0),
  currency: currencySchema,
  active: z.boolean(),
});

export const staffSchema = z.object({
  id: idSchema,
  displayName: z.string().trim().min(1).max(100),
  active: z.boolean(),
  serviceIds: z.array(idSchema).max(100),
});

export const APPOINTMENT_STATUSES = ['confirmed', 'completed', 'cancelled', 'no_show'];
export const appointmentStatusSchema = z.enum(APPOINTMENT_STATUSES);

const clientSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phoneE164: phoneE164Schema.nullable().default(null),
}).strict();

// Body of POST /api/v1/public/businesses/:slug/bookings (section 13.3).
// strict(): status, price, endsAt, owner or audit fields are decided by the
// server and are rejected if a client sends them.
export const publicBookingRequestSchema = z.object({
  serviceId: idSchema,
  staffId: idSchema,
  startsAt: utcInstantSchema,
  client: clientSchema,
  notes: z.string().max(500).default(''),
  privacyNoticeVersion: z.string().min(1).max(40),
  smsConsent: z.boolean().default(false),
}).strict();

// Public projection stored at publicBusinesses/{slug}: an allow-list of fields
// (section 11.6). Never owner UID, login email, contacts or appointments.
export const publicBusinessSchema = z.object({
  businessId: idSchema,
  slug: slugSchema,
  name: z.string(),
  description: z.string().default(''),
  timezone: timeZoneSchema,
  currency: currencySchema,
  status: z.enum(['draft', 'published']),
  services: z.array(z.object({
    id: idSchema,
    name: z.string(),
    description: z.string().default(''),
    durationMinutes: z.number().int(),
    priceMinor: z.number().int(),
    currency: currencySchema,
  }).strip()),
  staff: z.array(z.object({
    id: idSchema,
    displayName: z.string(),
    serviceIds: z.array(idSchema),
  }).strip()),
}).strip();
