// Appointment states of the booking API and what the dashboard can do from each.
// className holds the Hand-Drawn badge colors; pair it with `hd-badge`.
export const STATUS = {
  confirmed: { label: 'Confirmada', className: 'text-marker bg-marker-light' },
  completed: { label: 'Completada', className: 'text-leaf bg-leaf-light' },
  no_show: { label: 'No asistió', className: 'text-ink bg-sun-light' },
  cancelled: { label: 'Cancelada', className: 'text-coral bg-coral-light' },
};

// Actions offered on a confirmed appointment. completed and no_show are only
// accepted by the server once the appointment has started.
export const STATUS_ACTIONS = [
  { value: 'completed', label: 'Marcar completada' },
  { value: 'no_show', label: 'Marcar que no asistió' },
  { value: 'cancelled', label: 'Cancelar cita' },
];

// The actions that make sense now: before the start only cancelling does.
export const statusActionsFor = (appointment, now = Date.now()) => (
  Date.parse(appointment.startsAt) <= now
    ? STATUS_ACTIONS
    : STATUS_ACTIONS.filter((action) => action.value === 'cancelled')
);

export const statusLabel = (status) => STATUS[status]?.label || status;
export const statusClass = (status) => STATUS[status]?.className || 'text-ink-soft bg-paper-deep';
