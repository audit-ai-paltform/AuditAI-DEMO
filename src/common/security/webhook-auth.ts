import crypto from 'node:crypto';

export function constantTimeSecretMatch(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected || expected.startsWith('sample_')) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
