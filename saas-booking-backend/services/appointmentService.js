import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config();
if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Funtion to build the HTML content of the email by using placeholders
const buildHtmlContent = (data) => {
  const sanitizedData = {
    business_owner_name: sanitizeHTML(data.business_owner_name || ''),
    business_name: sanitizeHTML(data.business_name || ''),
    to_name: sanitizeHTML(data.client_name || ''),
    appointment_date: sanitizeHTML(data.appointment_date || ''),
    appointment_time: sanitizeHTML(data.appointment_time || ''),
    service_name: sanitizeHTML(data.service_name || 'N/A'),
    staff_member: sanitizeHTML(data.staff_member || 'N/A')
  };

  return htmlTemplate
    .replace(/{{business_owner_name}}/g, sanitizedData.business_owner_name)
    .replace(/{{business_name}}/g, sanitizedData.business_name)
    .replace(/{{to_name}}/g, sanitizedData.to_name)
    .replace(/{{appointment_date}}/g, sanitizedData.appointment_date)
    .replace(/{{appointment_time}}/g, sanitizedData.appointment_time)
    .replace(/{{service_name}}/g, sanitizedData.service_name)
    .replace(/{{staff_member}}/g, sanitizedData.staff_member);
};

// Function to sanitize HTML
const sanitizeHTML = (str) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Template HTML
const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Appointment Notification</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');

    body {
      font-family: 'Poppins', Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f0f4f8;
      color: #2d3748;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 40px 0;
      background-color: #4c51bf;
      color: white;
      position: relative;
    }
    .header::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: url("data:image/svg+xml,%3Csvg width='52' height='26' viewBox='0 0 52 26' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M10 10c0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6h2c0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4 3.314 0 6 2.686 6 6 0 2.21 1.79 4 4 4v2c-3.314 0-6-2.686-6-6 0-2.21-1.79-4-4-4-3.314 0-6-2.686-6-6zm25.464-1.95l8.486 8.486-1.414 1.414-8.486-8.486 1.414-1.414z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
      opacity: 0.8;
    }
    .logo-container {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      position: relative;
      z-index: 1;
    }
    .logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 20%;
    }
    .content {
      padding: 40px;
    }
    .appointment-details {
      background-color: #edf2f7;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .appointment-details h2 {
      margin-top: 0;
      color: #4a5568;
    }
    .appointment-details ul {
      list-style-type: none;
      padding: 0;
    }
    .appointment-details li {
      margin-bottom: 10px;
    }
    .footer {
      text-align: center;
      font-size: 14px;
      color: #718096;
      margin-top: 40px;
      padding: 20px;
      background-color: #f7fafc;
      border-top: 1px solid #e2e8f0;
    }
    .button {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 24px;
      background-color: #4c51bf;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      transition: background-color 0.3s ease;
    }
    .button:hover {
      background-color: #434190;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://www.ReserveEase.com" target="_blank" style="text-decoration: none;">
        <div class="logo-container">
          <img src="https://i.imgur.com/7ORaj3I.png" 
              alt="Logo de ReserveEase" 
              class="logo">
        </div>
      </a> 
      <h1>New Appointment Booked!</h1>
    </div>
    <div class="content">
      <p>Hello <strong>{{business_owner_name}}</strong>,</p>
      <p>
        Great news! A new appointment has been booked at <strong>{{business_name}}</strong>. Here are the details:
      </p>
      <div class="appointment-details">
        <h2>Appointment Information</h2>
        <ul>
          <li><strong>Client Name:</strong> {{to_name}}</li>
          <li><strong>Date:</strong> {{appointment_date}}</li>
          <li><strong>Time:</strong> {{appointment_time}}</li>
          <li><strong>Service:</strong> {{service_name}}</li>
          <li><strong>Staff:</strong> {{staff_member}}</li>
        </ul>
      </div>
      <p>
        Please ensure you're prepared for this appointment. If you need to make any changes or have any questions, please use the ReserveEase dashboard to manage, edit or view details of this booking.
      </p>
      <a href="{{app.reserveease.com}}" class="button" style="color: white !important;">View in Dashboard</a>
    </div>
    <div class="footer">
      <p>
        This is an automated notification from ReserveEase. <br>
        Your appointment management system.
      </p>
      <p>
        Need assistance? Contact our support team at <a href="mailto:support@reserveease.com">support@reserveease.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// Function to send the confirmation email
export const sendBusinessNotificationEmail = async (userData) => {
  try {
    // Basic validation
    const requiredFields = ['business_name', 'client_name', 'appointment_date', 'appointment_time', 'business_email'];
    const missingFields = requiredFields.filter(field => !userData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Send email to business owner
    const msg = {
      to: userData.business_email,
      from: {
        name: "ReserveEase",
        email: process.env.FROM_EMAIL,
      },
      subject: 'ReserveEase - New Appointment Booked!',
      html: buildHtmlContent(userData),
      text: `New Appointment Booked at ${userData.business_name}
Client: ${userData.client_name}
Date: ${userData.appointment_date}
Time: ${userData.appointment_time}
Service: ${userData.service_name || 'N/A'}
Staff: ${userData.staff_member || 'N/A'}`
    };

    const response = await sgMail.send(msg);
    console.log('Business owner notification sent:', response[0].statusCode);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    if (error.response) console.error('Details:', error.response.body);
    return false;
  }
};
