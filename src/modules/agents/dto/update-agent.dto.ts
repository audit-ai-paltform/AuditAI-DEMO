import { z } from 'zod';

export const updateAgentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  code: z.string().min(1, 'Agent code is required').optional(),
  process: z.string().min(1, 'Process is required').optional(),
  tenure_minutes: z.number().int().min(0).optional(),
  status: z.enum(['Active', 'Training', 'Inactive']).optional(),
});

export type UpdateAgentDto = z.infer<typeof updateAgentSchema>;
