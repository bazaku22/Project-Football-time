# Phase 5.7 — November schedule, national-team research and Asian Handicap

## Scope
- Add a horizontal day selector; only the selected fixture date is rendered.
- Research all 12 national-team fixtures from a static, source-linked data snapshot.
- Generate exploratory national-team 1X2 estimates from each team's latest 3–4 senior results.
- Derive Asian Handicap settlement probabilities from the same expected-goals score matrix. Whole, half and quarter-goal lines are supported.
- Keep the national-team model separate from the existing club Poisson model.

## National-team model limitations
The experiment uses a weighted average of each team's recent goals scored and conceded, blended with conservative baseline scoring rates and a small home adjustment, then builds an independent Poisson score matrix. Samples contain only 3–4 matches, opponent strength is not fully normalized, and confirmed lineups, injuries and player-level performance are not comprehensively available. The existing 156 player records are identity/current-club master records, not player performance statistics, so they are not used as a false proxy for national-team strength. All national-team estimates are therefore marked low confidence. They are exploratory and do not claim improved accuracy.

## Asian Handicap
- Derived from the model's score distribution, not market prices.
- Reports full win, half win, push, half loss and full loss.
- Quarter lines split into adjacent whole/half lines.
- No odds feed, scraping, bookmaker integration or additional API calls.
- 1X2 probabilities remain unchanged and separate.

## Preservation and acceptance
- Keep Legacy #001–#011, existing experiment snapshots, core snapshots, calibration, player records and Supabase unchanged.
- Keep all 15 fixtures and kickoff timestamps unchanged.
- No additional providers, scheduled runs, API calls, paid services or database writes.
- CI tests cover research coverage and handicap settlement math.
- User must verify the updated interface on Android before acceptance.
