export interface EvaluationDetail {
  score: number;
  status?: string;
  remarks: string;
}

export interface BuyingSignals {
  purchase_intent: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  budget_confirmed: boolean;
  competitor_mentions: string[];
  pricing_objections: string[];
}

export interface SalesForecasting {
  buying_signals: BuyingSignals;
  win_probability: number; // 0 to 100%
  forecast_category: 'commit' | 'best_case' | 'at_risk';
  projected_revenue: number;
  deal_stage?: string;
  rationale?: string;
}

export interface CoachingMoment {
  timestamp: string;
  turn_index: number;
  category: 'missed_upsell' | 'objection_mishandle' | 'compliance_slip' | 'rapport_gap' | 'closing_hesitation';
  what_agent_said: string;
  ideal_rewrite: string;
  missed_opportunity: string;
  coaching_rationale: string;
}

export interface PredictiveCSAT {
  predicted_csat_score: number; // 1.0 to 5.0 scale
  predicted_csat_percentage: number; // 0 to 100%
  sentiment_progression: {
    opening: 'positive' | 'neutral' | 'negative';
    middle: 'positive' | 'neutral' | 'negative';
    closing: 'positive' | 'neutral' | 'negative';
  };
  silence_analysis: {
    silence_duration_seconds: number;
    silence_percentage: number;
    dead_air_occurrences: number;
    longest_silence_seconds: number;
  };
  escalation_risk: {
    is_risk: boolean;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    early_warning_triggers: string[];
  };
}

export interface StructuredEvaluationResult {
  overall_score: number;
  evaluation: Record<string, EvaluationDetail>;
  violations: string[];
  strengths: string[];
  suggestions: string[];
  summary: string;
  // Qalyzer v2.0 PRD Additions
  sales_forecasting?: SalesForecasting;
  coaching?: {
    moments: CoachingMoment[];
    summary: string;
  };
  predictive_csat?: PredictiveCSAT;
}

export interface IAIProvider {
  evaluateCall(
    transcriptText: string,
    utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>
  ): Promise<StructuredEvaluationResult>;

  /**
   * Stage-2 semantic verification of flag candidates. Sends only the
   * relevant transcript context + applicable SOP rule to the AI and
   * returns strictly-validated structured flags.
   */
  verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput>;
}

export interface FlagVerificationInput {
  /** Full transcript segments (milliseconds for start/end). */
  transcript: Array<{ speaker: string; text: string; start?: number; end?: number }>;
  /** Stage-1 candidate findings to verify. */
  candidates: Array<Record<string, unknown>>;
  /** Applicable SOP / approved knowledge text. */
  sopContent: string;
  /** Extracted authoritative key facts (subject → value). */
  keyFacts: Array<{ subject: string; value: string }>;
}

export interface FlagVerificationOutput {
  flags: Array<{
    type: string;
    severity: string;
    confidence: number;
    title: string;
    description: string;
    customerStatement?: string | null;
    agentStatement?: string | null;
    expectedInformation?: string | null;
    actualInformation?: string | null;
    evidence?: string | null;
    startTime?: number | null;
    endTime?: number | null;
    transcriptSegmentId?: string | null;
    aiReasoning?: string | null;
    recommendedAction?: string | null;
    isTranscriptionAmbiguity?: boolean;
  }>;
}
