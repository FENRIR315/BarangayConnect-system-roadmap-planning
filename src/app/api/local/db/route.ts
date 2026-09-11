import { NextRequest, NextResponse } from "next/server";
import { runQuery, type Query } from "@/lib/local/sql";
import { currentUser } from "@/lib/auth";
import { authorizeQuery } from "@/lib/local/dbacl";
import { dispatchAfterWrite } from "@/lib/notify";
import { sendPendingEmails } from "@/lib/mail";

export const runtime = "nodejs";

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

  const user = await currentUser();
  const acl = await authorizeQuery(user, q);
  if (acl.error) {
    const status = acl.error.code === "auth" ? 401 : 403;
    return NextResponse.json({ data: null, count: null, error: acl.error }, { status });
  }

  const result = await runQuery(acl.query!);
  if (!result.error && q.verb !== "select") {
    // Side effects: in-app notifications + queued emails for key tables.
    void dispatchAfterWrite(q, result.data).catch((e) => console.error("[db] dispatch failed", e));
    void sendPendingEmails({ limit: 10 }).catch((e) => console.error("[db] email drain failed", e));
  }
  const status = result.error ? (result.error.code === "23505" ? 409 : 500) : 200;
  return NextResponse.json(result, { status });
}