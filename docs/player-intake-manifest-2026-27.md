# Rights-cleared player intake manifest — 2026/27

## Purpose

The manifest is an offline staging contract for future player memberships. It is not a live data feed, importer, provider connector, or authorization to write Production. The committed JSON file is intentionally empty until a source passes review and actual current-season evidence is gathered.

## Source approval requirements

Each source must include:
- Publisher, HTTPS source URL, declared scope and season.
- Exact licence identifier and licence URL.
- Date the licence was reviewed.
- `rights_review_status: approved`.
- Explicit confirmation that commercial use, database rights and redistribution have each been reviewed and are allowed for the intended use.
- Attribution text whenever required.

A public webpage or CC0 identity dataset does not automatically grant rights to third-party roster facts. Do not mark rights approved based on assumption.

## Membership evidence requirements

Each membership must include:
- Exact source-native player ID and source ID.
- Current season 2026/27, one of the five league IDs (PL, PD, BL1, SA, FL1), and canonical club ID.
- Explicit membership type (registered squad, first-team roster or academy roster) and squad level.
- `membership_status: current_verified`, evidence URL and observed date.
- `rights_status: approved`.

A player name, nationality, old season, match appearance alone, transfer rumour or ambiguous provider team ID does not prove current squad membership. Keep unresolved facts out of this manifest.

## Validation

Run:

```bash
python3 scripts/validate_player_intake_manifest.py
python3 -m unittest tests/test_player_intake_manifest.py
```

The validator rejects missing rights approvals, non-commercial or unreviewed database rights, stale seasons, missing club/evidence identifiers, duplicate memberships, provider calls, and any Production import flag.

## Safety boundaries

- The template starts empty: zero approved sources and zero player memberships.
- The manifest remains offline and read-only. It does not fetch, scrape, call an API, or import anything.
- Provider API calls remain zero; recurring provider cost target remains 0 THB/month.
- No Production Supabase writes, migrations, updates, archives or deletes are performed.
- A future Production import is a separate change and requires explicit user approval after presenting the exact staged diff, counts, provenance, and rollback plan.
- Existing 29 canonical 2025/26 records remain historical archive data; 189 unclassified legacy records remain quarantined.
- The 25-row Research Only pilot remains unchanged and is not silently promoted.
