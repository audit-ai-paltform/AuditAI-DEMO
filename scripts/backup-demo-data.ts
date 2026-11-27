import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const backupDir = path.resolve('backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `auditai-demo-data-backup-${timestamp}.json`);

    const callsRes = await client.query('SELECT * FROM public.calls ORDER BY created_at DESC;');
    const eventsRes = await client.query('SELECT * FROM public.call_processing_events ORDER BY created_at DESC;');
    const webhookRes = await client.query('SELECT * FROM public.webhook_events ORDER BY received_at DESC;');

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        calls: callsRes.rows.length,
        call_processing_events: eventsRes.rows.length,
        webhook_events: webhookRes.rows.length,
      },
      calls: callsRes.rows,
      call_processing_events: eventsRes.rows,
      webhook_events: webhookRes.rows,
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
    console.log(`✅ Backup successfully created at: ${backupFile}`);
    console.log(`Backed up: ${callsRes.rows.length} calls, ${eventsRes.rows.length} events, ${webhookRes.rows.length} webhook events.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

