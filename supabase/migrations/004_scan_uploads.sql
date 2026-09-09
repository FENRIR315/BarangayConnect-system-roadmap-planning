-- ============================================================
-- 004_scan_uploads.sql
-- Storage bucket + resident_documents table for scanned files
-- ============================================================

-- ---------- STORAGE BUCKET ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barangay-attachments',
  'barangay-attachments',
  true,
  10485760, -- 10MB (scan files are larger than photos)
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Anyone (incl. anon) can read files (bucket is public)
create policy "storage_attachments_public_read" on storage.objects
  for select using (bucket_id = 'barangay-attachments');

-- Staff can read/write/delete everything in the bucket
create policy "storage_attachments_staff_all" on storage.objects
  for all using (bucket_id = 'barangay-attachments' and public.is_staff())
  with check (bucket_id = 'barangay-attachments' and public.is_staff());

-- Authenticated residents can upload (evidence, scan docs)
create policy "storage_attachments_auth_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'barangay-attachments');

-- Authenticated residents can delete their own uploads (folder = their user id)
create policy "storage_attachments_auth_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'barangay-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- RESIDENT_DOCUMENTS TABLE ----------
create table if not exists public.resident_documents (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  file_url text not null,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_resident_documents_resident
  on public.resident_documents (resident_id);

-- ---------- RLS ----------
alter table public.resident_documents enable row level security;

create policy "resident_documents_staff_all" on public.resident_documents
  for all using (public.is_staff())
  with check (public.is_staff());

create policy "resident_documents_self_read" on public.resident_documents
  for select using (resident_id in (
    select id from public.residents where user_id = auth.uid()
  ));