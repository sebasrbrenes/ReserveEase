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
        email: subscriptionData.userEmail || userDoc.data().email,
        name: subscriptionData.userName || userDoc.data().name,
        updatedAt: new Date().toISOString()
      });
      console.log(`Updated subscription for existing user ${userId}`);
    } else {
      // Create new user document with subscription data
      await userRef.set({
        id: userId,
        email: subscriptionData.userEmail,
        name: subscriptionData.userName,
        subscription: subscriptionData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log(`Created new user ${userId} with subscription data`);
    }
    
    // Also store subscription history in a separate collection for tracking
    const subscriptionHistoryRef = db.collection('subscriptionHistory').doc();
    await subscriptionHistoryRef.set({
      userId: userId,
      email: subscriptionData.userEmail,
      eventType: subscriptionData.status,
      subscriptionId: subscriptionData.subscriptionId,
      timestamp: new Date().toISOString(),
      data: subscriptionData
    });
    
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
    
    // Extract event name from meta.event_name instead of event
    const eventName = req.body.meta?.event_name;
    console.log(`✅ Webhook received: ${eventName}`);
    
    if (!req.body.data) {
      console.error('No data found in webhook payload');
      return res.status(200).json({ message: 'Webhook received but no data found' });
    }
    
    const data = req.body.data;
    
    // Extract user identifier - prefer email as it's consistent across all events
    let userId = data.attributes?.user_email;
    
    // If email not found, try other identifiers
    if (!userId) {
      // Try customer_id as fallback
      userId = data.attributes?.customer_id?.toString();
    }
    
    // If we still don't have a userId, use subscription_id or invoice_id as last resort
    if (!userId) {
      userId = data.id ? `subscription_${data.id}` : 'unknown_user';
    }
    
    console.log('Using user ID:', userId);

    // Handle different subscription events
    switch (eventName) {
      case 'subscription_created':
        {
          const subscriptionData = {
            subscriptionId: data.id,
            planId: data.attributes.product_id,
            status: data.attributes.status,
            createdAt: new Date().toISOString(),
            expiresAt: data.attributes.trial_ends_at ? 
                       new Date(data.attributes.trial_ends_at).toISOString() : 
                       new Date(data.attributes.renews_at).toISOString(),
            orderId: data.attributes.order_id,
            renewsAt: data.attributes.renews_at,
            productName: data.attributes.product_name,
            userName: data.attributes.user_name,
            userEmail: data.attributes.user_email,
            isOnTrial: data.attributes.status === 'on_trial',
            trialEndsAt: data.attributes.trial_ends_at,
            testMode: data.attributes.test_mode
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_updated':
        {
          const subscriptionData = {
            subscriptionId: data.id,
            planId: data.attributes.product_id,
            status: data.attributes.status,
            updatedAt: new Date().toISOString(),
            expiresAt: data.attributes.trial_ends_at ? 
                       new Date(data.attributes.trial_ends_at).toISOString() : 
                       new Date(data.attributes.renews_at).toISOString(),
            renewsAt: data.attributes.renews_at,
            productName: data.attributes.product_name,
            userName: data.attributes.user_name,
            userEmail: data.attributes.user_email,
            isOnTrial: data.attributes.status === 'on_trial',
            trialEndsAt: data.attributes.trial_ends_at,
            testMode: data.attributes.test_mode
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_payment_success':
        {
          // For payment_success, the data structure is different (subscription-invoices)
          const subscriptionId = data.attributes.subscription_id;
          
          const subscriptionData = {
            subscriptionId: subscriptionId,
            invoiceId: data.id,
            status: 'active',
            updatedAt: new Date().toISOString(),
            lastPaymentAt: new Date().toISOString(),
            userName: data.attributes.user_name,
            userEmail: data.attributes.user_email,
            billingReason: data.attributes.billing_reason,
            amount: data.attributes.total,
            amountFormatted: data.attributes.total_formatted,
            testMode: data.attributes.test_mode
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_cancelled':
        {
          const subscriptionData = {
            subscriptionId: data.id,
            planId: data.attributes.product_id,
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
            expiresAt: data.attributes.ends_at ? 
                       new Date(data.attributes.ends_at).toISOString() : 
                       new Date(data.attributes.renews_at).toISOString(),
            cancelledAt: new Date().toISOString(),
            endsAt: data.attributes.ends_at,
            productName: data.attributes.product_name,
            userName: data.attributes.user_name,
            userEmail: data.attributes.user_email,
            testMode: data.attributes.test_mode
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      case 'subscription_expired':
        {
          const subscriptionData = {
            subscriptionId: data.id,
            planId: data.attributes.product_id,
            status: 'expired',
            updatedAt: new Date().toISOString(),
            expiresAt: new Date().toISOString(),
            expiredAt: new Date().toISOString(),
            productName: data.attributes.product_name,
            userName: data.attributes.user_name,
            userEmail: data.attributes.user_email,
            testMode: data.attributes.test_mode
          };
          
          await updateUserSubscription(userId, subscriptionData);
        }
        break;
        
      default:
        console.log(`Unhandled webhook event: ${eventName}`);
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
