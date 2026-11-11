# Project Football Time — Phase 6: Multi-League Expansion & Model Development

Date: 2026-11-11  
Status: Preview implementation — not merged, not user-accepted

## Scope

The planned catalogue contains eight leagues:

| ID | League | Country | Current data status |
|---|---|---|---|
| PL | Premier League | England | Existing provider data |
| PD | La Liga | Spain | Existing provider data |
| BL1 | Bundesliga | Germany | Existing provider data |
| SA | Serie A | Italy | Existing provider data |
| FL1 | Ligue 1 | France | Existing provider data |
| ELC | EFL Championship | England | Supported by current free provider tier; first sync pending |
| J1 | J1 League | Japan | Planned; not included in current provider free tier |
| J2 | J2 League | Japan | Planned; not included in current provider free tier |

The existing provider remains football-data.org API v4. The official free-tier coverage page lists Championship among free competitions, while Japan's J. League competitions are not listed in the free-tier group. The provider's competition catalogue lists J. League but does not establish free-tier access for it; J2 is not confirmed as an accessible free-tier competition. Therefore J1/J2 must not trigger API calls or receive fabricated records.

## API and cost controls

- Monthly cost target remains 0 THB.
- No new provider, paid plan, billing, or card details.
- No changes to workflow cadence: keep the existing daily schedule and manual trigger configuration.
- Existing successful-run pattern: five leagues × three endpoints = 15 calls. Adding ELC changes the nominal successful run to six leagues × three endpoints = 18 calls.
- Keep the existing request spacing and retry policy; do not add polling frequency or The Odds API calls.
- J1/J2 make zero API calls until a no-cost, approved data source and current-season coverage are verified.
- A workflow failure must not publish a partially built database. Existing last-good database data remains the recovery reference.

## Phase 6.1 — League and season architecture

- Stable internal league IDs: PL, PD, BL1, SA, FL1, ELC, J1, J2.
- Keep provider competition codes separate from internal league IDs.
- Provider-backed leagues are defined separately from planned-but-unavailable leagues.
- Cross-year European seasons and calendar-year J.League seasons are explicitly distinguished.
- Team identity remains provider-based; team-season membership records league participation without changing a club's identity.
- Existing five-league records, player records, test records, prediction snapshots, and calibration history must be preserved.

## Phase 6.2 — Current-season data integration

- ELC is added to the existing football-data.org workflow using the provider competition code ELC.
- The three existing endpoints remain teams, matches, and standings.
- No historical backfill is introduced.
- J1/J2 remain visible in the league catalogue with an explicit unavailable status, but are excluded from ingestion.
- Do not broaden The Odds API beyond the original five leagues.

## Phase 6.3 — Data quality validation

The database validator checks:
- all eight catalogue IDs are unique and present;
- only the six provider-backed leagues contain team memberships, standings, and matches;
- J1/J2 have no provider code and no fabricated records;
- match IDs, team references, standings arithmetic, cancelled-match scores, and immutable pre-match snapshots remain valid;
- all six provider-backed leagues have data before the new database can be published.

## Phase 6.4 — League-aware analysis

The existing analysis engine already scopes completed matches, team metrics, and fixtures by league ID and season. This prevents cross-league mixing. ELC can use the existing shared analysis functions once its first data sync is available. J1/J2 cannot be analysed until verified match data exists.

## Phase 6.5 — Shared model and league-specific evaluation

- Keep one shared Poisson/model engine.
- Compute baselines from each league and season independently.
- Keep evaluation and calibration reports split by league and model version.
- Do not claim league-specific parameter tuning until enough real match outcomes exist and the tuning has been evaluated out of sample.
- J1/J2 parameter slots remain inactive until their data source is approved and data quality is validated.
- Preserve immutable pre-match snapshots; never use post-kickoff data as a pre-match input.

## Phase 6.6 — App integration and acceptance

- Show all eight planned leagues in the selector.
- Clearly label ELC as awaiting its first successful sync until provider data is present.
- Clearly label J1/J2 as unavailable on the current free data tier.
- Never show empty or unavailable data as zero, a prediction, or a successful sync.
- Keep the app read-only with respect to existing test/history storage.
- Run CI and inspect the proposed changes before merge.
- User acceptance requires testing the deployed app on Android. CI success alone is not acceptance.

## Preview acceptance checklist

- [ ] Existing five leagues continue to work.
- [ ] ELC teams, fixtures, results, and standings appear after the first successful scheduled sync.
- [ ] J1/J2 show the correct unavailable status and no invented rows.
- [ ] Team form, home/away, head-to-head, probability, and calibration remain separated by league.
- [ ] Legacy #001–#011, localStorage key pft_matches_v1, the 156-player database, and prediction history remain intact.
- [ ] No new provider, paid plan, billing, or The Odds API expansion.
- [ ] User verifies the deployed build on Android.

## References

- football-data.org free-tier coverage: https://www.football-data.org/coverage
- football-data.org API reference: https://www.football-data.org/documentation/api
