# Project Football Time — Main Roadmap (Simple but Complete)

Date: 2026-11-11  
Status: Adopted as the active project roadmap  
Product direction: Simple but Complete — a personal football app for one user

## 1. Product goal

Project Football Time is a personal football statistics and match-analysis app. It should be easy to understand and convenient to use every day while still providing enough reliable information to make sense of each match.

The product is not intended to become a commercial data platform or a professional analytics console. Keep advanced calculations in the background; show the useful conclusion first and let the user open supporting detail when wanted.

Core experience:

**Open the app → find a match → review team statistics → read a clear analysis → save it → check the actual result later.**

Product decisions must prioritize:
1. Ease of everyday use.
2. Reliable and clearly sourced football data.
3. Complete but relevant team and match information.
4. Understandable analysis with visible reasons and limitations.
5. Low maintenance and zero recurring cost.

## 2. Current stable baseline — preserve it

Do not rebuild or remove existing working features simply to make the roadmap look cleaner. Review each feature before changing its placement or implementation.

Preserve:
- Existing completed and user-tested functionality from prior phases, including match records, league/team data, team form, home/away analysis, head-to-head, league analytics, match probabilities, and evaluation history.
- The five core leagues: Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), and Ligue 1 (FL1).
- Any already-enabled additional competition only while its existing data feed remains reliable and within the approved free usage. Do not expand competition coverage as a priority.
- The existing private player database and its 156 StrikerAPI records. Keep current rows and owner-scoped access; no bulk refresh, re-import, or provider expansion.
- Local Storage key `pft_matches_v1` and existing prediction storage keys, including `pft_probability_predictions_v1`. Do not rename, clear, overwrite, or automatically migrate them.
- Original test records #001–#007 and central records #008–#011.
- Immutable pre-match prediction snapshots and existing calibration/evaluation history.
- Existing service-worker behavior and working mobile functionality.

No feature is considered accepted solely because CI or deployment passed. User verification on the Android device remains the acceptance check for user-facing changes.

## 3. Main roadmap

### Step 1 — App usability review and simplification
**Current step. Read-only review first; no UI or code changes until the proposed screen map is agreed.**

- Review every current screen, navigation item, and user-facing feature.
- Identify duplicated information, overly technical labels, rarely used tools, and workflows requiring too many taps.
- Decide what belongs on the main screen, what belongs in match/team details, and what should be secondary or hidden from everyday use.
- Check that the home screen serves as a practical match center using the normal football database, and distinguish it from test/experiment fixtures.
- Propose a simple navigation structure and a keep / simplify / move to details / pause inventory.
- Preserve all records and working functionality while reviewing.

Proposed information architecture (subject to the read-only audit):
1. **หน้าหลัก / Match Center** — today's and upcoming fixtures, live or completed status, quick league filters.
2. **ลีกและทีม** — standings, fixtures/results, team profile, form, home/away, and head-to-head.
3. **วิเคราะห์** — select a match, see the main conclusion and probabilities, then expand the reasons and supporting statistics.
   - The future match-analysis layout should accommodate separate 1X2, score-margin, and Asian-handicap probability summaries without making the main screen crowded; detailed score distributions and evaluation diagnostics belong behind an expandable detail view.
4. **ประวัติ** — saved analyses, actual results, and a simple accuracy summary.

Player reference data, legacy records, backups, model diagnostics, and experimental tools should remain accessible where needed but should not dominate the main navigation.

Acceptance:
- A user can find a match, inspect the relevant team data, and read the analysis without navigating through a long list of technical tabs.
- The user reviews and approves the proposed screen map before implementation.

### Step 2 — Dependable football data
- Maintain fixtures, results, scores, and standings for the five core leagues using the existing approved data pipeline.
- Show data freshness and unavailable/stale status clearly; never silently substitute invented or stale values.
- Check duplicate fixtures, missing scores, postponed matches, season/league mapping, and team identity consistency when a concrete issue is found.
- Keep the current provider and request cadence. Do not add providers, increase polling, or incur costs without explicit approval.
- Do not make user-verified data a recurring blocker; investigate again only when new evidence indicates a problem.

