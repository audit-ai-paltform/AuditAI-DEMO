import { Plan, Subscription, PaymentOrder, PaymentRecord, InvoiceRecord, GatewayConfig } from './billing.types.js';
import { PayUGatewayService } from './payu.service.js';
import { RazorpayGatewayService } from './razorpay.service.js';
import { EmailService } from '../email/email.service.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

// Pre-seeded plans in memory
const memoryPlans: Plan[] = [
  {
    id: 'plan_starter_01',
    code: 'starter',
    name: 'Starter Pilot',
    price_paise: 499900,
    currency: 'INR',
    interval: 'MONTH',
    call_limit: 2500,
    overage_paise: 150,
    features: [
      '100% Automated QA Scoring',
      'Knowlarity Webhook Ingestion',
      'Standard SOP Rules Engine',
      'Daily Digest PDF Reports',
      'Cloudflare D1 & Supabase SQL',
      'Standard Email Support (24h SLA)',
    ],
    is_public: true,
    version: 1,
    active: true,
  },
  {
    id: 'plan_growth_01',
    code: 'growth',
    name: 'Growth Professional',
    price_paise: 999900,
    currency: 'INR',
    interval: 'MONTH',
    call_limit: 10000,
    overage_paise: 120,
    features: [
      'Includes everything in Starter',
      'Multilingual Speech AI (Hindi/Tamil/Eng)',
      'Predictive Deal Conversion Scoring',
      'Automated RCA & Coaching Rewrites',
      'Zero-Tolerance Auto-Fail Flags',
      'Priority Queue & 4h SLA Escalations',
    ],
    is_public: true,
    version: 1,
    active: true,
  },
  {
    id: 'plan_enterprise_01',
    code: 'enterprise',
    name: 'Enterprise Ultra',
    price_paise: 2499900,
    currency: 'INR',
    interval: 'MONTH',
    call_limit: 50000,
    overage_paise: 90,
    features: [
      'Includes everything in Growth',
      'Unlimited Custom SOP Rulesets',
      'Dedicated LLM Pipeline & Custom Audio Vault',
      'Two-Party Consent Auditing',
      'Custom CRM & Webhook Bidirectional Sync',
      'Dedicated Account Executive & ISO Lead Auditor',
      '99.99% Cloudflare Edge SLA Uptime',
    ],
    is_public: true,
    version: 1,
    active: true,
  },
];

const memorySubscriptions = new Map<string, Subscription>();
const memoryOrders = new Map<string, PaymentOrder>();
const memoryPayments = new Map<string, PaymentRecord>();
const memoryInvoices: InvoiceRecord[] = [];
let invoiceCounter = 1042;

