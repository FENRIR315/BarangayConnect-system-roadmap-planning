-- ============================================================
-- 005_seed_sillawit.sql
-- Demo seed data for the Sillawit, Cauayan City, Isabela
-- presentation build. Idempotent: safe to run multiple times.
--
-- Prerequisites: 001 (schema), 002 (RLS), 003 (reference data)
--
-- NOTE: user_id below stays NULL for residents on a fresh DB;
-- login accounts are created via scripts/setup-admin.ts or
-- resident signup and linked to these resident rows later.
-- ============================================================

-- ============ BARANGAY SETTINGS (Sillawit) ============
insert into public.barangay_settings (id, barangay_name, municipality, province, hotline, captain_name, address)
values (
  '5d894986-f916-4def-ae7a-3541fe734299',
  'Sillawit',
  'Cauayan City',
  'Isabela',
  '0961 234 5678',
  'Juan Dela Cruz',
  'Barangay Hall, Sillawit, Cauayan City, Isabela'
)
on conflict (id) do update set
  barangay_name = excluded.barangay_name,
  municipality  = excluded.municipality,
  province      = excluded.province,
  hotline       = excluded.hotline,
  captain_name  = excluded.captain_name,
  address       = excluded.address;

-- ============ RESIDENTS ============
insert into public.residents
  (id, user_id, first_name, middle_name, last_name, suffix, dob, sex, civil_status,
   address, purok, contact_number, email, occupation, voter_status, residency_status, date_registered)
