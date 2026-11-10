# Current player squad source — API Ninjas

## Why this source
API Ninjas documents a `soccerplayers` endpoint that returns current squads and player biographies, refreshed daily, on every plan. The free plan includes current-season squads for all five target leagues. Official documentation: https://api-ninjas.com/api/football

League mapping:
- Premier League: `epl`
- La Liga: `laliga`
- Bundesliga: `bundesliga`
- Serie A: `seriea`
- Ligue 1: `ligue1`

## Data scope and limitations
Imported fields: stable provider player ID, current team, name, position, shirt number, height, weight, birth date-derived age, nationality and roster status.
The documented endpoint does NOT return season appearances, minutes, goals, assists, xG or other performance totals. These remain null and must not be presented as zero or inferred.
The importer pages through the documented 50-player default page size using offset. It writes only after all five leagues complete successfully, so partial API failures preserve the previous database.
Existing non-API-Ninjas records are retained. The current API Ninjas snapshot is replaced each run to avoid stale duplicate roster entries.

## Credentials and schedule
- GitHub Actions Secret required: `API_NINJAS_API_KEY`
- Obtain a free key at https://api-ninjas.com/ (official docs say no credit card required).
- Secret is used only in GitHub Actions and is never exposed to browser code or committed files.
- Scheduled refresh: weekly, Sunday 21:00 UTC (Monday 04:00 Thailand).
- Manual run: Actions → Update Current Player Squads → Run workflow.

## Scope boundary
This is a current-roster feed, not a full player-statistics feed. Keep StrikerAPI as a potential detailed-statistics provider once its key is available. StatsBomb and Wyscout pilots remain research-only and are not used to populate current squads.
