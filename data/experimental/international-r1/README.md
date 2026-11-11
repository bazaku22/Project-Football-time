# International Match Experimental Lab — Round 1 isolated dataset

**Status:** experimental / isolated / not production-ready  
**Fixture sample:** 15 senior men's fixtures (10 UEFA Nations League, 5 friendlies)  
**Source manifest:** `docs/international-match-experimental-lab-round-1-manifest.md`

## Files

- `fixtures.json`: normalized fixture records, one row per match, with stable namespaced IDs.
- `results.json` (planned): normalized historical results, one row per match, shared by both participating teams.
- `team-aliases.json` (planned): reviewed source-name to canonical-team mapping.
- `quality-issues.json` (planned): duplicate candidates, unresolved dates/scores, source conflicts, and exclusions.

## Data rules

- This dataset is separate from `data/football-database.json`, club prediction snapshots, and club evaluation history.
- No application import, production database write, Local Storage change, Supabase write, API integration, workflow, polling, or scheduled job is part of this dataset.
- Store one match once; never duplicate a shared match under both teams.
- Preserve source name, source URL, retrieval time, timezone, usage basis, and data-quality status.
- Unknown values stay `null`; do not infer kickoff, venue, neutral status, lineups, or scores.
- Only use senior men's internationals. Keep Nations League and friendlies distinguishable.
- Enforce strict pre-kickoff feature cutoffs. A match result after the target fixture kickoff must never enter its features.
- Keep regulation score, extra-time score, and penalty shootout result separate when those values are available. The pinned CC0 source scores include extra time and exclude shootouts.
- The Argentina 4–0 Bolivia duplicate-date candidate remains unresolved; do not count it twice.
- The pinned CC0 source is a multi-source compilation, not an official federation feed. Preserve that provenance and validate anomalies.

## Fixture schema

Each fixture includes:
- `id`, `competition`, `match_type`, `local_date`
- `home_team`, `away_team`
- `kickoff_local`, `kickoff_utc`, `source_timezone`
- `venue`, `neutral_venue`
- `match_status`, `score`
- `source_names`, `source_urls`, `retrieved_at`
- `usage_basis`, `data_status`

## Known limitations

- Argentina–Uruguay kickoff time was not published in the official notice reviewed; the timestamp fields remain null.
- Historical-results raw extract has not yet been materialized into this repository. Coverage figures and pinned source hashes are documented in the source manifest, but they are not a substitute for the actual normalized rows.
- Before model evaluation, validate the historical raw extract, resolve aliases and duplicates, add source URLs/provenance per record, and run a temporal-integrity check.
- This 15-match sample is exploratory and cannot establish model superiority or robust calibration.

## Explicit exclusions

No odds, bookmaker data, betting recommendations, staking, or gambling workflows. No changes to production app, club database/model/history, providers, API quota, workflows, schedules, or recurring costs.
