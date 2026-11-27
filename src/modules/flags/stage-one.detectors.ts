import {
  FlagCandidate,
  FlagType,
} from './flags.types.js';

/**
 * Transcript representation used by all detectors and the AI verifier.
 * `start`/`end` are milliseconds (AssemblyAI convention).
 */
export interface TranscriptSegment {
  index: number;
  speaker: string;
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface SopKnowledge {
  sopVersionId: string | null;
  sopText: string;
  /** Extracted key facts the tenant marked as authoritative (e.g. approved product info, dosages, prices). */
  keyFacts: Array<{ subject: string; value: string }>;
}

/** Normalizes a raw speaker label to Agent / Customer. */
export function normalizeSpeaker(raw: string): 'Agent' | 'Customer' {
  const s = (raw || '').toLowerCase();
  if (s === 'a' || s === 'agent' || s.includes('agent')) return 'Agent';
  return 'Customer';
}

/* ------------------------------------------------------------------ */
/* Entity extraction (deterministic, Stage 1)                        */
/* ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  // Hyphenated spoken forms: "six-fifty" → 650
  'six-fifty': 650, 'five-fifty': 550, 'four-fifty': 450, 'three-fifty': 350,
  'two-fifty': 250, 'seven-fifty': 750, 'eight-fifty': 850, 'nine-fifty': 950,
};

/** Parse a numeric value with units from text, including spoken/hyphenated forms. */
export function extractNumbers(text: string): number[] {
  const values: number[] = [];

  // Digits with optional comma separators (2,000 / 650 / 5,000)
  for (const m of text.matchAll(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+(?:\.\d+)?\b/g)) {
    values.push(parseFloat(m[0].replace(/,/g, '')));
  }

  // Word / hyphenated numbers ("six-fifty", "two thousand")
  const lower = text.toLowerCase();
  for (const [word, val] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(lower)) values.push(val);
  }

  // Hyphenated compound like "six-fifty" handled above; also handle "650 mg"-style doses
  for (const m of text.matchAll(/\b(\d+)\s*mg\b/gi)) {
    if (m[1] !== undefined) values.push(parseInt(m[1], 10));
  }

  return values;
}

/** Known medication/product name suffixes used for entity extraction. */
const PRODUCT_TOKEN = /\b([A-Z][A-Za-z0-9]+(?:\s?\d{2,4})?)\b/g;

/** Extract candidate medication/product names (capitalized tokens possibly with dosage). */
export function extractProductEntities(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(PRODUCT_TOKEN)) {
    const token = m[1];
    if (token === undefined) continue;
    // Skip common sentence words
    if (['I', 'A', 'The', 'Yes', 'No', 'Okay', 'Ok', 'Hi', 'Hello', 'Thank', 'Please', 'Sir', 'Madam'].includes(token)) continue;
    found.push(token);
  }
  return found;
}

/** Fuzzy equality tolerant of spoken/hyphenated numeric variants: "six-fifty" vs 650 vs "650". */
export function numericValuesMatch(a: string, b: string): boolean {
  const av = extractNumbers(a);
  const bv = extractNumbers(b);
  if (av.length === 0 || bv.length === 0) return false;
  return av.some((x) => bv.some((y) => Math.abs(x - y) <= Math.max(1, Math.abs(x) * 0.02)));
}

/**
 * Detect whether two numeric values are *phonetically confusable* —
 * e.g. "six-fifty" (650) vs "sixty" (60), "fifty" (50) vs "fifteen" (15).
 * Used to classify potential transcription ambiguity instead of
 * blaming the agent.
 */
export function isPhoneticallyConfusable(a: string | number, b: string | number): boolean {
  const av = typeof a === 'number' ? [a] : extractNumbers(a);
  const bv = typeof b === 'number' ? [b] : extractNumbers(b);
  if (av.length === 0 || bv.length === 0) return false;
  return av.some((x) => bv.some((y) => valuesPhoneticallyConfusable(x, y)));
}

