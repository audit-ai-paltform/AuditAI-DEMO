import dotenv from 'dotenv';
dotenv.config();

export interface ParameterItem {
  name: string;
  weight: number;
}

export interface ScoreResult {
  score: number;
  status: 'Passed' | 'Review' | 'Failed';
  parameterScores: Array<{ name: string; score: number }>;
  flags: Array<{ type: 'empathy' | 'compliance' | 'recovery'; label: string; turnIdx: number }>;
}

export class ClaudeProvider {
  private apiKey: string;
  private model = 'claude-sonnet-4-6';

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  /**
   * Scores call transcript turns against a list of parameter rules using Claude sonnet-4-6
   */
  async evaluateCallTranscript(
    turns: Array<{ spk: string; t: string }>,
    parameters: ParameterItem[]
  ): Promise<ScoreResult> {
    // No randomized fallback scores. This provider is not wired into the
    // pipeline (Gemini scores calls); inventing scores here would be
    // indistinguishable from a real audit, so it fails loudly instead.
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing or invalid — cannot score this transcript');
    }

    const sysPrompt = `You are an expert call center Quality Assurance auditor.
Evaluate the call transcript against the provided scoring parameters.
Return ONLY raw JSON with no markdown formatting:
{
  "parameterScores": [{"name": "string", "score": number (0-100)}],
  "flags": [{"type": "empathy"|"compliance"|"recovery", "label": "string", "turnIdx": number}]
}`;

    const userPrompt = `Parameters:
${JSON.stringify(parameters, null, 2)}

Transcript:
${JSON.stringify(turns, null, 2)}`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1500,
          system: sysPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!resp.ok) {
        throw new Error(`Claude API error: ${resp.statusText}`);
      }

      const data = (await resp.json()) as { content?: Array<{ text?: string }> };
      const text = (data.content || []).map((b) => b.text || '').join('').trim();
      const cleanJson = text.replace(/^```json/i, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleanJson);

      const parameterScores = parsed.parameterScores || [];
      const flags = parsed.flags || [];

      // Calculate weighted total score
      let weightedSum = 0;
      let totalWeight = 0;

      for (const p of parameters) {
        const match = parameterScores.find((ps: { name: string; score: number }) => ps.name === p.name);
        // Unscored criteria are excluded from the weighted total rather than
        // credited with a default 70.
        if (!match || typeof match.score !== 'number') continue;
        weightedSum += match.score * p.weight;
        totalWeight += p.weight;
      }

      if (totalWeight === 0) {
        throw new Error('Claude returned no usable parameter scores');
      }

      const finalScore = Math.min(100, Math.max(0, Math.round(weightedSum / totalWeight)));
      const status = finalScore >= 80 ? 'Passed' : finalScore >= 60 ? 'Review' : 'Failed';

      return {
        score: finalScore,
        status,
        parameterScores,
        flags,
      };
    } catch (err) {
      console.error('Claude API scoring error:', err);
      throw err;
    }
  }

  /**
   * Extracts audit rules from raw script/SOP text
   */
  async extractAuditRules(scriptText: string): Promise<Array<{ rule: string; suggestedWeight: number }>> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is missing or invalid — cannot extract audit rules');
    }

    const sys = `You are analyzing a call-center script/SOP to extract audit rules. Read the script and produce a list of concrete, checkable audit rules a QC evaluator could score a call against. Respond with ONLY raw JSON: {"rules":[{"rule":"...","suggestedWeight":number}]}. Weights across all rules should sum to roughly 100. Return 5-9 rules.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1200,
          system: sys,
          messages: [{ role: 'user', content: scriptText.slice(0, 12000) }],
        }),
      });

      const data = (await resp.json()) as { content?: Array<{ text?: string }> };
      const text = (data.content || []).map((b) => b.text || '').join('').trim();
      const parsed = JSON.parse(text.replace(/^```json/i, '').replace(/```$/, '').trim());
      return parsed.rules || [];
    } catch (err) {
      console.error('Rule extraction error:', err);
      return [
        { rule: 'Mandatory Greeting & Process Compliance', suggestedWeight: 40 },
        { rule: 'Issue Resolution & Closing', suggestedWeight: 60 },
      ];
    }
  }
}
