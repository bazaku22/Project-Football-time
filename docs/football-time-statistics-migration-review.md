# Football Time — Player Statistics Migration Review

**Status:** Draft for human review only  
**Migration:** `supabase/migrations/20261111063000_create_player_statistics_foundation.sql`  
**Target:** Supabase project `igbprkdqtsxvlcgcrqkn`  
**Applied:** No — this SQL has not been executed against the live project.

## 1. Safety boundary

This is an additive schema proposal. It creates seven new `ft_*` tables and does not alter, rename, truncate, backfill, or delete any existing table or record.

The existing production tables were inspected read-only before drafting:
- `public.player_records`: 189 rows
- `public.player_sync_runs`: 3 rows
- `public.player_sync_previews`: 3 rows

All three existing tables already have RLS enabled and owner-scoped policies. This migration leaves their schema, policies, records, and Edge Function untouched. No API calls, provider quotas, scheduled jobs, or new data collection are introduced.

## 2. New tables

| Table | Purpose | Client mutation model |
|---|---|---|
| `ft_players` | Football Time canonical player identity; `canonical_player_key` is the text key used by the CSV mapping file | Owner select/insert/update |
| `ft_player_source_ids` | Exact provider + provider player ID mapping to a canonical player; name is never an identity key | Owner select/insert/update |
| `ft_player_import_batches` | File SHA-256, source, row counts, status, and import audit | Owner select/insert/update |
| `ft_player_stat_source_records` | Source-specific immutable statistics observations with season, competition, team, squad level, scope, rights and provenance | Owner select/insert only |
| `ft_player_memberships` | Evidence-backed player/team/season/squad-level membership | Owner select/insert/update |
| `ft_player_stats_current` | Reviewed current statistics read model, linked to one exact source observation | Owner select/insert/update |
| `ft_player_stat_change_history` | Append-only record of changes to reviewed statistics | Owner select/insert only |

All rows carry `user_id`. Composite foreign keys include `user_id` so a row cannot reference another user's canonical player, import batch, source observation, or current-stat row. User deletion cascades only that user's private records; player/source/history relationships use restrictive deletes to protect provenance.

## 3. CSV-to-database mapping

- `canonical_player_key` → `ft_players.canonical_player_key`; this is a text key, not the UUID primary key.
- `provider` + `provider_player_id` → `ft_player_source_ids.source_name` + `provider_player_id`; only exact provider IDs may resolve identity.
- `team_code`, `season`, `squad_level` → `ft_player_memberships`.
- File checksum and row counts → `ft_player_import_batches`.
- `competition_code`, scope, match identifiers/date, stats, source URL/record ID, collection time, rights status and permission reference → `ft_player_stat_source_records`.
- `ft_player_stats_current` must point to the selected source record for the same user and player. Its insert/update RLS checks also require an approved source record with matching season, competition, team, squad level, scope, match, date and statistics JSON.

The current preview tool hashes the input files. A future database importer must additionally compute a deterministic SHA-256 hash for each normalized source row before inserting `content_hash`; it must not reuse the whole-file hash for every row.

## 4. Security and data integrity

- RLS is enabled on all seven new tables.
- Authenticated users receive only owner-scoped SELECT/INSERT/UPDATE policies.
- No `anon` privileges are granted.
- No authenticated DELETE privileges or DELETE policies are created.
- Source observations and change history are append-only for client roles.
- No `SECURITY DEFINER` functions, triggers, public views, or scheduled jobs are introduced.
- Server-side `service_role` grants mirror the minimum table operations and must never be used in browser code.
- Season uses the `YYYY/YY` format; squad level and statistics scope are constrained; match scope requires a match ID and date; non-match scope must not carry match-only fields.
- JSONB statistics must be an object. Blank CSV statistics remain unknown; a numeric zero remains a measured zero.

The migration does not automatically write change-history rows. A future application write path must update `ft_player_stats_current` and insert the corresponding `ft_player_stat_change_history` row in one database transaction.

## 5. Deliberate limits / open decisions

1. Team and competition identifiers remain text codes for now. No foreign keys are added until the canonical catalogue IDs and youth-competition mapping are confirmed.
2. The schema supports season labels in `YYYY/YY` form, while the current import workflow must enforce the project scope of 2026/27. This avoids a schema migration every season.
3. Statistics remain in a JSONB object for provider-neutral extensibility. The importer must validate the known metric vocabulary and units before writing; it must not infer absent metrics or turn blanks into zero.
4. Rights status is provenance, not legal certification. A human must verify the permission reference. Current statistics can only select a source observation whose rights status is `approved`.
5. `updated_at` values are expected to be maintained by the future write path; this migration intentionally adds no timestamp triggers.
6. The pgTAP file currently checks table existence, RLS, owner SELECT/INSERT policies, absence of anonymous SELECT and authenticated DELETE, and append-only policy shape. Functional two-user isolation tests and an end-to-end import transaction test remain required before enabling production writes.

## 6. Validation status

- Existing PR #53 offline Python CI: passed, 11/11 tests.
- GitHub Actions static schema checks: passed; confirmed seven additive tables, RLS enablement statements, no destructive DDL, and pgTAP plan/assertion count 32/32.
- Migration SQL: reviewed against the live schema metadata and current Supabase RLS guidance; not executed.
- pgTAP schema test: added but not run because the Supabase CLI / local Postgres test environment is not available in this execution environment.
- Live Supabase: no DDL, grants, policies, inserts, updates, or deletes were executed.

The PR must not be merged as a live database deployment signal. Review the SQL and tests first; then validate against a local disposable Supabase database before separately authorizing any live migration.

## 7. Rollback plan

Preferred rollback after deployment is to revert application code and leave the new tables in place, preserving any imported evidence and audit history.

Only if the new tables are confirmed empty, or after a separately authorized complete export/backup, may a rollback migration drop the new tables in reverse dependency order:

1. `ft_player_stat_change_history`
2. `ft_player_stats_current`
3. `ft_player_memberships`
4. `ft_player_stat_source_records`
5. `ft_player_import_batches`
6. `ft_player_source_ids`
7. `ft_players`

Never drop or truncate `player_records`, `player_sync_runs`, or `player_sync_previews` as part of this rollback.