/** True when the two numbers sound alike when spoken. */
export function valuesPhoneticallyConfusable(x: number, y: number): boolean {
  // Tens vs teens sharing a root digit: "sixty"(60) vs "sixteen"(16), "fifty"(50) vs "fifteen"(15)
  const tensRoot = (v: number): number | null =>
    v >= 20 && v <= 90 && v % 10 === 0 ? v / 10 : null;
  const teenRoot = (v: number): number | null =>
    v >= 13 && v <= 19 ? v - 10 : null;
  if (tensRoot(x) !== null && tensRoot(x) === teenRoot(y)) return true;
  if (tensRoot(y) !== null && tensRoot(y) === teenRoot(x)) return true;

  // Hyphenated hundreds vs tens with the same leading digit:
  // "six-fifty"(650) vs "sixty"(60), "five-fifty"(550) vs "fifty"(50)
  const hyphenHundredsRoot = (v: number): number | null =>
    v >= 250 && v <= 950 && v % 100 === 50 ? Math.floor(v / 100) : null;
  const hx = hyphenHundredsRoot(x);
  if (hx !== null && y === hx * 10) return true;
  const hy = hyphenHundredsRoot(y);
  if (hy !== null && x === hy * 10) return true;

  return false;
}

/** Numeric equality tolerant of spoken variants, with 2% tolerance. */
export function doseValuesMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1, Math.abs(a) * 0.02);
}

/**
 * Extract (product, dose) pairs from text:
 *  - digit form:   "take Dolo 650" → { base: 'Dolo', dose: 650 }
 *  - spoken form:  "take Dolo six-fifty" → { base: 'Dolo', dose: 650 }
 *
 * Restricting to pairs (rather than free-floating numbers) prevents false
 * positives such as a customer's phone number next to an agent's
 * "two thousand rupees" — only numbers attached to the same product
 * name are compared.
 */
export function extractProductDoses(text: string): Array<{ base: string; dose: number }> {
  const pairs: Array<{ base: string; dose: number }> = [];

  // Digit doses: capitalized product name followed by a 2-4 digit number
  for (const m of text.matchAll(/\b([A-Z][A-Za-z]{2,})\s+(\d{2,4})\b/g)) {
    if (m[1] === undefined || m[2] === undefined) continue;
    pairs.push({ base: m[1], dose: parseInt(m[2], 10) });
  }

  // Spoken doses: capitalized product name followed by a number word
  // ("six-fifty", "sixty", "five hundred")
  for (const m of text.matchAll(/\b([A-Z][A-Za-z]{2,})\s+([a-z]+(?:-[a-z]+)?)\b/g)) {
    const base = m[1];
    if (base === undefined || m[2] === undefined) continue;
    const word = m[2].toLowerCase();
    const dose = NUMBER_WORDS[word];
    if (dose !== undefined) pairs.push({ base, dose });
  }

  return pairs;
}

/* ------------------------------------------------------------------ */
/* Stage-1 candidate detectors                                        */
/* ------------------------------------------------------------------ */

/**
 * Detector 1: Medication/product + numeric mismatch between adjacent
 * customer and agent statements.
 *
 * Customer: "I was told to take Dolo 650."
 * Agent:    "Yes, Dolo 500 is the same thing."
 *
 * Only numbers attached to the SAME product name are compared, and
 * phonetically confusable pairs (650 vs 60) are classified as potential
 * transcription ambiguity rather than agent error.
 */
