-- Allow a site manager to be assigned to one or more active sites.
-- Run this migration in the Supabase SQL editor before deploying the web app.

create table if not exists public.site_manager_site_assignments (
  manager_id uuid not null references public.profiles(id) on delete cascade,
  site_id uuid not null references public.master_data(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (manager_id, site_id)
);

create index if not exists site_manager_site_assignments_site_id_idx
  on public.site_manager_site_assignments (site_id);

alter table public.site_manager_site_assignments enable row level security;
revoke all on table public.site_manager_site_assignments from anon, authenticated;

-- Keep existing one-site managers working by creating their first assignment.
insert into public.site_manager_site_assignments (manager_id, site_id)
select p.id, m.id
from public.profiles p
join public.master_data m on m.kind = 'buildings' and m.value = p.company_name
where p.role in ('host', 'site_manager')
  and p.company_name is not null
on conflict do nothing;