values
  -- Account-linked residents (5). On a live DB these already exist -> ignored (accounts preserved).
  ('1f028625-c32d-4b0a-a1e8-f93dc35207ee', null, 'Juan',   'Santos',   'Dela Cruz', null, '1975-06-11', 'male',   'married', '18 Sillawit Proper',    'Purok 1', '0917 111 0001', 'admin@barangayconnect.com', 'Government Employee', 'registered',   'active', '2026-08-01'),
  ('46d021a3-9eea-4551-a9f8-1c5a39aff5fa', null, 'Ana',    'Reyes',    'Ocampo',    null, '1996-04-22', 'female', 'single',   '24 National Road',       'Purok 2', '0917 111 0002', 'ana.ocampo@barangayconnect.ph', 'Teacher', 'registered', 'active', '2026-08-01'),
  ('4b9ba67a-d3f7-4e41-9daf-316a4640192c', null, 'Nancy',  'Reyes',    'Andres',    null, '1992-09-14', 'female', 'single',   '26 National Road',       'Purok 2', '0917 111 0003', 'nancy.andres@barangayconnect.ph', 'Nurse', 'registered', 'active', '2026-08-01'),
  ('387f1947-1297-4c2e-bf45-e2a1f3bfc442', null, 'Lydia',  'Torres',   'Cruz',      null, '1974-03-03', 'female', 'married',  '7 San Isidro St.',       'Purok 3', '0917 111 0004', 'lydia.cruz@barangayconnect.ph', 'Vendor', 'registered', 'active', '2026-08-01'),
  ('72dd37e2-6e3e-4a83-8af3-2c7dbdfe700d', null, 'Elena',  'Santos',   'Sacdalan',  null, '1978-12-19', 'female', 'married',  '9 San Isidro St.',       'Purok 3', '0917 111 0005', 'elena.sacdalan@barangayconnect.ph', 'Housewife', 'registered', 'active', '2026-08-01'),
  -- Household 1 - Dela Cruz
  ('a9000001-0000-4000-8000-000000000001', null, 'Maria Lourdes', 'Mercado', 'Dela Cruz', null, '1978-03-12', 'female', 'married', '18 Sillawit Proper', 'Purok 1', '0919 222 0001', null, 'Housewife', 'registered', 'active', '2026-08-01'),
  ('a9000002-0000-4000-8000-000000000002', null, 'Joshua', 'Bautista', 'Dela Cruz', null, '2005-08-21', 'male',   'single',   '18 Sillawit Proper', 'Purok 1', '0919 222 0002', null, 'Student', 'registered', 'active', '2026-08-01'),
  ('a9000003-0000-4000-8000-000000000003', null, 'Angel',  'Bautista', 'Dela Cruz', null, '2008-11-02', 'female', 'single',   '18 Sillawit Proper', 'Purok 1', '0919 222 0003', null, 'Student', 'unregistered', 'active', '2026-08-01'),
  -- Household 2 - Ocampo
  ('a9000004-0000-4000-8000-000000000004', null, 'Rodolfo', 'Ramos', 'Ocampo',  'Sr.', '1962-01-30', 'male',   'married', '24 National Road', 'Purok 2', '0919 222 0004', null, 'Farmer', 'registered', 'active', '2026-08-02'),
  ('a9000005-0000-4000-8000-000000000005', null, 'Marco',   'Ramos', 'Ocampo',  null,  '2001-06-14', 'male',   'single',   '24 National Road', 'Purok 2', '0919 222 0005', null, 'Tricycle Driver', 'registered', 'active', '2026-08-02'),
  -- Household 3 - Andres
  ('a9000006-0000-4000-8000-000000000006', null, 'Rene',    'Castro', 'Andres',  null,  '1965-09-09', 'male',   'married', '26 National Road', 'Purok 2', '0919 222 0006', null, 'Fisherman', 'registered', 'active', '2026-08-02'),
  ('a9000007-0000-4000-8000-000000000007', null, 'Kristine','Castro', 'Andres',  null,  '1999-04-17', 'female', 'single',   '26 National Road', 'Purok 2', '0919 222 0007', null, 'Teacher', 'registered', 'active', '2026-08-02'),
  -- Household 4 - Cruz
  ('a9000008-0000-4000-8000-000000000008', null, 'Efren',   'Lopez',  'Cruz',    null,  '1970-12-05', 'male',   'married', '7 San Isidro St.', 'Purok 3', '0919 222 0008', null, 'Carpenter', 'registered', 'active', '2026-08-03'),
  ('a9000009-0000-4000-8000-000000000009', null, 'Niño',    'Lopez',  'Cruz',    null,  '2003-07-25', 'male',   'single',   '7 San Isidro St.', 'Purok 3', '0919 222 0009', null, 'Student', 'registered', 'active', '2026-08-03'),
  ('a9000010-0000-4000-8000-000000000010', null, 'Precious','Lopez',  'Cruz',    null,  '2006-02-10', 'female', 'single',   '7 San Isidro St.', 'Purok 3', '0919 222 0010', null, 'Student', 'unregistered', 'active', '2026-08-03'),
  -- Household 5 - Sacdalan
  ('a9000011-0000-4000-8000-000000000011', null, 'Dante',   'Rivera', 'Sacdalan', null,  '1972-05-18', 'male',   'married', '9 San Isidro St.', 'Purok 3', '0919 222 0011', null, 'Security Guard', 'registered', 'active', '2026-08-03'),
  ('a9000012-0000-4000-8000-000000000012', null, 'Carla',   'Rivera', 'Sacdalan', null,  '2007-09-30', 'female', 'single',   '9 San Isidro St.', 'Purok 3', '0919 222 0012', null, 'Student', 'unregistered', 'active', '2026-08-03'),
  -- Household 6 - Santos
  ('a9000013-0000-4000-8000-000000000013', null, 'Romeo',   'Dela Cruz', 'Santos',  null,  '1968-02-27', 'male',   'married', '31 Mabini St.', 'Purok 4', '0919 222 0013', null, 'Vendor', 'registered', 'active', '2026-08-04'),
  ('a9000014-0000-4000-8000-000000000014', null, 'Vilma',   'Torres', 'Santos',  null,  '1971-10-08', 'female', 'married', '31 Mabini St.', 'Purok 4', '0919 222 0014', null, 'Vendor', 'registered', 'active', '2026-08-04'),
  ('a9000015-0000-4000-8000-000000000015', null, 'Carlo',   'Torres', 'Santos',  null,  '2004-01-19', 'male',   'single',   '31 Mabini St.', 'Purok 4', '0919 222 0015', null, 'Student', 'registered', 'active', '2026-08-04'),
  -- Household 7 - Reyes
  ('a9000016-0000-4000-8000-000000000016', null, 'Gloria',  'Aquino', 'Reyes',   null,  '1975-07-07', 'female', 'widowed', '33 Mabini St.', 'Purok 4', '0919 222 0016', null, 'Nurse', 'registered', 'active', '2026-08-04'),
  ('a9000017-0000-4000-8000-000000000017', null, 'Kenneth', 'Aquino', 'Reyes',   null,  '2002-12-01', 'male',   'single',   '33 Mabini St.', 'Purok 4', '0919 222 0017', null, 'Seaman / OFW', 'registered', 'active', '2026-08-04'),
  -- Household 8 - Ramirez
  ('a9000018-0000-4000-8000-000000000018', null, 'Marlon',  'Ignacio','Ramirez', null,  '1980-03-03', 'male',   'married', '12 Acacia St.', 'Purok 5', '0919 222 0018', null, 'Tricycle Driver', 'registered', 'active', '2026-08-05'),
  ('a9000019-0000-4000-8000-000000000019', null, 'Jean',    'Santos', 'Ramirez', null,  '1983-06-22', 'female', 'married', '12 Acacia St.', 'Purok 5', '0919 222 0019', null, 'Housewife', 'registered', 'active', '2026-08-05'),
  -- Household 9 - Bautista
  ('a9000020-0000-4000-8000-000000000020', null, 'Ramon',   'Villanueva', 'Bautista', null, '1974-04-15', 'male',   'married', '14 Acacia St.', 'Purok 5', '0919 222 0020', null, 'Electrician', 'registered', 'active', '2026-08-05'),
  ('a9000021-0000-4000-8000-000000000021', null, 'Corazon', 'Mendoza', 'Bautista', null, '1977-11-11', 'female', 'married', '14 Acacia St.', 'Purok 5', '0919 222 0021', null, 'Vendor', 'registered', 'active', '2026-08-05'),
  ('a9000022-0000-4000-8000-000000000022', null, 'Daisy',   'Mendoza', 'Bautista', null, '2009-08-05', 'female', 'single',   '14 Acacia St.', 'Purok 5', '0919 222 0022', null, 'Student', 'unregistered', 'active', '2026-08-05'),
  -- Household 10 - Mendoza
  ('a9000023-0000-4000-8000-000000000023', null, 'Federico','Salazar', 'Mendoza', 'Jr.', '1960-08-19', 'male',   'married', '5 Rizal Ave.', 'Purok 6', '0919 222 0023', null, 'Farmer', 'registered', 'active', '2026-08-06'),
  ('a9000024-0000-4000-8000-000000000024', null, 'Adela',   'Garcia',  'Mendoza', null,  '1963-12-03', 'female', 'married', '5 Rizal Ave.', 'Purok 6', '0919 222 0024', null, 'Housewife', 'registered', 'active', '2026-08-06'),
  -- Household 11 - Soriano
  ('a9000025-0000-4000-8000-000000000025', null, 'Victor',  'Enriquez','Soriano', null,  '1990-09-04', 'male',   'single',   '6 Rizal Ave.', 'Purok 6', '0919 222 0025', null, 'Government Employee', 'registered', 'active', '2026-08-06'),
  -- Household 12 - Villanueva
  ('a9000026-0000-4000-8000-000000000026', null, 'Norma',   'Fernandez','Villanueva', null, '1973-02-24', 'female', 'widowed', '20 Sillawit Proper', 'Purok 1', '0919 222 0026', null, 'Barangay Health Worker', 'registered', 'active', '2026-08-07'),
  ('a9000027-0000-4000-8000-000000000027', null, 'Alvin',   'Fernandez','Villanueva', null, '1998-10-12', 'male',  'single',  '20 Sillawit Proper', 'Purok 1', '0919 222 0027', null, 'Mechanic', 'registered', 'active', '2026-08-07'),
  -- Household 13 - Aquino
  ('a9000028-0000-4000-8000-000000000028', null, 'Benjamin','Castro', 'Aquino',  null,  '1971-07-16', 'male',   'married', '28 National Road', 'Purok 2', '0919 222 0028', null, 'Driver', 'registered', 'active', '2026-08-07'),
  ('a9000029-0000-4000-8000-000000000029', null, 'Leonora', 'Reyes',  'Aquino',  null,  '1976-01-29', 'female', 'married', '28 National Road', 'Purok 2', '0919 222 0029', null, 'Teacher', 'registered', 'active', '2026-08-07'),
  -- Household 14 - Pascual
  ('a9000030-0000-4000-8000-000000000030', null, 'Pedro',   'Bernardo','Pascual', null,  '1966-10-10', 'male',   'married', '11 San Isidro St.', 'Purok 3', '0919 222 0030', null, 'Construction Worker', 'registered', 'active', '2026-08-08'),
  ('a9000031-0000-4000-8000-000000000031', null, 'Minda',   'Torres',  'Pascual', null,  '1969-04-04', 'female', 'married', '11 San Isidro St.', 'Purok 3', '0919 222 0031', null, 'Housewife', 'registered', 'active', '2026-08-08'),
  ('a9000032-0000-4000-8000-000000000032', null, 'Jomar',   'Torres',  'Pascual', null,  '2000-08-08', 'male',   'single',   '11 San Isidro St.', 'Purok 3', '0919 222 0032', null, 'Laborer', 'registered', 'active', '2026-08-08'),
  -- Household 15 - Delos Reyes
  ('a9000033-0000-4000-8000-000000000033', null, 'Mario',   'Santiago','Delos Reyes', null, '1958-05-25', 'male',   'married', '35 Mabini St.', 'Purok 4', '0919 222 0033', null, 'Farmer', 'registered', 'active', '2026-08-09'),
  ('a9000034-0000-4000-8000-000000000034', null, 'Elena',   'Sarmiento','Delos Reyes', null, '1962-09-18', 'female','married', '35 Mabini St.', 'Purok 4', '0919 222 0034', null, 'Housewife', 'registered', 'active', '2026-08-09'),
  -- Household 16 - Salcedo
  ('a9000035-0000-4000-8000-000000000035', null, 'Rizal',   'Aguilar', 'Salcedo', null,  '1988-11-27', 'male',   'single',   '16 Acacia St.', 'Purok 5', '0919 222 0035', null, 'Ambulance Driver', 'registered', 'active', '2026-08-09'),
  ('a9000036-0000-4000-8000-000000000036', null, 'Teresita','Cuevas',  'Salcedo', null,  '1955-03-08', 'female', 'widowed', '16 Acacia St.', 'Purok 5', '0919 222 0036', null, 'Pensioner', 'registered', 'inactive', '2026-08-09')
