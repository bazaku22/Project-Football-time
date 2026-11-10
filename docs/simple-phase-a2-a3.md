# Simple Phase A2 + A3 — Analysis quality and mobile maintenance

Status: implementation prepared for user review; no production data writes or new API calls.

## A2 — Analysis quality
- Keep the existing pft-poisson-1.0 coefficients and probability outputs unchanged in this pass. Do not claim improved accuracy without out-of-sample evidence.
- Expose the existing expected-goal stages: venue/league baseline, recent-form multiplier, standings multiplier, and H2H blend.
- Evaluate only complete 1X2 vectors summing to 100% (±1.1 points), with valid kickoff timestamps and creation timestamps strictly before kickoff.
- Preserve every snapshot. Invalid or non-pre-match records are excluded from evaluation, never deleted or rewritten.
- Report top-choice accuracy, multiclass Brier score (mean squared error across three outcomes), log loss, and expected calibration error (ECE).
- Break down results by league and model version; reliability bins compare mean predicted top-outcome probability with observed hit rate.
- Label sample sizes: under 30 is very limited; 30–99 is preliminary; 100+ remains observational, not proof of predictive skill.
- Add offline tests for outcomes, invalid vectors, post-kickoff timestamps, pending fixtures, and empty history.

## A3 — Mobile and maintenance
- Display Football Time V5.6.1 in the existing header without redesigning navigation.
- Bump the service-worker cache key and cache the new metrics script.
- Keep all existing storage keys and backup format unchanged.

## Preserved boundaries
- No football-data.org, StrikerAPI, Supabase, or other external API calls are added.
- No paid services, dependencies, schema migrations, or changes to the five-league feed.
- Do not change pft_matches_v1, pft_probability_predictions_v1, snapshots, test records #001–#011, or the 156 private player records.
- CI and deployment are not acceptance by themselves; Android verification by the user is required.
