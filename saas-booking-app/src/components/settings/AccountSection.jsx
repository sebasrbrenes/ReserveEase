import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiDownload, FiUser } from 'react-icons/fi';
import { EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';
import { deleteMyAccount, downloadAppointmentsCsv, errorMessage } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { LANDING_URL } from '../../utils/links';

// The owner's own data: download every appointment as CSV, or delete the
// account. Deleting asks to type a word and to sign in again.
const AccountSection = ({ businessId }) => {
  const { t } = useLanguage();
  const copy = t.account;
  const [exporting, setExporting] = useState(false);
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const user = auth.currentUser;
  const usesPassword = Boolean(user?.providerData.some((p) => p.providerId === 'password'));
  const confirmed = word.trim().toUpperCase() === copy.confirmWord;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const blob = await downloadAppointmentsCsv(businessId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reserveease-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async (event) => {
    event.preventDefault();
    if (!confirmed || !user) return;
    setDeleting(true);
    setError('');
    try {
      try {
        if (usesPassword) {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
        } else {
          await reauthenticateWithPopup(user, googleProvider);
        }
      } catch {
        setError(copy.reauthFailed);
        return;
      }
      await user.getIdToken(true);
      await deleteMyAccount();
      await signOut(auth).catch(() => {});
      window.location.assign(LANDING_URL);
    } catch (e) {
      setError(copy.errors[e?.code] || errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section id="cuenta" className="hd-card p-4 sm:p-5 mb-6 scroll-mt-4">
      <h2 className="hd-title text-3xl mb-2 flex items-center gap-2">
        <FiUser className="w-5 h-5 shrink-0" aria-hidden="true" />
        {copy.title}
      </h2>

      <h3 className="font-bold text-ink mt-2">{copy.exportTitle}</h3>
      <p className="hd-help mb-3">{copy.exportHelp}</p>
      <button type="button" onClick={exportCsv} disabled={exporting || !businessId} className="hd-btn hd-btn-secondary w-full sm:w-auto">
        <FiDownload aria-hidden="true" className="mr-2" />
        {exporting ? copy.exporting : copy.export}
      </button>

      <h3 className="font-bold text-ink mt-6">{copy.deleteTitle}</h3>
      <p className="hd-help mb-3">{copy.deleteHelp}</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="hd-btn hd-btn-secondary w-full sm:w-auto text-coral">
          {copy.delete}
        </button>
      ) : (
        <form onSubmit={deleteAccount} className="space-y-3 border-2 border-coral rounded-lg p-3">
          <p className="text-sm font-semibold text-ink">{copy.deleteWarning}</p>
          <div>
            <label htmlFor="delete-confirm" className="hd-label">{copy.typeWord(copy.confirmWord)}</label>
            <input
              id="delete-confirm"
              className="hd-input"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>
          {usesPassword ? (
            <div>
              <label htmlFor="delete-password" className="hd-label">{copy.password}</label>
              <input
                id="delete-password"
                type="password"
                className="hd-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          ) : (
            <p className="hd-help">{copy.googleAgain}</p>
          )}
          {error && <p className="hd-error" role="alert">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="submit" disabled={!confirmed || deleting} className="hd-btn w-full sm:w-auto bg-coral border-coral">
              {deleting ? copy.deleting : copy.deleteForever}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setWord(''); setPassword(''); setError(''); }}
              className="hd-btn hd-btn-secondary w-full sm:w-auto"
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};

export default AccountSection;