on conflict (id) do nothing;

-- ============ HOUSEHOLDS ============
insert into public.households (id, household_number, address, purok, household_head_id, monthly_income, house_ownership, status)
values
  ('91000001-0000-4000-8000-000000000001', 'H-101', '18 Sillawit Proper', 'Purok 1', '1f028625-c32d-4b0a-a1e8-f93dc35207ee', 25000.00, 'owned', 'active'),
  ('91000002-0000-4000-8000-000000000002', 'H-102', '24 National Road',   'Purok 2', 'a9000004-0000-4000-8000-000000000004', 15000.00, 'owned', 'active'),
  ('91000003-0000-4000-8000-000000000003', 'H-103', '26 National Road',   'Purok 2', 'a9000006-0000-4000-8000-000000000006', 18000.00, 'rented', 'active'),
  ('91000004-0000-4000-8000-000000000004', 'H-104', '7 San Isidro St.',   'Purok 3', 'a9000008-0000-4000-8000-000000000008', 20000.00, 'owned', 'active'),
  ('91000005-0000-4000-8000-000000000005', 'H-105', '9 San Isidro St.',   'Purok 3', 'a9000011-0000-4000-8000-000000000011', 17000.00, 'rented', 'active'),
  ('91000006-0000-4000-8000-000000000006', 'H-106', '31 Mabini St.',      'Purok 4', 'a9000013-0000-4000-8000-000000000013', 19000.00, 'owned', 'active'),
  ('91000007-0000-4000-8000-000000000007', 'H-107', '33 Mabini St.',      'Purok 4', 'a9000016-0000-4000-8000-000000000016', 28000.00, 'owned', 'active'),
  ('91000008-0000-4000-8000-000000000008', 'H-108', '12 Acacia St.',      'Purok 5', 'a9000018-0000-4000-8000-000000000018', 14000.00, 'rented', 'active'),
  ('91000009-0000-4000-8000-000000000009', 'H-109', '14 Acacia St.',      'Purok 5', 'a9000020-0000-4000-8000-000000000020', 21000.00, 'owned', 'active'),
  ('91000010-0000-4000-8000-000000000010', 'H-110', '5 Rizal Ave.',       'Purok 6', 'a9000023-0000-4000-8000-000000000023', 16000.00, 'owned', 'active'),
  ('91000011-0000-4000-8000-000000000011', 'H-111', '6 Rizal Ave.',       'Purok 6', 'a9000025-0000-4000-8000-000000000025', 22000.00, 'living_with_family', 'active'),
  ('91000012-0000-4000-8000-000000000012', 'H-112', '20 Sillawit Proper', 'Purok 1', 'a9000026-0000-4000-8000-000000000026', 18000.00, 'owned', 'active'),
  ('91000013-0000-4000-8000-000000000013', 'H-113', '28 National Road',   'Purok 2', 'a9000028-0000-4000-8000-000000000028', 20000.00, 'rented', 'active'),
  ('91000014-0000-4000-8000-000000000014', 'H-114', '11 San Isidro St.',  'Purok 3', 'a9000030-0000-4000-8000-000000000030', 15000.00, 'owned', 'active'),
  ('91000015-0000-4000-8000-000000000015', 'H-115', '35 Mabini St.',      'Purok 4', 'a9000033-0000-4000-8000-000000000033', 9000.00,  'living_with_family', 'active'),
  ('91000016-0000-4000-8000-000000000016', 'H-116', '16 Acacia St.',      'Purok 5', 'a9000035-0000-4000-8000-000000000035', 20000.00, 'owned', 'active')
on conflict (id) do nothing;

-- ============ ASSIGN RESIDENTS TO HOUSEHOLDS ============
update public.residents set household_id = '91000001-0000-4000-8000-000000000001', address = '18 Sillawit Proper', purok = 'Purok 1' where id in ('1f028625-c32d-4b0a-a1e8-f93dc35207ee','a9000001-0000-4000-8000-000000000001','a9000002-0000-4000-8000-000000000002','a9000003-0000-4000-8000-000000000003');
update public.residents set household_id = '91000002-0000-4000-8000-000000000002', address = '24 National Road',   purok = 'Purok 2' where id in ('46d021a3-9eea-4551-a9f8-1c5a39aff5fa','a9000004-0000-4000-8000-000000000004','a9000005-0000-4000-8000-000000000005');
update public.residents set household_id = '91000003-0000-4000-8000-000000000003', address = '26 National Road',   purok = 'Purok 2' where id in ('4b9ba67a-d3f7-4e41-9daf-316a4640192c','a9000006-0000-4000-8000-000000000006','a9000007-0000-4000-8000-000000000007');
update public.residents set household_id = '91000004-0000-4000-8000-000000000004', address = '7 San Isidro St.',   purok = 'Purok 3' where id in ('387f1947-1297-4c2e-bf45-e2a1f3bfc442','a9000008-0000-4000-8000-000000000008','a9000009-0000-4000-8000-000000000009','a9000010-0000-4000-8000-000000000010');
update public.residents set household_id = '91000005-0000-4000-8000-000000000005', address = '9 San Isidro St.',   purok = 'Purok 3' where id in ('72dd37e2-6e3e-4a83-8af3-2c7dbdfe700d','a9000011-0000-4000-8000-000000000011','a9000012-0000-4000-8000-000000000012');
update public.residents set household_id = '91000006-0000-4000-8000-000000000006', address = '31 Mabini St.',      purok = 'Purok 4' where id in ('a9000013-0000-4000-8000-000000000013','a9000014-0000-4000-8000-000000000014','a9000015-0000-4000-8000-000000000015');
update public.residents set household_id = '91000007-0000-4000-8000-000000000007', address = '33 Mabini St.',      purok = 'Purok 4' where id in ('a9000016-0000-4000-8000-000000000016','a9000017-0000-4000-8000-000000000017');
update public.residents set household_id = '91000008-0000-4000-8000-000000000008', address = '12 Acacia St.',      purok = 'Purok 5' where id in ('a9000018-0000-4000-8000-000000000018','a9000019-0000-4000-8000-000000000019');
update public.residents set household_id = '91000009-0000-4000-8000-000000000009', address = '14 Acacia St.',      purok = 'Purok 5' where id in ('a9000020-0000-4000-8000-000000000020','a9000021-0000-4000-8000-000000000021','a9000022-0000-4000-8000-000000000022');
update public.residents set household_id = '91000010-0000-4000-8000-000000000010', address = '5 Rizal Ave.',       purok = 'Purok 6' where id in ('a9000023-0000-4000-8000-000000000023','a9000024-0000-4000-8000-000000000024');
update public.residents set household_id = '91000011-0000-4000-8000-000000000011', address = '6 Rizal Ave.',       purok = 'Purok 6' where id in ('a9000025-0000-4000-8000-000000000025');
update public.residents set household_id = '91000012-0000-4000-8000-000000000012', address = '20 Sillawit Proper', purok = 'Purok 1' where id in ('a9000026-0000-4000-8000-000000000026','a9000027-0000-4000-8000-000000000027');
update public.residents set household_id = '91000013-0000-4000-8000-000000000013', address = '28 National Road',   purok = 'Purok 2' where id in ('a9000028-0000-4000-8000-000000000028','a9000029-0000-4000-8000-000000000029');
update public.residents set household_id = '91000014-0000-4000-8000-000000000014', address = '11 San Isidro St.',  purok = 'Purok 3' where id in ('a9000030-0000-4000-8000-000000000030','a9000031-0000-4000-8000-000000000031','a9000032-0000-4000-8000-000000000032');
update public.residents set household_id = '91000015-0000-4000-8000-000000000015', address = '35 Mabini St.',      purok = 'Purok 4' where id in ('a9000033-0000-4000-8000-000000000033','a9000034-0000-4000-8000-000000000034');
update public.residents set household_id = '91000016-0000-4000-8000-000000000016', address = '16 Acacia St.',      purok = 'Purok 5' where id in ('a9000035-0000-4000-8000-000000000035','a9000036-0000-4000-8000-000000000036');

