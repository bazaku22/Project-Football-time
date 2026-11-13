# OpenPlay historical player statistics intake

**Purpose:** produce a checksummed, offline review artifact for historical 2025/26 player statistics from OpenPlay. This does not import records into the live app or Supabase.

## Source and licence

- Publisher: Noah Bair, [OpenPlay](https://github.com/nlbair/openplay)
- Pinned release: \`data-v0.1.0\`
- Dataset licence declared by publisher: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)
- Required attribution: **openplay (Noah Bair)**
- Dataset documentation: [README](https://github.com/nlbair/openplay) and [data dictionary](https://github.com/nlbair/openplay/blob/main/DATA_DICTIONARY.md)

The release contains \`player_match_stats.parquet\`, \`coverage.csv\` and \`data_issues.csv\`. Its five major-league coverage ends at 2025/26; it is not a live feed and does not provide 2026/27 stats. The pipeline pins the release tag and verifies downloaded files against the published SHA-256 manifest (or GitHub asset digest).

This is an engineering source assessment, not legal advice. Keep the attribution file with every redistributed derivative. Re-check the source licence and release before future refreshes.

## Normalization

Competition mapping: \`eng\` Premier League, \`esp\` La Liga, \`ger\` Bundesliga, \`ita\` Serie A, \`fra\` Ligue 1.

The pipeline exports:
- match-level player rows, retaining OpenPlay source player/team IDs and source names;
- season aggregates grouped by competition + season + source team ID + source player ID;
- a blank manual player-ID mapping template;
- a coverage/quality report and attribution notice.

Metrics are mapped only where OpenPlay supplies them: appearances, starts, expanded minutes, goals, assists, shots, shots on target, xG, xA, yellow cards, red cards/dismissals and saves. A second yellow is counted as a yellow-card event and a dismissal. Minutes include stoppage time. Clean sheets and other absent metrics are not inferred.

Rows from matches listed in \`data_issues.csv\` remain visible in the match review export but are quarantined and excluded from season aggregates. Coverage gaps remain explicit; season totals are partial when matches are missing.

## Identity and team mapping

OpenPlay IDs are source-native and are not Football Time canonical IDs. The pipeline never joins by name, never assigns canonical IDs and never merges players. Different OpenPlay player IDs with the same name remain separate. The mapping template requires a human-reviewed exact source-ID crosswalk before any later import. Team IDs also remain source-native and require a separate reviewed team crosswalk.

## Run locally

Requires Python 3.11+ and DuckDB:

\`\`\`bash
python -m pip install duckdb
python scripts/openplay_player_stats_intake.py --download-release --season 2526 --output-dir openplay-intake-output
python -m unittest tests/test_openplay_player_stats_intake.py -v
\`\`\`

Or provide local files with \`--input\`, \`--coverage\`, and \`--issues\`.

## GitHub Actions

Run **OpenPlay Historical Player Stats Intake** manually. It downloads only the pinned release assets, verifies checksums, filters the five major leagues for 2025/26 and uploads an artifact for 14 days. No recurring schedule is configured.

## Safety boundary

- No StrikerAPI calls or credits.
- No Supabase writes, migrations, deletes, or Production imports.
- No app data files are populated or overwritten.
- No canonical player/team IDs are assigned.
- Artifact output is review/staging only; a separate explicit approval and a reviewed identity/team crosswalk are required before any Production import.
