begin;

-- Remove legacy permissive policies that bypass the intended role/site ownership model.
drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "visits_insert_authenticated" on public.visits;
drop policy if exists "visits_select_authenticated" on public.visits;
drop policy if exists "visits_update_authenticated" on public.visits;

-- Keep master_data readable to authenticated users because it contains only
-- non-sensitive reference values used by the app:
-- kind, value, sort_order, is_active, created_at.

-- Restrict visitor-photos object reads to admin/receptionist roles only.
drop policy if exists "visitor_photos_authenticated_select" on storage.objects;
create policy "visitor_photos_admin_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'visitor-photos'
  and public.current_user_role() = any (array['admin'::text, 'receptionist'::text])
);

commit;
