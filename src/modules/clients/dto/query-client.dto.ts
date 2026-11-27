import { z } from 'zod';

export const queryClientSchema = z.object({
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

export const clientIdParamSchema = z.object({
  id: z.string().uuid('Invalid client ID format'),
});

export type QueryClientDto = z.infer<typeof queryClientSchema>;
