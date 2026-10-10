import { Link, useParams } from 'react-router-dom';

export default function BookingSuccess() {
  // Extract clientId from the URL parameter
  const { providerId } = useParams();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {/* Centered SVG Checkmark */}
        <div className="mb-6 flex justify-center">
          <svg
            className="h-16 w-16 text-green-500 animate-bounce mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-4">
          Booking Successful!
        </h2>
        <p className="text-gray-300 mb-8">
          Thank you for your booking. We&apos;ll review your
          <br />
          appointment request and send you a confirmation
          <br />
          email shortly.
        </p>

        {/* Updated Link with dynamic clientId */}
        <Link
          to={`/book/${providerId}`} // 👈 Updated to use providerId
          className="inline-block bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Book Another Appointment
        </Link>
      </div>
    </div>
  );
}