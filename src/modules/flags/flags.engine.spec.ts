import { describe, it, expect } from 'vitest';
import { runStageOneDetection } from './stage-one.detectors.js';
import {
  classifyConfidence,
  applyConfidenceGuard,
  requiresManagerAttention,
  aiFlagVerificationSchema,
} from './flags.types.js';
import { ALL_FIXTURES } from './__fixtures__/transcripts.js';

const EMPTY_SOP = { sopVersionId: null, sopText: '', keyFacts: [] };

function segmentsOf(fixtureName: string) {
  const fixture = ALL_FIXTURES[fixtureName];
  if (!fixture) throw new Error(`Unknown fixture: ${fixtureName}`);
  return fixture.transcript.map((t, i) => ({
    index: i,
    speaker: t.speaker,
    text: t.text,
    start: t.start,
    end: t.end,
    confidence: t.confidence,
  }));
}

describe('Stage 1 deterministic detection — fixture transcripts', () => {
  it('clean call produces no candidates', () => {
    const candidates = runStageOneDetection(segmentsOf('cleanCall'), EMPTY_SOP);
    expect(candidates.length).toBe(0);
  });

  it('Dolo 650 vs Dolo 500 is detected as wrong medication information', () => {
    const candidates = runStageOneDetection(segmentsOf('wrongMedication'), EMPTY_SOP);
    const med = candidates.find((c) => c.flag_type === 'WRONG_MEDICATION_INFORMATION');
    expect(med).toBeDefined();
    expect(med?.severity).toBe('CRITICAL');
    expect(med?.customer_statement).toContain('Dolo 650');
    expect(med?.agent_statement).toContain('Dolo 500');
    expect(med?.evidence_start_time).toBe(4200);
    expect(med?.evidence_end_time).toBe(14200);
  });

  it('premium plan vs basic plan is detected as intent misunderstanding', () => {
    const candidates = runStageOneDetection(segmentsOf('intentMisunderstanding'), EMPTY_SOP);
    const intent = candidates.find((c) => c.flag_type === 'CUSTOMER_INTENT_MISUNDERSTANDING');
    expect(intent).toBeDefined();
    expect(intent?.severity).toBe('HIGH');
    expect(intent?.customer_statement).toContain('premium plan');
    expect(intent?.agent_statement).toContain('basic plan');
  });

  it('premium ₹2,000 vs ₹5,000 is detected as information mismatch', () => {
    const candidates = runStageOneDetection(segmentsOf('premiumContradiction'), EMPTY_SOP);
    const mismatch = candidates.find((c) => c.flag_type === 'INFORMATION_MISMATCH');
    expect(mismatch).toBeDefined();
    expect(mismatch?.customer_statement).toContain('2,000');
    expect(mismatch?.agent_statement).toContain('5,000');
  });

  it('"Dolo six-fifty" vs "Dolo sixty" is classified as transcription ambiguity, not agent error', () => {
    const candidates = runStageOneDetection(segmentsOf('transcriptionAmbiguity'), EMPTY_SOP);
    const ambiguity = candidates.find((c) => c.flag_type === 'TRANSCRIPTION_AMBIGUITY');
    expect(ambiguity).toBeDefined();
    // Must NOT be treated as a confirmed agent error
    expect(ambiguity?.severity).not.toBe('CRITICAL');
    expect(ambiguity?.initial_confidence).toBeLessThan(0.6);
  });

  it('high score / critical flag scenario still detects the medication issue', () => {
    const candidates = runStageOneDetection(segmentsOf('highScoreCriticalFlag'), EMPTY_SOP);
    expect(candidates.some((c) => c.flag_type === 'WRONG_MEDICATION_INFORMATION')).toBe(true);
  });

  it('low score / no critical scenario produces no critical candidates', () => {
    const candidates = runStageOneDetection(segmentsOf('lowScoreNoCritical'), EMPTY_SOP);
    expect(candidates.some((c) => c.severity === 'CRITICAL')).toBe(false);
  });

  it('multiple flags in one call are all detected', () => {
    const candidates = runStageOneDetection(segmentsOf('multipleFlags'), EMPTY_SOP);
    const types = candidates.map((c) => c.flag_type);
    expect(types).toContain('CUSTOMER_INTENT_MISUNDERSTANDING');
    expect(types).toContain('INFORMATION_MISMATCH');
  });
});

describe('SOP fact conflict detection', () => {
  it('agent figure conflicting with an SOP key fact is flagged CRITICAL', () => {
    const sop = {
      sopVersionId: null,
      sopText: '',
      keyFacts: [{ subject: 'premium', value: '₹2,000' }],
    };
    const segments = segmentsOf('premiumContradiction');
    const candidates = runStageOneDetection(segments, sop);
    const conflict = candidates.find((c) => c.detector === 'sop-fact-conflict');
    expect(conflict).toBeDefined();
    expect(conflict?.severity).toBe('CRITICAL');
    expect(conflict?.expected_information).toContain('2,000');
  });

  it('agent figure matching the SOP key fact is not flagged', () => {
    const sop = {
      sopVersionId: null,
      sopText: '',
      keyFacts: [{ subject: 'premium', value: '₹5,000' }],
    };
    const segments = segmentsOf('premiumContradiction');
    const candidates = runStageOneDetection(segments, sop);
    expect(candidates.filter((c) => c.detector === 'sop-fact-conflict').length).toBe(0);
  });

  it('missing mandatory disclosure phrase is flagged', () => {
    const sop = {
      sopVersionId: null,
      sopText: '',
      keyFacts: [{ subject: 'required-phrase:recording-disclosure', value: 'this call is recorded' }],
    };
    const segments = segmentsOf('complianceViolation'); // agent never says "recorded"
    const candidates = runStageOneDetection(segments, sop);
    const disclosure = candidates.find((c) => c.flag_type === 'MANDATORY_DISCLOSURE_MISSED');
    expect(disclosure).toBeDefined();
    expect(disclosure?.severity).toBe('HIGH');
  });
});

