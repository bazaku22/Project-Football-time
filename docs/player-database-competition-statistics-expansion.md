# Player Database Expansion — Competition-Based Statistics

**Status:** Implementation discovery and design baseline  
**Date:** 2026-11-13  
**Branch:** `feature/player-database-competition-stats-2026-11`  
**Production impact:** None. This document records a read-only audit and proposed implementation; it does not authorize or perform a Supabase Production migration, data write, provider API request, or import.

## 1. Goal

Extend the existing Player Database so one canonical player profile can present:
- Overall career/available-data summary
- Club and league statistics, grouped by competition and season
- National-team statistics, grouped by competition and season
- Match-level statistics and sourced match events linked to a canonical player identity

Do not create a separate player identity for each competition, club, or national team.

## 2. Read-only audit findings

The connected Supabase project currently contains these relevant tables:
- `ft_players`: canonical player identity
- `ft_player_source_ids`: provider-to-canonical identity mappings
- `ft_player_memberships`: team membership by season and squad level
- `ft_player_stat_source_records`: immutable source observations, including season, competition, team, scope, match ID, source URL, rights and permission reference
- `ft_player_stats_current`: selected statistics by player, season, competition, team, squad level and scope
- `ft_player_stat_change_history`: audit history
- `ft_player_import_batches`: import audit

All of the above tables were observed with RLS enabled. The live project currently reports 29 rows in each of the canonical player, membership, source-ID, source-record and current-stat tables, and one import batch. The existing canonical sample is documented in the prior audit as Arsenal 2025/26; it must remain archived and must not be relabelled as 2026/27.

The legacy `player_records`, `player_sync_runs` and `player_sync_previews` tables are separate. Do not repurpose, rewrite, delete or merge them as part of this work.

The current statistics schema already separates `season`, `competition_id`, `team_id`, `squad_level` and `statistics_scope` (`season`, `competition`, `match`). The source-record table preserves source URL, timestamps, rights status and permission reference. Therefore, do not create a second generic player-statistics table without proving a specific missing requirement.

## 3. Application audit findings

- `js/player-cloud.js` already reads canonical players, provider IDs, memberships, current stats and source records from the `ft_*` tables after authentication.
- It publishes the full scoped statistics rows via `pft-player-stats-data`, including competition, season, team, scope, match ID, source and verification status.
- Its directory projection currently selects only the first statistics row matching player/membership and omits competition/scope from that projection. This must be corrected before the profile can reliably show multi-competition data.
- `js/player-hub.js` currently renders a provisional StrikerAPI directory stored in Local Storage. Its profile tabs are placeholders and do not yet consume the canonical `pft-player-stats-data` rows.
- `js/match-center.js` renders manual-research events using player names. It does not currently resolve those event players to canonical player IDs.
- The manual match research schema already permits optional `canonical_player_id` and `provider_player_id` on player references. This can support reviewed linking without matching on names alone.
- The starter JSON in the GitHub repository is empty. Android Local Storage research imports are device-local and must not be assumed to exist in the repository or Supabase.

## 4. Target presentation

Each canonical player has one profile with three primary statistical categories:

1. **Overall** — aggregate only from compatible, non-duplicated, eligible source records.
2. **Club** — grouped by club competition, team and season.
3. **National Team** — grouped by national-team competition, national team and season.

Within Club and National Team, show a competition selector/list and season context. Keep match-level rows separate from season/competition aggregates. Display “No data” when a metric is absent; never convert unknown values to zero.

The current provisional directory remains visibly provisional. It must not be silently merged into canonical player identities.

## 5. Identity and event-linking rules

- Canonical identity is `ft_players.id` / `canonical_player_key`.
- Provider identity is resolved only through an exact `(source_name, provider_player_id)` mapping in `ft_player_source_ids`.
- Never merge players by display name alone.
- A manual research event may carry a canonical player ID only after an explicit, reviewed identity match.
- Unresolved or ambiguous players remain unlinked and visible as unresolved; do not guess.
- Preserve event ID, match ID, event type, minute/added time, team, related goal/assist relationship, source attribution and event-level verification status.

## 6. Competition classification

Use the existing `competition_id` as the stable competition key. Add an explicit, reviewed competition classification in the application/catalogue layer so each competition is classified as club or national-team. Do not infer this from a team name or from whether a team has a country flag.

Initial known competition codes include `PL`, `PD`, `BL1`, `SA`, `FL1` and `UNL`. The classification list must be extensible for domestic cups, continental club competitions, European Championship and World Cup. Unknown competition codes must be shown as unclassified rather than silently placed in the wrong category.

## 7. Aggregation and provenance rules

- Overall totals must be derived from eligible disjoint competition/team/scope records; do not add a season aggregate to its competition or match-level components.
- Do not sum overlapping source records or different provider observations for the same natural key.
- Preserve source observations; a reviewed current-stat row selects one source record.
- Only rows with permitted rights status are eligible for display according to the established access rules. Pending/rejected rights remain quarantined.
- Keep verification status distinct from source rights status.
- Unknown/null is not zero.
- Keep first-team and youth statistics separate.
- Keep club and national-team records separate in the underlying grouping, even when showing an Overall total.

## 8. Match event storage decision — pending technical validation

The existing player-statistics tables can store match-scope numeric statistics, but they are not a normalized event ledger for individual goals, assists, cards, substitutions and VAR decisions. Before adding a table, inspect existing match/event structures and decide whether a new owner-scoped `ft_player_match_events` table is necessary.

If required, the proposed table must preserve:
- `user_id`, stable `match_id`, stable `event_id`
- nullable canonical `player_id` for unresolved identities
- original provider/source player ID and player display name
- team ID, event type, minute and added time
- related event ID (e.g. assist-to-goal link)
- source name, URL, source-updated/collected timestamps
- rights status, permission reference and event-level verification status
- duplicate protection on source + match + event identity
- RLS and owner-scoped access consistent with existing `ft_*` tables

No table or migration is created by this document.

## 9. Implementation sequence

1. Finish audit of existing Match Center, Player Hub, CSS, tests and event data contracts.
2. Correct canonical directory projection so no competition/scope rows are discarded.
3. Connect canonical player profiles to all eligible scoped statistics.
4. Add Overall / Club / National Team profile navigation and competition/season views.
5. Add exact-ID reviewed event linking from Match Center to canonical players.
6. Decide and, if justified, design a normalized match-event table in an additive migration.
7. Add tests for category separation, season separation, null-vs-zero, duplicate prevention, unresolved identity, rights gating and event provenance.
8. Run CI and prepare a PR for review. Merge only after explicit user approval.
9. User tests the deployed build on Android after an approved merge.

## 10. Safety boundaries

- No Supabase Production DDL, writes, deletes, migration application or data import in this phase without a separate explicit approval.
- No provider API requests or credits.
- Do not upload device-local manual research records to Production.
- Do not mark the existing Nations League research records as verified or rights-cleared.
- Work only on the feature branch; no direct commits to `main`.
