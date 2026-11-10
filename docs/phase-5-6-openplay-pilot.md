# Phase 5.6 — OpenPlay historical player data source pilot

## Purpose

Evaluate whether OpenPlay can provide a reproducible historical player-statistics source for Project Football Time. This is an isolated source-quality experiment. It does not modify the production player database, website UI, Local Storage, prediction snapshots, or existing test records.

## Source

- Repository: https://github.com/nlbair/openplay
- Pinned release: \`data-v0.1.0\`
- Dataset license stated by its maintainer: Creative Commons Attribution 4.0 (CC BY 4.0)
- Required attribution: **openplay (Noah Bair)**, https://github.com/nlbair/openplay
- Data origin described by the maintainer: public match pages on WhoScored.com showing Opta (Stats Perform) feed data.
- Release files: \`player_match_stats.parquet\`, \`players.parquet\`, \`lineups.parquet\`, \`matches.parquet\`, plus documentation and coverage files.

The maintainer's CC BY 4.0 statement permits reuse with attribution. Because the described underlying feed originates from WhoScored/Opta, review applicable upstream rights and intended redistribution before publishing bulk derived player records in the public app. This pilot downloads and processes the source in a temporary CI directory only; it does not commit or redistribute raw or derived player data.

## Coverage and available statistics

The source covers the five target domestic leagues from 2014/15 through 2025/26:
- Premier League
- La Liga
- Bundesliga
- Serie A
- Ligue 1

The player-match table documents appearances, starts, minutes, goals, assists, xG, xA, shots, shots on target, key passes, tackles, interceptions, yellow cards, second yellow cards, and red cards, among other fields. It contains approximately 776,000 player-match rows across all competitions in the release.

**Important limitation:** this is a historical snapshot ending in 2025/26. It does not provide current 2026/27 player statistics or a live feed. It is not a replacement for the current-squad source.

## Pilot implementation

Run:

\`\`\`bash
python -m pip install pandas pyarrow
python scripts/pilot_openplay_player_stats.py --self-test
python scripts/pilot_openplay_player_stats.py
\`\`\`

The script downloads only the pinned \`player_match_stats.parquet\` release asset, filters the five target leagues, aggregates player-match rows into player/season/team/position summaries, reports coverage, and deletes the temporary files when it exits.

The GitHub Actions workflow runs compilation and a network-free self-test on pull requests. A manual \`workflow_dispatch\` runs the full source coverage pilot.

## Data safety and production decision

- No changes to \`data/player-database.json\`.
- No changes to \`js/player-database.js\`, service worker, or app UI.
- No changes to Local Storage keys, test records, or probability snapshots.
- No API key or paid service is required for this source pilot.
- Do not mix historical OpenPlay stats with 2026/27 current-season stats without preserving provider, season, source timestamp, and metric definitions.
- Do not infer missing fields as zero.
- A production import requires a separate review of source rights, attribution display, identity matching, freshness, coverage, and the existing player schema.

## Current data-source strategy

Use separate providers for separate purposes:
1. Current 2026/27 roster and player bio: API Ninjas integration, pending a valid repository secret and successful import.
2. Historical match-level player performance through 2025/26: OpenPlay candidate, pending pilot results and upstream-rights review.
3. StatsBomb Open Data: retain as a research-only event-data source with its selected competition/season limitations.
4. Do not treat the non-commercial open-matchday compilation as a production player-statistics source; it provides match-level rather than individual player performance.
