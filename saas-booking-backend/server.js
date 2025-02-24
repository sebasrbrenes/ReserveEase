import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
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
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })); // To access rawBody

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'ReserveEase Backend API is running' });
});

// Webhook Lemon Squeezy
app.post('/api/webhooks/lemonsqueezy', (req, res) => {
  const secret = process.env.SIGNING_SECRET_BACKEND;
  const signature = req.headers['x-signature'];
  const rawBody = req.rawBody;

  if (!signature || !secret) {
    return res.status(400).json({ error: 'Missing signature or secret' });
  }

  // Verify the signature using HMAC-SHA256
  const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  if (signature !== expectedSignature) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  console.log('✅ Webhook received:', req.body);

  res.status(200).json({ message: 'Webhook received' });
});

// Email routes
app.use('/api/email', emailRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/sms', smsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
