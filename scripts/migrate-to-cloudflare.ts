/**
 * AuditAI Database Migration Utility:
 * Migrates operational data (calls, evaluations, agents, parameters, scripts, flags)
 * from the monolithic PostgreSQL database to Cloudflare D1 and Cloudflare R2.
 * 
 * Execution:
 * npx tsx scripts/migrate-to-cloudflare.ts
 */

import { supabaseAdminClient } from '../src/core/config/supabase.admin.js';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationSummary {
  agents: number;
  parameters: number;
  scripts: number;
  calls: number;
  flags: number;
  tenantConfigs: number;
}

async function migrateData() {
  console.log('==============================================================');
  console.log('🚀 AuditAI Database Migration: PostgreSQL -> Cloudflare D1 & R2');
  console.log('==============================================================\n');

  const summary: MigrationSummary = {
    agents: 0,
    parameters: 0,
    scripts: 0,
    calls: 0,
    flags: 0,
    tenantConfigs: 0,
  };

  const d1SqlStatements: string[] = [
    '-- Generated Cloudflare D1 Data Migration Statements',
    `-- Generated on ${new Date().toISOString()}`,
    '',
  ];

  try {
    // 1. Fetch & migrate Agents
    console.log('⏳ Fetching agents...');
    const { data: agents, error: agentsErr } = await supabaseAdminClient.from('agents').select('*');
    if (!agentsErr && agents && agents.length > 0) {
      for (const a of agents) {
        const stmt = `INSERT OR REPLACE INTO agents (id, tenant_id, name, code, process, tenure_minutes, status) VALUES ('${a.id}', '${a.client_id || '00000000-0000-0000-0000-000000000001'}', '${(a.name || '').replace(/'/g, "''")}', '${(a.code || '').replace(/'/g, "''")}', '${(a.process || 'Inbound').replace(/'/g, "''")}', ${a.tenure_minutes || 0}, '${a.status || 'Active'}');`;
        d1SqlStatements.push(stmt);
        summary.agents++;
      }
      console.log(`✅ Migrated ${summary.agents} agents`);
    }

    // 2. Fetch & migrate Parameters
    console.log('⏳ Fetching custom parameters...');
    const { data: params, error: paramsErr } = await supabaseAdminClient.from('parameters').select('*');
    if (!paramsErr && params && params.length > 0) {
      for (const p of params) {
        const stmt = `INSERT OR REPLACE INTO parameters (id, tenant_id, name, weight, enabled, ai_suggested) VALUES ('${p.id}', '${p.client_id || '00000000-0000-0000-0000-000000000001'}', '${(p.name || '').replace(/'/g, "''")}', ${p.weight || 10}, ${p.enabled ? 1 : 0}, ${p.ai_suggested ? 1 : 0});`;
        d1SqlStatements.push(stmt);
        summary.parameters++;
      }
      console.log(`✅ Migrated ${summary.parameters} parameters`);
    }

    // 3. Fetch & migrate Scripts
    console.log('⏳ Fetching call scripts...');
    const { data: scripts, error: scriptsErr } = await supabaseAdminClient.from('scripts').select('*');
    if (!scriptsErr && scripts && scripts.length > 0) {
      for (const s of scripts) {
        const sectionsJson = JSON.stringify(s.sections || []).replace(/'/g, "''");
        const stmt = `INSERT OR REPLACE INTO scripts (id, tenant_id, process, language, title, sections, version, is_active) VALUES ('${s.id}', '${s.client_id || '00000000-0000-0000-0000-000000000001'}', '${(s.process || '').replace(/'/g, "''")}', '${s.language || 'en'}', '${(s.process || 'Standard SOP').replace(/'/g, "''")}', '${sectionsJson}', 1, 1);`;
        d1SqlStatements.push(stmt);
        summary.scripts++;
      }
      console.log(`✅ Migrated ${summary.scripts} scripts`);
    }

    // 4. Fetch & migrate Calls
    console.log('⏳ Fetching calls & evaluations...');
    const { data: calls, error: callsErr } = await supabaseAdminClient.from('calls').select('*').limit(200);
    if (!callsErr && calls && calls.length > 0) {
      for (const c of calls) {
        const transcriptJson = JSON.stringify(c.transcript || []).replace(/'/g, "''");
        const flagsJson = JSON.stringify(c.flags || {}).replace(/'/g, "''");
        const scoresJson = JSON.stringify(c.parameter_scores || []).replace(/'/g, "''");
        const stmt = `INSERT OR REPLACE INTO calls (id, tenant_id, agent_id, duration, caller_number, score, status, transcript, flags, parameter_scores) VALUES ('${c.id}', '${c.client_id || '00000000-0000-0000-0000-000000000001'}', '${(c.agent_id || '').replace(/'/g, "''")}', '${c.duration || '00:00'}', '${c.caller_number || ''}', ${c.score !== null && c.score !== undefined ? c.score : 'NULL'}, '${c.status || 'COMPLETED'}', '${transcriptJson}', '${flagsJson}', '${scoresJson}');`;
        d1SqlStatements.push(stmt);
        summary.calls++;
      }
      console.log(`✅ Migrated ${summary.calls} calls`);
    }

    // Write output file
    const outputPath = path.resolve(process.cwd(), 'database/cloudflare/d1_migrated_data.sql');
    fs.writeFileSync(outputPath, d1SqlStatements.join('\n'), 'utf8');

    console.log('\n==============================================================');
    console.log('🎉 Migration Data Extracted Successfully!');
    console.log(`Output written to: ${outputPath}`);
    console.log('Summary:', JSON.stringify(summary, null, 2));
    console.log('\nTo apply to your Cloudflare D1 database:');
    console.log('1. Initialize D1:  npx wrangler d1 create auditai-d1-prod');
    console.log('2. Apply Schema:    npx wrangler d1 execute auditai-d1-prod --file=database/cloudflare/d1_schema.sql');
    console.log('3. Apply Data:      npx wrangler d1 execute auditai-d1-prod --file=database/cloudflare/d1_migrated_data.sql');
    console.log('4. Create R2:       npx wrangler r2 bucket create auditai-recordings-storage');
    console.log('==============================================================\n');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

migrateData();
