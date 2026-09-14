import { NextRequest, NextResponse } from "next/server";
import { runQuery, type Query } from "@/lib/local/sql";
import { currentUser } from "@/lib/auth";
import { authorizeQuery } from "@/lib/local/dbacl";
import { dispatchAfterWrite } from "@/lib/notify";
import { sendPendingEmails } from "@/lib/mail";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

const MAX_ROWS = 1000;

export async function POST(request: NextRequest) {
  let body: { query?: Query };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, count: null, error: { message: "Invalid JSON body" } },
      { status: 400 }
    );
  }

  const q = body.query;
  if (!q?.table || !q.verb) {
    return NextResponse.json(
      { data: null, count: null, error: { message: "Missing query" } },
      { status: 400 }
    );
  }
  q.filters = q.filters ?? [];
  q.ors = q.ors ?? [];
  q.orderBy = q.orderBy ?? [];

  if (q.verb !== "select" && !originAllowed(request)) {
    return NextResponse.json(
      { data: null, count: null, error: { message: "Cross-origin requests are not allowed." } },
      { status: 403 }
    );
  }

  // Clamp row counts before SQL is built (sql.ts enforces the same ceiling).
  if (q.limit != null && q.limit > MAX_ROWS) q.limit = MAX_ROWS;
  if (q.range) {
    const [from, to] = q.range;
    if (to - from + 1 > MAX_ROWS) q.range = [from, from + MAX_ROWS - 1];
  }

  const user = await currentUser();
  const acl = await authorizeQuery(user, q);
  if (acl.error) {
    const status = acl.error.code === "auth" ? 401 : 403;
    if (status === 403 && user) {
      await audit(request, user, {
        action: "access_denied",
        details: { table: q.table, verb: q.verb, reason: acl.error.message },
      });
    }
    return NextResponse.json({ data: null, count: null, error: acl.error }, { status });
  }

  // Audit-log inserts get user_id + ip_address enforced server-side; a client
  // may not set them itself.
  if (q.table === "audit_logs" && q.verb === "insert" && user) {
    const rows = Array.isArray(q.values) ? q.values : [q.values];
    for (const row of rows) {
      if (row && typeof row === "object") {
        (row as Record<string, unknown>).user_id = user.id;
        (row as Record<string, unknown>).ip_address = clientIp(request);
      }
    }
  }

  const result = await runQuery(acl.query!);
  if (!result.error && q.verb !== "select") {
    // Side effects: in-app notifications + queued emails for key tables.
    void dispatchAfterWrite(q, result.data).catch((e) => console.error("[db] dispatch failed", e));
    void sendPendingEmails({ limit: 10 }).catch((e) => console.error("[db] email drain failed", e));
  }
  if (!result.error && q.verb !== "select" && user) {
    void audit(request, user, {
      action: `${q.verb}_${q.table}`,
      details: { count: Array.isArray(result.data) ? result.data.length : 1, table: q.table },
    });
  }
  const status = result.error ? (result.error.code === "23505" ? 409 : 500) : 200;
  return NextResponse.json(result, { status });
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

// Non-browser clients (scripts, CLI) omit Origin. Browsers always send it; it
// must match the Host (covers dev 127.0.0.1:3000 and LAN access) and never be
// a wildcard or the opaque "null" sent by sandboxed/embedded contexts.
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === "*" || origin === "null") return false;
  const host = request.headers.get("host");
  if (!host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function audit(
  request: NextRequest,
  user: { id: string },
  opts: { action: string; details?: unknown }
) {
  try {
    await pool.query(
      `insert into public.audit_logs (user_id, ip_address, action, module, details)
       values ($1, $2::text, $3, 'api', $4::jsonb)`,
      [user.id, clientIp(request), opts.action, opts.details ? JSON.stringify(opts.details) : null]
    );
  } catch {
    // audit must never break the request
  }
}