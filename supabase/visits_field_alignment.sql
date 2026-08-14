-- Additive schema alignment for visitor check-in/check-out metadata.
-- Execute in Supabase SQL Editor only after reviewing in staging first.
-- This does not recreate the visits table or remove existing data.

alter table public.visits
  add column if not exists company_to_visit text,
  add column if not exists mode_of_commute text,
  add column if not exists vehicle_number text,
  add column if not exists photo_url text;
