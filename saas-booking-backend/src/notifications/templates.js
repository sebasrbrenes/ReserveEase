// Email content for appointment notifications. Dates are absolute and carry
// the business time zone; every variable is escaped before going into HTML.

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const when = (date, timeZone) => {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
  return `${day} at ${time} (${timeZone.replace(/_/g, ' ')})`;
};

const COPY = {
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
    ['Service', appointment.serviceSnapshot?.name],
    ['With', appointment.staffSnapshot?.displayName],
    ['When', when(startsAt, appointment.businessTimezone)],
    ['Reference', appointment.id],
  ];
  const greeting = `Hello ${appointment.client.name},`;
  // A cancelled appointment has nothing left to change.
  const link = template !== 'cancellation_email' && manageUrl;
  const linkLead = 'Need to change or cancel it? Use this link:';
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
