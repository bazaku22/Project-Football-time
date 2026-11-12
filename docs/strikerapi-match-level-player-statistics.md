# StrikerAPI match-level player statistics intake

## Purpose
Collect each player's match performance from one completed match using one StrikerAPI `get_game` call (5 credits), rather than one `get_player` call per player. Aggregate season totals locally from accepted match rows; do not fetch per-player profiles for every match.

## Safe operation
- Default mode reads a local fixture and makes zero provider calls.
- Live mode requires explicit `--fetch --game-id` and makes exactly one request.
- `get_game` accepts `game_id` and optional `league`; the provider documents 5 credits per call.
- Only final matches are accepted.
- Output is staging-only JSON with `statistics_scope=match`, provider player IDs, match ID/date, and raw available metrics.
- No Supabase writes, migrations, imports, scheduled jobs, or GitHub Actions API dispatches are performed by this script.
- Rights remain `manual_review`; provider access alone is not treated as a complete rights clearance. Exact canonical player mapping and independent rights review are required before any import.

## Commands
```bash
# Offline fixture validation; no API call
python scripts/strikerapi_match_stats.py --input tests/fixtures/strikerapi/get-game-final.json

# One explicit live match request; 5 credits
STRIKERAPI_API_KEY=... python scripts/strikerapi_match_stats.py --fetch --game-id 740916 --league soccer
```

## Data handling
- Null/missing metrics stay absent, not zero.
- Appearances and starts are set only when the provider supplies the starter flag.
- Minutes are calculated only when both minute_on and minute_off are present.
- Provider IDs are preserved; names are never used as identity joins.
- Season label is derived from the provider's season start year.
- Each match is a separate source row; cumulative season totals are a later derived view.
- Keep raw provider snapshots separately if historical correction/audit is required; the provider refreshes records and may revise recent match data.

## Provider contract
See [StrikerAPI get_game documentation](https://strikerapi.com/docs/get-game). `get_game` returns the match, team box scores, and player lines in one response, costs 5 credits, and requires `game_id`.
