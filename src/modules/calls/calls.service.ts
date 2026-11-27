import { ICallRepository } from './interfaces/call-repository.interface.js';
import { callRepository } from './calls.repository.js';
import { CallEntity, CallListResult } from './calls.types.js';
import { CreateCallDto } from './dto/create-call.dto.js';
import { UpdateCallDto } from './dto/update-call.dto.js';
import { QueryCallDto } from './dto/query-call.dto.js';
import { NotFoundException } from '../../core/exceptions/not-found.exception.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';

export class CallService {
  constructor(private readonly repo: ICallRepository = callRepository) {}

  public async createCall(dto: CreateCallDto): Promise<CallEntity> {
    return this.repo.create(dto);
  }

  public async getCallById(id: string): Promise<CallEntity> {
    const call = await this.repo.findById(id);
    if (!call) {
      throw new NotFoundException(`Call with ID '${id}' not found`);
    }
    return call;
  }

  public async listCalls(query: QueryCallDto): Promise<CallListResult> {
    const result = await this.repo.findAll(query);
    return { ...result, calls: await this.attachProcess(result.calls) };
  }

  /**
   * Attaches the SOP process each call was audited under. Calls pin their
   * sop_version_id at scoring time, so this is historical fact about the
   * audit — not the tenant's current configuration.
   */
  private async attachProcess(calls: CallEntity[]): Promise<CallEntity[]> {
    const versionIds = Array.from(
      new Set(calls.map((c) => c.sop_version_id).filter((id): id is string => Boolean(id)))
    );
    if (versionIds.length === 0) return calls;

    const { data, error } = await supabaseAdminClient
      .from('sop_versions')
      .select('id, process')
      .in('id', versionIds);

    if (error) {
      // Never fabricate a process — leave it null and let the UI show "—".
      return calls;
    }

    const processByVersion = new Map(
      (data || []).map((v) => [(v as { id: string }).id, (v as { process: string }).process])
    );
    return calls.map((c) => ({
      ...c,
      process: c.sop_version_id ? processByVersion.get(c.sop_version_id) ?? null : null,
    }));
  }

  public async updateCall(id: string, dto: UpdateCallDto): Promise<CallEntity> {
    await this.getCallById(id);
    return this.repo.update(id, dto);
  }

  public async deleteCall(id: string): Promise<void> {
    await this.getCallById(id);
    await this.repo.delete(id);
  }

