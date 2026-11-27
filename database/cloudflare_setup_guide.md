# Cloudflare & Supabase Production Deployment & Schema Guide

This guide details how to configure and deploy:
1. **Cloudflare Worker** (Edge Gateway for D1 and R2)
2. **Cloudflare D1** (Serverless Distributed SQLite Relational Database)
3. **Cloudflare R2** (Zero-Egress Audio & File Vault)
4. **Supabase PostgreSQL** (Dedicated Identity, Authentication, and Multi-Tenant DB)

---

## 1. Cloudflare Worker Deployment

### Step A: Install Wrangler CLI
```bash
npm install -g wrangler
# or run with npx
npx wrangler login
```

### Step B: Create Cloudflare D1 Database
```bash
npx wrangler d1 create auditai-d1-prod
```
*Note down the returned `database_id` (UUID) and update it in `cloudflare/wrangler.toml` and `cloudflare/wrangler.jsonc`.*

### Step C: Create Cloudflare R2 Storage Bucket
```bash
npx wrangler r2 bucket create auditai-recordings-storage
npx wrangler r2 bucket create auditai-recordings-dev
```

### Step D: Apply D1 Edge Schema
Execute the prepared SQLite schema against your remote D1 database:
```bash
npx wrangler d1 execute auditai-d1-prod --remote --file=database/cloudflare_d1_schema.sql
```

### Step E: Apply R2 CORS Configuration
Allow web audio scrubbing and cross-origin file uploads:
```bash
npx wrangler r2 bucket cors set auditai-recordings-storage --file=database/cloudflare_r2_cors.json
```

### Step F: Deploy the Edge Worker
Navigate to the `cloudflare` folder and deploy:
```bash
cd cloudflare
npx wrangler deploy
```
Your Edge Gateway will be deployed to `https://auditai-edge-service.<your-subdomain>.workers.dev`.

---

## 2. Supabase PostgreSQL Schema Update

1. Open your Supabase Dashboard: [https://supabase.com/dashboard/project/ixuutllrfapiawzumvvl](https://supabase.com/dashboard/project/ixuutllrfapiawzumvvl)
2. Navigate to the **SQL Editor** on the left menu.
3. Click **New Query**.
4. Copy the entire contents of [database/supabase_complete_schema.sql](file:///c:/Users/Jamia/Downloads/audit-ai-main/audit-ai-main/database/supabase_complete_schema.sql).
5. Paste it into the SQL Editor and click **Run**.
6. All 13 relational tables, indexes, constraints, default seed users (`admin@auditai.io`, `client@auditai.io`), QA parameters, SaaS plans, and payment configurations will be initialized.
