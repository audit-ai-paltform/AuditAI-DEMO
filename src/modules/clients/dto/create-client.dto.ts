import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  plan: z.enum(['starter', 'growth', 'enterprise']).default('starter'),
  call_limit: z.number().int().min(0).default(1000),
  razorpay_subscription_id: z.string().nullable().optional(),
});

export type CreateClientDto = z.infer<typeof createClientSchema>;
