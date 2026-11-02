import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBilling } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';

// On the dashboard: says when a subscription becomes required, or that the
// booking page is paused because there is none. Says nothing otherwise.
const AccessNotice = ({ businessId }) => {
  const { t, locale } = useLanguage();
  const copy = t.billing;
  const [access, setAccess] = useState(null);

  useEffect(() => {
    let alive = true;
    if (businessId) {
      getBilling(businessId)
        .then((data) => { if (alive) setAccess(data.access ?? null); })
        .catch(() => {});
    }
    return () => { alive = false; };
  }, [businessId]);

  if (!access || (access.allowed && !access.requiredFrom)) return null;
  const date = access.requiredFrom
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(access.requiredFrom))
    : '';
  return (
    <div
      className={`hd-alert mb-6 text-ink ${access.allowed ? 'border-ink bg-sun-light' : 'border-coral bg-coral-light'}`}
      role={access.allowed ? 'status' : 'alert'}
      data-testid="access-notice"
    >
      {access.allowed ? copy.requiredFrom(date) : copy.locked}{' '}
      <Link to="/settings#suscripcion" className="font-bold underline">{copy.subscribe}</Link>
    </div>
  );
};

export default AccessNotice;
