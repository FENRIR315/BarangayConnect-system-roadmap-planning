-- ============================================================
-- 002_rls_policies.sql
-- Row Level Security policies for BarangayConnect
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.residents enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.officials enable row level security;
alter table public.barangay_settings enable row level security;
alter table public.document_types enable row level security;
alter table public.document_requests enable row level security;
alter table public.documents enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointments enable row level security;
alter table public.complaint_types enable row level security;
alter table public.complaints enable row level security;
alter table public.incident_types enable row level security;
alter table public.incidents enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: is the current user an admin/staff?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('captain','secretary','treasurer','kagawad','staff')
  );
$$;

grant execute on function public.is_staff() to authenticated, anon;

-- ---------- USERS ----------
-- users can read their own row; staff can read all
create policy "users_self_read" on public.users
  for select using (auth.uid() = id or public.is_staff());

-- residents can update their own; staff can update all
create policy "users_self_update" on public.users
  for update using (auth.uid() = id or public.is_staff());

-- ---------- RESIDENTS ----------
create policy "residents_staff_all" on public.residents
  for all using (public.is_staff())
  with check (public.is_staff());

-- residents read/update their own profile
create policy "residents_self_read" on public.residents
  for select using (user_id = auth.uid());

create policy "residents_self_update" on public.residents
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- any authenticated user may read resident for linking (restricted fields handled in app)
create policy "residents_auth_select" on public.residents
  for select using (auth.role() = 'authenticated');

-- allow authenticated users to insert their own resident profile via signup
create policy "residents_self_insert" on public.residents
  for insert with check (user_id = auth.uid());

-- ---------- HOUSEHOLDS ----------
create policy "households_staff_all" on public.households
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "households_read" on public.households
  for select using (auth.role() = 'authenticated');

-- ---------- HOUSEHOLD MEMBERS ----------
create policy "household_members_staff_all" on public.household_members
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "household_members_read" on public.household_members
  for select using (auth.role() = 'authenticated');

-- ---------- OFFICIALS ----------
create policy "officials_staff_all" on public.officials
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "officials_read" on public.officials
  for select using (auth.role() = 'authenticated');

-- ---------- BARANGAY SETTINGS ----------
create policy "settings_staff_all" on public.barangay_settings
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "settings_read" on public.barangay_settings
  for select using (auth.role() = 'authenticated');

-- ---------- DOCUMENT TYPES ----------
create policy "document_types_staff_all" on public.document_types
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "document_types_read" on public.document_types
  for select using (auth.role() = 'authenticated');

-- ---------- DOCUMENT REQUESTS ----------
-- residents manage their own requests; staff manage all
create policy "doc_requests_insert" on public.document_requests
  for insert with check (true);

create policy "doc_requests_select" on public.document_requests
  for select using (public.is_staff() or resident_id in (
    select id from public.residents where user_id = auth.uid()
  ));

create policy "doc_requests_update" on public.document_requests
  for update using (public.is_staff())
  with check (public.is_staff());

-- ---------- DOCUMENTS ----------
create policy "documents_staff_all" on public.documents
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "documents_select" on public.documents
  for select using (auth.role() = 'authenticated'
    or resident_id in (select id from public.residents where user_id = auth.uid()));

-- public verification of documents (anon) - limited columns exposed
create policy "documents_anon_verify" on public.documents
  for select using (verification_status is not null);

-- ---------- APPOINTMENT SERVICES ----------
create policy "appt_services_staff_all" on public.appointment_services
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "appt_services_read" on public.appointment_services
  for select using (auth.role() = 'authenticated');

-- ---------- APPOINTMENTS ----------
create policy "appointments_insert" on public.appointments
  for insert with check (true);

create policy "appointments_select" on public.appointments
  for select using (public.is_staff() or resident_id in (
    select id from public.residents where user_id = auth.uid()
  ));

create policy "appointments_update" on public.appointments
  for update using (public.is_staff())
  with check (public.is_staff());

-- ---------- COMPLAINT TYPES ----------
create policy "complaint_types_staff_all" on public.complaint_types
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "complaint_types_read" on public.complaint_types
  for select using (auth.role() = 'authenticated');

-- ---------- COMPLAINTS ----------
create policy "complaints_insert" on public.complaints
  for insert with check (true);

create policy "complaints_select" on public.complaints
  for select using (public.is_staff() or resident_id in (
    select id from public.residents where user_id = auth.uid()
  ));

create policy "complaints_update" on public.complaints
  for update using (public.is_staff())
  with check (public.is_staff());

-- ---------- INCIDENT TYPES ----------
create policy "incident_types_staff_all" on public.incident_types
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "incident_types_read" on public.incident_types
  for select using (auth.role() = 'authenticated');

-- ---------- INCIDENTS ----------
create policy "incidents_staff_all" on public.incidents
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "incidents_read" on public.incidents
  for select using (auth.role() = 'authenticated');

-- ---------- ANNOUNCEMENTS ----------
create policy "announcements_staff_all" on public.announcements
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "announcements_read" on public.announcements
  for select using (auth.role() = 'authenticated');

-- anyone (anon) can read published announcements publicly
create policy "announcements_public_read" on public.announcements
  for select using (status = 'published');

-- ---------- NOTIFICATIONS ----------
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- service insert handled by admin client (bypasses RLS)
create policy "notifications_insert" on public.notifications
  for insert with check (public.is_staff() or user_id = auth.uid());

-- ---------- PAYMENTS ----------
create policy "payments_staff_all" on public.payments
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "payments_select" on public.payments
  for select using (resident_id in (select id from public.residents where user_id = auth.uid()));

-- ---------- AUDIT LOGS ----------
-- only staff can read audits; inserts happen via admin/service client
create policy "audit_logs_staff_read" on public.audit_logs
  for select using (public.is_staff());

create policy "audit_logs_insert" on public.audit_logs
  for insert with check (public.is_staff() or auth.uid() is not null);