function detectEntityNumericMismatch(segments: TranscriptSegment[]): FlagCandidate[] {
  const candidates: FlagCandidate[] = [];

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const cur = segments[i];
    if (!prev || !cur) continue;
    if (normalizeSpeaker(cur.speaker) !== 'Agent' || normalizeSpeaker(prev.speaker) !== 'Customer') continue;

    const customerText = prev.text;
    const agentText = cur.text;

    // Same product mentioned by both speakers?
    const customerProducts = extractProductDoses(customerText);
    const agentProducts = extractProductDoses(agentText);
    const sharedBases = customerProducts
      .map((p) => p.base.toLowerCase())
      .filter((base) => agentProducts.some((q) => q.base.toLowerCase() === base));
    if (sharedBases.length === 0) continue;

    // Compare doses attached to the shared product
    const base = sharedBases[0];
    if (!base) continue;
    const customerDoses = customerProducts.filter((p) => p.base.toLowerCase() === base).map((p) => p.dose);
    const agentDoses = agentProducts.filter((p) => p.base.toLowerCase() === base).map((p) => p.dose);
    if (customerDoses.length === 0 || agentDoses.length === 0) continue;

    const doseMatches = customerDoses.some((cd) => agentDoses.some((ad) => doseValuesMatch(cd, ad)));
    if (doseMatches) continue;

    const product = base.charAt(0).toUpperCase() + base.slice(1);
    const confusable = customerDoses.some((cd) => agentDoses.some((ad) => valuesPhoneticallyConfusable(cd, ad)));
    const flagType: FlagType = confusable ? 'TRANSCRIPTION_AMBIGUITY' : 'WRONG_MEDICATION_INFORMATION';

    candidates.push({
      detector: 'entity-numeric-mismatch',
      flag_type: flagType,
      category: /\b(mg|ml|dose|dosage|tablet|dolo|paracetamol|medicine|medication)\b/i.test(`${customerText} ${agentText}`)
        ? 'MEDICATION'
        : 'PRODUCT_INFORMATION',
      severity: confusable ? 'MEDIUM' : 'CRITICAL',
      title: confusable
        ? `Possible transcription ambiguity for ${product}`
        : `Potential ${product} information mismatch`,
      description: confusable
        ? `Customer mentioned "${customerText}" and agent responded with "${agentText}". The numeric values sound similar and may be a speech-to-text error rather than an agent error.`
        : `Customer stated "${customerText}" but agent responded with "${agentText}". The numeric detail attached to ${product} appears inconsistent and requires verification against approved guidance.`,
      customer_statement: customerText,
      agent_statement: agentText,
      actual_information: agentText,
      expected_information: customerText,
      evidence: `Customer: "${customerText}" → Agent: "${agentText}"`,
      evidence_start_time: prev.start ?? null,
      evidence_end_time: cur.end ?? null,
      transcript_segment_id: String(cur.index),
      initial_confidence: confusable ? 0.45 : 0.8,
      dedup_key: `entity-numeric:${base}:${cur.index}`,
    });
  }
  return candidates;
}

/**
 * Detector 2: Customer intent contradiction.
 *
 * Customer: "I need the premium plan."
 * Agent:    "Okay, you want the basic plan."
 */
const INTENT_PAIRS: Array<[RegExp, RegExp]> = [
  [/\b(premium|gold|top)[-\s]?(plan|tier|package)\b/i, /\b(basic|standard|silver|entry)[-\s]?(plan|tier|package)\b/i],
  [/\b(basic|standard|silver|entry)[-\s]?(plan|tier|package)\b/i, /\b(premium|gold|top)[-\s]?(plan|tier|package)\b/i],
  [/\b(upgrade|higher)\b/i, /\b(downgrade|lower|basic)\b/i],
  [/\bcancel(l)?(ation|ling)?\b/i, /\b(renew|continue|keep|extend)\b/i],
  [/\b(refund|money back)\b/i, /\b(exchange|replace|credit)\b/i],
];