-- ============ HOUSEHOLD MEMBERS ============
insert into public.household_members (id, household_id, resident_id, relationship) values
  ('92000001-0000-4000-8000-000000000001', '91000001-0000-4000-8000-000000000001', '1f028625-c32d-4b0a-a1e8-f93dc35207ee', 'head'),
  ('92000002-0000-4000-8000-000000000002', '91000001-0000-4000-8000-000000000001', 'a9000001-0000-4000-8000-000000000001', 'spouse'),
  ('92000003-0000-4000-8000-000000000003', '91000001-0000-4000-8000-000000000001', 'a9000002-0000-4000-8000-000000000002', 'child'),
  ('92000004-0000-4000-8000-000000000004', '91000001-0000-4000-8000-000000000001', 'a9000003-0000-4000-8000-000000000003', 'child'),
  ('92000005-0000-4000-8000-000000000005', '91000002-0000-4000-8000-000000000002', 'a9000004-0000-4000-8000-000000000004', 'head'),
  ('92000006-0000-4000-8000-000000000006', '91000002-0000-4000-8000-000000000002', '46d021a3-9eea-4551-a9f8-1c5a39aff5fa', 'child'),
  ('92000007-0000-4000-8000-000000000007', '91000002-0000-4000-8000-000000000002', 'a9000005-0000-4000-8000-000000000005', 'child'),
  ('92000008-0000-4000-8000-000000000008', '91000003-0000-4000-8000-000000000003', 'a9000006-0000-4000-8000-000000000006', 'head'),
  ('92000009-0000-4000-8000-000000000009', '91000003-0000-4000-8000-000000000003', '4b9ba67a-d3f7-4e41-9daf-316a4640192c', 'child'),
  ('92000010-0000-4000-8000-000000000010', '91000003-0000-4000-8000-000000000003', 'a9000007-0000-4000-8000-000000000007', 'child'),
  ('92000011-0000-4000-8000-000000000011', '91000004-0000-4000-8000-000000000004', 'a9000008-0000-4000-8000-000000000008', 'head'),
  ('92000012-0000-4000-8000-000000000012', '91000004-0000-4000-8000-000000000004', '387f1947-1297-4c2e-bf45-e2a1f3bfc442', 'spouse'),
  ('92000013-0000-4000-8000-000000000013', '91000004-0000-4000-8000-000000000004', 'a9000009-0000-4000-8000-000000000009', 'child'),
  ('92000014-0000-4000-8000-000000000014', '91000004-0000-4000-8000-000000000004', 'a9000010-0000-4000-8000-000000000010', 'child'),
  ('92000015-0000-4000-8000-000000000015', '91000005-0000-4000-8000-000000000005', 'a9000011-0000-4000-8000-000000000011', 'head'),
  ('92000016-0000-4000-8000-000000000016', '91000005-0000-4000-8000-000000000005', '72dd37e2-6e3e-4a83-8af3-2c7dbdfe700d', 'spouse'),
  ('92000017-0000-4000-8000-000000000017', '91000005-0000-4000-8000-000000000005', 'a9000012-0000-4000-8000-000000000012', 'child'),
  ('92000018-0000-4000-8000-000000000018', '91000006-0000-4000-8000-000000000006', 'a9000013-0000-4000-8000-000000000013', 'head'),
  ('92000019-0000-4000-8000-000000000019', '91000006-0000-4000-8000-000000000006', 'a9000014-0000-4000-8000-000000000014', 'spouse'),
  ('92000020-0000-4000-8000-000000000020', '91000006-0000-4000-8000-000000000006', 'a9000015-0000-4000-8000-000000000015', 'child'),
  ('92000021-0000-4000-8000-000000000021', '91000013-0000-4000-8000-000000000013', 'a9000028-0000-4000-8000-000000000028', 'head'),
  ('92000022-0000-4000-8000-000000000022', '91000013-0000-4000-8000-000000000013', 'a9000029-0000-4000-8000-000000000029', 'spouse'),
  ('92000023-0000-4000-8000-000000000023', '91000014-0000-4000-8000-000000000014', 'a9000030-0000-4000-8000-000000000030', 'head'),
  ('92000024-0000-4000-8000-000000000024', '91000014-0000-4000-8000-000000000014', 'a9000031-0000-4000-8000-000000000031', 'spouse'),
  ('92000025-0000-4000-8000-000000000025', '91000014-0000-4000-8000-000000000014', 'a9000032-0000-4000-8000-000000000032', 'child')
on conflict (id) do nothing;

-- ============ OFFICIALS ============
insert into public.officials (id, resident_id, position, committee, term_start, term_end, is_active)
values
  ('b8e98735-e03b-4f29-983f-68cbe91bfcd1', '1f028625-c32d-4b0a-a1e8-f93dc35207ee', 'captain', 'Presiding Officer', '2023-07-01', '2025-06-30', true),
  ('93000001-0000-4000-8000-000000000001', 'a9000016-0000-4000-8000-000000000016', 'secretary', 'Sanggunian', '2023-07-01', '2025-06-30', true),
  ('93000002-0000-4000-8000-000000000002', 'a9000026-0000-4000-8000-000000000026', 'treasurer', 'Finance', '2023-07-01', '2025-06-30', true),
  ('93000003-0000-4000-8000-000000000003', 'a9000013-0000-4000-8000-000000000013', 'kagawad', 'Committee on Peace and Order', '2023-07-01', '2025-06-30', true),
  ('93000004-0000-4000-8000-000000000004', 'a9000018-0000-4000-8000-000000000018', 'kagawad', 'Committee on Infrastructure', '2023-07-01', '2025-06-30', true),
  ('93000005-0000-4000-8000-000000000005', 'a9000020-0000-4000-8000-000000000020', 'kagawad', 'Committee on Education', '2023-07-01', '2025-06-30', true),
  ('93000006-0000-4000-8000-000000000006', 'a9000023-0000-4000-8000-000000000023', 'kagawad', 'Committee on Agriculture', '2023-07-01', '2025-06-30', true),
  ('93000007-0000-4000-8000-000000000007', 'a9000028-0000-4000-8000-000000000028', 'kagawad', 'Committee on Health', '2023-07-01', '2025-06-30', true),
  ('93000008-0000-4000-8000-000000000008', 'a9000030-0000-4000-8000-000000000030', 'kagawad', 'Committee on Disaster Risk Reduction', '2023-07-01', '2025-06-30', true),
  ('93000009-0000-4000-8000-000000000009', 'a9000025-0000-4000-8000-000000000025', 'kagawad', 'Committee on Youth and Sports', '2023-07-01', '2025-06-30', true)
