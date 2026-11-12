# Player Directory and Statistics Intake — 2026/27

## Scope
The target is all 96 clubs in Football Time's five-league catalogue: Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), and Ligue 1 (FL1). The directory and performance statistics are separate datasets linked by a stable canonical player key.

- Directory: canonical identity, provider IDs, display name, position, nationality, date of birth (only where useful and permitted), current club, squad level, shirt number, season membership, source and observation date.
- Performance: competition/season, appearances, starts, minutes, goals, assists, cards, goalkeeper metrics and advanced metrics only where the source supplies documented definitions.
- Preserve provider-native IDs and exact identity mappings. Name-only joins are not accepted.
- Keep 2025/26 records historical; do not overwrite or delete them.

## Data and rights gates
A source is eligible only after the publisher, source scope, licence, commercial-use permission, database rights and redistribution permission have been independently reviewed. Public visibility is not a licence. CC0 for one dataset does not clear third-party roster or statistics rights. Photos require a separate image licence/attribution and personality-rights review.

The current-season squad source pilot remains research-only. The five-league coverage register previously showed 96/96 clubs catalogued, 5/96 representative roster views researched, 0/96 rights-cleared roster sources and 0 verified current-season player memberships. Do not treat a club directory as a populated player database.

## Intake contracts
- `data/player-intake-manifest-2026-27.json`: source-reviewed player membership staging.
- `data/player-statistics-intake-2026-27.json`: source-reviewed player-season metric staging.
- `scripts/validate_player_intake_manifest.py`: directory membership gate.
- `scripts/validate_player_statistics_intake.py`: statistics provenance, identity, rights and metric sanity gate.

Both templates start empty and remain offline. No fetch, scraping, API calls, Supabase writes, migrations, imports, or deletion occur. A statistics row requires a source-native player ID, exact canonical identity match, season, competition, canonical club, observation date, metric definitions and approved reuse rights.

## Metric rules
Store only supplied metrics with their source definition and unit. Do not infer missing assists, minutes, appearances, xG or other metrics. Do not mix league and cup competitions. Distinguish a missing value from zero. Record whether appearances include substitute appearances and whether minutes include added time if the source defines it. Goalkeeper and outfield metrics remain semantically distinct.

## Current source research outcome
- The UOC Transfermarkt-derived player dataset is CC BY-NC-SA 4.0 and explicitly academic/research-oriented; it is not an approved production source for this app.
- Public football-data aggregators can help discover candidate providers, but their coverage statements are not proof of redistribution rights.
- Reep's downloadable snapshot is CC0 for rights held by Reep, but it is an identity/bridge layer, not a complete current-season player statistics feed.
- FBref/Understat and other public websites must not be scraped or redistributed absent explicit permission and verified terms.

## Next implementation sequence
1. Complete the club-by-club directory research inventory for all 96 clubs, recording candidate official roster URLs without copying player data into Production.
2. Identify one or more sources with explicit reusable rights for directory and stats; keep separate source approvals per data domain.
3. Stage the first rights-cleared club cohort in the offline manifests and run both validators.
4. Expand cohort-by-cohort until every club has a documented state: verified, no public roster, permission pending, or unavailable.
5. Extend the existing local CSV preview/import UI to show source, season, league, club, metric definitions, exact-ID match status and row-level validation. Keep preview-only until the user explicitly approves a separate Production import.
6. Test Android after app UI changes; no app UI is changed in this intake-contract PR.

## Commands
```bash
python3 -m py_compile scripts/validate_player_statistics_intake.py
python3 scripts/validate_player_statistics_intake.py
python3 -m unittest tests/test_player_statistics_intake.py -v
```

## Safety
No provider API credits or cost are used. No Production Supabase writes, migrations, deletes, archives or updates are performed. No 2025/26 records are changed. This PR adds validation contracts only; it does not claim that the player directory or statistics are populated.
