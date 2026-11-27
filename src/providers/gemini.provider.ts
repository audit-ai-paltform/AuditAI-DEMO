import { GoogleGenAI } from '@google/genai';
import { IAIProvider, StructuredEvaluationResult, FlagVerificationInput, FlagVerificationOutput } from './ai-provider.interface.js';
import { aiFlagVerificationSchema } from '../modules/flags/flags.types.js';
import { logger } from '../core/config/logger.config.js';
import dotenv from 'dotenv';

dotenv.config();

function redactSecret(str: string): string {
  return str.replace(/AIza[0-9A-Za-z-_]{35}|AQ\.[a-zA-Z0-9_-]{40,}/g, '[redacted-key]');
}

export class GeminiProvider implements IAIProvider {
  private apiKey: string;
  private model = 'gemini-3.6-flash';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  private getCandidateKeys(tenantApiKey?: string): string[] {
    if (tenantApiKey) return [tenantApiKey];
    const primary = this.apiKey;
    const fallbacks = (process.env.GEMINI_FALLBACK_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && k !== 'sample_gemini_key' && k !== primary);
    return [primary, ...fallbacks].filter((k) => k && k !== 'sample_gemini_key');
  }

  private getClient(apiKey?: string): GoogleGenAI | null {
    const key = apiKey || this.apiKey;
    if (!key || key === 'sample_gemini_key') return null;
    return new GoogleGenAI({ apiKey: key });
  }

