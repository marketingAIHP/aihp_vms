-- Restrict site-manager visitor access to the manager's assigned site.
-- Run once in the Supabase SQL Editor.

create or replace function public.current_user_site()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select company_name from public.profiles where id = auth.uid()
$$;

drop policy if exists visits_select_policy on public.visits;
create policy visits_select_policy
on public.visits
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'receptionist')
  or (public.current_user_role() = 'host' and building = public.current_user_site())
);

drop policy if exists visits_insert_policy on public.visits;
create policy visits_insert_policy
on public.visits
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'receptionist')
  or (public.current_user_role() = 'host' and building = public.current_user_site())
);

drop policy if exists visits_update_policy on public.visits;
create policy visits_update_policy
on public.visits
for update
to authenticated
using (
  public.current_user_role() in ('admin', 'receptionist')
  or (public.current_user_role() = 'host' and building = public.current_user_site())
)
with check (
  public.current_user_role() in ('admin', 'receptionist')
  or (public.current_user_role() = 'host' and building = public.current_user_site())
);
