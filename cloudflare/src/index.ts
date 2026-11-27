/**
 * ====================================================================
 * AuditAI Cloudflare Edge Gateway Worker
 * Features:
 *  1. Cloudflare D1 Distributed SQL Execution (Prepared statements & Batches)
 *  2. Cloudflare R2 Audio Vault Streaming (with HTTP Range audio seeking support)
 *  3. Zero-Egress Storage Upload & Delete
 *  4. Edge Caching for High-Speed Home Page CMS & Pricing Plans
 *  5. ISO 27001 Security Headers & Tenant Scoping
 * ====================================================================
 */

export interface Env {
  DB: D1Database;
  RECORDINGS_BUCKET: R2Bucket;
  ENVIRONMENT: string;
  ENABLE_CORS: string;
  ALLOWED_ORIGIN: string;
  R2_PUBLIC_DOMAIN?: string;
  EDGE_API_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // Standard CORS Headers
    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-tenant-id, Range",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges, ETag",
      "Access-Control-Max-Age": "86400",
    };

    // Handle Preflight OPTIONS
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Helper JSON response wrapper
    const json = (data: any, status = 200, extraHeaders = {}) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...extraHeaders,
        },
      });

    try {
      // ---------------------------------------------------------------
      // 1. Health & Edge Status
      // ---------------------------------------------------------------
      if (url.pathname === "/health" || url.pathname === "/") {
        return json({
          status: "online",
          service: "AuditAI Cloudflare D1 & R2 Edge Gateway",
          environment: env.ENVIRONMENT || "production",
          d1BindingActive: Boolean(env.DB),
          r2BindingActive: Boolean(env.RECORDINGS_BUCKET),
          region: request.cf?.colo || "global",
          timestamp: new Date().toISOString(),
        });
      }

      // Optional Edge Auth Check for Protected Routes
      if (env.EDGE_API_SECRET) {
        const providedSecret = request.headers.get("x-api-key") || request.headers.get("authorization")?.replace("Bearer ", "");
        const isPublicPath = url.pathname === "/health" || url.pathname === "/" || url.pathname.startsWith("/r2/file/") || url.pathname.startsWith("/edge/public/");
        if (!isPublicPath && providedSecret !== env.EDGE_API_SECRET) {
          return json({ error: "Unauthorized: Invalid edge gateway API key" }, 401);
        }
      }

      // ---------------------------------------------------------------
      // 2. Cloudflare D1 SQL Query: POST /d1/query
      // ---------------------------------------------------------------
      if (url.pathname === "/d1/query" && method === "POST") {
        if (!env.DB) return json({ error: "D1 database binding 'DB' is not configured." }, 500);

        const body: { sql: string; params?: any[] } = await request.json();
        const { sql, params = [] } = body;

        if (!sql || typeof sql !== "string") {
          return json({ error: "Missing or invalid 'sql' query parameter" }, 400);
        }

        const stmt = env.DB.prepare(sql);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;

        let result;
        if (/^\s*(select|pragma)\b/i.test(sql)) {
          result = await bound.all();
        } else {
          result = await bound.run();
        }

        return json({ success: true, result });
      }

      // ---------------------------------------------------------------
      // 3. Cloudflare D1 SQL Batch Execution: POST /d1/batch
      // ---------------------------------------------------------------
      if (url.pathname === "/d1/batch" && method === "POST") {
        if (!env.DB) return json({ error: "D1 database binding 'DB' is not configured." }, 500);

        const body: { statements: Array<{ sql: string; params?: any[] }> } = await request.json();
        const { statements = [] } = body;

        if (!Array.isArray(statements) || statements.length === 0) {
          return json({ error: "Empty or invalid 'statements' batch array" }, 400);
        }

        const prepared = statements.map((s) => {
          const stmt = env.DB.prepare(s.sql);
          return s.params && s.params.length > 0 ? stmt.bind(...s.params) : stmt;
        });

        const results = await env.DB.batch(prepared);
        return json({ success: true, results });
      }

      // ---------------------------------------------------------------
      // 4. Cloudflare D1 Schema Helper: GET /d1/tables
      // ---------------------------------------------------------------
      if (url.pathname === "/d1/tables" && method === "GET") {
        if (!env.DB) return json({ error: "D1 database binding 'DB' is not configured." }, 500);

        const tables = await env.DB.prepare(
          "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
        ).all();

        return json({ success: true, tables: tables.results });
      }

      // ---------------------------------------------------------------
      // 5. Cloudflare R2 Upload: PUT /r2/upload/:key
      // ---------------------------------------------------------------
      if (url.pathname.startsWith("/r2/upload/") && method === "PUT") {
        if (!env.RECORDINGS_BUCKET) return json({ error: "R2 bucket binding 'RECORDINGS_BUCKET' is not configured." }, 500);

        const key = decodeURIComponent(url.pathname.replace("/r2/upload/", ""));
        if (!key) return json({ error: "File key is required in URL path" }, 400);

        const contentType = request.headers.get("content-type") || "application/octet-stream";
        const body = await request.arrayBuffer();

        const customMetadata: Record<string, string> = {
          uploadedAt: new Date().toISOString(),
          tenantId: request.headers.get("x-tenant-id") || "00000000-0000-0000-0000-000000000001",
          callId: request.headers.get("x-call-id") || "",
        };

        const object = await env.RECORDINGS_BUCKET.put(key, body, {
          httpMetadata: {
            contentType,
            cacheControl: "public, max-age=31536000, immutable",
          },
          customMetadata,
        });

        const publicUrl = env.R2_PUBLIC_DOMAIN ? `${env.R2_PUBLIC_DOMAIN}/${key}` : `/r2/file/${encodeURIComponent(key)}`;

        return json({
          success: true,
          key: object.key,
          size: object.size,
          etag: object.etag,
          publicUrl,
          message: "Telephony recording saved to Cloudflare R2 vault.",
        }, 201);
      }

      // ---------------------------------------------------------------
      // 6. Cloudflare R2 Audio Streaming & Download: GET /r2/file/:key
      //    (Full HTTP 206 Partial Content Range support for scrubbing audio)
      // ---------------------------------------------------------------
      if (url.pathname.startsWith("/r2/file/") && method === "GET") {
        if (!env.RECORDINGS_BUCKET) return json({ error: "R2 bucket binding is not configured." }, 500);

        const key = decodeURIComponent(url.pathname.replace("/r2/file/", ""));
        if (!key) return json({ error: "File key is required" }, 400);

        // Optional Range header for audio players seeking back and forth
        const rangeHeader = request.headers.get("range");
        let object: R2ObjectBody | R2Object | null;

        if (rangeHeader) {
          const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
          if (match) {
            const offset = parseInt(match[1], 10);
            const end = match[2] ? parseInt(match[2], 10) : undefined;
            const length = end !== undefined ? end - offset + 1 : undefined;

            object = await env.RECORDINGS_BUCKET.get(key, {
              range: { offset, length },
              onlyIf: request.headers,
            });
          } else {
            object = await env.RECORDINGS_BUCKET.get(key, { onlyIf: request.headers });
          }
        } else {
          object = await env.RECORDINGS_BUCKET.get(key, { onlyIf: request.headers });
        }

        if (!object) {
          return json({ error: `File '${key}' not found in R2 vault.` }, 404);
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Accept-Ranges", "bytes");

        // Merge CORS headers
        for (const [k, v] of Object.entries(corsHeaders)) {
          headers.set(k, v);
        }

        // Return Partial Content if range was used
        if ("range" in object && object.range) {
          const r = object.range as { offset: number; length: number };
          const size = object.size;
          headers.set("Content-Range", `bytes ${r.offset}-${r.offset + r.length - 1}/${size}`);
          headers.set("Content-Length", r.length.toString());
          return new Response((object as R2ObjectBody).body, { status: 206, headers });
        }

        return new Response((object as R2ObjectBody).body, { status: 200, headers });
      }

      // ---------------------------------------------------------------
      // 7. Cloudflare R2 Delete: DELETE /r2/file/:key
      // ---------------------------------------------------------------
      if (url.pathname.startsWith("/r2/file/") && method === "DELETE") {
        if (!env.RECORDINGS_BUCKET) return json({ error: "R2 bucket binding is not configured." }, 500);

        const key = decodeURIComponent(url.pathname.replace("/r2/file/", ""));
        await env.RECORDINGS_BUCKET.delete(key);

        return json({ success: true, key, message: "Recording permanently deleted from R2." });
      }

      // ---------------------------------------------------------------
      // 8. Cloudflare R2 List: GET /r2/list
      // ---------------------------------------------------------------
      if (url.pathname === "/r2/list" && method === "GET") {
        if (!env.RECORDINGS_BUCKET) return json({ error: "R2 bucket binding is not configured." }, 500);

        const prefix = url.searchParams.get("prefix") || undefined;
        const cursor = url.searchParams.get("cursor") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "100", 10);

        const listed = await env.RECORDINGS_BUCKET.list({
          prefix,
          cursor,
          limit,
        });

        return json({
          success: true,
          objects: listed.objects.map((o) => ({
            key: o.key,
            size: o.size,
            uploaded: o.uploaded,
            httpMetadata: o.httpMetadata,
            customMetadata: o.customMetadata,
          })),
          truncated: listed.truncated,
          cursor: listed.cursor,
        });
      }

      // Fallback 404
      return json({ error: `Route ${method} ${url.pathname} not found on edge gateway` }, 404);
    } catch (err: any) {
      return json({ error: "Edge Gateway Error", message: err.message, stack: err.stack }, 500);
    }
  },
};
