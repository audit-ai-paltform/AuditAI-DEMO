import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';

export interface ProcessingEventDto {
  tenant_id: string;
  call_id: string;
  event_type: string;
  status?: 'STARTED' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  detail?: Record<string, unknown>;
  correlation_id?: string | null;
}

/**
 * Essential audit events that represent critical milestone or failure records.
 * Ephemeral intermediate steps (e.g. *_STARTED) are filtered to avoid high-volume DB bloat.
 */
const ESSENTIAL_AUDIT_EVENTS = new Set<string>([
  'CALL_RECEIVED',
  'TRANSCRIPTION_COMPLETED',
  'SCORING_COMPLETED',
  'FLAG_ANALYSIS_COMPLETED',
  'CALL_PROCESSING_FAILED',
  'TRANSCRIPTION_FAILED',
  'SCORING_FAILED',
  'FLAG_ANALYSIS_FAILED',
  'RECORDING_STORED',
  'AUDIT_ALERT_TRIGGERED',
  'COMPLIANCE_VIOLATION_DETECTED',
]);

// In-memory LRU-like debounce set to eliminate duplicate event writes within short windows
const recentEventKeys = new Set<string>();
const MAX_DEBOUNCE_SIZE = 5000;

/**
 * Persists a call_processing_events row for enterprise audit trail.
 * Avoids storing excessive low-value events for every internal processing step.
 * Deduplicates and keeps only essential milestones and final failures.
 */
export async function recordProcessingEvent(dto: ProcessingEventDto): Promise<void> {
  const status = dto.status ?? 'COMPLETED';

  // Only keep essential audit milestones or any failure events
  const isEssential = ESSENTIAL_AUDIT_EVENTS.has(dto.event_type) || status === 'FAILED';
  if (!isEssential) {
    logger.debug({ call_id: dto.call_id, event_type: dto.event_type, status }, '[ProcessingEvents] Skipping low-value internal event from DB');
    return;
  }

  // Deduplicate identical events for the same call
  const eventKey = `${dto.call_id}:${dto.event_type}:${status}`;
  if (recentEventKeys.has(eventKey)) {
    logger.debug({ eventKey }, '[ProcessingEvents] Skipping duplicate event insertion');
    return;
  }

  recentEventKeys.add(eventKey);
  if (recentEventKeys.size > MAX_DEBOUNCE_SIZE) {
    // Clear half when full
    const iter = recentEventKeys.values();
    for (let i = 0; i < 1000; i++) {
      const next = iter.next();
      if (next.done) break;
      recentEventKeys.delete(next.value);
    }
  }

  try {
    const { error } = await supabaseAdminClient.from('call_processing_events').insert({
      tenant_id: dto.tenant_id,
      call_id: dto.call_id,
      event_type: dto.event_type,
      status,
      detail: dto.detail ?? {},
      correlation_id: dto.correlation_id ?? null,
    });
    if (error) {
      logger.warn({ err: error.message, call_id: dto.call_id, event: dto.event_type }, '[ProcessingEvents] Insert notice');
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, '[ProcessingEvents] Insert exception notice');
  }
}

/** Read the full processing timeline for a call (Audit Trail UI). */
export async function getProcessingEvents(tenantId: string, callId: string) {
  const { data, error } = await supabaseAdminClient
    .from('call_processing_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('call_id', callId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Processing events lookup failed: ${error.message}`);
  return data || [];
}

/**
 * Tenant-wide timeline of real backend events for the Audit Trail screen.
 * Only events the workers actually wrote are returned — the UI renders
 * nothing that was not persisted.
 */
export async function getRecentProcessingEvents(tenantId: string, limit = 100) {
  const { data, error } = await supabaseAdminClient
    .from('call_processing_events')
    .select('id, call_id, event_type, status, detail, correlation_id, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Processing events lookup failed: ${error.message}`);
  return data || [];
}
