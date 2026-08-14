-- Add editable site metadata without replacing or recreating existing site rows.

begin;

alter table public.master_data
  add column if not exists address text not null default '',
  add column if not exists image_path text;

alter table public.master_data
  drop constraint if exists master_data_address_length_check;

alter table public.master_data
  add constraint master_data_address_length_check
  check (char_length(address) <= 500);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.admin_update_site(
  p_site_id uuid,
  p_name text,
  p_address text,
  p_image_path text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_name text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Unauthorized';
  end if;

  p_name := btrim(coalesce(p_name, ''));
  p_address := btrim(coalesce(p_address, ''));
  p_image_path := nullif(btrim(coalesce(p_image_path, '')), '');

  if char_length(p_name) < 2 or char_length(p_name) > 120 then
    raise exception 'Invalid site name';
  end if;

  if char_length(p_address) > 500 then
    raise exception 'Invalid site address';
  end if;

  if p_image_path is not null and (
    char_length(p_image_path) > 500
    or p_image_path !~ ('^' || p_site_id::text || '/[A-Za-z0-9._-]+$')
  ) then
    raise exception 'Invalid site image path';
  end if;

  select value
  into previous_name
  from public.master_data
  where id = p_site_id and kind = 'buildings'
  for update;

  if previous_name is null then
    raise exception 'Site not found';
  end if;

  update public.master_data
  set value = p_name,
      address = p_address,
      image_path = coalesce(p_image_path, image_path)
  where id = p_site_id and kind = 'buildings';

  if previous_name <> p_name then
    update public.profiles
    set company_name = p_name
    where company_name = previous_name;

    update public.visits
    set building = p_name
    where building = previous_name;
  end if;
end;
$$;

revoke execute on function public.admin_update_site(uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.admin_update_site(uuid, text, text, text)
to service_role;

commit;
