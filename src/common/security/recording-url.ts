import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateAddress(address: string): boolean {
  if (net.isIP(address) === 4) {
    const [a, b = -1] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const lower = address.toLowerCase();
  return lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:');
}

/** Rejects local, private, credential-bearing and non-HTTPS recording URLs. */
export async function assertSafeRecordingUrl(value: string, approvedHosts: string[]): Promise<URL> {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Recording URL must be an HTTPS URL without credentials or a custom port');
  const host = url.hostname.toLowerCase();
  if (!approvedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))) throw new Error('Recording host is not approved');
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) throw new Error('Recording URL resolves to a private or unsafe network');
  return url;
}
