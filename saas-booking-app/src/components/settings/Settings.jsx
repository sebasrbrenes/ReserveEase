import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { FiArrowLeft, FiEdit2, FiTrash2, FiLink, FiCopy } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { Star, Underline } from '../ui/Doodles';

// Why the booking page is not published yet (codes from the API).
const PUBLISH_PROBLEMS = {
  NAME_MISSING: 'Add your business name.',
  NO_SERVICES: 'Add at least one service.',
  NO_STAFF_WITH_SERVICES: 'Add an active staff member and assign them a service.',
  NO_OPENING_HOURS: 'Open at least one day in Business Hours.',
};
const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
// "9:30 AM" -> minutes since midnight
const toMinutes = (time) => {
  const [clock, period] = time.split(' ');
  const [h, m] = clock.split(':').map(Number);
  return ((h % 12) + (period === 'PM' ? 12 : 0)) * 60 + m;
};

// The booking engine works in 5-minute blocks, up to 8 hours per service.
const serviceError = ({ name, duration, price }) => {
  if (!String(name || '').trim()) return 'Give the service a name.';
  if (!Number.isInteger(duration) || duration < 5 || duration > 480 || duration % 5 !== 0) {
    return 'Duration must be between 5 and 480 minutes, in steps of 5.';
  }
  if (!Number.isFinite(price) || price < 0) return 'Price must be 0 or more.';
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
  const { settings, updateSettings, business } = useSettings();
  const slug = business.data?.slug;
  const isPublished = business.data?.status === 'published';

  const getBookingLink = () => (slug ? `${window.location.origin}/book/${slug}` : '');

  const copyBookingLink = async () => {
    try {
      await navigator.clipboard.writeText(getBookingLink());
      toast.success('Booking link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link');
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

  const handleSaveSettings = async () => {
    try {
      const updatedSettings = {
        business: {
          ...settings.business,
          name: businessForm.name || '',
          email: businessForm.email || '',
          phone: businessForm.phone || '',
          address: businessForm.address || '',
          timeInterval: businessForm.timeInterval || 30,
          timezone: businessForm.timezone,
          currency: businessForm.currency,
          services: services,
          staff: staff,
          allowStaffPreference: true
        },
        businessHours: businessHours
      };

      await updateSettings(updatedSettings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleAddService = async () => {
    const error = serviceError(newService);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const updatedServices = [...services, { ...newService, name: newService.name.trim(), id: Date.now().toString() }];
      setServices(updatedServices);
      setNewService({ name: '', duration: '', price: '' });
      await updateSettings({
        business: {
          ...settings.business,
          services: updatedServices
        }
      });
      toast.success('Service added successfully');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };

  const handleDeleteService = async (index) => {
    try {
      const updatedServices = services.filter((_, i) => i !== index);
      setServices(updatedServices);
      await updateSettings({
        business: {
          ...settings.business,
          services: updatedServices
        }
      });
      toast.success('Service deleted successfully');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.name.trim()) {
      toast.error('Give the staff member a name.');
      return;
    }

    try {
      const updatedStaff = [...staff, { ...newStaff, id: Date.now().toString(), active: true }];
      setStaff(updatedStaff);
      setNewStaff({ name: '', email: '', availableServices: [] });
      await updateSettings({
        business: {
          ...settings.business,
          staff: updatedStaff
        }
      });
      toast.success('Staff member added successfully');
    } catch (error) {
      console.error('Error adding staff member:', error);
      toast.error('Failed to add staff member');
    }
  };

  const handleDeleteStaff = async (index) => {
    try {
      const updatedStaff = staff.filter((_, i) => i !== index);
      setStaff(updatedStaff);
      await updateSettings({
        business: {
          ...settings.business,
          staff: updatedStaff
        }
      });
      toast.success('Staff member deleted successfully');
    } catch (error) {
      console.error('Error deleting staff member:', error);
      toast.error('Failed to delete staff member');
    }
  };


  const handleToggleBusinessHours = async (day) => {
    try {
      const updatedHours = {
        ...businessHours,
        [day]: {
          ...businessHours[day],
          enabled: !businessHours[day].enabled
        }
      };
      setBusinessHours(updatedHours);
      await updateSettings({
        businessHours: updatedHours
      });
      toast.success('Business hours updated successfully');
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error('Failed to update business hours');
    }
  };

  const handleUpdateBusinessHours = async (day, field, value) => {
    const updatedDay = { ...businessHours[day], [field]: value };
    if (toMinutes(updatedDay.end) <= toMinutes(updatedDay.start)) {
      toast.error('Closing time must be after opening time.');
      return;
    }
    try {
      const updatedHours = {
        ...businessHours,
        [day]: updatedDay
      };
      setBusinessHours(updatedHours);
      await updateSettings({
        businessHours: updatedHours
      });
      toast.success('Business hours updated successfully');
    } catch (error) {
      console.error('Error updating business hours:', error);
      toast.error('Failed to update business hours');
    }
  };

  // Whether clients get booking emails (confirmation, changes, reminders).
  const clientEmails = settings?.business?.clientEmails !== false;
  const handleToggleClientEmails = async () => {
    try {
      await updateSettings({ business: { ...settings.business, clientEmails: !clientEmails } });
      toast.success(clientEmails ? 'Client emails turned off' : 'Client emails turned on');
    } catch (error) {
      console.error('Error saving email preference:', error);
      toast.error('Failed to save the email preference');
    }
  };

  const handleBusinessSettingsChange = (e) => {
    const { name, value } = e.target;
    setBusinessForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBusinessSettings = async () => {
    if (!businessForm.name.trim()) {
      toast.error('Give your business a name.');
      return;
    }
    // handleSaveSettings saves the whole form and reports the result.
    await handleSaveSettings();
  };


  const handleUpdateService = async () => {
    const error = serviceError(newService);
    if (error) {
      toast.error(error);
      return;
    }
    try {
      const updatedServices = services.map(s => 
        s.id === editingService.id ? { ...newService } : s
      );
      const newSettings = {
        ...settings,
        business: {
          ...settings?.business,
          services: updatedServices
        }
      };
      
      await updateSettings(newSettings);
      setServices(updatedServices);
      setEditingService(null);
      setNewService({ name: '', duration: 30, price: 0 });
      toast.success('Service updated successfully');
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
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
      toast.error('Give the staff member a name.');
      return;
    }
    
    try {
      const updatedStaff = staff.map(s => 
        s.id === editingStaff.id ? { ...newStaff } : s
      );
      const newSettings = {
        ...settings,
        business: {
          ...settings?.business,
          staff: updatedStaff
        }
      };
      
      await updateSettings(newSettings);
      setStaff(updatedStaff);
      setEditingStaff(null);
      setNewStaff({ 
        name: '', 
        email: '', 
        phone: '', 
        availableServices: [] 
      });
      toast.success('Staff member updated successfully');
    } catch (error) {
      console.error('Error updating staff member:', error);
      toast.error('Failed to update staff member');
    }
  };

  const handleStaffStatusToggle = async (index) => {
    try {
      const updatedStaff = [...staff];
      updatedStaff[index] = {
        ...updatedStaff[index],
        active: !updatedStaff[index].active
      };
      
      setStaff(updatedStaff);
      await updateSettings({
        business: {
          ...settings.business,
          staff: updatedStaff
        }
      });
      
      toast.success(`Staff member ${updatedStaff[index].active ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling staff status:', error);
      toast.error('Failed to update staff status');
    }
  };



  return (
    <div className="hd-page px-4 py-6 sm:p-6 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="hd-btn hd-btn-secondary !px-3 !py-1.5 mb-6 text-sm"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-8">
          <h1 className="relative inline-block">
            <span className="hd-title text-5xl">Settings</span>
            <Underline className="absolute -bottom-3 left-0 w-full h-4 text-sun" />
            <Star className="hidden sm:block absolute -right-10 -top-2 w-7 h-7 text-marker rotate-12" />
          </h1>
        </div>

        {/* Booking Link */}
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-3 flex items-center gap-2">
            <FiLink className="w-5 h-5 shrink-0" aria-hidden="true" />
            Booking Link
          </h2>
          <p className="hd-help mb-4">
            Share this link with your clients to let them book appointments directly.
          </p>
          {business.loading ? (
            <p className="hd-help mb-4">Checking your booking page...</p>
          ) : !isPublished && (
            <div className="hd-alert border-ink bg-sun-light text-ink mb-4">
              <p className="font-bold mb-1">Your booking page is not live yet.</p>
              <ul className="list-disc pl-5 space-y-1">
                {(business.data?.problems || []).map((code) => <li key={code}>{PUBLISH_PROBLEMS[code] || code}</li>)}
                {business.error && <li>Could not reach the booking server. Try again in a moment.</li>}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <input
              type="text"
              value={getBookingLink()}
              readOnly
              aria-label="Booking link"
              className="hd-input !mt-0 flex-1 min-w-0 bg-paper"
            />
            <button
              onClick={copyBookingLink}
              disabled={!isPublished}
              className="hd-btn w-full sm:w-auto"
            >
              <FiCopy className="w-4 h-4" />
              Copy
            </button>
          </div>
        </section>

        {/* Business Information */}
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="businessName" className="hd-label">
                Business Name
              </label>
              <input
                type="text"
                name="name"
                id="businessName"
                value={businessForm.name}
                onChange={handleBusinessSettingsChange}
                className="hd-input"
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <label htmlFor="timeInterval" className="hd-label">
                Appointment Time Interval (minutes)
              </label>
              <select
                name="timeInterval"
                id="timeInterval"
                value={businessForm.timeInterval}
                onChange={handleBusinessSettingsChange}
                className="hd-input"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label htmlFor="timezone" className="hd-label">Time Zone</label>
                <select
                  name="timezone"
                  id="timezone"
                  value={businessForm.timezone}
                  onChange={handleBusinessSettingsChange}
                  className="hd-input"
                  aria-describedby="timezone-help"
                >
                  {!TIME_ZONES.includes(businessForm.timezone) && (
                    <option value={businessForm.timezone}>{businessForm.timezone || 'Select a time zone'}</option>
                  )}
                  {TIME_ZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                </select>
                <p id="timezone-help" className="hd-help mt-1">Clients always see times in this zone.</p>
              </div>
              <div className="min-w-0">
                <label htmlFor="currency" className="hd-label">Currency</label>
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

            <div className="flex justify-end">
              <button
                onClick={handleSaveBusinessSettings}
                className="hd-btn w-full sm:w-auto"
              >
                Save Changes
              </button>
            </div>
          </div>
        </section>

        {/* Client emails */}
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-2">Client Emails</h2>
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="hd-help">
              Email clients when they book, when you move or cancel their appointment, and a reminder the day before.
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-label="Email clients about their appointments"
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
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-4">Business Hours</h2>
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
                    <span className="capitalize">{day}</span>
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:flex-1">
                  <select
                    aria-label={`${day} opening time`}
                    className="hd-input !mt-0 text-ink w-full sm:flex-1"
                    value={businessHours[day.toLowerCase()]?.start ?? '9:00 AM'}
                    onChange={(e) => handleUpdateBusinessHours(day.toLowerCase(), 'start', e.target.value)}
                    disabled={!businessHours[day.toLowerCase()]?.enabled}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>

                  <span className="hd-help font-semibold">to</span>

                  <select
                    aria-label={`${day} closing time`}
                    className="hd-input !mt-0 text-ink w-full sm:flex-1"
                    value={businessHours[day.toLowerCase()]?.end ?? '5:00 PM'}
                    onChange={(e) => handleUpdateBusinessHours(day.toLowerCase(), 'end', e.target.value)}
                    disabled={!businessHours[day.toLowerCase()]?.enabled}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="hd-card p-4 sm:p-5 mb-6">
          <h2 className="hd-title text-3xl mb-4">Services</h2>

          {/* Add/Edit Service Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <input
                type="text"
                aria-label="Service name"
                placeholder="Service Name"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                className="hd-input !mt-0"
              />
            </div>
            <div>
              <input
                type="number"
                aria-label="Duration in minutes"
                min={5}
                max={480}
                step={5}
                placeholder="Duration (minutes)"
                value={newService.duration}
                onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="hd-input !mt-0"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                aria-label="Price"
                min={0}
                step="0.01"
                placeholder="Price"
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="hd-input !mt-0 min-w-0"
              />
              <button
                onClick={editingService ? handleUpdateService : handleAddService}
                className="hd-btn shrink-0 !px-4"
              >
                {editingService ? 'Update' : 'Add'}
              </button>
            </div>
          </div>

          {/* Services List */}
          <div className="space-y-3">
            {services.map(service => (
              <div key={service.id} className="flex items-center justify-between gap-3 bg-paper border-2 border-ink-soft p-3 sm:p-4" style={{ borderRadius: '12px 5px 10px 6px / 6px 10px 5px 12px' }}>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink break-words">{service.name}</h3>
                  <p className="hd-help">
                    {service.duration} min · {service.price} {businessForm.currency}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEditService(service)}
                    className="p-2 rounded-lg text-ink-soft hover:text-marker hover:bg-marker-light transition duration-200"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDeleteService(services.indexOf(service))}
                    className="p-2 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-light transition duration-200"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Staff */}
        <section className="hd-card p-4 sm:p-5">
          <h2 className="hd-title text-3xl mb-4">Staff</h2>

          {/* Add/Edit Staff Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="hd-label">Name</label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="hd-input"
                  placeholder="Enter staff name"
                />
              </div>
              <div>
                <label className="hd-label">Email (optional)</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="hd-input"
                  placeholder="Enter staff email"
                />
              </div>
              <div>
                <label className="hd-label">Phone</label>
                <input
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="hd-input"
                  placeholder="Enter staff phone"
                />
              </div>
              <div>
                <label className="hd-label">Available Services</label>
                <div className="hd-input space-y-2 max-h-48 overflow-y-auto">
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
                      onClick={() => {
                        setEditingStaff(null);
                        setNewStaff({
                          name: '',
                          email: '',
                          phone: '',
                          availableServices: []
                        });
                      }}
                      className="hd-btn hd-btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStaff}
                      className="hd-btn"
                      disabled={!newStaff.name || !newStaff.email}
                    >
                      Update Staff Member
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAddStaff}
                    className="hd-btn"
                    disabled={!newStaff.name || !newStaff.email}
                  >
                    Add Staff Member
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
                      onClick={() => handleStaffStatusToggle(index)}
                      className={`hd-badge !text-sm !px-3 !py-1 transition-colors duration-200 ${
                        staffMember.active
                          ? 'text-leaf bg-leaf-light hover:bg-leaf/20'
                          : 'text-ink-soft bg-paper-deep hover:bg-white'
                      }`}
                    >
                      {staffMember.active ? 'Active' : 'Inactive'}
                    </button>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditStaff(staffMember)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-marker hover:bg-marker-light transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(index)}
                        className="p-1.5 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-light transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="hd-help mb-2">Assigned Services:</p>
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
                      <span className="hd-help">No services assigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