  public async requestReEvaluation(
    callId: string,
    tenantId: string,
    options: { reason: string; triggeredBy?: string; retranscribe?: boolean },
  ): Promise<{ message: string; run_id: string; run_number: number }> {
    const call = await this.getCallById(callId);
    if (call.client_id !== tenantId) {
      throw new NotFoundException(`Call with ID '${callId}' not found`);
    }

    if (!options.reason || options.reason.trim().length < 3) {
      throw new Error('A specific reason is required for re-evaluation (at least 3 characters)');
    }

    // Prevent duplicate concurrent re-evaluations
    const { data: activeRuns } = await supabaseAdminClient
      .from('call_evaluation_runs')
      .select('id, status, run_number')
      .eq('call_id', callId)
      .in('status', ['IN_PROGRESS', 'PENDING']);

    if (activeRuns && activeRuns.length > 0) {
      const active = activeRuns[0] as { run_number: number };
      throw new Error(`A re-evaluation is already in progress for this call (Run #${active.run_number})`);
    }

    // Count existing runs
    const { data: existingRuns } = await supabaseAdminClient
      .from('call_evaluation_runs')
      .select('id, run_number')
      .eq('call_id', callId)
      .order('run_number', { ascending: true });

    let runNumber = (existingRuns?.length || 0) + 1;

    // Baseline preservation: if no previous evaluation run was recorded,
    // save the current evaluation as Run #1 so original scores are never lost.
    if (!existingRuns || existingRuns.length === 0) {
      await supabaseAdminClient.from('call_evaluation_runs').insert({
        call_id: callId,
        tenant_id: tenantId,
        run_number: 1,
        triggered_by: 'INITIAL_INGEST',
        trigger_reason: 'Original evaluation baseline',
        sop_version_id: call.sop_version_id || null,
        config_version: (call as any).config_version || null,
        score: call.score,
        parameter_scores: call.parameter_scores || [],
        flags_snapshot: call.flags || {},
        status: call.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        created_at: call.created_at || new Date().toISOString(),
        completed_at: call.created_at || new Date().toISOString(),
      });
      runNumber = 2;
    }

    // Insert new run with IN_PROGRESS status
    const { data: newRun, error: createRunErr } = await supabaseAdminClient
      .from('call_evaluation_runs')
      .insert({
        call_id: callId,
        tenant_id: tenantId,
        run_number: runNumber,
        triggered_by: options.triggeredBy || 'MANAGER',
        trigger_reason: options.reason.trim(),
        sop_version_id: call.sop_version_id || null,
        config_version: (call as any).config_version || null,
        retranscribed: Boolean(options.retranscribe),
        status: 'IN_PROGRESS',
      })
      .select('*')
      .single();

    if (createRunErr || !newRun) {
      throw new Error(`Failed to create re-evaluation run: ${createRunErr?.message || 'Database error'}`);
    }

    const { v4: uuidv4 } = await import('uuid');
    const { recordProcessingEvent } = await import('./processing-events.js');
    const { audioProcessingQueue, aiEvaluationQueue } = await import('../../queues/call-pipeline.queue.js');

    const correlationId = uuidv4();
    await recordProcessingEvent({
      tenant_id: tenantId,
      call_id: callId,
      event_type: 'REEVALUATION_REQUESTED',
      status: 'STARTED',
      detail: {
        run_id: newRun.id,
        run_number: runNumber,
        reason: options.reason,
        retranscribe: Boolean(options.retranscribe),
      },
      correlation_id: correlationId,
    });

    if (options.retranscribe) {
      const recordingUrl = call.recording_path || (call.flags as any)?.recording_url;
      if (!recordingUrl) {
        throw new Error('Call has no recording URL available for re-transcription');
      }
      await audioProcessingQueue.add(
        `audio-processing-reeval:${callId}`,
        {
          call_id: callId,
          client_id: tenantId,
          agent_id: call.agent_id || undefined,
          recording_url: recordingUrl,
          correlation_id: correlationId,
          evaluation_run_id: newRun.id,
          is_reevaluation: true,
        },
        { jobId: `audio-reeval-${callId}-${newRun.id}` },
      );
      await this.repo.update(callId, { status: 'DOWNLOADING' });
    } else {
      await aiEvaluationQueue.add(
        `ai-evaluation-reeval:${callId}`,
        {
          call_id: callId,
          client_id: tenantId,
          agent_id: call.agent_id || undefined,
          correlation_id: correlationId,
          evaluation_run_id: newRun.id,
          is_reevaluation: true,
          trigger_reason: options.reason,
          triggered_by: options.triggeredBy || 'MANAGER',
        },
        { jobId: `ai-reeval-${callId}-${newRun.id}` },
      );
      await this.repo.update(callId, { status: 'AI_SCORING' });
    }

    return {
      message: `Re-evaluation Run #${runNumber} queued successfully`,
      run_id: newRun.id,
      run_number: runNumber,
    };
  }

  public async listEvaluations(callId: string, tenantId: string): Promise<any[]> {
    const call = await this.getCallById(callId);
    if (call.client_id !== tenantId) {
      throw new NotFoundException(`Call with ID '${callId}' not found`);
    }

    const { data, error } = await supabaseAdminClient
      .from('call_evaluation_runs')
      .select('*')
      .eq('call_id', callId)
      .eq('tenant_id', tenantId)
      .order('run_number', { ascending: false });

    if (error) {
      throw new Error(`Failed to list evaluation runs: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [
        {
          id: 'initial',
          call_id: callId,
          tenant_id: tenantId,
          run_number: 1,
          triggered_by: 'INITIAL_INGEST',
          trigger_reason: 'Original audit evaluation',
          score: call.score,
          parameter_scores: call.parameter_scores || [],
          flags_snapshot: call.flags || {},
          status: call.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
          retranscribed: false,
          created_at: call.created_at,
          completed_at: call.created_at,
        },
      ];
    }

    return data;
  }
}

export const callService = new CallService();
