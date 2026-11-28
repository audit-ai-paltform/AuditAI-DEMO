/**
 * Dual AI / LLM Orchestration Provider
 * Primary: OpenAI API (gpt-4o-mini / gpt-4o)
 * Safe Fallback: Google Gemini API (gemini-3.6-flash / gemini-2.5-flash)
 * Tertiary Fallback: OpenRouter API
 */

import { openAIProvider, OpenAIProvider } from './openai.provider.js';
import { geminiProvider, GeminiProvider } from './gemini.provider.js';
import { openRouterFallback, OpenRouterProvider } from './openrouter.provider.js';
import {
  IAIProvider,
  FlagVerificationInput,
  FlagVerificationOutput,
  StructuredEvaluationResult,
} from './ai-provider.interface.js';
import { logger } from '../core/config/logger.config.js';

export interface AIProviderStatus {
  primary: {
    name: string;
    model: string;
    configured: boolean;
  };
  secondary: {
    name: string;
    model: string;
    configured: boolean;
  };
  activeMode: 'openai-primary-gemini-fallback' | 'gemini-primary' | 'dual-fallback';
}

export class DualAIProvider implements IAIProvider {
  private openai: OpenAIProvider;
  private gemini: GeminiProvider;
  private openrouter: OpenRouterProvider;

  constructor() {
    this.openai = openAIProvider;
    this.gemini = geminiProvider;
    this.openrouter = openRouterFallback;
  }

  public getStatus(): AIProviderStatus {
    const hasOpenAI = this.openai.isConfigured();
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sample_gemini_api_key');

    return {
      primary: {
        name: hasOpenAI ? 'OpenAI' : 'Google Gemini',
        model: hasOpenAI ? this.openai.getModel() : 'gemini-3.6-flash / gemini-2.5-flash',
        configured: hasOpenAI || hasGemini,
      },
      secondary: {
        name: hasOpenAI ? 'Google Gemini (Safe Fallback)' : 'OpenRouter (Fallback)',
        model: hasOpenAI ? 'gemini-3.6-flash / gemini-2.5-flash' : this.openrouter.getModel(),
        configured: hasOpenAI ? hasGemini : Boolean(process.env.OPENROUTER_API_KEY),
      },
      activeMode: hasOpenAI ? 'openai-primary-gemini-fallback' : 'gemini-primary',
    };
  }

  public async generateStructuredJson(systemInstruction: string, prompt: string): Promise<Record<string, unknown>> {
    if (this.openai.isConfigured()) {
      try {
        return await this.openai.generateStructuredJson(systemInstruction, prompt);
      } catch (openAiErr: any) {
        logger.warn({ err: openAiErr.message }, '[DualAIProvider] Primary OpenAI failed, failing over to Google Gemini...');
      }
    }

    try {
      return await this.gemini.generateStructuredJson(systemInstruction, prompt);
    } catch (geminiErr: any) {
      logger.warn({ err: geminiErr.message }, '[DualAIProvider] Google Gemini failed, failing over to OpenRouter...');
      try {
        return await this.openrouter.generateStructuredJson(systemInstruction, prompt);
      } catch (openRouterErr: any) {
        throw new Error(`AI generation failed across providers: Gemini (${geminiErr.message}), OpenRouter (${openRouterErr.message})`);
      }
    }
  }

  public async evaluateCall(
    transcriptText: string,
    utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>,
    tenantApiKey?: string,
  ): Promise<StructuredEvaluationResult> {
    if (this.openai.isConfigured()) {
      try {
        return await this.openai.evaluateCall(transcriptText, utterances, sopContent, parameters, tenantApiKey);
      } catch (openAiErr: any) {
        logger.warn({ err: openAiErr.message }, '[DualAIProvider] OpenAI evaluateCall failed, failing over to Google Gemini...');
      }
    }

    try {
      return await this.gemini.evaluateCall(transcriptText, utterances, sopContent, parameters, tenantApiKey);
    } catch (geminiErr: any) {
      logger.warn({ err: geminiErr.message }, '[DualAIProvider] Gemini evaluateCall failed, failing over to OpenRouter...');
      return await this.openrouter.evaluateCall(transcriptText, utterances, sopContent, parameters);
    }
  }

