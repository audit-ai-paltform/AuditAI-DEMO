import { z } from 'zod';

export const updateClientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address format').optional(),
  plan: z.enum(['starter', 'growth', 'enterprise']).optional(),
  call_limit: z.number().int().min(0).optional(),
  razorpay_subscription_id: z.string().nullable().optional(),
});

export type UpdateClientDto = z.infer<typeof updateClientSchema>;
