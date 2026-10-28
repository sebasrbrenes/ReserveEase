import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCreditCard } from 'react-icons/fi';
import { errorMessage, getBilling, openBillingPortal, startCheckout } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { isPaddleReady, openCheckout } from '../../utils/paddle';

// How long to wait for Paddle's webhook after a completed checkout.
const CONFIRM_ATTEMPTS = 15;
const CONFIRM_INTERVAL_MS = 2000;

// The business's $15/month plan: subscribe through Paddle's checkout, or
// manage it (card, invoices, cancellation) in Paddle's customer portal.
// The status shown always comes from the server.
const SubscriptionSection = ({ businessId, email }) => {
  const { t, language, locale } = useLanguage();
  const copy = t.billing;
  const messageFor = (error) => copy.errors[error?.code] || errorMessage(error);
  const formatDate = (iso) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso)) : '');
  const [billing, setBilling] = useState({ loading: true, data: null, error: null });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await getBilling(businessId);
      if (mounted.current) setBilling({ loading: false, data, error: null });
      return data;
    } catch (error) {
      if (mounted.current) setBilling({ loading: false, data: null, error });
      return null;
    }
  }, [businessId]);

  useEffect(() => {
    mounted.current = true;
    if (businessId) load();
    return () => { mounted.current = false; };
  }, [businessId, load]);

  // The checkout closing does not activate anything: wait until the server
  // has received Paddle's signed confirmation.
  const waitForActivation = async () => {
    setConfirming(true);
    for (let i = 0; i < CONFIRM_ATTEMPTS && mounted.current; i += 1) {
      const data = await load();
      if (data?.hasAccess) {
        setConfirming(false);
        toast.success(copy.activated);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIRM_INTERVAL_MS));
    }
    if (mounted.current) setConfirming(false);
  };

  const subscribe = async () => {
    setBusy(true);
    try {
      const { transactionId, environment } = await startCheckout(businessId);
      await openCheckout({
        transactionId,
        environment,
        email,
        language,
        onEvent: (event) => {
          if (event?.name === 'checkout.completed') waitForActivation();
        },
      });
    } catch (error) {
      toast.error(error?.code ? messageFor(error) : copy.openFailed);
    } finally {
      setBusy(false);
    }
  };

  const manage = async () => {
    setBusy(true);
    // Opened before the request so the browser does not block it as a pop-up.
    const tab = window.open('', '_blank');
    try {
      const { url } = await openBillingPortal(businessId);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (error) {
      tab?.close();
      toast.error(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const data = billing.data;
  const available = Boolean(data?.available) && isPaddleReady;

  return (
    <section id="suscripcion" className="hd-card p-4 sm:p-5 mb-6 scroll-mt-4">
      <h2 className="hd-title text-3xl mb-2 flex items-center gap-2">
        <FiCreditCard className="w-5 h-5 shrink-0" aria-hidden="true" />
        {copy.title}
      </h2>
      <p className="hd-help mb-4">{copy.intro}</p>

      {billing.loading || !businessId ? (
        <p className="hd-help">{copy.checking}</p>
      ) : billing.error ? (
        <p className="hd-help">{copy.loadFailed}</p>
      ) : (
        <>
          <p className="font-bold text-ink" role="status">
            {confirming ? copy.confirming : copy.status[data.status] || copy.status.none}
          </p>
          {data.cancelsAt ? (
            <p className="hd-help mt-1">{copy.cancelsAt(formatDate(data.cancelsAt))}</p>
          ) : data.nextBilledAt && data.hasAccess ? (
            <p className="hd-help mt-1">{copy.nextBilledAt(formatDate(data.nextBilledAt))}</p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            {data.canSubscribe && !confirming && (
              available ? (
                <button type="button" onClick={subscribe} disabled={busy} className="hd-btn w-full sm:w-auto">
                  {copy.subscribe}
                </button>
              ) : (
                <p className="hd-help">{copy.notAvailable}</p>
              )
            )}
            {data.canManage && data.available && (
              <button type="button" onClick={manage} disabled={busy} className="hd-btn hd-btn-secondary w-full sm:w-auto">
                {copy.manage}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default SubscriptionSection;