  public async verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput> {
    if (this.openai.isConfigured()) {
      try {
        return await this.openai.verifyFlags(input);
      } catch (err: any) {
        logger.warn({ err: err.message }, '[DualAIProvider] OpenAI verifyFlags failed, failing over to Google Gemini...');
      }
    }

    try {
      return await this.gemini.verifyFlags(input);
    } catch {
      try {
        return await this.openrouter.verifyFlags(input);
      } catch {
        return { flags: [] };
      }
    }
  }

  public async extractAuditRules(sopText: string): Promise<Array<{ rule: string; suggestedWeight: number }>> {
    const sys = `Extract 5-8 concrete audit rules with suggested percentage weights (total ~100) from the provided call script. Return ONLY raw JSON: {"rules":[{"rule":"string","suggestedWeight":number}]}`;
    if (this.openai.isConfigured()) {
      try {
        const res = await this.openai.generateStructuredJson(sys, sopText);
        return Array.isArray((res as any).rules) ? (res as any).rules : [];
      } catch {}
    }
    try {
      return await this.gemini.extractAuditRules(sopText);
    } catch {
      const res = await this.openrouter.generateStructuredJson(sys, sopText);
      return Array.isArray((res as any).rules) ? (res as any).rules : [];
    }
  }

  public async suggestParameter(currentParameters: Array<{ name: string; weight: number }>): Promise<{ name: string; suggestedWeight: number; rationale: string }> {
    const sys = `Suggest exactly ONE new QA parameter not covered in the current list. Return ONLY raw JSON: {"name":"string","suggestedWeight":number,"rationale":"string"}`;
    if (this.openai.isConfigured()) {
      try {
        return (await this.openai.generateStructuredJson(sys, JSON.stringify(currentParameters))) as any;
      } catch {}
    }
    try {
      return await this.gemini.suggestParameter(currentParameters);
    } catch {
      return (await this.openrouter.generateStructuredJson(sys, JSON.stringify(currentParameters))) as any;
    }
  }

  public async probeDualProviders() {
    const orResult = await this.openrouter.probe();
    let openaiStatus: { status: 'healthy' | 'error' | 'unconfigured'; model: string; latencyMs?: number; error?: string } = {
      status: this.openai.isConfigured() ? 'healthy' : 'unconfigured',
      model: this.openai.getModel(),
    };
    if (this.openai.isConfigured()) {
      const oStart = Date.now();
      try {
        await this.openai.generateStructuredJson('Ping test.', 'Return {"ping":"pong"}');
        openaiStatus = { status: 'healthy', model: this.openai.getModel(), latencyMs: Date.now() - oStart };
      } catch (err: any) {
        openaiStatus = { status: 'error', model: this.openai.getModel(), latencyMs: Date.now() - oStart, error: err.message };
      }
    }

    let geminiStatus: { status: 'healthy' | 'error'; latencyMs?: number; error?: string } = { status: 'healthy', latencyMs: 0 };
    const gStart = Date.now();
    try {
      await this.gemini.generateStructuredJson('Ping test.', 'Return {"ping":"pong"}');
      geminiStatus = { status: 'healthy', latencyMs: Date.now() - gStart };
    } catch (err: any) {
      geminiStatus = { status: 'error', latencyMs: Date.now() - gStart, error: err.message };
    }

    return {
      openai: openaiStatus,
      gemini: geminiStatus,
      openrouter: {
        status: orResult.ok ? 'healthy' : 'error',
        model: orResult.model,
        latencyMs: orResult.latencyMs,
        error: orResult.error,
      },
    };
  }
}

export const dualAIProvider = new DualAIProvider();
