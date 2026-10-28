import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { sendEmailVerification } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase/config';
import { Logo, Underline } from '../ui/Doodles';

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
      toast.success('Te enviamos el correo de verificación');
    } catch (error) {
      toast.error(error.code === 'auth/too-many-requests'
        ? 'Enviamos demasiados correos. Espera unos minutos.'
        : 'No pudimos enviar el correo. Inténtalo más tarde.');
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
        toast.error('Tu correo todavía no está verificado. Abre el enlace del correo que te enviamos.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hd-page flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="hd-card p-6 sm:p-8 text-center space-y-5">
          <h1 className="relative inline-block">
            <span className="hd-title text-4xl sm:text-5xl">Verifica tu correo</span>
            <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
          </h1>
          <p className="pt-2 text-ink-soft break-words">
            Te enviamos un enlace de verificación{email ? <> a <span className="font-bold text-ink">{email}</span></> : ''}.
            Ábrelo para activar tu cuenta y luego vuelve aquí.
          </p>
          {user && !user.emailVerified ? (
            <div className="flex flex-col gap-3 pt-2">
              <button onClick={checkVerified} disabled={busy} className="hd-btn w-full">
                Ya verifiqué mi correo
              </button>
              <button onClick={resend} disabled={busy} className="hd-btn hd-btn-secondary w-full">
                Enviar el correo otra vez
              </button>
              <button onClick={() => auth.signOut()} className="hd-link text-sm self-center">
                Usar otra cuenta
              </button>
            </div>
          ) : (
            <Link to="/login" className="hd-btn">
              Ir a iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
