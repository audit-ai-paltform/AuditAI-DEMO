export interface TranscriptTurn {
  speaker: string;
  text: string;
  timestamp?: string;
  start?: number | null;
  end?: number | null;
}

export interface ParameterScoreItem {
  parameter_id: string;
  name?: string;
  score: number | string;
  weight?: number;
  status?: string;
  justification?: string;
  remarks?: string;
}

export interface CallEntity {
  id: string;
  client_id: string;
  agent_id: string | null;
  transcript: TranscriptTurn[];
  score: number | null;
  status: string;
  duration: string | null;
  caller_number: string | null;
  flags: Record<string, unknown>;
  parameter_scores: ParameterScoreItem[];
  recording_path: string | null;
  sop_version_id?: string | null;
  config_version?: number | null;
  latest_evaluation_run_id?: string | null;
  processing_metadata?: Record<string, unknown>;
  failure_reason?: string | null;
  correlation_id?: string | null;
  /** Derived read-only: process of the SOP version this call was audited under. */
  process?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CallListResult {
  calls: CallEntity[];
  total: number;
  page: number;
  limit: number;
}
