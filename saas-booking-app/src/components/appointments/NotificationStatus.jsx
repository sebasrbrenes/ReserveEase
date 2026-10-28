import { FiMail } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

// What happened to the latest email of an appointment. "Simulated" means the
// server runs without a real email provider: nothing reached the client.
const CLASSES = {
  queued: 'text-ink-soft',
  processing: 'text-ink-soft',
  simulated: 'text-ink-soft',
  accepted: 'text-leaf font-semibold',
  delivered: 'text-leaf font-semibold',
  failed: 'text-coral font-semibold',
  disabled: 'text-ink-soft',
};

const NotificationStatus = ({ notification, onRetry }) => {
  const { t: { notification: copy } } = useLanguage();
  const className = CLASSES[notification?.status];
  if (!className) return null;
  const template = copy.templates[notification.template];
  return (
    <p className={`mt-1 flex flex-wrap items-center gap-1 text-xs ${className}`}>
      <FiMail className="w-3 h-3" aria-hidden="true" />
      {copy[notification.status]}
      {template && <span className="text-ink-soft font-normal">· {template}</span>}
      {notification.status === 'failed' && onRetry && (
        <button type="button" onClick={onRetry} className="ml-1 font-bold text-coral underline decoration-2 underline-offset-2 hover:text-ink">{copy.retry}</button>
      )}
    </p>
  );
};

export default NotificationStatus;
