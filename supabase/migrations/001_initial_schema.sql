-- ============================================================
-- BarangayConnect - 001_initial_schema.sql
-- Core schema for the Barangay Management and Information System
-- ============================================================

create extension if not exists "pgcrypto";

-- ============ EXTENDED USERS (syncs with auth.users) ============
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  role text not null default 'resident'
    check (role in ('captain','secretary','treasurer','kagawad','staff','resident')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ PUROK / HOUSEHOLDS ============
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  household_number text not null unique,
  address text not null,
  purok text not null,
  household_head_id uuid,
  monthly_income numeric(12,2),
  house_ownership text check (house_ownership in ('owned','rented','living_with_family','other')),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ RESIDENTS ============
create table if not exists public.residents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  household_id uuid,
  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix text,
  dob date not null,
  sex text not null check (sex in ('male','female')),
  civil_status text not null check (civil_status in ('single','married','widowed','separated','divorced')),
  address text not null,
  purok text not null,
  contact_number text,
  email text,
  occupation text,
  voter_status text check (voter_status in ('registered','unregistered','pending')),
  residency_status text not null default 'active'
    check (residency_status in ('active','inactive','transferred')),
  date_registered timestamptz not null default now(),
  emergency_contact_name text,
  emergency_contact_phone text,
  profile_photo_url text,
  updated_at timestamptz not null default now()
);

-- circular FKs added after both tables exist
alter table public.households
  add constraint fk_households_head foreign key (household_head_id)
  references public.residents(id) on delete set null;

alter table public.residents
  add constraint fk_residents_household foreign key (household_id)
  references public.households(id) on delete set null;

-- ============ HOUSEHOLD MEMBERS ============
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  relationship text not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, resident_id)
);

-- ============ OFFICIALS ============
create table if not exists public.officials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  resident_id uuid references public.residents(id),
  position text not null
    check (position in ('captain','secretary','treasurer','kagawad','staff')),
  committee text,
  term_start date,
  term_end date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ BARANGAY SETTINGS ============
create table if not exists public.barangay_settings (
  id uuid primary key default gen_random_uuid(),
  barangay_name text not null default 'Barangay',
  municipality text not null default '',
  province text not null default '',
  hotline text,
  captain_name text,
  logo_url text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ DOCUMENT TYPES ============
create table if not exists public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  fee numeric(12,2) not null default 0,
  requirements text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ DOCUMENT REQUESTS ============
create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique,
  resident_id uuid not null references public.residents(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id),
  purpose text not null,
  supporting_documents text[] not null default '{}',
  remarks text,
  fee numeric(12,2) not null default 0,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','approved','rejected','ready_for_release','released','cancelled')),
  processed_by uuid references public.users(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ DOCUMENTS (issued certificates) ============
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  request_id uuid not null references public.document_requests(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id),
  resident_id uuid not null references public.residents(id),
  resident_name text not null,
  resident_address text,
  purpose text,
  issue_date date not null default current_date,
  issued_at timestamptz not null default now(),
  issued_by uuid references public.users(id) on delete set null,
  verification_status text not null default 'valid'
    check (verification_status in ('valid','expired','revoked')),
  created_at timestamptz not null default now()
);

-- ============ APPOINTMENT SERVICES ============
create table if not exists public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes int not null default 30,
  max_daily_slots int not null default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ APPOINTMENTS ============
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  appointment_number text not null unique,
  resident_id uuid not null references public.residents(id) on delete cascade,
  service_id uuid not null references public.appointment_services(id),
  scheduled_date date not null,
  scheduled_time time not null,
  purpose text,
  remarks text,
  status text not null default 'confirmed'
    check (status in ('confirmed','completed','cancelled','no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ COMPLAINT TYPES ============
create table if not exists public.complaint_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ COMPLAINTS ============
create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text not null unique,
  resident_id uuid not null references public.residents(id) on delete cascade,
  complaint_type_id uuid not null references public.complaint_types(id),
  description text not null,
  location text,
  date_of_incident date,
  time_of_incident time,
  evidence_urls text[] not null default '{}',
  status text not null default 'submitted'
    check (status in ('submitted','under_review','investigating','resolved','closed')),
  resolution text,
  handled_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ INCIDENT TYPES ============
create table if not exists public.incident_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============ INCIDENTS ============
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text not null unique,
  incident_type_id uuid not null references public.incident_types(id),
  date date not null default current_date,
  time time,
  location text not null,
  description text not null,
  people_involved text[] not null default '{}',
  responding_officials text[] not null default '{}',
  attachments text[] not null default '{}',
  status text not null default 'open'
    check (status in ('open','investigating','resolved','closed')),
  resolution text,
  reported_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ ANNOUNCEMENTS ============
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null default 'general'
    check (category in ('general','emergency','event','community_program','meeting','public_notice')),
  author_id uuid references public.users(id) on delete set null,
  is_pinned boolean not null default false,
  published_date timestamptz not null default now(),
  expiry_date timestamptz,
  attachment_url text,
  status text not null default 'published'
    check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ NOTIFICATIONS ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'general'
    check (type in ('document','appointment','complaint','announcement','emergency','general')),
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ PAYMENTS ============
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  request_id uuid references public.document_requests(id) on delete set null,
  receipt_number text not null unique,
  amount numeric(12,2) not null,
  payment_type text not null check (payment_type in ('cash','gcash','maya','bank_transfer','other')),
  payment_method text,
  payment_date timestamptz not null default now(),
  or_number text,
  notes text,
  received_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============ AUDIT LOGS ============
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  module text not null,
  record_id uuid,
  user_id uuid references public.users(id) on delete set null,
  before_values jsonb,
  new_values jsonb,
  details text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============
create index if not exists idx_residents_user_id on public.residents(user_id);
create index if not exists idx_residents_household_id on public.residents(household_id);
create index if not exists idx_residents_purok on public.residents(purok);
create index if not exists idx_doc_requests_resident on public.document_requests(resident_id);
create index if not exists idx_doc_requests_status on public.document_requests(status);
create index if not exists idx_appts_resident on public.appointments(resident_id);
create index if not exists idx_complaints_resident on public.complaints(resident_id);
create index if not exists idx_incidents_status on public.incidents(status);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_payments_resident on public.payments(resident_id);

-- ============ UPDATED_AT TRIGGERS ============
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['users','households','residents','officials','barangay_settings',
    'document_requests','appointments','complaints','incidents','announcements']
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t, t
    );
  end loop;
end;
$$;
