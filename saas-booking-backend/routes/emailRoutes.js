import express from 'express';
import { sendConfirmationEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/send-confirmation', async (req, res) => {
  try {
    const emailData = req.body;
    const sent = await sendConfirmationEmail(emailData);
    
    if (sent) {
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error in email route:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending email',
      error: error.message 
    });
  }
});

export default router;
