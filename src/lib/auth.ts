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

export async function findUserByEmail(email: string): Promise<SessionUser | null> {
  const r = await pool.query(
    `select id, email, role, first_name, last_name, avatar_url, password_hash, email_verified
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

export async function verifyPassword(email: string, password: string): Promise<SessionUser | null> {
  const r = await pool.query(
    `select id, email, role, first_name, last_name, avatar_url, email_verified
     from public.users
     where lower(email) = lower($1) and password_hash is not null and password_hash = crypt($2, password_hash)`,
    [email, password]
  );
  return (r.rows[0] as SessionUser | undefined) ?? null;
}

export async function hashPassword(password: string): Promise<string> {
  const r = await pool.query(`select crypt($1, gen_salt('bf')) as h`, [password]);
  return (r.rows[0] as { h: string }).h;
}

export async function createSession(userId: string): Promise<string> {
  const r = await pool.query(
    `insert into public.sessions (user_id, expires_at, last_seen_at)
     values ($1, now() + ($2 || ' days')::interval, now())
     returning id`,
    [userId, SESSION_DAYS]
  );
  return (r.rows[0] as { id: string }).id;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await pool.query(`delete from public.sessions where id = $1`, [sessionId]);
}

export async function lookupSession(sessionId: string): Promise<SessionUser | null> {
  if (!sessionId) return null;
  const r = await pool.query(
    `select u.id, u.email, u.role, u.first_name, u.last_name, u.avatar_url
     from public.sessions s
     join public.users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > now()`,
    [sessionId]
  );
  if (r.rows.length === 0) return null;
  await pool.query(
    `update public.sessions set last_seen_at = now() where id = $1`,
    [sessionId]
  );
  return r.rows[0] as SessionUser;
}

export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  return sid ? lookupSession(sid) : null;
}