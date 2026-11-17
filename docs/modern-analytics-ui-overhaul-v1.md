# Football Time — Modern Analytics UI Overhaul

## Release candidate
- App version: V6.27.0-beta.1
- Service worker cache: football-time-v122
- Base commit: d34ba11bb06959dbe7e2b7fa56ad8035deccc214
- Working branch: feature/modern-analytics-ui-overhaul

## Scope delivered in this change set
- Add a global Modern Analytics visual layer for navigation, cards, forms, tables, match cards, player database, tools, dialogs and small-screen layouts.
- Preserve existing DOM IDs, data attributes and application scripts so current features retain their existing integration points.
- Keep the four existing primary routes and existing secondary destinations.
- Move experimental model summary and legacy archive destinations into a collapsed section in Tools. No records or feature modules are deleted.
- Version the app and service worker cache together.

## Data safety correction
The existing startup loader previously removed two international handicap history keys and filtered the stored match array, then wrote the filtered array back to pft_matches_v1. The loader now:
- Does not remove either legacy handicap history key.
- Returns the full stored match array without filtering it.
- Does not overwrite existing records during startup.
- Leaves unexpected stored values untouched and reports a warning.
- Creates starter records only when the storage key does not exist.

This is a preservation-oriented change. It does not inspect or modify the actual Local Storage on the user's phone.

## Validation
The GitHub Actions workflow runs JavaScript syntax checks, the existing regression suites and new data-preservation tests. Android visual interaction testing remains a required user test on the deployed preview.

## Merge policy
This branch is for review and testing. Do not merge to main without the user's explicit approval.
