import { Link, useLocation, useParams } from 'react-router-dom';
import { formatLocalDate, formatTime } from '../../utils/datetime';

export default function BookingSuccess() {
  const { slug } = useParams();
  const { state } = useLocation();
  const booking = state?.booking;
  const localDate = booking
    ? new Intl.DateTimeFormat('en-CA', { timeZone: booking.timezone }).format(new Date(booking.startsAt))
    : null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6 flex justify-center">
          <svg className="h-16 w-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">Your appointment is confirmed</h2>
        {booking ? (
          <div className="text-gray-300 mb-8 space-y-1">
            <p className="text-white font-medium">{state.serviceName} with {state.staffName}</p>
            <p>{formatLocalDate(localDate)} at {formatTime(booking.startsAt, booking.timezone)}</p>
            <p className="text-sm text-gray-400">{state.businessName}</p>
            <p className="text-xs text-gray-500 pt-2">Reference: {booking.bookingReference}</p>
          </div>
        ) : (
          <p className="text-gray-300 mb-8">Thank you for your booking.</p>
        )}

        <Link
          to={`/book/${slug}`}
          className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Book Another Appointment
        </Link>
      </div>
    </div>
  );
}
