import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase/config';
import { Logo, Underline } from '../ui/Doodles';
import LanguageSwitch from '../common/LanguageSwitch';
import { useLanguage } from '../../i18n/LanguageContext';

// Shown after sign-up, and whenever an account without a verified email
// tries to open the dashboard: the booking API only accepts verified accounts.
export default function VerifyEmail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const user = auth.currentUser;
  const email = state?.email || user?.email;
  const [busy, setBusy] = useState(false);
  const { t: { auth: { verify: v } } } = useLanguage();

  const resend = async () => {
    setBusy(true);
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/login` });
      toast.success(v.resent);
    } catch (error) {
      toast.error(error.code === 'auth/too-many-requests' ? v.tooMany : v.resendFailed);
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
        toast.error(v.notYet);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hd-page flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-end">
          <LanguageSwitch />
        </div>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="hd-card p-6 sm:p-8 text-center space-y-5">
          <h1 className="relative inline-block">
            <span className="hd-title text-4xl sm:text-5xl">{v.title}</span>
            <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
          </h1>
          <p className="pt-2 text-ink-soft break-words">
            {v.sentTo[0]}{email ? <>{v.sentTo[1]}<span className="font-bold text-ink">{email}</span></> : ''}{v.sentTo[2]}{' '}
            {v.openIt}
          </p>
          {user && !user.emailVerified ? (
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={checkVerified} disabled={busy} className="hd-btn w-full">
                {v.done}
              </button>
              <button onClick={resend} disabled={busy} className="hd-btn hd-btn-secondary w-full">
                {v.resend}
              </button>
              <button onClick={() => auth.signOut()} className="hd-link text-sm self-center">
                {v.otherAccount}
              </button>
            </div>
          ) : (
            <Link to="/login" className="hd-btn">
              {v.goToLogin}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
