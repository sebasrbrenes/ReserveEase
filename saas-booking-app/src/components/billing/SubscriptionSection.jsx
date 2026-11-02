import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiCreditCard, FiMessageSquare } from 'react-icons/fi';
import {
  addSmsAddon, errorMessage, getBilling, openBillingPortal, removeSmsAddon, requestSms, startCheckout, updateSmsSettings,
} from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { isPaddleReady, openCheckout } from '../../utils/paddle';

// How long to wait for Paddle's webhook after a completed checkout or an add-on change.
const CONFIRM_ATTEMPTS = 15;
const CONFIRM_INTERVAL_MS = 2000;

// The business's plan (Basic, $15/month) and its SMS add-on (+$10/month):
// subscribe through Paddle's checkout, add or remove SMS on the same
// subscription, or manage card and invoices in Paddle's portal. Every state
// shown comes from the server, which only changes it on Paddle's signed webhook.
const SubscriptionSection = ({ businessId, email }) => {
  const { t, language, locale } = useLanguage();
  const copy = t.billing;
  const smsCopy = copy.sms;
  const messageFor = (error) => copy.errors[error?.code] || errorMessage(error);
  const formatDate = (iso) => (iso ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso)) : '');
  const [billing, setBilling] = useState({ loading: true, data: null, error: null });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // null | 'checkout' | 'addon'
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

  // Closing Paddle's window or answering 202 does not change anything: wait
  // until the server has received Paddle's signed confirmation.
  const waitFor = async (kind, done, successMessage) => {
    setConfirming(kind);
    for (let i = 0; i < CONFIRM_ATTEMPTS && mounted.current; i += 1) {
      const data = await load();
      if (data && done(data)) {
        setConfirming(null);
        toast.success(successMessage);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, CONFIRM_INTERVAL_MS));
    }
    if (mounted.current) setConfirming(null);
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
          if (event?.name === 'checkout.completed') waitFor('checkout', (d) => d.hasAccess, copy.activated);
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

  // Runs an SMS action and shows the server's new state.
  const act = async (fn, success) => {
    setBusy(true);
    try {
      const data = await fn();
      if (data && mounted.current) setBilling({ loading: false, data, error: null });
      if (success) toast.success(success);
    } catch (error) {
      toast.error(messageFor(error));
    } finally {
      setBusy(false);
    }
  };

  const changeAddon = async (add) => {
    if (!add && !window.confirm(smsCopy.confirmDeactivate)) return;
    setBusy(true);
    try {
      await (add ? addSmsAddon(businessId) : removeSmsAddon(businessId));
      setBusy(false);
      await waitFor('addon', (d) => d.addons.sms.active === add, add ? smsCopy.activated : smsCopy.deactivated);
    } catch (error) {
      toast.error(messageFor(error));
      setBusy(false);
    }
  };

  const data = billing.data;
  const available = Boolean(data?.available) && isPaddleReady;
  const smsActive = Boolean(data?.addons?.sms?.active);
  const usage = data?.sms?.usage;

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
          {!data.access?.allowed && (
            <p className="hd-alert mb-4 border-coral bg-coral-light text-ink" role="alert">{copy.locked}</p>
          )}
          {data.access?.allowed && data.access?.requiredFrom && (
            <p className="hd-alert mb-4 border-ink bg-sun-light text-ink">{copy.requiredFrom(formatDate(data.access.requiredFrom))}</p>
          )}

          <p className="font-bold text-ink" role="status">
            {confirming === 'checkout' ? copy.confirming : copy.status[data.status] || copy.status.none}
          </p>
          {data.hasAccess && (
            <>
              <p className="mt-1 text-ink" data-testid="active-plan">
                {copy.plan(smsActive ? copy.planBasicSms : copy.planBasic)}
              </p>
              <p className="hd-help mt-1">{copy.emailIncluded}</p>
            </>
          )}
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

          <div className="mt-6 border-t-2 border-dashed border-ink/30 pt-5" data-testid="sms-addon">
            <h3 className="text-xl font-extrabold text-ink flex items-center gap-2">
              <FiMessageSquare className="w-5 h-5 shrink-0" aria-hidden="true" />
              {smsCopy.title}
            </h3>
            <p className="hd-help mt-1">{smsCopy.price}</p>

            {smsActive ? (
              <>
                {usage && (
                  <dl className="mt-4 grid grid-cols-2 gap-3 max-w-sm">
                    <div className="hd-card p-3">
                      <dt className="text-sm font-semibold text-ink-soft">{smsCopy.used}</dt>
                      <dd className="text-2xl font-extrabold text-ink">{usage.used}<span className="text-base text-ink-soft"> / {usage.limit}</span></dd>
                    </div>
                    <div className="hd-card p-3">
                      <dt className="text-sm font-semibold text-ink-soft">{smsCopy.remaining}</dt>
                      <dd className="text-2xl font-extrabold text-ink">{usage.remaining}</dd>
                    </div>
                  </dl>
                )}
                {(usage?.cycleEnd || data.nextBilledAt) && (
                  <p className="hd-help mt-2">{smsCopy.renews(formatDate(usage?.cycleEnd || data.nextBilledAt))}</p>
                )}
                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-marker"
                    checked={data.sms.remindersEnabled}
                    disabled={busy}
                    onChange={(e) => act(() => updateSmsSettings(businessId, { remindersEnabled: e.target.checked }), smsCopy.saved)}
                  />
                  <span>
                    <span className="font-bold text-ink">{smsCopy.reminders}</span>
                    <span className="hd-help block">{smsCopy.remindersHelp}</span>
                  </span>
                </label>
                {data.canChangeAddons && (
                  <button
                    type="button"
                    onClick={() => changeAddon(false)}
                    disabled={busy || Boolean(confirming)}
                    className="hd-btn hd-btn-secondary mt-4 w-full sm:w-auto"
                  >
                    {confirming === 'addon' ? smsCopy.activating : smsCopy.deactivate}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-3 text-ink">{smsCopy.off}</p>
                <p className="hd-help mt-1">{smsCopy.intro}</p>
                {data.sms.status === 'not_requested' && (
                  <>
                    <p className="hd-help mt-2">{smsCopy.approvalNeeded}</p>
                    <button
                      type="button"
                      onClick={() => act(() => requestSms(businessId), smsCopy.requested)}
                      disabled={busy}
                      className="hd-btn hd-btn-secondary mt-3 w-full sm:w-auto"
                    >
                      {smsCopy.request}
                    </button>
                  </>
                )}
                {['pending', 'rejected', 'suspended'].includes(data.sms.status) && (
                  <p className="hd-alert mt-3 border-ink bg-sun-light text-ink" data-testid="sms-status">{smsCopy[data.sms.status]}</p>
                )}
                {data.sms.status === 'approved' && (
                  <>
                    <p className="mt-2 font-bold text-leaf">{smsCopy.approved}</p>
                    {!data.hasAccess ? (
                      <p className="hd-help mt-2">{smsCopy.needsBasic}</p>
                    ) : !data.canChangeAddons ? (
                      <p className="hd-help mt-2">{smsCopy.notChangeable}</p>
                    ) : data.addons.sms.available && isPaddleReady ? (
                      <>
                        <button
                          type="button"
                          onClick={() => changeAddon(true)}
                          disabled={busy || Boolean(confirming)}
                          className="hd-btn mt-3 w-full sm:w-auto"
                        >
                          {confirming === 'addon' ? smsCopy.activating : smsCopy.activate}
                        </button>
                        <p className="hd-help mt-2">{smsCopy.prorated}</p>
                      </>
                    ) : (
                      <p className="hd-help mt-2">{copy.notAvailable}</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default SubscriptionSection;
