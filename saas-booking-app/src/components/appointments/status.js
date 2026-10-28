// Appointment states of the booking API and what the dashboard can do from each.
// className holds the Hand-Drawn badge colors; pair it with `hd-badge`. The
// labels are in the interface copy (t.status and t.statusActions).
export const STATUS = {
  confirmed: 'text-marker bg-marker-light',
  completed: 'text-leaf bg-leaf-light',
  no_show: 'text-ink bg-sun-light',
  cancelled: 'text-coral bg-coral-light',
};

// Actions offered on a confirmed appointment. completed and no_show are only
// accepted by the server once the appointment has started.
export const STATUS_ACTIONS = ['completed', 'no_show', 'cancelled'];

// The actions that make sense now: before the start only cancelling does.
export const statusActionsFor = (appointment, t, now = Date.now()) => (
  Date.parse(appointment.startsAt) <= now
    ? STATUS_ACTIONS
    : STATUS_ACTIONS.filter((action) => action === 'cancelled')
).map((value) => ({ value, label: t.statusActions[value] }));

export const statusLabel = (status, t) => t.status[status] || status;
export const statusClass = (status) => STATUS[status] || 'text-ink-soft bg-paper-deep';
