const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
import dayjs from 'dayjs';

const MIN_REMINDER_MINUTES = 6; // Minimum minutes required for SMS reminder

export const sendAppointmentReminder = async (appointmentData) => {
  try {
    // Check if appointment is too close to send reminder
    const appointmentDateTime = dayjs(`${appointmentData.date} ${appointmentData.time}`);
    const now = dayjs();
    const minutesUntilAppointment = appointmentDateTime.diff(now, 'minute');
    
    if (minutesUntilAppointment < MIN_REMINDER_MINUTES) {
      console.log(`Skipping SMS reminder: Appointment is less than ${MIN_REMINDER_MINUTES} minutes away`);
      return true; // Return true to indicate success (since skipping is intentional)
    }

    const smsData = {
      phone: appointmentData.phone,
      clientName: appointmentData.clientName,
      businessName: appointmentData.businessName,
      date: appointmentData.date,
      time: appointmentData.time
    };

    console.log('Sending SMS with data:', smsData);

    const response = await fetch(`${BACKEND_URL}/api/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(smsData)
    });

    if (!response.ok) {
      throw new Error('Failed to send reminder SMS');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending reminder SMS:', error);
    return false;
  }
};
