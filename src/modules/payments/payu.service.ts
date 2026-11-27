import crypto from 'crypto';
import { CloudflareD1Service } from '../../database/cloudflare-d1.service.js';

export interface PayUConfig {
  merchantKey: string;
  merchantSalt: string;
  isTestMode: boolean;
  paymentUrl: string;
  successUrl: string;
  failureUrl: string;
}

export interface SubscriptionPlan {
  id: 'starter' | 'growth' | 'enterprise';
  name: string;
  price: number;
  currency: 'INR';
  interval: 'monthly' | 'annual';
  callMinutes: number;
  agentSeats: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter Tier',
    price: 9999,
    currency: 'INR',
    interval: 'monthly',
    callMinutes: 5000,
    agentSeats: 5,
    features: ['Up to 5,000 call minutes', '5 Agent seats', 'Automated QA scoring', 'Standard audit reports'],
  },
  growth: {
    id: 'growth',
    name: 'Growth Professional',
    price: 24999,
    currency: 'INR',
    interval: 'monthly',
    callMinutes: 25000,
    agentSeats: 20,
    features: ['Up to 25,000 call minutes', '20 Agent seats', 'Root Cause Analysis (RCA)', 'Compliance & Sentiment flags', 'Priority queue'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Ultra',
    price: 49999,
    currency: 'INR',
    interval: 'monthly',
    callMinutes: 50000,
    agentSeats: 50,
    features: ['Unlimited custom parameters', '50 Agent seats', 'Cloudflare D1 & R2 sync', 'Custom SOP versioning', '24/7 SLA Support'],
  },
};

// In-memory transaction and subscription cache for rapid access
const transactionsStore = new Map<string, any>();
let activeSubscriptions = new Map<string, any>();

let dynamicPayUConfig: PayUConfig = {
  merchantKey: process.env.PAYU_MERCHANT_KEY || '4oEfiS',
  merchantSalt: process.env.PAYU_MERCHANT_SALT || process.env.PAYU_SALT || 'OquTGAxW4hVnBxTb8lBVjMQeHU37qMcc',
  isTestMode: process.env.PAYU_MODE === 'test',
  paymentUrl:
    process.env.PAYU_MODE === 'production'
      ? 'https://secure.payu.in/_payment'
      : 'https://test.payu.in/_payment',
  successUrl: process.env.PAYU_SUCCESS_URL || 'http://localhost:3001/?payment=success',
  failureUrl: process.env.PAYU_FAILURE_URL || 'http://localhost:3001/?payment=failure',
};

export class PayUService {
  /**
   * Get active PayU configuration
   */
  static getConfig(): PayUConfig {
    return { ...dynamicPayUConfig };
  }

  /**
   * Admin updates PayU configuration
   */
  static updateConfig(newConfig: Partial<PayUConfig>): PayUConfig {
    const isTest = newConfig.isTestMode !== undefined ? newConfig.isTestMode : dynamicPayUConfig.isTestMode;
    dynamicPayUConfig = {
      ...dynamicPayUConfig,
      ...newConfig,
      isTestMode: isTest,
      paymentUrl: isTest
        ? 'https://test.payu.in/_payment'
        : 'https://secure.payu.in/_payment',
    };
    return dynamicPayUConfig;
  }

  /**
   * Generate SHA-512 Hash for PayU Payment Initiation
   * Formula: sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
   */
  static generateHash(params: {
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
    const formattedAmount = Number(params.amount).toFixed(2);
    const hashString = [
      dynamicPayUConfig.merchantKey,
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
      '', '', '', '', '', // empty fields 6-10
      dynamicPayUConfig.merchantSalt,
    ].join('|');

    return crypto.createHash('sha512').update(hashString).digest('hex');
  }

  /**
   * Verify Reverse Hash from PayU Response
   * Formula: sha512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
   */
  static verifyResponseHash(resParams: Record<string, any>): boolean {
    const {
      status,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      hash,
      additionalCharges,
    } = resParams;

    const formattedAmount = Number(amount).toFixed(2);

    let reverseHashString = [
      dynamicPayUConfig.merchantSalt,
      status,
      '', '', '', '', '', // fields 10-6
      udf5 || '',
      udf4 || '',
      udf3 || '',
      udf2 || '',
      udf1 || '',
      email,
      firstname,
      productinfo,
      formattedAmount,
      txnid,
      dynamicPayUConfig.merchantKey,
    ].join('|');

    if (additionalCharges) {
      reverseHashString = `${additionalCharges}|${reverseHashString}`;
    }

    const calculatedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');
    return calculatedHash.toLowerCase() === (hash || '').toLowerCase();
  }

  /**
   * Initiate Subscription Checkout via PayU
   */
  static async initiateSubscription(params: {
    planId: 'starter' | 'growth' | 'enterprise';
    tenantId: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
  }) {
    const plan: SubscriptionPlan = SUBSCRIPTION_PLANS[params.planId] ?? (SUBSCRIPTION_PLANS['starter'] as SubscriptionPlan);
    const txnid = `AUDITAI_SUB_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const amount = plan.price.toFixed(2);
    const productinfo = `AuditAI_${plan.id.toUpperCase()}_Subscription`;
    const firstname = (params.customerName || 'Auditor').replace(/[^a-zA-Z0-9]/g, '') || 'Auditor';

    const hash = this.generateHash({
      txnid,
      amount,
      productinfo,
      firstname,
      email: params.customerEmail,
      udf1: '',
      udf2: '',
      udf3: '',
      udf4: '',
      udf5: '',
    });

    const txRecord = {
      txnid,
      tenant_id: params.tenantId,
      user_id: params.userId,
      plan_id: params.planId,
      amount: plan.price,
      currency: 'INR',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    transactionsStore.set(txnid, txRecord);

    // Save to Cloudflare D1
    try {
      await CloudflareD1Service.query(
        `INSERT OR REPLACE INTO payu_transactions (id, txnid, tenant_id, user_id, amount, currency, product_info, customer_name, customer_email, customer_phone, payu_hash, payu_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [crypto.randomUUID(), txnid, params.tenantId, params.userId, plan.price, 'INR', productinfo, firstname, params.customerEmail, params.customerPhone || '', hash]
      );
    } catch (err) {
      console.warn('[PayU] Could not sync tx to D1:', err);
    }

    return {
      txnid,
      actionUrl: dynamicPayUConfig.paymentUrl,
      key: dynamicPayUConfig.merchantKey,
      amount,
      productinfo,
      firstname,
      email: params.customerEmail,
      phone: params.customerPhone || '9999999999',
      surl: dynamicPayUConfig.successUrl,
      furl: dynamicPayUConfig.failureUrl,
      hash,
      udf1: '',
      udf2: '',
      udf3: '',
      udf4: '',
      udf5: '',
      plan,
    };
  }

