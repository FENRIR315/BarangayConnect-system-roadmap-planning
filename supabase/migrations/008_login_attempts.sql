-- ============================================================
-- 008_login_attempts.sql
-- Login attempt / lockout tracking (formerly created ad-hoc in the
-- auth route, never captured in a migration).
--
-- Applied on-prem as `postgres`. Idempotent.
-- ============================================================

create table if not exists public.login_attempts (
  attempt_key text primary key,
  failures integer not null default 0,
  locked_until timestamptz
);

-- BrgyConnect route writes to this table for rate limiting.
grant select, insert, update, delete on public.login_attempts to brgy_app;