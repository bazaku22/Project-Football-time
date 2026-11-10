# Phase 5.6 — StatsBomb Open Data player-source pilot

## Purpose
Evaluate a supplementary, no-API-key source for player identity, team membership,
appearances, starting status, position labels and disciplinary records.

## Pilot scope
- Competition: StatsBomb 1. Bundesliga
- Season: 2023/2024
- Competition ID: 9
- Season ID: 281
- Source: https://github.com/hudl/open-data
- The source repository lists a selected set of matches, not a complete Bundesliga
  season. It must not be treated as full-league coverage or current squad data.

## What the pilot measures
- Number of matches with accessible lineup files
- Teams and unique players represented
- Player-team observations
- Players with on-field position records
- Starting appearances and card events

The current pilot intentionally does not calculate goals, assists, xG, minutes,
or full-season totals. It does not write raw player records or derived player
records to the repository; it prints aggregate coverage metrics only.

## Rights and attribution
StatsBomb states that its open data is made available for public research and
football analytics. If research, analysis, or insights based on the data are
published, StatsBomb must be credited as the data source and its logo used.
See the source README:
https://github.com/hudl/open-data/blob/master/README.md
and StatsBomb media pack:
https://statsbomb.com/media-pack/

The separate Top-5 European Leagues dataset was evaluated as a possible shortcut,
but its repository states that the data itself is not covered by the code's MIT
license and remains subject to each upstream provider's terms. Therefore it is
not copied into this public project pending permission/terms review.

## Safety boundaries
- This is a supplementary research experiment, not a replacement for the existing
  Football Database or StrikerAPI integration.
- No changes are made to data/player-database.json, pft_players_v1,
  pft_matches_v1, probability snapshots, or historical test records.
- No API key or paid service is required.
- The pilot is not considered production-ready. Broader coverage and data rights
  must be established before any player records are published in the app.

## Run
GitHub Actions → Test StatsBomb Player Source → Run workflow.
