# Phase 2 — Football Intelligence (Model v2.0)

## Scope
This phase strengthens the existing team-form and match-analysis features without adding duplicate navigation or new paid data providers. It applies only to the five provider-backed club leagues already in the football database. International fixtures and the isolated International Handicap model/data/history are not read or modified.

## Team Intelligence
- Team form is derived only from completed matches with valid integer scores in the same league and season.
- The model uses up to 10 most recent matches. When at least five are available, form points-per-game is blended as 60% last-five PPG and 40% last-ten PPG. With fewer than five matches, it uses the available sample and exposes the sample count.
- Home and away attack/defence rates remain venue-specific and are shown with their match counts.
- League home/away goal averages and league points-per-game provide the baseline.

## Match Intelligence
- Opponent strength is estimated from the current league standings for opponents faced in the last 10 matches. An opponent is included only when its standings row has at least three matches played.
- The opponent-strength multiplier is applied only when at least three opponent samples are available; it is bounded to 0.97–1.03 to prevent a small sample from dominating the forecast.
- H2H is restricted to completed matches between the same teams in the same league and season. It is excluded from the model unless at least five matches exist; when eligible, its mean goals receive a 15% blend.
- Missing or insufficient samples are disclosed in Analysis Insight and do not get filled with guessed values.

## Probability model v2.0
- Expected goals start from the geometric mean of venue-specific attack, opponent venue-specific defence, and league goal baseline.
- Form factor compares blended 5/10-match PPG against league PPG and is bounded to 0.88–1.12.
- Opponent-strength factor is bounded to 0.97–1.03.
- Standings factor remains bounded to 0.92–1.08.
- The Poisson score distribution continues to power 1X2, score-margin probabilities, and the existing Club Asian Handicap settlement calculations.
- Probability bands remain descriptive outcome-probability bands (high >=65%, medium >=40%, low <40%); data confidence remains a separate measure.
- Probability confidence now considers venue sample (55%), up-to-10-match form sample (30%), and standings availability (15%). It is a data-coverage indicator, not a probability or guarantee.
- Python pre-match snapshot generation and browser analysis use the same v2.0 form blend, opponent-strength gate, H2H threshold, confidence weights, and probability-band threshold.

## History and compatibility
- Model version is bumped to `pft-poisson-2.0`. Existing v1.0 snapshots are retained as immutable historical forecasts; they are not recalculated or overwritten.
- New snapshots include form-5/form-10 counts, opponent-strength sample counts, model multipliers, league baseline, and H2H gate metadata.
- Existing Local Storage keys, JSON backup/import, probability history, Club Handicap history, settlement logic, and International storage keys are unchanged.
- App version: V6.9.0-beta.1. Service Worker cache: V58.

## Data limitations
- The current provider database does not include verified injuries, suspensions, confirmed lineups, xG, shots, or detailed event data. Those factors remain explicitly unknown and are not used.
- Opponent PPG is a current-season standings proxy, not a historical rating as of each prior fixture. It is used only as a small bounded context adjustment and must not be interpreted as a causal strength rating.
- H2H is season-scoped; it does not claim to represent multi-season rivalry history.
- Calibration/accuracy remain evaluated from immutable pre-match snapshots and actual results. Model v2.0 needs its own adequate out-of-sample sample before any claim of improved accuracy is made.

## Cost and safety
- No new API provider, API request, scheduled workflow, quota use, or paid service is introduced.
- No betting placement, odds recommendation, deposits, withdrawals, payouts, or gambling promotion is added.
- No production deployment or live data sync is performed by this branch.
