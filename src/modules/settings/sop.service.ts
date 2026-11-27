import { geminiProvider } from '../../providers/gemini.provider.js';
import { tenantConfigService } from './tenant-config.service.js';
import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export class SopService {
  /**
   * Extract text from PDF, DOCX, or TXT file buffers.
   */
  public async extractTextFromFile(buffer: Buffer, fileName: string): Promise<string> {
    const lowerName = fileName.toLowerCase();

    if (lowerName.endsWith('.pdf')) {
      const pdfFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default;
      const pdfData = await pdfFn(buffer);
      return pdfData?.text || '';
    }

    if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
      const mammothResult = await mammoth.extractRawText({ buffer });
      return mammothResult.value || '';
    }

    // Default to UTF-8 text for .txt, .md, .csv etc.
    return buffer.toString('utf-8');
  }

  /**
   * Process raw text from an uploaded SOP file (PDF text, TXT, DOCX text).
   * Splits into sections, saves a new versioned SOP record, and extracts
   * recommended parameters using Gemini.
   */
  public async processUploadedSop(
    tenantId: string,
    process: string,
    language: string | undefined,
    rawText: string,
    createdBy = 'manager',
  ) {
    if (!rawText || !rawText.trim()) {
      throw new Error('SOP text content cannot be empty');
    }

    const sections = rawText
      .split(/\n\s*\n/)
      .map((block) => {
        const lines = block.trim().split('\n');
        const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'General Policy';
        const text = lines.slice(1).join(' ').trim() || lines[0] || '';
        return { title, text };
      })
      .filter((s) => s.text.length > 0);

    const version = await tenantConfigService.uploadSopVersion({
      tenantId,
      process: process || 'General',
      language: language || 'English',
      sections: sections.length > 0 ? sections : [{ title: 'Overview', text: rawText.trim() }],
      createdBy,
    });

    // Extract parameters using Gemini
    let extractedRules: Array<{ rule: string; suggestedWeight: number }> = [];
    try {
      extractedRules = await geminiProvider.extractAuditRules(rawText);
    } catch (err: any) {
      logger.warn({ err: err.message }, '[SopService] Gemini rule extraction notice, falling back to heuristic parameters');
      // Graceful fallback heuristics if Gemini is unavailable
      extractedRules = sections.slice(0, 6).map((sec, i) => ({
        rule: sec.title !== 'General Policy' ? sec.title : `Audit Criterion ${i + 1}`,
        suggestedWeight: Math.round(100 / Math.min(sections.length, 6)),
      }));
    }

    return {
      version,
      extracted_rules: extractedRules,
    };
  }

  /**
   * Approves extracted parameters and persists them into the existing `parameters` table.
   */
  public async approveParameters(
    tenantId: string,
    parameters: Array<{ name: string; weight: number }>,
  ) {
    if (!parameters || parameters.length === 0) {
      throw new Error('No parameters provided for approval');
    }

    const inserted: any[] = [];
    for (const p of parameters) {
      const { data, error } = await supabaseAdminClient
        .from('parameters')
        .insert({
          client_id: tenantId,
          name: p.name,
          weight: p.weight,
          enabled: true,
          ai_suggested: true,
        })
        .select('*')
        .single();

      if (!error && data) {
        inserted.push(data);
      }
    }

    return inserted;
  }
}

export const sopService = new SopService();
