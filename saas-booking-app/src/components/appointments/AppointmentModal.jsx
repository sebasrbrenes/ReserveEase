import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-hot-toast';
import {
  createAppointment, errorMessage, getAvailability, rescheduleAppointment, updateAppointment,
} from '../../services/api';
import { formatTime, fromLocalDateString, toLocalDateString, todayIn } from '../../utils/datetime';

const inputClass = 'w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const E164 = /^\+[1-9]\d{7,14}$/;

const emptyForm = (timezone) => ({
  serviceId: '', staffId: '', date: todayIn(timezone), startsAt: '', clientName: '', email: '', phone: '', notes: '',
});

// Creates an appointment, or edits one: contact and notes always, and the
// time or staff member while it is still confirmed. Every change goes
// through the API, which checks the slot and the appointment's version.
const AppointmentModal = ({ isOpen, onClose, appointment, businessId, business, onSaved }) => {
  const timezone = business?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [form, setForm] = useState(() => emptyForm(timezone));
  const [availability, setAvailability] = useState({ loading: false, status: null, slots: [] });
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const canMove = !appointment || appointment.status === 'confirmed';

  useEffect(() => {
    if (!isOpen) return;
    setIdempotencyKey(crypto.randomUUID());
    setForm(appointment ? {
      serviceId: appointment.serviceId,
      staffId: appointment.staffId,
      date: appointment.localDate,
      startsAt: appointment.startsAt,
      clientName: appointment.client?.name || '',
      email: appointment.client?.email || '',
      phone: appointment.client?.phoneE164 || '',
      notes: appointment.notes || '',
    } : emptyForm(timezone));
  }, [isOpen, appointment, timezone]);

  const services = useMemo(() => {
    const active = (business?.services || []).filter((s) => s.active);
    // An edited appointment keeps its service even if it was removed since.
    if (appointment && !active.some((s) => s.id === appointment.serviceId)) {
      return [...active, { id: appointment.serviceId, name: appointment.serviceSnapshot?.name || 'Service' }];
    }
    return active;
  }, [business, appointment]);

  const availableStaff = useMemo(
    () => (business?.staff || []).filter((s) => s.active && s.serviceIds.includes(form.serviceId)),
    [business, form.serviceId]
  );

  useEffect(() => {
    if (!isOpen || !canMove || !businessId || !form.serviceId || !form.staffId || !form.date) {
      setAvailability({ loading: false, status: null, slots: [] });
      return undefined;
    }
    let cancelled = false;
    setAvailability((prev) => ({ ...prev, loading: true }));
    getAvailability(businessId, {
      serviceId: form.serviceId, staffId: form.staffId, date: form.date, excludeAppointmentId: appointment?.id,
    })
      .then((data) => !cancelled && setAvailability({ loading: false, status: data.status, slots: data.slots }))
      .catch((error) => {
        if (cancelled) return;
        setAvailability({ loading: false, status: null, slots: [] });
        toast.error(errorMessage(error));
      });
    return () => { cancelled = true; };
  }, [isOpen, canMove, businessId, appointment, form.serviceId, form.staffId, form.date]);

  // The current time of an edited appointment stays selectable even when the
  // booking rules would no longer offer it (for example, it is too soon).
  const slots = useMemo(() => {
    const list = availability.slots.map((s) => s.startsAt);
    if (appointment && form.staffId === appointment.staffId && form.date === appointment.localDate
      && !list.includes(appointment.startsAt)) {
      list.push(appointment.startsAt);
      list.sort();
    }
    return list;
  }, [availability.slots, appointment, form.staffId, form.date]);

  const update = (changes) => setForm((prev) => ({ ...prev, ...changes }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'serviceId') update({ serviceId: value, staffId: '', startsAt: '' });
    else if (name === 'staffId') update({ staffId: value, startsAt: '' });
    else if (name === 'phone') update({ phone: value.replace(/[^0-9+]/g, '') });
    else update({ [name]: value });
  };

  const client = () => ({
    name: form.clientName.trim(),
    email: form.email.trim(),
    phoneE164: form.phone || null,
  });

  const save = async () => {
    if (!appointment) {
      await createAppointment(businessId, {
        serviceId: form.serviceId, staffId: form.staffId, startsAt: form.startsAt, client: client(), notes: form.notes,
      }, idempotencyKey);
      return 'Appointment created';
    }

    let { version } = appointment;
    const moved = form.startsAt !== appointment.startsAt || form.staffId !== appointment.staffId;
    if (canMove && moved) {
      const updated = await rescheduleAppointment(businessId, appointment.id, {
        expectedVersion: version, startsAt: form.startsAt,
        ...(form.staffId !== appointment.staffId && { staffId: form.staffId }),
      });
      version = updated.version;
    }
    const before = appointment.client || {};
    const after = client();
    const changes = {};
    const changedClient = Object.fromEntries(
      Object.entries(after).filter(([key, value]) => (before[key] ?? null) !== value)
    );
    if (Object.keys(changedClient).length) changes.client = changedClient;
    if (form.notes !== (appointment.notes || '')) changes.notes = form.notes;
    if (Object.keys(changes).length) {
      await updateAppointment(businessId, appointment.id, { expectedVersion: version, ...changes });
    }
    return moved ? 'Appointment moved' : 'Appointment updated';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (canMove && !form.startsAt) {
      toast.error('Choose a time');
      return;
    }
    if (form.phone && !E164.test(form.phone)) {
      toast.error('Write the phone with its country code, for example +50688887777');
      return;
    }
    setSubmitting(true);
    try {
      toast.success(await save());
      onClose();
    } catch (error) {
      if (error.status) setIdempotencyKey(crypto.randomUUID());
      toast.error(errorMessage(error));
      if (['SLOT_UNAVAILABLE', 'SLOT_NOT_OFFERED'].includes(error.code)) update({ startsAt: '' });
    } finally {
      setSubmitting(false);
      onSaved?.();
    }
  };

  const noSlotsMessage = {
    closed: 'Closed on this day.',
    outside_window: 'Outside the booking window for this date.',
    open: 'No free times on this day.',
  }[availability.status];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="w-full max-w-lg p-6 bg-[#242937] rounded-lg shadow-xl relative my-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {appointment ? 'Edit Appointment' : 'New Appointment'}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1 text-gray-400 hover:text-white hover:bg-[#2a303c] rounded-full transition duration-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="apt-service" className="block text-sm font-medium text-gray-400 mb-1">Service *</label>
                <select
                  id="apt-service" name="serviceId" value={form.serviceId} onChange={handleChange}
                  className={inputClass} required disabled={Boolean(appointment)}
                >
                  <option value="">Select a service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="apt-staff" className="block text-sm font-medium text-gray-400 mb-1">Staff Member *</label>
                <select
                  id="apt-staff" name="staffId" value={form.staffId} onChange={handleChange}
                  className={inputClass} required disabled={!canMove || !form.serviceId}
                >
                  <option value="">Select staff member</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>{staff.displayName}</option>
                  ))}
                  {appointment && !availableStaff.some((s) => s.id === appointment.staffId) && (
                    <option value={appointment.staffId}>{appointment.staffSnapshot?.displayName}</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 w-full">
                  <label className="block text-sm font-medium text-gray-400">Date *</label>
                  <DatePicker
                    selected={form.date ? fromLocalDateString(form.date) : null}
                    onChange={(date) => date && update({ date: toLocalDateString(date), startsAt: '' })}
                    minDate={fromLocalDateString(todayIn(timezone))}
                    disabled={!canMove}
                    className={inputClass}
                    dateFormat="MMM d, yyyy"
                    wrapperClassName="w-full"
                    required
                  />
                </div>

                <div className="space-y-1 w-full">
                  <label htmlFor="apt-time" className="block text-sm font-medium text-gray-400">Time *</label>
                  <select
                    id="apt-time" name="startsAt" value={form.startsAt} onChange={handleChange}
                    className={inputClass} required={canMove} disabled={!canMove || !form.staffId}
                  >
                    <option value="">
                      {availability.loading ? 'Loading...' : slots.length ? 'Select time' : (noSlotsMessage || 'Select time')}
                    </option>
                    {(canMove ? slots : [form.startsAt].filter(Boolean)).map((startsAt) => (
                      <option key={startsAt} value={startsAt}>{formatTime(startsAt, timezone)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="apt-name" className="block text-sm font-medium text-gray-400 mb-1">Client Name *</label>
                  <input id="apt-name" type="text" name="clientName" value={form.clientName} onChange={handleChange} className={inputClass} maxLength={100} required />
                </div>
                <div>
                  <label htmlFor="apt-email" className="block text-sm font-medium text-gray-400 mb-1">Email *</label>
                  <input id="apt-email" type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} maxLength={200} required />
                </div>
              </div>

              <div>
                <label htmlFor="apt-phone" className="block text-sm font-medium text-gray-400 mb-1">Phone (with country code)</label>
                <input id="apt-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+50688887777" className={inputClass} maxLength={16} />
              </div>

              <div>
                <label htmlFor="apt-notes" className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
                <textarea
                  id="apt-notes" name="notes" value={form.notes} onChange={handleChange} maxLength={500}
                  className="w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#2a303c] rounded-lg transition duration-200"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Saving...' : (appointment ? 'Save Changes' : 'Create Appointment')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppointmentModal;
