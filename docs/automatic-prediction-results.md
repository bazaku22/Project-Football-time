# Automatic Prediction Result History

## Purpose
Show and evaluate results automatically for matches that already have an immutable Football Time pre-match probability snapshot. This is separate from manually maintained TEST records.

## Data flow
1. The existing football-data.org scheduled workflow refreshes the five-league match database on its current daily schedule (18:00 UTC). Manual workflow dispatch remains available.
2. The existing `build_probability_snapshots.py` keeps each pre-match snapshot immutable and fills `actualOutcome`, `actualScore`, and `evaluatedAt` when its matching database fixture is FINISHED with valid integer scores.
3. The app merges server snapshots with local snapshots by provider match ID. The server snapshot remains authoritative for its probability vector; local-only snapshots remain available.
4. The probability metrics module exposes a read-only history for valid pre-match snapshots. It derives a result from a FINISHED match only when the snapshot does not already contain a stored outcome.
5. The Accuracy tab displays the latest 20 predictions, their original 1X2 probabilities, the model's highest-probability outcome, and the actual score/outcome when available.

## Guardrails
- Only snapshots with a complete 1X2 probability vector and a valid `createdAt` strictly before kickoff are included.
- A match without a snapshot is never added to this history.
- SCHEDULED, TIMED, postponed, cancelled, or otherwise non-FINISHED matches remain pending; no score is guessed.
- Snapshot probabilities and timestamps are never rewritten by the history UI.
- The existing `pft_matches_v1` TEST records and central TEST #008–#011 are untouched and remain separate.
- No Supabase schema/data changes, new API provider, additional API request, polling increase, paid service, or player-data changes are introduced.
- Result freshness follows the existing daily database sync; no new polling cadence is enabled.

## Verification
The probability metrics test covers automatic result mapping from FINISHED scores, pending fixtures, pre-match timestamp validation, score display data, and existing calibration metrics.
