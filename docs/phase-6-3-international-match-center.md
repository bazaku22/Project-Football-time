# Phase 6.3 — International Match Center (experimental presentation)

## Scope
- Combine the existing five-core-league club fixture read model with a separate, static Round 1 international fixture read model in Match Center.
- Show club crests for club matches and local Unicode country flags for national teams. England and Wales use subdivision flag sequences with accessible country labels and visible code fallback.
- Sort the combined list by kickoff in Bangkok time. A fixture with an unpublished kickoff remains visible with an explicit “time not announced” label and is placed after timed fixtures on its announced date.
- Add an International Teams filter while preserving the existing club league filters.
- National-team details expand inline and show competition, venue classification, kickoff disclosure, and the source links recorded for that fixture.

## Data and isolation
- Read-only file: `data/international-match-fixtures-r1.json` (15 fixtures; 14 with verified kickoff time; Argentina–Uruguay has no published kickoff time in the reviewed source).
- The file is a presentation read model copied from the Round 1 research manifest; it is not merged into `data/football-database.json`.
- The international dataset is fetched by the Match Center module and cached as a static asset by service worker V50.
- The club database schema, sync workflow, API providers, quotas, schedules, polling, Local Storage, Supabase, and club model/history are unchanged.
- International probabilities and handicap outputs are intentionally hidden. International match details are experimental and read-only.
- Source URLs and factual fixture details are retained for provenance; no separate data-reuse licence or contractual permission is certified. Review applicable source terms before wider redistribution or commercial reuse.
- No third-party flag images are hotlinked; no scraping or automated extraction is introduced.

## Validation
- `tests/test_international_match_center.py` checks fixture integrity, source links, team country codes, isolation, unknown kickoff handling, no international model output, app version, and service-worker cache.
- Existing Match Center tests and app validation workflow continue to run.

## Release note
- App version: V6.3.0-beta.1
- Service worker cache: football-time-v50
