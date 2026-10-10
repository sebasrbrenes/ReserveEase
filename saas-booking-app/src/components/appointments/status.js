// Appointment states of the booking API and what the dashboard can do from each.
// className holds the Hand-Drawn badge colors; pair it with `hd-badge`.
export const STATUS = {
  confirmed: { label: 'Confirmed', className: 'text-marker bg-marker-light' },
  completed: { label: 'Completed', className: 'text-leaf bg-leaf-light' },
  no_show: { label: 'No-show', className: 'text-ink bg-sun-light' },
  cancelled: { label: 'Cancelled', className: 'text-coral bg-coral-light' },
};

// Actions offered on a confirmed appointment. completed and no_show are only
// accepted by the server once the appointment has started.
export const STATUS_ACTIONS = [
  { value: 'completed', label: 'Mark completed' },
  { value: 'no_show', label: 'Mark no-show' },
  { value: 'cancelled', label: 'Cancel appointment' },
];

export const statusLabel = (status) => STATUS[status]?.label || status;
export const statusClass = (status) => STATUS[status]?.className || 'text-ink-soft bg-paper-deep';
