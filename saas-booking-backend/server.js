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
    
    // Check if the user document exists
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      // Update existing user document
      await userRef.update({
        subscription: subscriptionData,
        updatedAt: new Date().toISOString()
      });
      console.log(`Updated subscription for existing user ${userId}`);
    } else {
      // Create new user document with subscription data
      await userRef.set({
        id: userId,
        subscription: subscriptionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`Created new user ${userId} with subscription data`);
    }
    
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
    // Log the entire webhook payload for debugging
    console.log('Complete webhook payload:', JSON.stringify(req.body, null, 2));
    
    const { event, data } = req.body;
    console.log(`✅ Webhook received: ${event}`);
    
    if (!data) {
      console.error('No data found in webhook payload');
      return res.status(200).json({ message: 'Webhook received but no data found' });
    }
    
    // Extract the necessary data from the webhook payload
    // Lemon Squeezy might be sending the user ID in different locations
    // Let's check several possible locations
    let userId;
    
    // Option 1: Check in custom_data directly
    if (data.meta?.custom_data?.user_id) {
      userId = data.meta.custom_data.user_id;
    } 
    // Option 2: Check in attributes.custom_data
    else if (data.attributes?.custom_data?.user_id) {
      userId = data.attributes.custom_data.user_id;
    }
    // Option 3: Check in meta.custom_data as a string that needs parsing
    else if (data.meta?.custom_data && typeof data.meta.custom_data === 'string') {
      try {
        const parsedCustomData = JSON.parse(data.meta.custom_data);
        userId = parsedCustomData.user_id;
      } catch (e) {
        console.log('Failed to parse custom_data string:', e);
      }
    }
    // Option 4: Check if there's a user_id directly in the data
    else if (data.user_id) {
      userId = data.user_id;
    }
    
    // If we still don't have a userId, we'll use a default one for testing
    // In production, you would want to handle this differently
    if (!userId) {
      console.warn('User ID not found in webhook data, using default user for testing');
      // For testing only - in production you should handle this case appropriately
      userId = 'default_test_user';
    }
    
    console.log('Using user ID:', userId);

    // Handle different subscription events
    switch (event) {
      case 'subscription_created':
        {
          const subscriptionData = {
            subscriptionId: data.attributes.id,
            planId: data.attributes.product_id,
            status: 'active',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(data.attributes.renews_at).toISOString(),
            orderId: data.attributes.order_id,
            renewsAt: data.attributes.renews_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_updated':
        {
          const subscriptionData = {
            subscriptionId: data.attributes.id,
            planId: data.attributes.product_id,
            status: data.attributes.status,
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(data.attributes.renews_at).toISOString(),
            renewsAt: data.attributes.renews_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_payment_success':
        {
          const subscriptionData = {
            subscriptionId: data.attributes.id,
            planId: data.attributes.product_id,
            status: 'active',
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(data.attributes.renews_at).toISOString(),
            lastPaymentAt: new Date().toISOString(),
            renewsAt: data.attributes.renews_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_cancelled':
        {
          const subscriptionData = {
            subscriptionId: data.attributes.id,
            planId: data.attributes.product_id,
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
            expiresAt: new Date(data.attributes.ends_at).toISOString(),
            cancelledAt: new Date().toISOString(),
            endsAt: data.attributes.ends_at
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_expired':
        {
          const subscriptionData = {
            subscriptionId: data.attributes.id,
            planId: data.attributes.product_id,
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
    // Still return 200 to acknowledge receipt of the webhook
    // This prevents Lemon Squeezy from retrying the webhook
    res.status(200).json({ message: 'Webhook received but encountered an error during processing' });
  }
});

// Email routes
app.use('/api/email', emailRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/sms', smsRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
