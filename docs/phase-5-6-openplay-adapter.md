# Phase 5.6 — OpenPlay conversion adapter (isolated)

## Purpose

Provide a repeatable, offline conversion path from a locally obtained OpenPlay Parquet file into the existing Project Football Time player-database schema, without relying on StrikerAPI or another API key.

## Safety boundaries

- This is a conversion tool, not a production data import.
- It does not download OpenPlay data, make network requests, or overwrite `data/player-database.json`.
- Both input and output paths must be explicitly supplied.
- The generated output remains a local candidate until upstream data rights and redistribution conditions are reviewed.
- The maintainer labels the release CC BY 4.0 and requests attribution to **openplay (Noah Bair)**. The dataset describes its underlying source as WhoScored/Opta; the project's own license statement does not by itself resolve upstream rights.
- Do not commit generated player records or publish them through GitHub Pages until that review is complete.

## Usage

Obtain the pinned `player_match_stats.parquet` file through a permitted method, then run:

```bash
python -m pip install pandas pyarrow
python scripts/convert_openplay_to_player_database.py --self-test
python scripts/convert_openplay_to_player_database.py \
  --input ./player_match_stats.parquet \
  --output ./player-database-candidate.json
```

The output uses schema version 1 and carries provider, release, season, league, team and player provenance. Player IDs are namespaced as OpenPlay IDs; record IDs are unique by player, league, season, team and position. It aggregates player-match rows into player-season-team-position records. Per-90 goals and xG are derived only when minutes and the source metric are present. Missing source values remain null; they are never changed to zero.

## Coverage and limitations

- Five leagues: Premier League, La Liga, Bundesliga, Serie A and Ligue 1.
- Historical snapshot only, through 2025/26; not a current 2026/27 roster feed.
- Team IDs are provider-scoped name identifiers, not yet reconciled with the app's canonical team database.
- The converter does not create biographies, photos, ages, nationality, squad status, injury information or current club membership.
- Records are historical performance summaries, not proof that a player is currently registered to a club.

## Production gate

Before a generated file is added to the public app, complete an upstream rights review, decide the appropriate attribution display, reconcile team identities, check duplicates and season definitions, validate all fields, and confirm that the resulting public redistribution is permitted. Until then, keep generated data outside the repository and production database.

## Tests

The GitHub Actions workflow runs syntax validation and a small synthetic self-test only. It does not download or publish player data and does not consume API credits.
