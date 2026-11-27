/**
 * Cloudflare Worker Service for AuditAI
 * Exposes edge endpoints for:
 * 1. Cloudflare D1 SQL query execution (Edge relational database for calls, evaluations, agents, parameters, scripts, flags)
 * 2. Cloudflare R2 object storage (Zero-egress storage for call recordings, audio, PDFs, reports)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-tenant-id",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    };

    try {
      // 1. Health check & status
      if (url.pathname === "/health" || url.pathname === "/") {
        return new Response(
          JSON.stringify({
            status: "online",
            service: "AuditAI Cloudflare D1 & R2 Edge Gateway",
            timestamp: new Date().toISOString(),
          }),
          { headers: corsHeaders }
        );
      }

      // 2. D1 SQL Query Endpoint: POST /d1/query
      if (url.pathname === "/d1/query" && method === "POST") {
        const { sql, params = [] } = await request.json();
        if (!sql) {
          return new Response(JSON.stringify({ error: "Missing SQL statement" }), { status: 400, headers: corsHeaders });
        }

        const stmt = env.AUDITAI_D1_DB.prepare(sql);
        const bound = params.length > 0 ? stmt.bind(...params) : stmt;
        
        let result;
        if (/^\s*(select|pragma)\b/i.test(sql)) {
          result = await bound.all();
        } else {
          result = await bound.run();
        }

        return new Response(JSON.stringify({ success: true, result }), { headers: corsHeaders });
      }

      // 3. D1 SQL Batch Execution: POST /d1/batch
      if (url.pathname === "/d1/batch" && method === "POST") {
        const { statements = [] } = await request.json();
        const prepared = statements.map(s => {
          const stmt = env.AUDITAI_D1_DB.prepare(s.sql);
          return s.params && s.params.length > 0 ? stmt.bind(...s.params) : stmt;
        });

        const results = await env.AUDITAI_D1_DB.batch(prepared);
        return new Response(JSON.stringify({ success: true, results }), { headers: corsHeaders });
      }

      // 4. R2 Storage Upload Endpoint: PUT /r2/upload/:key
      if (url.pathname.startsWith("/r2/upload/") && method === "PUT") {
        const key = decodeURIComponent(url.pathname.replace("/r2/upload/", ""));
        const contentType = request.headers.get("content-type") || "application/octet-stream";
        const body = await request.arrayBuffer();

        await env.AUDITAI_R2_STORAGE.put(key, body, {
          httpMetadata: { contentType },
          customMetadata: {
            uploadedAt: new Date().toISOString(),
            tenantId: request.headers.get("x-tenant-id") || "default",
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            key,
            url: `https://storage.auditai.io/${key}`,
            message: "File stored in Cloudflare R2 successfully",
          }),
          { headers: corsHeaders }
        );
      }

      // 5. R2 Storage Retrieval Endpoint: GET /r2/file/:key
      if (url.pathname.startsWith("/r2/file/") && method === "GET") {
        const key = decodeURIComponent(url.pathname.replace("/r2/file/", ""));
        const object = await env.AUDITAI_R2_STORAGE.get(key);

        if (!object) {
          return new Response(JSON.stringify({ error: "Object not found in R2" }), { status: 404, headers: corsHeaders });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(object.body, { headers });
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message || "Edge worker exception" }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
