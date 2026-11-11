# International Match Round 1 — Baseline model specification

**Status:** experimental design only; isolated from production  
**Dataset:** `international-r1-2026`  
**Fixture scope:** 15 senior men's fixtures  
**Feature cutoff:** strictly before 2026-11-12  
**Model version:** `intl-r1-baseline-0.1.0`

## 1. Purpose and non-goals

This is a transparent, deliberately simple reference model for testing whether recent international goal data carries useful pre-match signal. It is not a calibrated forecasting service and is not evidence that the model is superior to a market, ranking, or other benchmark.

Round 1 is limited to:
- expected goals for each team;
- a scoreline probability matrix;
- derived 1X2 probabilities (home win, draw, away win);
- immutable pre-kickoff prediction records and later outcome evaluation, kept separate from club history.

No handicap output, odds, bookmaker data, betting advice, staking, or gambling workflow is part of this baseline.

## 2. Eligible input data

Use only the pinned dataset files and explicit team aliases. Never fuzzy-match an unknown team.

For each team:
- Prefer the blended goal rates from the last 5 and last 10 eligible matches.
- Blend the two windows equally (50% / 50%) for this first, pre-registered baseline. The last-5 window is nested inside last-10; therefore this is a recency emphasis, not two independent samples.
- Require at least 5 eligible prior matches for both teams. Below 5, return `insufficient_data` and do not produce probabilities.
- Keep the actual sample counts, latest result date, source-quality label, and excluded records with every prediction.
- Argentina remains a 9-match limited sample; do not backfill the excluded duplicate candidate.
- Qatar and Singapore remain provisional CC0-derived samples, not federation-verified histories.

The source is a maintainer-declared CC0 multi-source compilation, not an official federation feed. Its latest date is 2026-10-06; later pre-kickoff results may be missing. Do not imply the feature set is current through kickoff.

## 3. Baseline expected-goal calculation

For each team, calculate blended rates:

`GF* = 0.5 × GF_per_match(last5) + 0.5 × GF_per_match(last10)`

`GA* = 0.5 × GA_per_match(last5) + 0.5 × GA_per_match(last10)`

For a fixture with home team H and away team A:

`lambda_H = (GF*_H + GA*_A) / 2`

`lambda_A = (GF*_A + GA*_H) / 2`

This intentionally uses no fitted coefficients, ranking adjustment, competition adjustment, opponent-strength correction, or estimated home-advantage coefficient. The historical extract does not provide sufficiently reliable, consistently defined inputs to justify those adjustments in this first baseline. Home/away labels orient the score matrix only; do not claim a measured home advantage.

If a required feature is missing, non-finite, negative, or based on fewer than five eligible matches, fail closed rather than substituting a guessed value.

## 4. Score distribution and 1X2

Use independent Poisson goal distributions for the two expected-goal values, then form the joint score matrix. Calculate:
- home win: sum cells where home goals > away goals;
- draw: sum cells where home goals = away goals;
- away win: sum cells where home goals < away goals.

Use a sufficiently wide goal range and explicitly measure omitted tail probability. Do not silently renormalize a materially truncated matrix. If the omitted probability mass exceeds 0.1%, expand the range; if it still cannot be brought below the threshold, flag the prediction as technically incomplete.

Round displayed percentages only after all calculations. The unrounded three-way probabilities must sum to 1 within numerical tolerance.

## 5. Data quality and prediction readiness

Keep three concepts separate:
1. **Probability** — the model's numeric outcome distribution.
2. **Data readiness** — whether the required inputs exist and their quality/sample limitations.
3. **Model confidence/calibration** — not established by this pilot and must not be inferred from probability size.

Every prediction must carry a concise explanation of sample sizes, source cutoff, source type, and material quality issues. Use an explicit limitation label for mixed competition/venue samples, the 2026-10-06 source cutoff, and Argentina's reduced sample.

The source scores include extra time and exclude penalty shootouts. Until regulation-time score semantics are independently verified for a historical record, do not treat that record as a clean regulation-time outcome. For evaluation, exclude ambiguous outcomes rather than scoring the model against a potentially different result definition.

## 6. Pre-kickoff capture rules

A prediction is eligible only if it is generated and captured strictly before the fixture kickoff in UTC. If kickoff time is unpublished, invalid, or already passed when a prediction is attempted:
- do not create a pre-match snapshot;
- do not backdate or reconstruct a prediction;
- record the fixture as `not_prediction_eligible` with the reason.

Each snapshot should be immutable and include fixture ID, model version, capture timestamp, kickoff UTC, expected goals, complete 1X2 distribution, input sample counts, source cutoff, and readiness/quality flags. A changed model creates a new version; it must not overwrite an earlier snapshot.

## 7. Evaluation plan

Evaluate only after a final result is available and its score definition is compatible with the model target. Keep pending, evaluated, and excluded fixtures distinct, with an exclusion reason.

Report:
- number of eligible predictions and evaluated outcomes;
- 1X2 accuracy as a descriptive count/rate only;
- multiclass Brier score and log loss;
- calibration summaries only with bin counts shown;
- exclusions and missing results.

Fifteen fixtures are a small exploratory sample. Do not claim statistical reliability, tune the model to these outcomes, or promote thresholds based on this sample. Preserve the baseline unchanged as a comparator before testing any alternative.

## 8. Explicit boundaries

This specification does not authorize:
- importing data or predictions into the club database or club history;
- app/UI changes, production deployment, Local Storage or Supabase writes;
- new APIs/providers, scraping, scheduled jobs, polling, workflows, quota use, or recurring cost;
- merging this PR or publishing predictions in the stable Match Center.

Any such work requires separate explicit approval.