function detectIntentMisunderstanding(segments: TranscriptSegment[]): FlagCandidate[] {
  const candidates: FlagCandidate[] = [];

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const cur = segments[i];
    if (!prev || !cur) continue;
    if (normalizeSpeaker(cur.speaker) !== 'Agent' || normalizeSpeaker(prev.speaker) !== 'Customer') continue;

    const wantsSecond = INTENT_PAIRS.some(
      ([wantRe, oppositeRe]) => wantRe.test(prev.text) && oppositeRe.test(cur.text),
    );
    if (!wantsSecond) continue;

    candidates.push({
      detector: 'intent-contradiction',
      flag_type: 'CUSTOMER_INTENT_MISUNDERSTANDING',
      category: 'INTENT',
      severity: 'HIGH',
      title: 'Customer intent possibly misunderstood by agent',
      description: `Customer expressed "${prev.text}" but agent responded as if the customer wanted the opposite: "${cur.text}".`,
      customer_statement: prev.text,
      agent_statement: cur.text,
      evidence: `Customer: "${prev.text}" → Agent: "${cur.text}"`,
      evidence_start_time: prev.start ?? null,
      evidence_end_time: cur.end ?? null,
      transcript_segment_id: String(cur.index),
      initial_confidence: 0.75,
      dedup_key: `intent:${cur.index}`,
    });
  }
  return candidates;
}

/**
 * Detector 3: Customer numeric fact contradicted by agent
 * (premiums, prices, dates, policy figures).
 *
 * Customer: "My premium is ₹2,000."
 * Agent:    "Yes, your premium is ₹5,000."
 */
const FINANCIAL_CONTEXT = /\b(premium|price|fee|cost|charge|amount|payment|rupees|rs\.?|₹|dollars|\$)\b/i;

function detectCustomerFactContradiction(segments: TranscriptSegment[]): FlagCandidate[] {
  const candidates: FlagCandidate[] = [];

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const cur = segments[i];
    if (!prev || !cur) continue;
    if (normalizeSpeaker(cur.speaker) !== 'Agent' || normalizeSpeaker(prev.speaker) !== 'Customer') continue;

    const bothFinancial = FINANCIAL_CONTEXT.test(prev.text) && FINANCIAL_CONTEXT.test(cur.text);
    if (!bothFinancial) continue;
    if (numericValuesMatch(prev.text, cur.text)) continue;
    if (extractNumbers(prev.text).length === 0 || extractNumbers(cur.text).length === 0) continue;

    // Agent affirming a different figure ("yes ... is X")
    const affirming = /^(yes|yeah|right|correct|that's right|sure|ok)/i.test(cur.text.trim());

    candidates.push({
      detector: 'customer-fact-contradiction',
      flag_type: 'INFORMATION_MISMATCH',
      category: 'COMPANY_INFORMATION',
      severity: 'HIGH',
      title: 'Potential company information mismatch',
      description: `Customer stated "${prev.text}" and agent ${affirming ? 'confirmed a different figure' : 'responded with'} "${cur.text}". If the approved company data says otherwise, this is a mismatch requiring verification.`,
      customer_statement: prev.text,
      agent_statement: cur.text,
      actual_information: cur.text,
      expected_information: prev.text,
      evidence: `Customer: "${prev.text}" → Agent: "${cur.text}"`,
      evidence_start_time: prev.start ?? null,
      evidence_end_time: cur.end ?? null,
      transcript_segment_id: String(cur.index),
      initial_confidence: 0.7,
      dedup_key: `fact-contradiction:${cur.index}`,
    });
  }
  return candidates;
}

/**
 * Detector 4: Mandatory disclosure phrase check against SOP key facts /
 * configured required phrases.
 */
function detectMissingDisclosures(
  segments: TranscriptSegment[],
  sop: SopKnowledge,
): FlagCandidate[] {
  const candidates: FlagCandidate[] = [];
  const agentText = segments
    .filter((s) => normalizeSpeaker(s.speaker) === 'Agent')
    .map((s) => s.text)
    .join(' ');

  for (const fact of sop.keyFacts) {
    if (!fact.subject.startsWith('required-phrase:')) continue;
    const phrase = fact.value;
    if (phrase && !agentText.toLowerCase().includes(phrase.toLowerCase())) {
      candidates.push({
        detector: 'mandatory-disclosure',
        flag_type: 'MANDATORY_DISCLOSURE_MISSED',
        category: 'COMPLIANCE',
        severity: 'HIGH',
        title: `Mandatory disclosure possibly missed: "${phrase}"`,
        description: `The SOP marks "${phrase}" as a mandatory disclosure, but it was not detected in the agent's statements during this call.`,
        expected_information: phrase,
        evidence: `Required phrase "${phrase}" not found in agent statements.`,
        initial_confidence: 0.9,
        dedup_key: `disclosure:${phrase.toLowerCase()}`,
      });
    }
  }
  return candidates;
}

