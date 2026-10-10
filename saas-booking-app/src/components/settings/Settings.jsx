import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { FiArrowLeft, FiEdit2, FiTrash2, FiLink, FiCopy } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Why the booking page is not published yet (codes from the API).
const PUBLISH_PROBLEMS = {
  NAME_MISSING: 'Add your business name.',
  NO_SERVICES: 'Add at least one service.',
  NO_STAFF_WITH_SERVICES: 'Add an active staff member and assign them a service.',
  NO_OPENING_HOURS: 'Open at least one day in Business Hours.',
};
const TIME_ZONES = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
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

  // UI Settings State
  const [uiForm] = useState({
    language: settings?.ui?.language || 'en',
    notifications: settings?.ui?.notifications ?? true,
  });

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
    if (!newService.name || !newService.duration || !newService.price) {
      toast.error('Please fill in all service fields');
      return;
    }

    try {
      const updatedServices = [...services, { ...newService, id: Date.now().toString() }];
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
    if (!newStaff.name || !newStaff.email) {
      toast.error('Please fill in all staff fields');
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
    try {
      const updatedHours = {
        ...businessHours,
        [day]: {
          ...businessHours[day],
          [field]: value
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

  const handleUIChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    const newSettings = {
      ...settings,
      ui: {
        ...settings.ui,
        [name]: newValue,
      },
    };
    handleSaveSettings(newSettings);
  };

  const handleBusinessSettingsChange = (e) => {
    const { name, value } = e.target;
    setBusinessForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveBusinessSettings = async () => {
    try {
      await handleSaveSettings({
        ...settings,
        business: {
          ...settings.business,
          ...businessForm
        }
      });
      toast.success('Business settings saved successfully');
    } catch (error) {
      console.error('Error saving business settings:', error);
      toast.error('Failed to save business settings');
    }
  };


  const handleUpdateService = async () => {
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
    if (!newStaff.name || !newStaff.email) return;
    
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
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition duration-200"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Booking Link */}
        <section className="bg-dark-lighter rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            <FiLink className="inline-block mr-2" />
            Booking Link
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Share this link with your clients to let them book appointments directly.
          </p>
          {business.loading ? (
            <p className="text-sm text-gray-400 mb-4">Checking your booking page...</p>
          ) : !isPublished && (
            <div className="mb-4 rounded-lg border border-yellow-600/50 bg-yellow-500/10 p-4 text-sm text-yellow-200">
              <p className="font-medium mb-1">Your booking page is not live yet.</p>
              <ul className="list-disc pl-5 space-y-1">
                {(business.data?.problems || []).map((code) => <li key={code}>{PUBLISH_PROBLEMS[code] || code}</li>)}
                {business.error && <li>Could not reach the booking server. Try again in a moment.</li>}
              </ul>
            </div>
          )}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <input
                  type="text"
                  value={getBookingLink()}
                  readOnly
                  className="flex-1 bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={copyBookingLink}
                  disabled={!isPublished}
                  className="disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 flex items-center gap-2 w-full sm:w-auto"
                >
                  <FiCopy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Business Information */}
        <section className="bg-dark-lighter rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Business Information</h2>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="businessName" className="text-sm font-medium">
                Business Name
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <input
                  type="text"
                  name="name"
                  id="businessName"
                  value={businessForm.name}
                  onChange={handleBusinessSettingsChange}
                  className="flex-1 bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your business name"
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <label htmlFor="timeInterval" className="text-sm font-medium">
                Appointment Time Interval (minutes)
              </label>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <select
                  name="timeInterval"
                  id="timeInterval"
                  value={businessForm.timeInterval}
                  onChange={handleBusinessSettingsChange}
                  className="flex-1 bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <label htmlFor="timezone" className="text-sm font-medium">Time Zone</label>
                <select
                  name="timezone"
                  id="timezone"
                  value={businessForm.timezone}
                  onChange={handleBusinessSettingsChange}
                  className="bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {!TIME_ZONES.includes(businessForm.timezone) && (
                    <option value={businessForm.timezone}>{businessForm.timezone || 'Select a time zone'}</option>
                  )}
                  {TIME_ZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                </select>
                <p className="text-xs text-gray-400">Clients always see times in this zone.</p>
              </div>
              <div className="flex flex-col space-y-2">
                <label htmlFor="currency" className="text-sm font-medium">Currency</label>
                <select
                  name="currency"
                  id="currency"
                  value={businessForm.currency}
                  onChange={handleBusinessSettingsChange}
                  className="bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {!CURRENCIES.includes(businessForm.currency) && <option value={businessForm.currency}>{businessForm.currency}</option>}
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveBusinessSettings}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </section>

        {/* User Interface */}
        <section className="bg-dark-lighter rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">User Interface</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Language</label>
              <select
                value={uiForm.language}
                onChange={handleUIChange}
                className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="en">English</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="notifications"
                  checked={uiForm.notifications}
                  onChange={(e) => handleUIChange({
                    target: {
                      name: 'notifications',
                      value: e.target.checked
                    }
                  })}
                  className="sr-only"
                />
                <div className={`relative w-10 h-6 transition-colors duration-200 ease-in-out rounded-full ${
                  uiForm.notifications ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                  <div className={`absolute left-1 top-1 w-4 h-4 transition-transform duration-200 ease-in-out transform bg-white rounded-full ${
                    uiForm.notifications ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-400">Notifications</span>
              </label>
            </div>
          </div>
        </section>

        {/* Business Hours */}
        <section className="bg-dark-lighter rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Business Hours</h2>
          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                <div className="w-full sm:w-32">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-primary rounded border-gray-300 bg-white focus:ring-primary"
                      checked={businessHours[day.toLowerCase()]?.enabled ?? true}
                      onChange={() => handleToggleBusinessHours(day.toLowerCase())}
                    />
                    <span className="ml-2 capitalize">{day}</span>
                  </label>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:flex-1">
                  <select
                    className="bg-dark border border-gray-700 text-gray-700 rounded-lg p-2.5 w-full sm:flex-1 disabled:opacity-50"
                    value={businessHours[day.toLowerCase()]?.start ?? '9:00 AM'}
                    onChange={(e) => handleUpdateBusinessHours(day.toLowerCase(), 'start', e.target.value)}
                    disabled={!businessHours[day.toLowerCase()]?.enabled}
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <span className="text-gray-400">to</span>
                  
                  <select
                    className="bg-dark border border-gray-700 text-gray-700 rounded-lg p-2.5 w-full sm:flex-1 disabled:opacity-50"
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
        <section className="bg-dark-lighter rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Services</h2>
          
          {/* Add/Edit Service Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <input
                type="text"
                placeholder="Service Name"
                value={newService.name}
                onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={newService.duration}
                onChange={(e) => setNewService(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Price"
                value={newService.price}
                onChange={(e) => setNewService(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={editingService ? handleUpdateService : handleAddService}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
              >
                {editingService ? 'Update' : 'Add'}
              </button>
            </div>
          </div>

          {/* Services List */}
          <div className="space-y-4">
            {services.map(service => (
              <div key={service.id} className="border border-gray-700 rounded-lg flex items-center justify-between bg-dark-lighter rounded-lg p-4">
                <div>
                  <h3 className="font-medium">{service.name}</h3>
                  <p className="text-sm text-gray-400">
                    {service.duration} min · {service.price} {businessForm.currency}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditService(service)}
                    className="p-2 text-gray-400 hover:text-white transition duration-200"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDeleteService(services.indexOf(service))}
                    className="p-2 text-gray-400 hover:text-red-500 transition duration-200"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Staff */}
        <section className="bg-dark-lighter rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Staff</h2>
          
          {/* Add/Edit Staff Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Enter staff name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Enter staff email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                <input
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full bg-dark border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="Enter staff phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Available Services</label>
                <div className="space-y-2 max-h-48 overflow-y-auto bg-dark border border-gray-700 rounded-lg p-4">
                  {services.map(service => (
                    <label key={service.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newStaff.availableServices.includes(service.id)}
                        onChange={(e) => {
                          const availableServices = e.target.checked
                            ? [...newStaff.availableServices, service.id]
                            : newStaff.availableServices.filter(id => id !== service.id);
                          setNewStaff({ ...newStaff, availableServices });
                        }}
                        className="form-checkbox rounded text-blue-500 bg-dark border-gray-700 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-300">{service.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-3">
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
                      className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition duration-200 border border-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateStaff}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
                      disabled={!newStaff.name || !newStaff.email}
                    >
                      Update Staff Member
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleAddStaff}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
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
                className={`relative bg-dark p-4 rounded-lg border ${
                  staffMember.active ? 'border-grey-500' : 'border-red-700'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium">{staffMember.name}</h3>
                    <p className="text-gray-400">{staffMember.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStaffStatusToggle(index)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                        staffMember.active
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {staffMember.active ? 'Active' : 'Inactive'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditStaff(staffMember)}
                        className="p-1 hover:text-blue-500 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(index)}
                        className="p-1 hover:text-red-500 transition-colors duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-400 mb-2">Assigned Services:</p>
                  <div className="flex flex-wrap gap-2">
                    {services
                      .filter(service => staffMember.availableServices?.includes(service.id))
                      .map(service => (
                        <span
                          key={service.id}
                          className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded"
                        >
                          {service.name}
                        </span>
                      ))}
                    {(!staffMember.availableServices || staffMember.availableServices.length === 0) && (
                      <span className="text-sm text-gray-500">No services assigned</span>
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
