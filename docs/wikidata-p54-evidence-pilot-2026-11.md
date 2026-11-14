# Wikidata P54 evidence pilot — offline review pipeline

## Purpose

Build a research-only queue from a narrowly scoped Wikidata Query Service export. The pipeline does not query Wikidata itself, does not use football-provider APIs, and does not write to Supabase. It is a first-stage evidence collector, not a squad importer.

Wikidata describes P54 as the team a person "represents or represented"; it is therefore historical by design and cannot establish current registration, first-team status, or roster completeness on its own. See [P54 property documentation](https://www.wikidata.org/wiki/Property:P54) and [Wikidata Sports project guidance](https://www.wikidata.org/wiki/Wikidata:WikiProject_Sports).

## Why the query is deliberately narrow

Wikidata Query Service guidance recommends scoped queries when the desired set is well-defined and warns against using SPARQL regex as fuzzy text search. The public service also has query/time and concurrency limits. Run one club QID at a time; do not run a broad all-five-league scrape or schedule repeated queries. See [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access/en) and [WDQS usage constraints](https://www.mediawiki.org/wiki/Wikidata_Query_Service/Implementation).

## Manual retrieval

1. Confirm the exact Wikidata club item (QID) from the club's Wikidata page. Do not guess a QID from a club name.
2. Open `scripts/queries/wikidata_p54_candidates.sparql` and replace the example `Q9617` with the confirmed club QID.
3. Run it once in the official Wikidata Query Service UI and export **SPARQL JSON**. Preserve all returned rows; multiple rows for one statement may represent multiple references.
4. Save the export outside the application bundle. Do not paste or scrape protected roster pages to fill gaps.
5. Run the offline normalizer:

```bash
python scripts/wikidata_p54_candidate_review.py \
  --input /path/to/wikidata-export.json \
  --team-qid Q9617 \
  --output data/staging/wikidata-p54-Q9617-review.json
```

The normalizer verifies QID and statement URI shapes, enforces the selected club, groups references by exact statement GUID, preserves rank/date/reference provenance, and assigns review statuses. It never joins to FootballSquads names, fuzzy matches players, assigns canonical IDs, or writes to Production.

## Review status meanings

| Status | Meaning |
|---|---|
| `referenced_candidate_needs_human_review` | Normal/preferred P54 statement, has at least one reference and both season qualifiers; still not proof of registration or squad level. |
| `date_scope_partial` | One date qualifier missing; cannot assert active membership. |
| `date_scope_unknown` | Both date qualifiers missing; historical/current scope unknown. |
| `outside_target_season` | Start is after 2026/27 or end is before 2026/27. |
| `missing_source_reference` | P54 statement has no source reference. |
| `deprecated_statement` | Deprecated rank; never accepted as positive evidence. |
| `invalid_date_qualifier` | Date qualifier is not parseable. |

All output rows remain `review_required=true`. No status in this file means "verified player" or "eligible for Production".

## Rights and evidence boundary

Wikidata structured data is published under CC0, but that does not make a linked third-party source page CC0 or grant rights to republish its contents. The export preserves source URLs and source-item QIDs as evidence pointers only. Assess the referenced source's rights separately before using its facts in Football Time.

## Safety guarantees

- Offline input only; no network client exists in the script.
- `provider_api_calls=0`, `provider_monthly_cost_thb=0`.
- `supabase_reads=0`, `supabase_writes=0`, `supabase_migrations=0`.
- `production_import=false`, `canonical_player_ids_assigned=0`, `automatic_merges=0`.
- Missing dates/references stay unresolved; deprecated statements are rejected.
- No name-only matching and no synthetic player statistics.
- The app bundle, Player Profile UI, Match Center, Match Event Ledger, and existing Production rows are untouched.

## Acceptance gate after one-club pilot

Before expanding to another club, manually inspect every output row against its linked source evidence, classify registered senior squad / youth / matchday / historic / unknown separately, and measure candidate coverage against an independently licensed roster source. Do not infer missing players from absence in Wikidata. The pilot may be abandoned if the candidate evidence is sparse or stale; that is a valid result.
