/**
 * Dual AI / LLM Orchestration Provider
 * Primary: Google Gemini API (gemini-3.6-flash, gemini-2.5-flash)
 * Secondary Fallback: OpenRouter API (Claude 3.5 Sonnet / Llama 3.3)
 */

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
  activeMode: 'dual-fallback' | 'gemini-only' | 'openrouter-only';
}

export class DualAIProvider implements IAIProvider {
  private gemini: GeminiProvider;
  private openrouter: OpenRouterProvider;

  constructor() {
    this.gemini = geminiProvider;
    this.openrouter = openRouterFallback;
  }

  /**
   * Status of configured AI providers
   */
  public getStatus(): AIProviderStatus {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'sample_gemini_api_key');
    const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

    let mode: 'dual-fallback' | 'gemini-only' | 'openrouter-only' = 'dual-fallback';
    if (hasGemini && !hasOpenRouter) mode = 'gemini-only';
    if (!hasGemini && hasOpenRouter) mode = 'openrouter-only';

    return {
      primary: {
        name: 'Google Gemini',
        model: 'gemini-3.6-flash / gemini-2.5-flash',
        configured: hasGemini,
      },
      secondary: {
        name: 'OpenRouter (Fallback)',
        model: this.openrouter.getModel(),
        configured: hasOpenRouter,
      },
      activeMode: mode,
    };
  }

  /**
   * Structured JSON generation with automatic failover
   */
  public async generateStructuredJson(systemInstruction: string, prompt: string): Promise<Record<string, unknown>> {
    // 1. Try Primary: Gemini
    try {
      return await this.gemini.generateStructuredJson(systemInstruction, prompt);
    } catch (geminiErr: any) {
      logger.warn(
        { err: geminiErr.message },
        '[DualAIProvider] Primary provider (Gemini) failed. Failing over to Secondary (OpenRouter)...'
      );

      // 2. Fallback to OpenRouter
      try {
        return await this.openrouter.generateStructuredJson(systemInstruction, prompt);
      } catch (openRouterErr: any) {
        logger.error(
          { geminiErr: geminiErr.message, openRouterErr: openRouterErr.message },
          '[DualAIProvider] Both Gemini and OpenRouter failed to generate structured JSON'
        );
        throw new Error(`AI generation failed across dual providers: Gemini (${geminiErr.message}), OpenRouter (${openRouterErr.message})`);
      }
    }
  }

  /**
   * Evaluate Call with automatic failover
   */
  public async evaluateCall(
    transcriptText: string,
    utterances: Array<{ speaker: string; text: string }>,
    sopContent: string,
    parameters: Array<{ name: string; weight: number }>,
    tenantApiKey?: string
  ): Promise<StructuredEvaluationResult> {
    try {
      return await this.gemini.evaluateCall(transcriptText, utterances, sopContent, parameters, tenantApiKey);
    } catch (geminiErr: any) {
      logger.warn(
        { err: geminiErr.message },
        '[DualAIProvider] Primary provider (Gemini) evaluateCall failed. Failing over to OpenRouter...'
      );

      try {
        return await this.openrouter.evaluateCall(transcriptText, utterances, sopContent, parameters);
      } catch (openRouterErr: any) {
        throw new Error(`Call evaluation failed on both Primary (Gemini) and Secondary (OpenRouter): ${openRouterErr.message}`);
      }
    }
  }

  /**
   * Stage-2 Flag Verification with automatic failover
   */
  public async verifyFlags(input: FlagVerificationInput): Promise<FlagVerificationOutput> {
    try {
      return await this.gemini.verifyFlags(input);
    } catch (geminiErr: any) {
      logger.warn(
        { err: geminiErr.message },
        '[DualAIProvider] Primary provider (Gemini) verifyFlags failed. Failing over to OpenRouter...'
      );
      try {
        return await this.openrouter.verifyFlags(input);
      } catch {
        return { flags: [] };
      }
    }
  }

  /**
   * Extract Rules from SOP
   */
  public async extractAuditRules(sopText: string): Promise<Array<{ rule: string; suggestedWeight: number }>> {
    try {
      return await this.gemini.extractAuditRules(sopText);
    } catch (geminiErr: any) {
      logger.warn(
        { err: geminiErr.message },
        '[DualAIProvider] Primary provider (Gemini) extractAuditRules failed. Failing over to OpenRouter...'
      );

      const sys = `Extract 5-8 concrete audit rules with suggested percentage weights (total ~100) from the provided call script. Return ONLY raw JSON: {"rules":[{"rule":"string","suggestedWeight":number}]}`;
      const res = await this.openrouter.generateStructuredJson(sys, sopText);
      return Array.isArray((res as any).rules) ? (res as any).rules : [];
    }
  }

  /**
   * Suggest Parameters
   */
  public async suggestParameter(currentParameters: Array<{ name: string; weight: number }>): Promise<{ name: string; suggestedWeight: number; rationale: string }> {
    try {
      return await this.gemini.suggestParameter(currentParameters);
    } catch (geminiErr: any) {
      logger.warn(
        { err: geminiErr.message },
        '[DualAIProvider] Primary provider (Gemini) suggestParameter failed. Failing over to OpenRouter...'
      );

      const sys = `Suggest exactly ONE new QA parameter not covered in the current list. Return ONLY raw JSON: {"name":"string","suggestedWeight":number,"rationale":"string"}`;
      return (await this.openrouter.generateStructuredJson(sys, JSON.stringify(currentParameters))) as any;
    }
  }

  /**
   * Probe and diagnose both AI endpoints
   */
  public async probeDualProviders(): Promise<{
    gemini: { status: 'healthy' | 'error'; latencyMs?: number; error?: string };
    openrouter: { status: 'healthy' | 'error'; model: string; latencyMs: number; error?: string };
  }> {
    // 1. Probe OpenRouter
    const orResult = await this.openrouter.probe();

    // 2. Probe Gemini
    let geminiStatus: { status: 'healthy' | 'error'; latencyMs?: number; error?: string } = {
      status: 'healthy',
      latencyMs: 0,
    };

    const gStart = Date.now();
    try {
      await this.gemini.generateStructuredJson(
        'Ping test.',
        'Return {"ping":"pong"}'
      );
      geminiStatus = { status: 'healthy', latencyMs: Date.now() - gStart };
    } catch (err: any) {
      geminiStatus = { status: 'error', latencyMs: Date.now() - gStart, error: err.message };
    }

    return {
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
