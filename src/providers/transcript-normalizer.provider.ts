import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { logger } from '../core/config/logger.config.js';

dotenv.config();

export interface UtteranceItem {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

// Common Devanagari word mappings for deterministic fallback
const FALLBACK_WORD_MAP: Record<string, string> = {
  'सर': 'Sir',
  'मैडम': 'Madam',
  'मुझे': 'mujhe',
  'अपना': 'apna',
  'ऑर्डर': 'order',
  'अभी': 'abhi',
  'तक': 'tak',
  'नहीं': 'nahi',
  'मिला': 'mila',
  'था': 'tha',
  'आपका': 'aapka',
  'कहाँ': 'kahan',
  'जा': 'ja',
  'रहे': 'rahe',
  'हैं': 'hain',
  'है': 'hai',
  'हो': 'ho',
  'क्या': 'kya',
  'आप': 'aap',
  'कब': 'kab',
  'आएगा': 'aayega',
  'किया': 'kiya',
  'कर': 'kar',
  'दीजिये': 'dejiye',
  'धन्यवाद': 'dhanyawad',
  'नमस्ते': 'namaste',
};

// Devanagari character transliteration table for fallback
function fallbackDevanagariToRoman(text: string): string {
  if (!DEVANAGARI_REGEX.test(text)) return text;

  let result = text;
  // Replace known common words first
  Object.keys(FALLBACK_WORD_MAP).forEach((word) => {
    const replacement = FALLBACK_WORD_MAP[word] || '';
    const regex = new RegExp(word, 'g');
    result = result.replace(regex, replacement);
  });

  if (!DEVANAGARI_REGEX.test(result)) return result;

  // Character mapping fallback
  const charMap: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
    'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
    'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'ny',
    'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
    'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
    'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
    'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
    'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ं': 'n', 'ः': 'h', '्': '',
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4', '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
    '।': '.', '॥': '.'
  };

  return result.split('').map((char) => charMap[char] || char).join('');
}

export class TranscriptNormalizerProvider {
  private apiKey: string;
  private model = 'gemini-3.6-flash';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  private getClient(): GoogleGenAI | null {
    if (!this.apiKey || this.apiKey === 'sample_gemini_api_key') return null;
    return new GoogleGenAI({ apiKey: this.apiKey });
  }

  /**
   * Normalizes an array of transcript utterances.
   * Converts any Devanagari Hindi text to Roman Hindi (Latin characters).
   * Preserves English words, Hinglish, speaker tags, timestamps, and numbers.
   */
  async normalizeUtterances(utterances: UtteranceItem[]): Promise<UtteranceItem[]> {
    if (!utterances || utterances.length === 0) return [];

    // Filter index of utterances that actually contain Devanagari text
    const devanagariIndices: number[] = [];
    const textsToNormalize: string[] = [];

    utterances.forEach((u, i) => {
      if (u.text && DEVANAGARI_REGEX.test(u.text)) {
        devanagariIndices.push(i);
        textsToNormalize.push(u.text);
      }
    });

    // If no Devanagari characters are present (pure English transcript), return as-is immediately!
    if (devanagariIndices.length === 0) {
      logger.info('[TranscriptNormalizer] Transcript contains no Devanagari text. Preserving pure English transcript.');
      return utterances;
    }

    logger.info({ devanagariCount: devanagariIndices.length, totalUtterances: utterances.length }, '[TranscriptNormalizer] Found Devanagari script text in utterances. Starting Roman Hindi transliteration...');

    let normalizedTexts: string[] = [];
    const client = this.getClient();

    if (client) {
      try {
        const sysInstruction = `You are a specialized Hindi/Hinglish Transliteration Engine.
Your task is to convert Devanagari Hindi text into Roman Hindi (Latin characters / English alphabet).

CRITICAL RULES:
1. TRANSLITERATE ONLY. DO NOT TRANSLATE Hindi words into English.
   Example: Convert 'आप कहाँ जा रहे हैं?' into 'Aap kahan ja rahe hain?', NOT 'Where are you going?'.
   Example: Convert 'सर, मुझे अपना ऑर्डर अभी तक नहीं मिला।' into 'Sir, mujhe apna order abhi tak nahi mila.', NOT 'Sir, I have not received my order yet.'
2. PRESERVE ENGLISH WORDS: Keep any existing English words (e.g., 'order', 'status', 'verification', 'number', 'account') exactly as English.
3. PRESERVE NUMBERS, PUNCTUATION, AND CAPITALIZATION: Do not alter numbers, caller codes, or product names.
4. RETURN ONLY VALID RAW JSON: Output a JSON array of strings matching the input array order. No markdown formatting or code blocks.`;

        const prompt = `Input Devanagari texts to transliterate to Roman Hindi:\n${JSON.stringify(textsToNormalize, null, 2)}`;

        let rawOutput = '';
        if (client.models && typeof client.models.generateContent === 'function') {
          const resp = await client.models.generateContent({
            model: this.model,
            contents: `${sysInstruction}\n\n${prompt}`,
          });
          rawOutput = resp?.text || '';
        }

        if (rawOutput) {
          const cleanJson = rawOutput.replace(/^```json/i, '').replace(/```$/, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length === textsToNormalize.length) {
            normalizedTexts = parsed;
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, '[TranscriptNormalizer] LLM transliteration warning - falling back to deterministic transliterator.');
      }
    }

    // Fallback if LLM output was incomplete or API key missing
    if (normalizedTexts.length !== textsToNormalize.length) {
      normalizedTexts = textsToNormalize.map((t) => fallbackDevanagariToRoman(t));
    }

    // Reconstruct utterances with normalized Roman Hindi text
    const result: UtteranceItem[] = utterances.map((u) => ({ ...u }));
    devanagariIndices.forEach((idx, i) => {
      if (result[idx] && normalizedTexts[i] !== undefined) {
        result[idx].text = normalizedTexts[i];
      }
    });

    return result;
  }
}

export const transcriptNormalizerProvider = new TranscriptNormalizerProvider();
