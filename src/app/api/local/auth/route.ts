import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  brgyLogin,
  currentUser,
  deleteSession,
  findUserByEmail,
  lookupSession,
  toAuthUser,
} from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

// Shared seed passwords that must never be used in production.
export const DEFAULT_PASSWORDS = new Set(["Admin@123456", "Resident123"]);

export const VALID_ROLES = new Set(["captain", "staff", "resident"]);

// ---- brute-force protection (shared across instances, in PostgreSQL) -------
// Layered keys: ip|email (tight), email (medium), ip (loose). A failure counts
// against all three so credential stuffing from one address is throttled even
// across different IPs, and shared IPs (office NAT) are throttled loosely.
const RATE_LIMITS: Array<{ key: (ip: string, email: string) => string; max: number; minutes: number }> = [
  { key: (ip, email) => `${ip}|${email}`, max: 5, minutes: 15 },
  { key: (_ip, email) => `email:${email}`, max: 15, minutes: 30 },
  { key: (ip, _email) => `ip:${ip}`, max: 25, minutes: 60 },
];

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function authKeys(request: NextRequest, email: string): string[] {
  const ip = clientIp(request);
  const clean = email.trim().toLowerCase();
  return RATE_LIMITS.map((r) => r.key(ip, clean));
}

async function anyLocked(keys: string[]): Promise<string | null> {
  const r = await pool.query(
    `select attempt_key from public.login_attempts
     where attempt_key = any($1) and locked_until is not null and locked_until > now()
     limit 1`,
    [keys]
  );
  return (r.rows[0] as { attempt_key?: string } | undefined)?.attempt_key ?? null;
}

async function recordFailures(keys: string[]): Promise<string | null> {
  let lockedKey: string | null = null;
  for (let i = 0; i < RATE_LIMITS.length; i++) {
    const r = await pool.query(
      `insert into public.login_attempts (attempt_key) values ($1)
       on conflict (attempt_key) do update set failures = public.login_attempts.failures + 1
       returning failures`,
      [keys[i]]
    );
    const failures = (r.rows[0] as { failures?: number } | undefined)?.failures ?? 1;
    if (failures >= RATE_LIMITS[i].max) {
      await pool.query(
        `update public.login_attempts set locked_until = now() + ($1::int * interval '1 minute')
         where attempt_key = $2`,
        [RATE_LIMITS[i].minutes, keys[i]]
      );
      lockedKey = lockedKey ?? keys[i];
    }
  }
  return lockedKey;
}

async function clearFailures(keys: string[]): Promise<void> {
  await pool.query(`delete from public.login_attempts where attempt_key = any($1)`, [keys]);
}

