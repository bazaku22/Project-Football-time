# Phase 5 — Advanced Football Analysis

Status: implementation candidate for user testing.

## 5.1 Team Strength
- League-and-season-relative percentile index, scored 0–100.
- Weights: points per game 35%, goal difference per game 25%, last-five form points per game 25%, combined home/away points per game 15%.
- The score is a comparative index, not a win probability.
- Uses completed matches with valid scores and current-season standings only.

## 5.2 Attacking and Defensive Analysis
- Goals for and against per match, season-wide and last five completed matches.
- Home and away scoring/conceding rates shown separately.
- No xG, shots, or tactical metrics are fabricated when the source does not provide them.

## 5.3 Team Readiness
- Current data source does not provide a verified injury, suspension, or confirmed starting-lineup feed.
- These fields explicitly display unknown/unavailable and are excluded from strength and probability calculations.

## 5.4 Risk and Uncertainty
- A transparent heuristic data-risk index (0–100), based on completed-match sample size, recent form-point volatility, mismatch between completed matches and standings played, and limited home/away samples.
- Higher values mean greater data limitations; it is not financial risk or a match-outcome probability.
- This heuristic is not statistically calibrated yet.

## 5.5 Explanation and Data Quality
- Shows the factors and weights behind team strength, match-sample coverage, standings consistency, data-source label, and probability-model reasons for a selected upcoming fixture.
- Does not mutate immutable pre-match probability snapshots or legacy test records.

## Safety and data integrity
- No betting, wagering, or money-handling functionality.
- Historical analysis uses only completed matches with non-negative integer scores.
- No claims of player availability without a reliable source.
- Existing Local Storage keys and test-records are not modified by Phase 5.
