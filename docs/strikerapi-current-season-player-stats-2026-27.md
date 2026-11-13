# StrikerAPI current-season player statistics intake (2026/27)

## Scope

This intake is restricted to the 2026/27 season (season=2026) and five leagues: Premier League (soccer), La Liga (laliga), Bundesliga (bundesliga), Serie A (seriea), and Ligue 1 (ligue1).

It requests ten season-leader categories per league: goals, assists, goal contributions, shots, shots on target, xG, yellow cards, red cards, saves, and clean sheets. Each request uses stage=league, min_games=1, and limit=100.

## Credit budget

get_leaders costs 5 credits per request. The workflow makes exactly 50 requests (10 categories x 5 leagues), with an estimated maximum of 250 credits. This stays within the previously approved StrikerAPI Free Pilot ceiling of 500 credits/month.

## Run

The workflow is manual only: .github/workflows/fetch-strikerapi-player-leaders.yml

It uses the existing STRIKERAPI_API_KEY GitHub Actions secret. No key is printed or included in artifacts.

## Output

The workflow creates data/staging/strikerapi-player-leaders-2026-27.json and uploads it as the strikerapi-player-leaders-2026-27 artifact for 14 days.

The output is staging-only. It assigns no canonical player/team IDs, performs no merges, and makes no Supabase writes, migrations, or deletes. It is not imported into the app automatically.

## Important completeness limits

This is a top-100-per-stat leaders extract, not a complete player-season database. Players outside all ten top-100 lists will not appear. The returned player rows are season aggregates, not match-by-match logs. Missing values remain absent, not zero. Cup and international matches are excluded because the request uses stage=league.

Use provider player IDs as source identifiers only. Canonical identity and team mappings still require the existing review process. Preserve the source payload and collection timestamp for auditability.

## Rights and attribution review

StrikerAPI's public documentation says its data may be used inside the user's own product within its terms, while raw data-feed resale is prohibited. This engineering intake note is not legal advice and does not resolve any third-party competition/database rights. Review the provider's current terms before any public import or redistribution.
