import { z } from 'zod';

export const createAgentSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Agent code is required'),
  process: z.string().min(1, 'Process is required'),
  tenure_minutes: z.number().int().min(0).default(0),
  status: z.enum(['Active', 'Training', 'Inactive']).default('Active'),
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
