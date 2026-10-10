// Availability by duration (master document, sections 12.1 and 12.2).
// Pure functions: no Firestore, no clock, no React. Callers pass "now".

import {
  MINUTE, daysBetween, hhmmToMinutes, localDateOf, weekdayOf, zonedToUtc,
} from './time.js';

export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Half-open intervals [from, until) overlap when each starts before the other ends.
export const overlaps = (a, b) => a.from < b.until && b.from < a.until;

// Interval a booking occupies, buffers included.
export const occupancyOf = (service, startsAtMs) => {
  const endsAtMs = startsAtMs + service.durationMinutes * MINUTE;
  return {
    from: startsAtMs - service.bufferBeforeMinutes * MINUTE,
    until: endsAtMs + service.bufferAfterMinutes * MINUTE,
  };
};

export const assertCanBook = (service, staff) => {
  if (!service.active) throw new DomainError('SERVICE_INACTIVE', 'Service is not available');
  if (!staff.active) throw new DomainError('STAFF_INACTIVE', 'Staff member is not available');
  if (!staff.serviceIds.includes(service.id)) {
    throw new DomainError('STAFF_CANNOT_PERFORM', 'Staff member does not offer this service');
  }
};

/**
 * Lists the start times a staff member can take a service on a local date.
 *
 * @param {object} p
 * @param {object} p.business   businessSchema (timezone, weeklySchedule, bookingPolicy)
 * @param {object} p.service    serviceSchema
 * @param {object} p.staff      staffSchema
 * @param {string} p.localDate  YYYY-MM-DD in the business time zone
 * @param {Array<{from:number, until:number}>} p.busy  occupied intervals (ms) of this staff
 * @param {number} p.now        current instant (ms), from the server clock
 * @returns {{ status: 'open'|'closed'|'outside_window', slots: Array<{startsAt:string, endsAt:string}> }}
 */
export const computeAvailability = ({ business, service, staff, localDate, busy = [], now }) => {
  assertCanBook(service, staff);
  const { timezone, weeklySchedule, bookingPolicy } = business;

  const daysAhead = daysBetween(localDateOf(now, timezone), localDate);
  if (daysAhead < 0 || daysAhead > bookingPolicy.maxAdvanceDays) {
    return { status: 'outside_window', slots: [] };
  }

  const intervals = weeklySchedule[weekdayOf(localDate)] || [];
  if (intervals.length === 0) return { status: 'closed', slots: [] };

  const earliestStart = now + bookingPolicy.minNoticeMinutes * MINUTE;
  const slots = [];

  for (const interval of intervals) {
    const open = hhmmToMinutes(interval.start);
    const close = hhmmToMinutes(interval.end);
    // The grid starts at opening time, not at the current minute.
    for (let start = open; start + service.durationMinutes <= close; start += bookingPolicy.slotStepMinutes) {
      const startsAtMs = zonedToUtc(localDate, start, timezone);
      if (startsAtMs === null) continue; // local time skipped by a DST change
      if (startsAtMs < earliestStart) continue;

      const occupied = occupancyOf(service, startsAtMs);
      if (busy.some((b) => overlaps(occupied, b))) continue;

      slots.push({
        startsAt: new Date(startsAtMs).toISOString(),
        endsAt: new Date(startsAtMs + service.durationMinutes * MINUTE).toISOString(),
      });
    }
  }

  return { status: 'open', slots };
};