on conflict (id) do update set
  resident_id = excluded.resident_id,
  committee   = excluded.committee,
  term_start  = excluded.term_start,
  term_end    = excluded.term_end,
  is_active   = excluded.is_active;

-- ============ DOCUMENT REQUESTS ============
insert into public.document_requests
  (id, request_number, resident_id, document_type_id, purpose, remarks, fee, status, processed_by, created_at)
values
  ('94000001-0000-4000-8000-000000000001', 'DOC-2026-0001', 'a9000013-0000-4000-8000-000000000013', (select id from public.document_types where name = 'Barangay Clearance'), 'Employment requirements', null, 50,  'released',       (select id from public.users where role = 'captain' limit 1), '2026-08-10 09:12:00'),
  ('94000002-0000-4000-8000-000000000002', 'DOC-2026-0002', 'a9000014-0000-4000-8000-000000000014', (select id from public.document_types where name = 'Certificate of Indigency'), 'Medical assistance application', null, 0,  'approved',       (select id from public.users where role = 'captain' limit 1), '2026-08-11 10:30:00'),
  ('94000003-0000-4000-8000-000000000003', 'DOC-2026-0003', 'a9000025-0000-4000-8000-000000000025', (select id from public.document_types where name = 'Barangay Clearance'), 'Business permit application', null, 50, 'ready_for_release', (select id from public.users where role = 'captain' limit 1), '2026-08-12 14:05:00'),
  ('94000004-0000-4000-8000-000000000004', 'DOC-2026-0004', 'a9000022-0000-4000-8000-000000000022', (select id from public.document_types where name = 'Certificate of Residency'), 'School enrollment', null, 50, 'submitted',      null, '2026-08-20 08:45:00'),
  ('94000005-0000-4000-8000-000000000005', 'DOC-2026-0005', 'a9000017-0000-4000-8000-000000000017', (select id from public.document_types where name = 'Barangay Clearance'), 'Travel abroad requirements', null, 50, 'released',       (select id from public.users where role = 'captain' limit 1), '2026-08-15 09:20:00'),
  ('94000006-0000-4000-8000-000000000006', 'DOC-2026-0006', 'a9000033-0000-4000-8000-000000000033', (select id from public.document_types where name = 'Certificate of Indigency'), 'DSWD assistance application', null, 0, 'under_review',   (select id from public.users where role = 'captain' limit 1), '2026-08-21 11:00:00'),
  ('94000007-0000-4000-8000-000000000007', 'DOC-2026-0007', 'a9000010-0000-4000-8000-000000000010', (select id from public.document_types where name = 'Barangay Certificate'), 'School enrollment', null, 30, 'approved',       (select id from public.users where role = 'captain' limit 1), '2026-08-22 13:15:00'),
  ('94000008-0000-4000-8000-000000000008', 'DOC-2026-0008', 'a9000027-0000-4000-8000-000000000027', (select id from public.document_types where name = 'Barangay Clearance'), 'Employment requirements', null, 50, 'released',       (select id from public.users where role = 'captain' limit 1), '2026-08-24 09:40:00'),
  ('94000009-0000-4000-8000-000000000009', 'DOC-2026-0009', 'a9000031-0000-4000-8000-000000000031', (select id from public.document_types where name = 'Certificate of Residency'), 'Senior citizen registration', null, 50, 'approved',       (select id from public.users where role = 'captain' limit 1), '2026-08-25 15:30:00'),
  ('94000010-0000-4000-8000-000000000010', 'DOC-2026-0010', 'a9000019-0000-4000-8000-000000000019', (select id from public.document_types where name = 'Barangay Clearance'), 'Business permit application', null, 50, 'under_review',   (select id from public.users where role = 'captain' limit 1), '2026-08-26 10:10:00'),
  ('94000011-0000-4000-8000-000000000011', 'DOC-2026-0011', 'a9000029-0000-4000-8000-000000000029', (select id from public.document_types where name = 'Barangay Certificate'), 'Scholarship application', null, 30, 'ready_for_release', (select id from public.users where role = 'captain' limit 1), '2026-08-28 14:00:00'),
  ('94000012-0000-4000-8000-000000000012', 'DOC-2026-0012', 'a9000035-0000-4000-8000-000000000035', (select id from public.document_types where name = 'Barangay Clearance'), 'Employment requirements', null, 50, 'released',       (select id from public.users where role = 'captain' limit 1), '2026-09-01 08:50:00'),
  ('94000013-0000-4000-8000-000000000013', 'DOC-2026-0013', 'a9000005-0000-4000-8000-000000000005', (select id from public.document_types where name = 'Certificate of Indigency'), 'Medical assistance application', 'Incomplete supporting documents', 0, 'rejected', (select id from public.users where role = 'captain' limit 1), '2026-09-02 09:30:00'),
  ('94000014-0000-4000-8000-000000000014', 'DOC-2026-0014', 'a9000015-0000-4000-8000-000000000015', (select id from public.document_types where name = 'Barangay Clearance'), 'School enrollment', null, 50, 'approved',       (select id from public.users where role = 'captain' limit 1), '2026-09-03 11:20:00'),
  ('94000015-0000-4000-8000-000000000015', 'DOC-2026-0015', 'a9000024-0000-4000-8000-000000000024', (select id from public.document_types where name = 'Business Clearance'), 'Business permit application', null, 100, 'under_review',  (select id from public.users where role = 'captain' limit 1), '2026-09-04 13:45:00'),
  ('94000016-0000-4000-8000-000000000016', 'DOC-2026-0016', '46d021a3-9eea-4551-a9f8-1c5a39aff5fa', (select id from public.document_types where name = 'Barangay Clearance'), 'Employment requirements', null, 50, 'released',       (select id from public.users where role = 'captain' limit 1), '2026-09-05 10:00:00'),
  ('94000017-0000-4000-8000-000000000017', 'DOC-2026-0017', '4b9ba67a-d3f7-4e41-9daf-316a4640192c', (select id from public.document_types where name = 'Certificate of Residency'), 'Travel abroad requirements', null, 50, 'approved',       (select id from public.users where role = 'captain' limit 1), '2026-09-06 09:15:00'),
  ('94000018-0000-4000-8000-000000000018', 'DOC-2026-0018', '72dd37e2-6e3e-4a83-8af3-2c7dbdfe700d', (select id from public.document_types where name = 'Barangay Clearance'), 'Financial assistance application', null, 50, 'submitted',      null, '2026-09-08 14:25:00')
on conflict (id) do nothing;

-- ============ DOCUMENTS (issued certificates) ============
insert into public.documents
  (id, certificate_number, request_id, document_type_id, resident_id, resident_name, resident_address, purpose, issue_date, issued_by, verification_status)
