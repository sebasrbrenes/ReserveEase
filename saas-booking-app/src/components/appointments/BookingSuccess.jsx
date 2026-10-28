import { Link, useLocation, useParams } from 'react-router-dom';
import { formatLocalDate, formatTime, localeFor } from '../../utils/datetime';
import { clientCopy, clientLanguage } from '../../i18n/clientCopy';
import { Scribble, Sparkle } from '../ui/Doodles';

export default function BookingSuccess() {
  const { slug } = useParams();
  const { state } = useLocation();
  const booking = state?.booking;
  const language = clientLanguage(state?.language);
  const t = clientCopy(language);
  const locale = localeFor(language);
  const localDate = booking
    ? new Intl.DateTimeFormat('en-CA', { timeZone: booking.timezone }).format(new Date(booking.startsAt))
    : null;

  return (
    <div className="hd-page flex flex-col items-center justify-center px-4 py-10">
      <div className="hd-card max-w-md w-full p-8 text-center">
        <div className="relative mb-6 flex justify-center">
          <svg className="h-16 w-16 text-leaf" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M10 26 C 14 29, 17 33, 20 37 C 26 25, 32 16, 40 9" />
          </svg>
          <Sparkle className="absolute left-1/2 ml-8 -top-1 w-6 h-6 text-marker" />
        </div>

        <h1 className="relative inline-block mb-6">
          <span className="hd-title text-4xl">{t.confirmed}</span>
        </h1>
        {booking ? (
          <div className="mb-8 space-y-1">
            <p className="font-bold text-lg">{t.serviceWith(state.serviceName, state.staffName)}</p>
            <p className="relative inline-block px-7 py-4 font-semibold">
              <Scribble className="absolute inset-0 w-full h-full text-sun" />
              <span className="relative">{formatLocalDate(localDate, undefined, locale)} {t.at} {formatTime(booking.startsAt, booking.timezone, locale)}</span>
            </p>
            <p className="text-ink-soft">{state.businessName}</p>
            <p className="text-sm pt-2">
              {t.reference}: <span className="font-mono font-bold">{booking.bookingReference}</span>
            </p>
            <p className="hd-help pt-2">
              {t.saved}
            </p>
            {booking.managePath && (
              <p className="pt-2">
                <Link to={booking.managePath} className="hd-link">{t.changeOrCancel}</Link>
              </p>
            )}
          </div>
        ) : (
          <p className="text-ink-soft mb-8">{t.thanks}</p>
        )}

        <Link to={`/book/${slug}`} className="hd-btn hd-btn-secondary">
          {t.bookAnother}
        </Link>
      </div>
    </div>
  );
}
