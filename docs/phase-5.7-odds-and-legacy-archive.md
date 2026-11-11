# Phase 5.7 — Automatic Asian Handicap reference data and Legacy Archive

Date: 2026-11-11

## Scope

1. Fetch current football handicap line points from The Odds API for the five supported leagues.
2. Display available bookmaker reference lines beside the selected match's Poisson analysis.
3. Move historical test records #001–#011 and their summary into a separate Legacy Archive page.
4. Preserve all historical records and the existing `pft_matches_v1` Local Storage key.

## Provider and request budget

- Provider: The Odds API, using the free plan only.
- Secret: `THE_ODDS_API_KEY` in GitHub Actions Secrets; never expose it to browser code or commit it to the repository.
- League sport keys: `soccer_epl`, `soccer_spain_la_liga`, `soccer_germany_bundesliga`, `soccer_italy_serie_a`, and `soccer_france_ligue_one`.
- Request: one `spreads` market, one `eu` region, upcoming seven-day window.
- Schedule: daily at 06:15 Asia/Bangkok; manual workflow dispatch is available. No push trigger.
- Provider documents a cost of one credit per region per market. Five requests per run are therefore at most five credits per daily run (about 150 per 30 days when all calls return data).
- The workflow does not retry failed requests. If quota is insufficient to finish all five league requests, it preserves the previously published data.
- Soccer `spreads` market availability varies and is not guaranteed. Empty results are valid and must remain visibly unavailable.

## Data and calculation rules

- `data/asian-handicap-odds.json` contains line points, bookmaker names, market timestamps, provider name, and quota metadata. It does not contain odds prices or bookmaker/betslip URLs.
- The home-team line is taken from the home outcome's point; the away line is its inverse. A median of available bookmaker line points is the reference line.
- Match association requires exact normalized home/away team names and kickoff times within six hours.
- A line older than 24 hours is displayed as stale and is not used for probability calculation.
- The existing Poisson expected-goals output and Asian Handicap settlement module are reused. No historical prediction snapshots are rewritten.
- No line is invented when the feed is empty, unavailable, stale, or cannot be matched.

## Legacy Archive

- Home page no longer renders old test results or their summary.
- Records and backup/import controls are available on the Legacy Archive page.
- Existing local records, central records, result fields, and original storage key are retained; no destructive migration is performed.

## Acceptance checks

- CI validates the inline app JavaScript, importer parser, handicap calculation, and archive navigation.
- Verify no API key is present in client assets or JSON data.
- Verify daily workflow only, five calls maximum, no push trigger, no retries, and quota guard.
- Verify an empty or stale odds feed produces no guessed handicap line.
- After merge and Pages deployment, user verifies the app on Android, especially Archive navigation and a match with/without returned handicap data.
