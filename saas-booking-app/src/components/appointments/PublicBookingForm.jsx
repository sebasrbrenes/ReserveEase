import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createPublicBooking, errorMessage, fieldErrors, getPublicAvailability, getPublicBusiness } from '../../services/api';
import { COUNTRY_CODES, defaultCountryCode, isE164, toE164 } from '../../utils/countryCodes';
import { formatLocalDate, formatMoney, formatTime, fromLocalDateString, toLocalDateString, todayIn } from '../../utils/datetime';
import { Logo, Star, Underline } from '../ui/Doodles';

// Shown with the form; bump it when the privacy notice text changes.
const PRIVACY_NOTICE_VERSION = '2026-10';

// Form fields for the paths the API reports in its field errors.
const FIELD_BY_PATH = { 'client.name': 'clientName', 'client.email': 'email', 'client.phoneE164': 'phone', notes: 'notes' };
const FIELD_ORDER = ['clientName', 'email', 'phone', 'notes'];

// The error under a field; the field points at it with aria-describedby.
function FieldError({ id, message }) {
  if (!message) return null;
  return <p id={id} className="mt-1 text-sm font-semibold text-coral">{message}</p>;
}

function Step({ number, title, children }) {
  return (
    <section className="hd-card p-5 sm:p-6" aria-labelledby={`step-${number}`}>
      <h2 id={`step-${number}`} className="flex items-center gap-3 mb-4">
        <span className="font-hand text-2xl font-bold w-9 h-9 flex items-center justify-center border-2 border-ink rounded-full bg-sun" aria-hidden="true">
          {number}
        </span>
        <span className="hd-title text-3xl">{title}</span>
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-dashed border-ink-soft/40 last:border-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold text-right">{value || '—'}</dd>
    </div>
  );
}

