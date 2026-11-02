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
    button: 'Cambiar o cancelar',
    footer: 'Reservas gestionadas con ReserveEase',
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
    button: 'Change or cancel',
    footer: 'Bookings managed with ReserveEase',
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

// ReserveEase colors (saas-booking-app/tailwind.config.js).
const C = {
  paper: '#FBF7EF', card: '#FFFFFF', ink: '#1F2328', soft: '#4A4F57', line: '#E6DFD0',
  marker: '#2450B8', coral: '#B83A2A',
};
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Table layout with inline styles: what email clients (Gmail, Outlook,
// Apple Mail) render reliably. 600px wide on desktop, full width on phones.
const layout = ({ lang, businessName, preheader, greeting, lead, details, link, cancelled }) => {
  const e = escapeHtml;
  const rows = details.map(([k, v]) => `
          <tr>
            <td style="padding:6px 0;color:${C.soft};font-size:14px;width:110px;vertical-align:top;">${e(k)}</td>
            <td style="padding:6px 0;color:${C.ink};font-size:15px;font-weight:600;">${e(v)}</td>
          </tr>`).join('');
  const button = link ? `
          <p style="margin:24px 0 8px;color:${C.soft};font-size:14px;">${e(link.lead)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="border-radius:10px;background:${C.marker};">
              <a href="${e(link.url)}" style="display:inline-block;padding:12px 22px;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;">${e(link.label)}</a>
            </td>
          </tr></table>
          <p style="margin:12px 0 0;font-size:12px;color:${C.soft};word-break:break-all;"><a href="${e(link.url)}" style="color:${C.marker};">${e(link.url)}</a></p>` : '';
  return `<!DOCTYPE html>
<html lang="${e(lang.locale.slice(0, 2))}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(businessName)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td style="padding:0 4px 12px;font-size:20px;font-weight:800;color:${C.ink};">${e(businessName)}</td></tr>
      <tr><td style="background:${C.card};border:2px solid ${C.ink};border-radius:14px;padding:24px;">
          <p style="margin:0 0 8px;font-size:16px;color:${C.ink};">${e(greeting)}</p>
          <p style="margin:0 0 20px;font-size:18px;font-weight:700;color:${cancelled ? C.coral : C.ink};">${e(lead)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};">${rows}
          </table>${button}
      </td></tr>
      <tr><td style="padding:16px 4px;font-size:12px;color:${C.soft};text-align:center;">${e(lang.footer)}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
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
  const html = layout({
    lang, businessName, preheader: copy.lead, greeting, lead: copy.lead, details,
    link: link ? { lead: linkLead, url: manageUrl, label: lang.button } : null,
    cancelled: template === 'cancellation_email',
  });
  return { to: appointment.client.email, subject: copy.subject(businessName), text, html };
};
