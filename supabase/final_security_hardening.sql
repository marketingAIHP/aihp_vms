-- Final production authorization hardening for the live AIHP VMS schema.
-- This migration is additive/restrictive only: it does not drop tables or data.

begin;

create table if not exists public.public_rate_limits (
  scope text not null,
  client_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (scope, client_hash)
);

alter table public.public_rate_limits enable row level security;
revoke all on table public.public_rate_limits from public, anon, authenticated;

create index if not exists public_rate_limits_window_started_at_idx
on public.public_rate_limits (window_started_at);

create unique index if not exists visits_active_building_mobile_unique_idx
on public.visits (building, mobile)
where status = 'CHECKED_IN' and exited_at is null and mobile is not null;

create or replace function public.consume_public_rate_limit(
  p_scope text,
  p_client_hash text,
  p_window_seconds integer default 300,
  p_max_requests integer default 30
)
returns table (limited boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bucket public.public_rate_limits%rowtype;
begin
  if length(p_scope) < 1 or length(p_scope) > 80
     or length(p_client_hash) <> 64
     or p_window_seconds < 1 or p_window_seconds > 3600
     or p_max_requests < 1 or p_max_requests > 1000 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into public.public_rate_limits (scope, client_hash)
  values (p_scope, p_client_hash)
  on conflict (scope, client_hash) do update
  set request_count = case
        when public.public_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1
        else public.public_rate_limits.request_count + 1
      end,
      window_started_at = case
        when public.public_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now()
        else public.public_rate_limits.window_started_at
      end
  returning * into bucket;

  return query select
    bucket.request_count > p_max_requests,
    greatest(0, p_max_requests - bucket.request_count),
    greatest(1, ceil(extract(epoch from (
      bucket.window_started_at + make_interval(secs => p_window_seconds) - now()
    )))::integer);
end;
$$;

revoke execute on function public.consume_public_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, text, integer, integer) to service_role;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Never trust user-controlled signup metadata for authorization. Admin-created
-- accounts are promoted by trusted service-role code after the trigger runs.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
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
  set email = excluded.email,
      full_name = excluded.full_name;

  return new;
end;
$$;

-- Trigger helpers must not be callable as public RPC functions.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

-- Remove overlapping self-update policies that permit role/site/employee-id
-- escalation. Profile administration is performed by trusted service-role code.
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_own_policy on public.profiles;

-- The current clients read visits directly but perform mutations through trusted
-- server routes. Removing direct mutations prevents forged status, host, site,
-- timestamps, and visitor identity changes.
drop policy if exists visits_insert_policy on public.visits;
drop policy if exists visits_update_policy on public.visits;

-- Notifications and audit records are created by trusted server-side services.
-- Authenticated users can only read permitted rows and mark their own notification
-- as read; they cannot forge messages, target roles, or audit actors.
drop policy if exists notifications_insert_policy on public.notifications;
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

drop policy if exists notifications_update_policy on public.notifications;
drop policy if exists notifications_mark_own_read_policy on public.notifications;
create policy notifications_mark_own_read_policy
on public.notifications
for update
to authenticated
using (user_id = auth.uid() or public.current_user_role() = 'admin')
with check (user_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists audit_logs_insert_policy on public.audit_logs;

-- Private visitor photos are immutable through client credentials. Uploads and
-- signed downloads remain server-side via the service role.
drop policy if exists visitor_photos_admin_insert on storage.objects;
drop policy if exists visitor_photos_admin_update on storage.objects;

-- Apply least-privilege table grants. RLS remains the row-level enforcement layer.
revoke all on table public.profiles from anon;
revoke all on table public.visits from anon;
revoke all on table public.notifications from anon;
revoke all on table public.audit_logs from anon;
revoke all on table public.master_data from anon;

revoke insert, update, delete, truncate, references, trigger on table public.profiles from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.visits from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.notifications from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.audit_logs from authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.master_data from authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.visits to authenticated;
grant select on table public.notifications to authenticated;
grant update (is_read) on table public.notifications to authenticated;
grant select on table public.audit_logs to authenticated;
grant select on table public.master_data to authenticated;

-- Enforce the same limits at Storage as the public upload route.
update storage.buckets
set public = false,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'visitor-photos';

commit;
