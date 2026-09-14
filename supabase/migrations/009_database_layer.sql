-- ============================================================
-- 009_database_layer.sql
-- Database-level security layer for on-prem BarangayConnect.
--
-- WHAT THIS DOES
--  1. Moves ownership of the identity/session/audit tables from
--     `brgy_app` (the app's database connection role) to `postgres`
--     so that granted privileges can actually be revoked/limited.
--  2. Revokes all privileges there and re-grants exactly what the
--     application needs, column by column:
--       - users:            SELECT on public columns only (no password_hash)
--       - residents:        SELECT all, INSERT/UPDATE except
--                           id, user_id, date_registered, updated_at
--       - sessions:         NO grants (app uses SECURITY DEFINER functions)
--       - audit_logs:       SELECT only + INSERT of auditable fields
--     A direct `brgy_app` write to any protected column now fails at
--     the permission layer.
--  3. Creates SECURITY DEFINER functions (owned by postgres) as the
--     ONLY doors into privileged state. Authorization never comes from
--     a caller-supplied claim or a client-settable GUC; it comes from
--     (a) a live `brgy_app`-unforgeable session token that the function
--     itself re-validates, or (b) a bcrypt password-hash check.
--  4. Repairs dormant Row-Level-Security and storage policy definitions
--     for any environment where RLS is enabled (kept OFF on-prem).
--
-- Applied on-prem as `postgres`. Idempotent / safe to re-run.
-- ============================================================

-- ---------------------------------------------------------------
-- 1) Ownership: protected tables leave brgy_app ownership
-- ---------------------------------------------------------------
alter table public.users owner to postgres;
alter table public.residents owner to postgres;
alter table public.sessions owner to postgres;
alter table public.audit_logs owner to postgres;

-- Audit before-images: the admin UI writes `old_values` for edits; keep
-- it alongside `before_values` so those entries are preserved.
alter table public.audit_logs add column if not exists old_values jsonb;

-- ---------------------------------------------------------------
-- 2) Privileges
-- ---------------------------------------------------------------
revoke all on public.users from brgy_app;
revoke all on public.residents from brgy_app;
revoke all on public.sessions from brgy_app;
revoke all on public.audit_logs from brgy_app;

-- users: public profile fields only.
grant select (id, email, role, first_name, last_name, avatar_url, email_verified)
  on public.users to brgy_app;

-- residents: full read; write everything except identity / system columns.
grant select on public.residents to brgy_app;
grant insert (household_id, first_name, middle_name, last_name, suffix,
              dob, sex, civil_status, address, purok, contact_number, email,
              occupation, voter_status, residency_status,
              emergency_contact_name, emergency_contact_phone, profile_photo_url)
  on public.residents to brgy_app;
grant update (household_id, first_name, middle_name, last_name, suffix,
              dob, sex, civil_status, address, purok, contact_number, email,
              occupation, voter_status, residency_status,
              emergency_contact_name, emergency_contact_phone, profile_photo_url)
  on public.residents to brgy_app;

-- sessions: no direct access; the app only goes through the functions.
-- audit_logs: readable + auditable insert fields.
grant select on public.audit_logs to brgy_app;
grant insert (action, module, record_id, before_values, old_values,
              new_values, details, user_id, ip_address)
  on public.audit_logs to brgy_app;

-- ---------------------------------------------------------------
-- 3) SECURITY DEFINER functions
--    All: security definer, fixed `search_path = public`, every object
--    schema-qualified, input-only bound parameters, no dynamic SQL.
-- ---------------------------------------------------------------

