# Phase 3 — Wikidata local JSONL P54 extractor (2026/27)

**Status:** extractor implemented; no actual dump is bundled or claimed to have been processed.  
**Review date:** 2026-11-12.

## Purpose

Convert an already staged Wikidata JSONL dump (one entity JSON object per line) into an intermediate, Research Only evidence file. The extractor streams the input line-by-line, filters entities whose P106 includes Q937857 (association football player), and preserves P54 team QIDs, statement IDs, rank, P580/P582 dates and HTTPS P854 reference URLs.

## Run locally

```sh
python3 -m py_compile scripts/wikidata_p54_jsonl_extractor.py
python3 -m unittest tests/test_wikidata_p54_jsonl_extractor.py -v
python3 scripts/wikidata_p54_jsonl_extractor.py \
  --input /path/to/wikidata-entities.jsonl \
  --dump-date YYYY-MM-DD \
  --output /tmp/wikidata-p54-extract-2026-27.json
```

The input must already exist locally. The script does not download dumps, call Wikidata APIs, install packages, or use network access.

## Deliberate boundaries

- This output is an intermediate evidence extract, not the existing validated intake manifest.
- Team QIDs are deliberately not mapped to canonical club IDs or leagues. A separately reviewed mapping table is required; name-only matching is prohibited.
- P106 Q937857 is a discovery filter, not proof of completeness.
- P54 is not proof of current-season league registration, first-team status, matchday eligibility or full squad coverage.
- Missing dates or references remain visible for review but do not become current-membership evidence.
- No Production import, Supabase write/delete/migration, provider API call or charge is possible through this tool.

## Next step

After a local export is staged, review the extracted team QIDs against a source-backed club-QID mapping for the five leagues, then run the existing P54 validator only after human review has added the required canonical club, season and evidence fields. Keep all rows Research Only until rights and membership semantics are independently approved.