/**
 * Detector 5: Agent statement conflicting with an explicit SOP key fact.
 * Example SOP fact: { subject: 'premium:family-floater', value: '₹2,000' }
 */
function detectSopFactConflict(
  segments: TranscriptSegment[],
  sop: SopKnowledge,
): FlagCandidate[] {
  const candidates: FlagCandidate[] = [];

  for (const fact of sop.keyFacts) {
    if (fact.subject.startsWith('required-phrase:')) continue;
    const factNumbers = extractNumbers(fact.value);
    if (factNumbers.length === 0) continue;

    for (const seg of segments) {
      if (normalizeSpeaker(seg.speaker) !== 'Agent') continue;
      // Only compare when the agent statement plausibly concerns the same subject
      const subjectKey = (fact.subject.split(':')[0] ?? '').toLowerCase();
      if (subjectKey && !seg.text.toLowerCase().includes(subjectKey)) continue;

      const agentNumbers = extractNumbers(seg.text);
      if (agentNumbers.length === 0) continue;
      if (numericValuesMatch(fact.value, seg.text)) continue;

      const confusable = isPhoneticallyConfusable(fact.value, seg.text);

      candidates.push({
        detector: 'sop-fact-conflict',
        flag_type: confusable ? 'TRANSCRIPTION_AMBIGUITY' : 'INFORMATION_MISMATCH',
        category: 'COMPANY_INFORMATION',
        severity: confusable ? 'MEDIUM' : 'CRITICAL',
        title: confusable
          ? `Possible transcription ambiguity for ${fact.subject}`
          : `Agent statement conflicts with approved information (${fact.subject})`,
        description: confusable
          ? `Agent said "${seg.text}" which sounds similar to the approved value "${fact.value}" for ${fact.subject}. This may be a transcription artifact rather than an agent error.`
          : `Approved company information for ${fact.subject} is "${fact.value}" but the agent stated "${seg.text}".`,
        agent_statement: seg.text,
        expected_information: fact.value,
        actual_information: seg.text,
        evidence: `Agent: "${seg.text}" vs approved: "${fact.value}" (${fact.subject})`,
        evidence_start_time: seg.start ?? null,
        evidence_end_time: seg.end ?? null,
        transcript_segment_id: String(seg.index),
        initial_confidence: confusable ? 0.5 : 0.85,
        dedup_key: `sop-fact:${fact.subject}:${seg.index}`,
      });
    }
  }
  return candidates;
}

/**
 * Stage 1 entry point: run all deterministic detectors over the
 * transcript. Returns candidate flags for AI semantic verification.
 * Candidate list is capped to keep Stage 2 prompts bounded.
 */
export function runStageOneDetection(
  segments: TranscriptSegment[],
  sop: SopKnowledge,
): FlagCandidate[] {
  const all = [
    ...detectEntityNumericMismatch(segments),
    ...detectIntentMisunderstanding(segments),
    ...detectCustomerFactContradiction(segments),
    ...detectMissingDisclosures(segments, sop),
    ...detectSopFactConflict(segments, sop),
  ];

  // Deduplicate by dedup_key, keep highest initial confidence
  const byKey = new Map<string, FlagCandidate>();
  for (const c of all) {
    const existing = byKey.get(c.dedup_key);
    if (!existing || c.initial_confidence > existing.initial_confidence) {
      byKey.set(c.dedup_key, c);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.initial_confidence - a.initial_confidence)
    .slice(0, 15);
}
