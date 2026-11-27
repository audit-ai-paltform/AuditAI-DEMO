export interface Plan {
  id: string;
  code: string;
  name: string;
  price_paise: number;
  currency: string;
  interval: 'MONTH' | 'YEAR';
  call_limit: number;
  overage_paise: number;
  features: string[];
  is_public: boolean;
  version: number;
  active: boolean;
}

export type SubscriptionStatus =
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'TRIALING'
  | 'PAST_DUE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUSPENDED'
  | 'REFUNDED';

export type PaymentGateway = 'payu' | 'razorpay';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan_code?: string;
  plan_name?: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  grace_until?: string | null;
  gateway: PaymentGateway;
  gateway_subscription_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrder {
  id: string;
  tenant_id: string;
  plan_id: string;
  subscription_id?: string | null;
  txnid: string;
  amount_paise: number;
  currency: string;
  gateway: PaymentGateway;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  udf?: Record<string, any>;
  created_by?: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id?: string;
  tenant_id: string;
  gateway: PaymentGateway;
  gateway_payment_id?: string;
  status: 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
  amount_paise: number;
  mode?: string;
  bank_ref_num?: string;
  error_message?: string;
  verified_at?: string;
  created_at: string;
}

export interface InvoiceRecord {
  id: string;
  tenant_id: string;
  payment_id?: string;
  number: string;
  subtotal_paise: number;
  gst_paise: number;
  total_paise: number;
  pdf_key?: string;
  status: string;
  issued_at: string;
}

export interface GatewayConfig {
  id: string;
  gateway: PaymentGateway;
  key_id: string;
  key_secret: string;
  is_test_mode: boolean;
  is_active: boolean;
  webhook_secret?: string;
}
