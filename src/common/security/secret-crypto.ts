import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

function encryptionKey(): Buffer {
  const configured = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!configured) throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(configured, 'base64');
  if (key.length !== 32) throw new Error('INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return key;
}

/** Versioned AES-GCM envelope. Keys remain exclusively in server-side secrets. */
export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptSecret(envelope: string): string {
  const [version, ivValue, tagValue, ciphertextValue] = envelope.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) throw new Error('Invalid encrypted secret envelope');
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, 'base64url')), decipher.final()]).toString('utf8');
}

export function secretMetadata(secret: string): { last4: string; fingerprint: string } {
  return {
    last4: secret.slice(-4),
    fingerprint: crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12),
  };
}
