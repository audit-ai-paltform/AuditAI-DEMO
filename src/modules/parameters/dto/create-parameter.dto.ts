import { z } from 'zod';

export const createParameterSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  name: z.string().min(1, 'Parameter name is required'),
  weight: z.number().int().min(0).max(100).default(10),
  enabled: z.boolean().default(true),
  ai_suggested: z.boolean().default(false),
});

export type CreateParameterDto = z.infer<typeof createParameterSchema>;
