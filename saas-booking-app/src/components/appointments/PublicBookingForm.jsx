import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { addDoc, collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import dayjs from 'dayjs';
import { sendAppointmentConfirmation } from '../../services/emailService';
import { sendAppointmentReminder } from '../../services/smsService';
import { sendBusinessNotification } from '../../services/appointmentService';
import { getUserData } from '../../services/userService';

export default function PublicBookingForm() {
  const navigate = useNavigate();
  const { providerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [businessData, setBusinessData] = useState(null);
  const [existingAppointments, setExistingAppointments] = useState([]);
  const [formData, setFormData] = useState({
    staffMember: '',
    service: '',
    date: new Date(),
    time: '',
    clientName: '',
    email: '',
    phone: '',
    notes: '',
    status: 'Pending'
  });
  const [countryCode, setCountryCode] = useState('+1'); // Default to US/Canada
  const [submitting, setSubmitting] = useState(false);

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
    { code: '+509', name: 'Haiti' },
    { code: '+504', name: 'Honduras' },
    { code: '+852', name: 'Hong Kong' },
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
    { code: '+52', name: 'Mexico' },
    { code: '+377', name: 'Monaco' },
    { code: '+212', name: 'Morocco' },
    { code: '+258', name: 'Mozambique' },
    { code: '+31', name: 'Netherlands' },
    { code: '+64', name: 'New Zealand' },
    { code: '+505', name: 'Nicaragua' },
    { code: '+234', name: 'Nigeria' },
    { code: '+47', name: 'Norway' },
    { code: '+968', name: 'Oman' },
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
    { code: '+971', name: 'UAE' },
    { code: '+44', name: 'UK' },
    { code: '+598', name: 'Uruguay' },
    { code: '+998', name: 'Uzbekistan' },
    { code: '+58', name: 'Venezuela' },
    { code: '+84', name: 'Vietnam' }
];



  // Fetch business settings
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        // Get business settings
        const settingsRef = doc(db, 'users', providerId, 'settings', 'business');
        const settingsDoc = await getDoc(settingsRef);
        const businessSettings = settingsDoc.data();
        
        // Get user data which contains the email
        const userData = await getUserData(providerId);
        console.log('User data with email:', userData);
        
        if (settingsDoc.exists()) {
          // Combine user data with business settings
          const combinedData = {
            ...businessSettings,
            email: userData?.email, // Email from user document
            userId: providerId
          };
          console.log('Combined business data:', combinedData);
          setBusinessData(combinedData);
        } else {
          toast.error('Business not found');
        }
      } catch (error) {
        console.error('Error:', error);
        toast.error('Error loading business');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessData();
  }, [providerId]);

  // Fetch existing appointments for the selected date
  useEffect(() => {
    const fetchExistingAppointments = async () => {
      if (!formData.date || !providerId) return;
      
      const selectedDate = dayjs(formData.date).format('YYYY-MM-DD');
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        where('userId', '==', providerId),
        where('date', '==', selectedDate)
      );

      try {
        const querySnapshot = await getDocs(q);
        const appointments = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(apt => apt.status !== 'Cancelled');
        console.log('Existing appointments for date:', appointments);
        setExistingAppointments(appointments);
      } catch (error) {
        console.error('Error fetching existing appointments:', error);
        toast.error('Error checking appointment availability');
      }
    };

    fetchExistingAppointments();
  }, [formData.date, providerId]);

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
    if (!businessData?.businessHours) return [];

    const slots = [];
    const selectedDay = dayjs(formData.date).format('dddd').toLowerCase();
    const dayHours = businessData.businessHours[selectedDay];

    console.log('Selected day:', selectedDay);
    console.log('Day hours:', dayHours);

    if (dayHours?.enabled) {
      const interval = parseInt(businessData.business?.timeInterval) || 30;
      
      // Convert 12-hour format to 24-hour
      const convertTo24Hour = (timeStr) => {
        const [time, period] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours);
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        return { hours, minutes: parseInt(minutes) };
      };

      // Check if a time slot is available
      const isTimeSlotAvailable = (timeStr) => {
        // If no staff is selected, consider the slot available
        if (!formData.staffMember) return true;

        return !existingAppointments.some(apt => 
          apt.time === timeStr && 
          apt.staffMember === formData.staffMember
        );
      };

      const start = convertTo24Hour(dayHours.start);
      const end = convertTo24Hour(dayHours.end);

      let current = new Date(formData.date);
      current.setHours(start.hours, start.minutes, 0);

      const endTime = new Date(formData.date);
      endTime.setHours(end.hours, end.minutes, 0);

      // Don't show past times for today
      const now = new Date();
      if (dayjs(formData.date).isSame(dayjs(now), 'day')) {
        // For current day, start time should be the later of business start time or current time
        const currentMinute = now.getMinutes();
        
        // Round up current time to next interval
        const roundedMinutes = Math.ceil(currentMinute / interval) * interval;
        const adjustedTime = new Date(now);
        adjustedTime.setMinutes(roundedMinutes);
        adjustedTime.setSeconds(0);
        adjustedTime.setMilliseconds(0);
        
        // Use the later time between business start and current time
        current = new Date(Math.max(current.getTime(), adjustedTime.getTime()));
      }

      while (current < endTime) {
        const timeStr = dayjs(current).format('h:mm A');
        if (isTimeSlotAvailable(timeStr)) {
          // For today, only add future times
          if (!dayjs(formData.date).isSame(dayjs(now), 'day') || 
              dayjs(current).isAfter(dayjs(now))) {
            slots.push(timeStr);
          }
        }
        current.setMinutes(current.getMinutes() + interval);
      }

      console.log('Generated available slots:', slots);
    }

    return slots;
  }, [businessData?.businessHours, businessData?.business?.timeInterval, formData.date, formData.staffMember, existingAppointments]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return; // Prevent multiple submissions
    setSubmitting(true);

    // Format the phone number with country code
    const fullPhoneNumber = formData.phone ? `${countryCode}${formData.phone.replace(/[^0-9]/g, '')}` : '';
    console.log('Full phone number:', fullPhoneNumber);
    try {
      const appointment = {
        ...formData,
        userId: providerId,
        date: dayjs(formData.date).format('YYYY-MM-DD'),
        phone: fullPhoneNumber,
        createdAt: dayjs().toISOString()
      };

      await addDoc(collection(db, 'appointments'), appointment);

      // Send confirmation email
      await sendAppointmentConfirmation({
        to_name: formData.clientName,
        email: formData.email,
        business_name: businessData?.business?.name || '',
        appointment_date: dayjs(formData.date).format('YYYY-MM-DD'),
        appointment_time: formData.time
      });

      // Send notification to business owner
      console.log('Business Data for Email:', businessData); // Debug line
      const businessEmail = businessData?.email || businessData?.business?.email || '';
      console.log('Using business email:', businessEmail);
      
      if (!businessEmail) {
        console.error('No business email found for notification');
        toast.error('Could not send business notification - no email found');
      }

      await sendBusinessNotification({
        business_name: businessData?.business?.name || '',
        client_name: formData.clientName,
        appointment_date: dayjs(formData.date).format('YYYY-MM-DD'),
        appointment_time: formData.time,
        business_email: businessEmail,
        client_email: formData.email,
        service_name: formData.service,
        staff_member: formData.staffMember
      });

      // Send SMS reminder if phone is provided
      if (formData.phone) {
        await sendAppointmentReminder({
          phone: fullPhoneNumber,
          clientName: formData.clientName,
          businessName: businessData.business.name,
          date: dayjs(formData.date).format('YYYY-MM-DD'),  // Changed to ISO format
          time: formData.time
        });
      }

      toast.success('Appointment requested successfully');
      navigate(`/booking/success/${providerId}`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-gray-400 text-6xl mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Oops! Business Not Found</h2>
        <p className="text-gray-400 text-center max-w-md">
          Looks like this business has taken an unexpected vacation! 
          Try checking the URL or contact support if you think this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Book an Appointment</h2>
        {businessData.business?.name && (
          <p className="text-gray-400 text-center mb-6 text-lg">
            with <span className="font-semibold text-blue-400 inline">{businessData.business.name}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Service *</label>
            <select
              name="service"
              value={formData.service}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
              required
            >
              <option value="">Select a service</option>
              {businessData.business?.services?.map(service => (
                <option key={service.id} value={service.name}>
                  {service.name} - ${service.price}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Staff Member *</label>
            <select
              name="staffMember"
              value={formData.staffMember}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
              required
            >
              <option value="">Select staff member</option>
              {availableStaff.map(staff => (
                <option key={staff.id} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">Date *</label>
              <DatePicker
                selected={formData.date}
                onChange={date => setFormData(prev => ({ ...prev, date }))}
                minDate={new Date()}
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
                dateFormat="MMM d, yyyy"
                wrapperClassName="w-full"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300">Time *</label>
              <select
                name="time"
                value={formData.time}
                onChange={handleChange}
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
                required
              >
                <option value="">Select time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Client Information */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Full Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Phone</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
              >
                {countryCodes.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="col-span-2 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
                placeholder="123-456-7890"
              />
            </div>
            <p className="mt-1 text-sm text-gray-400">Example: {countryCode} 123-456-7890</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white px-3 py-2"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {submitting ? 'Booking...' : 'Book Appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
