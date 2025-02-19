import express from 'express';
import { sendBusinessNotificationEmail } from '../services/appointmentService.js';

const router = express.Router();

router.post('/new-appointment', async (req, res) => {
  try {
    const appointmentData = req.body;
    const appointment = await sendBusinessNotificationEmail(appointmentData);
    
    if (appointment) {
      res.json({ success: true, message: 'Email appointment sent successfully', data: appointment });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email appointment' });
    }
  } catch (error) {
    console.error('Error in appointment route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending email appointment',
      error: error.message 
    });
  }
});

export default router;
