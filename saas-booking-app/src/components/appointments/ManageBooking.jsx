import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  cancelManagedAppointment, errorMessage, getManagedAppointment, getManagedAvailability, rescheduleManagedAppointment,
} from '../../services/api';
import { capitalize, formatLocalDate, formatTime, fromLocalDateString, localeFor, toLocalDateString, todayIn } from '../../utils/datetime';
import { clientCopy, clientLanguage } from '../../i18n/clientCopy';
import { useDocumentLanguage } from '../../i18n/LanguageContext';
import { Logo, Scribble } from '../ui/Doodles';

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
  // The business picks the language of this page (the visitor's until it loads).
  const language = clientLanguage(apt?.language);
  const t = clientCopy(language);
  useDocumentLanguage(language);
  const locale = localeFor(language);

  useEffect(() => {
    let cancelled = false;
    getManagedAppointment(businessId, appointmentId, key)
      .then((data) => !cancelled && setApt(data))
      .catch((error) => {
        if (!cancelled && error.status !== 404 && error.status !== 400) toast.error(errorMessage(error, language));
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
        toast.error(errorMessage(error, language));
      });
    return () => { cancelled = true; };
  }, [language, mode, date, businessId, appointmentId, key, refreshSlots]);

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
      toast.success(action === 'cancel' ? t.cancelledToast : t.movedToast);
    } catch (error) {
      toast.error(errorMessage(error, language));
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
        <p className="font-hand text-3xl">{t.loading}</p>
      </div>
    );
  }

  if (!apt) {
    return (
      <div className="hd-page flex flex-col items-center justify-center p-4">
        <div className="hd-card max-w-md p-8 text-center">
          <h1 className="hd-title text-4xl mb-3">{t.aptNotFoundTitle}</h1>
          <p className="text-ink-soft">
            {t.aptNotFoundText}
          </p>
        </div>
      </div>
    );
  }

  const timezone = apt.timezone.replace(/_/g, ' ');
  const at = (iso) => `${formatLocalDate(localDateIn(iso, apt.timezone), undefined, locale)} ${t.at} ${formatTime(iso, apt.timezone, locale)}`;
  const when = capitalize(at(apt.startsAt));
  const deadline = at(apt.changeableUntil);
  const noSlotsMessage = t.manageNoSlots[slots.status];

  return (
    <div className="hd-page py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center">
          <p className="text-ink-soft mb-1">{t.yourAppointmentWith}</p>
          <h1 className="hd-title text-5xl">{apt.businessName}</h1>
        </header>

        <section className="hd-card p-6" aria-labelledby="details-title">
          <h2 id="details-title" className="sr-only">{t.details}</h2>
          <p className="mb-3">
            <span className={`inline-block px-3 py-0.5 border-2 border-ink rounded-full text-sm font-bold ${apt.status === 'cancelled' ? 'bg-coral-light' : 'bg-leaf/20'}`}>{t.status[apt.status] || apt.status}</span>
          </p>
          <p className="font-bold text-lg">{t.serviceWith(apt.serviceName, apt.staffName)}</p>
          <p className="relative inline-block px-6 py-3 my-1 font-semibold">
            <Scribble className="absolute inset-0 w-full h-full text-sun" />
            <span className={`relative ${apt.status === 'cancelled' ? 'line-through' : ''}`}>{when}</span>
          </p>
          <p className="hd-help">{t.timesIn(timezone)} {t.reference}: <span className="font-mono font-bold">{apt.id}</span></p>

          {apt.status === 'confirmed' && (apt.canChange ? (
            mode === 'view' && (
              <>
                <p className="hd-help mt-4">{t.changeUntil(deadline)}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={startReschedule} className="hd-btn">{t.changeTime}</button>
                  <button type="button" onClick={() => setMode('cancel')} className="hd-btn hd-btn-secondary">{t.cancelAppointment}</button>
                </div>
              </>
            )
          ) : (
            <p className="hd-help mt-4">{t.tooLate(apt.businessName)}</p>
          ))}
        </section>

        {mode === 'cancel' && (
          <section className="hd-card p-6" aria-labelledby="cancel-title">
            <h2 id="cancel-title" className="hd-title text-3xl mb-2">{t.cancelTitle}</h2>
            <p className="mb-4">{t.cancelText}</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => submit('cancel')} disabled={saving} className="hd-btn bg-coral text-white">
                {saving ? t.cancelling : t.confirmCancel}
              </button>
              <button type="button" onClick={() => setMode('view')} disabled={saving} className="hd-btn hd-btn-secondary">{t.keep}</button>
            </div>
          </section>
        )}

        {mode === 'reschedule' && (
          <section className="hd-card p-6 space-y-4" aria-labelledby="reschedule-title">
            <h2 id="reschedule-title" className="hd-title text-3xl">{t.chooseNewTime}</h2>
            <div>
              <label htmlFor="date" className="hd-label">{t.date}</label>
              <DatePicker
                id="date"
                selected={date ? fromLocalDateString(date) : null}
                onChange={(d) => d && (setDate(toLocalDateString(d)), setStartsAt(''))}
                minDate={fromLocalDateString(todayIn(apt.timezone))}
                className="hd-input"
                locale={language}
                dateFormat={language === 'en' ? 'MMM d, yyyy' : 'dd/MM/yyyy'}
                wrapperClassName="w-full"
              />
            </div>
            <fieldset>
              <legend className="hd-label">{t.time} <span className="font-normal text-ink-soft">({timezone})</span></legend>
              {slots.loading ? (
                <p className="mt-2 hd-help" role="status">{t.lookingForSlots}</p>
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
                      {formatTime(slot.startsAt, apt.timezone, locale)}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => submit('reschedule')} disabled={saving || !startsAt || startsAt === apt.startsAt} className="hd-btn">
                {saving ? t.saving : t.move}
              </button>
              <button type="button" onClick={() => setMode('view')} disabled={saving} className="hd-btn hd-btn-secondary">{t.back}</button>
            </div>
          </section>
        )}

        {apt.status === 'cancelled' && apt.businessSlug && (
          <p className="text-center">
            <Link to={`/book/${apt.businessSlug}`} className="hd-btn hd-btn-secondary">{t.bookNew}</Link>
          </p>
        )}

        <footer className="flex justify-center opacity-70">
          <Logo className="scale-75" />
        </footer>
      </div>
    </div>
  );
}
