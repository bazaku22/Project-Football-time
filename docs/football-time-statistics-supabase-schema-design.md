# Football Time Statistics Database — Supabase Schema Design

**Status:** Design only; not a migration  
**Version:** 0.1  
**Project:** `igbprkdqtsxvlcgcrqkn`

## 1. Current database facts (read-only inspection)

The existing private-cloud schema currently contains:

### `public.player_records`
- UUID primary key
- `provider`, `provider_player_id`, `player_name`
- `league_id`, `team_id`, `season`
- `position`
- JSONB `profile`, `stats`, and `source_metadata`
- `user_id` ownership column
- unique key: `(user_id, provider, provider_player_id, league_id, team_id, season)`

### `public.player_sync_runs`
- User-owned sync run history with provider, status, timestamps, counts, metadata and error summary.

### `public.player_sync_previews`
- User-owned preview payloads with status, summary, expiry and consumed timestamp.

All three tables have RLS enabled with authenticated owner-scoped SELECT/INSERT/UPDATE policies. The existing owner policies use `auth.uid() = user_id`. This design must be preserved and reviewed for every new table.

## 2. Design principles

1. Do not repurpose or rewrite `player_records`; it remains the legacy/provider roster record.
2. Add a Football Time canonical player identity layer, separate from provider IDs.
3. Store each source's observation immutably; never overwrite one provider's raw observation with another.
4. Store reviewed/current statistics separately from source observations.
5. Every new row is user-owned (`user_id`) in the first implementation, matching the existing private-cloud model.
6. First-team and youth level, season, competition, team, and statistics scope are mandatory dimensions.
7. Unknown values remain JSON null / absent; zero is a measured zero.
8. All new tables in `public` must have RLS enabled, owner-scoped policies, and explicit least-privilege grants.
9. No privileged SECURITY DEFINER function is required for the first version.
10. No public dataset or cross-user sharing is introduced in this phase.

## 3. Proposed tables

### A. `ft_players` — canonical identity

- `id uuid primary key`
- `user_id uuid not null`
- `display_name text not null`
- `normalized_name text`
- `date_of_birth date null`
- `nationality text null`
- `position text null`
- `created_at timestamptz`
- `updated_at timestamptz`

Unique: `(user_id, id)`. Names are not unique; never merge players by name alone.

### B. `ft_player_source_ids` — provider identity mapping

- `id uuid primary key`
- `user_id uuid not null`
- `player_id uuid not null` references `ft_players`
- `source_name text not null`
- `provider_player_id text not null`
- `verification_status text not null` (unverified / verified / rejected)
- `verified_at timestamptz null`
- `source_metadata jsonb not null default '{}'`

Unique: `(user_id, source_name, provider_player_id)`. A source ID may map to only one canonical player per user.

### C. `ft_player_memberships` — team and squad history

- `id uuid primary key`
- `user_id uuid not null`
- `player_id uuid not null`
- `team_id text not null`
- `season text not null`
- `squad_level text not null` (first_team / u21 / u18 / other_youth)
- `valid_from date null`
- `valid_to date null`
- `source_record_id uuid null`

Membership is evidence-backed and time-bounded. Do not infer first-team membership from a youth appearance or vice versa.

### D. `ft_player_stat_source_records` — immutable source observations

- `id uuid primary key`
- `user_id uuid not null`
- `player_id uuid not null`
- `source_name text not null`
- `source_record_key text null`
- `season text not null`
- `competition_id text not null`
- `team_id text not null`
- `squad_level text not null`
- `statistics_scope text not null` (season / competition / match)
- `match_id text null`
- `stat_date date null`
- `stats jsonb not null`
- `source_url text null`
- `source_updated_at timestamptz null`
- `collected_at timestamptz not null`
- `rights_status text not null`
- `permission_reference text not null`
- `import_batch_id uuid not null`
- `content_hash text not null`

Rows are append-only at the application level. Corrections create a new observation and point to the superseded observation in metadata; do not destroy the original evidence.

### E. `ft_player_stats_current` — reviewed canonical view of statistics

- `id uuid primary key`
- `user_id uuid not null`
- `player_id uuid not null`
- `season text not null`
- `competition_id text not null`
- `team_id text not null`
- `squad_level text not null`
- `statistics_scope text not null`
- `match_id text null`
- `stats jsonb not null`
- `selected_source_record_id uuid not null`
- `verification_status text not null` (pending / verified / disputed)
- `updated_at timestamptz not null`

This table is the read model for the application. A row must reference the source observation used. Conflicting observations remain visible in the source table and cause a disputed/pending state until reviewed.

### F. `ft_player_import_batches` — import audit

- `id uuid primary key`
- `user_id uuid not null`
- `source_name text not null`
- `file_name text not null`
- `file_sha256 text not null`
- `started_at timestamptz not null`
- `finished_at timestamptz null`
- `rows_seen integer not null default 0`
- `rows_accepted integer not null default 0`
- `rows_rejected integer not null default 0`
- `status text not null`
- `error_summary text null`

### G. `ft_player_stat_change_history` — change audit

- `id uuid primary key`
- `user_id uuid not null`
- `current_stat_id uuid not null`
- `source_record_id uuid not null`
- `previous_stats jsonb null`
- `new_stats jsonb not null`
- `change_reason text not null`
- `changed_at timestamptz not null`

## 4. Relationships

`ft_players` 1—many `ft_player_source_ids`  
`ft_players` 1—many `ft_player_memberships`  
`ft_players` 1—many `ft_player_stat_source_records`  
`ft_player_import_batches` 1—many `ft_player_stat_source_records`  
`ft_player_stat_source_records` 1—many historical revisions / selected current records  
`ft_player_stats_current` references exactly one selected source observation.

All foreign keys must include a safe ownership strategy. Prefer composite unique keys such as `(user_id, id)` and composite foreign keys `(user_id, player_id)` so a row cannot reference another user's player.

## 5. RLS and access model

For every new table:
- Enable RLS.
- Authenticated SELECT: `(select auth.uid()) = user_id`.
- INSERT: `WITH CHECK ((select auth.uid()) = user_id)`.
- UPDATE, only if needed: both USING and WITH CHECK owner predicates.
- No anonymous access.
- No service-role key in browser code.
- Avoid SECURITY DEFINER functions.
- Do not grant broad access to `anon` or `authenticated` beyond the required table operations.

The application should not be able to mark an unapproved source as approved merely by importing a CSV. Rights approval must be a deliberate review step.

## 6. Migration sequence and rollback

1. Add new tables only; do not alter or delete legacy tables.
2. Add indexes for owner, player, season, competition, and source lookup after validating query patterns.
3. Enable RLS and create owner policies in the same migration.
4. Verify constraints, RLS, and owner isolation with SQL checks.
5. Keep the new tables unused until import tests pass.
6. Rollback: drop only the newly added `ft_*` tables in reverse dependency order. Never drop or truncate `player_records`, `player_sync_runs`, or `player_sync_previews`.

## 7. Open decisions before migration

- Confirm whether the initial private dataset is intended to remain user-owned or become a shared app-wide dataset later. The first migration should remain user-owned.
- Confirm team and competition catalogue keys used by the current application.
- Confirm whether match-level statistics are in the first pilot or deferred.
- Define the exact JSON statistic vocabulary and units (e.g. xG decimal precision, minutes integer).
- Review Supabase foreign-key and index design against the actual Postgres version before applying DDL.

## 8. Explicitly out of scope

- No migration has been applied.
- No new tables have been created.
- No records have been copied or transformed.
- No API calls or scheduled jobs have been added.
- No change has been made to the existing player cloud function.
