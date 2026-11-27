import { supabaseAdminClient } from '../../core/config/supabase.admin.js';
import { logger } from '../../core/config/logger.config.js';

export type SetupState = 'NOT_CONFIGURED' | 'SETUP_IN_PROGRESS' | 'CONFIGURED' | 'REQUIRES_REVIEW';

export interface TenantConfigEntity {
  client_id: string;
  setup_state: SetupState;
  config_version: number;
  active_sop_version_id: string | null;
  activated_at: string | null;
  activated_by: string | null;
  flag_engine_enabled: boolean;
  critical_notify: boolean;
  high_notify: boolean;
  medium_notify: boolean;
  created_at: string;
  updated_at: string;
}

export interface SopVersionEntity {
  id: string;
  client_id: string;
  process: string;
  language: string;
  version_number: number;
  sections: Array<Record<string, unknown>>;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  created_by: string | null;
  created_at: string;
  activated_at: string | null;
  updated_at: string;
}

/**
 * Tenant configuration + SOP versioning service.
 *
 * Setup state is derived from the database — never React local state.
 * Every SOP upload creates a NEW immutable version; activation swaps
 * the tenant's active pointer and archives the previous version.
 * Historical calls keep their pinned sop_version_id so audits are
 * never retroactively re-evaluated.
 */
export class TenantConfigService {
  public async getConfig(tenantId: string): Promise<TenantConfigEntity> {
    const { data, error } = await supabaseAdminClient
      .from('tenant_config')
      .select('*')
      .eq('client_id', tenantId)
      .maybeSingle();

    if (error) throw new Error(`Tenant config lookup failed: ${error.message}`);
    if (data) return data as TenantConfigEntity;

    // Default row for first-time tenants (created lazily on first read)
    const { data: created, error: insertErr } = await supabaseAdminClient
      .from('tenant_config')
      .insert({ client_id: tenantId, setup_state: 'NOT_CONFIGURED' })
      .select('*')
      .maybeSingle();

    if (insertErr) throw new Error(`Tenant config create failed: ${insertErr.message}`);
    return created as TenantConfigEntity;
  }

  /** All SOP versions for a tenant (newest first). */
  public async listSopVersions(tenantId: string): Promise<SopVersionEntity[]> {
    const { data, error } = await supabaseAdminClient
      .from('sop_versions')
      .select('*')
      .eq('client_id', tenantId)
      .order('version_number', { ascending: false });
    if (error) throw new Error(`SOP version list failed: ${error.message}`);
    return (data || []) as SopVersionEntity[];
  }

  /**
   * Upload a new SOP version. Never overwrites: bumps version_number.
   */
  public async uploadSopVersion(dto: {
    tenantId: string;
    process: string;
    language?: string;
    sections: Array<Record<string, unknown>>;
    createdBy?: string;
  }): Promise<SopVersionEntity> {
    const { data: latest, error: latestErr } = await supabaseAdminClient
      .from('sop_versions')
      .select('version_number')
      .eq('client_id', dto.tenantId)
      .eq('process', dto.process)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) throw new Error(`SOP version lookup failed: ${latestErr.message}`);
    const nextVersion = (latest?.version_number || 0) + 1;

    const { data, error } = await supabaseAdminClient
      .from('sop_versions')
      .insert({
        client_id: dto.tenantId,
        process: dto.process,
        language: dto.language || 'English',
        version_number: nextVersion,
        sections: dto.sections,
        status: 'DRAFT',
        created_by: dto.createdBy ?? null,
      })
      .select('*')
      .single();

    if (error) throw new Error(`SOP version create failed: ${error.message}`);

