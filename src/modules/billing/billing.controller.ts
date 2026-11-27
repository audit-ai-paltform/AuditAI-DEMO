import { Request, Response } from 'express';
import { BillingService } from './billing.service.js';
import { PayUGatewayService } from './payu.service.js';
import { RazorpayGatewayService } from './razorpay.service.js';

export class BillingController {
  /**
   * GET /api/v1/public/plans
   */
  static async getPublicPlans(_req: Request, res: Response): Promise<void> {
    try {
      const plans = BillingService.getPlans(true);
      res.json({ success: true, data: plans });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/admin/v1/plans
   */
  static async getAdminPlans(_req: Request, res: Response): Promise<void> {
    try {
      const plans = BillingService.getPlans(false);
      res.json({ success: true, data: plans });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/billing/checkout
   */
  static async initiateCheckout(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId || (req.body && req.body.tenantId) || '00000000-0000-0000-0000-000000000001';
      const { planCode, gateway = 'payu', customerName, customerEmail, customerPhone } = req.body;

      if (!planCode) {
        res.status(400).json({ success: false, error: 'planCode is required' });
        return;
      }

      const result = await BillingService.initiateCheckout({
        tenantId,
        planCode,
        gateway: gateway === 'razorpay' ? 'razorpay' : 'payu',
        customerName: customerName || 'Valued Client',
        customerEmail: customerEmail || 'billing@acmetelephony.in',
        customerPhone: customerPhone || '9876543210',
      });

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/billing/payu/return
   * PayU browser redirect post-back
   */
  static async handlePayUReturn(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body || {};
      const {
        status,
        txnid,
        amount,
        productinfo,
        firstname,
        email,
        mihpayid,
        hash,
        udf1,
        udf2,
        udf3,
        udf4,
        udf5,
        error_Message,
      } = payload;

      const isReverseHashValid = PayUGatewayService.verifyReverseHash({
        status: status || '',
        txnid: txnid || '',
        amount: amount || '',
        productinfo: productinfo || '',
        firstname: firstname || '',
        email: email || '',
        mihpayid: mihpayid || '',
        udf1: udf1 || '',
        udf2: udf2 || '',
        udf3: udf3 || '',
        udf4: udf4 || '',
        udf5: udf5 || '',
        receivedHash: hash || '',
      });

      const isSuccess = (status === 'success') && isReverseHashValid;

      if (isSuccess) {
        const amountPaise = Math.round(parseFloat(amount || '0') * 100);
        await BillingService.activateSubscriptionFromPayment({
          txnid: txnid || '',
          gateway: 'payu',
          gatewayPaymentId: mihpayid || `payu_${Date.now()}`,
          amountPaidPaise: amountPaise,
          customerEmail: email,
          customerName: firstname,
        });

        res.send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Payment Successful - AuditAI</title>
              <meta http-equiv="refresh" content="3;url=http://localhost:3001/?payment=success&txnid=${encodeURIComponent(txnid || '')}&gateway=payu" />
              <style>
                body { background: #08162d; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #0f2444; border: 1px solid #1e3a66; border-radius: 16px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
                .icon { width: 64px; height: 64px; background: #059669; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; color: white; }
                h1 { margin: 0 0 10px; font-size: 24px; color: #38bdf8; }
                p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }
                .btn { display: inline-block; background: #38bdf8; color: #08162d; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">✓</div>
                <h1>Payment Confirmed</h1>
                <p>Your transaction <strong>${txnid || ''}</strong> has been verified. Activating your subscription and redirecting to the console...</p>
                <a class="btn" href="http://localhost:3001/?payment=success&txnid=${encodeURIComponent(txnid || '')}&gateway=payu">Return to Console</a>
              </div>
            </body>
          </html>
        `);
        return;
      }

      // Failure or Hash Mismatch
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payment Failed - AuditAI</title>
            <style>
              body { background: #08162d; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { background: #0f2444; border: 1px solid #ef4444; border-radius: 16px; padding: 40px; text-align: center; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
              .icon { width: 64px; height: 64px; background: #dc2626; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; color: white; }
              h1 { margin: 0 0 10px; font-size: 24px; color: #f87171; }
              p { color: #94a3b8; font-size: 15px; line-height: 1.5; margin: 0 0 24px; }
              .btn { display: inline-block; background: #ef4444; color: #ffffff; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">✕</div>
              <h1>Payment Failed</h1>
              <p>${error_Message || 'Transaction failed or signature verification did not match.'}</p>
              <a class="btn" href="http://localhost:3001/">Return to Home</a>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/billing/razorpay/verify
   */
  static async handleRazorpayVerify(req: Request, res: Response): Promise<void> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, txnid, amountPaise, email, name } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        res.status(400).json({ success: false, error: 'Missing Razorpay signature parameters' });
        return;
      }

      const isValid = RazorpayGatewayService.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isValid) {
        res.status(400).json({ success: false, error: 'Razorpay HMAC SHA256 signature verification failed' });
        return;
      }

      const activation = await BillingService.activateSubscriptionFromPayment({
        txnid: txnid || razorpay_order_id,
        gateway: 'razorpay',
        gatewayPaymentId: razorpay_payment_id,
        amountPaidPaise: amountPaise || 999900,
        customerEmail: email,
        customerName: name,
      });

      res.json(activation);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/billing/subscription
   */
  static async getSubscription(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId || (req.query.tenantId as string) || '00000000-0000-0000-0000-000000000001';
      const sub = BillingService.getSubscription(tenantId);
      res.json({ success: true, data: sub });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/billing/invoices
   */
  static async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId || (req.query.tenantId as string);
      const invoices = BillingService.getInvoices(tenantId);
      res.json({ success: true, data: invoices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/admin/v1/subscriptions
   */
  static async getAllSubscriptions(_req: Request, res: Response): Promise<void> {
    try {
      const subs = BillingService.getAllSubscriptions();
      res.json({ success: true, data: subs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/admin/v1/subscriptions/:id/extend
   */
  static async extendSubscription(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { days = 30 } = req.body;
      const updated = BillingService.extendSubscription(id, Number(days));
      if (!updated) {
        res.status(404).json({ success: false, error: 'Subscription not found' });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/admin/v1/payments
   */
  static async getAllPayments(_req: Request, res: Response): Promise<void> {
    try {
      const payments = BillingService.getAllPayments();
      res.json({ success: true, data: payments });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * POST /api/v1/admin/v1/payments/:id/refund
   */
  static async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { amountPaise, reason } = req.body;
      const result = await BillingService.refundPayment({ paymentId: id, amountPaise, reason });
      if (!result.success) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * GET /api/v1/admin/v1/gateways/config
   */
  static async getGatewayConfigs(_req: Request, res: Response): Promise<void> {
    try {
      const configs = BillingService.getGatewayConfigs();
      res.json({ success: true, data: configs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * PUT /api/v1/admin/v1/gateways/config
   */
  static async updateGatewayConfig(req: Request, res: Response): Promise<void> {
    try {
      const { gateway, updates } = req.body;
      if (!gateway || !['payu', 'razorpay'].includes(gateway)) {
        res.status(400).json({ success: false, error: 'Invalid gateway specified' });
        return;
      }
      const updated = BillingService.updateGatewayConfig(gateway, updates || {});
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
