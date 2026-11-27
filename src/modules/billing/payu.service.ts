import crypto from 'crypto';
import { GatewayConfig } from './billing.types.js';

let payuConfig: GatewayConfig = {
  id: 'payu_cfg_01',
  gateway: 'payu',
  key_id: process.env.PAYU_MERCHANT_KEY || '4oEfiS',
  key_secret: process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || 'OquTGAxW4hVnBxTb8lBVjMQeHU37qMcc',
  is_test_mode: process.env.PAYU_MODE !== 'production',
  is_active: true,
  webhook_secret: process.env.PAYU_WEBHOOK_SECRET || 'payu_webhook_secret_2026',
};

export class PayUGatewayService {
  static getConfig(): GatewayConfig {
    return { ...payuConfig };
  }

  static updateConfig(partial: Partial<GatewayConfig>): GatewayConfig {
    payuConfig = { ...payuConfig, ...partial };
    return { ...payuConfig };
  }

  static getPaymentUrl(): string {
    return payuConfig.is_test_mode
      ? 'https://test.payu.in/_payment'
      : 'https://secure.payu.in/_payment';
  }

  static getPostserviceUrl(): string {
    return payuConfig.is_test_mode
      ? 'https://test.payu.in/merchant/postservice.php?form=2'
      : 'https://info.payu.in/merchant/postservice.php?form=2';
  }

  /**
   * Generates SHA-512 Hash for PayU Hosted Form
   * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
   */
  static generatePaymentHash(params: {
    txnid: string;
    amount: string | number;
    productinfo: string;
    firstname: string;
    email: string;
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
  }): string {
    const key = payuConfig.key_id.trim();
    const salt = payuConfig.key_secret.trim();
    const formattedAmount = Number(params.amount).toFixed(2);

    const hashString = [
      key,
      params.txnid,
      formattedAmount,
      params.productinfo,
      params.firstname,
      params.email,
      params.udf1 || '',
      params.udf2 || '',
      params.udf3 || '',
      params.udf4 || '',
      params.udf5 || '',
      '', '', '', '', '', // empty udf6 to udf10
      salt,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Verifies the reverse hash sent by PayU in callback / return
   * Formula: sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   */
  static verifyReverseHash(payload: Record<string, any>): boolean {
    const salt = payuConfig.key_secret.trim();
    const key = payuConfig.key_id.trim();

    const status = payload.status || '';
    const email = payload.email || '';
    const firstname = payload.firstname || '';
    const productinfo = payload.productinfo || '';
    const amount = Number(payload.amount).toFixed(2);
    const txnid = payload.txnid || '';
    const receivedHash = payload.hash || '';

    const udf1 = payload.udf1 || '';
    const udf2 = payload.udf2 || '';
    const udf3 = payload.udf3 || '';
    const udf4 = payload.udf4 || '';
    const udf5 = payload.udf5 || '';

    const reverseString = [
      salt,
      status,
      '', '', '', '', '', // empty udf10 to udf6 in reverse
      udf5,
      udf4,
      udf3,
      udf2,
      udf1,
      email,
      firstname,
      productinfo,
      amount,
      txnid,
      key,
    ].join('|');

    const calculatedHash = crypto.createHash('sha512').update(reverseString).digest('hex');
    return calculatedHash.toLowerCase() === receivedHash.toLowerCase();
  }

  /**
   * Calls PayU Server-to-Server Verify Payment API
   * Formula: sha512(key|verify_payment|txnid|SALT)
   */
  static async verifyPaymentWithPayU(txnid: string): Promise<{
    verified: boolean;
    status: string;
    amount?: number;
    mihpayid?: string;
    raw?: any;
  }> {
    const key = payuConfig.key_id.trim();
    const salt = payuConfig.key_secret.trim();
    const command = 'verify_payment';

    const hashString = `${key}|${command}|${txnid}|${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    try {
      const body = new URLSearchParams({
        key,
        command,
        var1: txnid,
        hash,
      });

      const response = await fetch(PayUGatewayService.getPostserviceUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        return { verified: false, status: 'HTTP_ERROR' };
      }

      const json = await response.json() as any;
      const txDetails = json?.transaction_details?.[txnid];

      if (txDetails && (txDetails.status === 'success' || txDetails.status === 'captured')) {
        return {
          verified: true,
          status: 'success',
          amount: parseFloat(txDetails.amt || txDetails.amount || '0'),
          mihpayid: txDetails.mihpayid,
          raw: txDetails,
        };
      }

      return {
        verified: false,
        status: txDetails?.status || 'NOT_FOUND',
        raw: json,
      };
    } catch (err: any) {
      return { verified: false, status: 'NETWORK_ERROR', raw: err?.message };
    }
  }

  /**
   * PayU Refund API
   * Formula: sha512(key|cancel_refund_transaction|mihpayid|SALT)
   */
  static async refundPayment(params: {
    mihpayid: string;
    refundAmount: number;
    token?: string;
  }): Promise<{ success: boolean; refundId?: string; error?: string }> {
    const key = payuConfig.key_id.trim();
    const salt = payuConfig.key_secret.trim();
    const command = 'cancel_refund_transaction';
    const var1 = params.mihpayid;
    const var2 = String(params.token || `ref_${Date.now()}`);
    const var3 = Number(params.refundAmount).toFixed(2);

    const hashString = `${key}|${command}|${var1}|${salt}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');

    try {
      const body = new URLSearchParams({
        key,
        command,
        var1,
        var2,
        var3,
        hash,
      });

      const response = await fetch(PayUGatewayService.getPostserviceUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      const json = await response.json() as any;
      if (json?.status === 1 || json?.msg === 'Refund request queued') {
        return { success: true, refundId: json.request_id || var2 };
      }
      return { success: false, error: json?.msg || 'Refund declined by PayU' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'PayU refund request failed' };
    }
  }
}
