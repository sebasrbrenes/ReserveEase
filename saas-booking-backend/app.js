import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import v1Router from './src/http/v1.js';
import paddleWebhook from './src/http/paddleWebhook.js';
import { notFound, errorHandler } from './src/http/errors.js';

dotenv.config();

const app = express();
// Behind Render's proxy: use the client IP for rate limiting
app.set('trust proxy', 1);

// Security headers: the API only answers JSON, so nothing may run or embed it.
app.use((req, res, next) => {
  res.set({
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  next();
});
app.disable('x-powered-by');

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true
}));
// Paddle signs the raw body, so its webhook is read before the JSON parser.
app.use('/api/v1/billing/paddle/webhook', paddleWebhook);
app.use(express.json({ limit: '20kb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'ReserveEase Backend API is running' });
});

// API v1: new booking core (see docs in the master document, section 13)
app.use('/api/v1', v1Router);
app.use('/api/v1', notFound);
app.use(errorHandler);

export default app;
