import { z } from 'zod';
import { transcriptTurnSchema, parameterScoreItemSchema } from './create-call.dto.js';

export const updateCallSchema = z.object({
  agent_id: z.string().nullable().optional(),
  transcript: z.array(transcriptTurnSchema).optional(),
  score: z.number().min(0).max(100).nullable().optional(),
  status: z.string().optional(),
  duration: z.string().nullable().optional(),
  caller_number: z.string().nullable().optional(),
  flags: z.record(z.unknown()).optional(),
  parameter_scores: z.array(parameterScoreItemSchema).optional(),
  recording_path: z.string().nullable().optional(),
  // Pipeline traceability & metadata (migration 007)
  sop_version_id: z.string().uuid().nullable().optional(),
  config_version: z.number().int().nullable().optional(),
  latest_evaluation_run_id: z.string().uuid().nullable().optional(),
  processing_metadata: z.record(z.unknown()).optional(),
  failure_reason: z.string().nullable().optional(),
  correlation_id: z.string().nullable().optional(),
});

export type UpdateCallDto = z.infer<typeof updateCallSchema>;
