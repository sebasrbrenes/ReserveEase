// Cases T01–T06, T20 and T21 of the master document (section 20.2).
import { afterEach, describe, expect, it } from 'vitest';
import { computeAvailability, occupancyOf } from '../src/domain/availability.js';
import { zonedToUtc } from '../src/domain/time.js';

const open = (start, end) => [{ start, end }];
const weekly = (intervals, closed = ['sunday']) => Object.fromEntries(
  ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    .map((d) => [d, closed.includes(d) ? [] : intervals])
);

const business = (overrides = {}) => ({
  timezone: 'America/Costa_Rica', // UTC-6, no DST
  weeklySchedule: weekly(open('09:00', '18:00')),
  bookingPolicy: {
    confirmationMode: 'automatic', slotStepMinutes: 15, minNoticeMinutes: 60, maxAdvanceDays: 60, cancellationNoticeMinutes: 120,
  },
  ...overrides,
});

const service = (durationMinutes, overrides = {}) => ({
  id: 'svc', name: 'Servicio', durationMinutes, bufferBeforeMinutes: 0, bufferAfterMinutes: 0,
  priceMinor: 0, currency: 'CRC', active: true, ...overrides,
});
const staff = { id: 'ana', displayName: 'Ana', active: true, serviceIds: ['svc'] };

const MONDAY = '2026-10-12';
const NOW = Date.parse('2026-10-11T12:00:00Z');
const at = (iso) => Date.parse(iso);
const starts = (result) => result.slots.map((s) => s.startsAt);

const run = (p) => computeAvailability({ business: business(), service: service(30), staff, localDate: MONDAY, now: NOW, ...p });

describe('availability by duration', () => {
  it('T01: a 60-minute booking at 10:00 blocks 10:30 for the same staff', () => {
    const busy = [occupancyOf(service(60), at('2026-10-12T16:00:00Z'))]; // 10:00 local
    const result = starts(run({ busy }));
    expect(result).not.toContain('2026-10-12T16:00:00.000Z');
    expect(result).not.toContain('2026-10-12T16:30:00.000Z');
    expect(result).toContain('2026-10-12T15:30:00.000Z'); // 9:30, ends exactly at 10:00
  });

  it('T02: a booking may start exactly when the previous one ends', () => {
    const busy = [occupancyOf(service(30), at('2026-10-12T16:00:00Z'))]; // 10:00–10:30
    expect(starts(run({ busy }))).toContain('2026-10-12T16:30:00.000Z');
  });

  it('T03: the buffer after a booking is also occupied', () => {
    const busy = [occupancyOf(service(60, { bufferAfterMinutes: 10 }), at('2026-10-12T16:00:00Z'))]; // until 11:10
    const result = starts(run({ busy }));
    expect(result).not.toContain('2026-10-12T17:00:00.000Z'); // 11:00
    expect(result).toContain('2026-10-12T17:15:00.000Z'); // 11:15
  });

  it('T04: a service must end before closing time', () => {
    const result = starts(run({ service: service(60) }));
    expect(result.at(-1)).toBe('2026-10-12T23:00:00.000Z'); // 17:00 local, ends 18:00
    expect(result).not.toContain('2026-10-12T23:15:00.000Z');
  });

  it('T05: closed days and blocked ranges offer no slots', () => {
    expect(run({ localDate: '2026-10-11' })).toEqual({ status: 'closed', slots: [] }); // Sunday
    const block = { from: at('2026-10-12T18:00:00Z'), until: at('2026-10-12T20:00:00Z') }; // 12:00–14:00
    const result = starts(run({ busy: [block] }));
    expect(result.some((s) => s >= '2026-10-12T17:31' && s < '2026-10-12T20:00')).toBe(false);
  });

  it('T06: rejects a staff member who does not offer the service', () => {
    expect(() => run({ staff: { ...staff, serviceIds: [] } })).toThrow(expect.objectContaining({ code: 'STAFF_CANNOT_PERFORM' }));
    expect(() => run({ service: service(30, { active: false }) })).toThrow(expect.objectContaining({ code: 'SERVICE_INACTIVE' }));
  });

  it('builds the grid from opening time, not from the current minute', () => {
    const result = starts(run({ business: business({ weeklySchedule: weekly(open('09:10', '10:00')) }) }));
    expect(result).toEqual(['2026-10-12T15:10:00.000Z', '2026-10-12T15:25:00.000Z']);
  });

  it('applies minimum notice with the server clock', () => {
    const now = at('2026-10-12T15:30:00Z'); // 9:30 local, 60 min notice
    const result = starts(run({ now }));
    expect(result[0]).toBe('2026-10-12T16:30:00.000Z'); // 10:30
  });

  it('refuses dates in the past or beyond the booking horizon', () => {
    expect(run({ localDate: '2026-10-10' }).status).toBe('outside_window');
    expect(run({ localDate: '2027-01-30' }).status).toBe('outside_window');
  });
});

describe('time zones', () => {
  const originalTz = process.env.TZ;
  afterEach(() => { process.env.TZ = originalTz; });

  it('T20: the business zone decides the date, whatever the server or browser zone', () => {
    const late = business({ weeklySchedule: weekly(open('23:00', '23:55')) });
    const compute = () => starts(run({ business: late, service: service(30) }));
    const inUtc = compute();
    process.env.TZ = 'Asia/Tokyo';
    expect(compute()).toEqual(inUtc);
    // 23:00 on Monday in Costa Rica is already Tuesday in UTC.
    expect(inUtc[0]).toBe('2026-10-13T05:00:00.000Z');
  });

  it('T21: skips local times that do not exist on spring-forward day', () => {
    const ny = business({
      timezone: 'America/New_York',
      weeklySchedule: weekly(open('01:00', '04:00'), []),
      bookingPolicy: { ...business().bookingPolicy, slotStepMinutes: 30 },
    });
    const result = computeAvailability({
      business: ny, service: service(30), staff, localDate: '2026-03-08', now: at('2026-03-01T00:00:00Z'),
    });
    // 02:00 and 02:30 do not exist; 01:30 EST is 06:30Z and 03:00 EDT is 07:00Z.
    expect(starts(result)).toEqual([
      '2026-03-08T06:00:00.000Z', '2026-03-08T06:30:00.000Z', '2026-03-08T07:00:00.000Z', '2026-03-08T07:30:00.000Z',
    ]);
  });

  it('T21: resolves an ambiguous fall-back time to its first occurrence', () => {
    expect(new Date(zonedToUtc('2026-11-01', 90, 'America/New_York')).toISOString()).toBe('2026-11-01T05:30:00.000Z');
    expect(zonedToUtc('2026-03-08', 150, 'America/New_York')).toBeNull();
  });
});
