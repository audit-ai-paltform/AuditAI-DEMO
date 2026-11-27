import { z } from 'zod';

/**
 * Knowlarity / cloud telephony webhook payload contract.
 * Kept in its own module so tests can validate the schema without
 * loading BullMQ / Supabase connections.
 */
export const webhookPayloadSchema = z.object({
  recording_url: z.string().url(),
  agent_id: z.string().min(1),
  caller_number: z.string().optional(),
  duration: z.string().optional(),
  timestamp: z.string().optional(),
  client_id: z.string().uuid().optional(),
  /** Provider-unique event/call identifier for idempotency */
  event_id: z.string().optional(),
  call_id: z.string().uuid().optional(),
});

export type WebhookPayload = z.infer<typeof webhookPayloadSchema>;
