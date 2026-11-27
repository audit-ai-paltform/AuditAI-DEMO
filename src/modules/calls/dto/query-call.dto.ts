import { z } from 'zod';

export const queryCallSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format').optional(),
  agent_id: z.string().optional(),
  status: z.string().optional(),
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

export const callIdParamSchema = z.object({
  id: z.string().uuid('Invalid call ID format'),
});

export type QueryCallDto = z.infer<typeof queryCallSchema>;
