# Football Time V6.1.0-beta.1 — UI and unified handicap analysis

## Scope
- Refine the existing Dark Navy + Mint UI with a restrained premium football visual layer and Android-sized touch targets.
- Give Match Analysis and Analysis History independent primary destinations while preserving the existing database/team workspace and secondary tools.
- Derive 1X2 probabilities and Asian Handicap settlement probabilities from the same normalized 0–10 goal score matrix.
- Add probability labels: high >=65%, medium >=40% and <65%, low <40%. These are descriptive bands, not confidence or guarantees.
- Add concise match-specific Analysis Insight based only on existing model inputs and disclose small samples/missing context.
- Allow selection only among handicap lines from individual sources updated within the last 24 hours. Exclude stale/unknown timestamps from calculation; never infer a replacement line.
- Display full win, half win, push, half loss and full loss, plus combined win-side probability (full + half win) and loss-side probability (full + half loss). Push remains separate.
- Preserve source and timestamp context; do not display prices or bookmaker links.

## Safety and data preservation
- No new provider, endpoint, polling schedule, API quota, billing, or database write.
- No Local Storage key changes, snapshot overwrites, or history deletion.
- No betting placement, odds prices, bookmaker links, staking, or betting recommendations.

## Verification
- node tests/test_asian_handicap.js
- Existing project validation workflows and Android user acceptance are required before merge/deploy.
