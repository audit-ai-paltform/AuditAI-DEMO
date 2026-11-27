import { Request, Response } from 'express';
import { audioProcessingQueue, AudioProcessingJobData } from '../../queues/call-pipeline.queue.js';
import { callRepository } from '../calls/calls.repository.js';
import { recordProcessingEvent } from '../calls/processing-events.js';
import { logger } from '../../core/config/logger.config.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { webhookPayloadSchema } from './webhook.schema.js';
import { constantTimeSecretMatch } from '../../common/security/webhook-auth.js';
import { assertSafeRecordingUrl } from '../../common/security/recording-url.js';

dotenv.config();

export class WebhookController {
  /**
   * Cloud Telephony / Knowlarity / Postman Webhook Endpoint (POST /api/call-complete)
   *
   * Contract: validate → authenticate → idempotency check → persist
   * webhook event → create call → enqueue → respond 200 immediately.
   * No transcription or scoring happens synchronously.
   */
  static async handleCallComplete(req: Request, res: Response): Promise<void> {
    const webhookSecret = process.env.KNOWLARITY_WEBHOOK_SECRET;
    const authHeader = (req.headers['x-knowlarity-secret'] as string | undefined) ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined) ||
      (req.query.secret as string | undefined) ||
      (req.query.token as string | undefined);

    const isProduction = process.env.NODE_ENV === 'production';
    const developmentTest = !isProduction
      && constantTimeSecretMatch(req.headers['x-auditai-test-secret'] as string | undefined, process.env.DEV_WEBHOOK_TEST_SECRET);

    if (!developmentTest && !constantTimeSecretMatch(authHeader, webhookSecret)) {
      logger.warn('[WebhookController] Unauthorized webhook payload signature');
      res.status(401).json({ error: 'Unauthorized webhook signature' });
      return;
    }