  /**
   * Process PayU Payment Response / Webhook
   */
  static async handleResponse(body: Record<string, any>) {
    const { txnid, status, mihpayid, mode, bank_ref_num, error_Message, udf1: tenantId, udf3: planId } = body;
    const isVerified = this.verifyResponseHash(body);
    const paymentSuccess = status === 'success';

    const txRecord = transactionsStore.get(txnid) || {
      txnid,
      tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
      plan_id: planId || 'growth',
    };

    txRecord.status = paymentSuccess ? 'SUCCESS' : 'FAILURE';
    txRecord.mihpayid = mihpayid;
    txRecord.bank_ref_num = bank_ref_num;
    txRecord.mode = mode;
    txRecord.verified = isVerified;
    transactionsStore.set(txnid, txRecord);

    if (paymentSuccess) {
      const targetPlan: SubscriptionPlan = SUBSCRIPTION_PLANS[txRecord.plan_id] ?? (SUBSCRIPTION_PLANS['growth'] as SubscriptionPlan);
      const subRecord = {
        tenant_id: txRecord.tenant_id,
        plan_tier: txRecord.plan_id,
        status: 'ACTIVE',
        amount: targetPlan.price,
        currency: 'INR',
        max_call_minutes: targetPlan.callMinutes,
        max_agent_seats: targetPlan.agentSeats,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_gateway: 'PAYU',
        updated_at: new Date().toISOString(),
      };
      activeSubscriptions.set(txRecord.tenant_id, subRecord);

      // Upsert in Cloudflare D1
      try {
        await CloudflareD1Service.query(
          `UPDATE payu_transactions SET payu_status = 'SUCCESS', mihpayid = ?, mode = ?, bank_ref_num = ? WHERE txnid = ?`,
          [mihpayid, mode, bank_ref_num, txnid]
        );
        await CloudflareD1Service.query(
          `INSERT OR REPLACE INTO subscriptions (id, tenant_id, user_id, plan_tier, amount, currency, status, max_call_minutes, max_agent_seats, current_period_start, current_period_end, payment_gateway)
           VALUES (?, ?, ?, ?, ?, 'INR', 'ACTIVE', ?, ?, datetime('now'), datetime('now', '+30 days'), 'PAYU')`,
          [crypto.randomUUID(), txRecord.tenant_id, txRecord.user_id || '00000000-0000-0000-0000-000000000001', txRecord.plan_id, targetPlan.price, targetPlan.callMinutes, targetPlan.agentSeats]
        );
      } catch (err) {
        console.warn('[PayU] Could not sync sub to D1:', err);
      }
    }

    return {
      verified: isVerified,
      success: paymentSuccess,
      txnid,
      status,
      message: paymentSuccess ? 'Payment received successfully. Subscription activated.' : error_Message || 'Payment failed or cancelled.',
    };
  }

  /**
   * Get active subscription for a tenant
   */
  static getSubscription(tenantId: string) {
    return (
      activeSubscriptions.get(tenantId) || {
        tenant_id: tenantId,
        plan_tier: 'enterprise',
        status: 'ACTIVE',
        amount: 49999,
        currency: 'INR',
        max_call_minutes: 50000,
        max_agent_seats: 50,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        payment_gateway: 'PAYU',
      }
    );
  }

  /**
   * List all transactions for billing history
   */
  static listTransactions(tenantId?: string) {
    const list = Array.from(transactionsStore.values());
    if (tenantId) {
      return list.filter(t => t.tenant_id === tenantId);
    }
    return list;
  }
}
