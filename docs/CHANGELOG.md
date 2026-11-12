# Changelog

## V6.7.2-beta.1

- Expand explicit provider-to-database club aliases for the current Asian Handicap reference feed.
- Add a live-snapshot integration contract that verifies every provider event resolves to exactly one club fixture.
- Preserve league identity, home/away order, kickoff tolerance, freshness checks, and offered-line selection.
- Bump the service worker cache to V56.
- No API provider, endpoint, schedule, workflow, request volume, quota, or cost changes.

## International Handicap pilot (experimental)

- Add a manual-only, one-request UEFA Nations League Handicap reference fetch workflow.
- Store provider references in the isolated international experiment directory; do not modify club odds or production history.
- No API request is made by PR creation, merge, CI, or scheduled jobs.

## V6.6.0-beta.1

- Simplify the team and league insights workspace with compact secondary navigation.
- Team profile, recent form, and home/away performance now open one focused panel at a time.
- Head-to-head and league statistics now open one focused panel at a time.
- Preserve the existing data calculations, source data, selectors, and local history.
- Bump the service worker cache to V53 so installed clients receive the updated UI.
