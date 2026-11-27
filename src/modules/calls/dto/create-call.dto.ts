import { z } from 'zod';

export const transcriptTurnSchema = z.object({
  speaker: z.string(),
  text: z.string(),
  timestamp: z.string().optional(),
  // Precise timing (ms) from AssemblyAI — used for flag evidence pointers
  start: z.number().nullable().optional(),
  end: z.number().nullable().optional(),
});

export const parameterScoreItemSchema = z.object({
  parameter_id: z.string(),
  name: z.string().optional(),
  // 'N/A' is stored for NOT_APPLICABLE parameters (excluded from weighted score)
  score: z.union([z.number().min(0).max(100), z.literal('N/A')]),
  weight: z.number().optional(),
  justification: z.string().optional(),
});

export const createCallSchema = z.object({
  client_id: z.string().uuid('Invalid client ID format'),
  agent_id: z.string().nullable().optional(),
  transcript: z.array(transcriptTurnSchema).default([]),
  score: z.number().min(0).max(100).nullable().optional(),
  status: z.string().default('RECEIVED'),
  duration: z.string().nullable().optional(),
  caller_number: z.string().nullable().optional(),
  flags: z.record(z.unknown()).default({}),
  parameter_scores: z.array(parameterScoreItemSchema).default([]),
  recording_path: z.string().nullable().optional(),
  correlation_id: z.string().nullable().optional(),
});

export type CreateCallDto = z.infer<typeof createCallSchema>;
