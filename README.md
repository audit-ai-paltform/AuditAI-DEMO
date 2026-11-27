# AuditAI

AuditAI is a tenant-aware call-quality monitoring application. A completed call recording is accepted by an Express webhook, transcribed by AssemblyAI, evaluated against a tenant SOP by Gemini, and shown in a React dashboard with flags, reports, and retention tracking.

> **Production warning:** this repository builds, but it is not production-ready until all migrations are applied, private Supabase buckets/RLS are verified, real secrets are configured, and two-tenant integration tests have passed. Earlier migrations disable RLS; `009_secure_tenant_integrations_and_retention.sql` is the corrective migration and must be reviewed and applied. The repo has no login, email-verification, or password-reset UI, and no verified Knowlarity signature contract.

## Stack and architecture

| Layer | Technology | Purpose |
| --- | --- | --- |
| Dashboard | React 18, Vite 6, Recharts | Calls, transcripts, flags, settings, reports |
| API | Node.js 20+, Express, TypeScript, Zod | HTTP API and webhook validation |
| Data | Supabase Postgres/Auth/Realtime/Storage | Tenant data, JWT identity, private objects |
| Jobs | Redis + BullMQ | Audio, scoring, flag, report, retention jobs |
| AI | AssemblyAI + Google Gemini | Transcription and call evaluation |

```text
Browser → Express API → Supabase
Knowlarity webhook → API → Redis/BullMQ → workers → Supabase
```

The webhook only acknowledges receipt and queues work. Transcription, scoring, and flagging happen asynchronously.

Implemented features include encrypted tenant provider credentials, SSRF-protected webhook ingestion, idempotency, daily private PDF reports, and retention jobs. Razorpay environment references/routes exist, but this README does not claim a production payment or subscription flow.

## Important paths

```text
frontend/src/AuditAIConsole.jsx   Dashboard UI
frontend/src/lib/api.js           Browser API wrapper
src/routes/index.ts               Route mounting
src/modules/                      Calls, flags, settings, integrations, reports
src/providers/                    AssemblyAI, Gemini, Supabase adapters
src/queues/call-pipeline.queue.ts BullMQ queues
src/workers/                      Audio, AI, flags, reports, retention
src/common/security/              Encryption, webhook auth, SSRF checks
database/migrations/              SQL migrations 001 through 010
.env.example                      Backend configuration
frontend/.env.example             Browser-safe configuration
```

## Prerequisites

Required: Git, Node.js **20+**, npm (lockfiles are included), Redis, and a Supabase project. Python is not used. Docker is optional but convenient for Redis.

```powershell
git --version
node --version
npm --version
docker --version  # optional
```

## Local setup

1. Clone and install dependencies:

   ```powershell
   git clone <REPOSITORY_URL> auditai-backend
   cd auditai-backend
   npm ci
   cd frontend
   npm ci
   cd ..
   ```

2. Create configuration files (PowerShell):

   ```powershell
   Copy-Item .env.example .env
   Copy-Item frontend\.env.example frontend\.env
   ```

3. Create a Supabase project. Put its URL, publishable key, and service-role key in root `.env`. Put only the URL and publishable key in `frontend/.env`.

4. Apply `database/migrations/001_initial_schema.sql` through `010_daily_reports.sql` in filename order in Supabase SQL Editor. Verify `tenant_memberships`, `tenant_integrations`, `tenant_retention_policies`, and `daily_reports` exist.

5. Create **private** Supabase Storage buckets named `recordings` and `reports`. Apply the storage/RLS policy sections in migrations `009` and `010`. Never make these buckets public.

6. Start Redis, API/workers, and the frontend in separate terminals:

   ```powershell
   docker run --name auditai-redis -p 6379:6379 redis:7-alpine
   npm run dev
   cd frontend; npm run dev
   ```

   Vite prints the browser URL (normally `http://localhost:5173`); the API defaults to port `3000`. Workers are imported by `src/core/bootstrap/app.bootstrap.ts`, so `npm run dev` starts API and workers together. In production, supervise workers separately and avoid multiple schedulers.

## Environment variables

