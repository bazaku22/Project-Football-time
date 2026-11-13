# Phase 6 — Match Center Daily Results & Updates

## Scope

Make completed club matches visible in the daily Match Center view and provide a one-tap route to the previous Bangkok calendar day. Keep the existing football-data.org refresh pipeline; do not add a second provider or extra API calls for this UI improvement.

## Existing refresh pipeline

- `.github/workflows/update-football-database.yml` runs daily at 23:00 UTC (06:00 Asia/Bangkok).
- It fetches teams, matches, and standings for the five core leagues (PL, PD, BL1, SA, FL1) from football-data.org v4.
- `scripts/build_football_database.py` preserves provider match IDs, status, and full-time home/away scores in `data/football-database.json`.
- `scripts/build_probability_snapshots.py` records actual outcomes only after a verified FINISHED score is present and keeps the original pre-match probability snapshot immutable.

## Match Center behavior

- Default filter is now “ทั้งหมด” so finished, live, and upcoming matches on the selected day are visible together.
- “เมื่อวาน” selects the previous calendar date in Asia/Bangkok; “วันนี้” remains available.
- The existing “จบแล้ว” filter remains available for completed matches only.
- Scores are rendered from provider homeScore/awayScore only when the match status is FINISHED or live; no score is inferred or fabricated.
- Provider match IDs remain the identity key; no duplicate match records are created by this UI change.

## Scope boundaries

- This phase does not add new provider calls, paid API usage, Supabase writes, deletes, or migrations.
- International experimental fixtures remain isolated and read-only. They are not part of the five-league daily sync and must not receive inferred results or data from unapproved sources. A separate rights-cleared source decision is required before automated Nations League result ingestion.
- Deployment and Android runtime behavior must be verified after merge; CI alone is not proof of deployment.
