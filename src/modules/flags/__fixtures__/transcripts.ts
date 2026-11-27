/**
 * Fixture transcripts for flag engine tests. Each fixture is a
 * realistic call scenario exercising a specific detection path.
 * Timestamps are milliseconds (AssemblyAI convention).
 */
export interface FixtureSegment {
  speaker: string;
  text: string;
  start?: number;
  end?: number;
  confidence?: number;
}

export interface CallFixture {
  name: string;
  description: string;
  transcript: FixtureSegment[];
  /** Expected detections (flag types) from Stage 1 */
  expectedTypes: string[];
  expectNoCritical?: boolean;
  score?: number;
}

export const CLEAN_CALL: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Good afternoon, thank you for calling SecureLife Health Insurance. My name is Rahul.', start: 0, end: 4200, confidence: 0.98 },
  { speaker: 'Customer', text: 'Hi, I want to know about the family floater plan.', start: 4600, end: 8100, confidence: 0.96 },
  { speaker: 'Agent', text: 'Certainly. May I have your full name and registered mobile number for verification?', start: 8500, end: 13200, confidence: 0.97 },
  { speaker: 'Customer', text: 'My name is Anil Kumar and my number is 9876543210.', start: 13600, end: 17500, confidence: 0.95 },
  { speaker: 'Agent', text: 'Thank you, Anil. The family floater plan covers you, your spouse and two children with a sum insured of five lakh rupees. The premium is two thousand rupees per year with a waiting period of thirty days.', start: 18000, end: 31500, confidence: 0.96 },
  { speaker: 'Customer', text: 'That sounds good. What is not covered?', start: 32000, end: 35400, confidence: 0.94 },
  { speaker: 'Agent', text: 'Pre-existing diseases are covered after a waiting period of three years. Let me confirm this call is recorded for quality purposes. Do you have any other questions?', start: 35800, end: 46000, confidence: 0.97 },
  { speaker: 'Customer', text: 'No, that is all. Thank you.', start: 46500, end: 48900, confidence: 0.95 },
  { speaker: 'Agent', text: 'Thank you for calling SecureLife. Have a great day.', start: 49300, end: 52500, confidence: 0.98 },
];

export const DOLO_WRONG_MEDICATION: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Good afternoon, this is Rahul from HealthFirst Pharmacy support.', start: 0, end: 3800, confidence: 0.97 },
  { speaker: 'Customer', text: 'Hi, I was told to take Dolo 650 for my fever.', start: 4200, end: 8900, confidence: 0.95 },
  { speaker: 'Agent', text: 'Yes, Dolo 500 is the same thing, you can take that instead.', start: 9300, end: 14200, confidence: 0.93 },
  { speaker: 'Customer', text: 'Oh okay, if you say so.', start: 15000, end: 17200, confidence: 0.91 },
  { speaker: 'Agent', text: 'Yes, no difference at all. Anything else?', start: 17800, end: 21000, confidence: 0.94 },
];

export const INTENT_MISUNDERSTANDING: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Thank you for calling StreamLine Telecom. How can I help?', start: 0, end: 3600, confidence: 0.97 },
  { speaker: 'Customer', text: 'I need the premium plan with unlimited data.', start: 4000, end: 8500, confidence: 0.96 },
  { speaker: 'Agent', text: 'Okay, you want the basic plan, let me set that up for you right away.', start: 9000, end: 14000, confidence: 0.92 },
  { speaker: 'Customer', text: 'No wait, I said premium.', start: 14600, end: 16800, confidence: 0.95 },
];

export const AGENT_MISINFORMATION: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Hello, this is Priya from SecureLife Insurance.', start: 0, end: 3200, confidence: 0.97 },
  { speaker: 'Customer', text: 'Hi, what is the waiting period for the family floater plan?', start: 3600, end: 8200, confidence: 0.96 },
  { speaker: 'Agent', text: 'There is no waiting period, coverage starts from day one for everything including pre-existing diseases.', start: 8700, end: 16500, confidence: 0.93 },
  { speaker: 'Customer', text: 'Really? That is great.', start: 17000, end: 19000, confidence: 0.9 },
];

export const COMPLIANCE_VIOLATION: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Hi, this is Arjun from QuickCash Loans.', start: 0, end: 3000, confidence: 0.96 },
  { speaker: 'Customer', text: 'I want a loan of two lakh rupees.', start: 3400, end: 6800, confidence: 0.95 },
  { speaker: 'Agent', text: 'Sure sir, I guarantee you will get hundred percent approval and there are no charges at all, trust me.', start: 7300, end: 14200, confidence: 0.92 },
];

export const PREMIUM_CONTRADICTION: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Good morning, SecureLife Insurance, this is Sneha.', start: 0, end: 3300, confidence: 0.97 },
  { speaker: 'Customer', text: 'My premium is ₹2,000 per year for the family floater, right?', start: 3700, end: 9500, confidence: 0.95 },
  { speaker: 'Agent', text: 'Yes, your premium is ₹5,000 per year.', start: 10000, end: 13800, confidence: 0.94 },
];

export const TRANSCRIPTION_AMBIGUITY: FixtureSegment[] = [
  { speaker: 'Agent', text: 'HealthFirst Pharmacy support, this is Aman.', start: 0, end: 3400, confidence: 0.95 },
  { speaker: 'Customer', text: 'I was told to take Dolo six-fifty.', start: 3800, end: 7900, confidence: 0.58 },
  { speaker: 'Agent', text: 'Yes, Dolo sixty is fine.', start: 8300, end: 11800, confidence: 0.55 },
];

