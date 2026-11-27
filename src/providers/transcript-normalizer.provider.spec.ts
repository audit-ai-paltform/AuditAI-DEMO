import { describe, it, expect } from 'vitest';
import { transcriptNormalizerProvider } from './transcript-normalizer.provider.js';

describe('TranscriptNormalizerProvider', () => {
  it('should preserve pure English transcripts without modification', async () => {
    const input = [
      { speaker: 'Agent', text: 'Welcome to Platinum Rx. How can I help you?', start: 0, end: 3000 },
      { speaker: 'Customer', text: 'I am calling to check my order status.', start: 3500, end: 6000 },
    ];

    const result = await transcriptNormalizerProvider.normalizeUtterances(input);

    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe('Welcome to Platinum Rx. How can I help you?');
    expect(result[1]?.text).toBe('I am calling to check my order status.');
  });

  // This test exercises the real Gemini transliteration round-trip, so it
  // needs a network-sized timeout (the default 5s is too tight, especially
  // when the free-tier rate limit forces a short backoff).
  it('should transliterate Devanagari Hindi text to Roman Hindi (Latin script)', async () => {
    const input = [
      { speaker: 'Agent', text: 'Welcome to Platinum Rx.', start: 0, end: 2000 },
      { speaker: 'Customer', text: 'सर, मुझे अपना ऑर्डर अभी तक नहीं मिला।', start: 2500, end: 6000 },
    ];

    const result = await transcriptNormalizerProvider.normalizeUtterances(input);

    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe('Welcome to Platinum Rx.');
    // Devanagari words should be converted to Latin characters without changing meaning
    expect(result[1]?.text).not.toMatch(/[\u0900-\u097F]/);
    expect(result[1]?.text.toLowerCase()).toContain('sir');
    expect(result[1]?.text.toLowerCase()).toContain('order');
  }, 30000);
});
