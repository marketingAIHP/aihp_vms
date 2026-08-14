create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'host', 'receptionist')),
  email text,
  phone_number text,
  employee_id text,
  company_name text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.master_data (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('buildings', 'floors', 'rooms', 'purposes', 'categories')),
  value text not null,
  address text not null default '',
  image_path text,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, value)
);

alter table public.master_data add column if not exists address text not null default '';
alter table public.master_data add column if not exists image_path text;

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  company text not null,
  purpose text not null,
  category text not null default 'Guest',
  mobile text,
  email text,
  building text not null,
  floor text not null,
  room text not null,
  scheduled_at timestamptz not null,
  host_user_id uuid not null references public.profiles(id) on delete restrict,
  host_name text not null,
  status text not null default 'INVITED' check (status in ('INVITED', 'QR_SHARED', 'ARRIVED', 'VERIFIED', 'CHECKED_IN', 'ACCESS_GRANTED', 'CANCELLED', 'DENIED', 'EXITED')),
  qr_token text not null unique,
  photo_required boolean not null default true,
  live_photo_captured boolean not null default false,
  consent_captured boolean not null default false,
  id_verified boolean not null default false,
  checked_in_at timestamptz,
  exited_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  target_roles text[] not null default array['admin', 'host', 'receptionist']::text[],
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  actor_role text check (actor_role in ('admin', 'host', 'receptionist')),
  action text not null,
  target_table text not null,
  target_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists phone_number text;
alter table public.profiles add column if not exists employee_id text;
alter table public.profiles add column if not exists company_name text;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists created_by uuid references public.profiles(id);
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.visits add column if not exists category text not null default 'Guest';
alter table public.visits add column if not exists mobile text;
alter table public.visits add column if not exists email text;
alter table public.visits add column if not exists consent_captured boolean not null default false;
alter table public.visits add column if not exists id_verified boolean not null default false;
alter table public.visits add column if not exists exited_at timestamptz;
alter table public.visits add column if not exists notes text;

alter table public.visits drop constraint if exists visits_status_check;
alter table public.visits
add constraint visits_status_check
check (status in ('INVITED', 'QR_SHARED', 'ARRIVED', 'VERIFIED', 'CHECKED_IN', 'ACCESS_GRANTED', 'CANCELLED', 'DENIED', 'EXITED'));

create index if not exists visits_host_user_id_idx on public.visits(host_user_id);
create index if not exists visits_status_idx on public.visits(status);
create index if not exists visits_qr_token_idx on public.visits(qr_token);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at
before update on public.visits
for each row
execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'host',
    new.email
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.master_data enable row level security;
alter table public.visits enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists profiles_select_policy on public.profiles;
create policy profiles_select_policy
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or public.current_user_role() in ('admin', 'receptionist')
);

-- Profile mutations are intentionally server-side only. Do not add a self-update
-- policy here: role, site assignment, employee ID, and active status are privileged.
drop policy if exists profiles_update_own_policy on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

drop policy if exists profiles_admin_manage_policy on public.profiles;
create policy profiles_admin_manage_policy
on public.profiles
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists master_data_read_policy on public.master_data;
create policy master_data_read_policy
on public.master_data
for select
to authenticated
using (true);

drop policy if exists master_data_admin_manage_policy on public.master_data;
create policy master_data_admin_manage_policy
on public.master_data
for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists visits_select_policy on public.visits;
create policy visits_select_policy
on public.visits
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'receptionist')
  or host_user_id = auth.uid()
);

drop policy if exists visits_insert_policy on public.visits;
create policy visits_insert_policy
on public.visits
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'receptionist')
  or (public.current_user_role() = 'host' and host_user_id = auth.uid())
);

drop policy if exists visits_update_policy on public.visits;
create policy visits_update_policy
on public.visits
for update
to authenticated
using (
  public.current_user_role() in ('admin', 'receptionist')
  or host_user_id = auth.uid()
)
with check (
  public.current_user_role() in ('admin', 'receptionist')
  or host_user_id = auth.uid()
);

drop policy if exists notifications_select_policy on public.notifications;
create policy notifications_select_policy
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'admin'
  or (user_id is null and public.current_user_role() = any(target_roles))
);

drop policy if exists notifications_insert_policy on public.notifications;
create policy notifications_insert_policy
on public.notifications
for insert
to authenticated
with check (public.current_user_role() in ('admin', 'host', 'receptionist'));

drop policy if exists notifications_update_policy on public.notifications;
create policy notifications_update_policy
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

drop policy if exists audit_logs_select_policy on public.audit_logs;
create policy audit_logs_select_policy
on public.audit_logs
for select
to authenticated
using (public.current_user_role() = 'admin');

drop policy if exists audit_logs_insert_policy on public.audit_logs;
create policy audit_logs_insert_policy
on public.audit_logs
for insert
to authenticated
with check (public.current_user_role() in ('admin', 'host', 'receptionist'));
