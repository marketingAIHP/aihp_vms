-- Automatic visitor checkout at 12:00 AM India Standard Time (IST).
-- Run once in the Supabase SQL Editor after the production source-of-truth scripts.
-- This is idempotent: it updates the function and replaces the scheduled job.

alter table public.visits
  add column if not exists checkout_method text;

alter table public.visits
  drop constraint if exists visits_checkout_method_check;

alter table public.visits
  add constraint visits_checkout_method_check
  check (checkout_method is null or checkout_method in ('MANUAL', 'AUTO'));

create index if not exists visits_open_checkout_idx
  on public.visits (checked_in_at)
  where status = 'CHECKED_IN' and exited_at is null;

create or replace function public.auto_checkout_open_visits()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  checked_out_count integer;
begin
  with checked_out as (
    update public.visits
    set
      exited_at = now(),
      status = 'EXITED',
      checkout_method = 'AUTO'
    where status = 'CHECKED_IN'
      and exited_at is null
    returning id, visitor_name
  ), audit_entries as (
    insert into public.audit_logs (
      actor_name,
      actor_role,
      action,
      target_table,
      target_id,
      detail
    )
    select
      'System',
      'admin',
      'AUTO_CHECK_OUT',
      'visits',
      id,
      format('Auto checked out visitor %s at midnight IST.', visitor_name)
    from checked_out
    returning id
  )
  select count(*) into checked_out_count from audit_entries;

  return checked_out_count;
end;
$$;

-- Supabase pg_cron runs in UTC by default. 18:30 UTC is 12:00 AM IST.
create extension if not exists pg_cron with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'auto-checkout-visitors-at-midnight-ist';

select cron.schedule(
  'auto-checkout-visitors-at-midnight-ist',
  '30 18 * * *',
  'select public.auto_checkout_open_visits();'
);