export const HIGH_SCORE_CRITICAL_FLAG: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Good afternoon, thank you for calling SecureLife Health Insurance. My name is Rahul. How may I help you today?', start: 0, end: 4400, confidence: 0.98 },
  { speaker: 'Customer', text: 'Hi, the doctor told me to take Dolo 650 twice a day for my fever.', start: 4800, end: 10600, confidence: 0.96 },
  { speaker: 'Agent', text: 'Yes sir, Dolo 350 is the same, take that three times a day instead.', start: 11000, end: 17800, confidence: 0.93 },
  { speaker: 'Customer', text: 'Okay, thank you. Also I wanted to ask about my policy renewal.', start: 18200, end: 23400, confidence: 0.95 },
  { speaker: 'Agent', text: 'Of course. Your policy renews on the fifteenth of next month, and I have noted your preference for the family floater. Thank you for calling SecureLife, have a wonderful day.', start: 24000, end: 35500, confidence: 0.97 },
];

export const LOW_SCORE_NO_CRITICAL: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Hello.', start: 0, end: 900, confidence: 0.9 },
  { speaker: 'Customer', text: 'Hi, I need help with my policy document.', start: 1200, end: 4600, confidence: 0.93 },
  { speaker: 'Agent', text: 'Umm, hold on.', start: 5000, end: 6400, confidence: 0.85 },
  { speaker: 'Customer', text: 'Are you there?', start: 9000, end: 10200, confidence: 0.92 },
  { speaker: 'Agent', text: 'Yeah, check the website.', start: 13000, end: 15300, confidence: 0.88 },
  { speaker: 'Customer', text: 'Okay... thanks I guess.', start: 16000, end: 18200, confidence: 0.9 },
];

export const MULTIPLE_FLAGS_ONE_CALL: FixtureSegment[] = [
  { speaker: 'Agent', text: 'Hello, QuickSave Insurance, this is Vikram.', start: 0, end: 3200, confidence: 0.96 },
  { speaker: 'Customer', text: 'I need the premium plan, and my current premium is ₹2,000.', start: 3600, end: 9800, confidence: 0.95 },
  { speaker: 'Agent', text: 'Okay, the basic plan it is, and your premium is ₹5,000.', start: 10200, end: 16200, confidence: 0.92 },
  { speaker: 'Customer', text: 'That is not what I asked for.', start: 16800, end: 19200, confidence: 0.94 },
];

export const ALL_FIXTURES: Record<string, CallFixture> = {
  cleanCall: {
    name: 'Clean call',
    description: 'Well-handled call, no issues expected',
    transcript: CLEAN_CALL,
    expectedTypes: [],
    expectNoCritical: true,
    score: 94,
  },
  wrongMedication: {
    name: 'Wrong company information (Dolo 650 vs Dolo 500)',
    description: 'Customer states Dolo 650, agent claims Dolo 500 is the same',
    transcript: DOLO_WRONG_MEDICATION,
    expectedTypes: ['WRONG_MEDICATION_INFORMATION'],
    score: 91,
  },
  intentMisunderstanding: {
    name: 'Customer intent misunderstanding',
    description: 'Customer wants premium plan, agent signs up basic plan',
    transcript: INTENT_MISUNDERSTANDING,
    expectedTypes: ['CUSTOMER_INTENT_MISUNDERSTANDING'],
  },
  agentMisinformation: {
    name: 'Agent misinformation (waiting period)',
    description: 'Agent falsely claims no waiting period',
    transcript: AGENT_MISINFORMATION,
    expectedTypes: [],
  },
  complianceViolation: {
    name: 'Compliance violation (guaranteed approval)',
    description: 'Agent makes prohibited guarantee promises',
    transcript: COMPLIANCE_VIOLATION,
    expectedTypes: [],
  },
  premiumContradiction: {
    name: 'Company information mismatch (premium 2000 vs 5000)',
    description: 'Customer states ₹2,000 premium, agent affirms ₹5,000',
    transcript: PREMIUM_CONTRADICTION,
    expectedTypes: ['INFORMATION_MISMATCH'],
  },
  transcriptionAmbiguity: {
    name: 'Transcription ambiguity (six-fifty vs sixty)',
    description: 'Numeric mismatch that looks like an STT error, not agent error',
    transcript: TRANSCRIPTION_AMBIGUITY,
    expectedTypes: ['TRANSCRIPTION_AMBIGUITY'],
  },
  highScoreCriticalFlag: {
    name: 'High score but critical flag',
    description: 'Polite, compliant call containing one critical medication error',
    transcript: HIGH_SCORE_CRITICAL_FLAG,
    expectedTypes: ['WRONG_MEDICATION_INFORMATION'],
    score: 91,
  },
  lowScoreNoCritical: {
    name: 'Low score but no critical flag',
    description: 'Poor soft skills, no information integrity issues',
    transcript: LOW_SCORE_NO_CRITICAL,
    expectedTypes: [],
    expectNoCritical: true,
    score: 38,
  },
  multipleFlags: {
    name: 'Multiple flags in one call',
    description: 'Intent misunderstanding + premium contradiction in the same call',
    transcript: MULTIPLE_FLAGS_ONE_CALL,
    expectedTypes: ['CUSTOMER_INTENT_MISUNDERSTANDING', 'INFORMATION_MISMATCH'],
  },
};
