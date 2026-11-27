import { afterEach, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, secretMetadata } from './secret-crypto.js';

const originalKey = process.env.INTEGRATION_ENCRYPTION_KEY;
const testKey = Buffer.alloc(32, 7).toString('base64');

afterEach(() => {
  if (originalKey === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY;
  else process.env.INTEGRATION_ENCRYPTION_KEY = originalKey;
});

describe('tenant credential encryption', () => {
  it('round-trips a secret without retaining it in the envelope', () => {
    process.env.INTEGRATION_ENCRYPTION_KEY = testKey;
    const secret = 'assemblyai-secret-value';
    const encrypted = encryptSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptSecret(encrypted)).toBe(secret);
  });

  it('exposes only non-secret display metadata', () => {
    expect(secretMetadata('abcdefgh1234')).toMatchObject({ last4: '1234' });
    expect(secretMetadata('abcdefgh1234').fingerprint).toHaveLength(12);
  });
});
