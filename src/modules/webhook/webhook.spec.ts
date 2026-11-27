import { describe, it, expect } from 'vitest';
import { webhookPayloadSchema } from './webhook.schema.js';

/**
 * Webhook validation + idempotency contract tests.
 *
 * The controller imports BullMQ queues / Supabase at module load; those
 * are integration concerns. Here we verify the Zod schema contract that
 * gates every request, which is the security-relevant surface.
 */
describe('Webhook payload validation', () => {
  const validPayload = {
    recording_url: 'https://example.com/recording.mp3',
    agent_id: 'EMP001',
    caller_number: '+91-9876543210',
    duration: '03:09',
  };

  it('accepts a valid Knowlarity payload', () => {
    const result = webhookPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects a missing recording_url', () => {
    const { recording_url: _omit, ...noUrl } = validPayload;
    const result = webhookPayloadSchema.safeParse(noUrl);
    expect(result.success).toBe(false);
  });

  it('rejects an invalid recording_url (not a URL)', () => {
    const result = webhookPayloadSchema.safeParse({ ...validPayload, recording_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing agent_id', () => {
    const { agent_id: _omit, ...noAgent } = validPayload;
    const result = webhookPayloadSchema.safeParse(noAgent);
    expect(result.success).toBe(false);
  });

  it('rejects an empty agent_id', () => {
    const result = webhookPayloadSchema.safeParse({ ...validPayload, agent_id: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional event_id and call_id for idempotency', () => {
    const result = webhookPayloadSchema.safeParse({
      ...validPayload,
      event_id: 'knowlarity-evt-12345',
      call_id: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid call_id', () => {
    const result = webhookPayloadSchema.safeParse({ ...validPayload, call_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid client_id (tenant spoofing guard)', () => {
    const result = webhookPayloadSchema.safeParse({ ...validPayload, client_id: 'evil-tenant' });
    expect(result.success).toBe(false);
  });

  it('defaults are never fabricated: no recording_url means rejection, not a demo file', () => {
    const result = webhookPayloadSchema.safeParse({ agent_id: 'EMP001' });
    expect(result.success).toBe(false);
  });
});
