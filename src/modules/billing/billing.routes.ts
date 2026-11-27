import { Router } from 'express';
import { BillingController } from './billing.controller.js';

export const billingRoutes = Router();

// Public Plan Endpoint
billingRoutes.get('/public/plans', BillingController.getPublicPlans);

// Tenant Billing Endpoints
billingRoutes.post('/billing/checkout', BillingController.initiateCheckout);
billingRoutes.get('/billing/subscription', BillingController.getSubscription);
billingRoutes.get('/billing/invoices', BillingController.getInvoices);

// Gateway Webhooks and Redirects
billingRoutes.all('/billing/payu/return', BillingController.handlePayUReturn);
billingRoutes.post('/billing/razorpay/verify', BillingController.handleRazorpayVerify);

// Admin Portal Management Endpoints
billingRoutes.get('/admin/v1/plans', BillingController.getAdminPlans);
billingRoutes.get('/admin/v1/subscriptions', BillingController.getAllSubscriptions);
billingRoutes.post('/admin/v1/subscriptions/:id/extend', BillingController.extendSubscription);
billingRoutes.get('/admin/v1/payments', BillingController.getAllPayments);
billingRoutes.post('/admin/v1/payments/:id/refund', BillingController.refundPayment);
billingRoutes.get('/admin/v1/gateways/config', BillingController.getGatewayConfigs);
billingRoutes.put('/admin/v1/gateways/config', BillingController.updateGatewayConfig);
