# StrikerAPI current-squad intake — 2026/27

## Purpose

Collect current squad identity and season-membership candidates for Premier League, La Liga, Bundesliga, Serie A and Ligue 1. Match-level player statistics are deliberately out of scope.

## Safe execution

Offline mode makes zero provider calls:

```bash
python scripts/strikerapi_squad_intake.py --input tests/fixtures/strikerapi/squads-five-leagues-2026-27.json
```

Explicit live mode makes exactly five `get_squad` requests, one per league, estimated at 50 credits total:

```bash
STRIKERAPI_API_KEY=... python scripts/strikerapi_squad_intake.py --fetch
```

The live command requires the existing GitHub secret in a suitable Actions environment. It does not fetch detailed profiles and does not call `get_game` or `get_player`.

## Identity and membership rules

- Keep `(provider, provider_player_id)` as source identity, not the Football Time canonical player ID.
- Keep provider team ID and canonical team ID separate; team mappings begin as `needs_exact_team_id_review`.
- StrikerAPI season start year `2026` normalizes to `2026/27`.
- Do not infer first-team, U21, U18 or reserve membership from the endpoint alone. Squad level remains `unknown` until independently evidenced.
- Do not auto-merge identities by name, age, position or shirt number.
- Missing fields remain null.

## Rights and Production boundary

Output is written only to `data/staging/`, marked `staging_only`, and retains `manual_review` rights status. It assigns no canonical IDs, does not update `data/player-database.json`, and performs zero Supabase writes, migrations or deletes. Provider access does not itself clear third-party competition/database rights.

The explicit live command costs an estimated 50 credits per full five-league refresh, within the approved Free Pilot ceiling of 500 credits/month. Do not add player-profile calls to this workflow; those require a separate budgeted operation.

## Validation

```bash
python -m py_compile scripts/strikerapi_squad_intake.py tests/test_strikerapi_squad_intake.py
python -m unittest tests/test_strikerapi_squad_intake.py -v
```