Acceptance:
- The core leagues remain usable; historical data is not lost or duplicated; unavailable data is clearly identified.

### Step 3 — Useful team and match statistics
Keep the statistics that directly help a user understand a match:
- Recent form over the last 5–10 completed matches.
- Home and away performance.
- Goals scored and conceded.
- League position and points per match.
- Head-to-head history, with sample-size limitations clearly shown.

Prefer a concise summary first. Detailed tables and longer history can be opened on demand. Do not add metrics for which there is no reliable source.

Acceptance:
- The user can understand why a team appears stronger or weaker without needing to interpret a large analytics dashboard.

### Step 4 — Clear, explainable match analysis
- Retain the existing probability model and its historical outputs unless evidence demonstrates a real defect.
- Show the estimated 1X2 probabilities in a clear, readable format.
- Explain the main contributing factors in ordinary language: recent form, home/away performance, league baseline, standings, and head-to-head when the sample is sufficient.
- Add a unified score-probability analysis that derives both 1X2 outcomes and Asian-handicap outcome probabilities from the same underlying predicted score distribution; do not create disconnected or contradictory models for each market.
- For a selected, explicitly sourced handicap line, show the probability of each applicable statistical settlement outcome: full win, half win, push/refund, half loss, and full loss. For integer and quarter lines, calculate settlement categories correctly from the score margin and the line's split components; the mutually exclusive categories must sum to 100% (subject only to displayed rounding).
- Keep ordinary match result probabilities (home win/draw/away win), score-margin probabilities, and handicap settlement probabilities visibly separate. Explain in plain language that a team can be likely to win the match while less likely to cover a larger handicap.
- Treat handicap lines as optional statistical inputs/reference context only. Identify the line, provider/source, and update time; mark missing or stale lines unavailable and never infer or silently substitute a line. Do not display odds prices, bookmaker links, betslips, staking, or betting recommendations.
- Use the existing team form, home/away performance, goals for/against, league baseline, standings, and adequately sampled head-to-head data as model inputs. Disclose sample size, data freshness, missing inputs, and uncertainty; do not add a provider or increase API usage without separate approval.
- Evaluate handicap probability outputs against actual match scores using an appropriate multiclass/probabilistic scoring and calibration approach, with sufficient out-of-sample samples. Report evaluated, pending, and excluded counts; do not claim improvement from small samples or tune coefficients merely to improve metrics.
- UX/UI: integrate the analysis into the existing app design system and navigation. Present the match conclusion and key percentages first, use clear labels and compact visual summaries, and place score distributions, calculation explanations, sample sizes, and technical diagnostics in expandable secondary detail. Ensure mobile-first responsive layouts, readable contrast and typography, consistent spacing/components, and accessible controls; avoid a dense betting-style dashboard.
- Keep probability separate from confidence/data readiness.
- Clearly disclose missing information and small samples; never imply certainty or guarantee an outcome.
- Keep advanced model details, coefficients, calibration diagnostics, Brier score, log loss, and ECE in a secondary technical view or internal evaluation layer.
- Do not change model coefficients merely to improve displayed numbers. Require sufficient out-of-sample evidence before claiming better predictive performance.
- Any reference handicap data remains statistical context only. Show provider and update time; mark missing or stale data and do not infer values.

Acceptance:
- The user can understand the conclusion and the reasons supporting it at a glance, with further detail available when requested.

### Step 5 — Simple history and accuracy tracking
- Preserve immutable pre-match snapshots.
- Record actual match results after completion.
- Show a simple summary of evaluated, correct, incorrect, and pending analyses, with a clearly defined accuracy denominator.
- Keep league/model breakdowns and calibration metrics available as secondary detail.
- Preserve legacy records and central records separately where their definitions differ; do not combine incompatible result types.

Acceptance:
- The user can review what was predicted, what actually happened, and how the app has performed over time.

## 4. Player data — maintenance only

