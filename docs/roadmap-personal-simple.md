# Project Football Time — Personal Roadmap (Simple Mode)

Date: 2026-11-10
Status: Adopted direction — Option A (simplest personal-use app)

## Product direction

Project Football Time is a private, personal football statistics and match-analysis app for one user. Optimize for dependable data, understandable analysis, mobile usability, and low maintenance. Do not build a commercial multi-provider data platform.

## Stable baseline to preserve

The following are existing project assets and must remain intact:

- Completed and user-tested Phase 1–5.6 functionality, including team/league analytics, Team Strength, Poisson match probabilities, probability calibration, Brier score, log loss, and reliability reporting.
- Five-league scope: Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), Ligue 1 (FL1).
- Private Supabase player database: 156 existing StrikerAPI player records. Keep the current rows and owner-scoped access; no bulk refresh or re-import.
- Local Storage key `pft_matches_v1`; do not rename, clear, overwrite, or auto-migrate it.
- Original test records #001–#007 and central records #008–#011.
- Immutable pre-match prediction snapshots and existing calibration history.
- Current mobile UI and service-worker behavior.

No phase is considered complete solely because CI or deployment passed; user verification remains the acceptance check for user-facing changes.

## Simplified scope

### Keep and maintain

1. Match data for the five leagues: fixtures, results, scores, and standings using the existing configured data pipeline.
2. Team form and home/away performance using match data already available in the app.
3. Existing team, league, head-to-head, and advanced team analytics.
4. Match probability estimates and transparent explanations of the factors used.
5. Accuracy tracking after matches finish, including calibration, Brier score, and log loss.
6. Clear mobile-first navigation and a visible app version label in the header on future releases.

### Player data — maintenance only

- Keep the existing 156-player private database as-is.
- Do not add new player-stat providers or attempt full historical player-stat coverage.
- Do not run a bulk StrikerAPI refresh or spend additional API credits without a separate explicit approval.
- Player information may remain available as a reference feature, but it is not a blocker for the core app.

### Pause as research-only

Do not connect, import, transform, persist, or schedule data from these experimental sources for now:

- Wyscout
- Impect
- Reep
- OpenPlay
- StatsBomb
- API Ninjas

Keep the existing pilot scripts and documentation as archived research material. Do not delete them merely because the direction changed. PR #35's local Wyscout parser remains offline/read-only and is not part of production data ingestion.

Do not continue building multi-provider identity bridges, canonical-player crosswalks, source-specific player-stat adapters, or automated player-stat import previews unless the user explicitly reopens that scope.

## Cost and API policy

- Target ongoing cost: 0 THB/month.
- No paid API, subscription, plan upgrade, or paid data source without explicit user approval.
- Keep API credentials in GitHub Secrets or the existing secure server-side configuration; never expose them in client code or repository data.
- Reuse the existing football match-data workflow and its current provider limits. Do not increase polling frequency or add providers/API calls, except for the explicitly approved optional The Odds API reference-handicap integration recorded in Phase 5.7 below.
- If the existing free-tier quota or provider access is exhausted, show the data as unavailable/stale rather than silently switching to a paid source or making extra requests.

### Explicitly approved exception — Phase 5.7 (2026-11-11)

- The user approved adding The Odds API as the sole external source for reference Asian Handicap lines.
- Use only the configured free plan; do not enable billing, upgrade, or incur charges. The API key must remain in GitHub Actions Secrets as `THE_ODDS_API_KEY`.
- Fetch one market (`spreads`) from one region (`eu`) for each of the five supported leagues once daily. This is five credits per scheduled run at the provider's documented one-credit-per-region-per-market rate, or about 150 credits per 30-day month if every request returns data.
- The workflow performs one initial refresh after an approved PR merge, then runs daily; it may also be run manually. It never runs on code pushes. Do not add retries or extra polling.
- Stop before making remaining requests if the returned quota is insufficient to complete the five-league run. Preserve the last successfully fetched data; the app must mark old lines stale and must not calculate from stale lines.
- Soccer handicap coverage is not guaranteed by the provider. If a league/match has no supported market, display “ไม่มีข้อมูล” and do not infer a line.
- Store only reference line points, provider/bookmaker names, market update timestamps, and quota metadata; do not store odds prices, bookmaker links, or betslip links.
- This integration is for statistical analysis only and does not add betting functionality.

## Prioritized next phases

### Simple Phase A1 — Match-data reliability

- Review the existing fixtures/results/standings pipeline without changing its request frequency or provider.
- Check data freshness, duplicate fixtures, missing scores, postponed matches, and season/league mapping.
- Make only small, isolated fixes with tests.
- Acceptance: no loss or duplication of historical data; all five leagues remain usable; user verifies the deployed app.

### Simple Phase A2 — Analysis quality

- Improve the clarity and reliability of existing team-form, home/away, head-to-head, and Poisson inputs.
- Keep predicted probability distinct from confidence/readiness labels.
- Continue recording immutable pre-match snapshots and evaluate them against actual results.
- Do not claim model improvement without measured evidence on a sufficient sample.
- Acceptance: explainable inputs, no mutation of historical snapshots, and calibration metrics continue to work.

### Simple Phase A3 — Mobile usability and maintenance

- Keep the current visual design; avoid cosmetic redesigns.
- Add/maintain a visible version label in the app header, matching the actual deployed build.
- Fix only reproducible bugs and usability issues.
- Acceptance: test on the user's Android phone and verify all existing core features and records.

## Explicit non-goals

- No betting placement, deposits, withdrawals, payouts, gambling promotions, or links encouraging gambling.
- No paid data feeds or new recurring costs.
- No multi-provider player-statistics platform.
- No broad player-statistics backfill.
- No destructive schema migrations or replacement of existing test/history records.
- No unrelated redesign or feature expansion.

## Change and verification rules

1. Prefer small, reversible changes.
2. Inspect the existing implementation before changing it; do not assume the roadmap requires new infrastructure.
3. Keep production data read-only unless a change is essential and explicitly authorized.
4. Never clear or overwrite user records, the 156-player database, prediction snapshots, or calibration history.
5. Run relevant CI/tests and inspect deployment status, but do not equate those with user acceptance.
6. After user-facing changes, ask the user to test the app on Android and record the outcome.
7. If a task would incur a cost, increase API usage, change data retention, or alter the stable baseline, stop and ask first.

## Immediate next action

Start with a read-only health review of the existing match-data pipeline and its latest GitHub Actions run. Do not trigger a manual sync or add API calls. Report what is healthy, stale, failing, or unclear before proposing any code changes.
