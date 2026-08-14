# Supabase Production Source Of Truth

The repository contains multiple SQL generations from earlier project stages.

Use this order for production database alignment in this repository:

1. `aihp_mobile_production.sql`
2. `visits_field_alignment.sql`
3. `production_release.sql`

Do not deploy `vms_schema.sql` to production.

Why:

- `vms_schema.sql` contains older permissive RLS patterns such as broad `using (true)` and `with check (true)` policies.
- The current application code, Prisma mappings, and protected web/mobile/admin flows align with the `profiles` / `master_data` / `visits` / `notifications` / `audit_logs` model defined in `aihp_mobile_production.sql`.

Status:

- `vms_schema.sql`: legacy reference only
- `aihp_mobile_production.sql`: authoritative repository schema baseline
- `production_release.sql`: additive index/hardening patch
- `visits_field_alignment.sql`: additive field-alignment patch
