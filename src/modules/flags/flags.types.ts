import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Flag taxonomy — owned by the backend, never hardcoded in frontend  */
/* ------------------------------------------------------------------ */

export const FLAG_TYPES = [
  'INFORMATION_MISMATCH',
  'CUSTOMER_INTENT_MISUNDERSTANDING',
  'AGENT_MISINFORMATION',
  'POLICY_MISMATCH',
  'PRODUCT_INFORMATION_ERROR',
  'PRICING_ERROR',
  'COMPLIANCE_VIOLATION',
  'MANDATORY_DISCLOSURE_MISSED',
  'MEDICAL_INFORMATION_RISK',
  'WRONG_MEDICATION_INFORMATION',
  'WRONG_DOSAGE_INFORMATION',
  'TRANSCRIPTION_AMBIGUITY',
  'CUSTOMER_FACT_MISUNDERSTOOD',
  'PROCESS_ERROR',
  'OTHER',
] as const;

export const FLAG_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

export const FLAG_STATUSES = [
  'DETECTED',
  'OPEN',
  'UNDER_REVIEW',
  'CONFIRMED',
  'DISMISSED',
  'ESCALATED',
] as const;

export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'] as const;

export const FLAG_SOURCES = ['RULE', 'AI_VERIFIED', 'AI_ONLY', 'MANUAL'] as const;

export const RESOLUTION_TYPES = [
  'CONFIRMED_ISSUE',
  'FALSE_POSITIVE',
  'TRANSCRIPTION_ISSUE',
  'ESCALATED',
  'OTHER',
] as const;

export type FlagType = (typeof FLAG_TYPES)[number];
export type FlagSeverity = (typeof FLAG_SEVERITIES)[number];
export type FlagStatus = (typeof FLAG_STATUSES)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];
export type FlagSource = (typeof FLAG_SOURCES)[number];
export type ResolutionType = (typeof RESOLUTION_TYPES)[number];

/** Map a numeric confidence (0-1) to a level. Low confidence never becomes a critical alert. */
export function classifyConfidence(confidence: number): ConfidenceLevel {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.6) return 'MEDIUM';
  return 'LOW';
}

/**
 * Severity guard: a LOW-confidence AI finding must not surface as a
 * manager-facing CRITICAL/HIGH alert. It is downgraded to MEDIUM at most
 * (visible in the call audit, QA review — not an immediate alert).
 */
export function applyConfidenceGuard(severity: FlagSeverity, confidenceLevel: ConfidenceLevel): FlagSeverity {
  if (confidenceLevel === 'LOW' && (severity === 'CRITICAL' || severity === 'HIGH')) {
    return 'MEDIUM';
  }
  return severity;
}

export const requiresManagerAttention = (severity: FlagSeverity, confidenceLevel: ConfidenceLevel): boolean =>
  (severity === 'CRITICAL' || severity === 'HIGH') && confidenceLevel !== 'LOW';

/* ------------------------------------------------------------------ */
/* Entities                                                           */
/* ------------------------------------------------------------------ */

export interface FlagEntity {
  id: string;
  tenant_id: string;
  call_id: string;
  agent_id: string | null;
  flag_type: FlagType;
  category: string;
  severity: FlagSeverity;
  status: FlagStatus;
  confidence: number;
  confidence_level: ConfidenceLevel;
  title: string;
  description: string;
  customer_statement: string | null;
  agent_statement: string | null;
  expected_information: string | null;
  actual_information: string | null;
  evidence: string | null;
  evidence_start_time: number | null;
  evidence_end_time: number | null;
  transcript_segment_id: string | null;
  parameter_id: string | null;
  sop_version_id: string | null;
  source: FlagSource;
  ai_reasoning: string | null;
  recommended_action: string | null;
  requires_manager_attention: boolean;
  dedup_key: string | null;
  resolution_type: ResolutionType | null;
  resolution_note: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlagListResult {
  flags: FlagEntity[];
  total: number;
  page: number;
  limit: number;
}

export interface FlagCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  open: number;
  confirmed: number;
  dismissed: number;
  escalated: number;
  total: number;
}

/* ------------------------------------------------------------------ */
/* Zod schemas                                                        */
/* ------------------------------------------------------------------ */

export const flagTypeSchema = z.enum(FLAG_TYPES);
export const flagSeveritySchema = z.enum(FLAG_SEVERITIES);
export const flagStatusSchema = z.enum(FLAG_STATUSES);
export const resolutionTypeSchema = z.enum(RESOLUTION_TYPES);

/* ------------------------------------------------------------------ */
/* Stage-2 AI verification — strict structured JSON contract          */
/* ------------------------------------------------------------------ */

export const aiFlagSchema = z.object({
  type: flagTypeSchema,
  severity: flagSeveritySchema,
  confidence: z.number().min(0).max(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  customerStatement: z.string().max(2000).nullable().default(null),
  agentStatement: z.string().max(2000).nullable().default(null),
  expectedInformation: z.string().max(2000).nullable().default(null),
  actualInformation: z.string().max(2000).nullable().default(null),
  evidence: z.string().max(4000).nullable().default(null),
  startTime: z.number().int().min(0).nullable().default(null),
  endTime: z.number().int().min(0).nullable().default(null),
  transcriptSegmentId: z.string().max(100).nullable().default(null),
  aiReasoning: z.string().max(4000).nullable().default(null),
  recommendedAction: z.string().max(2000).nullable().default(null),
  isTranscriptionAmbiguity: z.boolean().default(false),
});

export const aiFlagVerificationSchema = z.object({
  flags: z.array(aiFlagSchema).max(25),
});

export type AIFlag = z.infer<typeof aiFlagSchema>;
export type AIFlagVerificationResult = z.infer<typeof aiFlagVerificationSchema>;

/* ------------------------------------------------------------------ */
/* Stage-1 candidate (deterministic detection output)                 */
/* ------------------------------------------------------------------ */

export interface FlagCandidate {
  /** Rule/detector that produced this candidate */
  detector: string;
  flag_type: FlagType;
  category: string;
  severity: FlagSeverity;
  title: string;
  description: string;
  customer_statement?: string | null;
  agent_statement?: string | null;
  expected_information?: string | null;
  actual_information?: string | null;
  evidence?: string | null;
  evidence_start_time?: number | null;
  evidence_end_time?: number | null;
  transcript_segment_id?: string | null;
  /** Preliminary confidence before AI verification (0-1) */
  initial_confidence: number;
  /** Stable key used to dedupe identical findings per call */
  dedup_key: string;
}
