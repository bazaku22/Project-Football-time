# Football Time V6.1.0-beta.1 — UI and unified handicap analysis

## User-facing changes
- Refine the existing Dark Navy + Mint UI with a restrained premium football visual layer and Android-sized touch targets.
- Add Match Center team-name search alongside the existing date/status and league filters.
- Consolidate the league/team workspace into overview, team/form/home-away, and H2H/league-statistics groups. Advanced Analysis and Player Database remain secondary tools.
- Give Match Analysis and Analysis History independent primary destinations while preserving the existing database/team workspace and secondary tools.
- Add a scrollable, newest-first Prediction Snapshot history list with stored probabilities, actual score/status, and model version. Existing snapshots remain read-only.
- Derive 1X2, goal-margin, and Asian Handicap probabilities from the same normalized 0–10 goal score matrix.
- Add probability labels: high >=65%, medium >=40% and <65%, low <40%. These are descriptive probability bands, not confidence or guarantees.
- Add concise, match-specific Analysis Insight based only on existing model inputs and disclose small samples/missing context.
- Allow selection only among handicap lines from individual sources updated within the last 24 hours. Exclude stale/unknown timestamps from calculation; never infer a replacement line.
- Display full win, half win, push, half loss and full loss, plus combined win-side probability (full + half win) and loss-side probability (full + half loss). Push remains separate.
- Preserve source and timestamp context; do not display prices or bookmaker links.
- Retain all existing prediction snapshots; remove the old 2,500-row truncation from the local snapshot save path.

## Safety and data preservation
- No new provider, endpoint, polling schedule, API quota, billing, or database write.
- No Local Storage key renames, destructive migrations, or overwriting of existing snapshots.
- No betting placement, odds prices, bookmaker links, staking, or betting recommendations.
- Handicap-specific historical calibration is not included in this UI/calculation change: it requires an immutable line-and-source snapshot record. Do not derive historical handicap accuracy from current lines or current model outputs.

## Version and cache
- App version: V6.1.0-beta.1
- Service worker cache: football-time-v47
- New refinement stylesheet is included in the offline asset list.

## Verification
- Node syntax checks for the inline app script, primary navigation, Match Center, Asian Handicap engine, and service worker.
- Node tests for score-distribution normalization and full/half/push/half-loss/full-loss settlement across standard and quarter lines.
- Existing app, Match Center, navigation, and player-statistics UI validation workflows.
- Android acceptance remains required before merge/deploy.
