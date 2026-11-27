import { supabaseAdminClient } from '../src/core/config/supabase.admin.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * AuditAI Demo User Provisioning Script
 *
 * Securely provisions or manages a customer pilot user via Supabase Auth admin API.
 * NEVER hardcodes credentials in source code or commits them to Git.
 *
 * Usage:
 *   npx tsx scripts/provision-demo-user.ts --email user@example.com --password "SECRET_PASS" [--tenant-id UUID] [--role ANALYST|MANAGER|VIEWER]
 *   Or supply via env vars:
 *   DEMO_EMAIL=user@example.com DEMO_PASSWORD="SECRET_PASS" npx tsx scripts/provision-demo-user.ts
 *
 * To suspend/disable access after the pilot:
 *   npx tsx scripts/provision-demo-user.ts --email user@example.com --disable
 */

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--disable') {
      parsed.disable = true;
    } else if (arg?.startsWith('--') && args[i + 1] && !args[i + 1]?.startsWith('--')) {
      const key = arg.slice(2);
      parsed[key] = args[i + 1]!;
      i++;
    }
  }

  return {
    email: (parsed.email as string) || process.env.DEMO_EMAIL || '',
    password: (parsed.password as string) || process.env.DEMO_PASSWORD || '',
    tenantId: (parsed['tenant-id'] as string) || process.env.DEMO_TENANT_ID || '',
    role: ((parsed.role as string) || process.env.DEMO_ROLE || 'ANALYST').toUpperCase(),
    disable: Boolean(parsed.disable),
  };
}

async function main() {
  const { email, password, tenantId: cliTenantId, role, disable } = parseArgs();

  if (!email) {
    console.error('\n❌ Error: --email (or DEMO_EMAIL env var) is required.\n');
    console.log('Usage Examples:');
    console.log('  Create/Update: npx tsx scripts/provision-demo-user.ts --email demo@client.com --password "YourStrongPassword"');
    console.log('  Disable:       npx tsx scripts/provision-demo-user.ts --email demo@client.com --disable\n');
    process.exit(1);
  }

  // 1. Resolve tenant ID: default to first active client if not explicitly passed
  let targetTenantId = cliTenantId;
  if (!targetTenantId) {
    const { data: clients, error: clientErr } = await supabaseAdminClient
      .from('clients')
      .select('id, name')
      .order('created_at', { ascending: true })
      .limit(1);

    if (clientErr || !clients || clients.length === 0) {
      console.error('❌ Failed to find a valid tenant in clients table:', clientErr?.message || 'No clients found');
      process.exit(1);
    }

    targetTenantId = clients[0]!.id;
    console.log(`ℹ️  No tenant ID specified — using default pilot tenant: "${clients[0]!.name}" (${targetTenantId})`);
  } else {
    const { data: client, error: checkErr } = await supabaseAdminClient
      .from('clients')
      .select('id, name')
      .eq('id', targetTenantId)
      .maybeSingle();

    if (checkErr || !client) {
      console.error(`❌ Tenant ${targetTenantId} not found in database.`);
      process.exit(1);
    }
    console.log(`ℹ️  Target pilot tenant: "${client.name}" (${client.id})`);
  }

  // 2. Lookup if user already exists in Supabase Auth
  const { data: existingUsers } = await supabaseAdminClient.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (disable) {
    if (!existingUser) {
      console.log(`⚠️ User with email "${email}" not found in Supabase Auth.`);
      return;
    }

    console.log(`🔒 Disabling access for user ${email}...`);
    // Suspend tenant membership
    await supabaseAdminClient
      .from('tenant_memberships')
      .update({ status: 'SUSPENDED' })
      .eq('user_id', existingUser.id)
      .eq('tenant_id', targetTenantId);

    console.log(`✅ Tenant membership for ${email} has been SUSPENDED.`);
    console.log(`   The user will no longer be permitted to access tenant ${targetTenantId}.`);
    return;
  }

  if (!password) {
    console.error('❌ Error: --password (or DEMO_PASSWORD env var) is required to provision an account.');
    process.exit(1);
  }

  let userId: string;

  if (existingUser) {
    console.log(`ℹ️ User ${email} already exists in Supabase Auth. Updating password and email confirmation...`);
    const { data: updated, error: updateErr } = await supabaseAdminClient.auth.admin.updateUserById(
      existingUser.id,
      {
        password,
        email_confirm: true,
      }
    );
    if (updateErr) {
      console.error('❌ Failed to update user credentials:', updateErr.message);
      process.exit(1);
    }
    userId = updated.user.id;
    console.log(`✅ Credentials updated for user ID: ${userId}`);
  } else {
    console.log(`Creating user in Supabase Auth: ${email}...`);
    const { data: created, error: createErr } = await supabaseAdminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) {
      console.error('❌ Failed to create Supabase Auth user:', createErr.message);
      process.exit(1);
    }
    userId = created.user.id;
    console.log(`✅ Created Supabase Auth user with ID: ${userId}`);
  }

  // 3. Provision or reactivate tenant membership
  console.log(`Assigning role "${role}" for tenant ${targetTenantId}...`);
  const { error: memberErr } = await supabaseAdminClient
    .from('tenant_memberships')
    .upsert({
      tenant_id: targetTenantId,
      user_id: userId,
      role: role,
      status: 'ACTIVE',
    }, { onConflict: 'tenant_id,user_id' });

  if (memberErr) {
    console.error('❌ Failed to assign tenant membership:', memberErr.message);
    process.exit(1);
  }

  console.log('\n🎉 Demo User Successfully Provisioned!');
  console.log('──────────────────────────────────────────────────────');
  console.log(`  Email:       ${email}`);
  console.log(`  Tenant ID:   ${targetTenantId}`);
  console.log(`  Role:        ${role}`);
  console.log(`  Status:      ACTIVE`);
  console.log('──────────────────────────────────────────────────────');
  console.log('The user can now sign in on the frontend with their credentials.');
  console.log('To revoke access after the pilot, run:');
  console.log(`  npx tsx scripts/provision-demo-user.ts --email ${email} --disable\n`);
}

main().catch((err) => {
  console.error('Provisioning script error:', err.message);
  process.exit(1);
});
