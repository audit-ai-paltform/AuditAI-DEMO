import { Request, Response } from 'express';
import { PayUService, SUBSCRIPTION_PLANS } from './payu.service.js';

export class PaymentsController {
  /**
   * Get PayU public configuration and available subscription plans
   */
  static async getConfig(_req: Request, res: Response): Promise<void> {
    const config = PayUService.getConfig();
    res.status(200).json({
      success: true,
      data: {
        merchantKey: config.merchantKey,
        merchantSalt: config.merchantSalt,
        isTestMode: config.isTestMode,
        paymentUrl: config.paymentUrl,
        plans: Object.values(SUBSCRIPTION_PLANS),
      },
    });
  }

  /**
   * Admin updates PayU configuration
   */
  static async updateAdminConfig(req: Request, res: Response): Promise<void> {
    try {
      const { merchantKey, merchantSalt, isTestMode, successUrl, failureUrl } = req.body;
      const updated = PayUService.updateConfig({
        merchantKey,
        merchantSalt,
        isTestMode,
        successUrl,
        failureUrl,
      });

      res.status(200).json({
        success: true,
        message: 'PayU payment gateway configuration updated successfully',
        data: {
          merchantKey: updated.merchantKey,
          isTestMode: updated.isTestMode,
          paymentUrl: updated.paymentUrl,
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Initiate PayU Subscription Payment
   * POST /api/v1/payments/payu/initiate
   */
  static async initiatePayUSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { plan, customerName, customerEmail, customerPhone } = req.body;
      const tenantId = (res.locals.tenantId as string) || (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001';
      const userId = (res.locals.userId as string) || '00000000-0000-0000-0000-000000000001';

      const planId = (plan || 'starter').toLowerCase() as 'starter' | 'growth' | 'enterprise';

      const checkoutPayload = await PayUService.initiateSubscription({
        planId,
        tenantId,
        userId,
        customerName: customerName || 'Enterprise Auditor',
        customerEmail: customerEmail || 'billing@auditai.io',
        customerPhone,
      });

      res.status(200).json({
        success: true,
        data: checkoutPayload,
      });
    } catch (err: any) {
      console.error('[PayU] Initiate subscription error:', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to initiate PayU payment' });
    }
  }

  /**
   * Handle PayU Payment Callback / Webhook
   * POST /api/v1/payments/payu/callback
   */
  static async handlePayUCallback(req: Request, res: Response): Promise<void> {
    try {
      const result = await PayUService.handleResponse(req.body);

      const isAjax = req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers['accept']?.includes('application/json');

      // If called via standard browser form POST redirect from PayU gateway
      if (!isAjax && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        const frontendBase = process.env.CORS_ORIGIN || 'http://localhost:3001';
        const redirectUrl = result.success
          ? `${frontendBase}/?payment=success&txnid=${encodeURIComponent(result.txnid)}`
          : `${frontendBase}/?payment=failure&txnid=${encodeURIComponent(result.txnid)}&msg=${encodeURIComponent(result.message)}`;
        return res.redirect(redirectUrl);
      }

      res.status(200).json({
        success: result.success,
        data: result,
      });
    } catch (err: any) {
      console.error('[PayU] Callback error:', err);
      res.status(500).json({ success: false, message: 'Failed to process PayU callback' });
    }
  }

  /**
   * Get current tenant subscription status
   * GET /api/v1/payments/subscription
   */
  static async getSubscription(req: Request, res: Response): Promise<void> {
    const tenantId = (res.locals.tenantId as string) || (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001';
    const sub = PayUService.getSubscription(tenantId);
    res.status(200).json({
      success: true,
      data: sub,
    });
  }

  /**
   * List PayU transaction history
   * GET /api/v1/payments/transactions
   */
  static async getTransactions(req: Request, res: Response): Promise<void> {
    const tenantId = (res.locals.tenantId as string) || (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001';
    const list = PayUService.listTransactions(tenantId);
    res.status(200).json({
      success: true,
      data: list,
    });
  }

  /**
   * Legacy Razorpay backward compatibility
   */
  static async createSubscription(req: Request, res: Response): Promise<void> {
    // Redirect cleanly to PayU subscription initiation
    return PaymentsController.initiatePayUSubscription(req, res);
  }

  static async handleRazorpayWebhook(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ status: 'ok', provider: 'payu_active' });
  }
}
