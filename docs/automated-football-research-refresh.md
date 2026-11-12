# Automated Football Research & Statistics Refresh

## Purpose
Create a simple research layer from the existing, already-ingested Football Time database. This avoids expanding the player master database or adding another paid provider.

## Schedule
- GitHub Actions runs at 00:15 and 12:15 UTC.
- Bangkok time: 07:15 and 19:15 (Asia/Bangkok).
- A manual workflow dispatch is also available.
- The report is validated before publishing.

## Calculated data
For each league and current catalogue season:
- Last 10 completed matches per team: W/D/L form, points, goals for/against and per-match rates.
- Recent home-only and away-only performance.
- Current standings summary when available.
- League goals-per-match, home-goal and away-goal baselines.
- Up to five latest completed head-to-head meetings for upcoming fixtures, with sample size.

## Data flow
1. Existing football database refresh continues under its existing schedule and authorization.
2. This workflow reads the existing football database only.
3. A local Python script derives the research JSON.
4. Unit tests and JSON validation run before publication.
5. The generated report is stored in data/football-research-stats-2026-27.json.

## Cost and safety
- No new provider, API endpoint, API key, API credit, scraping or external network call.
- No StrikerAPI, Wikidata, Reep or player-stat import.
- No Supabase writes, deletes or migrations.
- No existing match, player, prediction or evaluation history is overwritten.
- Upstream source freshness is carried into the report; this workflow cannot make stale upstream data fresh.

## Limitations
- This first iteration is derived team/match research, not independent scouting or player-level statistics.
- Form and league baselines use completed matches in the current catalogue season only.
- Early-season home/away and H2H samples may be small; sample sizes are included.
- H2H is descriptive context, not a standalone prediction.
- Existing probability models are not recalibrated or changed.

## Match Analysis integration
The same PR includes a compact Research Statistics panel beneath the existing Analysis Insight. It displays current-season team form, goals for/against, home/away sample sizes, league goal baseline, H2H sample count and both report/source timestamps. The panel is explicitly descriptive and does not modify model probabilities, coefficients, pre-match snapshots or accuracy history. If the research report is missing, the app displays a clear unavailable state rather than inventing statistics.

## Rollout
After CI and the first scheduled run are confirmed, verify the UI on Android. The first scheduled run can only publish useful statistics if the existing source database contains valid current-season fixtures and results.
