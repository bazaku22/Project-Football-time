# Wikidata offline player membership review — 2026/27

## Purpose and status

This is a local review pipeline for selected Wikidata structured-data exports. It is not a live connector, scraper, roster feed, player importer, or Production authorization. The committed review file is intentionally empty until a human supplies a local export and reviews each candidate.

Wikidata states that structured data is released under CC0. This does not guarantee factual accuracy, freshness, completeness, or that a P54 statement proves current first-team registration. Preserve source references and qualifiers, and keep the result Research Only.

## P54 review rules

For each candidate preserve:
- Player Wikidata item ID and label.
- Exact P54 statement ID, rank, and team item ID.
- Start-time (P580) and end-time (P582) qualifiers.
- Every reference URL attached to the statement.
- Local retrieval date, target league, season, and reviewed canonical club mapping.

The validator only accepts a record marked `potentially_current` when it has a non-deprecated P54 statement with a start date at or before 2026-11-12, no end date or an end date after that date, and at least one HTTPS reference. This is only a screening condition: it does not prove squad registration or that the reference itself is reliable. Human review remains mandatory. Deprecated, expired, undated, unreferenced, conflicting, or ambiguous statements must not be promoted.

P54 may describe historic team membership, not a season-specific registered squad. A start date without an end date is not proof of current squad membership. Verify the actual club item and map it to the project's canonical club ID manually. Never resolve a person by name alone.

## Offline procedure

1. Obtain a small, manually selected Wikidata structured-data export outside this application, using an approved offline process. Do not use the SPARQL endpoint, EntityData API, automated scraping, or a live HTTP fetch in this workflow.
2. Place only the reviewed, relevant records in `data/wikidata-player-membership-review-2026-27.json`, retaining statement IDs, ranks, qualifiers and reference URLs.
3. Run:
   ```bash
   python3 scripts/validate_wikidata_player_membership.py
   python3 -m unittest tests/test_wikidata_player_membership.py
   ```
4. Manually compare the P54 evidence against a separately rights-cleared source for 2026/27 registration. If no reliable current-season source exists, keep the candidate unresolved.
5. Do not copy candidate records into the player intake manifest or Production. A later promotion requires separate source-rights review, exact player identity resolution, coverage report and explicit user approval.

## Safety boundaries

- The initial candidate file is empty; no player identities or club memberships are fabricated.
- `network_access=false`, `provider_api_calls=0`, and `production_import=false`.
- No provider API, SPARQL query, dump download, scrape, database write, migration, archive or delete occurs.
- No images, logos, statistics or provider IDs are added.
- Target recurring provider cost remains 0 THB/month.
- The existing 25-row Research Only pilot and all Production records remain unchanged.

## References

- [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
- [Wikidata data access and offline dumps](https://www.wikidata.org/wiki/Wikidata:Data_access/en)
- [Wikidata statements: qualifiers, references and ranks](https://www.wikidata.org/wiki/Help:Statements)
- [P54 property constraints and examples](https://www.wikidata.org/wiki/Property_talk:P54)
- [Wikidata sports project: P54 and qualifiers](https://www.wikidata.org/wiki/Wikidata:WikiProject_Supertemplates/doc/P54)

Engineering screening only; not legal advice. CC0 status does not remove the need to check source reliability, third-party rights, and the separate rights applicable to images, marks and personal likenesses.
