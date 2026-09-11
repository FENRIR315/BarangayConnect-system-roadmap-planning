-- Email verification (signup) + notification email queue.
-- Idempotent. Applied via: psql -f scripts/migrations/20260911_email_verification.sql

alter table public.users add column if not exists email_verified boolean not null default false;
alter table public.users add column if not exists verification_code_sha text;
alter table public.users add column if not exists verification_expires_at timestamptz;
alter table public.users add column if not exists verification_attempts integer not null default 0;
alter table public.users add column if not exists code_sent_at timestamptz;

-- Existing accounts (admin, residents, officers) stay active.
update public.users set email_verified = true where email_verified is false;

-- Outgoing email queue (drained by the running app + on each write).
create table if not exists public.email_queue (
  id uuid primary key,
  to_email text not null,
  subject text not null,
  body_html text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  notification_id uuid,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_queue_status_idx on public.email_queue (status, created_at);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'brgy_app') then
    grant select, insert, update, delete on public.email_queue to brgy_app;
  end if;
end $$;

-- Broadcast / notification duplicate guards.
alter table public.announcements add column if not exists notified_at timestamptz;
alter table public.document_requests add column if not exists notified_status text;
alter table public.appointments add column if not exists notified_status text;