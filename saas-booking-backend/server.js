import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import emailRoutes from './routes/emailRoutes.js';
import smsRoutes from './routes/smsRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import { db } from './config/firebase.js';

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

// Helper function to update user subscription data in Firestore
const updateUserSubscription = async (userId, subscriptionData) => {
  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      subscription: subscriptionData
    });
    console.log(`Updated subscription for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error updating subscription for user ${userId}:`, error);
    return false;
  }
};

// Webhook Lemon Squeezy
app.post('/api/webhooks/lemonsqueezy', async (req, res) => {
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

  try {
    const { event, data } = req.body;
    console.log(`✅ Webhook received: ${event}`);
    
    // Extract the necessary data from the webhook payload
    const { meta, attributes } = data;
    const userId = meta?.custom_data?.user_id;
    
    if (!userId) {
      console.error('User ID not found in webhook data');
      return res.status(400).json({ error: 'User ID not found in webhook data' });
    }

    // Handle different subscription events
    switch (event) {
      case 'subscription_created':
        {
          const subscriptionData = {
            subscriptionId: attributes.id,
            planId: attributes.product_id,
            status: 'active',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(attributes.renews_at).toISOString(),
            orderId: attributes.order_id,
            renewsAt: attributes.renews_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_updated':
        {
          const subscriptionData = {
            subscriptionId: attributes.id,
            planId: attributes.product_id,
            status: attributes.status,
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(attributes.renews_at).toISOString(),
            renewsAt: attributes.renews_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_payment_success':
        {
          const subscriptionData = {
            subscriptionId: attributes.id,
            planId: attributes.product_id,
            status: 'active',
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(attributes.renews_at).toISOString(),
            lastPaymentAt: new Date().toISOString(),
            renewsAt: attributes.renews_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_cancelled':
        {
          const subscriptionData = {
            subscriptionId: attributes.id,
            planId: attributes.product_id,
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(attributes.ends_at).toISOString(),
            cancelledAt: new Date().toISOString(),
            endsAt: attributes.ends_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_expired':
        {
          const subscriptionData = {
            subscriptionId: attributes.id,
            planId: attributes.product_id,
            status: 'expired',
            updatedAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            expiredAt: new Date().toISOString()
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

// Email routes
app.use('/api/email', emailRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/sms', smsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
