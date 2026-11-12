# International Match Round 1 — Handicap model and Match Center display

**Status:** isolated experimental work; not a calibrated forecasting service  
**Model version:** `intl-r1-handicap-0.1.0`  
**Parent baseline:** `intl-r1-baseline-0.1.0`  
**Dataset:** `international-r1-2026`

## Purpose

Derive Asian Handicap settlement probabilities from the same independent-Poisson score matrix and expected-goal inputs used by the preserved international 1X2 baseline. Keep all international data, snapshots, and evaluation separate from club models and histories.

## Model

For each fixture, use the immutable pre-match expected goals `lambda_home` and `lambda_away` from its source 1X2 snapshot. Construct one joint score matrix:

`P(H=h,A=a) = Poisson(h; lambda_home) × Poisson(a; lambda_away)`

For every explicitly named home-perspective scenario line, classify each score cell into exactly one settlement outcome. Negative lines handicap the home team; positive lines are the equivalent home-perspective line. Quarter lines split into adjacent half-lines. The five mutually exclusive outcomes are full win, half win, push, half loss, and full loss. Their probabilities must sum to 1 within numerical tolerance.

The model uses a 0.1% maximum omitted-tail threshold. It fails closed if the score-matrix tail exceeds that threshold; it does not silently discard material probability mass.

## Reference lines and isolated UI

Round 1 uses the already-fetched `data/experimental/international-r1/handicap-reference.json` snapshot. It contains actual offered spread points and source update timestamps from one explicitly approved The Odds API request. It does not store bookmaker prices. The selected reference is the median-low of the observed home spread points; the away line is its opposite. These are data references only, not price comparisons or recommendations.

Scope is restricted to the 10 UEFA Nations League fixtures in the manifest. The five friendlies in the broader research fixture set are excluded from this Handicap workspace.

Data-readiness gates:
- Require at least 3 distinct bookmaker sources.
- Require source updates to be no more than 24 hours old relative to the reference snapshot's fetch time.
- At 3–4 sources, show probabilities with a limited-coverage label; at 5 or more, show the source-coverage pass label.
- If source count, freshness, pre-kickoff capture, or model inputs fail, show the observed reference line and reason but suppress probabilities.
- Probability bands describe only the highest aggregate win-side probability; they are not confidence scores.

The app exposes a separate **ทีมชาติ AH** workspace with match analysis and history tabs. It does not add international Handicap to club Match Center cards. Each match shows both team perspectives and all five settlement outcomes, plus expandable source details and limitations.

No percentages are shown when a valid pre-kickoff snapshot or eligible reference is absent. Do not backdate or reconstruct a prediction for a fixture whose kickoff time is unknown or has already passed.

## Snapshot integrity

- Preserve every existing 1X2 snapshot byte-for-byte.
- Handicap snapshots retain the source 1X2 model version, expected goals, reference line, provider source names, source update timestamps, and data-readiness state.
- The effective capture time is the later of the 1X2 baseline capture and the reference dataset fetch time; it must be strictly earlier than fixture kickoff.
- Snapshot data is immutable; model changes require a new version.
- Store the source cutoff and all material limitations.
- Keep pending, evaluated, and excluded outcomes separate.
- Never use current/future results as pre-match features.

## Evaluation

After a fixture finishes, a user may append a separately stored result record after a two-hour post-kickoff guard, with the 90-minute score and a named result source. Evaluate only when the actual score definition is compatible with the model target. The pinned historical source includes extra time and excludes penalty shootouts; ambiguous regulation-time outcomes must be excluded rather than guessed. Report evaluated/pending/excluded counts, five-class Brier score and log loss, settlement counts, win-side rate, and calibration with sample counts. Round 1 is too small to establish reliability or tune the model.

## Boundaries

No further The Odds API calls or quota use without a separate explicit approval; no new provider, recurring cost, scraping, bookmaker links, odds prices, betting advice, staking, gambling workflow, club database/model/history change, or Supabase write. The workspace uses only its dedicated append-only Local Storage keys: `pft_international_handicap_snapshots_r1` and `pft_international_handicap_results_r1`; it never reads or writes club Handicap history. No schedule or automatic API workflow is added. No merge or production deployment is authorized by this specification.
