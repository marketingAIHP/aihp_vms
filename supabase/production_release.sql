-- AIHP VMS production release hardening
-- Execute this file once in the Supabase SQL Editor for the target production project.
-- These statements are safe, idempotent, and do not change existing application flows.

begin;

create unique index if not exists profiles_employee_id_unique_idx
on public.profiles (employee_id)
where employee_id is not null and btrim(employee_id) <> '';

create index if not exists profiles_role_active_company_name_idx
on public.profiles (role, is_active, company_name);

create index if not exists profiles_full_name_idx
on public.profiles (full_name);

create index if not exists visits_building_mobile_created_at_idx
on public.visits (building, mobile, created_at desc);

create index if not exists visits_building_status_created_at_idx
on public.visits (building, status, created_at desc);

-- Prevent concurrent public submissions from creating two active visits for the
-- same mobile number at the same site. Historical and checked-out visits remain
-- unrestricted.
create unique index if not exists visits_active_building_mobile_unique_idx
on public.visits (building, mobile)
where status = 'CHECKED_IN' and exited_at is null and mobile is not null;

commit;
