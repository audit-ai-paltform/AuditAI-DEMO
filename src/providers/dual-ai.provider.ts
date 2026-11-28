/**
 * Dual AI / LLM Orchestration Provider
 * Primary: OpenRouter API (configured model e.g. inclusionai/ling-3.2-flash:free / claude-3.5-sonnet)
 * Safe Fallback: Google Gemini API (gemini-3.6-flash / gemini-2.5-flash)
 */

import { openRouterFallback, OpenRouterProvider } from './openrouter.provider.js';
import { geminiProvider, GeminiProvider } from './gemini.provider.js';
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
  activeMode: 'openrouter-primary-gemini-fallback' | 'gemini-only';
}

export class DualAIProvider implements IAIProvider {
  private openrouter: OpenRouterProvider;
  private gemini: GeminiProvider;

  constructor() {
    this.openrouter = openRouterFallback;
    this.gemini = geminiProvider;
  }

  private isOpenRouterConfigured(): boolean {
    const k = process.env.OPENROUTER_API_KEY;
    return Boolean(k && k.trim().length > 10);
  }

  public getStatus(): AIProviderStatus {
    const hasOpenRouter = this.isOpenRouterConfigured();
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sample_gemini_api_key');

    return {
      primary: {
        name: hasOpenRouter ? 'OpenRouter' : 'Google Gemini',
        model: hasOpenRouter ? this.openrouter.getModel() : 'gemini-3.6-flash / gemini-2.5-flash',
        configured: hasOpenRouter || hasGemini,
      },
      secondary: {
        name: hasOpenRouter ? 'Google Gemini (Safe Fallback)' : 'OpenRouter',
        model: hasOpenRouter ? 'gemini-3.6-flash / gemini-2.5-flash' : this.openrouter.getModel(),
        configured: hasOpenRouter ? hasGemini : hasOpenRouter,
      },
      activeMode: hasOpenRouter ? 'openrouter-primary-gemini-fallback' : 'gemini-only',
    };
  }

  public async generateStructuredJson(systemInstruction: string, prompt: string): Promise<Record<string, unknown>> {
    if (this.isOpenRouterConfigured()) {
      try {
        return await this.openrouter.generateStructuredJson(systemInstruction, prompt);
      } catch (openRouterErr: any) {
        logger.warn({ err: openRouterErr.message }, '[DualAIProvider] Primary OpenRouter failed, failing over to Google Gemini...');
      }
    }

    try {
      return await this.gemini.generateStructuredJson(systemInstruction, prompt);
    } catch (geminiErr: any) {
      throw new Error(`AI generation failed across OpenRouter and Google Gemini: ${geminiErr.message}`);
    }
  }

  public async evaluateCall(
    transcriptText: string,
    utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>,
    tenantApiKey?: string,
  ): Promise<StructuredEvaluationResult> {
    if (this.isOpenRouterConfigured()) {
      try {
        return await this.openrouter.evaluateCall(transcriptText, utterances, sopContent, parameters);
      } catch (openRouterErr: any) {
        logger.warn({ err: openRouterErr.message }, '[DualAIProvider] OpenRouter evaluateCall failed, failing over to Google Gemini...');
      }
    }

    return await this.gemini.evaluateCall(transcriptText, utterances, sopContent, parameters, tenantApiKey);
  }

  public async verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput> {
    if (this.isOpenRouterConfigured()) {
      try {
        return await this.openrouter.verifyFlags(input);
      } catch (err: any) {
        logger.warn({ err: err.message }, '[DualAIProvider] OpenRouter verifyFlags failed, failing over to Google Gemini...');
      }
    }

    try {
      return await this.gemini.verifyFlags(input);
    } catch {
      return { flags: [] };
    }
  }

  public async extractAuditRules(sopText: string): Promise<Array<{ rule: string; suggestedWeight: number }>> {
    const sys = `Extract 5-8 concrete audit rules with suggested percentage weights (total ~100) from the provided call script. Return ONLY raw JSON: {"rules":[{"rule":"string","suggestedWeight":number}]}`;
    if (this.isOpenRouterConfigured()) {
      try {
        const res = await this.openrouter.generateStructuredJson(sys, sopText);
        return Array.isArray((res as any).rules) ? (res as any).rules : [];
      } catch {}
    }
    return await this.gemini.extractAuditRules(sopText);
  }

  public async suggestParameter(currentParameters: Array<{ name: string; weight: number }>): Promise<{ name: string; suggestedWeight: number; rationale: string }> {
    const sys = `Suggest exactly ONE new QA parameter not covered in the current list. Return ONLY raw JSON: {"name":"string","suggestedWeight":number,"rationale":"string"}`;
    if (this.isOpenRouterConfigured()) {
      try {
        return (await this.openrouter.generateStructuredJson(sys, JSON.stringify(currentParameters))) as any;
      } catch {}
    }
    return await this.gemini.suggestParameter(currentParameters);
  }

  public async probeDualProviders() {
    const orResult = await this.openrouter.probe();

    let geminiStatus: { status: 'healthy' | 'error'; latencyMs?: number; error?: string } = { status: 'healthy', latencyMs: 0 };
    const gStart = Date.now();
    try {
      await this.gemini.generateStructuredJson('Ping test.', 'Return {"ping":"pong"}');
      geminiStatus = { status: 'healthy', latencyMs: Date.now() - gStart };
    } catch (err: any) {
      geminiStatus = { status: 'error', latencyMs: Date.now() - gStart, error: err.message };
    }

    return {
      openrouter: {
        status: orResult.ok ? 'healthy' : 'error',
        model: orResult.model,
        latencyMs: orResult.latencyMs,
        error: orResult.error,
      },
      gemini: geminiStatus,
    };
  }
}

export const dualAIProvider = new DualAIProvider();
