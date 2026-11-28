import {
  IAIProvider,
  FlagVerificationInput,
  FlagVerificationOutput,
  StructuredEvaluationResult,
} from './ai-provider.interface.js';
import { logger } from '../core/config/logger.config.js';

export class OpenAIProvider implements IAIProvider {
  public getModel(): string {
    return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  public isConfigured(): boolean {
    const key = process.env.OPENAI_API_KEY;
    return Boolean(key && key.trim().length > 10 && !key.includes('sample_'));
  }

  public async generateStructuredJson(
    systemInstruction: string,
    prompt: string,
    overrideApiKey?: string,
  ): Promise<Record<string, unknown>> {
    const apiKey = overrideApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: this.getModel(),
        response_format: { type: 'json_object' },
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as any;
    const rawContent = data?.choices?.[0]?.message?.content || '{}';
    return JSON.parse(rawContent);
  }

  public async generateText(systemInstruction: string, prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim().length < 10) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: this.getModel(),
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as any;
    return data?.choices?.[0]?.message?.content || '';
  }

  public async evaluateCall(
    transcriptText: string,
    _utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>,
    tenantApiKey?: string,
  ): Promise<StructuredEvaluationResult> {
    const sys = `You are an ISO 9001:2015 Call Quality Assurance & Revenue Intelligence Auditor.
Evaluate the transcript against the provided SOP and QA parameters.
Return ONLY valid JSON matching:
{
  "overall_score": number (0-100),
  "sentiment": "Positive" | "Neutral" | "Negative",
  "summary": "string",
  "parameter_scores": [{"name": "string", "score": number, "weight": number, "defect": boolean, "explanation": "string"}],
  "flags": {"has_defect": boolean, "auto_fail": boolean, "reason": "string"},
  "coaching": {"what_went_well": ["string"], "what_could_be_better": ["string"], "ideal_rewrite": "string"},
  "sales_signals": {"intent": "High"|"Medium"|"Low", "win_probability": number, "signals": ["string"]},
  "escalation_risk": {"is_risk": boolean, "risk_level": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", "early_warning_triggers": ["string"]}
}`;
    const prompt = `SOP:\n${sopContent}\n\nParameters:\n${JSON.stringify(parameters)}\n\nTranscript:\n${transcriptText}`;
    const result = await this.generateStructuredJson(sys, prompt, tenantApiKey);
    logger.info({ model: this.getModel() }, '[OpenAIProvider] Call evaluated');
    return result as unknown as StructuredEvaluationResult;
  }

  public async verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput> {
    const sys = `Verify candidate compliance flags against the transcript and SOP. Return ONLY valid JSON: {"flags":[{"type":"string","severity":"CRITICAL|HIGH|MEDIUM|LOW|INFO","confidence":0.9,"title":"string","description":"string","evidence":"string","recommendedAction":"string"}]}`;
    const prompt = JSON.stringify(input);
    const res = await this.generateStructuredJson(sys, prompt);
    return { flags: Array.isArray((res as any).flags) ? (res as any).flags : [] };
  }
}

export const openAIProvider = new OpenAIProvider();
