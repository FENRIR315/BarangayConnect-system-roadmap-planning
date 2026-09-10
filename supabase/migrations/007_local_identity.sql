-- ============================================================
-- 007_local_identity.sql
-- On-prem identity + sessions for the barangay computer.
-- Adds email / avatar_url / password_hash to public.users,
-- creates the local sessions table, and seeds bcrypt passwords
-- for the demo accounts (admin@ -> Admin@123456,
-- residents @ -> Resident123).
--
-- Runs on: the cloud DB (before dump) AND on-prem PostgreSQL
-- (after restoring the public schema). Safe to re-run.
-- Requires: pgcrypto extension.
-- ============================================================

create extension if not exists pgcrypto;

alter table public.users
  add column if not exists email text,
  add column if not exists avatar_url text,
  add column if not exists password_hash text;

-- Back-fill emails from Supabase Auth (id match) when present.
do $$
begin
  if to_regclass('auth.users') is not null then
    update public.users u
    set email = a.email
    from auth.users a
    where a.id = u.id and u.email is null and a.email is not null;
  end if;
end $$;

create unique index if not exists users_email_key_on_prem
  on public.users (lower(email))
  where email is not null;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  last_seen_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- Set bcrypt hashes for the built-in demo accounts (idempotent overwrite).
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'users' and column_name = 'email') then
    update public.users set password_hash = crypt('Admin@123456', gen_salt('bf', 10))
      where email = 'admin@barangayconnect.com';
    update public.users set password_hash = crypt('Resident123', gen_salt('bf', 10))
      where email in ('ana.ocampo@barangayconnect.ph','nancy.andres@barangayconnect.ph',
                      'lydia.cruz@barangayconnect.ph','elena.sacdalan@barangayconnect.ph');
  end if;
end $$;