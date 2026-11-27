import { AssemblyAI, TranscriptUtterance } from 'assemblyai';
import dotenv from 'dotenv';

dotenv.config();

export interface SpeakerTurn {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface AssemblyAITranscriptionResult {
  transcript_id: string;
  text: string;
  utterances: SpeakerTurn[];
  confidence: number;
  language: string;
  duration?: number;
  status: 'completed' | 'error';
  error?: string;
}

function redactSecret(str: string): string {
  return str.replace(/[a-f0-9]{32}/gi, '[redacted-key]');
}

export class AssemblyAIProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY || '';
  }

  private getCandidateKeys(tenantApiKey?: string): string[] {
    if (tenantApiKey) return [tenantApiKey];
    const primary = this.apiKey;
    const fallbacks = (process.env.ASSEMBLYAI_FALLBACK_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && k !== 'sample_assemblyai_key' && k !== primary);
    return [primary, ...fallbacks].filter((k) => k && k !== 'sample_assemblyai_key');
  }

  /**
   * Submits public audio recording URL to AssemblyAI and polls until completion
   */
  async transcribeAudio(audioUrl: string, tenantApiKey?: string): Promise<AssemblyAITranscriptionResult> {
    const candidateKeys = this.getCandidateKeys(tenantApiKey);
    if (candidateKeys.length === 0) {
      throw new Error('ASSEMBLYAI_API_KEY is missing or invalid — cannot transcribe this recording');
    }

    let lastError: Error | null = null;

    for (let i = 0; i < candidateKeys.length; i++) {
      const apiKey = candidateKeys[i]!;
      const client = new AssemblyAI({ apiKey });

      try {
        const transcript = await client.transcripts.transcribe({
          audio: audioUrl,
          speaker_labels: true,
          language_detection: true,
          punctuate: true,
          format_text: true,
        });

        if (transcript.status === 'error') {
          throw new Error(`AssemblyAI Error: ${transcript.error}`);
        }

        const utterances: SpeakerTurn[] = (transcript.utterances || []).map((u: TranscriptUtterance) => ({
          speaker: u.speaker,
          text: u.text,
          start: u.start,
          end: u.end,
          confidence: u.confidence,
        }));

        return {
          transcript_id: transcript.id,
          text: transcript.text || '',
          utterances,
          confidence: transcript.confidence || 0.95,
          language: transcript.language_code || 'en_us',
          duration: transcript.audio_duration || 0,
          status: 'completed',
        };
      } catch (err: any) {
        const cleanMsg = redactSecret(err.message || String(err));
        lastError = new Error(cleanMsg);
        console.warn(`[AssemblyAIProvider] Key ${i + 1}/${candidateKeys.length} failed: ${cleanMsg}`);

        const isRecoverable =
          cleanMsg.includes('429') ||
          cleanMsg.includes('quota') ||
          cleanMsg.includes('rate limit') ||
          cleanMsg.includes('503') ||
          cleanMsg.includes('ETIMEDOUT') ||
          cleanMsg.includes('ECONNRESET');

        if (isRecoverable && i < candidateKeys.length - 1) {
          continue;
        }
        break;
      }
    }

    throw new Error(`AssemblyAI Transcription failed: ${lastError?.message || 'Unknown error'}`);
  }
}

export const assemblyAIProvider = new AssemblyAIProvider();
