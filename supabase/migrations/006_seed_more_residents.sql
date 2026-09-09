-- ============================================================
-- 006_seed_more_residents.sql
-- Expands the Sillawit demo population so the dashboard charts
-- (Population by Age Group, Male / Female Distribution,
-- Population by Purok) render rich data: adds 160 residents
-- (total ~201), 40 households and 160 household members.
--
-- Idempotent: deterministic UUIDs + ON CONFLICT DO NOTHING.
-- Prerequisites: 001-005. Safe to re-run.
-- ============================================================

-- ---------- RESIDENTS (160) ----------
insert into public.residents
  (id, user_id, first_name, middle_name, last_name, suffix, dob, sex, civil_status,
   address, purok, contact_number, occupation, voter_status, residency_status, date_registered)
select
  ('70000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid as id,
  null as user_id,
  case when i % 2 = 0 then
    male_firsts[((i / 2) % 28) + 1]
  else
    female_firsts[(((i - 1) / 2) % 28) + 1]
  end as first_name,
  middles[((i / 2) % 8) + 1] as middle_name,
  lasts[(i % 26) + 1] as last_name,
  case when i % 11 = 0 then 'Jr.' else null end as suffix,
  (date '2026-09-09' - make_interval(years => age) - make_interval(days => i % 7))::date as dob,
  case when i % 2 = 0 then 'male' else 'female' end as sex,
  case
    when age < 18 then 'single'
    else (array['married','married','single','widowed','separated'])[(i % 5) + 1]
  end as civil_status,
  (10 + i % 90) || ' ' || streets[(i % 6) + 1] as address,
  'Purok ' || ((i % 6) + 1) as purok,
  '09' || lpad(((700000000 + (i * 7919) % 100000000))::text, 9, '0') as contact_number,
  occupations[(i % 20) + 1] as occupation,
  case
    when age < 18 then 'unregistered'
    else (array['registered','registered','registered','pending'])[(i % 4) + 1]
  end as voter_status,
  case
    when i % 89 = 0 then 'inactive'
    when i % 53 = 0 then 'transferred'
    else 'active'
  end as residency_status,
  date '2026-08-01' + (i % 60) as date_registered
from generate_series(0, 159) as g(i)
cross join lateral (
  select
    array['Alberto','Bernardo','Carlos','Domingo','Ernesto','Francisco','Gregorio','Herman','Isidro','Jose','Lino','Manuel','Nestor','Oscar','Placido','Quirino','Rafael','Salvador','Tomas','Ubaldo','Vicente','Wilfredo','Arnel','Rogelio','Dindo','Mario','Lito','Rene'] as male_firsts,
    array['Avelina','Basilisa','Corazon','Divina','Esperanza','Felisa','Gertrudes','Hilaria','Isela','Juana','Kristine','Lourdes','Mercedes','Nieves','Ofelia','Purificacion','Rosario','Salud','Teodora','Urbana','Violeta','Winnie','Adelaida','Belen','Charina','Dalisay','Eloisa','Fe'] as female_firsts,
    array['Abad','Balagtas','Cabrera','Dizon','Estrada','Fortunato','Gabriel','Hernandez','Ilagan','Jacinto','Kalaw','Lansang','Mallari','Nicolas','Ocampo','Palma','Quijano','Roxas','Samson','Tobias','Uy','Valdez','Wenceslao','Xavier','Yumul','Zoilo'] as lasts,
    array['Santos','Reyes','Lopez','Cruz','Garcia','Ramos','Rivera','Torres','Aquino','Bautista'] as middles,
    array['Teacher','Tricycle Driver','Vendor','Mechanic','Farmer','Carpenter','Construction Worker','Seaman / OFW','Nurse','Government Employee','Security Guard','Barangay Tanod','Small Business Owner','Student','Housewife','Electrician','Plumber','Driver','Fisherman','Tutor'] as occupations,
    array['Mabini St.','Rizal Ave.','Bonifacio St.','Luna St.','Aguinaldo Blvd.','San Jose Road'] as streets
) as names
cross join lateral (
  select case (i % 10)
    when 0 then 40 + (i % 20)
    when 1 then 3 + (i % 15)
    when 2 then 25 + (i % 15)
    when 3 then 12 + (i % 6)
    when 4 then 18 + (i % 12)
    when 5 then 6 + (i % 12)
    when 6 then 60 + (i % 15)
    when 7 then 2 + (i % 12)
    when 8 then 30 + (i % 16)
    when 9 then 61 + (i % 30)
  end as age
) as agecalc
on conflict (id) do nothing;

-- ---------- HOUSEHOLDS (40) ----------
insert into public.households
  (id, household_number, address, purok, household_head_id, monthly_income, house_ownership, status)
select
  ('71000000-0000-4000-8000-' || lpad(to_hex(h), 12, '0'))::uuid as id,
  'H-' || lpad((117 + h)::text, 3, '0') as household_number,
  r.address,
  r.purok,
  r.id as household_head_id,
  6000 + ((h * 2517) % 30000) as monthly_income,
  (array['owned','rented','living_with_family'])[(h % 3) + 1] as house_ownership,
  'active' as status
from generate_series(0, 39) as g(h)
join public.residents r on r.id = ('70000000-0000-4000-8000-' || lpad(to_hex(h * 4), 12, '0'))::uuid
on conflict (id) do nothing;

-- ---------- ASSIGN RESIDENTS TO HOUSEHOLDS ----------
update public.residents r
set household_id = h.id
from generate_series(0, 159) as g(i)
join public.households h
  on h.id = ('71000000-0000-4000-8000-' || lpad(to_hex(i / 4), 12, '0'))::uuid
where r.id = ('70000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid;

-- ---------- HOUSEHOLD MEMBERS (160) ----------
insert into public.household_members (id, household_id, resident_id, relationship)
select
  ('72000000-0000-4000-8000-' || lpad(to_hex(seq), 12, '0'))::uuid as id,
  ('71000000-0000-4000-8000-' || lpad(to_hex(seq / 4), 12, '0'))::uuid as household_id,
  ('70000000-0000-4000-8000-' || lpad(to_hex(seq), 12, '0'))::uuid as resident_id,
  (array['head','member','member','member'])[(seq % 4) + 1] as relationship
from generate_series(0, 159) as seq
on conflict (id) do nothing;