# International Match Experimental Lab — Round 1 isolated dataset

**Status:** experimental / isolated / not production-ready  
**Fixture sample:** 15 senior men's fixtures (10 UEFA Nations League, 5 friendlies)  
**Source manifest:** `docs/international-match-experimental-lab-round-1-manifest.md`

## Files
- `fixtures.json`: 15 normalized fixture records with stable namespaced IDs.
- `results.json`: 196 recent historical source rows across the 25 pilot teams, stored once per source match record.
- `team-form.json`: per-team latest-10 source-row windows and provisional 5/10-match goal features.
- `team-aliases.json`: explicit canonical team IDs and reviewed aliases.
- `quality-issues.json`: duplicate candidate, source cutoff, source quality, score semantics, and alias notes.

## Current audit
- Pinned source: `martj42/international_results`, commit `b0948cb558c927c357db4067eac5b37b96d0e4bb`, CSV blob `9999a4b380b16189825884a8dab4dc869c847f72`.
- 49,940 source match rows; source latest date 2026-10-06.
- All 25 target teams have at least 5 eligible recent records; 24 have 10 eligible records. Argentina has 9 eligible records in its latest-10 raw window because one duplicate candidate is excluded and is not backfilled.
- 196 source rows selected across the team windows; shared matches are represented once in `results.json`.
- All 196 records have unique IDs; every team-form reference resolves; all pilot-team appearances have canonical IDs.
- The 2026-10-01 Argentina–Bolivia row is retained as an excluded quality record; the 2026-09-30 row is used. Do not count both.

## Data rules
- Separate from `data/football-database.json`, club prediction snapshots, and club evaluation history.
- No application import, production database write, Local Storage change, Supabase write, API integration, workflow, polling, or scheduled job.
- Preserve original source team names and normalize only through the explicit alias file; no fuzzy matching.
- Unknown fields stay `null`; do not infer kickoff, venue, neutral status, lineups, or scores.
- Strict pre-kickoff feature cutoff: records must be dated before 2026-11-12 for this pilot baseline. No target fixture or post-kickoff result is included.
- CC0 source scores include extra time and exclude penalty shootouts; verify regulation-time outcomes separately before evaluation.
- The source is a multi-source compilation, not an official federation feed. Do not claim federation verification.

## Known limitations
- Source ends 2026-10-06; possible Oct 7–fixture-kickoff results are not represented.
- Argentina's sample is limited to 9 in the latest-10 raw window because of the duplicate candidate.
- Recent form mixes competitions and venue types; GF/GA are descriptive, not calibrated strength ratings.
- The data is suitable for an isolated exploratory baseline only. It does not establish model calibration or superiority.

## Explicit exclusions
No production app, club database/model/history, Local Storage, Supabase, API/provider, quota, workflow, schedule, polling, or recurring-cost changes. No import into production. No odds, bookmaker data, betting recommendations, or gambling workflows.
