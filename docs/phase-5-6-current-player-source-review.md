# Phase 5.6 — Current-season player data source review

Review date: 2026-11-10  
Target season: 2026/27  
Target competitions: Premier League, La Liga, Bundesliga, Serie A, Ligue 1

## Decision summary

**Preferred current-season player performance source: StrikerAPI free tier, subject to a valid repository secret and a successful live import.**

StrikerAPI documents current player-season totals, per-90 metrics, and recent match logs for all five target leagues. Its published free tier provides 500 credits/month without a payment card. Its terms explicitly permit building and operating an app with derived/player-level data while the account remains open, but prohibit reselling or redistributing its raw data as a separate feed. Keep provider provenance in our internal records even though the provider says attribution is not required.

The repository already contains a StrikerAPI importer implementation from Phase 5.6. Reuse and verify that integration rather than adding a second overlapping player importer. The latest previous StrikerAPI workflow attempt failed because the repository secret was blank; no data was imported and no credits were consumed in that attempt. Before production use, confirm the secret is present and run a controlled five-league import.

## Candidate comparison

| Source | Current 2026/27 player stats | Coverage | Access / rights | Decision |
|---|---|---|---|---|
| StrikerAPI | Yes: appearances, starts, minutes, goals, assists, shots, xG, cards, per-90, recent games | All five target leagues | 500 free credits/month; published terms permit app use while account remains open; do not resell raw feed | **Preferred**, use existing importer |
| API Ninjas | No performance totals; current squads and bios only | All five target leagues | Free API tier; API key required | Keep as roster/bio fallback, not stats source |
| OpenPlay | No 2026/27; historical player-match data through 2025/26 | All five target leagues | Maintainer states CC BY 4.0, but upstream WhoScored/Opta rights need separate review | Historical research candidate only |
| Understat | Current season player/xG tables are publicly visible | All five target leagues | No official public API; current technical guidance reports robots.txt disallows automated readers from 2026-11-03; older community notes only report non-commercial permission | **Do not scrape or automate**; request written permission first |
| Gamblistics Hugging Face dataset | 2026 player-level rows, but snapshot last updated 2026-09-21 | English Premier League only | CC BY-NC 4.0; only 492 match-player-stat records, coverage gaps, reverse-engineered proprietary upstream format | Research-only; not suitable as five-league production feed |
| open-matchday | Current 2026/27 match/team stats, not player performance stats | 75 competitions incl. target five | Maintainer says non-commercial; upstream data rights should be reviewed | Useful for match-level context only |
| Football-Charts | Current results/fixtures; player stats are not included in its free offer | 98 leagues for results | Free key is for personal use; public app/site used by others requires Commercial plan | Not suitable for player stats at zero cost |
| Sports Data Vault | Current player and xG tables | Broad match coverage | Paid: $10/month or one-off files; not a zero-cost source | Exclude under current budget |

## StrikerAPI credit budget

The existing implementation's planned monthly ceiling is:
- 5 whole-league squad calls × 10 credits = 50 credits.
- Up to 60 player profile calls × 5 credits = 300 credits.
- Planned total = 350 / 500 credits, leaving approximately 150 credits for retries and later cycles.

This is a bounded rotating sample, not a claim that every player is refreshed every month. Preserve the profile cursor, rotate players over time, and do not exceed the monthly budget. If the source's credit costs change, stop and re-evaluate before importing.

## Important field handling

- Season 2026 means 2026/27 in StrikerAPI.
- Keep provider player IDs distinct from internal PFT player IDs; use explicit cross-provider identity mapping.
- Keep season, club, provider, source timestamp, and raw metric definitions.
- Do not turn missing/null metrics into zero.
- get_player provides per-season aggregates and up to the last ten matches; exact field availability can vary by player/competition.
- xG from StrikerAPI is the provider's own model. Never silently merge it with OpenPlay or Understat xG without retaining the source/model label.
- Do not redistribute the raw StrikerAPI dataset or expose API credentials in browser code.

## Operational state and next action

- Existing StrikerAPI integration is already present in the repository from Phase 5.6.
- A previous workflow attempt found STRIKERAPI_API_KEY blank; the production player database was not populated.
- API Ninjas integration also exists, but its prior import failed because API_NINJAS_API_KEY was blank; it cannot fill performance statistics anyway.
- The latest current-player-roster workflow attempt failed at its missing-secret check; it did not import player records.
- Therefore this review does not modify the production player database or claim any current-season records have been imported.

**Next controlled operation:** verify that STRIKERAPI_API_KEY is configured in GitHub repository Actions secrets, then run the existing importer manually. First inspect the workflow and run logs; only report success after the five leagues are fetched, the JSON is validated, and the deployed app displays the resulting data.

## Sources

- StrikerAPI docs: https://strikerapi.com/docs
- StrikerAPI player endpoint: https://strikerapi.com/docs/get-player
- StrikerAPI squad endpoint: https://strikerapi.com/docs/get-squad
- StrikerAPI timing and rights: https://strikerapi.com/docs/timing-and-rights
- API Ninjas: https://api-ninjas.com/api/football
- OpenPlay: https://github.com/nlbair/openplay
- Understat robots / current access note: https://sportsdatatutorials.com/tutorials/build-an-xg-league-table-from-understat.html
- Understat historical non-commercial note: https://ewenme.github.io/understatr/
- Gamblistics dataset: https://huggingface.co/datasets/gamblistics-lab/sport-statistics
- open-matchday: https://github.com/oladeeayo/open-matchday
- Football-Charts plans and terms: https://www.football-charts.com/developers
- Sports Data Vault: https://sportsdatavault.com/en/data/