describe('Confidence classification and severity guards', () => {
  it('classifies confidence levels', () => {
    expect(classifyConfidence(0.97)).toBe('HIGH');
    expect(classifyConfidence(0.7)).toBe('MEDIUM');
    expect(classifyConfidence(0.3)).toBe('LOW');
  });

  it('downgrades LOW-confidence CRITICAL to MEDIUM — never auto-blames with weak evidence', () => {
    expect(applyConfidenceGuard('CRITICAL', 'LOW')).toBe('MEDIUM');
    expect(applyConfidenceGuard('HIGH', 'LOW')).toBe('MEDIUM');
    expect(applyConfidenceGuard('CRITICAL', 'HIGH')).toBe('CRITICAL');
    expect(applyConfidenceGuard('MEDIUM', 'LOW')).toBe('MEDIUM');
  });

  it('manager attention requires CRITICAL/HIGH severity with non-LOW confidence', () => {
    expect(requiresManagerAttention('CRITICAL', 'HIGH')).toBe(true);
    expect(requiresManagerAttention('CRITICAL', 'LOW')).toBe(false);
    expect(requiresManagerAttention('MEDIUM', 'HIGH')).toBe(false);
    expect(requiresManagerAttention('INFO', 'HIGH')).toBe(false);
  });
});

describe('AI output strict JSON validation', () => {
  const validFlag = {
    type: 'AGENT_MISINFORMATION',
    severity: 'HIGH',
    confidence: 0.94,
    title: 'Potential misinformation',
    description: 'Agent stated a dosage inconsistent with customer-provided information.',
    customerStatement: 'I was told to take Dolo 650.',
    agentStatement: 'Dolo 500 is the same thing.',
    expectedInformation: null,
    actualInformation: 'Dolo 500 is the same thing.',
    evidence: 'Segments 1-2',
    startTime: 4200,
    endTime: 14200,
    transcriptSegmentId: '2',
    aiReasoning: 'Customer and agent dosages differ.',
    recommendedAction: 'QA review and coaching.',
    isTranscriptionAmbiguity: false,
  };

  it('accepts a well-formed AI response', () => {
    const result = aiFlagVerificationSchema.safeParse({ flags: [validFlag] });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown flag type', () => {
    const result = aiFlagVerificationSchema.safeParse({
      flags: [{ ...validFlag, type: 'NOT_A_REAL_TYPE' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects confidence out of range', () => {
    const result = aiFlagVerificationSchema.safeParse({
      flags: [{ ...validFlag, confidence: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title: _title, ...noTitle } = validFlag;
    const result = aiFlagVerificationSchema.safeParse({ flags: [noTitle] });
    expect(result.success).toBe(false);
  });

  it('rejects garbage non-JSON shapes', () => {
    const result = aiFlagVerificationSchema.safeParse({ nonsense: true });
    expect(result.success).toBe(false);
  });

  it('applies defaults for optional evidence fields', () => {
    const result = aiFlagVerificationSchema.parse({
      flags: [{ type: 'OTHER', severity: 'INFO', confidence: 0.4, title: 'Note' }],
    });
    expect(result.flags[0]?.description).toBe('');
    expect(result.flags[0]?.isTranscriptionAmbiguity).toBe(false);
  });
});

describe('Detector robustness', () => {
  it('returns empty for empty transcript', () => {
    expect(runStageOneDetection([], EMPTY_SOP)).toHaveLength(0);
  });

  it('deduplicates candidates by dedup_key across detectors', () => {
    // premiumContradiction can trigger both entity-numeric and fact-contradiction
    // detectors on the same segment; results must be deduplicated.
    const candidates = runStageOneDetection(segmentsOf('premiumContradiction'), EMPTY_SOP);
    const keys = candidates.map((c) => c.dedup_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('caps candidates at 15 to bound Stage 2 prompt size', () => {
    const long: Array<{ index: number; speaker: string; text: string; start?: number; end?: number }> = [];
    for (let i = 0; i < 60; i++) {
      long.push({ index: i * 2, speaker: 'Customer', text: `My premium is ₹${1000 + i}.`, start: i * 4000, end: i * 4000 + 3000 });
      long.push({ index: i * 2 + 1, speaker: 'Agent', text: `Yes, your premium is ₹${9000 + i}.`, start: i * 4000 + 3200, end: i * 4000 + 6000 });
    }
    const candidates = runStageOneDetection(long, EMPTY_SOP);
    expect(candidates.length).toBeLessThanOrEqual(15);
  });
});
