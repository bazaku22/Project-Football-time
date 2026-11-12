# Phase 3 — Rights-cleared player source pipeline (2026/27)

**Status:** offline engineering pipeline implemented; source evidence remains empty / Research Only.  
**Review date:** 2026-11-12.

## Source assessment

### Reep Register
The public release is CC0 1.0 for rights Reep holds and is useful as a player identity/provider-ID crosswalk. Its documented public relationship edges cover season, stage, team-season participation, affiliation and succession; player squad/lineup identity edges are not part of the published release contract reviewed here. Reep can help resolve identity IDs, but cannot be treated as a current player-to-club roster feed. CC0 does not waive third-party rights Reep does not hold.

Reference: https://www.reep.football/data/ — release 2026-10-25.1.

### Wikidata
Wikidata structured data is CC0-1.0. P54 (“member of sports team”) may include start/end qualifiers and references. It supports discovery and cross-checking of dated career statements, but a P54 statement alone does not prove 2026/27 league registration, first-team classification, matchday eligibility or roster completeness.

Reference: https://www.wikidata.org/wiki/Wikidata:Licensing

## Offline input contract

Run:
    python3 -m py_compile scripts/player_source_pipeline.py
    python3 -m unittest tests/test_player_source_pipeline.py -v
    python3 scripts/player_source_pipeline.py

The command reads the existing local Wikidata review JSON. An optional --reep-json accepts a normalized local interchange file with release_stamp, entities ({reep_id, entity_type}), bridges ({reep_id, provider, external_id}) and edges ({relation, source_type}). This interchange format is not a claim that the raw DuckDB schema has these exact columns; inspect and map a real snapshot separately after verifying its manifest and schema.

Both inputs must explicitly set production_import=false, network_access=false and provider_api_calls=0. The pipeline matches Wikidata QIDs only against explicit Reep Wikidata bridges, counts player entities and player squad/lineup edges, ignores team-season participation as player membership, flags QIDs mapped to multiple Reep IDs, and flags overlapping active P54 club statements. It never auto-merges by name.

## Current baseline

- Wikidata candidate rows supplied: 0.
- Reep export supplied: no.
- QID links evaluated: 0.
- Active P54 candidates evaluated: 0.
- Rights-cleared roster sources: 0/96; verified 2026/27 memberships: 0/96 (PR #120 register).
- Provider API calls/cost: 0 / 0 THB per month.
- Supabase writes, deletes and migrations: 0.

The checked-in report is an intentionally empty baseline, not evidence of coverage. The 96-club register is a club catalogue, not a populated player database.

## Next evidence gates

1. Stage a Reep release locally; verify manifest/checksums and inspect its actual schema before adapting it.
2. Supply dated Wikidata P54 exports with references; manually verify QID/team mappings and overlapping career records.
3. Classify each club's membership scope, loans/transfers, freshness and completeness.
4. Obtain source/database-rights review for non-CC0 sources; review player-photo, brand and personality/publicity rights separately.
5. Reconcile provider IDs to canonical internal player IDs without name-only auto-merges.
6. Prepare an intake manifest only after those gates. Production import requires separate explicit approval.

Engineering assessment only; not legal advice.