export default function PublicBookingForm() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ serviceId: '', staffId: '', date: '', startsAt: '', clientName: '', email: '', phone: '', notes: '' });
  const [countryCode, setCountryCode] = useState('+1');
  // Errors shown next to their field: { clientName, email, phone, notes }.
  const [errors, setErrors] = useState({});
  const fieldRefs = { clientName: useRef(null), email: useRef(null), phone: useRef(null), notes: useRef(null) };
  const [availability, setAvailability] = useState({ loading: false, status: null, slots: [] });
  const [refreshSlots, setRefreshSlots] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  // One key per booking attempt: a retry after a network error reuses it, so
  // the server returns the same booking instead of creating a second one.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    getPublicBusiness(slug)
      .then((data) => {
        if (cancelled) return;
        setBusiness(data);
        setForm((prev) => ({ ...prev, date: todayIn(data.timezone) }));
        setCountryCode(defaultCountryCode(data.timezone));
      })
      .catch((error) => {
        if (!cancelled && error.status !== 404) toast.error(errorMessage(error));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [slug]);

  const availableStaff = useMemo(
    () => business?.staff.filter((s) => s.serviceIds.includes(form.serviceId)) ?? [],
    [business, form.serviceId]
  );

  useEffect(() => {
    if (!form.serviceId || !form.staffId || !form.date) {
      setAvailability({ loading: false, status: null, slots: [] });
      return undefined;
    }
    let cancelled = false;
    setAvailability((prev) => ({ ...prev, loading: true }));
    getPublicAvailability(slug, { serviceId: form.serviceId, staffId: form.staffId, date: form.date })
      .then((data) => !cancelled && setAvailability({ loading: false, status: data.status, slots: data.slots }))
      .catch((error) => {
        if (cancelled) return;
        setAvailability({ loading: false, status: null, slots: [] });
        toast.error(errorMessage(error));
      });
    return () => { cancelled = true; };
  }, [slug, form.serviceId, form.staffId, form.date, refreshSlots]);

  const update = (changes) => {
    setForm((prev) => ({ ...prev, ...changes }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === 'serviceId') update({ serviceId: value, staffId: '', startsAt: '' });
    else if (name === 'staffId') update({ staffId: value, startsAt: '' });
    else if (name === 'phone') update({ phone: value.replace(/[^0-9]/g, '') });
    else update({ [name]: value });
  };

  // Shows the errors next to their fields and moves the focus to the first.
  const showErrors = (found) => {
    setErrors(found);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) fieldRefs[first].current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !form.startsAt) return;
    const phone = toE164(countryCode, form.phone);
    if (phone && !isE164(phone)) {
      showErrors({ phone: `This number looks too short or too long. Write the full number, for example ${countryCode} 8888 7777.` });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const booking = await createPublicBooking(slug, {
        serviceId: form.serviceId,
        staffId: form.staffId,
        startsAt: form.startsAt,
        client: { name: form.clientName.trim(), email: form.email.trim(), phoneE164: phone },
        notes: form.notes,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        smsConsent: false,
      }, idempotencyKey);
      const service = business.services.find((s) => s.id === form.serviceId);
      const staff = business.staff.find((s) => s.id === form.staffId);
      navigate(`/booking/success/${slug}`, {
        state: { booking, businessName: business.name, serviceName: service?.name, staffName: staff?.displayName },
      });
    } catch (error) {
      // The server answered: this attempt is settled, the next one is new.
      if (error.status) setIdempotencyKey(crypto.randomUUID());
      if (['SLOT_UNAVAILABLE', 'SLOT_NOT_OFFERED'].includes(error.code)) {
        update({ startsAt: '' });
        setRefreshSlots((n) => n + 1);
      }
      const byField = Object.fromEntries(
        Object.entries(fieldErrors(error)).map(([path, message]) => [FIELD_BY_PATH[path], message])
      );
      if (Object.keys(byField).length) showErrors(byField);
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="hd-page flex flex-col items-center justify-center gap-4" role="status">
        <div className="w-12 h-12 border-4 border-ink border-t-transparent rounded-full animate-spin motion-reduce:animate-none" aria-hidden="true"></div>
        <p className="font-hand text-3xl">Loading...</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="hd-page flex flex-col items-center justify-center p-4">
        <div className="hd-card max-w-md p-8 text-center">
          <h1 className="hd-title text-4xl mb-3">Booking page not found</h1>
          <p className="text-ink-soft">
            This link is not active. Check the address or ask the business for its booking link.
          </p>
        </div>
      </div>
    );
  }

  const noSlotsMessage = {
    closed: 'Closed on this day. Choose another date.',
    outside_window: 'Bookings are not open for this date yet.',
    open: 'No free times on this day. Choose another date or staff member.',
  }[availability.status];

  const service = business.services.find((s) => s.id === form.serviceId);
  const staff = business.staff.find((s) => s.id === form.staffId);
  const timezone = business.timezone.replace(/_/g, ' ');

  return (
    <div className="hd-page py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center sm:text-left">
          <p className="text-ink-soft mb-1">Book an appointment with</p>
          <h1 className="relative inline-block">
            <span className="hd-title text-5xl sm:text-6xl">{business.name}</span>
            <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
            <Star className="hidden sm:block absolute -right-10 -top-2 w-7 h-7 text-marker rotate-12" />
          </h1>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <form id="booking-form" onSubmit={handleSubmit} className="space-y-6">
            <Step number={1} title="What would you like?">
              <div>
                <label htmlFor="serviceId" className="hd-label">Service *</label>
                <select id="serviceId" name="serviceId" value={form.serviceId} onChange={handleChange} className="hd-input" required>
                  <option value="">Select a service</option>
                  {business.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.durationMinutes} min · {formatMoney(s.priceMinor, s.currency)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="staffId" className="hd-label">Staff Member *</label>
                <select id="staffId" name="staffId" value={form.staffId} onChange={handleChange} className="hd-input" required disabled={!form.serviceId}>
                  <option value="">{form.serviceId ? 'Select staff member' : 'Select a service first'}</option>
                  {availableStaff.map((s) => (
                    <option key={s.id} value={s.id}>{s.displayName}</option>
                  ))}
                </select>
              </div>
            </Step>

            <Step number={2} title="When?">
              <div>
                <label htmlFor="date" className="hd-label">Date *</label>
                <DatePicker
                  id="date"
                  selected={form.date ? fromLocalDateString(form.date) : null}
                  onChange={(date) => date && update({ date: toLocalDateString(date), startsAt: '' })}
                  minDate={fromLocalDateString(todayIn(business.timezone))}
                  className="hd-input"
                  dateFormat="MMM d, yyyy"
                  wrapperClassName="w-full"
                  required
                />
              </div>

              <fieldset>
                <legend className="hd-label">
                  Time * <span className="font-normal text-ink-soft">({timezone})</span>
                </legend>
                {!form.staffId ? (
                  <p className="mt-2 hd-help">Choose a service and staff member to see free times.</p>
                ) : availability.loading ? (
                  <p className="mt-2 hd-help" role="status">Looking for free times...</p>
                ) : availability.slots.length === 0 ? (
                  <p className="mt-2 hd-help">{noSlotsMessage}</p>
                ) : (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {availability.slots.map((slot) => (
                      <button
                        type="button"
                        key={slot.startsAt}
                        onClick={() => update({ startsAt: slot.startsAt })}
                        aria-pressed={form.startsAt === slot.startsAt}
                        className="hd-choice"
                      >
                        {formatTime(slot.startsAt, business.timezone)}
                      </button>
                    ))}
                  </div>
                )}
              </fieldset>
            </Step>

            <Step number={3} title="About you">
              <div>
                <label htmlFor="clientName" className="hd-label">Full Name *</label>
                <input
                  id="clientName" ref={fieldRefs.clientName} type="text" name="clientName" value={form.clientName} onChange={handleChange}
                  className="hd-input" maxLength={100} autoComplete="name" required
                  aria-invalid={Boolean(errors.clientName)} aria-describedby={errors.clientName ? 'clientName-error' : undefined}
                />
                <FieldError id="clientName-error" message={errors.clientName} />
              </div>

              <div>
                <label htmlFor="email" className="hd-label">Email *</label>
                <input
                  id="email" ref={fieldRefs.email} type="email" name="email" value={form.email} onChange={handleChange}
                  className="hd-input" maxLength={200} autoComplete="email" required
                  aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined}
                />
                <FieldError id="email-error" message={errors.email} />
              </div>

              <div>
                <label htmlFor="phone" className="hd-label">Phone</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    aria-label="Country code"
                    value={countryCode}
                    onChange={(e) => {
                      setCountryCode(e.target.value);
                      setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    className="hd-input"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
                    ))}
                  </select>
                  <input
                    id="phone"
                    ref={fieldRefs.phone}
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    className="hd-input col-span-2"
                    placeholder="88887777"
                    autoComplete="tel-national"
                    maxLength={14}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'phone-error' : 'phone-help'}
                  />
                </div>
                <FieldError id="phone-error" message={errors.phone} />
                {!errors.phone && <p id="phone-help" className="mt-1 hd-help">Optional. Choose the country and write the number without its code.</p>}
              </div>

              <div>
                <label htmlFor="notes" className="hd-label">Notes</label>
                <textarea
                  id="notes" ref={fieldRefs.notes} name="notes" value={form.notes} onChange={handleChange} rows="3" maxLength={500} className="hd-input"
                  aria-invalid={Boolean(errors.notes)} aria-describedby={errors.notes ? 'notes-error' : undefined}
                />
                <FieldError id="notes-error" message={errors.notes} />
              </div>
            </Step>
          </form>

          <aside className="hd-card p-5 sm:p-6 lg:sticky lg:top-6" aria-labelledby="summary-title">
            <h2 id="summary-title" className="hd-title text-3xl mb-3">Your booking</h2>
            <dl className="text-sm mb-5">
              <SummaryRow label="Service" value={service?.name} />
              <SummaryRow label="Duration" value={service && `${service.durationMinutes} min`} />
              <SummaryRow label="Price" value={service && formatMoney(service.priceMinor, service.currency)} />
              <SummaryRow label="With" value={staff?.displayName} />
              <SummaryRow label="Date" value={form.date && formatLocalDate(form.date)} />
              <SummaryRow label="Time" value={form.startsAt && `${formatTime(form.startsAt, business.timezone)} (${timezone})`} />
            </dl>

            <button type="submit" form="booking-form" disabled={submitting || !form.startsAt} className="hd-btn w-full text-lg">
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
            {!form.startsAt && <p className="mt-2 hd-help text-center">Pick a time to book.</p>}

            <p className="mt-4 text-xs text-ink-soft">
              {business.name} uses your name, email and phone only to manage this appointment and contact you about it.
            </p>
          </aside>
        </div>

        <footer className="mt-10 flex justify-center opacity-70">
          <span className="text-xs text-ink-soft mr-2 self-center">Bookings by</span>
          <Logo className="scale-75 origin-left" />
        </footer>
      </div>
    </div>
  );
}
