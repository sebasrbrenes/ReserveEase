import { FiMail } from 'react-icons/fi';

// What happened to the latest email of an appointment. "Simulated" means the
// server runs without a real email provider: nothing reached the client.
const LABELS = {
  queued: { text: 'Correo pendiente', className: 'text-ink-soft' },
  processing: { text: 'Enviando correo', className: 'text-ink-soft' },
  simulated: { text: 'Correo simulado (modo de prueba)', className: 'text-ink-soft' },
  accepted: { text: 'Correo enviado', className: 'text-leaf font-semibold' },
  delivered: { text: 'Correo entregado', className: 'text-leaf font-semibold' },
  failed: { text: 'Falló el correo', className: 'text-coral font-semibold' },
  disabled: { text: 'Correos a clientes apagados', className: 'text-ink-soft' },
};

const TEMPLATE = {
  confirmation_email: 'confirmación',
  reschedule_email: 'nueva hora',
  reminder_email: 'recordatorio',
  cancellation_email: 'cancelación',
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
        <button type="button" onClick={onRetry} className="ml-1 font-bold text-coral underline decoration-2 underline-offset-2 hover:text-ink">Reintentar</button>
      )}
    </p>
  );
};

export default NotificationStatus;
