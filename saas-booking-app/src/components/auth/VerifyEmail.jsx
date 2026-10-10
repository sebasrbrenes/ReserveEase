import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase/config';

// Shown after sign-up, and whenever an account without a verified email
// tries to open the dashboard: the booking API only accepts verified accounts.
export default function VerifyEmail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const user = auth.currentUser;
  const email = state?.email || user?.email;
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setBusy(true);
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/login` });
      toast.success('Verification email sent');
    } catch (error) {
      toast.error(error.code === 'auth/too-many-requests'
        ? 'Too many emails sent. Please wait a few minutes.'
        : 'Could not send the email. Try again later.');
    } finally {
      setBusy(false);
    }
  };

  const checkVerified = async () => {
    setBusy(true);
    try {
      await user.reload();
      if (auth.currentUser.emailVerified) {
        // Refresh the token so the API sees the verified email.
        await auth.currentUser.getIdToken(true);
        navigate('/dashboard', { replace: true });
        window.location.reload();
      } else {
        toast.error('Your email is not verified yet. Open the link in the email we sent you.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-dark-lighter rounded-lg p-8 text-center text-white space-y-4">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        <p className="text-gray-300">
          We sent a verification link{email ? <> to <span className="font-medium text-white">{email}</span></> : ''}.
          Open it to activate your account, then come back here.
        </p>
        {user && !user.emailVerified ? (
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={checkVerified}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              I have verified my email
            </button>
            <button onClick={resend} disabled={busy} className="px-4 py-2 text-gray-300 hover:text-white disabled:opacity-50">
              Send the email again
            </button>
            <button onClick={() => auth.signOut()} className="text-sm text-gray-400 hover:text-white">
              Use another account
            </button>
          </div>
        ) : (
          <Link to="/login" className="inline-block px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700">
            Go to login
          </Link>
        )}
      </div>
    </div>
  );
}
