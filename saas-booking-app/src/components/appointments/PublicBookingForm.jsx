import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { createPublicBooking, errorMessage, getPublicAvailability, getPublicBusiness } from '../../services/api';
import { COUNTRY_CODES, toE164 } from '../../utils/countryCodes';
import { formatMoney, formatTime, fromLocalDateString, toLocalDateString, todayIn } from '../../utils/datetime';

// Shown with the form; bump it when the privacy notice text changes.
const PRIVACY_NOTICE_VERSION = '2026-10';

const inputClass = 'mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2';

export default function PublicBookingForm() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ serviceId: '', staffId: '', date: '', startsAt: '', clientName: '', email: '', phone: '', notes: '' });
  const [countryCode, setCountryCode] = useState('+1');
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
    if (name === 'serviceId') update({ serviceId: value, staffId: '', startsAt: '' });
    else if (name === 'staffId') update({ staffId: value, startsAt: '' });
    else if (name === 'phone') update({ phone: value.replace(/[^0-9]/g, '') });
    else update({ [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !form.startsAt) return;
    setSubmitting(true);
    try {
      const booking = await createPublicBooking(slug, {
        serviceId: form.serviceId,
        staffId: form.staffId,
        startsAt: form.startsAt,
        client: { name: form.clientName.trim(), email: form.email.trim(), phoneE164: toE164(countryCode, form.phone) },
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
      toast.error(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-bold text-white mb-2">Booking page not found</h2>
        <p className="text-gray-400 text-center max-w-md">
          This link is not active. Check the address or ask the business for its booking link.
        </p>
      </div>
    );
  }

  const noSlotsMessage = {
    closed: 'Closed on this day. Choose another date.',
    outside_window: 'Bookings are not open for this date yet.',
    open: 'No free times on this day. Choose another date or staff member.',
  }[availability.status];

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Book an Appointment</h2>
        <p className="text-gray-400 text-center mb-6 text-lg">
          with <span className="font-semibold text-blue-400 inline">{business.name}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="serviceId" className="block text-sm font-medium text-gray-300">Service *</label>
            <select id="serviceId" name="serviceId" value={form.serviceId} onChange={handleChange} className={inputClass} required>
              <option value="">Select a service</option>
              {business.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} min · {formatMoney(service.priceMinor, service.currency)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="staffId" className="block text-sm font-medium text-gray-300">Staff Member *</label>
            <select id="staffId" name="staffId" value={form.staffId} onChange={handleChange} className={inputClass} required disabled={!form.serviceId}>
              <option value="">{form.serviceId ? 'Select staff member' : 'Select a service first'}</option>
              {availableStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Date *</label>
            <DatePicker
              selected={form.date ? fromLocalDateString(form.date) : null}
              onChange={(date) => date && update({ date: toLocalDateString(date), startsAt: '' })}
              minDate={fromLocalDateString(todayIn(business.timezone))}
              className={inputClass}
              dateFormat="MMM d, yyyy"
              wrapperClassName="w-full"
              required
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-gray-300">
              Time * <span className="text-gray-500 font-normal">({business.timezone.replace('_', ' ')})</span>
            </legend>
            {!form.staffId ? (
              <p className="mt-2 text-sm text-gray-400">Choose a service and staff member to see free times.</p>
            ) : availability.loading ? (
              <p className="mt-2 text-sm text-gray-400">Looking for free times...</p>
            ) : availability.slots.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">{noSlotsMessage}</p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {availability.slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.startsAt}
                    onClick={() => update({ startsAt: slot.startsAt })}
                    aria-pressed={form.startsAt === slot.startsAt}
                    className={`px-2 py-2 rounded-md text-sm border ${form.startsAt === slot.startsAt
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'}`}
                  >
                    {formatTime(slot.startsAt, business.timezone)}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-300">Full Name *</label>
            <input id="clientName" type="text" name="clientName" value={form.clientName} onChange={handleChange} className={inputClass} maxLength={100} required />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email *</label>
            <input id="email" type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} maxLength={200} required />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300">Phone</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <select
                aria-label="Country code"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
              >
                {COUNTRY_CODES.map((country) => (
                  <option key={country.code} value={country.code}>{country.name} ({country.code})</option>
                ))}
              </select>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="col-span-2 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
                placeholder="88887777"
                maxLength={14}
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-300">Notes</label>
            <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows="3" maxLength={500} className={inputClass} />
          </div>

          <p className="text-xs text-gray-400">
            {business.name} uses your name, email and phone only to manage this appointment and contact you about it.
          </p>

          <button
            type="submit"
            disabled={submitting || !form.startsAt}
            className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting || !form.startsAt ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {submitting ? 'Booking...' : 'Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
