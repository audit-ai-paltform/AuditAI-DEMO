import { Router } from 'express';
import { PaymentsController } from './payments.controller.js';

export const paymentRoutes = Router();

// Public / client payment endpoints
paymentRoutes.get('/config', PaymentsController.getConfig);
paymentRoutes.post('/payu/initiate', PaymentsController.initiatePayUSubscription);
paymentRoutes.post('/payu/callback', PaymentsController.handlePayUCallback);

// Subscription status & history
paymentRoutes.get('/subscription', PaymentsController.getSubscription);
paymentRoutes.get('/transactions', PaymentsController.getTransactions);

// Admin configuration for PayU merchant credentials
paymentRoutes.post('/admin/config', PaymentsController.updateAdminConfig);

// Legacy Razorpay routes
paymentRoutes.post('/create-subscription', PaymentsController.createSubscription);
paymentRoutes.post('/webhook', PaymentsController.handleRazorpayWebhook);