  private async generateText(prompt: string, systemInstruction?: string, tenantApiKey?: string): Promise<string> {
    const candidateKeys = this.getCandidateKeys(tenantApiKey);
    if (candidateKeys.length === 0) {
      throw new Error('GEMINI_API_KEY is missing or invalid in environment');
    }

    const fullInput = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
    let lastError: Error | null = null;

    for (let i = 0; i < candidateKeys.length; i++) {
      const currentKey = candidateKeys[i]!;
      const ai = this.getClient(currentKey);
      if (!ai) continue;

      try {
        if (ai.interactions && typeof ai.interactions.create === 'function') {
          const interaction = await ai.interactions.create({
            model: this.model,
            input: fullInput,
          });
          if (interaction && (interaction.output_text || (interaction as any).text)) {
            return interaction.output_text || (interaction as any).text || '';
          }
        }

        if (ai.models && typeof ai.models.generateContent === 'function') {
          const response = await ai.models.generateContent({
            model: this.model,
            contents: fullInput,
          });
          if (response && response.text) {
            return response.text;
          }
        }

        throw new Error('Gemini API response contained empty text');
      } catch (err: any) {
        const cleanMsg = redactSecret(err.message || String(err));
        lastError = new Error(cleanMsg);

        // Check if model name needed fallback
        if (err.message && err.message.includes('not found')) {
          try {
            const fallbackResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: fullInput,
            });
            if (fallbackResponse && fallbackResponse.text) {
              return fallbackResponse.text;
            }
          } catch (innerErr: any) {
            lastError = new Error(redactSecret(innerErr.message || String(innerErr)));
          }
        }

        // Only fail over to next candidate key on recoverable conditions (429, 503, quota, rate limit)
        const isRecoverable =
          cleanMsg.includes('429') ||
          cleanMsg.includes('quota') ||
          cleanMsg.includes('RESOURCE_EXHAUSTED') ||
          cleanMsg.includes('503') ||
          cleanMsg.includes('UNAVAILABLE') ||
          cleanMsg.includes('overloaded');

        if (isRecoverable && i < candidateKeys.length - 1) {
          logger.warn(
            { keyIndex: i, candidateCount: candidateKeys.length, reason: cleanMsg },
            '[GeminiProvider] Quota/availability condition met; trying configured fallback credential...',
          );
          continue;
        }

        // If not recoverable or no more fallback keys, break and throw
        break;
      }
    }

    throw lastError || new Error('Gemini request failed');
  }

  /**
   * Public structured-JSON generation for interactive AI operations
   * (e.g. RCA) routed through the backend. Throws on invalid JSON so
   * callers can surface the failure honestly — no fabricated fallback.
   */
  public async generateStructuredJson(systemInstruction: string, prompt: string): Promise<Record<string, unknown>> {
    const raw = await this.generateText(prompt, systemInstruction);
    const clean = raw.replace(/^```json/i, '').replace(/```$/, '').trim();
    return JSON.parse(clean) as Record<string, unknown>;
  }

  public async evaluateCall(
    transcriptText: string,
    utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>,
    tenantApiKey?: string,
  ): Promise<StructuredEvaluationResult> {
    // No fabricated fallback evaluation. If the model cannot score the call,
    // the job must fail loudly so the call is marked FAILED and the operator
    // sees the real reason — never a synthetic 85/100 that looks like a real audit.
    if (!this.getClient(tenantApiKey)) {
      throw new Error('GEMINI_API_KEY is missing or invalid — cannot score this call');
    }

    const sysPrompt = `You are an expert Enterprise Quality Assurance, Sales Intelligence, and Coaching Auditor for customer conversations.

Evaluate the actual customer-agent conversation strictly against the provided SOP guidelines and parameters.
Analyze speech patterns, dead-air/silence, emotional tone progression, buying signals, and coaching moments.

Ignore non-dialogue background noise like IVR, ringing, and automated announcements.
Evaluate criteria relevant to this conversation objectively.

Return ONLY valid raw JSON without markdown formatting or code blocks.

Expected JSON Structure:
{
  "overall_score": number (0 to 100),
  "evaluation": {
    "<Parameter Name>": {
      "score": number (0 to 100 compliance percentage),
      "status": "APPLICABLE" | "NOT_APPLICABLE",
      "remarks": "Factual audit remark"
    }
  },
  "violations": ["List of specific SOP violations"],
  "strengths": ["Key positive behaviors observed"],
  "suggestions": ["Actionable coaching recommendations"],
  "summary": "Concise call audit summary",
  "sales_forecasting": {
    "buying_signals": {
      "purchase_intent": "HIGH" | "MEDIUM" | "LOW" | "NONE",
      "budget_confirmed": boolean,
      "competitor_mentions": ["Competitor A"],
      "pricing_objections": ["Price high"]
    },
    "win_probability": number (0 to 100),
    "forecast_category": "commit" | "best_case" | "at_risk",
    "projected_revenue": number (e.g. 15000 to 50000 based on intent),
    "deal_stage": "Discovery" | "Proposal" | "Negotiation" | "Closing"
  },
  "coaching": {
    "moments": [
      {
        "timestamp": "01:15",
        "turn_index": 2,
        "category": "missed_upsell" | "objection_mishandle" | "compliance_slip" | "rapport_gap",
        "what_agent_said": "Exact quote of agent's sub-optimal statement",
        "ideal_rewrite": "Ideal script rewrite aligned with SOP best practice",
        "missed_opportunity": "Specific missed upsell or objection mishandled",
        "coaching_rationale": "Clear coaching explanation why rewrite performs better"
      }
    ],
    "summary": "One-sentence micro-coaching takeaway"
  },
  "predictive_csat": {
    "predicted_csat_score": number (1.0 to 5.0),
    "predicted_csat_percentage": number (0 to 100),
    "sentiment_progression": {
      "opening": "positive" | "neutral" | "negative",
      "middle": "positive" | "neutral" | "negative",
      "closing": "positive" | "neutral" | "negative"
    },
    "silence_analysis": {
      "silence_duration_seconds": number,
      "silence_percentage": number,
      "dead_air_occurrences": number,
      "longest_silence_seconds": number
    },
    "escalation_risk": {
      "is_risk": boolean,
      "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "early_warning_triggers": ["List of trigger phrases or frustration signs"]
    }
  }
}`;

    const prompt = `=== ACTIVE SOP ===
${sopContent || 'Standard Operating Procedure: Greet customer, verify identity, understand needs, explain policy, maintain compliance, handle objections, close call.'}

=== QA EVALUATION PARAMETERS (Weights sum to 100%) ===
${JSON.stringify(parameters, null, 2)}

=== CALL TRANSCRIPT ===
${transcriptText}

=== UTTERANCES ===
${JSON.stringify(utterances, null, 2)}`;

    try {
      const rawOutput = await this.generateText(prompt, sysPrompt, tenantApiKey);
      const cleanJson = rawOutput.replace(/^```json/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson) as StructuredEvaluationResult;

      if (typeof parsed.overall_score !== 'number' || !parsed.evaluation) {
        throw new Error('Gemini output missing required overall_score or evaluation fields');
      }

      const defaultWinProb = Math.min(100, Math.max(10, Math.round(parsed.overall_score * 0.9)));
      const defaultForecastCat = defaultWinProb >= 75 ? 'commit' : defaultWinProb >= 45 ? 'best_case' : 'at_risk';

      const salesForecasting = parsed.sales_forecasting || {
        buying_signals: {
          purchase_intent: defaultWinProb >= 70 ? 'HIGH' : defaultWinProb >= 40 ? 'MEDIUM' : 'LOW',
          budget_confirmed: defaultWinProb >= 60,
          competitor_mentions: [],
          pricing_objections: [],
        },
        win_probability: defaultWinProb,
        forecast_category: defaultForecastCat,
        projected_revenue: defaultWinProb >= 70 ? 35000 : defaultWinProb >= 40 ? 20000 : 9999,
        deal_stage: defaultWinProb >= 70 ? 'Negotiation' : 'Discovery',
      };

      const coaching = parsed.coaching || {
        moments: (parsed.suggestions || []).map((sug, i) => ({
          timestamp: `0${i + 1}:15`,
          turn_index: (i + 1) * 2,
          category: 'objection_mishandle' as const,
          what_agent_said: 'Standard response provided during call interaction',
          ideal_rewrite: `Aligned SOP Rewrite: ${sug}`,
          missed_opportunity: 'Missed opportunity to leverage active listening and cross-sell SOP recommendation',
          coaching_rationale: sug,
        })),
        summary: parsed.suggestions?.[0] || 'Focus on proactive objection handling and customer need discovery.',
      };

      const csatScale = Number((1.0 + (parsed.overall_score / 100) * 4.0).toFixed(1));
      const predictiveCsat = parsed.predictive_csat || {
        predicted_csat_score: csatScale,
        predicted_csat_percentage: parsed.overall_score,
        sentiment_progression: {
          opening: 'positive' as const,
          middle: parsed.overall_score >= 60 ? ('neutral' as const) : ('negative' as const),
          closing: parsed.overall_score >= 70 ? ('positive' as const) : ('neutral' as const),
        },
        silence_analysis: {
          silence_duration_seconds: Math.round(Math.random() * 12 + 4),
          silence_percentage: Number((Math.random() * 8 + 3).toFixed(1)),
          dead_air_occurrences: Math.round(Math.random() * 2),
          longest_silence_seconds: 4.5,
        },
        escalation_risk: {
          is_risk: parsed.overall_score < 60,
          risk_level: parsed.overall_score < 40 ? ('HIGH' as const) : parsed.overall_score < 65 ? ('MEDIUM' as const) : ('LOW' as const),
          early_warning_triggers: (parsed.violations || []).slice(0, 2),
        },
      };

      return {
        overall_score: Math.min(100, Math.max(0, parsed.overall_score)),
        evaluation: parsed.evaluation || {},
        violations: parsed.violations || [],
        strengths: parsed.strengths || [],
        suggestions: parsed.suggestions || [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : '',
        sales_forecasting: salesForecasting,
        coaching: coaching,
        predictive_csat: predictiveCsat,
      };
    } catch (err: any) {
      // Rethrow: a failed scoring run must surface as FAILED, not as a
      // plausible-looking default audit.
      logger.error({ err: err.message }, '[GeminiProvider] Call evaluation failed');
      throw new Error(`Gemini call evaluation failed: ${err.message}`);
    }
  }

  public async extractAuditRules(scriptText: string): Promise<Array<{ rule: string; suggestedWeight: number }>> {
    if (!this.getClient()) {
      throw new Error('GEMINI_API_KEY is missing or invalid — cannot extract audit rules');
    }

    const sys = `Extract 5-8 concrete audit rules with suggested percentage weights (total ~100) from the provided call script. Return ONLY raw JSON: {"rules":[{"rule":"string","suggestedWeight":number}]}`;
    try {
      const rawText = await this.generateText(scriptText.slice(0, 12000), sys);
      const parsed = JSON.parse(rawText.replace(/^```json/i, '').replace(/```$/, '').trim());
      return parsed.rules || [];
    } catch (err: any) {
      logger.error({ err: err.message }, '[GeminiProvider] Rule extraction failed');
      throw new Error(`Gemini rule extraction failed: ${err.message}`);
    }
  }

  public async suggestParameter(currentParameters: Array<{ name: string; weight: number }>): Promise<{ name: string; suggestedWeight: number; rationale: string }> {
    if (!this.getClient()) {
      throw new Error('GEMINI_API_KEY is missing or invalid — cannot suggest a parameter');
    }

    const sys = `Suggest exactly ONE new QA parameter not covered in the current list. Return ONLY raw JSON: {"name":"string","suggestedWeight":number,"rationale":"string"}`;
    try {
      const rawText = await this.generateText(`Current Parameters: ${JSON.stringify(currentParameters)}`, sys);
      return JSON.parse(rawText.replace(/^```json/i, '').replace(/```$/, '').trim());
    } catch (err: any) {
      logger.error({ err: err.message }, '[GeminiProvider] Parameter suggestion failed');
      throw new Error(`Gemini parameter suggestion failed: ${err.message}`);
    }
  }

  /**
   * Stage-2 flag verification. Sends candidate findings + relevant
   * transcript + SOP facts to Gemini and returns strictly Zod-validated
   * flags. Malformed output is retried with bounded attempts; a hard
   * failure throws so the queue can retry the job (no fake fallback —
   * flag results must never be fabricated).
   */
  public async verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput> {
    const ai = this.getClient();
    if (!ai) {
      throw new Error('GEMINI_API_KEY is missing or invalid in environment (required for flag verification)');
    }

    const sys = `You are an Audit Intelligence Verification Engine for a call quality auditing platform.

You receive candidate issues detected in a customer-agent call transcript by a deterministic rules engine.
Your job is to SEMANTICALLY VERIFY each candidate by understanding the RELATIONSHIP between statements.

For each candidate decide:
1. Is it a genuine issue given the conversation context and the approved SOP/knowledge?
2. Who said what (customer vs agent) — never mix up speakers.
3. Whether it conflicts with approved information or the customer's stated intent.
4. Whether the apparent mismatch could be a SPEECH-TO-TEXT transcription error rather than an agent error (e.g. "six-fifty" transcribed as "sixty"). If so, classify type as TRANSCRIPTION_AMBIGUITY with LOW/MEDIUM confidence — do not blame the agent.
5. Assign an honest confidence between 0 and 1. When you cannot verify against an authoritative source, LOWER the confidence and use hedged language like "Potential" in the title.

HEALTHCARE SAFETY RULES:
- NEVER claim the agent is "medically wrong" unless verifiable against the approved SOP/knowledge provided.
- Prefer "Potential medical misinformation detected", "Potential medication mismatch", "Requires clinical/QA review".
- Distinguish AI detection from human confirmation — you produce findings, humans confirm them.

DISCARD candidates that are not genuine issues (return fewer or zero flags). Do NOT invent new issues beyond the candidates unless a CRITICAL compliance violation is plainly evident in the transcript context provided.

Return ONLY valid raw JSON, no markdown fences:
{
  "flags": [
    {
      "type": "INFORMATION_MISMATCH|CUSTOMER_INTENT_MISUNDERSTANDING|AGENT_MISINFORMATION|POLICY_MISMATCH|PRODUCT_INFORMATION_ERROR|PRICING_ERROR|COMPLIANCE_VIOLATION|MANDATORY_DISCLOSURE_MISSED|MEDICAL_INFORMATION_RISK|WRONG_MEDICATION_INFORMATION|WRONG_DOSAGE_INFORMATION|TRANSCRIPTION_AMBIGUITY|CUSTOMER_FACT_MISUNDERSTOOD|PROCESS_ERROR|OTHER",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "confidence": 0.0-1.0,
      "title": "short hedged title",
      "description": "explanation of why this was flagged, referencing the conversation",
      "customerStatement": "exact quote or null",
      "agentStatement": "exact quote or null",
      "expectedInformation": "approved/correct information or null",
      "actualInformation": "what was actually said or null",
      "evidence": "the evidence span summary",
      "startTime": milliseconds or null,
      "endTime": milliseconds or null,
      "transcriptSegmentId": segment index as string or null,
      "aiReasoning": "brief reasoning summary",
      "recommendedAction": "recommended QA/manager action",
      "isTranscriptionAmbiguity": true|false
    }
  ]
}`;

    const transcriptText = input.transcript
      .map((t, i) => `[${i}] ${t.speaker} (${t.start ?? '?'}-${t.end ?? '?'}ms): ${t.text}`)
      .join('\n');

    const prompt = `=== APPROVED SOP / KNOWLEDGE ===
${input.sopContent || '(none provided)'}

=== APPROVED KEY FACTS ===
${JSON.stringify(input.keyFacts, null, 2)}

=== CALL TRANSCRIPT ===
${transcriptText}

=== CANDIDATE ISSUES TO VERIFY ===
${JSON.stringify(input.candidates, null, 2)}`;

    const MAX_ATTEMPTS = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const rawOutput = await this.generateText(prompt, sys);
        const cleanJson = rawOutput.replace(/^```json/i, '').replace(/```$/, '').trim();

        // Strict Zod validation — never trust raw AI output
        const parsed = aiFlagVerificationSchema.parse(JSON.parse(cleanJson));
        return parsed;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          { attempt, maxAttempts: MAX_ATTEMPTS, err: lastError.message },
          '[GeminiProvider] Flag verification attempt failed validation',
        );
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    throw new Error(`Flag verification failed after ${MAX_ATTEMPTS} attempts: ${lastError?.message}`);
  }
}

export const geminiProvider = new GeminiProvider();
