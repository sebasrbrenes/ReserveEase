const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const sendBusinessNotification = async (appointmentData) => {
  try {
    const emailData = {
        business_owner_name: appointmentData.business_owner_name,
        business_name: appointmentData.business_name,
        client_name: appointmentData.client_name,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        business_email: appointmentData.business_email,
        client_email: appointmentData.client_email,
        service_name: appointmentData.service_name,
        staff_member: appointmentData.staff_member
    };

    const response = await fetch(`${BACKEND_URL}/api/appointments/new-appointment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Failed to send business notification email');
    }

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error sending business notification email:', error);
    return false;
  }
};
