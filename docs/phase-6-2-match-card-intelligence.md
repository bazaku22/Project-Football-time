# Football Time V6.2.0-beta.1 — Match Card Intelligence

## Goal
Make the Match Center cards a compact, trustworthy summary of the same pre-match model used by Match Analysis, and use The Odds API's existing Asian Handicap feed as the automatic reference line for immutable Handicap history.

## Match Card summary
- Show home-win, draw, and away-win probabilities from the existing Football Time model.
- Show the automatically selected home-side Asian Handicap reference line and the model's home-side handicap pass probability (full win + half win), with the push probability separate.
- Display descriptive probability bands using the existing thresholds: high >=65%, medium >=40% and <65%, low <40%. These labels describe probability only, not confidence or data readiness.
- Keep the card compact; detailed score distribution, all five settlement outcomes, Analysis Insight, and model inputs remain in Match Analysis.
- Only show pre-match analysis on eligible upcoming fixtures. Live and finished matches retain their score/status presentation.

## Automatic reference-line policy
- Provider remains The Odds API, using the existing data/asian-handicap-odds.json dataset and existing daily workflow.
- No user-selected line: the app automatically selects the lower median (median-low) among actual home handicap lines whose individual source timestamps are valid, not in the future, and no older than 24 hours.
- The selected line must be an actual line offered by at least one fresh source; no interpolation, inference, or fallback to stale sources.
- Match matching requires the same league, normalized home/away team names, and kickoff within the existing six-hour matching tolerance.
- The saved Handicap snapshot records the exact selected line and only the fresh source rows offering that line, including source names and update timestamps.
- Existing local immutable Handicap history remains separate from 1X2 history. The same score distribution used for 1X2 produces the Handicap settlement probabilities.
- A snapshot is evaluated only after the fixture is finished and only against the line captured before kickoff. Later line changes do not rewrite past snapshots.

## Missing or stale data
- Missing event/line: show that no reference line is available; do not invent one.
- No fresh source rows: show stale status and do not calculate or save a new Handicap snapshot.
- Insufficient model data: show the actual reference line if available, but do not fabricate probabilities.
- When the odds JSON finishes loading, Match Center rerenders so cards do not remain stuck on the initial loading state.

## Cost, privacy, and product boundaries
- No new provider, API endpoint, API request, polling, schedule, quota, billing, or external call.
- Reuse the existing five daily The Odds API requests and static odds JSON.
- No prices, bookmaker links, bet placement, staking, or betting recommendations.
- No cloud/Supabase writes, no Local Storage key changes, and no destructive migration.
- Existing 1X2 snapshots and Handicap snapshots remain preserved.

## Version and offline cache
- App version: V6.2.0-beta.1
- Service worker cache: football-time-v49
- New pure helper: js/handicap-reference.js
- The new helper is included in the service worker offline asset list.

## Verification
- Unit tests cover league/team/kickoff matching, fresh/stale/future timestamps, deterministic median-low selection, and selection of an actually offered line.
- Match Center tests verify compact summary rendering, automatic selection (no manual line selector), and the versioned offline asset.
- Existing Handicap history, settlement, app validation, and Android acceptance checks remain required.
