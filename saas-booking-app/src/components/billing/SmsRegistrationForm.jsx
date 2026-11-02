import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const EMPTY = {
  legalName: '', entityType: 'company', ein: '', street: '', city: '', state: '', postalCode: '',
  website: '', contactName: '', contactEmail: '', contactPhone: '',
};

// What US carriers ask about a business before it can send texts (10DLC
// brand registration). Sent to the server only; nothing here is public.
const SmsRegistrationForm = ({ onSubmit, onCancel, busy, defaultEmail }) => {
  const { t } = useLanguage();
  const copy = t.billing.sms.form;
  const [form, setForm] = useState({ ...EMPTY, contactEmail: defaultEmail || '' });
  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
    if (body.entityType === 'sole_proprietor') delete body.ein;
    onSubmit(body);
  };

  const field = (name, props = {}) => (
    <div className={props.wide ? 'sm:col-span-2' : ''}>
      <label htmlFor={`sms-${name}`} className="hd-label">{copy[name]}</label>
      <input
        id={`sms-${name}`} className="hd-input" value={form[name]} onChange={set(name)}
        required={!props.optional} {...(props.input || {})}
      />
      {props.help && <p className="hd-help mt-1">{props.help}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="mt-4 hd-card p-4" data-testid="sms-registration">
      <p className="hd-help mb-3">{copy.intro}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {field('legalName', { wide: true, input: { maxLength: 120, autoComplete: 'organization' } })}
        <div>
          <label htmlFor="sms-entityType" className="hd-label">{copy.entityType}</label>
          <select id="sms-entityType" className="hd-input" value={form.entityType} onChange={set('entityType')}>
            <option value="company">{copy.company}</option>
            <option value="sole_proprietor">{copy.soleProprietor}</option>
          </select>
        </div>
        {form.entityType === 'company'
          ? field('ein', { input: { placeholder: '12-3456789', inputMode: 'numeric', maxLength: 10 } })
          : <p className="hd-help self-end">{copy.noEin}</p>}
        {field('street', { wide: true, input: { maxLength: 120, autoComplete: 'address-line1' } })}
        {field('city', { input: { maxLength: 60, autoComplete: 'address-level2' } })}
        <div className="grid grid-cols-2 gap-3">
          {field('state', { input: { maxLength: 2, placeholder: 'TX', autoComplete: 'address-level1' } })}
          {field('postalCode', { input: { maxLength: 10, inputMode: 'numeric', autoComplete: 'postal-code' } })}
        </div>
        {field('website', { wide: true, optional: true, input: { type: 'url', placeholder: 'https://', maxLength: 200 } })}
        {field('contactName', { input: { maxLength: 100, autoComplete: 'name' } })}
        {field('contactEmail', { input: { type: 'email', maxLength: 200, autoComplete: 'email' } })}
        {field('contactPhone', { input: { type: 'tel', placeholder: '+15125550100', maxLength: 16, autoComplete: 'tel' }, help: copy.phoneHelp })}
      </div>
      <p className="hd-help mt-3">{copy.consentNote}</p>
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <button type="submit" disabled={busy} className="hd-btn w-full sm:w-auto">{copy.submit}</button>
        <button type="button" onClick={onCancel} className="hd-btn hd-btn-secondary w-full sm:w-auto">{copy.cancel}</button>
      </div>
    </form>
  );
};

export default SmsRegistrationForm;
