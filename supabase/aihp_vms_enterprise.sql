create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'host')),
  full_name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.hosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  company_name text not null,
  tenant_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  mobile_number text not null,
  email text,
  company_name text,
  id_proof_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  invitation_code text not null unique,
  host_id uuid not null references public.hosts(id) on delete restrict,
  visitor_id uuid not null references public.visitors(id) on delete restrict,
  purpose_of_visit text not null,
  visit_date date not null,
  visit_time time not null,
  visitor_count integer not null default 1,
  notes text,
  qr_value text not null unique,
  qr_expires_at timestamptz not null,
  is_single_use boolean not null default true,
  status text not null default 'expected' check (status in ('expected', 'checked_in', 'checked_out', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null unique references public.invitations(id) on delete cascade,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_by uuid references public.users(id),
  check_out_by uuid references public.users(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  channel text not null check (channel in ('email', 'sms', 'whatsapp')),
  title text not null,
  body text not null,
  sent_at timestamptz,
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  generated_by uuid not null references public.users(id) on delete restrict,
  report_type text not null,
  filters jsonb not null default '{}'::jsonb,
  file_path text,
  generated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_table text not null,
  target_id uuid,
  detail jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists invitations_host_id_idx on public.invitations(host_id);
create index if not exists invitations_visitor_id_idx on public.invitations(visitor_id);
create index if not exists invitations_status_idx on public.invitations(status);
create index if not exists visits_check_in_at_idx on public.visits(check_in_at);
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

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
drop trigger if exists hosts_set_updated_at on public.hosts;
create trigger hosts_set_updated_at before update on public.hosts for each row execute function public.set_updated_at();
drop trigger if exists visitors_set_updated_at on public.visitors;
create trigger visitors_set_updated_at before update on public.visitors for each row execute function public.set_updated_at();
drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at before update on public.invitations for each row execute function public.set_updated_at();
drop trigger if exists visits_set_updated_at on public.visits;
create trigger visits_set_updated_at before update on public.visits for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.hosts enable row level security;
alter table public.visitors enable row level security;
alter table public.invitations enable row level security;
alter table public.visits enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists users_self_or_admin on public.users;
create policy users_self_or_admin on public.users
for select to authenticated
using (
  auth.uid() = id or exists (
    select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin'
  )
);

drop policy if exists admin_manage_hosts on public.hosts;
create policy admin_manage_hosts on public.hosts
for all to authenticated
using (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin')
)
with check (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin')
);

drop policy if exists admin_or_host_read_visitors on public.visitors;
create policy admin_or_host_read_visitors on public.visitors
for select to authenticated
using (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role in ('admin', 'host'))
);

drop policy if exists invitation_access_policy on public.invitations;
create policy invitation_access_policy on public.invitations
for all to authenticated
using (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin')
  or exists (
    select 1 from public.hosts h
    join public.users u on u.id = h.user_id
    where u.id = auth.uid() and h.id = invitations.host_id
  )
)
with check (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin')
  or exists (
    select 1 from public.hosts h
    join public.users u on u.id = h.user_id
    where u.id = auth.uid() and h.id = invitations.host_id
  )
);

drop policy if exists visit_access_policy on public.visits;
create policy visit_access_policy on public.visits
for all to authenticated
using (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role in ('admin', 'host'))
)
with check (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role in ('admin', 'host'))
);

drop policy if exists notification_owner_or_admin on public.notifications;
create policy notification_owner_or_admin on public.notifications
for select to authenticated
using (
  user_id = auth.uid() or exists (
    select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin'
  )
);

drop policy if exists report_owner_or_admin on public.reports;
create policy report_owner_or_admin on public.reports
for select to authenticated
using (
  generated_by = auth.uid() or exists (
    select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin'
  )
);

drop policy if exists audit_admin_only on public.audit_logs;
create policy audit_admin_only on public.audit_logs
for select to authenticated
using (
  exists (select 1 from public.users current_user where current_user.id = auth.uid() and current_user.role = 'admin')
);

