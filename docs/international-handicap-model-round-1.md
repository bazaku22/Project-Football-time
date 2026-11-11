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

## Scenario lines and homepage

The pilot has no verified, licensed market Handicap line feed. Therefore every line in `handicap-prediction-snapshots.json` is a **synthetic model scenario**, not a market line, bookmaker quote, recommendation, or The Odds API result. The initial scenario grid is explicitly enumerated in the snapshot file; the default compact homepage view is the home-perspective `-1.0` scenario.

The main Match Center must show, directly on each national-team match card:
- Home win / draw / away win percentages.
- The default model-scenario Handicap line and aggregated win-side (full + half win), push, and loss-side (half + full loss) percentages.
- A compact expandable detail containing all five settlement percentages for every available scenario line.
- A clear label that the line is a synthetic model scenario, not a market line.
- A clear experimental/data-readiness caveat and the fact that the model is separate from club data.

No percentages are shown when a valid pre-kickoff snapshot is absent. Do not backdate or reconstruct a prediction for a fixture whose kickoff time is unknown or has already passed.

## Snapshot integrity

- Preserve every existing 1X2 snapshot byte-for-byte.
- Handicap snapshots reference the exact source 1X2 snapshot ID and model version.
- Capture time must be strictly earlier than the fixture kickoff.
- Snapshot data is immutable; model changes require a new version.
- Store the source cutoff and all material limitations.
- Keep pending, evaluated, and excluded outcomes separate.
- Never use current/future results as pre-match features.

## Evaluation

After a fixture finishes, evaluate only when the actual score definition is compatible with the model target. The pinned historical source includes extra time and excludes penalty shootouts; ambiguous regulation-time outcomes must be excluded rather than guessed. Report evaluated/pending/excluded counts, five-class Brier score and log loss, settlement counts, win-side rate, and calibration with sample counts. Round 1 is too small to establish reliability or tune the model.

## Boundaries

No The Odds API calls, new provider, quota, recurring cost, scraping, bookmaker links, odds prices, betting advice, staking, gambling workflow, club database/model/history change, Local Storage, Supabase, or scheduled workflow. The Match Center is a read-only presentation of the separate experimental snapshots. No merge or production deployment is authorized by this specification.
