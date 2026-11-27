export type ClientPlan = 'starter' | 'growth' | 'enterprise';

export interface ClientEntity {
  id: string;
  name: string;
  email: string;
  plan: ClientPlan;
  call_limit: number;
  razorpay_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListResult {
  clients: ClientEntity[];
  total: number;
  page: number;
  limit: number;
}