// Seed default active subscription
memorySubscriptions.set('00000000-0000-0000-0000-000000000001', {
  id: 'sub_default_01',
  tenant_id: '00000000-0000-0000-0000-000000000001',
  plan_id: 'plan_growth_01',
  plan_code: 'growth',
  plan_name: 'Growth Professional',
  status: 'ACTIVE',
  current_period_start: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  current_period_end: new Date(Date.now() + 3600000 * 24 * 25).toISOString(),
  cancel_at_period_end: false,
  gateway: 'payu',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export class BillingService {
  static getPlans(onlyPublic = true): Plan[] {
    return onlyPublic ? memoryPlans.filter((p) => p.is_public && p.active) : [...memoryPlans];
  }

  static getPlanByCode(code: string): Plan | undefined {
    return memoryPlans.find((p) => p.code.toLowerCase() === code.toLowerCase());
  }

  static getGatewayConfigs(): { payu: GatewayConfig; razorpay: GatewayConfig } {
    return {
      payu: PayUGatewayService.getConfig(),
      razorpay: RazorpayGatewayService.getConfig(),
    };
  }

  static updateGatewayConfig(gateway: 'payu' | 'razorpay', updates: Partial<GatewayConfig>): GatewayConfig {
    if (gateway === 'payu') {
      return PayUGatewayService.updateConfig(updates);
    }
    return RazorpayGatewayService.updateConfig(updates);
  }

  /**
   * Initiate Checkout for either PayU or Razorpay
   */
  static async initiateCheckout(params: {
    tenantId: string;
    planCode: string;
    gateway: 'payu' | 'razorpay';
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<{
    success: boolean;
    gateway: 'payu' | 'razorpay';
    order: PaymentOrder;
    payuPayload?: any;
    razorpayPayload?: any;
    error?: string;
  }> {
    const plan = BillingService.getPlanByCode(params.planCode);
    if (!plan) {
      return { success: false, gateway: params.gateway, order: null as any, error: 'Invalid subscription plan code' };
    }

    const txnid = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const order: PaymentOrder = {
      id: `ord_${Date.now()}`,
      tenant_id: params.tenantId,
      plan_id: plan.id,
      txnid,
      amount_paise: plan.price_paise,
      currency: plan.currency,
      gateway: params.gateway,
      status: 'PENDING',
      udf: {
        plan_code: plan.code,
        plan_name: plan.name,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
      },
      created_at: new Date().toISOString(),
    };

    memoryOrders.set(txnid, order);

    try {
      await supabaseAdminClient.from('payment_orders').insert(order);
    } catch {}

    const amountRupees = (plan.price_paise / 100).toFixed(2);

    if (params.gateway === 'payu') {
      const hash = PayUGatewayService.generatePaymentHash({
        txnid,
        amount: amountRupees,
        productinfo: plan.name,
        firstname: params.customerName.split(' ')[0] || 'Customer',
        email: params.customerEmail,
        udf1: params.tenantId,
        udf2: order.id,
        udf3: plan.code,
      });

      return {
        success: true,
        gateway: 'payu',
        order,
        payuPayload: {
          actionUrl: PayUGatewayService.getPaymentUrl(),
          key: PayUGatewayService.getConfig().key_id,
          txnid,
          amount: amountRupees,
          productinfo: plan.name,
          firstname: params.customerName.split(' ')[0] || 'Customer',
          email: params.customerEmail,
          phone: params.customerPhone,
          surl: 'http://localhost:3000/api/v1/billing/payu/return',
          furl: 'http://localhost:3000/api/v1/billing/payu/return',
          hash,
          udf1: params.tenantId,
          udf2: order.id,
          udf3: plan.code,
        },
      };
    }

    // Razorpay Flow
    const rzpOrder = await RazorpayGatewayService.createOrder({
      amountPaise: plan.price_paise,
      currency: plan.currency,
      receipt: txnid,
      notes: {
        tenantId: params.tenantId,
        planCode: plan.code,
        planName: plan.name,
      },
    });

    return {
      success: true,
      gateway: 'razorpay',
      order,
      razorpayPayload: {
        key: RazorpayGatewayService.getConfig().key_id,
        orderId: rzpOrder.orderId,
        amount: plan.price_paise,
        currency: plan.currency,
        name: 'AuditAI Qalyzer',
        description: `${plan.name} Monthly Subscription`,
        prefill: {
          name: params.customerName,
          email: params.customerEmail,
          contact: params.customerPhone,
        },
        txnid,
      },
    };
  }

  /**
   * Server-verified payment activation state machine
   */
  static async activateSubscriptionFromPayment(params: {
    txnid: string;
    gateway: 'payu' | 'razorpay';
    gatewayPaymentId: string;
    amountPaidPaise: number;
    paymentMode?: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<{ success: boolean; subscription?: Subscription; invoice?: InvoiceRecord; error?: string }> {
    const order = memoryOrders.get(params.txnid);
    const tenantId = order?.tenant_id || '00000000-0000-0000-0000-000000000001';
    const plan: Plan = (order?.plan_id
      ? memoryPlans.find((p) => p.id === order.plan_id)
      : undefined) || memoryPlans[0]!;

    if (order) {
      order.status = 'PAID';
      memoryOrders.set(params.txnid, order);
    }

    // 1. Record payment row
    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      order_id: order?.id,
      tenant_id: tenantId,
      gateway: params.gateway,
      gateway_payment_id: params.gatewayPaymentId,
      status: 'SUCCESS',
      amount_paise: params.amountPaidPaise || plan.price_paise,
      mode: params.paymentMode || 'ONLINE',
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    memoryPayments.set(params.gatewayPaymentId, paymentRecord);

    // 2. Activate or extend subscription
    const currentPeriodStart = new Date().toISOString();
    const currentPeriodEnd = new Date(Date.now() + 30 * 86400000).toISOString();

    const subscription: Subscription = {
      id: `sub_${tenantId.substring(0, 8)}`,
      tenant_id: tenantId,
      plan_id: plan.id,
      plan_code: plan.code,
      plan_name: plan.name,
      status: 'ACTIVE',
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
      gateway: params.gateway,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memorySubscriptions.set(tenantId, subscription);

    // 3. Generate GST-compliant Tax Invoice
    invoiceCounter += 1;
    const subtotal = Math.round((paymentRecord.amount_paise / 1.18));
    const gst = paymentRecord.amount_paise - subtotal;
    const invoice: InvoiceRecord = {
      id: `inv_${Date.now()}`,
      tenant_id: tenantId,
      payment_id: paymentRecord.id,
      number: `INV-2026-${invoiceCounter}`,
      subtotal_paise: subtotal,
      gst_paise: gst,
      total_paise: paymentRecord.amount_paise,
      status: 'PAID',
      issued_at: new Date().toISOString(),
    };
    memoryInvoices.unshift(invoice);

    // 4. Send Automated Email Confirmation via Resend / Brevo
    const email = params.customerEmail || (order?.udf?.customer_email as string) || 'billing@acmetelephony.in';
    const name = params.customerName || (order?.udf?.customer_name as string) || 'Valued Partner';

    EmailService.sendPaymentReceiptEmail({
      to: email,
      userName: name,
      planName: plan.name,
      amountPaidINR: paymentRecord.amount_paise / 100,
      invoiceNumber: invoice.number,
      gateway: params.gateway,
      validUntil: new Date(currentPeriodEnd).toLocaleDateString(),
    }).catch(() => {});

    return { success: true, subscription, invoice };
  }

  static getSubscription(tenantId: string): Subscription | undefined {
    return memorySubscriptions.get(tenantId) || memorySubscriptions.get('00000000-0000-0000-0000-000000000001');
  }

  static getAllSubscriptions(): Subscription[] {
    return Array.from(memorySubscriptions.values());
  }

  static getInvoices(tenantId?: string): InvoiceRecord[] {
    return tenantId ? memoryInvoices.filter((i) => i.tenant_id === tenantId) : [...memoryInvoices];
  }

  static getAllPayments(): PaymentRecord[] {
    return Array.from(memoryPayments.values());
  }

  static async refundPayment(params: {
    paymentId: string;
    amountPaise?: number;
    reason?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const payment = Array.from(memoryPayments.values()).find(
      (p) => p.id === params.paymentId || p.gateway_payment_id === params.paymentId
    );

    if (!payment) {
      return { success: false, error: 'Payment record not found' };
    }

    if (payment.gateway === 'payu') {
      const res = await PayUGatewayService.refundPayment({
        mihpayid: payment.gateway_payment_id || payment.id,
        refundAmount: (params.amountPaise || payment.amount_paise) / 100,
      });
      if (res.success) {
        payment.status = 'REFUNDED';
        return { success: true };
      }
      return { success: false, error: res.error };
    }

    const res = await RazorpayGatewayService.refundPayment({
      paymentId: payment.gateway_payment_id || payment.id,
      amountPaise: params.amountPaise || payment.amount_paise,
    });
    if (res.success) {
      payment.status = 'REFUNDED';
      return { success: true };
    }
    return { success: false, error: res.error };
  }

  static extendSubscription(tenantId: string, daysToAdd: number): Subscription | undefined {
    const sub = memorySubscriptions.get(tenantId) || memorySubscriptions.get('00000000-0000-0000-0000-000000000001');
    if (!sub) return undefined;

    const currentEnd = new Date(sub.current_period_end).getTime();
    sub.current_period_end = new Date(currentEnd + daysToAdd * 86400000).toISOString();
    sub.status = 'ACTIVE';
    sub.updated_at = new Date().toISOString();
    return sub;
  }
}
