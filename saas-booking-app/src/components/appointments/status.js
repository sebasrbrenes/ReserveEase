// Appointment states of the booking API and what the dashboard can do from each.
export const STATUS = {
  confirmed: { label: 'Confirmed', className: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-500' },
  no_show: { label: 'No-show', className: 'bg-gray-500/20 text-gray-300' },
  cancelled: { label: 'Cancelled', className: 'bg-red-500/20 text-red-500' },
};

// Actions offered on a confirmed appointment. completed and no_show are only
// accepted by the server once the appointment has started.
export const STATUS_ACTIONS = [
  { value: 'completed', label: 'Mark completed' },
  { value: 'no_show', label: 'Mark no-show' },
  { value: 'cancelled', label: 'Cancel appointment' },
];

export const statusLabel = (status) => STATUS[status]?.label || status;
export const statusClass = (status) => STATUS[status]?.className || 'bg-gray-500/20 text-gray-300';
