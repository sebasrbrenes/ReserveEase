import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import emailRoutes from './routes/emailRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'ReserveEase Backend API is running' });
});

// Email routes
app.use('/api/email', emailRoutes);

// Appointment routes
app.use('/api/appointments', appointmentRoutes);

// SMS routes
app.use('/api/sms', smsRoutes);

// Webhook Lemon Squeezy
app.post('/api/payments/webhook', (req, res) => {
  try {
    const event = req.body;
    console.log('Webhook received:', JSON.stringify(event, null, 2));

    // Verify the event type
    if (event && event.data) {
      const eventType = event.data.type;
      
      switch (eventType) {
        case 'subscription_created':
          console.log('Subscription created:', event.data);
          break;
        case 'subscription_updated':
          console.log('Subscription updated:', event.data);
          break;
        case 'subscription_payment_success':
          console.log('Subscription payment success:', event.data);
          break;
        default:
          console.log('Unknown event type:', eventType);
      }
    }

    res.status(200).json({ success: true, message: 'Webhook received successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
