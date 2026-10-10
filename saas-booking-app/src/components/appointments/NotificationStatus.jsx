import { FiMail } from 'react-icons/fi';

// What happened to the latest email of an appointment. "Simulated" means the
// server runs without a real email provider: nothing reached the client.
const LABELS = {
  queued: { text: 'Email pending', className: 'text-ink-soft' },
  processing: { text: 'Sending email', className: 'text-ink-soft' },
  simulated: { text: 'Email simulated (test mode)', className: 'text-ink-soft' },
  accepted: { text: 'Email sent', className: 'text-leaf font-semibold' },
  delivered: { text: 'Email delivered', className: 'text-leaf font-semibold' },
  failed: { text: 'Email failed', className: 'text-coral font-semibold' },
  disabled: { text: 'Client emails off', className: 'text-ink-soft' },
};

const TEMPLATE = {
  confirmation_email: 'confirmation',
  reschedule_email: 'new time',
  reminder_email: 'reminder',
  cancellation_email: 'cancellation',
};

const NotificationStatus = ({ notification, onRetry }) => {
  const label = LABELS[notification?.status];
  if (!label) return null;
  return (
    <p className={`mt-1 flex flex-wrap items-center gap-1 text-xs ${label.className}`}>
      <FiMail className="w-3 h-3" aria-hidden="true" />
      {label.text}
      {TEMPLATE[notification.template] && <span className="text-ink-soft font-normal">· {TEMPLATE[notification.template]}</span>}
      {notification.status === 'failed' && onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 font-bold text-coral underline decoration-2 underline-offset-2 hover:text-ink">Retry</button>
      )}
    </p>
  );
};

export default NotificationStatus;
