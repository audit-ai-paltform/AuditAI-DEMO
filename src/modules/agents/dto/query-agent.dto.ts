import { z } from 'zod';

export const queryAgentSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format').optional(),
  code: z.string().optional(),
  status: z.enum(['Active', 'Training', 'Inactive']).optional(),
  process: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
  search: z.string().optional(),
});

export const agentIdParamSchema = z.object({
  id: z.string().uuid('Invalid agent ID format'),
});

export type QueryAgentDto = z.infer<typeof queryAgentSchema>;
