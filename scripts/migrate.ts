import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log('\n⚠️  DATABASE_URL is not set in your .env file.');
    console.log('To run migrations automatically:');
    console.log('  1. Add your direct Supabase connection URL to .env:');
    console.log('     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.ixuutllrfapiawzumvvl.supabase.co:5432/postgres');
    console.log('  2. Run: npm run migrate\n');
    console.log('Alternatively, you can copy and run the SQL migration directly in the Supabase SQL Editor:');
    console.log(`  File: ${path.resolve(__dirname, '../database/migrations/011_call_evaluations_and_runs.sql')}\n`);
    return;
  }

  console.log('🔌 Connecting to Postgres using DATABASE_URL...');
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    console.log('✅ Connected to database. Ensuring migrations table exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationsDir = path.resolve(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`🔍 Found ${files.length} migration files in ${migrationsDir}`);

    for (const file of files) {
      const { rows } = await client.query('SELECT version FROM _schema_migrations WHERE version = $1', [file]);
      if (rows.length > 0) {
        console.log(`  [SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(`  [APPLYING] ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  [SUCCESS] ${file}`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed on ${file}:`, err.message);
        throw err;
      }
    }

    console.log('\n🎉 All migrations are up to date!\n');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
