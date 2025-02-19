const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const sendAppointmentConfirmation = async (appointmentData) => {
  try {
    const emailData = {
      email: appointmentData.email,
      to_name: appointmentData.to_name,
      business_name: appointmentData.business_name,
      appointment_date: appointmentData.appointment_date,
      appointment_time: appointmentData.appointment_time
    };

    const response = await fetch(`${BACKEND_URL}/api/email/send-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send confirmation email');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return false;
  }
};
