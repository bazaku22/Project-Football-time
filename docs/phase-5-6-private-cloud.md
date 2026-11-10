# Phase 5.6 — Private Player Cloud Foundation

## Scope and data separation

- Historical test records #001–#011 remain in their existing test-record storage and central JSON file. They are not imported into the player database.
- Existing match-test Local Storage key `pft_matches_v1` is unchanged.
- Existing probability snapshot key `pft_probability_predictions_v1` is unchanged.
- Existing device-local player import/export key `pft_players_v1` remains available.
- Private cloud player records live in the Supabase project `football-time-private`; no player records are committed to GitHub Pages.

## Supabase project

- Project ref: `igbprkdqtsxvlcgcrqkn`
- Region: Singapore (`ap-southeast-1`)
- Tables: `public.player_records`, `public.player_sync_runs`
- Both tables have RLS enabled. Authenticated SELECT policies restrict rows to `auth.uid() = user_id`. Anonymous access and client-side writes are revoked.
- Edge Function: `player-data` (JWT required). It validates the user session and returns only rows belonging to that user.
- Client uses the publishable key only. No secret/service-role key is shipped to the browser.

## Website authentication setup

Before using email magic links, configure the Supabase Dashboard:

1. Authentication → URL Configuration:
   - Site URL: `https://bazaku22.github.io/Project-Football-time/`
   - Add the same URL to Redirect URLs.
2. Data API settings: ensure `public.player_records` and `public.player_sync_runs` are exposed to the Data API. Keep the grants and RLS policies in this project; do not grant access to `anon`.
3. Authentication → Providers → Email: enable email sign-in. The website sends a magic link to the email address entered by the user.

## Current limitations / next work

- The private tables are intentionally empty at this stage.
- No player source API key has been configured in this project yet.
- No scheduled sync has been created yet. The next implementation step is the private server-side sync function and daily schedule, after the API Ninjas credential is added as a server-side secret.
- API keys and secret keys must never be placed in `index.html`, `js/player-cloud.js`, GitHub Pages assets, or local storage.
- The OpenPlay historical pilot remains subject to upstream rights review and is not copied into production.
- Failed syncs must preserve the last successful dataset; sync history must record the outcome and timestamp.

## Verification

- Database table definitions and RLS were inspected after migration.
- Supabase Security Advisor returned no findings after owner-scoped SELECT policies were added.
- Edge Function `player-data` is deployed and ACTIVE with JWT verification enabled.
- User-facing login and live data retrieval still require the website configuration steps above and a successful sign-in test.
