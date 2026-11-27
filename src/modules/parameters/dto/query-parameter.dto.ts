import { z } from 'zod';

export const queryParameterSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format').optional(),
  enabled: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
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

export const parameterIdParamSchema = z.object({
  id: z.string().uuid('Invalid parameter ID format'),
});

export type QueryParameterDto = z.infer<typeof queryParameterSchema>;
