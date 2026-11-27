import { z } from 'zod';

export const queryScriptSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format').optional(),
  process: z.string().optional(),
  language: z.string().optional(),
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

export const scriptIdParamSchema = z.object({
  id: z.string().uuid('Invalid script ID format'),
});

export type QueryScriptDto = z.infer<typeof queryScriptSchema>;
