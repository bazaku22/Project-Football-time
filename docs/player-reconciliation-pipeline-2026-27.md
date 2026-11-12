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
- The workflow fetches StrikerAPI `list_teams` reference data for the same five leagues and season (5 calls / estimated 5 credits). The provider team ID links each abbreviated squad observation to its official provider name and abbreviation.
- Exact normalized comparison of provider full name, display name, short name and abbreviation against the same-league/same-season Football Time team name, short name and TLA creates candidates only. No fuzzy matching, inferred aliases or automatic canonical mapping.
- Every candidate team mapping keeps `canonical_team_id` empty until a human review is recorded elsewhere.
- Group player identity observations only by exact `(provider, provider_player_id)`.
- Repeated IDs are reported once in the Player Identity report with all observed names, leagues and provider team IDs. Conflicts are explicitly flagged.
- No canonical player ID is assigned and no player identities are merged.

## Safety boundary

The reconciliation comparison itself is offline. The manual workflow makes exactly five read-only StrikerAPI `list_teams` reference calls (estimated 5 credits) and does not refetch player squads or match statistics. It has no Supabase client, performs zero Production writes/migrations/deletes, and does not modify `data/player-database.json` or the football database. Rights status remains subject to a separate source/reuse review; provider API access alone is not sufficient clearance.

## Tests

```bash
python -m py_compile scripts/player_reconciliation_pipeline.py tests/test_player_reconciliation_pipeline.py
python -m unittest tests/test_player_reconciliation_pipeline.py -v
```


## Run from the existing GitHub Actions artifact

1. Open **Actions → Player reconciliation from existing staging artifact**.
2. Select **Run workflow** on `main`.
3. Keep the default source run ID `43278796571` (or enter another successful run that contains the named staging artifact).
4. Download the `football-time-player-reconciliation-2026-27` artifact after the run succeeds.

This workflow downloads the already-created staging artifact from the selected run, then fetches the five-league StrikerAPI team reference (5 credits total) to resolve provider team abbreviations to official provider names. It does not refetch player squads or match statistics, write to Supabase, create canonical IDs, merge players, or commit staging data to the repository. The output includes the provider team reference JSON as audit evidence. The report artifact is retained for 14 days. The source artifact must still be available in GitHub Actions.

Workflow file: `.github/workflows/run-player-reconciliation.yml`.
