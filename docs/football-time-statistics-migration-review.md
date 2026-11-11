# Football Time — Player Statistics Migration Review

**Status:** Applied to production Supabase; deployment record updated 2026-11-11  
**Migration:** `supabase/migrations/20261111063000_create_player_statistics_foundation.sql`  
**Target:** Supabase project `igbprkdqtsxvlcgcrqkn`  
**Applied:** Yes — migration version `20261111064131` (`create_player_statistics_foundation`). Follow-up privilege hardening migration `20261111064223` (`restrict_player_statistics_service_role_grants`) also applied.

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

All rows carry `user_id`. Composite foreign keys include `user_id` so a row cannot reference another user's canonical player, import batch, source observation, or current-stat row. Source observations have an explicit unique `(user_id, id)` key to support the change-history foreign key. User deletion cascades only that user's private records; player/source/history relationships use restrictive deletes to protect provenance.

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
6. The pgTAP file checks table existence, RLS, owner SELECT/INSERT policies, absence of anonymous SELECT and authenticated DELETE, and append-only policy shape. The two-user transactional isolation test and synthetic import lifecycle test have now passed. Application-level tests using real Auth sessions over the HTTP API remain a separate future check.

## 6. Validation status

- PR #55 offline Python CI: passed, 12/12 tests, including the new CSV validation-to-preview integration test.
- GitHub Actions static schema checks: passed; confirmed seven additive tables, RLS enablement statements, no destructive DDL, pgTAP plan/assertion count 32/32, and the rollback-only two-user SQL test structure.
- Production transaction test: passed. Two synthetic authenticated identities could each read only their own rows across all seven tables; cross-owner insert/updates and ownership transfer were denied; no authenticated DELETE or append-only UPDATE was available.
- Database import lifecycle: passed inside the same rollback-only transaction for a synthetic approved record from canonical player/provider ID through import batch, source observation, current statistics and change history. A `manual_review` source was rejected from current statistics.
- pgTAP schema test: executed successfully in a transaction; all 32 assertions passed. The `pgtap` extension was created only within that transaction and was not persisted after rollback.
- Live Supabase: both additive migrations applied successfully. Seven new tables are present with RLS enabled; all seven are empty. `anon` has no SELECT/INSERT privileges, `authenticated` has no DELETE privilege, and `service_role` grants are limited to the documented operations after the follow-up hardening migration. Existing tables remain unchanged: `player_records` 189 rows, `player_sync_runs` 3 rows, `player_sync_previews` 3 rows.

A separate local Supabase instance or hosted development branch was not created, avoiding potential compute charges. The SQL tests were run in explicit rollback-only transactions against the live project. The simulated identities do not replace application-level HTTP tests using real Auth sessions.

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


## 8. Production deployment record (2026-11-11)

- PR #53 merged to `main`: commit `15a9a1e4bcbc8270bdf860c6dbec9b7239e35ef6`.
- Production migration `20261111064131_create_player_statistics_foundation`: applied successfully.
- Production migration `20261111064223_restrict_player_statistics_service_role_grants`: applied successfully. This follow-up revokes inherited/default extra grants from `service_role` on the seven new tables, then grants only SELECT/INSERT/UPDATE on mutable tables and SELECT/INSERT on append-only source/history tables.
- Verified in production: all seven new tables exist, RLS is enabled, all seven have zero rows, `anon` has no SELECT/INSERT, authenticated has no DELETE, and service_role has no DELETE. Append-only tables deny UPDATE to both authenticated and service_role.
- Verified existing row counts unchanged: `player_records=189`, `player_sync_runs=3`, `player_sync_previews=3`.
- No player data was imported, no API was called, no provider quota was consumed, and no scheduled workflow was added.
- pgTAP was executed in a rollback-only transaction: 32/32 assertions passed. Two-user RLS isolation and the synthetic import transaction also passed. Real Auth HTTP-session tests remain outstanding before enabling production imports.


## 9. Transactional verification (2026-11-11)

- Executed `supabase/tests/player_statistics_two_user_import_transaction.test.sql` against the production database in one explicit transaction ending in `ROLLBACK`. Two synthetic auth identities were created only inside that transaction; no real accounts were created.
- The test passed for owner-only SELECT isolation across all seven tables, denied cross-owner INSERT, no-op cross-owner UPDATE, denied ownership transfer, no authenticated DELETE, append-only source/history privileges, and rejection of current statistics derived from a `manual_review` source.
- The same transaction exercised the complete database write sequence for a synthetic approved import: canonical player, provider ID mapping, import batch, immutable source observation, current-stat row, and change-history row.
- After rollback, row counts remained unchanged: `player_records=189`, `player_sync_runs=3`, `player_sync_previews=3`, and all seven `ft_*` tables remained empty.
- Added a repeatable local SQL test and a Python end-to-end preflight/preview test to the repository. The Python test validates the CSV, performs exact provider-ID mapping, quarantines an unmatched identity, preserves blank statistics as unknown, and verifies preview hashes/reports. CI is configured to run it.
- The pgTAP test was also run with a transaction-scoped extension install; verification confirmed the extension was not left installed after rollback. The two identities were simulated by setting authenticated JWT claims, not by creating and signing into real Auth sessions through the HTTP API. Application-level authenticated API tests remain a separate future check.


## 10. Expanded automated regression checks (PR #57, 2026-11-11)

- Offline Python CI passed **25/25 tests** after expanding CSV validator and preview edge cases.
- A separate disposable PostgreSQL 16 CI service successfully applied both player-statistics migrations and executed `supabase/tests/player_statistics_two_user_import_transaction.test.sql`; the transaction completed with `ROLLBACK`.
- This CI job runs on relevant pull requests and does not connect to the production Supabase project.
- Preview parsing now fails closed for duplicate headers, extra values in a source row, and header-only source CSV files. Extra CSV values are retained as a row-level rejection reason rather than silently discarded.
- PR #57 is open and both CI jobs are green; it has not been merged.
- The web UI is not yet connected to the CSV import flow or `ft_*` tables. The current Cloud Preview panel remains the legacy squad preview flow.
