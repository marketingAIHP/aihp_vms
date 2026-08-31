-- Site device registry. Run once in the Supabase SQL Editor.

create table if not exists public.site_devices (
  id uuid primary key default gen_random_uuid(),
  serial_number text not null unique check (char_length(btrim(serial_number)) between 1 and 120),
  site_name text not null check (char_length(btrim(site_name)) between 1 and 120),
  activation_code text,
  created_at timestamptz not null default now()
);

alter table public.site_devices add column if not exists activation_code text;

create unique index if not exists site_devices_activation_code_unique_idx
  on public.site_devices (activation_code)
  where activation_code is not null;

create index if not exists site_devices_site_name_idx on public.site_devices (site_name);

alter table public.site_devices enable row level security;

revoke all on table public.site_devices from anon, authenticated;
