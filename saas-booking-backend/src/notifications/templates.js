// Email content for appointment notifications. Dates are absolute and carry
// the business time zone; every variable is escaped before going into HTML.

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const when = (date, timeZone) => {
  const day = new Intl.DateTimeFormat('es-CR', {
    timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('es-CR', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day} a las ${time} (${timeZone.replace(/_/g, ' ')})`;
};

const COPY = {
  confirmation_email: {
    subject: (b) => `Tu cita con ${b} está confirmada`,
    lead: 'Tu cita está confirmada.',
  },
  reschedule_email: {
    subject: (b) => `Tu cita con ${b} tiene una nueva hora`,
    lead: 'Tu cita cambió de hora. Estos son los nuevos detalles.',
  },
  reminder_email: {
    subject: (b) => `Recordatorio: tu cita con ${b}`,
    lead: 'Te recordamos tu próxima cita.',
  },
  cancellation_email: {
    subject: (b) => `Tu cita con ${b} fue cancelada`,
    lead: 'Tu cita fue cancelada. Esa hora ya no está reservada para ti.',
  },
};

export const isKnownTemplate = (template) => Object.hasOwn(COPY, template);

/**
 * @param {string} template
 * @param {{ appointment: object, businessName: string, manageUrl?: string|null }} data
 * @returns {{ to: string, subject: string, text: string, html: string }}
 */
export const renderEmail = (template, { appointment, businessName, manageUrl = null }) => {
  const copy = COPY[template];
  if (!copy) throw new Error(`Unknown template ${template}`);
  const startsAt = appointment.startsAt.toDate();
  const details = [
    ['Servicio', appointment.serviceSnapshot?.name],
    ['Con', appointment.staffSnapshot?.displayName],
    ['Cuándo', when(startsAt, appointment.businessTimezone)],
    ['Referencia', appointment.id],
  ];
  const greeting = `Hola, ${appointment.client.name}:`;
  // A cancelled appointment has nothing left to change.
  const link = template !== 'cancellation_email' && manageUrl;
  const linkLead = '¿Necesitas cambiarla o cancelarla? Usa este enlace:';
  const text = [
    greeting, '', copy.lead, '',
    ...details.map(([k, v]) => `${k}: ${v}`),
    ...(link ? ['', linkLead, manageUrl] : []),
    '', businessName,
  ].join('\n');
  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    `<p>${escapeHtml(copy.lead)}</p>`,
    '<table>',
    ...details.map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(v)}</td></tr>`),
    '</table>',
    ...(link ? [`<p>${escapeHtml(linkLead)} <a href="${escapeHtml(manageUrl)}">${escapeHtml(manageUrl)}</a></p>`] : []),
    `<p>${escapeHtml(businessName)}</p>`,
  ].join('\n');
  return { to: appointment.client.email, subject: copy.subject(businessName), text, html };
};
