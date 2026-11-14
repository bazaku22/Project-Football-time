# Multi-club P54 provisional name audit — operating guide

**Status:** reusable offline tooling; no additional club exports are included or claimed.  
**Season context:** 2026/27.  
**Scope:** one club per export, repeated independently across the five-league club catalogue.

## Workflow

1. Select one club from the existing `data/player-coverage-2026-27.json` catalogue.
2. Confirm its exact Wikidata club QID from the Wikidata item page. Do not derive a QID from the club name.
3. Run `scripts/queries/wikidata_p54_candidates.sparql` for that single QID and manually export WDQS SPARQL JSON.
4. Prepare a separate reference roster JSON from a season-specific source whose use is permitted for this research. Accepted forms:
   - `["Player One", "Player Two"]`
   - `{"players":[{"name":"Player One"},{"name":"Player Two"}]}`
5. Normalize the P54 export with the existing extractor, then reconcile exact full names:

```sh
python3 scripts/wikidata_p54_jsonl_extractor.py \
  --input /path/to/club-p54.json \
  --input-format sparql-json \
  --team-qid Q12345 \
  --output /tmp/club-p54-normalized.json

python3 scripts/audit_p54_name_matches.py \
  --p54-json /path/to/club-p54.json \
  --team-qid Q12345 \
  --reference-json /path/to/club-reference-roster.json \
  --output /tmp/club-name-audit.json
```

The audit script reads the original WDQS JSON and applies the same strict one-club validation through the existing normalizer. It does not need the intermediate file; the normalization command above is optional for a separate evidence snapshot.

## Matching rules

- Exact full-name match after Unicode, diacritic, case and punctuation normalization only.
- A unique normalized name → unique QID is labelled `provisional_name_match`.
- More than one candidate QID, or duplicate normalized reference names, is labelled `ambiguous_name_match`.
- No exact normalized match is `no_match_in_export`.
- No fuzzy, substring, nickname, alias or transliteration guessing.
- Keep the original source roster and P54 export alongside the report for traceability.

## Interpretation

P54 is historical represented-team evidence, not proof of current 2026/27 registration. The name audit is a research cross-reference, not a canonical identity bridge. A provisional match must not automatically receive statistics or be imported into Production. Review current-season membership and source rights separately.

## Safety

The tools are offline. They make no network/provider calls and perform no Supabase reads, writes, migrations, deletes, deployments, canonical ID assignment, provider mapping writes, or statistics attribution. Missing candidates are not inferred from absence in the export.

## Current evidence boundary

The only supplied P54 export processed so far is Arsenal (Q9617). The reusable tool is not evidence that the remaining clubs have been queried or audited. Process and report each club separately as its export and an eligible reference roster become available.