    // 1. Schema validation (replaces the previous ad-hoc checks)
    const parsed = webhookPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      const summary = issues.map((i) => `${i.path}: ${i.message}`).join('; ');
      logger.warn({ issues }, '[WebhookController] Rejected webhook payload');
      res.status(400).json({
        error: `Invalid webhook payload — ${summary}`,
        details: issues,
      });
      return;
    }
    const body = parsed.data;

    const approvedHosts = (process.env.KNOWLARITY_RECORDING_HOSTS || '').split(',').map((host) => host.trim().toLowerCase()).filter(Boolean);
    try {
      await assertSafeRecordingUrl(body.recording_url, approvedHosts);
    } catch (error) {
      logger.warn({ reason: error instanceof Error ? error.message : 'unsafe recording URL' }, '[WebhookController] Rejected unsafe recording URL');
      res.status(400).json({ error: 'Invalid recording URL' });
      return;
    }

    // The tenant mapping is established from the server-side agent mapping,
    // never accepted from a webhook payload. Check both code and id.
    const { data: agentByCode } = await supabaseAdminClient
      .from('agents').select('client_id, code').eq('code', body.agent_id).maybeSingle();
    const { data: agentById } = !agentByCode
      ? await supabaseAdminClient.from('agents').select('client_id, code').eq('id', body.agent_id).maybeSingle()
      : { data: null };

    const agent = agentByCode || agentById;
    if (!agent?.client_id || (body.client_id && body.client_id !== agent.client_id)) {
      logger.warn({ agentId: body.agent_id }, '[WebhookController] Rejected webhook with unmapped tenant/agent');
      res.status(403).json({ error: 'Webhook agent is not authorized for a tenant' });
      return;
    }
    const clientId = agent.client_id;
    const correlationId = (req.headers['x-request-id'] as string) || uuidv4();

    // 2. Idempotency — provider event key (or call_id) is unique per provider.
    //    Duplicate deliveries return the original result, never re-enqueue.
    const eventKey = body.event_id || body.call_id || `${body.agent_id}:${body.recording_url}`;
    try {
      const { data: existingEvent } = await supabaseAdminClient
        .from('webhook_events')
        .select('id, call_id')
        .eq('provider', 'knowlarity')
        .eq('event_key', eventKey)
        .maybeSingle();

      if (existingEvent) {
        logger.info({ eventKey, callId: existingEvent.call_id, correlationId }, '[WebhookController] Duplicate webhook delivery — returning original result');
        res.status(200).json({
          status: 'received',
          call_id: existingEvent.call_id,
          duplicate: true,
          message: 'Webhook already processed (idempotent)',
        });
        return;
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, '[WebhookController] Idempotency check notice — continuing');
    }

    // Tracks the row created in this request so the catch can compensate
    // (delete the orphan) if enqueue fails — otherwise the idempotency ledger
    // would permanently mark this event "processed" and block every retry.
    let createdCallId: string | null = null;

    try {
      // 3. Create call record with status RECEIVED
      const createdCall = await callRepository.create({
        client_id: clientId,
        agent_id: body.agent_id,
        transcript: [],
        status: 'RECEIVED',
        duration: body.duration || null,
        caller_number: body.caller_number || null,
        flags: { recording_url: body.recording_url },
        parameter_scores: [],
        recording_path: body.recording_url,
      });
      const callId = createdCall.id;
      createdCallId = callId;

      // Pin the effective temporary-data deadline at ingest. Later policy edits
      // affect new calls without silently shortening existing retention.
      const { data: retentionPolicy } = await supabaseAdminClient
        .from('tenant_retention_policies')
        .select('temporary_data_days')
        .eq('tenant_id', clientId)
        .maybeSingle();
      const deleteAt = new Date(Date.now() + (retentionPolicy?.temporary_data_days ?? 1) * 86_400_000).toISOString();
      await supabaseAdminClient.from('calls').update({ temporary_data_delete_at: deleteAt }).eq('id', callId).eq('client_id', clientId);

      // 4. Persist the webhook audit log (idempotency ledger)
      try {
        await supabaseAdminClient.from('webhook_events').insert({
          provider: 'knowlarity',
          event_key: eventKey,
          call_id: callId,
          client_id: clientId,
          payload: body as Record<string, unknown>,
        });
      } catch (err: any) {
        // 23505 race: a concurrent duplicate delivery won the insert
        if (err.code === '23505' || err.message?.includes('duplicate')) {
          logger.warn({ eventKey }, '[WebhookController] Concurrent duplicate webhook — discarding this delivery');
          res.status(200).json({ status: 'received', duplicate: true, message: 'Webhook already processed (idempotent)' });
          return;
        }
        logger.warn({ err: err.message }, '[WebhookController] Webhook audit log notice');
      }

      // 5. Enqueue BullMQ Audio Processing job with a STABLE job id —
      //    re-delivery or retries can never create duplicate audits.
      const jobData: AudioProcessingJobData = {
        call_id: callId,
        client_id: clientId,
        agent_id: body.agent_id,
        recording_url: body.recording_url,
        caller_number: body.caller_number,
        duration: body.duration,
        timestamp: body.timestamp || new Date().toISOString(),
        correlation_id: correlationId,
      };
      await audioProcessingQueue.add(`audio-processing-job:${callId}`, jobData, {
        // Stable, deterministic job id → BullMQ dedups redeliveries/retries.
        // NOTE: BullMQ v5 forbids ':' in custom job ids (it is the internal
        // Redis key delimiter), so the stage prefix is hyphen-separated.
        jobId: `audio-${callId}`,
      });

      await callRepository.update(callId, { status: 'QUEUED' });
      await recordProcessingEvent({
        tenant_id: clientId,
        call_id: callId,
        event_type: 'CALL_RECEIVED',
        detail: { agent_id: body.agent_id, event_key: eventKey },
        correlation_id: correlationId,
      });

      logger.info({ callId, correlationId, eventKey }, '[WebhookController] Call received, status QUEUED, BullMQ job added');

      // 6. Immediate 200 HTTP response
      res.status(200).json({
        status: 'received',
        call_id: callId,
        agent_id: body.agent_id,
        pipeline_status: 'QUEUED',
        correlation_id: correlationId,
        message: 'Call complete webhook accepted and queued for background processing',
      });
    } catch (err: any) {
      logger.error({ err: err.message, correlationId }, '[WebhookController] Error processing webhook request');

      // Compensation: if we created a call / ledger row but failed before the
      // job was safely enqueued, remove them so the delivery can be retried.
      // Without this the webhook_events ledger would report "already processed"
      // and the call would be stranded in RECEIVED forever.
      try {
        await supabaseAdminClient.from('webhook_events')
          .delete()
          .eq('provider', 'knowlarity')
          .eq('event_key', eventKey);
        if (createdCallId) {
          await supabaseAdminClient.from('calls').delete().eq('id', createdCallId);
        }
      } catch (cleanupErr: any) {
        logger.warn({ err: cleanupErr.message, correlationId }, '[WebhookController] Compensation cleanup notice');
      }

      res.status(500).json({ error: 'Failed to process incoming webhook' });
    }
  }

  /**
   * GET /api/v1/webhook/knowlarity/status
   * Provides client-facing Knowlarity integration verification:
   * webhook URL, configured secret status, last event time, mapped agents.
   */
  static async getIntegrationStatus(req: Request, res: Response): Promise<void> {
    const tenantId =
      (res.locals.tenantId as string) ||
      (req.query.tenant_id as string) ||
      (req.headers['x-tenant-id'] as string);

    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context is required' });
      return;
    }

    try {
      const [eventsResult, agentsResult] = await Promise.all([
        supabaseAdminClient
          .from('webhook_events')
          .select('id, received_at, event_key, call_id')
          .eq('client_id', tenantId)
          .eq('provider', 'knowlarity')
          .order('received_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdminClient
          .from('agents')
          .select('id, code, name', { count: 'exact' })
          .eq('client_id', tenantId),
      ]);

      const lastEvent = eventsResult.data;
      const mappedAgents = (agentsResult.data || []) as Array<{ id: string; code: string; name: string }>;
      const isConfigured = mappedAgents.length > 0 && Boolean(process.env.KNOWLARITY_WEBHOOK_SECRET);

      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const webhookUrl = `${protocol}://${host}/api/v1/webhook/call-complete`;

      res.status(200).json({
        success: true,
        data: {
          provider: 'knowlarity',
          is_configured: isConfigured,
          webhook_url: webhookUrl,
          webhook_path: '/api/v1/webhook/call-complete',
          secret_header: 'x-knowlarity-secret',
          last_event_at: lastEvent?.received_at || null,
          last_call_id: lastEvent?.call_id || null,
          mapped_agents_count: agentsResult.count || mappedAgents.length,
          mapped_agents: mappedAgents.slice(0, 10).map((a) => ({ code: a.code, name: a.name })),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to check Knowlarity status' });
    }
  }
}
