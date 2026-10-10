import { describe, expect, it } from 'vitest';
import {
  businessSchema,
  publicBookingRequestSchema,
  serviceSchema,
} from '../src/domain/schemas.js';

const validBooking = {
  serviceId: 'svc-corte',
  staffId: 'staff-ana',
  startsAt: '2026-10-12T15:00:00Z',
  client: { name: 'Cliente Demo', email: 'cliente@example.com', phoneE164: null },
  notes: '',
  privacyNoticeVersion: 'demo-v1',
  smsConsent: false,
};

describe('publicBookingRequestSchema', () => {
  it('accepts the documented example', () => {
    expect(publicBookingRequestSchema.parse(validBooking)).toEqual(validBooking);
  });

  it.each(['status', 'endsAt', 'priceMinor', 'ownerUid'])('rejects server-owned field %s', (field) => {
    const result = publicBookingRequestSchema.safeParse({ ...validBooking, [field]: 'x' });
    expect(result.success).toBe(false);
  });

  it('rejects a start that is not a UTC instant', () => {
    expect(publicBookingRequestSchema.safeParse({ ...validBooking, startsAt: '2026-10-12T9:00 AM' }).success).toBe(false);
    expect(publicBookingRequestSchema.safeParse({ ...validBooking, startsAt: '2026-10-12T09:00:00-06:00' }).success).toBe(false);
  });

  it('rejects a phone that is not E.164', () => {
    const client = { ...validBooking.client, phoneE164: '88887777' };
    expect(publicBookingRequestSchema.safeParse({ ...validBooking, client }).success).toBe(false);
  });
});

describe('serviceSchema', () => {
  const service = {
    id: 'svc-corte', name: 'Corte', durationMinutes: 30, priceMinor: 600000, currency: 'CRC', active: true,
  };

  it('fills default buffers', () => {
    expect(serviceSchema.parse(service)).toMatchObject({ bufferBeforeMinutes: 0, bufferAfterMinutes: 0 });
  });

  it('requires durations on the 5-minute grid', () => {
    expect(serviceSchema.safeParse({ ...service, durationMinutes: 32 }).success).toBe(false);
    expect(serviceSchema.safeParse({ ...service, durationMinutes: 0 }).success).toBe(false);
  });

  it('requires integer minor units', () => {
    expect(serviceSchema.safeParse({ ...service, priceMinor: 60.5 }).success).toBe(false);
  });
});

describe('businessSchema', () => {
  const closed = [];
  const business = {
    id: 'biz-demo',
    ownerUid: 'uid-demo',
    name: 'Barbería Demo',
    slug: 'barberia-demo',
    timezone: 'America/Costa_Rica',
    currency: 'CRC',
    status: 'draft',
    bookingPolicy: {
      confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationNoticeMinutes: 120,
    },
    weeklySchedule: {
      monday: [{ start: '09:00', end: '18:00' }],
      tuesday: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '18:00' }],
      wednesday: closed, thursday: closed, friday: closed, saturday: closed, sunday: closed,
    },
    schemaVersion: 2,
  };

  it('accepts a valid business', () => {
    expect(businessSchema.safeParse(business).success).toBe(true);
  });

  it('rejects an unknown time zone', () => {
    expect(businessSchema.safeParse({ ...business, timezone: 'Costa Rica' }).success).toBe(false);
  });

  it('rejects an interval that ends before it starts', () => {
    const weeklySchedule = { ...business.weeklySchedule, monday: [{ start: '18:00', end: '09:00' }] };
    expect(businessSchema.safeParse({ ...business, weeklySchedule }).success).toBe(false);
  });

  it('rejects 12-hour times', () => {
    const weeklySchedule = { ...business.weeklySchedule, monday: [{ start: '9:00 AM', end: '5:00 PM' }] };
    expect(businessSchema.safeParse({ ...business, weeklySchedule }).success).toBe(false);
  });
});
