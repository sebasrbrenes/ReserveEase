// Email content for appointment notifications. Dates are absolute and carry
// the business time zone; every variable is escaped before going into HTML.

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Copy per language of the business (business.language); Spanish by default.
const LOCALES = {
  es: {
    locale: 'es-CR',
    at: 'a las',
    labels: { service: 'Servicio', with: 'Con', when: 'Cuándo', reference: 'Referencia' },
    greeting: (name) => `Hola, ${name}:`,
    linkLead: '¿Necesitas cambiarla o cancelarla? Usa este enlace:',
    templates: {
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
    },
  },
  en: {
    locale: 'en-US',
    at: 'at',
    labels: { service: 'Service', with: 'With', when: 'When', reference: 'Reference' },
    greeting: (name) => `Hello ${name},`,
    linkLead: 'Need to change or cancel it? Use this link:',
    templates: {
      confirmation_email: {
        subject: (b) => `Your appointment with ${b} is confirmed`,
        lead: 'Your appointment is confirmed.',
      },
      reschedule_email: {
        subject: (b) => `Your appointment with ${b} has a new time`,
        lead: 'Your appointment has been moved. These are the new details.',
      },
      reminder_email: {
        subject: (b) => `Reminder: your appointment with ${b}`,
        lead: 'This is a reminder of your upcoming appointment.',
      },
      cancellation_email: {
        subject: (b) => `Your appointment with ${b} was cancelled`,
        lead: 'Your appointment has been cancelled. This time is no longer reserved for you.',
      },
    },
  },
};

const when = (date, timeZone, lang) => {
  const day = new Intl.DateTimeFormat(lang.locale, {
    timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat(lang.locale, { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day} ${lang.at} ${time} (${timeZone.replace(/_/g, ' ')})`;
};

export const isKnownTemplate = (template) => Object.hasOwn(LOCALES.es.templates, template);

/**
 * @param {string} template
 * @param {{ appointment: object, businessName: string, manageUrl?: string|null, language?: string }} data
 * @returns {{ to: string, subject: string, text: string, html: string }}
 */
export const renderEmail = (template, { appointment, businessName, manageUrl = null, language = 'es' }) => {
  const lang = LOCALES[language] || LOCALES.es;
  const copy = lang.templates[template];
  if (!copy) throw new Error(`Unknown template ${template}`);
  const startsAt = appointment.startsAt.toDate();
  const details = [
    [lang.labels.service, appointment.serviceSnapshot?.name],
    [lang.labels.with, appointment.staffSnapshot?.displayName],
    [lang.labels.when, when(startsAt, appointment.businessTimezone, lang)],
    [lang.labels.reference, appointment.id],
  ];
  const greeting = lang.greeting(appointment.client.name);
  // A cancelled appointment has nothing left to change.
  const link = template !== 'cancellation_email' && manageUrl;
  const { linkLead } = lang;
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