values
  ('95000001-0000-4000-8000-000000000001', 'BC-SILL-2026-0001', '94000001-0000-4000-8000-000000000001', (select id from public.document_types where name = 'Barangay Clearance'), 'a9000013-0000-4000-8000-000000000013', 'Romeo Dela Cruz Santos', '31 Mabini St., Purok 4', 'Employment requirements', '2026-08-11', (select id from public.users where role = 'captain' limit 1), 'valid'),
  ('95000002-0000-4000-8000-000000000002', 'BC-SILL-2026-0002', '94000005-0000-4000-8000-000000000005', (select id from public.document_types where name = 'Barangay Clearance'), 'a9000017-0000-4000-8000-000000000017', 'Kenneth Aquino Reyes', '33 Mabini St., Purok 4', 'Travel abroad requirements', '2026-08-18', (select id from public.users where role = 'captain' limit 1), 'valid'),
  ('95000003-0000-4000-8000-000000000003', 'BC-SILL-2026-0003', '94000008-0000-4000-8000-000000000008', (select id from public.document_types where name = 'Barangay Clearance'), 'a9000027-0000-4000-8000-000000000027', 'Alvin Fernandez Villanueva', '20 Sillawit Proper, Purok 1', 'Employment requirements', '2026-08-24', (select id from public.users where role = 'captain' limit 1), 'valid'),
  ('95000004-0000-4000-8000-000000000004', 'BC-SILL-2026-0004', '94000012-0000-4000-8000-000000000012', (select id from public.document_types where name = 'Barangay Clearance'), 'a9000035-0000-4000-8000-000000000035', 'Rizal Aguilar Salcedo', '16 Acacia St., Purok 5', 'Employment requirements', '2026-09-02', (select id from public.users where role = 'captain' limit 1), 'valid'),
  ('95000005-0000-4000-8000-000000000005', 'BC-SILL-2026-0005', '94000016-0000-4000-8000-000000000016', (select id from public.document_types where name = 'Barangay Clearance'), '46d021a3-9eea-4551-a9f8-1c5a39aff5fa', 'Ana Reyes Ocampo', '24 National Road, Purok 2', 'Employment requirements', '2026-09-05', (select id from public.users where role = 'captain' limit 1), 'valid')
on conflict (id) do nothing;

-- ============ APPOINTMENTS ============
insert into public.appointments
  (id, appointment_number, resident_id, service_id, scheduled_date, scheduled_time, purpose, status)
values
  ('96000001-0000-4000-8000-000000000001', 'APPT-2026-0001', 'a9000004-0000-4000-8000-000000000004', (select id from public.appointment_services where name = 'Health Services Consultation'), '2026-09-10', '08:30', 'Blood pressure check-up', 'confirmed'),
  ('96000002-0000-4000-8000-000000000002', 'APPT-2026-0002', '46d021a3-9eea-4551-a9f8-1c5a39aff5fa', (select id from public.appointment_services where name = 'Barangay Clearance Request'), '2026-09-11', '09:00', 'Request new clearance copy', 'confirmed'),
  ('96000003-0000-4000-8000-000000000003', 'APPT-2026-0003', 'a9000033-0000-4000-8000-000000000033', (select id from public.appointment_services where name = 'Complaint Filing'), '2026-09-11', '10:00', 'File complaint regarding boundary', 'completed'),
  ('96000004-0000-4000-8000-000000000004', 'APPT-2026-0004', 'a9000025-0000-4000-8000-000000000025', (select id from public.appointment_services where name = 'Legal / Mediation Consultation'), '2026-09-12', '14:00', 'Consultation on land title', 'confirmed'),
  ('96000005-0000-4000-8000-000000000005', 'APPT-2026-0005', 'a9000006-0000-4000-8000-000000000006', (select id from public.appointment_services where name = 'Barangay Clearance Request'), '2026-09-12', '09:30', 'Clearance for benefit claim', 'completed'),
  ('96000006-0000-4000-8000-000000000006', 'APPT-2026-0006', '4b9ba67a-d3f7-4e41-9daf-316a4640192c', (select id from public.appointment_services where name = 'Legal / Mediation Consultation'), '2026-09-14', '15:00', 'Property dispute mediation', 'confirmed'),
  ('96000007-0000-4000-8000-000000000007', 'APPT-2026-0007', 'a9000015-0000-4000-8000-000000000015', (select id from public.appointment_services where name = 'Health Services Consultation'), '2026-09-15', '08:00', 'School physical exam', 'cancelled'),
  ('96000008-0000-4000-8000-000000000008', 'APPT-2026-0008', '72dd37e2-6e3e-4a83-8af3-2c7dbdfe700d', (select id from public.appointment_services where name = 'Barangay Clearance Request'), '2026-09-16', '09:30', 'Clearance for financial assistance', 'confirmed'),
  ('96000009-0000-4000-8000-000000000009', 'APPT-2026-0009', 'a9000027-0000-4000-8000-000000000027', (select id from public.appointment_services where name = 'Complaint Filing'), '2026-09-17', '10:30', 'File noise complaint', 'confirmed'),
  ('96000010-0000-4000-8000-000000000010', 'APPT-2026-0010', 'a9000018-0000-4000-8000-000000000018', (select id from public.appointment_services where name = 'Barangay Clearance Request'), '2026-09-18', '09:00', 'Clearance for tricycle franchise', 'confirmed'),
  ('96000011-0000-4000-8000-000000000011', 'APPT-2026-0011', 'a9000029-0000-4000-8000-000000000029', (select id from public.appointment_services where name = 'Health Services Consultation'), '2026-09-18', '08:30', 'Follow-up consultation', 'no_show'),
  ('96000012-0000-4000-8000-000000000012', 'APPT-2026-0012', 'a9000024-0000-4000-8000-000000000024', (select id from public.appointment_services where name = 'Legal / Mediation Consultation'), '2026-09-20', '14:30', 'Fence dispute mediation', 'confirmed')
on conflict (id) do nothing;

-- ============ COMPLAINTS ============
insert into public.complaints
  (id, complaint_number, resident_id, complaint_type_id, description, location, date_of_incident, time_of_incident, status, resolution, handled_by, created_at)
