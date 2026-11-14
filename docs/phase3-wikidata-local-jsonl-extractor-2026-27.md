# Phase 3 — Wikidata P54 offline evidence extractor (2026/27)

**Status:** supports local JSONL dumps and one-club Wikidata Query Service (WDQS) SPARQL JSON exports. No live player export is bundled or claimed to have been processed.  
**Review date:** 2026-11-14.

## Purpose

Convert either an already staged Wikidata JSONL dump or a manually exported, narrowly scoped WDQS SPARQL JSON result into an intermediate Research Only evidence file. The extractor is offline: it does not make network requests, call football providers, or write to Supabase.

## Option A — one-club WDQS export (preferred for the pilot)

1. Confirm the club's exact Wikidata QID from its Wikidata item page. Example checked: Arsenal F.C. is Q9617.
2. Open `scripts/queries/wikidata_p54_candidates.sparql` and replace the example QID with the confirmed target club QID.
3. Run the query once in the official Wikidata Query Service UI and export SPARQL JSON.
4. Run the local normalizer:

```sh
python3 -m py_compile scripts/wikidata_p54_jsonl_extractor.py
python3 -m unittest tests/test_wikidata_p54_jsonl_extractor.py -v
python3 scripts/wikidata_p54_jsonl_extractor.py \
  --input /path/to/wikidata-export.json \
  --input-format sparql-json \
  --team-qid Q9617 \
  --output /tmp/wikidata-p54-Q9617-review.json
```

The parser verifies player/occupation/team/statement QIDs, rejects rows for a different club, groups repeated reference rows by exact statement GUID, and preserves rank, dates, source URLs, source item QIDs and retrieval dates. Missing references remain missing; they are not inferred.

## Option B — local JSONL dump

```sh
python3 scripts/wikidata_p54_jsonl_extractor.py \
  --input /path/to/wikidata-entities.jsonl \
  --input-format jsonl \
  --dump-date YYYY-MM-DD \
  --output /tmp/wikidata-p54-extract-2026-27.json
```

The input must already exist locally. The script does not download dumps or install packages.

## Deliberate boundaries

- Output is an intermediate evidence extract, not the validated intake manifest.
- The SPARQL query's Q937857 occupation filter is a discovery filter, not proof of completeness; players missing that occupation statement may be omitted.
- Team QIDs are not mapped to canonical club IDs or leagues. A separately reviewed mapping table is required; name-only matching is prohibited.
- P54 means a person represents or represented a team. It does not prove 2026/27 league registration, first-team status, matchday eligibility or complete squad coverage.
- Missing dates/references remain unresolved. A referenced statement is still only a candidate.
- Wikidata's CC0 structured-data status does not relicense third-party pages linked in statement references.
- No Production import, Supabase read/write/delete/migration, provider API call or charge is possible through this tool.

## Next step

For one club only, inspect every extracted P54 statement and its references against independent season-specific evidence. Record registered senior squad, youth, matchday/appearance, historic and unknown as separate classifications. Compare coverage against a separately rights-cleared source. Expand to another club only after the first-club review demonstrates useful, reliable evidence; do not infer missing players from absence in Wikidata.
