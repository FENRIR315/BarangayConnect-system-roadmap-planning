import { pool } from "@/lib/db";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "brgy_session";
export const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  email_verified: boolean;
}

export function toAuthUser(u: SessionUser) {
  return {
    id: u.id,
    email: u.email,
    user_metadata: { role: u.role },
    app_metadata: {},
  };
}

export function toPublicProfile(u: SessionUser) {
  return {
    id: u.id,
    role: u.role,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    avatar_url: u.avatar_url,
  };
}

/**
 * Authenticate via the database. Password verification and session minting
 * happen inside the SECURITY DEFINER function public.brgy_login, which only
 * exposes granted columns back to the app role.
 * Returns { user, sessionId } or null on invalid credentials.
 */
export async function brgyLogin(
  email: string,
  password: string
): Promise<{ user: SessionUser; sessionId: string } | null> {
  const r = await pool.query(
    `select id, email, role, first_name, last_name, avatar_url, email_verified, session_id
     from public.brgy_login($1, $2)`,
    [email, password]
  );
  const row = r.rows[0] as
    | (SessionUser & { session_id: string })
    | undefined;
  if (!row) return null;
  const { session_id, ...user } = row;
  return { user, sessionId: session_id };
}

export async function findUserByEmail(email: string): Promise<SessionUser | null> {
  const r = await pool.query(
    `select id, email, role, first_name, last_name, avatar_url, email_verified
     from public.users where lower(email) = lower($1)`,
    [email]
  );
  return (r.rows[0] as SessionUser | undefined) ?? null;
}

export async function findUserById(id: string): Promise<SessionUser | null> {
  const r = await pool.query(
    `select id, email, role, first_name, last_name, avatar_url, email_verified
     from public.users where id = $1`,
    [id]
  );
  return (r.rows[0] as SessionUser | undefined) ?? null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await pool.query(`select public.brgy_session_delete($1)`, [sessionId]);
}

/**
 * Resolve a session token through public.brgy_session_lookup (definer-owned):
 * it validates expiry, slides last_seen_at, and joins the CURRENT users row so
 * role changes take effect immediately.
 */
export async function lookupSession(sessionId: string): Promise<SessionUser | null> {
  if (!sessionId) return null;
  const r = await pool.query(
    `select id, email, role, first_name, last_name, avatar_url, email_verified
     from public.brgy_session_lookup($1)`,
    [sessionId]
  );
  const row = r.rows[0] as SessionUser | undefined;
  return row ?? null;
}

export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  return sid ? lookupSession(sid) : null;
}