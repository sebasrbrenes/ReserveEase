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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