    // Advance setup state if tenant has not completed setup yet
    await this.advanceSetupState(dto.tenantId);
    return data as SopVersionEntity;
  }

  /**
   * Activate a SOP version: archives the previous active version for the
   * same process, marks this one ACTIVE, and bumps the tenant config
   * version. In-flight and historical calls are unaffected.
   */
  public async activateSopVersion(tenantId: string, sopVersionId: string, activatedBy?: string): Promise<TenantConfigEntity> {
    const { data: version, error: vErr } = await supabaseAdminClient
      .from('sop_versions')
      .select('*')
      .eq('client_id', tenantId)
      .eq('id', sopVersionId)
      .maybeSingle();

    if (vErr || !version) throw new Error('SOP version not found for this tenant');

    // Archive current ACTIVE version for the same process
    await supabaseAdminClient
      .from('sop_versions')
      .update({ status: 'ARCHIVED' })
      .eq('client_id', tenantId)
      .eq('process', (version as SopVersionEntity).process)
      .eq('status', 'ACTIVE');

    const { error: actErr } = await supabaseAdminClient
      .from('sop_versions')
      .update({ status: 'ACTIVE', activated_at: new Date().toISOString() })
      .eq('id', sopVersionId);
    if (actErr) throw new Error(`SOP activation failed: ${actErr.message}`);

    const { data: config, error: cfgErr } = await supabaseAdminClient
      .from('tenant_config')
      .upsert({
        client_id: tenantId,
        active_sop_version_id: sopVersionId,
        config_version: await this.nextConfigVersion(tenantId),
        activated_at: new Date().toISOString(),
        activated_by: activatedBy ?? null,
      })
      .select('*')
      .single();

    if (cfgErr) throw new Error(`Tenant config update failed: ${cfgErr.message}`);

    logger.info({ tenantId, sopVersionId, configVersion: (config as TenantConfigEntity).config_version },
      '[TenantConfig] SOP version activated');
    return config as TenantConfigEntity;
  }

  /** Full setup activation (end of first-time setup flow). */
  public async activateConfiguration(
    tenantId: string,
    dto: { sopVersionId?: string; activatedBy?: string },
  ): Promise<TenantConfigEntity> {
    let config = await this.getConfig(tenantId);

    if (dto.sopVersionId && dto.sopVersionId !== config.active_sop_version_id) {
      config = await this.activateSopVersion(tenantId, dto.sopVersionId, dto.activatedBy);
    }

    const { data, error } = await supabaseAdminClient
      .from('tenant_config')
      .update({
        setup_state: 'CONFIGURED',
        config_version: config.config_version || await this.nextConfigVersion(tenantId),
        activated_at: new Date().toISOString(),
        activated_by: dto.activatedBy ?? null,
      })
      .eq('client_id', tenantId)
      .select('*')
      .single();

    if (error) throw new Error(`Configuration activation failed: ${error.message}`);
    return data as TenantConfigEntity;
  }

  /** Update notification/flag-engine preferences (Settings area). */
  public async updatePreferences(
    tenantId: string,
    prefs: Partial<Pick<TenantConfigEntity, 'flag_engine_enabled' | 'critical_notify' | 'high_notify' | 'medium_notify'>>,
  ): Promise<TenantConfigEntity> {
    // Ensure the tenant_config row exists (lazily created on first read)
    await this.getConfig(tenantId);

    const { data, error } = await supabaseAdminClient
      .from('tenant_config')
      .update(prefs)
      .eq('client_id', tenantId)
      .select('*')
      .single();
    if (error) throw new Error(`Preference update failed: ${error.message}`);
    return data as TenantConfigEntity;
  }

  private async nextConfigVersion(tenantId: string): Promise<number> {
    const config = await this.getConfig(tenantId);
    return (config.config_version || 0) + 1;
  }

  /** Move a tenant forward through setup states (never backward). */
  private async advanceSetupState(tenantId: string): Promise<void> {
    try {
      const config = await this.getConfig(tenantId);
      if (config.setup_state === 'NOT_CONFIGURED') {
        await supabaseAdminClient
          .from('tenant_config')
          .update({ setup_state: 'SETUP_IN_PROGRESS' })
          .eq('client_id', tenantId);
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, '[TenantConfig] Setup state advance notice');
    }
  }
}

export const tenantConfigService = new TenantConfigService();
