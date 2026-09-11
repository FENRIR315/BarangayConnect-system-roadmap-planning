import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createSession,
  currentUser,
  deleteSession,
  findUserByEmail,
  lookupSession,
  toAuthUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { runQuery } from "@/lib/local/sql";
import type { Query } from "@/lib/local/sql";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

// Shared seed passwords that must never be used in production.
export const DEFAULT_PASSWORDS = new Set(["Admin@123456", "Resident123"]);

// ---- brute-force protection (shared across instances, in PostgreSQL) -------
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function keyFor(request: NextRequest, email: string): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${ip}|${email.trim().toLowerCase()}`;
}

async function isDbLocked(key: string): Promise<boolean> {
  const r = await pool.query(
    `select (locked_until is not null and locked_until > now()) as locked
     from public.login_attempts where attempt_key = $1`,
    [key]
  );
  return r.rows[0]?.locked === true;
}

async function recordDbFailure(key: string): Promise<boolean> {
  const r = await pool.query(
    `insert into public.login_attempts (attempt_key) values ($1)
     on conflict (attempt_key) do update set failures = public.login_attempts.failures + 1
     returning failures`,
    [key]
  );
  const failures = r.rows[0]?.failures ?? 1;
  if (failures >= MAX_ATTEMPTS) {
    await pool.query(
      `update public.login_attempts set locked_until = now() + ($1::int * interval '1 minute')
       where attempt_key = $2`,
      [LOCK_MINUTES, key]
    );
    return true;
  }
  return false;
}

async function clearDbFailures(key: string): Promise<void> {
  await pool.query(`delete from public.login_attempts where attempt_key = $1`, [key]);
}

async function setSessionCookie(sessionId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function GET() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  const user = sid ? await lookupSession(sid) : null;
  return NextResponse.json({
    session: user ? { user: toAuthUser(user), access_token: "local", expires_at: "2099-01-01" } : null,
    error: null,
  });
}

export async function POST(request: NextRequest) {
  let action = "session";
  let body: any = {};
  try {
    body = await request.json();
    action = body.action ?? "login";
  } catch {
    // treat as login with empty body
  }

  const store = await cookies();

  switch (action) {
    case "login": {
      const { email, password } = body;
      const lockKey = keyFor(request, email ?? "");

      if (await isDbLocked(lockKey)) {
        return NextResponse.json(
          { data: { user: null, session: null }, error: { message: "Too many attempts. Try again later." } },
          { status: 429 }
        );
      }

      let user = await verifyPassword(email ?? "", password ?? "");

      if (!user) {
        if (await recordDbFailure(lockKey)) {
          return NextResponse.json(
            { data: { user: null, session: null }, error: { message: "Too many attempts. Try again in 15 minutes." } },
            { status: 429 }
          );
        }
        return NextResponse.json(
          { data: { user: null, session: null }, error: { message: "Invalid login credentials" } },
          { status: 401 }
        );
      }

      if (DEFAULT_PASSWORDS.has(password ?? "")) {
        return NextResponse.json(
          {
            data: { user: null, session: null },
            error: {
              message: "This default password is no longer accepted. Please ask the barangay office to set a new password for your account.",
            },
          },
          { status: 401 }
        );
      }

      await clearDbFailures(lockKey);
      const sessionId = await createSession(user.id);
      await setSessionCookie(sessionId);
      return NextResponse.json({
        data: { user: toAuthUser(user), session: { user: toAuthUser(user) } },
        error: null,
      });
    }

    case "logout": {
      const sid = store.get(SESSION_COOKIE)?.value;
      if (sid) await deleteSession(sid);
      store.delete(SESSION_COOKIE);
      return NextResponse.json({ data: null, error: null });
    }

    case "create-account": {
      // Barangay-staff-only: creates a resident login directly (no self signup,
      // no email verification - like a school issuing student accounts).
      const actor = await currentUser();
      if (!actor || actor.role === "resident") {
        return NextResponse.json(
          { data: { user: null }, error: { message: "Only barangay staff can create resident accounts." } },
          { status: 403 }
        );
      }

      const { email, password, resident_id } = body;
      const emailClean = String(email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
        return NextResponse.json(
          { data: { user: null }, error: { message: "A valid email address is required." } },
          { status: 400 }
        );
      }

      const pw = String(password ?? "");
      if (pw.length < 8) {
        return NextResponse.json(
          { data: { user: null }, error: { message: "Password must be at least 8 characters." } },
          { status: 400 }
        );
      }
      if (DEFAULT_PASSWORDS.has(pw)) {
        return NextResponse.json(
          { data: { user: null }, error: { message: "That password is reserved. Please choose a different one." } },
          { status: 400 }
        );
      }
      if (await findUserByEmail(emailClean)) {
        return NextResponse.json(
          { data: { user: null }, error: { message: "A user with that email already exists." } },
          { status: 409 }
        );
      }

      let rrow: Record<string, unknown> | null = null;
      if (resident_id) {
        const rr = await pool.query(
          `select first_name, last_name from public.residents where id = $1`,
          [resident_id]
        );
        rrow = rr.rows[0] as Record<string, unknown> | undefined ?? null;
      }

      const hash = await hashPassword(pw);
      const result = await runQuery({
        table: "users",
        verb: "insert",
        values: {
          email: emailClean,
          role: "resident",
          first_name: rrow?.first_name ?? null,
          last_name: rrow?.last_name ?? null,
          password_hash: hash,
          email_verified: true,
        },
      } as Query);
      if (result.error) {
        return NextResponse.json(
          { data: { user: null }, error: { message: result.error.message } },
          { status: 400 }
        );
      }
      const created = (result.data as Array<Record<string, unknown>>)[0] ?? {};

      if (resident_id && created.id) {
        await pool.query(
          `update public.residents set user_id = $1, email = $2 where id = $3`,
          [created.id, emailClean, resident_id]
        );
        await pool.query(
          `insert into public.audit_logs (action, module, record_id, new_values)
           values ('user_account_created', 'residents', $1, $2)`,
          [String(resident_id), { email: emailClean, role: "resident" }]
        );
      }

      return NextResponse.json({
        data: {
          user: { id: created.id, email: created.email, user_metadata: { role: "resident" }, app_metadata: {} },
          linked: !!resident_id,
        },
        error: null,
      });
    }

    case "update-profile": {
      // Used by profile editor: resets last_seen via session touch.
      return NextResponse.json({ data: null, error: null });
    }

    case "reset-password": {
      // Offline mode: no email delivery. Office resets accounts directly.
      return NextResponse.json(
        {
          data: null,
          error: { message: "Password reset is handled by the barangay office in offline mode." },
        },
        { status: 400 }
      );
    }

    default:
      return NextResponse.json({ data: null, error: { message: "Unknown action" } }, { status: 400 });
  }
}