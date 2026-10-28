import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { FiArrowLeft, FiEdit2, FiTrash2, FiLink, FiCopy } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Star, Underline } from '../ui/Doodles';
import { CLIENT_LANGUAGES, clientLanguage } from '../../i18n/clientCopy';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import SubscriptionSection from '../billing/SubscriptionSection';
import { formatMoney } from '../../utils/datetime';

// Businesses saved before the language setting existed show their pages in
// Spanish, the server's default.
const pageLanguage = (language) => clientLanguage(language || 'es');
const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
// "9:30 AM" -> minutes since midnight
const toMinutes = (time) => {
  const [clock, period] = time.split(' ');
  const [h, m] = clock.split(':').map(Number);
  return ((h % 12) + (period === 'PM' ? 12 : 0)) * 60 + m;
};

// The booking engine works in 5-minute blocks, up to 8 hours per service.
// Returns the key of the problem in the copy (settings.serviceErrors).
const serviceError = ({ name, duration, price }) => {
  if (!String(name || '').trim()) return 'name';
  if (!Number.isInteger(duration) || duration < 5 || duration > 480 || duration % 5 !== 0) return 'duration';
  if (!Number.isFinite(price) || price < 0) return 'price';
  return null;
};

const CURRENCIES = ['USD', 'CRC', 'MXN', 'COP', 'EUR', 'GBP', 'CAD', 'ARS', 'CLP', 'PEN', 'GTQ', 'HNL', 'NIO', 'PAB', 'DOP', 'BRL'];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${ampm}`;
});

const Settings = () => {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { settings, updateSettings, business } = useSettings();
  const { t } = useLanguage();
  const { user } = useAuth();
  const copy = t.settings;
  const { timeLabel, days: DAY_NAMES } = copy;

  // Links from the dashboard's first steps open the section they name.
  useEffect(() => {
    if (!hash) return;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const slug = business.data?.slug;
  const isPublished = business.data?.status === 'published';

  const getBookingLink = () => (slug ? `${window.location.origin}/book/${slug}` : '');

  const copyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(getBookingLink());
      toast.success(t.common.linkCopied);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error(t.common.copyFailed);
    }
  };

  // Business Settings State
  const [businessForm, setBusinessForm] = useState({
    name: settings?.business?.name || '',
    email: settings?.business?.email || '',
    phone: settings?.business?.phone || '',
    address: settings?.business?.address || '',
    timeInterval: settings?.business?.timeInterval || 30,
    timezone: settings?.business?.timezone || '',
    currency: settings?.business?.currency || 'USD',
    language: pageLanguage(settings?.business?.language),
  });

  useEffect(() => {
    if (settings?.business) {
      setBusinessForm({
        name: settings.business.name || '',
        email: settings.business.email || '',
        phone: settings.business.phone || '',
        address: settings.business.address || '',
        timeInterval: settings.business.timeInterval || 30,
        timezone: settings.business.timezone || '',
        currency: settings.business.currency || 'USD',
        language: pageLanguage(settings.business.language),
      });
    }
  }, [settings?.business]);

  // Business Hours State
  const [businessHours, setBusinessHours] = useState(
    settings?.businessHours || DAYS_OF_WEEK.reduce((acc, day) => ({
      ...acc,
      [day.toLowerCase()]: { start: '9:00 AM', end: '5:00 PM', enabled: true }
    }), {})
  );

  useEffect(() => {
    if (settings?.businessHours) {
      setBusinessHours(settings.businessHours);
    }
  }, [settings?.businessHours]);

  // Services State
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', duration: 30, price: 0 });
  const [editingService, setEditingService] = useState(null);

  // Staff State
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    availableServices: [] 
  });
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    if (settings?.business?.services) {
      setServices(settings.business.services);
    }
    if (settings?.business?.staff) {
      setStaff(settings.business.staff.map(s => ({
        ...s,
        availableServices: s.availableServices || [] 
      })));
    }
  }, [settings]);

  // Each section saves only its own data. Local state changes right away and
  // goes back to what was saved if the save fails.
  const saveSection = async (changes, { success, failure, rollback }) => {
    try {
      await updateSettings(changes);
      if (success) toast.success(success);
      return true;
    } catch (error) {
      console.error(failure, error);
      rollback?.();
      toast.error(`${failure} ${copy.notSaved}`);
      return false;
    }
  };

  const savedBusinessForm = {
    name: settings?.business?.name || '',
    timeInterval: settings?.business?.timeInterval || 30,
    timezone: settings?.business?.timezone || '',
    currency: settings?.business?.currency || 'USD',
    language: pageLanguage(settings?.business?.language),
  };
  const businessFormDirty = ['name', 'timeInterval', 'timezone', 'currency', 'language']
    .some((key) => String(businessForm[key]) !== String(savedBusinessForm[key]));
  const [businessNameError, setBusinessNameError] = useState('');
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [serviceFormError, setServiceFormError] = useState('');
  const [staffFormError, setStaffFormError] = useState('');

  const emptyService = { name: '', duration: 30, price: 0 };
  const emptyStaff = { name: '', email: '', phone: '', availableServices: [] };

  const saveServices = (updatedServices, messages) => {
    const previous = services;
    setServices(updatedServices);
    return saveSection(
      { business: { ...settings.business, services: updatedServices } },
      { ...messages, rollback: () => setServices(previous) },
    );
  };

  const saveStaff = (updatedStaff, messages) => {
    const previous = staff;
    setStaff(updatedStaff);
    return saveSection(
      { business: { ...settings.business, staff: updatedStaff } },
      { ...messages, rollback: () => setStaff(previous) },
    );
  };

  const saveHours = (updatedHours) => {
    const previous = businessHours;
    setBusinessHours(updatedHours);
    return saveSection(
      { businessHours: updatedHours },
      { success: copy.hours.saved, failure: copy.hours.failed, rollback: () => setBusinessHours(previous) },
    );
  };

  const handleAddService = async () => {
    const error = serviceError(newService);
    setServiceFormError(error ? copy.serviceErrors[error] : '');
    if (error) return;
    const saved = await saveServices(
      [...services, { ...newService, name: newService.name.trim(), id: Date.now().toString() }],
      { success: copy.services.added, failure: copy.services.addFailed },
    );
    if (saved) setNewService(emptyService);
  };

  const handleDeleteService = async (service) => {
    if (!window.confirm(copy.services.confirmRemove(service.name))) return;
    await saveServices(services.filter((s) => s.id !== service.id), { success: copy.services.removed, failure: copy.services.removeFailed });
  };

  const handleAddStaff = async () => {
    if (!newStaff.name.trim()) {
      setStaffFormError(copy.staff.nameMissing);
      return;
    }
    setStaffFormError('');
    const saved = await saveStaff(
      [...staff, { ...newStaff, name: newStaff.name.trim(), id: Date.now().toString(), active: true }],
      { success: copy.staff.added, failure: copy.staff.addFailed },
    );
    if (saved) setNewStaff(emptyStaff);
  };

  const handleDeleteStaff = async (staffMember) => {
    if (!window.confirm(copy.staff.confirmRemove(staffMember.name))) return;
    await saveStaff(staff.filter((s) => s.id !== staffMember.id), { success: copy.staff.removed, failure: copy.staff.removeFailed });
  };

  const handleToggleBusinessHours = (day) => {
    saveHours({ ...businessHours, [day]: { ...businessHours[day], enabled: !businessHours[day].enabled } });
  };

  const handleUpdateBusinessHours = (day, field, value) => {
    const updatedDay = { ...businessHours[day], [field]: value };
    if (toMinutes(updatedDay.end) <= toMinutes(updatedDay.start)) {
      toast.error(copy.hours.closeAfterOpen);
      return;
    }
    saveHours({ ...businessHours, [day]: updatedDay });
  };

  // Whether clients get booking emails (confirmation, changes, reminders).
  const clientEmails = settings?.business?.clientEmails !== false;
  const handleToggleClientEmails = () => saveSection(
    { business: { ...settings.business, clientEmails: !clientEmails } },
    { success: clientEmails ? copy.emails.off : copy.emails.on, failure: copy.emails.failed },
  );

  const handleBusinessSettingsChange = (e) => {
    const { name, value } = e.target;
    setBusinessForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBusinessSettings = async () => {
    if (!businessForm.name.trim()) {
      setBusinessNameError(copy.business.nameMissing);
      return;
    }
    setBusinessNameError('');
    setSavingBusiness(true);
    await saveSection(
      {
        business: {
          ...settings.business,
          name: businessForm.name.trim(),
          timeInterval: Number(businessForm.timeInterval) || 30,
          timezone: businessForm.timezone,
          currency: businessForm.currency,
          language: businessForm.language,
        },
      },
      { success: copy.business.saved, failure: copy.business.saveFailed },
    );
    setSavingBusiness(false);
  };


  const handleUpdateService = async () => {
    const error = serviceError(newService);
    setServiceFormError(error ? copy.serviceErrors[error] : '');
    if (error) return;
    const saved = await saveServices(
      services.map((s) => (s.id === editingService.id ? { ...newService, name: newService.name.trim() } : s)),
      { success: copy.services.updated, failure: copy.services.updateFailed },
    );
    if (saved) {
      setEditingService(null);
      setNewService(emptyService);
    }
  };

  const cancelServiceEdit = () => {
    setEditingService(null);
    setNewService(emptyService);
    setServiceFormError('');
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setNewService(service);
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setNewStaff({ 
      ...staffMember,
      availableServices: staffMember.availableServices || [] 
    });
  };

  const handleUpdateStaff = async () => {
    if (!newStaff.name.trim()) {
      setStaffFormError(copy.staff.nameMissing);
      return;
    }
    setStaffFormError('');
    const saved = await saveStaff(
      staff.map((s) => (s.id === editingStaff.id ? { ...newStaff, name: newStaff.name.trim() } : s)),
      { success: copy.staff.updated, failure: copy.staff.updateFailed },
    );
    if (saved) {
      setEditingStaff(null);
      setNewStaff(emptyStaff);
    }
  };

  const cancelStaffEdit = () => {
    setEditingStaff(null);
    setNewStaff(emptyStaff);
    setStaffFormError('');
  };

  const handleStaffStatusToggle = (staffMember) => {
    const active = !staffMember.active;
    saveStaff(
      staff.map((s) => (s.id === staffMember.id ? { ...s, active } : s)),
      { success: copy.staff.nowActive(staffMember.name, active), failure: copy.staff.toggleFailed },
    );
  };



  return (
    <div className="hd-page px-4 py-6 sm:p-6 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => {
            // Opened directly (new tab, bookmark): there is no page of the app
            // to go back to, so Back goes to the dashboard instead of leaving.
            if (window.history.state?.idx > 0) navigate(-1);
            else navigate('/dashboard');
          }}
          className="hd-btn hd-btn-secondary !px-3 !py-1.5 mb-6 text-sm"
        >
          <FiArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t.common.back}
        </button>

        <div className="mb-8">
          <h1 className="relative inline-block">
            <span className="hd-title text-5xl">{copy.title}</span>
            <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
            <Star className="hidden sm:block absolute -right-10 -top-2 w-7 h-7 text-marker rotate-12" />
          </h1>
        </div>

        {/* Booking Link */}
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-3 flex items-center gap-2">
            <FiLink className="w-5 h-5 shrink-0" aria-hidden="true" />
            {copy.bookingLink.title}
          </h2>
          <p className="hd-help mb-4">
            {copy.bookingLink.help}
          </p>
          {business.loading ? (
            <p className="hd-help mb-4">{copy.bookingLink.checking}</p>
          ) : !isPublished && (
            <div className="hd-alert border-ink bg-sun-light text-ink mb-4">
              <p className="font-bold mb-1">{copy.bookingLink.notPublished}</p>
              <ul className="list-disc pl-5 space-y-1">
                {(business.data?.problems || []).map((code) => <li key={code}>{copy.problems[code] || code}</li>)}
                {business.error && <li>{copy.bookingLink.serverDown}</li>}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <input
              type="text"
              value={getBookingLink()}
              readOnly
              aria-label={copy.bookingLink.label}
              className="hd-input !mt-0 flex-1 min-w-0 bg-paper"
            />
            <button
              onClick={copyBookingLink}
              disabled={!isPublished}
              className="hd-btn w-full sm:w-auto"
            >
              <FiCopy className="w-4 h-4" />
              {copy.bookingLink.copy}
            </button>
          </div>
        </section>

        {/* Business Information */}
        <section id="datos-del-negocio" className="hd-card p-4 sm:p-5 mb-6 scroll-mt-4">
          <h2 className="hd-title text-3xl mb-4">{copy.business.title}</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="businessName" className="hd-label">
                {copy.business.name}
              </label>
              <input
                type="text"
                name="name"
                id="businessName"
                value={businessForm.name}
                onChange={handleBusinessSettingsChange}
                className="hd-input"
                placeholder={copy.business.namePlaceholder}
                aria-invalid={Boolean(businessNameError)}
                aria-describedby={businessNameError ? 'businessName-error' : undefined}
              />
              {businessNameError && <p id="businessName-error" className="hd-error mt-1" role="alert">{businessNameError}</p>}
            </div>

            <div>
              <label htmlFor="timeInterval" className="hd-label">
                {copy.business.interval}
              </label>
              <select
                name="timeInterval"
                id="timeInterval"
                value={businessForm.timeInterval}
                onChange={handleBusinessSettingsChange}
                className="hd-input"
              >
                {[15, 30, 45, 60].map((n) => <option key={n} value={n}>{copy.business.minutes(n)}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="timezone" className="hd-label">{copy.business.timezone}</label>
                <select
                  name="timezone"
                  id="timezone"
                  value={businessForm.timezone}
                  onChange={handleBusinessSettingsChange}
                  className="hd-input"
                  aria-describedby="timezone-help"
                >
                  {!TIME_ZONES.includes(businessForm.timezone) && (
                    <option value={businessForm.timezone}>{businessForm.timezone || copy.business.chooseTimezone}</option>
                  )}
                  {TIME_ZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                </select>
                <p id="timezone-help" className="hd-help mt-1">{copy.business.timezoneHelp}</p>
              </div>
              <div className="min-w-0">
                <label htmlFor="currency" className="hd-label">{copy.business.currency}</label>
                <select
                  name="currency"
                  id="currency"
                  value={businessForm.currency}
                  onChange={handleBusinessSettingsChange}
                  className="hd-input"
                >
                  {!CURRENCIES.includes(businessForm.currency) && <option value={businessForm.currency}>{businessForm.currency}</option>}
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="language" className="hd-label">{copy.business.language}</label>
              <select
                name="language"
                id="language"
                value={businessForm.language}
                onChange={handleBusinessSettingsChange}
                className="hd-input"
                aria-describedby="language-help"
              >
                {CLIENT_LANGUAGES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p id="language-help" className="hd-help mt-1">{copy.business.languageHelp}</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              {businessFormDirty && !savingBusiness && (
                <p className="hd-help" role="status">{copy.business.unsaved}</p>
              )}
              <button
                onClick={handleSaveBusinessSettings}
                disabled={!businessFormDirty || savingBusiness}
                className="hd-btn w-full sm:w-auto"
              >
                {savingBusiness ? t.common.saving : t.common.saveChanges}
              </button>
            </div>
          </div>
        </section>

        {/* Client emails */}
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-2">{copy.emails.title}</h2>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="hd-help">
              {copy.emails.help}
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label={copy.emails.label}
              aria-checked={clientEmails}
              checked={clientEmails}
              onChange={handleToggleClientEmails}
              className="sr-only peer"
            />
            <span
              aria-hidden="true"
              className={`relative shrink-0 w-12 h-7 border-2 border-ink rounded-full shadow-[2px_2px_0_theme(colors.ink.DEFAULT)] transition-colors peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-marker ${clientEmails ? 'bg-marker' : 'bg-paper-deep'}`}
            >
              <span className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white border-2 border-ink rounded-full transition-transform ${clientEmails ? 'translate-x-5' : ''}`} />
            </span>
          </label>
        </section>

        {/* Business Hours */}
        <section id="horario" className="hd-card p-4 sm:p-5 mb-6 scroll-mt-4">
          <h2 className="hd-title text-3xl mb-1">{copy.hours.title}</h2>
          <p className="hd-help mb-4">{copy.hours.help}</p>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pb-4 sm:pb-0 border-b-2 border-dashed border-paper-deep sm:border-0 last:border-0 last:pb-0">
                <div className="w-full sm:w-32">
                  <label className="inline-flex items-center gap-2 font-bold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-5 w-5 rounded border-2 border-ink accent-marker"
                      checked={businessHours[day.toLowerCase()]?.enabled ?? true}
                      onChange={() => handleToggleBusinessHours(day.toLowerCase())}
                    />
                    <span>{DAY_NAMES[day]}</span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:flex-1">
                  <select
                    aria-label={copy.hours.opens(DAY_NAMES[day])}
                    className="hd-input !mt-0 text-ink w-full sm:flex-1"
                    value={businessHours[day.toLowerCase()]?.start ?? '9:00 AM'}
                    onChange={(e) => handleUpdateBusinessHours(day.toLowerCase(), 'start', e.target.value)}
                    disabled={!businessHours[day.toLowerCase()]?.enabled}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{timeLabel(time)}</option>
                    ))}
                  </select>

                  <span className="hd-help font-semibold">{copy.hours.to}</span>

                  <select
                    aria-label={copy.hours.closes(DAY_NAMES[day])}
                    className="hd-input !mt-0 text-ink w-full sm:flex-1"
                    value={businessHours[day.toLowerCase()]?.end ?? '5:00 PM'}
                    onChange={(e) => handleUpdateBusinessHours(day.toLowerCase(), 'end', e.target.value)}
                    disabled={!businessHours[day.toLowerCase()]?.enabled}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{timeLabel(time)}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section id="servicios" className="hd-card p-4 sm:p-5 mb-6 scroll-mt-4">
          <h2 className="hd-title text-3xl mb-4">{copy.services.title}</h2>
          <h3 className="hd-label mb-2">{editingService ? copy.services.editing(editingService.name) : copy.services.add}</h3>

          {/* Add/Edit Service Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <input
                type="text"
                aria-label={copy.services.name}
                placeholder={copy.services.name}
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                className="hd-input !mt-0"
                aria-invalid={Boolean(serviceFormError)}
                aria-describedby={serviceFormError ? 'service-error' : undefined}
              />
            </div>
            <div>
              <input
                type="number"
                aria-label={copy.services.duration}
                min={5}
                max={480}
                step={5}
                placeholder={copy.services.durationPlaceholder}
                value={newService.duration}
                onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="hd-input !mt-0"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                aria-label={copy.services.price}
                min={0}
                step="0.01"
                placeholder={copy.services.price}
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="hd-input !mt-0 min-w-0"
              />
              <button
                onClick={editingService ? handleUpdateService : handleAddService}
                className="hd-btn shrink-0 !px-4"
              >
                {editingService ? copy.services.update : copy.services.addButton}
              </button>
              {editingService && (
                <button onClick={cancelServiceEdit} className="hd-btn hd-btn-secondary shrink-0 !px-4">{t.common.cancel}</button>
              )}
            </div>
          </div>
          {serviceFormError && <p id="service-error" className="hd-error -mt-4 mb-6" role="alert">{serviceFormError}</p>}

          {/* Services List */}
          <div className="space-y-3">
            {services.map(service => (
              <div key={service.id} className="flex items-center justify-between gap-3 bg-paper border-2 border-ink-soft p-3 sm:p-4" style={{ borderRadius: '12px 5px 10px 6px / 6px 10px 5px 12px' }}>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink break-words">{service.name}</h3>
                  <p className="hd-help">
                    {service.duration} min · {formatMoney(Math.round((Number(service.price) || 0) * 100), businessForm.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditService(service)}
                    aria-label={copy.services.edit(service.name)}
                    className="p-2 rounded-lg text-ink-soft hover:text-marker hover:bg-marker-light transition duration-200"
                  >
                    <FiEdit2 aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => handleDeleteService(service)}
                    aria-label={copy.services.remove(service.name)}
                    className="p-2 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-light transition duration-200"
                  >
                    <FiTrash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Staff */}
        <section id="personal" className="hd-card p-4 sm:p-5 scroll-mt-4">
          <h2 className="hd-title text-3xl mb-4">{copy.staff.title}</h2>

          {/* Add/Edit Staff Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label htmlFor="staffName" className="hd-label">{copy.staff.name}</label>
                <input
                  id="staffName"
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="hd-input"
                  placeholder={copy.staff.namePlaceholder}
                  aria-invalid={Boolean(staffFormError)}
                  aria-describedby={staffFormError ? 'staff-error' : undefined}
                />
                {staffFormError && <p id="staff-error" className="hd-error mt-1" role="alert">{staffFormError}</p>}
              </div>
              <div>
                <label htmlFor="staffEmail" className="hd-label">{copy.staff.email}</label>
                <input
                  id="staffEmail"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="hd-input"
                  placeholder={copy.staff.emailPlaceholder}
                />
              </div>
              <div>
                <label htmlFor="staffPhone" className="hd-label">{copy.staff.phone}</label>
                <input
                  id="staffPhone"
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="hd-input"
                  placeholder={copy.staff.phone}
                />
              </div>
              <div>
                <p id="staffServices" className="hd-label">{copy.staff.services}</p>
                <div role="group" aria-labelledby="staffServices" className="hd-input space-y-2 max-h-48 overflow-y-auto">
                  {services.map(service => (
                    <label key={service.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStaff.availableServices.includes(service.id)}
                        onChange={(e) => {
                          const availableServices = e.target.checked
                            ? [...newStaff.availableServices, service.id]
                            : newStaff.availableServices.filter(id => id !== service.id);
                          setNewStaff({ ...newStaff, availableServices });
                        }}
                        className="h-4 w-4 rounded border-2 border-ink accent-marker"
                      />
                      <span className="text-sm text-ink">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap justify-end mt-4 gap-3">
                {editingStaff ? (
                  <>
                    <button
                      onClick={cancelStaffEdit}
                      className="hd-btn hd-btn-secondary"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={handleUpdateStaff}
                      className="hd-btn"
                    >
                      {copy.staff.update}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAddStaff}
                    className="hd-btn"
                  >
                    {copy.staff.add}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Staff List */}
          <div className="space-y-4">
            {staff.map((staffMember, index) => (
              <div
                key={staffMember.id || index}
                className={`relative p-4 border-2 ${
                  staffMember.active ? 'bg-paper border-ink-soft' : 'bg-coral-light/40 border-coral border-dashed'
                }`}
                style={{ borderRadius: '14px 6px 12px 6px / 6px 12px 6px 14px' }}
              >
                <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-ink break-words">{staffMember.name}</h3>
                    <p className="hd-help break-all">{staffMember.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStaffStatusToggle(staffMember)}
                      aria-label={copy.staff.toggle(staffMember.name, staffMember.active)}
                      className={`hd-badge !text-sm !px-3 !py-1 transition-colors duration-200 ${
                        staffMember.active
                          ? 'text-leaf bg-leaf-light hover:bg-leaf/20'
                          : 'text-ink-soft bg-paper-deep hover:bg-white'
                      }`}
                    >
                      {staffMember.active ? copy.staff.active : copy.staff.inactive}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditStaff(staffMember)}
                        aria-label={copy.staff.edit(staffMember.name)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-marker hover:bg-marker-light transition-colors duration-200"
                      >
                        <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staffMember)}
                        aria-label={copy.staff.remove(staffMember.name)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-light transition-colors duration-200"
                      >
                        <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="hd-help mb-2">{copy.staff.assigned}</p>
                  <div className="flex flex-wrap gap-2">
                    {services
                      .filter(service => staffMember.availableServices?.includes(service.id))
                      .map(service => (
                        <span
                          key={service.id}
                          className="hd-badge text-marker bg-marker-light"
                        >
                          {service.name}
                        </span>
                      ))}
                    {(!staffMember.availableServices || staffMember.availableServices.length === 0) && (
                      <span className="hd-help">{copy.staff.noneAssigned}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6">
          <SubscriptionSection businessId={business.data?.businessId} email={user?.email} />
        </div>
      </div>
    </div>
  );
};

export default Settings;
