# Phase 5.6 — Player Database & Statistics

## Primary provider
StrikerAPI is the primary provider for the five major leagues:
- Premier League: `soccer`
- La Liga: `laliga`
- Bundesliga: `bundesliga`
- Serie A: `seriea`
- Ligue 1: `ligue1`

Official documentation: https://strikerapi.com/docs

The free tier currently lists 500 credits/month with no card. Endpoint costs used here:
- `get_squad`: 10 credits per whole-league squad request; five leagues = 50 credits.
- `get_player`: 5 credits per detailed player profile.
- The importer profiles up to 60 players per run (300 credits) and reserves an estimated 150 credits for safety and other account use.
- Detailed profiles rotate across the full roster using `nextProfileOffset`; the scheduled workflow runs monthly. Avoid manually rerunning repeatedly because each successful API call consumes credits.
- Data refreshes daily at the provider, but this project syncs the player database monthly to respect the free credit limit. No live/in-play feed is used.

## Data model and safety
- Current league squads are fetched for all five leagues; detailed profile statistics are filled progressively.
- Each record uses a provider player ID + team ID + season. Players not yet profiled are marked `roster_only`; statistics not returned remain null.
- Detailed profile includes appearances, starts, minutes, goals, assists, shots, shots on target, xG, cards, per-90 rates and recent match log when supplied.
- Existing records are retained if a player is not present in the latest squad response.
- API keys are only read from GitHub Actions Secret `STRIKERAPI_API_KEY`; never put a key in source, browser code, JSON, or chat.
- API-Football remains a secondary/backup provider, but is not automatically called by this workflow. Its free-plan quota previously blocked the first import.
- Existing `pft_matches_v1`, probability snapshots, historical tests #001 onward, and other project data are not modified.

## Workflow
- GitHub Actions workflow: `.github/workflows/update-player-database.yml`
- Monthly schedule: 1st day of each month at 20:00 UTC.
- Manual run is available through Actions → Update Player Database → Run workflow.
- The workflow validates JSON and unique IDs before committing.
- If the API key is invalid, the provider rejects the request, or no squad records are returned, the existing database is not overwritten.

## UI
The Player Database page reads `data/player-database.json`, merges local records from `pft_players_v1`, and shows provider and update metadata. The detailed stats may be incomplete until the player's profile is reached in the rotating batch.