values
  ('97000001-0000-4000-8000-000000000001', 'CMP-2026-0001', 'a9000025-0000-4000-8000-000000000025', (select id from public.complaint_types where name = 'Noise Complaint'), 'Karaoke played past midnight disturbing residents nearby.', '6 Rizal Ave., Purok 6', '2026-08-15', '23:45', 'resolved', 'Advised concerned parties; karaoke now regulated to before 10 PM.', (select id from public.users where role = 'captain' limit 1), '2026-08-16 09:00:00'),
  ('97000002-0000-4000-8000-000000000002', 'CMP-2026-0002', 'a9000004-0000-4000-8000-000000000004', (select id from public.complaint_types where name = 'Property / Boundary Dispute'), 'Fence constructed beyond the property line on the north side.', '24 National Road', '2026-08-19', '10:30', 'under_review', null, (select id from public.users where role = 'captain' limit 1), '2026-08-19 14:10:00'),
  ('97000003-0000-4000-8000-000000000003', 'CMP-2026-0003', 'a9000027-0000-4000-8000-000000000027', (select id from public.complaint_types where name = 'Family / Neighbor Dispute'), 'Dispute over water drainage between two adjacent households.', '20 Sillawit Proper', '2026-08-22', '16:20', 'investigating', null, (select id from public.users where role = 'captain' limit 1), '2026-08-23 08:30:00'),
  ('97000004-0000-4000-8000-000000000004', 'CMP-2026-0004', 'a9000019-0000-4000-8000-000000000019', (select id from public.complaint_types where name = 'Noise Complaint'), 'Live band from a private event until 2 AM.', '31 Mabini St.', '2026-08-25', '01:30', 'resolved', 'Fined; event organizers advised to secure a permit next time.', (select id from public.users where role = 'captain' limit 1), '2026-08-26 09:00:00'),
  ('97000005-0000-4000-8000-000000000005', 'CMP-2026-0005', 'a9000033-0000-4000-8000-000000000033', (select id from public.complaint_types where name = 'Harassment'), 'Verbal harassment reported at the public market.', 'Sillawit Public Market', '2026-08-28', '11:00', 'resolved', 'Both parties summoned and reconciled with a written apology.', (select id from public.users where role = 'captain' limit 1), '2026-08-28 15:30:00'),
  ('97000006-0000-4000-8000-000000000006', 'CMP-2026-0006', 'a9000013-0000-4000-8000-000000000013', (select id from public.complaint_types where name = 'Property / Boundary Dispute'), 'Construction vehicle continuously blocking the driveway.', '31 Mabini St.', '2026-09-01', '07:50', 'submitted', null, null, '2026-09-01 09:20:00'),
  ('97000007-0000-4000-8000-000000000007', 'CMP-2026-0007', 'a9000024-0000-4000-8000-000000000024', (select id from public.complaint_types where name = 'Family / Neighbor Dispute'), 'Heated argument over a shared fence along Rizal Ave.', '5 Rizal Ave.', '2026-09-03', '18:00', 'investigating', null, (select id from public.users where role = 'captain' limit 1), '2026-09-03 19:10:00'),
  ('97000008-0000-4000-8000-000000000008', 'CMP-2026-0008', 'a9000009-0000-4000-8000-000000000009', (select id from public.complaint_types where name = 'Other'), 'Stray dogs roaming near the elementary school.', '7 San Isidro St.', '2026-09-06', '06:30', 'submitted', null, null, '2026-09-06 08:40:00'),
  ('97000009-0000-4000-8000-000000000009', 'CMP-2026-0009', '4b9ba67a-d3f7-4e41-9daf-316a4640192c', (select id from public.complaint_types where name = 'Noise Complaint'), 'Loud music disturbing rest in the neighborhood.', '26 National Road', '2026-09-08', '22:15', 'submitted', null, null, '2026-09-08 23:00:00')
on conflict (id) do nothing;

-- ============ INCIDENTS ============
insert into public.incidents
  (id, incident_number, incident_type_id, date, time, location, description, people_involved, responding_officials, status, resolution, reported_by, created_at)
values
  ('98000001-0000-4000-8000-000000000001', 'INC-2026-0001', (select id from public.incident_types where name = 'Fire Incident'), '2026-08-20', '14:30', 'Block 3, Purok 2', 'Small fire at a residential shed. No casualties; barangay fire volunteers responded and contained the fire.', array['Romeo Santos','Alvin Villanueva'], array['Kagawad Romeo Santos','Tanod M. Cruz'], 'resolved', 'Fire contained. Resident advised on electrical safety.', (select id from public.users where role = 'captain' limit 1), '2026-08-20 15:00:00'),
  ('98000002-0000-4000-8000-000000000002', 'INC-2026-0002', (select id from public.incident_types where name = 'Flooding'), '2026-08-26', '06:00', 'Low-lying area, Purok 4', 'Flash flood after heavy rainfall; affected families temporarily evacuated to the barangay hall.', array['Mario Delos Reyes','Elena Delos Reyes'], array['Kagawad Federico Mendoza','BHW Norma Villanueva'], 'closed', 'Families returned after flood subsided; cleanup and drainage declogging conducted.', (select id from public.users where role = 'captain' limit 1), '2026-08-26 07:30:00'),
  ('98000003-0000-4000-8000-000000000003', 'INC-2026-0003', (select id from public.incident_types where name = 'Traffic Accident'), '2026-09-01', '17:45', 'Intersection, National Road', 'Two motorcycles collided at the intersection. Minor injuries; both riders brought to the barangay health center.', array['Ramon Bautista','Jomar Pascual'], array['Tanod B. Santos'], 'investigating', null, (select id from public.users where role = 'captain' limit 1), '2026-09-01 18:10:00'),
  ('98000004-0000-4000-8000-000000000004', 'INC-2026-0004', (select id from public.incident_types where name = 'Health Emergency'), '2026-09-03', '09:20', 'Sillawit Public Market', 'Person collapsed due to heat. Treated by the barangay health worker and transported to the city hospital.', array['Teresita Salcedo'], array['BHW Norma Villanueva','Ambulance Driver Rizal Salcedo'], 'resolved', 'Patient stable and discharged after observation.', (select id from public.users where role = 'captain' limit 1), '2026-09-03 10:00:00'),
  ('98000005-0000-4000-8000-000000000005', 'INC-2026-0005', (select id from public.incident_types where name = 'Crime / Theft'), '2026-09-05', '20:10', 'Purok 6', 'Reported theft of goods from a sari-sari store; suspect apprehended by barangay tanods and turned over to police.', array['Victor Soriano'], array['Kagawad Victor Soriano','Tanod R. Cruz'], 'investigating', null, (select id from public.users where role = 'captain' limit 1), '2026-09-05 21:00:00'),
  ('98000006-0000-4000-8000-000000000006', 'INC-2026-0006', (select id from public.incident_types where name = 'Fire Incident'), '2026-08-30', '03:15', 'Purok 3', 'Kitchen fire quickly contained by residents. Minor property damage only.', array['Efren Cruz','Lydia Cruz'], array['Tanod M. Cruz'], 'closed', 'Investigated; LPG tank leak identified as cause.', (select id from public.users where role = 'captain' limit 1), '2026-08-30 04:00:00'),
  ('98000007-0000-4000-8000-000000000007', 'INC-2026-0007', (select id from public.incident_types where name = 'Flooding'), '2026-09-08', '15:30', 'Purok 1', 'Water-logged streets after heavy rain; drainage cleared by the barangay cleanup crew.', array['Norma Villanueva'], array[]::text[], 'open', null, (select id from public.users where role = 'captain' limit 1), '2026-09-08 16:20:00')
on conflict (id) do nothing;

-- ============ ANNOUNCEMENTS ============
insert into public.announcements
  (id, title, description, category, author_id, is_pinned, published_date, status)
