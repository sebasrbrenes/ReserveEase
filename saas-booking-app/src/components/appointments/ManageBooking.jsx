import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  cancelManagedAppointment, errorMessage, getManagedAppointment, getManagedAvailability, rescheduleManagedAppointment,
} from '../../services/api';
import { formatLocalDate, formatTime, fromLocalDateString, toLocalDateString, todayIn } from '../../utils/datetime';
import { Logo, Scribble } from '../ui/Doodles';

const STATUS_TEXT = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'Missed',
};

const localDateIn = (iso, timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));

// Opened from the link in the client's emails: shows their appointment and
// lets them move or cancel it until the business's cancellation notice.
export default function ManageBooking() {
  const { businessId, appointmentId } = useParams();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('k') || '';
  const [loading, setLoading] = useState(true);
  const [apt, setApt] = useState(null);
  const [mode, setMode] = useState('view'); // view | reschedule | cancel
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState({ loading: false, status: null, list: [] });
  const [startsAt, setStartsAt] = useState('');
  const [refreshSlots, setRefreshSlots] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getManagedAppointment(businessId, appointmentId, key)
      .then((data) => !cancelled && setApt(data))
      .catch((error) => {
        if (!cancelled && error.status !== 404 && error.status !== 400) toast.error(errorMessage(error));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [businessId, appointmentId, key]);

  useEffect(() => {
    if (mode !== 'reschedule' || !date) return undefined;
    let cancelled = false;
    setSlots((prev) => ({ ...prev, loading: true }));
    getManagedAvailability(businessId, appointmentId, key, date)
      .then((data) => !cancelled && setSlots({ loading: false, status: data.status, list: data.slots }))
      .catch((error) => {
        if (cancelled) return;
        setSlots({ loading: false, status: null, list: [] });
        toast.error(errorMessage(error));
      });
    return () => { cancelled = true; };
  }, [mode, date, businessId, appointmentId, key, refreshSlots]);

  // A conflict means the appointment changed: show its current state.
  const reload = () => getManagedAppointment(businessId, appointmentId, key).then(setApt).catch(() => {});

  const startReschedule = () => {
    setDate(localDateIn(apt.startsAt, apt.timezone));
    setStartsAt('');
    setMode('reschedule');
  };

  const submit = async (action) => {
    setSaving(true);
    try {
      const updated = action === 'cancel'
        ? await cancelManagedAppointment(businessId, appointmentId, key, { expectedVersion: apt.version })
        : await rescheduleManagedAppointment(businessId, appointmentId, key, { expectedVersion: apt.version, startsAt });
      setApt(updated);
      setMode('view');
      toast.success(action === 'cancel' ? 'Your appointment was cancelled.' : 'Your appointment has a new time.');
    } catch (error) {
      toast.error(errorMessage(error));
      if (['VERSION_CONFLICT', 'TOO_LATE_TO_CHANGE', 'INVALID_TRANSITION'].includes(error.code)) {
        await reload();
        setMode('view');
      }
      if (['SLOT_UNAVAILABLE', 'SLOT_NOT_OFFERED'].includes(error.code)) {
        setStartsAt('');
        setRefreshSlots((n) => n + 1);
      }
    } finally {
      setSaving(false);
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

  if (!apt) {
    return (
      <div className="hd-page flex flex-col items-center justify-center p-4">
        <div className="hd-card max-w-md p-8 text-center">
          <h1 className="hd-title text-4xl mb-3">Appointment not found</h1>
          <p className="text-ink-soft">
            This link is not valid. Open the link from your latest email, or contact the business.
          </p>
        </div>
      </div>
    );
  }

  const timezone = apt.timezone.replace(/_/g, ' ');
  const when = `${formatLocalDate(localDateIn(apt.startsAt, apt.timezone))} at ${formatTime(apt.startsAt, apt.timezone)}`;
  const deadline = `${formatLocalDate(localDateIn(apt.changeableUntil, apt.timezone))} at ${formatTime(apt.changeableUntil, apt.timezone)}`;
  const noSlotsMessage = {
    closed: 'Closed on this day. Choose another date.',
    outside_window: 'Bookings are not open for this date.',
    open: 'No free times on this day. Choose another date.',
  }[slots.status];

  return (
    <div className="hd-page py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center">
          <p className="text-ink-soft mb-1">Your appointment with</p>
          <h1 className="hd-title text-5xl">{apt.businessName}</h1>
        </header>

        <section className="hd-card p-6" aria-labelledby="details-title">
          <h2 id="details-title" className="sr-only">Details</h2>
          <p className="mb-3">
            <span className={`inline-block px-3 py-0.5 border-2 border-ink rounded-full text-sm font-bold ${apt.status === 'cancelled' ? 'bg-coral-light' : 'bg-leaf/20'}`}>{STATUS_TEXT[apt.status] || apt.status}</span>
          </p>
          <p className="font-bold text-lg">{apt.serviceName} with {apt.staffName}</p>
          <p className="relative inline-block px-6 py-3 my-1 font-semibold">
            <Scribble className="absolute inset-0 w-full h-full text-sun" />
            <span className={`relative ${apt.status === 'cancelled' ? 'line-through' : ''}`}>{when}</span>
          </p>
          <p className="hd-help">Times in {timezone}. Reference: <span className="font-mono font-bold">{apt.id}</span></p>

          {apt.status === 'confirmed' && (apt.canChange ? (
            mode === 'view' && (
              <>
                <p className="hd-help mt-4">You can change or cancel it online until {deadline}.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={startReschedule} className="hd-btn">Change time</button>
                  <button type="button" onClick={() => setMode('cancel')} className="hd-btn hd-btn-secondary">Cancel appointment</button>
                </div>
              </>
            )
          ) : (
            <p className="hd-help mt-4">It is too late to change it online. If you need to, contact {apt.businessName}.</p>
          ))}
        </section>

        {mode === 'cancel' && (
          <section className="hd-card p-6" aria-labelledby="cancel-title">
            <h2 id="cancel-title" className="hd-title text-3xl mb-2">Cancel this appointment?</h2>
            <p className="mb-4">The time will be freed for someone else. This cannot be undone.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => submit('cancel')} disabled={saving} className="hd-btn bg-coral text-white">
                {saving ? 'Cancelling...' : 'Yes, cancel it'}
              </button>
              <button type="button" onClick={() => setMode('view')} disabled={saving} className="hd-btn hd-btn-secondary">Keep it</button>
            </div>
          </section>
        )}

        {mode === 'reschedule' && (
          <section className="hd-card p-6 space-y-4" aria-labelledby="reschedule-title">
            <h2 id="reschedule-title" className="hd-title text-3xl">Choose a new time</h2>
            <div>
              <label htmlFor="date" className="hd-label">Date</label>
              <DatePicker
                id="date"
                selected={date ? fromLocalDateString(date) : null}
                onChange={(d) => d && (setDate(toLocalDateString(d)), setStartsAt(''))}
                minDate={fromLocalDateString(todayIn(apt.timezone))}
                className="hd-input"
                dateFormat="MMM d, yyyy"
                wrapperClassName="w-full"
              />
            </div>
            <fieldset>
              <legend className="hd-label">Time <span className="font-normal text-ink-soft">({timezone})</span></legend>
              {slots.loading ? (
                <p className="mt-2 hd-help" role="status">Looking for free times...</p>
              ) : slots.list.length === 0 ? (
                <p className="mt-2 hd-help">{noSlotsMessage}</p>
              ) : (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.list.map((slot) => (
                    <button
                      type="button"
                      key={slot.startsAt}
                      onClick={() => setStartsAt(slot.startsAt)}
                      aria-pressed={startsAt === slot.startsAt}
                      className="hd-choice"
                    >
                      {formatTime(slot.startsAt, apt.timezone)}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => submit('reschedule')} disabled={saving || !startsAt || startsAt === apt.startsAt} className="hd-btn">
                {saving ? 'Saving...' : 'Move my appointment'}
              </button>
              <button type="button" onClick={() => setMode('view')} disabled={saving} className="hd-btn hd-btn-secondary">Back</button>
            </div>
          </section>
        )}

        {apt.status === 'cancelled' && apt.businessSlug && (
          <p className="text-center">
            <Link to={`/book/${apt.businessSlug}`} className="hd-btn hd-btn-secondary">Book a new appointment</Link>
          </p>
        )}

        <footer className="flex justify-center opacity-70">
          <Logo className="scale-75" />
        </footer>
      </div>
    </div>
  );
}
