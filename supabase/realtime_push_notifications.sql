begin;

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  is_active boolean not null default true,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_active_idx
on public.push_tokens(user_id, is_active);

alter table public.push_tokens enable row level security;

revoke all on table public.push_tokens from anon, authenticated;
grant all on table public.push_tokens to service_role;

create or replace function public.register_push_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := trim(p_token);
  v_platform text := lower(trim(p_platform));
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  if length(v_token) < 20
    or length(v_token) > 255
    or v_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Invalid Expo push token.';
  end if;

  if v_platform not in ('android', 'ios') then
    raise exception 'Unsupported push platform.';
  end if;

  insert into public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    is_active,
    last_error,
    updated_at
  )
  values (
    v_user_id,
    v_token,
    v_platform,
    true,
    null,
    now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      is_active = true,
      last_error = null,
      updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  update public.push_tokens
  set is_active = false,
      updated_at = now()
  where user_id = auth.uid()
    and expo_push_token = trim(p_token);
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
revoke all on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table public.notifications;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'visits'
    ) then
      alter publication supabase_realtime add table public.visits;
    end if;
  end if;
end;
$$;

commit;