- Keep the existing 156-player private database as-is.
- Player information is a secondary reference feature, not a blocker for the core app.
- Do not add new player-stat providers, attempt full historical player-stat coverage, run bulk StrikerAPI refreshes, or spend additional API credits without separate explicit approval.
- Do not continue multi-provider identity bridges, canonical-player crosswalks, source-specific player-stat adapters, or automated player-stat import previews unless the user explicitly reopens that scope.
- Keep Wyscout, Impect, Reep, OpenPlay, StatsBomb, and API Ninjas experiments as archived research only. Do not connect, import, transform, persist, or schedule their data in production.

## 5. Cost, API, and product boundaries

- Target ongoing cost: **0 THB/month**.
- No paid API, subscription, plan upgrade, or paid data source without explicit user approval.
- Keep API credentials in GitHub Secrets or existing secure server-side configuration; never expose them in client code or repository data.
- Reuse the existing football match-data workflow and provider limits. Do not increase polling or add providers/API calls without approval.
- If a free-tier quota or provider access is exhausted, show data as unavailable/stale rather than switching to a paid source or making extra requests.

### Existing approved exception — The Odds API reference handicap
The user previously approved The Odds API as the sole external source for reference Asian Handicap lines. Preserve the existing approved limits; do not expand them:
- Free plan only; no billing, upgrade, or charges. API key remains in GitHub Actions Secrets as `THE_ODDS_API_KEY`.
- One `spreads` market, one `eu` region, for each of the five core leagues once daily (up to five credits per scheduled run, approximately 150 credits per 30-day month if all requests return data).
- One initial refresh after an approved PR merge, then daily scheduled runs; manual run only when explicitly needed. No push-triggered runs, retries, or extra polling.
- Stop before remaining requests if quota is insufficient to complete the five-league run. Preserve the last successful data; mark old lines stale and do not calculate from stale lines.
- If a league or match has no supported market, display “ไม่มีข้อมูล”; never infer a line.
- Store reference line points, provider/bookmaker names, market update timestamps, and quota metadata only. Do not store odds prices, bookmaker links, or betslip links.
- This is statistical reference data only and must not add betting functionality.

### Explicit non-goals
- No betting placement, deposits, withdrawals, payouts, gambling promotions, or links encouraging gambling.
- No paid data feeds or new recurring costs.
- No commercial multi-provider data platform or broad player-statistics backfill.
- No destructive schema migrations or replacement of existing test/history records.
- No unrelated redesign or feature expansion.

## 6. Development and release rules

1. Inspect the existing implementation before changing it; do not build a duplicate feature.
2. Start with read-only review and a short, concrete proposal.
3. Prefer small, reversible changes on a separate branch.
4. Run relevant tests and inspect CI/deployment results.
5. Do not write to production data or change production configuration unless essential and explicitly authorized.
6. Do not merge to `main` or change production deployment without the user's review and approval.
7. After user-facing changes, ask the user to test on Android and record the outcome.
8. Preserve existing records, player data, snapshots, calibration history, Local Storage keys, and backup formats.
9. If a task would incur cost, increase API usage, change data retention, or alter the stable baseline, stop and ask first.

## 7. Superseded and paused work

- This document is the **single active project roadmap**.
- The former Simple Phase A1/A2/A3 sequence is no longer the active delivery plan. Its completed work remains part of the stable baseline; unfinished tasks are reconsidered only when they serve this roadmap.
- `docs/simple-phase-a2-a3.md` is retained as historical implementation notes, not a competing active roadmap.
- Phase 6 multi-league expansion beyond the current approved coverage is paused. Do not start J1/J2 or other new league ingestion until a verified no-cost source and a clear user need are approved.
- Supabase security audit work is paused as previously agreed. Preserve its findings and evidence; do not start production writes or migrations from that audit unless the user explicitly reopens it.

## Immediate next action

Complete **Step 1 — App usability review** as a read-only audit of the current `main` build. Produce:
- a screen/navigation inventory,
- a keep / simplify / move to details / pause recommendation for each feature,
- a proposed simple navigation map,
- any obvious usability inconsistencies to verify on Android.

Do not modify application code during this review. Present the findings and obtain the user's approval before implementation.
