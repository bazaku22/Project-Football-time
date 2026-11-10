# Project Football Time — Phase 4.4–4.7 Analytics

## Unified database workspace

All football-data views live under the single **ฐานข้อมูล** navigation item. The database workspace has sub-tabs for league overview, team form, team profile, home/away, head-to-head, league analytics, match probability, and model accuracy. The existing personal test-record pages remain separate because they are not the football provider database.

## Phase 4.4 — Head-to-head

- Compares two selected teams within the selected league and season.
- Uses only matches with status `FINISHED` and non-negative integer home/away scores.
- Reports wins, draws, losses, goals scored/conceded, and the match list.
- Fewer than three meetings are explicitly flagged as a small sample. H2H is not used as a model adjustment unless at least three same-season meetings exist.

## Phase 4.5 — League analytics

- Uses completed matches only.
- Reports match count, average total/home/away goals, home wins, draws, away wins, clean-sheet matches, both-teams-scored matches, and total-goal bands (0–1, 2–3, 4+).
- Percentages use completed matches as the denominator. No rates are inferred from scheduled, cancelled, or incomplete matches.

## Phase 4.7 — Match probability model

Model version: `pft-poisson-1.0`.

For each upcoming fixture, expected goals are estimated from:
1. Home team's home goals scored per match.
2. Away team's away goals conceded per match.
3. Away team's away goals scored per match.
4. Home team's home goals conceded per match.
5. League home/away scoring averages as reference values.
6. Recent form over the latest five completed matches (points per match).
7. Current-season standings points per match.
8. Head-to-head goal averages, blended at 15% only when at least three meetings exist.

Venue scoring/conceding rates and league rates are combined with a geometric mean where available. Recent-form multipliers are bounded to 0.88–1.12; standings multipliers are bounded to 0.92–1.08. Expected goals are bounded to 0.20–3.50. Independent Poisson goal distributions (0–10 goals) are combined into home-win/draw/away-win probabilities and normalized to 100%.

### Probability labels

The label applies to the most likely 1X2 outcome:
- **High:** 65% or more
- **Medium:** 45% to below 65%
- **Low:** below 45%

These are initial interpretation bands, not guarantees. They should be reviewed against the calibration record as the sample grows.

### Data confidence is separate

Confidence is based on available home/away match samples, five-match form samples, and whether both teams have current-season standings. It is displayed separately from the 1X2 probability. High probability does not automatically mean high data confidence.

## Phase 4.6 — Accuracy and calibration

- A prediction snapshot is stored once per provider match ID when the fixture is still scheduled/timed and kickoff is in the future.
- Existing snapshots are immutable; a later database refresh does not rewrite an earlier forecast.
- Snapshots are evaluated only after the corresponding database match is marked `FINISHED` with valid scores.
- Metrics: top-choice 1X2 accuracy, multiclass Brier score (mean squared error across the three outcome probabilities), log loss, and reliability bins comparing average top probability with observed hit rate.
- The historic personal test records in `pft_matches_v1` are not mixed into these 1X2 probability metrics because they do not contain a complete, comparable three-outcome probability vector.
- Prediction snapshots are stored locally in `pft_probability_predictions_v1`. They are device/browser-specific; the JSON backup now includes them so they can be carried to another device.

## Limitations and safeguards

- The model is a transparent baseline, not a trained or independently validated forecasting system.
- Missing data is not fabricated. Low sample sizes are shown and reduce the data-confidence score.
- H2H is excluded from the model when fewer than three same-season meetings exist.
- Probabilities are estimates, not certainty. Calibration and sample size must be reviewed before drawing conclusions about model quality.
- This project remains a football statistics and analysis application. It does not place bets, handle money, or promote gambling.
