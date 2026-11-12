# Player reconciliation pipeline — 2026/27

## Purpose

Generate repeatable, offline review reports from a StrikerAPI current-squad staging artifact and the existing Football Time team/season registry. This pipeline covers player identity observations and club-team mapping candidates only. It does not fetch match statistics.

## Run locally

```bash
python scripts/player_reconciliation_pipeline.py \
  --staging data/staging/strikerapi-current-squads-2026-27.json \
  --football-db data/football-database.json \
  --out-dir data/staging/reconciliation-2026-27
```

The command writes:
- `team-mapping-review-2026-27.csv`
- `player-identity-review-2026-27.csv`
- `reconciliation-summary-2026-27.json`

## Reconciliation rules

- Accept only a 2026/27 snapshot explicitly marked `staging_only` and `production_import: false`.
- Compare provider team names only against Football Time teams with a team-season membership in the same league and 2026/27 season.
- Exact normalized full-name or short-name matches are candidates, not verified mappings. No fuzzy matching or inferred aliases.
- Every candidate team mapping keeps `canonical_team_id` empty until a human review is recorded elsewhere.
- Group player identity observations only by exact `(provider, provider_player_id)`.
- Repeated IDs are reported once in the Player Identity report with all observed names, leagues and provider team IDs. Conflicts are explicitly flagged.
- No canonical player ID is assigned and no player identities are merged.

## Safety boundary

This is an offline report generator. It makes zero provider API calls, has no Supabase client, performs zero Production writes/migrations/deletes, and does not modify `data/player-database.json` or the football database. Rights status remains subject to a separate source/reuse review; provider API access alone is not sufficient clearance.

## Tests

```bash
python -m py_compile scripts/player_reconciliation_pipeline.py tests/test_player_reconciliation_pipeline.py
python -m unittest tests/test_player_reconciliation_pipeline.py -v
```