-- Private: resolves a live session token to the ACTOR (fresh role read
-- from `users` at call time). Not executable by brgy_app directly.
create or replace function public.brgy_session_actor(p_session_id text)
returns table (v_id uuid, v_email text, v_role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null
     or p_session_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return;
  end if;
  return query
    select u.id, u.email, u.role
    from public.sessions s
    join public.users u on u.id = s.user_id
    where s.id = p_session_id::uuid
      and s.expires_at > now();
end;
$$;

-- 1/7 credential check (STABLE) ---------------------------------
create or replace function public.brgy_verify_credentials(p_email text, p_password text)
returns table (id uuid, email text, role text, first_name text, last_name text,
               avatar_url text, email_verified boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email = '' or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    return;
  end if;
  if p_password is null or length(p_password) = 0 or length(p_password) > 128 then
    return;
  end if;
  return query
    select u.id, u.email, u.role, u.first_name, u.last_name, u.avatar_url, u.email_verified
    from public.users u
    where lower(u.email) = v_email
      and u.password_hash is not null
      and u.password_hash = public.crypt(p_password, u.password_hash);
end;
$$;

-- 2/7 login: verify + mint session in ONE definer call -------------
-- The session token is created here only after the bcrypt check passes,
-- so a session row can never be forged by direct SQL as brgy_app.
create or replace function public.brgy_login(p_email text, p_password text)
returns table (id uuid, email text, role text, first_name text, last_name text,
               avatar_url text, email_verified boolean, session_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid; v_email_out text; v_role text; v_fn text; v_ln text;
  v_avatar text; v_verified boolean; v_sid uuid;
begin
  if v_email = '' or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    return;
  end if;
  if p_password is null or length(p_password) = 0 or length(p_password) > 128 then
    return;
  end if;
  select u.id, u.email, u.role, u.first_name, u.last_name, u.avatar_url, u.email_verified
    into v_id, v_email_out, v_role, v_fn, v_ln, v_avatar, v_verified
  from public.users u
  where lower(u.email) = v_email
    and u.password_hash is not null
    and u.password_hash = public.crypt(p_password, u.password_hash);
  if v_id is null then
    return;
  end if;
  insert into public.sessions as s (user_id, expires_at, last_seen_at)
    values (v_id, now() + interval '30 days', now())
    returning s.id into v_sid;
  return query
    select v_id, v_email_out, v_role, v_fn, v_ln, v_avatar, v_verified, v_sid;
end;
$$;

-- 3/7 session lookup with sliding expiry -------------------------
create or replace function public.brgy_session_lookup(p_session_id text)
returns table (id uuid, email text, role text, first_name text, last_name text,
               avatar_url text, email_verified boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null
     or p_session_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return;
  end if;
  update public.sessions s
    set last_seen_at = now(),
        expires_at = case
          when s.expires_at - now() < interval '7 days'
          then now() + interval '30 days'
          else s.expires_at
        end
  where s.id = p_session_id::uuid and s.expires_at > now();
  return query
    select u.id, u.email, u.role, u.first_name, u.last_name, u.avatar_url, u.email_verified
    from public.sessions s
    join public.users u on u.id = s.user_id
    where s.id = p_session_id::uuid and s.expires_at > now();
end;
$$;

-- 4/7 logout ------------------------------------------------------
create or replace function public.brgy_session_delete(p_session_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null
     or p_session_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return;
  end if;
  delete from public.sessions where id = p_session_id::uuid;
end;
$$;

-- 5/7 staff account creation (resident logins) ---------------------
create or replace function public.brgy_admin_create_account(
  p_session text, p_email text, p_password text, p_resident_id uuid
)
returns table (id uuid, email text, role text, first_name text, last_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid; v_actor_email text; v_actor_role text;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_new_pw text := coalesce(p_password, '');
  v_fn text; v_ln text; v_user_id uuid;
begin
  select a.v_id, a.v_email, a.v_role into v_actor_id, v_actor_email, v_actor_role
    from public.brgy_session_actor(p_session) a;
  if v_actor_id is null then
    raise exception 'Not authenticated. Please sign in again.';
  end if;
  if v_actor_role = 'resident' then
    raise exception 'Only barangay staff can create resident accounts.';
  end if;
  if v_email = '' or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception 'A valid email address is required.';
  end if;
  if length(v_new_pw) < 8 or length(v_new_pw) > 128 then
    raise exception 'Password must be at least 8 characters.';
  end if;
  if exists (select 1 from public.users u where lower(u.email) = v_email) then
    raise exception 'A user with that email already exists.';
  end if;
  if p_resident_id is not null then
    select u.first_name, u.last_name into v_fn, v_ln
      from public.residents u where id = p_resident_id;
    if v_fn is null then
      raise exception 'Resident record not found.';
    end if;
  end if;

  insert into public.users as u (email, role, first_name, last_name, password_hash, email_verified)
    values (v_email, 'resident', coalesce(v_fn, ''), coalesce(v_ln, ''),
            public.crypt(v_new_pw, public.gen_salt('bf', 10)), true)
    returning u.id into v_user_id;

  if p_resident_id is not null then
    update public.residents r set user_id = v_user_id, email = v_email
      where r.id = p_resident_id;
    insert into public.audit_logs (action, module, record_id, user_id, new_values)
      values ('user_account_created', 'residents', p_resident_id, v_actor_id,
              jsonb_build_object('email', v_email, 'role', 'resident'));
  end if;

  return query select v_user_id, v_email, 'resident'::text, coalesce(v_fn, ''), coalesce(v_ln, '');
end;
$$;

-- 6/7 captain role change (invalidates all target sessions) ---------
create or replace function public.brgy_admin_set_role(
  p_session text, p_target uuid, p_role text
)
returns table (old_role text, new_role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid; v_actor_email text; v_actor_role text;
  v_old text; v_new text := coalesce(p_role, '');
begin
  if p_target is null then
    raise exception 'No target user specified.';
  end if;
  if v_new not in ('captain','secretary','treasurer','kagawad','staff','resident') then
    raise exception 'Invalid role.';
  end if;
  select a.v_id, a.v_email, a.v_role into v_actor_id, v_actor_email, v_actor_role
    from public.brgy_session_actor(p_session) a;
  if v_actor_id is null then
    raise exception 'Not authenticated. Please sign in again.';
  end if;
  if v_actor_role <> 'captain' then
    raise exception 'Only the captain can change account roles.';
  end if;
  select u.role into v_old from public.users u where u.id = p_target;
  if v_old is null then
    raise exception 'Target account not found.';
  end if;

  update public.users u set role = v_new where u.id = p_target;
  -- Invalidate every existing session for the target account.
  delete from public.sessions where user_id = p_target;
  insert into public.audit_logs (action, module, record_id, user_id,
                                 before_values, new_values, details)
    values ('user_role_changed', 'users', p_target, v_actor_id,
            jsonb_build_object('role', v_old), jsonb_build_object('role', v_new),
            'Role changed to ' || v_new || '; all existing sessions for the account were invalidated.');

  return query select v_old, v_new;
end;
$$;

-- 7/7 operator-channel password reset -------------------------------
-- Authority = a live bcrypt password check of the ACTOR (staff member).
-- Only the captain may reset another staff account's password.
create or replace function public.brgy_admin_set_password(
  p_actor_email text, p_actor_password text,
  p_target_email text, p_new_password text
)
returns table (target_email text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_email text := lower(btrim(coalesce(p_actor_email, '')));
  v_target_email text := lower(btrim(coalesce(p_target_email, '')));
  v_new_pw text := coalesce(p_new_password, '');
  v_actor_id uuid; v_actor_role text; v_target_id uuid; v_target_role text;
begin
  if v_actor_email = '' or v_target_email = ''
     or p_actor_password is null or length(p_actor_password) = 0 then
    raise exception 'Operator credentials are required.';
  end if;
  if length(v_new_pw) < 8 or length(v_new_pw) > 128 then
    raise exception 'Password must be at least 8 characters.';
  end if;
  select u.id, u.role into v_actor_id, v_actor_role
    from public.users u
    where lower(u.email) = v_actor_email
      and u.password_hash is not null
      and u.password_hash = public.crypt(p_actor_password, u.password_hash);
  if v_actor_id is null then
    raise exception 'Operator credentials not accepted.';
  end if;
  if v_actor_role = 'resident' then
    raise exception 'Only barangay staff can operate the password reset.';
  end if;
  select u.id, u.role into v_target_id, v_target_role
    from public.users u where lower(u.email) = v_target_email;
  if v_target_id is null then
    raise exception 'Target account not found.';
  end if;
  if v_target_role <> 'resident' and v_actor_role <> 'captain' then
    raise exception 'Only the captain can reset another staff account password.';
  end if;

  update public.users u set password_hash = public.crypt(v_new_pw, public.gen_salt('bf', 10))
    where lower(u.email) = v_target_email;
  delete from public.sessions where user_id = v_target_id;
  insert into public.audit_logs (action, module, record_id, user_id, details)
    values ('password_reset', 'users', v_target_id, v_actor_id,
            'Password reset by operator channel.');

  return query select v_target_email;
end;
$$;

-- Function privileges: nobody by default; brgy_app gets the public
-- entry points only (the private helper stays postgres-only, reachable
-- from the definer functions but NOT by the application role).
revoke all on function public.brgy_session_actor(text) from public;
revoke all on function public.brgy_verify_credentials(text, text) from public;
revoke all on function public.brgy_login(text, text) from public;
revoke all on function public.brgy_session_lookup(text) from public;
revoke all on function public.brgy_session_delete(text) from public;
revoke all on function public.brgy_admin_create_account(text, text, text, uuid) from public;
revoke all on function public.brgy_admin_set_role(text, uuid, text) from public;
revoke all on function public.brgy_admin_set_password(text, text, text, text) from public;

grant execute on function public.brgy_verify_credentials(text, text) to brgy_app;
grant execute on function public.brgy_login(text, text) to brgy_app;
grant execute on function public.brgy_session_lookup(text) to brgy_app;
grant execute on function public.brgy_session_delete(text) to brgy_app;
grant execute on function public.brgy_admin_create_account(text, text, text, uuid) to brgy_app;
grant execute on function public.brgy_admin_set_role(text, uuid, text) to brgy_app;
grant execute on function public.brgy_admin_set_password(text, text, text, text) to brgy_app;

-- ---------------------------------------------------------------
-- 4) Dormant policy repairs (no effect while RLS is disabled; keeps
--    any future RLS / cloud deployment safe)
-- ---------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_policy where polrelid = 'public.users'::regclass
             and polname = 'users_self_update') then
    drop policy "users_self_update" on public.users;
  end if;
  create policy "users_self_update" on public.users
    for update using (auth.uid() = id or public.is_staff())
    with check (auth.uid() = id or public.is_staff());
end $$;

-- No self-service resident rows / no blanket authenticated reads.
drop policy if exists "residents_auth_select" on public.residents;
drop policy if exists "residents_self_insert" on public.residents;

-- Resident inserts must be ownership-scoped (no `with check (true)`).
do $$
begin
  drop policy if exists "doc_requests_insert" on public.document_requests;
  create policy "doc_requests_insert" on public.document_requests
    for insert
    with check (
      public.is_staff()
      or resident_id in (select id from public.residents where user_id = auth.uid())
    );

  drop policy if exists "appointments_insert" on public.appointments;
  create policy "appointments_insert" on public.appointments
    for insert
    with check (
      public.is_staff()
      or resident_id in (select id from public.residents where user_id = auth.uid())
    );

  drop policy if exists "complaints_insert" on public.complaints;
  create policy "complaints_insert" on public.complaints
    for insert
    with check (
      public.is_staff()
      or resident_id in (select id from public.residents where user_id = auth.uid())
    );
end $$;

-- Storage bucket: private + no blanket public read (dormant locally).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    update storage.buckets
      set public = false
      where id = 'barangay-attachments';
  end if;
  if to_regclass('storage.objects') is not null then
    drop policy if exists "storage_attachments_public_read" on storage.objects;
  end if;
end $$;