values
  ('99000001-0000-4000-8000-000000000001', 'Barangay Assembly - September 2026', 'All residents of Sillawit are invited to the regular barangay assembly on September 15, 2026 at 6:00 PM at the Barangay Hall. Agenda includes peace and order, disaster preparedness, and the barangay budget.', 'meeting', (select id from public.users where role = 'captain' limit 1), true, '2026-09-05 08:00:00', 'published'),
  ('99000002-0000-4000-8000-000000000002', 'Free Health Check-Up Program', 'The barangay health center, in coordination with the City Health Office, will conduct free health check-ups on September 12, 2026 from 8:00 AM to 12:00 PM. All residents are welcome.', 'community_program', (select id from public.users where role = 'captain' limit 1), false, '2026-09-06 09:00:00', 'published'),
  ('99000003-0000-4000-8000-000000000003', 'Emergency Advisory: Typhoon Season', 'With the typhoon season approaching, residents are advised to prepare emergency kits, secure loose roofing, and monitor official advisories. For emergencies, contact the barangay hotline at 0961 234 5678.', 'emergency', (select id from public.users where role = 'captain' limit 1), false, '2026-09-07 10:00:00', 'published'),
  ('99000004-0000-4000-8000-000000000004', 'Community Clean-Up Drive', 'Join the Sillawit community clean-up drive this Saturday, September 13, from 7:00 AM to 11:00 AM. Meeting point is at the barangay hall. Gloves and trash bags will be provided.', 'event', (select id from public.users where role = 'captain' limit 1), false, '2026-09-08 08:30:00', 'published'),
  ('99000005-0000-4000-8000-000000000005', 'Anti-Dengue Fogging Schedule', 'Fogging operations will be conducted on September 15-16, 2026 in Purok 1, 2 and 3, starting 5:00 PM. Residents are advised to keep children indoors and cover food and water containers.', 'public_notice', (select id from public.users where role = 'captain' limit 1), false, '2026-09-09 07:00:00', 'published'),
  ('99000006-0000-4000-8000-000000000006', 'Barangay Scholarship Application Now Open', 'The Sillawit barangay scholarship program for college students is now accepting applications. Requirements are available from the Office of the Barangay Secretary. Deadline: September 30, 2026.', 'community_program', (select id from public.users where role = 'captain' limit 1), false, '2026-09-09 09:00:00', 'published')
on conflict (id) do nothing;

-- ============ PAYMENTS ============
insert into public.payments
  (id, resident_id, request_id, receipt_number, amount, payment_type, payment_method, payment_date, or_number, notes, received_by)
values
  ('8c000001-0000-4000-8000-000000000001', 'a9000013-0000-4000-8000-000000000013', '94000001-0000-4000-8000-000000000001', 'PAY-2026-0001', 50,   'cash', 'cash', '2026-08-11 09:30:00', 'OR-2026-0001', 'Barangay Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000002-0000-4000-8000-000000000002', 'a9000025-0000-4000-8000-000000000025', '94000003-0000-4000-8000-000000000003', 'PAY-2026-0002', 50,   'gcash', 'electronic', '2026-08-14 14:00:00', 'OR-2026-0002', 'Barangay Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000003-0000-4000-8000-000000000003', 'a9000017-0000-4000-8000-000000000017', '94000005-0000-4000-8000-000000000005', 'PAY-2026-0003', 50,   'cash', 'cash', '2026-08-18 10:15:00', 'OR-2026-0003', 'Barangay Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000004-0000-4000-8000-000000000004', 'a9000027-0000-4000-8000-000000000027', '94000008-0000-4000-8000-000000000008', 'PAY-2026-0004', 50,   'maya', 'electronic', '2026-08-24 13:20:00', null, 'Barangay Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000005-0000-4000-8000-000000000005', 'a9000029-0000-4000-8000-000000000029', '94000011-0000-4000-8000-000000000011', 'PAY-2026-0005', 30,   'cash', 'cash', '2026-08-28 15:00:00', 'OR-2026-0004', 'Barangay Certificate fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000006-0000-4000-8000-000000000006', 'a9000035-0000-4000-8000-000000000035', '94000012-0000-4000-8000-000000000012', 'PAY-2026-0006', 50,   'gcash', 'electronic', '2026-09-02 09:40:00', 'OR-2026-0005', 'Barangay Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000007-0000-4000-8000-000000000007', 'a9000024-0000-4000-8000-000000000024', '94000015-0000-4000-8000-000000000015', 'PAY-2026-0007', 100,  'cash', 'cash', '2026-09-03 14:30:00', 'OR-2026-0006', 'Business Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000008-0000-4000-8000-000000000008', '46d021a3-9eea-4551-a9f8-1c5a39aff5fa', '94000016-0000-4000-8000-000000000016', 'PAY-2026-0008', 50,   'gcash', 'electronic', '2026-09-05 10:05:00', 'OR-2026-0007', 'Barangay Clearance fee', (select id from public.users where role = 'captain' limit 1)),
  ('8c000009-0000-4000-8000-000000000009', 'a9000014-0000-4000-8000-000000000014', null, 'PAY-2026-0009', 200,  'cash', 'cash', '2026-09-06 09:00:00', 'OR-2026-0008', 'Community service contribution', (select id from public.users where role = 'captain' limit 1)),
  ('8c000010-0000-4000-8000-000000000010', 'a9000031-0000-4000-8000-000000000031', null, 'PAY-2026-0010', 150,  'gcash', 'electronic', '2026-09-07 11:30:00', null, 'Donation for clean-up drive', (select id from public.users where role = 'captain' limit 1)),
  ('8c000011-0000-4000-8000-000000000011', 'a9000019-0000-4000-8000-000000000019', null, 'PAY-2026-0011', 100,  'bank_transfer', 'electronic', '2026-09-08 13:10:00', null, 'Community service contribution', (select id from public.users where role = 'captain' limit 1)),
  ('8c000012-0000-4000-8000-000000000012', 'a9000009-0000-4000-8000-000000000009', null, 'PAY-2026-0012', 50,   'cash', 'cash', '2026-09-08 15:45:00', 'OR-2026-0009', 'Stray animal control fee', (select id from public.users where role = 'captain' limit 1))
on conflict (id) do nothing;

-- ============ NOTIFICATIONS (only for existing auth accounts) ============
insert into public.notifications (id, user_id, title, message, type, link)
select n.id, u.id, n.title, n.message, n.type, n.link
from (values
  ('8b000001-0000-4000-8000-000000000001'::uuid, '086588e5-6bfd-480e-856e-a6ff0d52effb'::uuid, 'Barangay Assembly Reminder', 'Barangay assembly on September 15, 2026 at 6:00 PM at the Barangay Hall.', 'announcement', '/resident/announcements'),
  ('8b000002-0000-4000-8000-000000000002'::uuid, '63812e77-ebfd-4a1b-99e9-1a1363725369'::uuid, 'Your Clearance is Ready', 'Your Barangay Clearance (DOC-2026-0016) is ready for release at the barangay hall.', 'document', '/resident/documents'),
  ('8b000003-0000-4000-8000-000000000003'::uuid, 'af6ab09c-7324-413a-8aaa-1ad08f82720d'::uuid, 'Request Approved', 'Your Certificate of Residency request (DOC-2026-0017) has been approved.', 'document', '/resident/documents'),
  ('8b000004-0000-4000-8000-000000000004'::uuid, '0f1366ee-f9dc-4af8-bbe7-e60514b1cf61'::uuid, 'New Announcement', 'Check the new anti-dengue fogging schedule in your area.', 'announcement', '/resident/announcements'),
  ('8b000005-0000-4000-8000-000000000005'::uuid, '3306d20c-fb48-49b8-8db1-38ca0157c11c'::uuid, 'Appointment Confirmed', 'Your Barangay Clearance appointment is confirmed for September 16 at 9:30 AM.', 'appointment', '/resident/appointments')
) as n(id, user_id, title, message, type, link)
join auth.users u on u.id = n.user_id
on conflict (id) do nothing;