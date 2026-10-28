import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { Logo, Underline } from '../ui/Doodles';
import LanguageSwitch from '../common/LanguageSwitch';
import { useLanguage } from '../../i18n/LanguageContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { t: { auth: { forgot: f }, common } } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      setError(err.code === 'auth/invalid-email' ? f.invalidEmail : f.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hd-page flex flex-col items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-2 flex justify-end">
          <LanguageSwitch />
        </div>
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <Link
          to="/login"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-ink-soft hover:text-ink"
        >
          <FiArrowLeft aria-hidden="true" />
          {f.backToLogin}
        </Link>

        <div className="hd-card p-6 sm:p-8">
          <div className="text-center">
            <h2 className="relative inline-block">
              <span className="hd-title text-4xl sm:text-5xl">{f.title}</span>
              <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
            </h2>
            <p className="mt-5 hd-help">
              {f.help}
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 hd-alert border-leaf bg-leaf-light text-ink text-center"
              role="status"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-white">
                <FiCheck className="text-2xl text-ink" aria-hidden="true" />
              </div>
              <h3 className="hd-title text-3xl mb-2">{f.checkEmail}</h3>
              <p className="mb-4 break-words">
                {f.sent(email)}
              </p>
              <Link to="/login" className="hd-link">
                {f.backToLogin}
              </Link>
            </motion.div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="hd-label">{common.email}</label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-1 bottom-0 left-0 pl-3 flex items-center">
                    <FiMail className="text-ink-soft" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="hd-input pl-10"
                    placeholder={common.emailPlaceholder}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? 'reset-error' : undefined}
                  />
                </div>
              </div>

              {error && (
                <p id="reset-error" className="hd-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="hd-btn w-full">
                {loading ? (
                  <span
                    className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"
                    role="status"
                    aria-label={f.sending}
                  />
                ) : (
                  f.submit
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
