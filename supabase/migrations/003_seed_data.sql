-- ============================================================
-- 003_seed_data.sql
-- Reference / lookup seed data (safe to run once)
-- ============================================================

-- Barangay settings seed
insert into public.barangay_settings (barangay_name, municipality, province, hotline)
values ('Barangay Sample', 'Sample Municipality', 'Sample Province', '123-4567')
on conflict do nothing;

-- Document types
insert into public.document_types (name, description, fee, requirements, is_active) values
  ('Barangay Clearance', 'Official clearance certifying a resident has no record within the barangay.', 50.00,
   array['Valid ID','Proof of residency'], true),
  ('Certificate of Indigency', 'Certifies that a resident is indigent for financial assistance purposes.', 0.00,
   array['Valid ID','Interview with Brgy. Secretary'], true),
  ('Barangay Certificate', 'General certification of residency and good standing.', 30.00,
   array['Valid ID'], true),
  ('Certificate of Residency', 'Certifies that a person is a resident of the barangay.', 50.00,
   array['Valid ID'], true),
  ('Business Clearance', 'Clearance for business permit applications within the barangay.', 100.00,
   array['Business name','Valid ID','Proof of location'], true)
on conflict (name) do nothing;

-- Appointment services
insert into public.appointment_services (name, duration_minutes, max_daily_slots, is_active) values
  ('Barangay Clearance Request', 15, 40, true),
  ('Health Services Consultation', 30, 20, true),
  ('Complaint Filing', 30, 15, true),
  ('Legal / Mediation Consultation', 45, 10, true)
on conflict do nothing;

-- Complaint types
insert into public.complaint_types (name, description, is_active) values
  ('Noise Complaint', 'Complaint regarding excessive or disruptive noise.', true),
  ('Property / Boundary Dispute', 'Disputes regarding property lines or boundaries.', true),
  ('Family / Neighbor Dispute', 'Conflicts between family members or neighbors.', true),
  ('Harassment', 'Complaints of harassment within the barangay.', true),
  ('Other', 'Other types of complaints not listed.', true)
on conflict (name) do nothing;

-- Incident types
insert into public.incident_types (name, description, is_active) values
  ('Fire Incident', 'Fire emergencies and related incidents.', true),
  ('Flooding', 'Flooding events within the barangay.', true),
  ('Traffic Accident', 'Vehicular accidents on barangay roads.', true),
  ('Crime / Theft', 'Criminal incidents including theft and robbery.', true),
  ('Health Emergency', 'Medical and health-related emergencies.', true),
  ('Other', 'Other incidents not listed.', true)
on conflict (name) do nothing;