async function audit(
  request: NextRequest,
  action: string,
  opts: { user_id?: string | null; record_id?: string | null; details?: unknown }
) {
  try {
    await pool.query(
      `insert into public.audit_logs (user_id, ip_address, action, module, record_id, details)
       values ($1, $2::text, $3, 'auth', $4, $5::jsonb)`,
      [
        opts.user_id ?? null,
        clientIp(request),
        action,
        opts.record_id ?? null,
        opts.details ? JSON.stringify(opts.details) : null,
      ]
    );
  } catch {
    // audit must never break the request
  }
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
  let body: Record<string, unknown> = {};
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;

  try {
    body = await request.json();
    action = typeof body.action === "string" ? body.action : "login";
  } catch {
    // treat as login with empty body
  }

  switch (action) {
    case "login": {
      const { email, password } = body;
      const clean = String(email ?? "").trim().toLowerCase();
      const keys = authKeys(request, clean);

      if ((await anyLocked(keys)) || DEFAULT_PASSWORDS.has(String(password ?? ""))) {
        if (DEFAULT_PASSWORDS.has(String(password ?? ""))) {
          return NextResponse.json(
            {
              data: { user: null, session: null },
              error: {
                message:
                  "This default password is no longer accepted. Please ask the barangay office to set a new password for your account.",
              },
            },
            { status: 401 }
          );
        }
        await audit(request, "login_locked", { details: { email: clean } });
        return NextResponse.json(
          { data: { user: null, session: null }, error: { message: "Too many attempts. Try again later." } },
          { status: 429 }
        );
      }

      let out: Awaited<ReturnType<typeof brgyLogin>> = null;
      try {
        out = await brgyLogin(clean, String(password ?? ""));
      } catch (err) {
        await audit(request, "login_error", { details: { email: clean, error: String(err) } });
        return NextResponse.json(
          { data: null, error: { message: "Login temporarily unavailable." } },
          { status: 500 }
        );
      }

      if (!out) {
        if (await recordFailures(keys)) {
          await audit(request, "login_locked", { details: { email: clean } });
          return NextResponse.json(
            { data: { user: null, session: null }, error: { message: "Too many attempts. Try again in 15 minutes." } },
            { status: 429 }
          );
        }
        await audit(request, "login_failure", { details: { email: clean } });
        return NextResponse.json(
          { data: { user: null, session: null }, error: { message: "Invalid login credentials" } },
          { status: 401 }
        );
      }

      await clearFailures(keys);
      await setSessionCookie(out.sessionId);
      await audit(request, "login_success", { user_id: out.user.id });
      return NextResponse.json({
        data: {
          user: toAuthUser(out.user),
          session: { user: toAuthUser(out.user) },
        },
        error: null,
      });
    }

    case "logout": {
      if (sid) {
        await deleteSession(sid);
        await audit(request, "logout", {});
      }
      store.delete(SESSION_COOKIE);
      return NextResponse.json({ data: null, error: null });
    }

    case "create-account": {
      const actor = await currentUser();
      if (!actor) return unauthorized();
      if (actor.role === "resident") {
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

      // The authoritative creation runs in the database (staff gate inside the
      // SECURITY DEFINER function); the pre-checks above are for user feedback.
      let created: { id?: string; email?: string } = {};
      try {
        const r = await pool.query(
          `select id, email from public.brgy_admin_create_account($1, $2, $3, $4::uuid)`,
          [sid ?? "", emailClean, pw, resident_id ?? null]
        );
        created = (r.rows[0] as { id?: string; email?: string }) ?? {};
      } catch (err) {
        return NextResponse.json(
          { data: { user: null }, error: { message: `Could not create account: ${String(err)}` } },
          { status: 400 }
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

    case "set-role": {
      const actor = await currentUser();
      if (!actor) return unauthorized();
      if (actor.role !== "captain") {
        return NextResponse.json(
          { data: { user: null }, error: { message: "Only the captain can change account roles." } },
          { status: 403 }
        );
      }
      const { target_id, role } = body;
      if (!VALID_ROLES.has(String(role ?? ""))) {
        return NextResponse.json(
          { data: null, error: { message: "Invalid role." } },
          { status: 400 }
        );
      }
      if (!target_id) {
        return NextResponse.json({ data: null, error: { message: "Target account is required." } }, { status: 400 });
      }
      try {
        const r = await pool.query(
          `select old_role, new_role from public.brgy_admin_set_role($1, $2::uuid, $3)`,
          [sid ?? "", String(target_id), String(role)]
        );
        const row = (r.rows[0] as { old_role?: string; new_role?: string }) ?? {};
        return NextResponse.json({ data: { changed: row.old_role !== row.new_role }, error: null });
      } catch (err) {
        return NextResponse.json(
          { data: null, error: { message: String(err) } },
          { status: 400 }
        );
      }
    }

    case "set-password": {
      const actor = await currentUser();
      if (!actor) return unauthorized();
      if (actor.role === "resident") {
        return NextResponse.json(
          { data: { user: null }, error: { message: "Only barangay staff can reset passwords." } },
          { status: 403 }
        );
      }
      const { target_email, operator_email, operator_password, new_password } = body;
      const targetClean = String(target_email ?? "").trim().toLowerCase();
      if (!targetClean) {
        return NextResponse.json({ data: null, error: { message: "Target account is required." } }, { status: 400 });
      }
      const newPw = String(new_password ?? "");
      if (newPw.length < 8) {
        return NextResponse.json(
          { data: { user: null }, error: { message: "Password must be at least 8 characters." } },
          { status: 400 }
        );
      }
      if (DEFAULT_PASSWORDS.has(newPw)) {
        return NextResponse.json(
          { data: { user: null }, error: { message: "That password is reserved. Please choose a different one." } },
          { status: 400 }
        );
      }
      // Operator re-authentication happens inside the database (bcrypt check)
      // so the office can never reset a password through this API alone.
      try {
        const r = await pool.query(
          `select email from public.brgy_admin_set_password($1, $2, $3, $4)`,
          [operator_email, operator_password, targetClean, newPw]
        );
        const row = r.rows[0] as { email?: string } | undefined;
        return NextResponse.json({
          data: { target: row?.email ?? targetClean, sessions_invalidated: true },
          error: null,
        });
      } catch (err) {
        return NextResponse.json({ data: null, error: { message: String(err) } }, { status: 400 });
      }
    }

    case "update-profile": {
      // Used by profile editor: resets last_seen via session touch.
      return NextResponse.json({ data: null, error: null });
    }

    case "reset-password": {
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

function unauthorized() {
  return NextResponse.json(
    { data: { user: null }, error: { message: "Not authenticated. Please sign in again.", code: "auth" } },
    { status: 401 }
  );
}