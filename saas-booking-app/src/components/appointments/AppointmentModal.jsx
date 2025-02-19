import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import dayjs from 'dayjs';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../../firebase/config';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { sendAppointmentConfirmation } from '../../services/emailService';
import { sendAppointmentReminder } from '../../services/smsService';
import { sendBusinessNotification } from '../../services/appointmentService';

const AppointmentModal = ({ isOpen, onClose, onSave, appointment, existingAppointments }) => {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [countryCode, setCountryCode] = useState('+1'); // Default to US/Canada
  const [formData, setFormData] = useState({
    staffMember: '',
    service: '',
    date: dayjs().format('YYYY-MM-DD'),
    time: '',
    clientName: '',
    email: '',
    phone: '',
    notes: '',
    status: 'Pending'
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch business settings
  useEffect(() => {
    const fetchBusinessData = async () => {
      if (!user) return;
      
      try {
        const settingsRef = doc(db, 'users', user.uid, 'settings', 'business');
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          console.log('Business Data:', data); // Debug line
          setBusinessData(data);
        }
      } catch (err) {
        console.error('Error fetching business data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchBusinessData();
    }
  }, [user, isOpen]);

  // Initialize form data when editing
  useEffect(() => {
    if (!loading && appointment) {
      setFormData({
        staffMember: appointment.staffMember || '',
        service: appointment.service || '',
        date: appointment.date || dayjs().format('YYYY-MM-DD'),
        time: appointment.time || '',
        clientName: appointment.clientName || '',
        email: appointment.email || '',
        phone: appointment.phone || '',
        notes: appointment.notes || '',
        status: appointment.status || 'Pending'
      });
    } else if (!loading && !appointment) {
      setFormData({
        staffMember: '',
        service: '',
        date: dayjs().format('YYYY-MM-DD'),
        time: '',
        clientName: '',
        email: '',
        phone: '',
        notes: '',
        status: 'Pending'
      });
    }
  }, [loading, appointment]);

  // Filter staff members based on selected service
  const availableStaff = useMemo(() => {
    if (!businessData?.business?.staff || !formData.service) return [];
    
    const selectedService = businessData.business.services.find(s => s.name === formData.service);
    if (!selectedService) return [];

    return businessData.business.staff.filter(staff => 
      staff.active !== false && staff.availableServices?.includes(selectedService.id)
    );
  }, [businessData?.business?.staff, businessData?.business?.services, formData.service]);

  // Generate time slots based on business hours
  const timeSlots = useMemo(() => {
    // Early return if no business hours are set
    if (!businessData?.businessHours) return [];

    const selectedDay = dayjs(formData.date).format('dddd').toLowerCase();
    const dayHours = businessData.businessHours[selectedDay];

    // Early return if the selected day is disabled
    if (!dayHours?.enabled) return [];

    // Helper function to parse time string to dayjs object
    const parseTimeToDate = (timeStr, baseDate) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      const date = dayjs(baseDate);
      
      let hour = hours;
      if (period === 'PM' && hours !== 12) hour += 12;
      if (period === 'AM' && hours === 12) hour = 0;
      
      return date.hour(hour).minute(minutes).second(0);
    };

    // Get the selected date as base
    const baseDate = dayjs(formData.date).startOf('day');
    
    // Parse business hours
    const businessStart = parseTimeToDate(dayHours.start, baseDate);
    const businessEnd = parseTimeToDate(dayHours.end, baseDate);
    
    // Get current time and interval
    const now = dayjs();
    const interval = parseInt(businessData.business?.timeInterval) || 30;
    
    // Determine the start time for generating slots
    let startTime = businessStart;
    
    // For current day, adjust start time if needed
    if (baseDate.isSame(now, 'day')) {
      // Round current time up to next interval
      const roundedMinutes = Math.ceil(now.minute() / interval) * interval;
      const roundedTime = now.minute(roundedMinutes).second(0);
      
      // Use the later time between business start and rounded current time
      startTime = roundedTime.isAfter(businessStart) ? roundedTime : businessStart;
    }

    // Generate slots
    const slots = [];
    let currentSlot = startTime;

    // Helper function to check slot availability
    const isSlotAvailable = (slotTime) => {
      const timeStr = slotTime.format('h:mm A');
      const dateStr = dayjs(formData.date).format('YYYY-MM-DD');
      
      // If editing, allow current appointment's time
      if (appointment && 
          appointment.time === timeStr && 
          appointment.staffMember === formData.staffMember && 
          dayjs(appointment.date).format('YYYY-MM-DD') === dateStr) {
        return true;
      }

      // If no staff selected, slot is available
      if (!formData.staffMember) return true;

      // Check for conflicts with existing appointments
      return !existingAppointments?.some(apt => {
        const aptDate = dayjs(apt.date).format('YYYY-MM-DD');
        return apt.time === timeStr && 
               aptDate === dateStr &&
               apt.staffMember === formData.staffMember &&
               apt.status !== 'Cancelled';
      });
    };

    // Generate all possible slots
    while (currentSlot.isBefore(businessEnd)) {
      // For current day, only add future slots
      if (!baseDate.isSame(now, 'day') || currentSlot.isAfter(now)) {
        const timeStr = currentSlot.format('h:mm A');
        if (isSlotAvailable(currentSlot)) {
          slots.push(timeStr);
        }
      }
      currentSlot = currentSlot.add(interval, 'minute');
    }

    return slots;
  }, [
    businessData?.businessHours,
    businessData?.business?.timeInterval,
    formData.date,
    formData.staffMember,
    existingAppointments,
    appointment
  ]);

  // Filter out past dates and closed days
  const filterDate = (date) => {
    const day = dayjs(date).format('dddd').toLowerCase();
    const dayHours = businessData?.businessHours?.[day];
    return dayHours?.enabled && dayjs(date).isAfter(dayjs().subtract(1, 'day'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.service || !formData.staffMember || !formData.date || !formData.time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);

    try {
      const appointmentData = {
        ...formData,
        userId: user.uid,
        status: 'Pending',
        date: dayjs(formData.date).format('YYYY-MM-DD'),
        phone: formData.phone ? `${countryCode}${formData.phone.replace(/[^0-9]/g, '')}` : '',
        createdAt: dayjs().toISOString(),
        updatedAt: dayjs().toISOString()
      };

      // Double check availability before saving
      const isTimeAvailable = !existingAppointments?.some(apt => {
        const aptDate = dayjs(apt.date).format('YYYY-MM-DD');
        const newDate = dayjs(appointmentData.date).format('YYYY-MM-DD');
        
        return apt.time === appointmentData.time && 
               aptDate === newDate &&
               apt.staffMember === appointmentData.staffMember &&
               apt.status !== 'Cancelled' &&
               (!appointment || apt.id !== appointment.id);
      });

      if (!isTimeAvailable) {
        toast.error('This time slot is no longer available');
        return;
      }

      if (appointment) {
        const appointmentRef = doc(db, 'appointments', appointment.id);
        await updateDoc(appointmentRef, appointmentData);
        toast.success('Appointment updated successfully');
      } else {
        const appointmentsRef = collection(db, 'appointments');
        await addDoc(appointmentsRef, appointmentData);
        
        // Send confirmation email to client
        await sendAppointmentConfirmation({
          to_name: formData.clientName,
          email: formData.email,
          business_name: businessData?.business?.name || '',
          appointment_date: dayjs(formData.date).format('YYYY-MM-DD'),
          appointment_time: formData.time,
          service_name: formData.service,
          staff_member: formData.staffMember
        });

        // Send notification to business owner
        console.log('Business Data for Email:', businessData); // Debug line
        await sendBusinessNotification({
          business_name: businessData?.business?.name || businessData?.name || '',
          client_name: formData.clientName,
          appointment_date: dayjs(formData.date).format('YYYY-MM-DD'),
          appointment_time: formData.time,
          business_email: businessData?.email || businessData?.business?.email || user?.email || '',
          client_email: formData.email,
          service_name: formData.service,
          staff_member: formData.staffMember
        });

        // Send SMS reminder if phone is provided
        if (appointmentData.phone) {
          await sendAppointmentReminder({
            phone: appointmentData.phone,
            clientName: appointmentData.clientName,
            businessName: businessData?.business?.name || '',
            date: dayjs(appointmentData.date).format('YYYY-MM-DD'),  // Changed to ISO format
            time: appointmentData.time
          });
        }
        
        toast.success('Appointment created successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For phone field, remove all non-numeric characters
    if (name === 'phone') {
      setFormData(prev => ({
        ...prev,
        [name]: value.replace(/[^0-9]/g, '')
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date: dayjs(date).format('YYYY-MM-DD')
    }));
  };

  const countryCodes = [
    { code: '+1', name: 'USA/Canada' },
    { code: '+54', name: 'Argentina' },
    { code: '+61', name: 'Australia' },
    { code: '+43', name: 'Austria' },
    { code: '+973', name: 'Bahrain' },
    { code: '+880', name: 'Bangladesh' },
    { code: '+32', name: 'Belgium' },
    { code: '+591', name: 'Bolivia' },
    { code: '+55', name: 'Brazil' },
    { code: '+56', name: 'Chile' },
    { code: '+86', name: 'China' },
    { code: '+57', name: 'Colombia' },
    { code: '+506', name: 'Costa Rica' },
    { code: '+53', name: 'Cuba' },
    { code: '+45', name: 'Denmark' },
    { code: '+20', name: 'Egypt' },
    { code: '+503', name: 'El Salvador' },
    { code: '+33', name: 'France' },
    { code: '+49', name: 'Germany' },
    { code: '+30', name: 'Greece' },
    { code: '+502', name: 'Guatemala' },
    { code: '+504', name: 'Honduras' },
    { code: '+36', name: 'Hungary' },
    { code: '+91', name: 'India' },
    { code: '+62', name: 'Indonesia' },
    { code: '+353', name: 'Ireland' },
    { code: '+972', name: 'Israel' },
    { code: '+39', name: 'Italy' },
    { code: '+81', name: 'Japan' },
    { code: '+962', name: 'Jordan' },
    { code: '+7', name: 'Kazakhstan/Russia' },
    { code: '+254', name: 'Kenya' },
    { code: '+965', name: 'Kuwait' },
    { code: '+996', name: 'Kyrgyzstan' },
    { code: '+856', name: 'Laos' },
    { code: '+961', name: 'Lebanon' },
    { code: '+60', name: 'Malaysia' },
    { code: '+52', name: 'Mexico' },
    { code: '+212', name: 'Morocco' },
    { code: '+95', name: 'Myanmar' },
    { code: '+977', name: 'Nepal' },
    { code: '+31', name: 'Netherlands' },
    { code: '+64', name: 'New Zealand' },
    { code: '+505', name: 'Nicaragua' },
    { code: '+234', name: 'Nigeria' },
    { code: '+47', name: 'Norway' },
    { code: '+92', name: 'Pakistan' },
    { code: '+507', name: 'Panama' },
    { code: '+595', name: 'Paraguay' },
    { code: '+51', name: 'Peru' },
    { code: '+63', name: 'Philippines' },
    { code: '+48', name: 'Poland' },
    { code: '+351', name: 'Portugal' },
    { code: '+974', name: 'Qatar' },
    { code: '+40', name: 'Romania' },
    { code: '+966', name: 'Saudi Arabia' },
    { code: '+221', name: 'Senegal' },
    { code: '+65', name: 'Singapore' },
    { code: '+27', name: 'South Africa' },
    { code: '+82', name: 'South Korea' },
    { code: '+34', name: 'Spain' },
    { code: '+94', name: 'Sri Lanka' },
    { code: '+46', name: 'Sweden' },
    { code: '+41', name: 'Switzerland' },
    { code: '+886', name: 'Taiwan' },
    { code: '+66', name: 'Thailand' },
    { code: '+90', name: 'Turkey' },
    { code: '+256', name: 'Uganda' },
    { code: '+380', name: 'Ukraine' },
    { code: '+971', name: 'United Arab Emirates' },
    { code: '+44', name: 'United Kingdom' },
    { code: '+598', name: 'Uruguay' },
    { code: '+58', name: 'Venezuela' },
    { code: '+84', name: 'Vietnam' },
    { code: '+967', name: 'Yemen' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="w-full max-w-lg p-6 bg-[#242937] rounded-lg shadow-xl relative"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {appointment ? 'Edit Appointment' : 'New Appointment'}
              </h2>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-white hover:bg-[#2a303c] rounded-full transition duration-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Service *
                </label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  className="w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a service</option>
                  {businessData?.business?.services?.map((service) => (
                    <option key={service.id} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Staff Member *
                </label>
                <select
                  name="staffMember"
                  value={formData.staffMember}
                  onChange={handleChange}
                  className="w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select staff member</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date and Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 w-full">
                  <label className="block text-sm font-medium text-gray-300">
                    Date *
                  </label>
                  <div className="w-full">
                    <DatePicker
                      selected={dayjs(formData.date).toDate()}
                      onChange={handleDateChange}
                      filterDate={filterDate}
                      minDate={new Date()}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                      dateFormat="MMM d, yyyy"
                      placeholderText="Select date"
                      wrapperClassName="w-full"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2 w-full">
                  <label className="block text-sm font-medium text-gray-300">
                    Time *
                  </label>
                  <select
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary"
                    required
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {dayjs(`2000-01-01 ${time}`).format('h:mm A')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    className="w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Phone Number with Country Code */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-36 p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {countryCodes.map(country => (
                      <option key={country.code} value={country.code}>
                        {country.code} {country.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    className="flex-1 p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full p-2 bg-[#1a1f2b] border border-gray-700 text-white rounded-lg resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#2a303c] rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Saving...' : (appointment ? 'Update Appointment' : 'Create Appointment')}
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