Root `.env` is server-only. Never add service-role, AI, encryption, payment, or webhook secrets to `frontend/.env`; anything beginning `VITE_` is embedded in the browser bundle.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV`, `PORT`, `API_PREFIX`, `LOG_LEVEL` | Yes | API runtime |
| `CORS_ORIGIN`, `TRUST_PROXY`, `BODY_SIZE_LIMIT` | Yes | HTTP safety |
| `REQUIRE_TENANT_AUTH=true` | Production | Requires Supabase JWT and membership |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase API/JWT validation |
| `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` | Server only | Privileged workers/storage |
| `ASSEMBLYAI_API_KEY`, `GEMINI_API_KEY` | Fallback only | Development/provider fallback keys |
| `INTEGRATION_ENCRYPTION_KEY` | To save tenant keys | Base64 32-byte AES key |
| `KNOWLARITY_WEBHOOK_SECRET` | Webhooks | Shared-secret authentication |
| `KNOWLARITY_RECORDING_HOSTS` | Webhooks | Comma-separated allowed HTTPS hosts |
| `DEV_WEBHOOK_TEST_SECRET` | Development only | Restricted Postman test header |
| `REDIS_URL` | Cloud / Render | Full connection string (e.g. `redis://` or `rediss://` with TLS; preferred) |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Local fallback | Used when `REDIS_URL` is omitted (defaults to `127.0.0.1:6379`) |
| `RUN_INLINE_WORKERS` | Process model | Set `false` on web service when running a separate background worker |
| `RAZORPAY_*` | Optional/unfinished | Payment controller references |

`src/core/config/redis.config.ts` prefers `REDIS_URL` when provided (enabling TLS automatically when using `rediss://`), and seamlessly falls back to `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` for local development. Frontend supports only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_TENANT_ID`.

## Redis and BullMQ

Redis is the durable queue database. If it is unavailable, jobs cannot process even if the webhook succeeds.

```powershell
docker run --name auditai-redis -p 6379:6379 redis:7-alpine
docker exec -it auditai-redis redis-cli ping  # expected: PONG
docker stop auditai-redis
docker start auditai-redis
```

For local defaults use `REDIS_HOST=127.0.0.1` and `REDIS_PORT=6379` (or `REDIS_URL=redis://127.0.0.1:6379`). For Render Key Value, use the supplied `REDIS_URL`.

To run workers separately from the HTTP API (e.g. for Render Background Worker):
- **Web API service**: Set `RUN_INLINE_WORKERS=false` and run `npm start`
- **Background Worker service**: Run `npm run start:worker`

## Webhook/Postman test

Use `POST /api/call-complete` (or `/api/webhook/knowlarity`). The agent must already be mapped to a tenant; body `client_id` is checked, not trusted. The recording must use an approved HTTPS host.

```http
POST http://localhost:3000/api/call-complete
Content-Type: application/json
x-knowlarity-secret: <local-secret>

{
  "event_id": "test-event-001",
  "recording_url": "https://approved-host.example/test.mp3",
  "agent_id": "AGENT-001",
  "duration": "00:30"
}
```

Optional fields are `caller_number`, `timestamp`, UUID `client_id`, and UUID `call_id`. In development only, `x-auditai-test-secret` can match `DEV_WEBHOOK_TEST_SECRET`; it is not a production bypass. Re-send the same `event_id` to confirm `duplicate: true`. `401` means missing/bad secret; `400` commonly means invalid schema/host; `403` means an unmapped agent. Confirm the actual Knowlarity authentication contract before release: the current code uses a shared secret because no provider signature contract is present here.

## Reports, retention, and privacy

The report worker queues each tenant’s completed preceding business date, permits one report per tenant/date, and creates a private PDF containing persisted call status coverage, score and duration denominators, agent summaries, and critical/high flags. Incomplete calls are separate; an AI score is not factual correctness.

Reports live in private `reports/<tenant>/<report>.pdf`; authorized downloads use five-minute signed URLs. Temporary audio/transcript data is skipped until the matching report is `READY`; reports retain independently according to `reports_days`. Supabase deletion does not prove deletion from AssemblyAI, Gemini, Knowlarity, backups, or external logs.

## Testing and troubleshooting

```powershell
npm run typecheck
npm run build
npm run lint
npm run format:check
npm test
cd frontend; npm run build
```

The frontend has no test script. Current unit tests cover webhook schema/idempotency, flags, and secret encryption; they do not establish provider connectivity, RLS effectiveness, or cross-tenant report authorization. Run those tests with two synthetic tenants before release. A known existing transcript-normalizer fallback test can fail when external transliteration is unavailable.

For Supabase permission errors, verify migrations and membership records—not by disabling RLS. For BullMQ failures, check Redis first. For provider failures, verify server-only keys and quotas. For report failures, confirm the private `reports` bucket exists and worker logs show the report job.

## Deployment checklist

Suggested architecture: Vercel for `frontend`, Railway/Render for API and a separately supervised worker, Supabase for database/Auth/storage, and managed Redis. Configure HTTPS, precise CORS, server-only secrets, Redis networking, and `/api/v1/health/live` health checks.

Before deployment: apply migrations; create private buckets; create membership rows; enable `REQUIRE_TENANT_AUTH`; configure encryption/provider/webhook secrets; test report access and retention with synthetic data; confirm scheduler/worker health; and plan monitoring, backups, and recovery. Do not solve setup issues with public buckets, browser service-role keys, disabled RLS, or wildcard recording hosts.

## License

Private and proprietary — AuditAI Engineering.
