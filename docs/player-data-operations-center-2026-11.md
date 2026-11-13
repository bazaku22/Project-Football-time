# Player Data Operations Center — Six-phase delivery plan

Date: 2026-11-14  
Status: Operations dashboard and evidence-based status summary; no production data mutation.

## Purpose

Reduce manual player-data entry by reusing the existing canonical player, provider-ID, membership, statistics, reconciliation, import-preview, and scheduled-workflow components. The system should ingest permitted data, reconcile it by stable identifiers, quarantine uncertainty, and ask the owner to review only exceptions.

## Evidence from the read-only Production inspection

The connected Supabase project was inspected without writes on 2026-11-14:

| Table | Rows |
|---|---:|
| ft_players | 29 |
| ft_player_source_ids | 29 |
| ft_player_memberships | 29 |
| ft_player_stat_source_records | 29 |
| ft_player_stats_current | 29 |
| ft_player_import_batches | 1 |

All 29 source observations are recorded as OpenPlay / 2025/26 / rights_status=approved in the current source-record grouping query. The earlier audit identifies the canonical cohort as Arsenal 2025/26. Preserve it in Archive; do not relabel it as 2026/27. This database status is not a blanket legal clearance for any additional upstream source or redistribution.

## Six phases and actual state

1. **Audit and preservation — ready.** Existing schema and row counts inspected. Keep all canonical and legacy data; no cleanup or destructive migration.
2. **Canonical identity — foundation exists.** Use ft_players and exact provider/player ID mappings. Names are descriptive, never sufficient for automatic merge.
3. **Squad and membership intake — partial.** Existing StrikerAPI squad intake and offline reconciliation tools exist. 2026/27 production roster coverage is not established by the current 29-row cohort.
4. **Competition and match statistics — partial.** Existing source records, scoped current stats, history, preview tooling and atomic import RPC exist. Current observed data is historical 2025/26, not a complete current-season five-league dataset.
5. **Quality, rights and human review — partial.** Existing validators and review tools support quarantine. Rights must be evaluated per provider and field; pending/unclear sources are blocked.
6. **Scheduled sync and monitoring — partial / gated.** Existing monthly workflow is present. Any live Provider call may consume credits and requires explicit authorization. Supabase Production migrations/writes and deployment require separate approval.

## Data pipeline target

Source registry → permitted acquisition → immutable staging artifact → schema/coverage validation → exact-ID reconciliation → rights and quality gates → human exception review → atomic owner-scoped import → scoped player profiles → scheduled incremental refresh and coverage monitoring.

## Acceptance criteria

- No duplicate canonical identity from name-only matching.
- Every imported row preserves source, source record key, collection/update timestamps, rights status, permission reference, season, competition, team, squad level, metric definition and content hash.
- Unknown values remain null; no inferred zeroes.
- Season, competition and match scopes remain distinct; aggregates are not double-counted.
- Youth, club and national-team contexts remain separate.
- Pending or disputed identity/rights records are quarantined.
- Imports are idempotent and atomic; every run has an audit batch and change history.
- Sync cadence respects provider terms and a user-approved credit budget.
- No Production write, migration, provider request, credit consumption, or deployment without its applicable approval.

## Explicit non-actions in this delivery

This dashboard does not call StrikerAPI or another provider, consume API credits, apply Supabase migrations, write/delete Production rows, clear Local Storage, or trigger deployment. Existing automated workflows are linked for visibility only.
