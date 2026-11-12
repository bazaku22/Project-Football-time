# Isolated ELC-only database sync

## Purpose
Provide a manually triggered path to refresh English Championship data without fetching the five core leagues again.

## API and execution safeguards
- The workflow is manual-only (workflow_dispatch); it adds no cron schedule.
- A successful run makes exactly three football-data.org v4 requests: ELC teams, matches, and standings.
- Each endpoint is attempted once. There are no retries or fallback requests.
- Requests are separated by a 10-second delay.
- The workflow shares the existing football-database-update concurrency group to prevent racing with the regular scheduled writer.
- The workflow checks the existing API secret but does not expose it in logs.
- This change does not run the workflow or make any API request during development, CI, or merge.

## Data preservation
- Only teamSeasons, standings, and matches rows with leagueId == ELC are replaced.
- Non-ELC rows are preserved.
- Existing team master records are retained; current ELC team metadata is added or refreshed.
- Probability snapshots and all other historical records are preserved unchanged.
- Only source.leagueSync.ELC is marked fresh. The global source timestamp is not advanced, so other leagues are not falsely represented as freshly synced.
- The complete database validator runs after an atomic replacement; the previous database file is restored if validation fails.
- The workflow commits only data/football-database.json and pushes to main only after validation succeeds.

## Validation
- Unit tests cover ELC-only row replacement, non-ELC preservation, immutable probability snapshots, and malformed provider payload rejection.
- The existing full football database validator remains the final gate.

## Approval boundary
Merging this workflow only makes it available. It does not authorize or trigger a run. A separate explicit approval is required before manually dispatching it, because a successful run consumes three API requests.
