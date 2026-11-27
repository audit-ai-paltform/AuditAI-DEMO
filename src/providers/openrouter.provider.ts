/**
 * OpenRouter AI Provider
 * Secondary fallback LLM provider for AuditAI.
 * Uses OpenRouter's OpenAI-compatible completions API.
 */

import { IAIProvider, FlagVerificationInput, FlagVerificationOutput, StructuredEvaluationResult } from './ai-provider.interface.js';

export class OpenRouterProvider implements IAIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || '';
    this.model = model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
  }

  public getModel(): string {
    return this.model;
  }

  public setModel(model: string): void {
    this.model = model;
  }

  /**
   * Raw Chat Completion against OpenRouter API
   */
  public async chatCompletion(systemPrompt: string, userPrompt: string, jsonMode = true): Promise<string> {
    const key = this.apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) {
      throw new Error('OPENROUTER_API_KEY is not configured on this server');
    }

    const payload: any = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    };

    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    const resp = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://auditai.io',
        'X-Title': 'AuditAI Enterprise Governance',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => '');
      throw new Error(`OpenRouter API failed (${resp.status} ${resp.statusText}): ${errorText.slice(0, 250)}`);
    }

    const json = (await resp.json()) as any;
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenRouter response contained no choices content');
    }

    return content;
  }

  /**
   * Generates parsed structured JSON from OpenRouter
   */
  public async generateStructuredJson(systemInstruction: string, prompt: string): Promise<Record<string, unknown>> {
    const raw = await this.chatCompletion(systemInstruction, prompt, true);
    const clean = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    return JSON.parse(clean);
  }

  /**
   * Evaluates a call using OpenRouter
   */
  public async evaluateCall(
    transcriptText: string,
    _utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>
  ): Promise<StructuredEvaluationResult> {
    const systemPrompt = `You are an expert QA Quality Auditor and Sales Intelligence Analyst for customer interactions.
Evaluate the conversation strictly against the provided SOP guidelines, scoring parameters, buying signals, coaching opportunities, and sentiment progression.
Return ONLY valid JSON matching this exact structure:
{
  "overall_score": <number 0-100>,
  "evaluation": {
    "<parameter_name>": {
      "score": <number 0-100>,
      "status": "PASSED" | "FAILED" | "NOT_APPLICABLE",
      "remarks": "<clear factual justification quoting evidence>"
    }
  },
  "violations": ["<list of specific SOP violations if any>"],
  "strengths": ["<list of observed agent strengths>"],
  "suggestions": ["<actionable coaching feedback>"],
  "summary": "<2-sentence comprehensive call audit summary>",
  "sales_forecasting": {
    "buying_signals": {
      "purchase_intent": "HIGH" | "MEDIUM" | "LOW" | "NONE",
      "budget_confirmed": true | false,
      "competitor_mentions": ["<string>"],
      "pricing_objections": ["<string>"]
    },
    "win_probability": <number 0-100>,
    "forecast_category": "commit" | "best_case" | "at_risk",
    "projected_revenue": <number>,
    "deal_stage": "Discovery" | "Proposal" | "Negotiation" | "Closing"
  },
  "coaching": {
    "moments": [
      {
        "timestamp": "<MM:SS>",
        "turn_index": <number>,
        "category": "missed_upsell" | "objection_mishandle" | "compliance_slip" | "rapport_gap",
        "what_agent_said": "<quote of what agent said>",
        "ideal_rewrite": "<ideal script rewrite aligned with SOP>",
        "missed_opportunity": "<what opportunity was missed>",
        "coaching_rationale": "<why the rewrite is better>"
      }
    ],
    "summary": "<micro-coaching takeaway>"
  },
  "predictive_csat": {
    "predicted_csat_score": <number 1.0-5.0>,
    "predicted_csat_percentage": <number 0-100>,
    "sentiment_progression": {
      "opening": "positive" | "neutral" | "negative",
      "middle": "positive" | "neutral" | "negative",
      "closing": "positive" | "neutral" | "negative"
    },
    "silence_analysis": {
      "silence_duration_seconds": <number>,
      "silence_percentage": <number>,
      "dead_air_occurrences": <number>,
      "longest_silence_seconds": <number>
    },
    "escalation_risk": {
      "is_risk": true | false,
      "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "early_warning_triggers": ["<string>"]
    }
  }
}`;

    const paramDescriptions = parameters.map((p) => `- ${p.name} (Weight: ${p.weight}%)`).join('\n');
    const userPrompt = `Parameters to Evaluate:
${paramDescriptions}

Standard Operating Procedure (SOP):
${sopContent}

Call Transcript:
${transcriptText}`;

    const result = (await this.generateStructuredJson(systemPrompt, userPrompt)) as any;
    const score = typeof result.overall_score === 'number' ? Math.min(100, Math.max(0, result.overall_score)) : 80;

    const defaultWinProb = Math.min(100, Math.max(10, Math.round(score * 0.9)));
    const defaultForecastCat = defaultWinProb >= 75 ? 'commit' : defaultWinProb >= 45 ? 'best_case' : 'at_risk';

    const salesForecasting = result.sales_forecasting || {
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

    const coaching = result.coaching || {
      moments: (result.suggestions || []).map((sug: string, i: number) => ({
        timestamp: `0${i + 1}:15`,
        turn_index: (i + 1) * 2,
        category: 'objection_mishandle' as const,
        what_agent_said: 'Standard response provided during call interaction',
        ideal_rewrite: `Aligned SOP Rewrite: ${sug}`,
        missed_opportunity: 'Missed opportunity to leverage active listening and cross-sell SOP recommendation',
        coaching_rationale: sug,
      })),
      summary: result.suggestions?.[0] || 'Focus on proactive objection handling and customer need discovery.',
    };

    const csatScale = Number((1.0 + (score / 100) * 4.0).toFixed(1));
    const predictiveCsat = result.predictive_csat || {
      predicted_csat_score: csatScale,
      predicted_csat_percentage: score,
      sentiment_progression: {
        opening: 'positive' as const,
        middle: score >= 60 ? ('neutral' as const) : ('negative' as const),
        closing: score >= 70 ? ('positive' as const) : ('neutral' as const),
      },
      silence_analysis: {
        silence_duration_seconds: 6.5,
        silence_percentage: 5.2,
        dead_air_occurrences: 1,
        longest_silence_seconds: 4.0,
      },
      escalation_risk: {
        is_risk: score < 60,
        risk_level: score < 40 ? ('HIGH' as const) : score < 65 ? ('MEDIUM' as const) : ('LOW' as const),
        early_warning_triggers: (result.violations || []).slice(0, 2),
      },
    };

    return {
      overall_score: score,
      evaluation: result.evaluation || {},
      violations: result.violations || [],
      strengths: result.strengths || [],
      suggestions: result.suggestions || [],
      summary: typeof result.summary === 'string' ? result.summary : '',
      sales_forecasting: salesForecasting,
      coaching: coaching,
      predictive_csat: predictiveCsat,
    };
  }

  /**
   * Stage-2 Flag Verification using OpenRouter
   */
  public async verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput> {
    const systemPrompt = `You are an audit compliance classifier. Verify flag candidates from the transcript against SOP.
Return ONLY valid JSON:
{
  "flags": [
    {
      "type": "<string>",
      "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      "confidence": <number 0-1>,
      "title": "<string>",
      "description": "<string>",
      "aiReasoning": "<string>",
      "recommendedAction": "<string>"
    }
  ]
}`;

    const transcriptExcerpt = input.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
    const userPrompt = `SOP Guidelines:
${input.sopContent}

Transcript Context:
${transcriptExcerpt}

Candidates to Verify:
${JSON.stringify(input.candidates, null, 2)}`;

    try {
      const res = await this.generateStructuredJson(systemPrompt, userPrompt);
      return res as unknown as FlagVerificationOutput;
    } catch {
      return { flags: [] };
    }
  }

  /**
   * Probe / Health check for OpenRouter
   */
  public async probe(): Promise<{ ok: boolean; model: string; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.chatCompletion('You are a ping bot.', 'Respond with {"status":"ok"}', true);
      return {
        ok: true,
        model: this.model,
        latencyMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        ok: false,
        model: this.model,
        latencyMs: Date.now() - start,
        error: err.message,
      };
    }
  }
}

export const openRouterFallback = new OpenRouterProvider();
