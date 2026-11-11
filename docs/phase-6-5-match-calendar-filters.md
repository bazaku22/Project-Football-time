# Phase 6.5 — Match Center Calendar & Filters

## Scope
- Replace the long chronological fixture scroll with a compact daily calendar strip showing seven dates at a time.
- Select a day to show only fixtures on that Bangkok-local date; provide previous/next seven-day navigation, a Today shortcut, and a native date picker for jumping to any date.
- Show per-day match counts based on the currently selected category, league/competition, and search filters.
- Add category filters for All, Club, and National Team.
- Add multi-select league and competition chips for the five core leagues, all international fixtures, UEFA Nations League, and International Friendlies.
- Retain search and match-status filters, match cards, crests/flags, 1X2 and Handicap summaries, and source/freshness disclosures.
- Keep the mobile-first horizontal date strip; no full month grid.

## Data and isolation
- Date grouping uses Asia/Bangkok for fixtures with verified UTC kickoffs. International fixtures without a verified kickoff use their explicitly published local date and continue to disclose the missing time.
- All filters operate only on already-loaded club and international read models.
- No new API calls, providers, quotas, schedules, polling, costs, Local Storage keys, Supabase writes, database merges, or model changes.
- Club fixtures and international experimental fixtures remain separate data sources joined only for presentation.
- No changes to prediction probabilities, Handicap calculations, history, or source provenance.

## Validation
- Extend Match Center contract tests for date selection, Bangkok date keys, category and multi-select competition filters.
- Validate app JavaScript, Match Center tests, service-worker cache version, and GitHub Pages deployment before Android acceptance.

## Release
- App version: V6.5.0-beta.1
- Service worker cache: football-time-v52
