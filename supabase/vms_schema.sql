-- LEGACY SCHEMA FILE
-- DO NOT DEPLOY TO PRODUCTION.
-- This file represents an earlier schema generation with permissive RLS policies.
-- The current production-oriented schema source for this repository is
-- `supabase/aihp_mobile_production.sql` together with the supplemental
-- hardening/index scripts in `supabase/production_release.sql` and
-- `supabase/visits_field_alignment.sql`.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'host', 'receptionist')),
  employee_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  company text not null,
  purpose text not null,
  building text not null,
  floor text not null,
  room text not null,
  scheduled_at timestamptz not null,
  host_user_id uuid not null references public.profiles(id) on delete restrict,
  host_name text not null,
  status text not null default 'INVITED' check (status in ('INVITED', 'QR_SHARED', 'ARRIVED', 'VERIFIED', 'CHECKED_IN', 'ACCESS_GRANTED')),
  qr_token text not null unique,
  photo_required boolean not null default true,
  live_photo_captured boolean not null default false,
  consent_captured boolean not null default false,
  checked_in_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_host_user_id_idx on public.visits(host_user_id);
create index if not exists visits_status_idx on public.visits(status);
create index if not exists visits_qr_token_idx on public.visits(qr_token);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
before update on public.visits
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'host')
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.visits enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "visits_select_authenticated" on public.visits;
create policy "visits_select_authenticated"
on public.visits
for select
to authenticated
using (true);

drop policy if exists "visits_insert_authenticated" on public.visits;
create policy "visits_insert_authenticated"
on public.visits
for insert
to authenticated
with check (true);

drop policy if exists "visits_update_authenticated" on public.visits;
create policy "visits_update_authenticated"
on public.visits
for update
to authenticated
using (true)
with check (true);
