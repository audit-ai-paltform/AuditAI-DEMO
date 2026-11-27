import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { decryptSecret, encryptSecret, secretMetadata } from '../../common/security/secret-crypto.js';

export type ProviderName = 'assemblyai' | 'gemini' | 'knowlarity';

export interface ProviderCredential {
  apiKey?: string;
  config?: Record<string, string>;
}

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Provider validation failed';
  return message.replace(/(?:api[_ -]?key|authorization|bearer)\s*[:=]\s*[^\s,]+/gi, '[redacted]').slice(0, 180);
}

async function timedFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class IntegrationsService {
  public async list(tenantId: string): Promise<Array<Record<string, unknown>>> {
    const { data, error } = await supabaseAdminClient
      .from('tenant_integrations')
      .select('provider,status,key_last4,key_fingerprint,config,validated_at,updated_at')
      .eq('tenant_id', tenantId)
      .order('provider');
    if (error) throw new Error('Unable to load integrations');
    return data ?? [];
  }

  public async test(provider: ProviderName, credential: ProviderCredential): Promise<{ valid: boolean; message: string }> {
    if (provider === 'knowlarity') {
      // The current repository contains no Knowlarity API contract. Do not invent a request that could leak a client secret.
      return { valid: false, message: 'Knowlarity validation requires the provider endpoint and authentication contract to be configured by an administrator.' };
    }
    const apiKey = credential.apiKey?.trim();
    if (!apiKey) return { valid: false, message: 'An API key is required.' };
    try {
      const response = provider === 'assemblyai'
        ? await timedFetch('https://api.assemblyai.com/v2/transcript?limit=1', { headers: { authorization: apiKey } })
        : await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {});
      if (!response.ok) return { valid: false, message: `Provider rejected the credential (${response.status}).` };
      return { valid: true, message: 'Credential validated.' };
    } catch (error) {
      return { valid: false, message: sanitizeProviderError(error) === 'This operation was aborted' ? 'Provider validation timed out.' : 'Provider validation could not be completed.' };
    }
  }

  public async save(tenantId: string | undefined, provider: ProviderName, credential: ProviderCredential): Promise<Record<string, unknown>> {
    if (!tenantId) throw new Error('Tenant context is required');
    if (!process.env.INTEGRATION_ENCRYPTION_KEY) throw new Error('Secure integration key management is not configured');
    if (provider === 'knowlarity') throw new Error('Knowlarity cannot be saved until its verified authentication contract is configured');
    const apiKey = credential.apiKey?.trim();
    if (!apiKey) throw new Error('An API key is required');
    const test = await this.test(provider, { apiKey });
    if (!test.valid) throw new Error(test.message);
    const metadata = secretMetadata(apiKey);
    const { data, error } = await supabaseAdminClient
      .from('tenant_integrations')
      .upsert({
        tenant_id: tenantId,
        provider,
        encrypted_secret: encryptSecret(apiKey),
        key_last4: metadata.last4,
        key_fingerprint: metadata.fingerprint,
        config: credential.config ?? {},
        status: 'VALID',
        validated_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,provider' })
      .select('provider,status,key_last4,key_fingerprint,config,validated_at,updated_at')
      .single();
    if (error || !data) throw new Error('Unable to save integration');
    return data;
  }

  public async remove(tenantId: string, provider: ProviderName): Promise<void> {
    const { error } = await supabaseAdminClient.from('tenant_integrations').delete().eq('tenant_id', tenantId).eq('provider', provider);
    if (error) throw new Error('Unable to remove integration');
  }

  /** Used exclusively by server-side jobs; it never returns a secret to HTTP callers. */
  public async credentialFor(tenantId: string, provider: ProviderName): Promise<string | null> {
    const { data, error } = await supabaseAdminClient.from('tenant_integrations').select('encrypted_secret,status').eq('tenant_id', tenantId).eq('provider', provider).maybeSingle();
    if (error || !data || data.status !== 'VALID') return null;
    return decryptSecret(data.encrypted_secret);
  }
}

export const integrationsService = new IntegrationsService();
