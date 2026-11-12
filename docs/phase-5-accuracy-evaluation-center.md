# Phase 5 — Accuracy & Model Evaluation Center

Status: implementation candidate for user testing.

## Evaluation scope
- Evaluate only valid, immutable, pre-kickoff 1X2 probability snapshots for club competitions in the primary football database.
- Explicit international snapshots are excluded. The experimental International Handicap workspace remains isolated.
- One evaluation record per match and model version. Duplicate keys are counted and excluded, not silently double-weighted.
- A valid finished match score takes precedence over a stored outcome annotation. If the match is no longer present, a valid stored outcome may be used and its provenance is labelled.
- Snapshot probabilities and capture timestamps are never recalculated or overwritten.

## Metrics
- Accuracy of the highest-probability 1X2 outcome, with a 95% Wilson interval.
- Multiclass Brier score (0–2; lower is better).
- Mean log loss (lower is better; clipped only to avoid log(0)).
- Top-label Expected Calibration Error (ECE) and one-vs-rest classwise ECE for home/draw/away.
- Reliability bins show mean forecast probability against observed frequency, with sample counts.
- Results are grouped by league, model version, season, and league × model.

## Model comparison
- Version comparisons use paired fixtures evaluated under both model versions, matching by match ID and actual outcome.
- Delta is model B minus model A; negative Brier/log-loss deltas favour model B.
- Comparisons are descriptive and are not claims of statistical significance or proof of superiority.
- Small samples are labelled inconclusive; no model is declared improved solely from raw accuracy.

## Data quality
- Invalid probability vectors, missing/invalid timestamps, snapshots created at or after kickoff, explicit international scope, and duplicate match/model keys are excluded and counted.
- If a stored outcome conflicts with a valid finished match score, the finished score is used and the disagreement is surfaced.
- Historical snapshots remain immutable; no retroactive recalculation or deletion.
- Legacy test archive and Handicap evaluation remain separate from 1X2 model evaluation.

## Safety and cost
- No betting, wagering, or money-handling functionality.
- No new paid provider, API calls, manual sync, scheduled workflow, quota use, or Supabase writes are required for this phase.
