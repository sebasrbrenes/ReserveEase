import { FiMail } from 'react-icons/fi';

// What happened to the latest email of an appointment. "Simulated" means the
// server runs without a real email provider: nothing reached the client.
const LABELS = {
  queued: { text: 'Email pending', className: 'text-gray-400' },
  processing: { text: 'Sending email', className: 'text-gray-400' },
  simulated: { text: 'Email simulated (test mode)', className: 'text-gray-400' },
  accepted: { text: 'Email sent', className: 'text-green-500' },
  delivered: { text: 'Email delivered', className: 'text-green-500' },
  failed: { text: 'Email failed', className: 'text-red-400' },
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
    <p className={`flex items-center gap-1 text-xs ${label.className}`}>
      <FiMail className="w-3 h-3" aria-hidden="true" />
      {label.text}
      {TEMPLATE[notification.template] && <span className="text-gray-500">· {TEMPLATE[notification.template]}</span>}
      {notification.status === 'failed' && onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 underline hover:text-white">Retry</button>
      )}
    </p>
  );
};

export default NotificationStatus;
