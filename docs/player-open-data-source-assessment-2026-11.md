# Open player-data source eligibility assessment — 2026-11-12

## Decision summary

No source reviewed in this pass is approved as a complete, current 2026/27 squad-membership feed for all five target leagues (Premier League, La Liga, Bundesliga, Serie A and Ligue 1).

Do not expand the production player database from a source merely because it is public, downloadable, or labelled CC0. A source's licence covers only the rights the licensor can grant, and identity data is not the same thing as current club-membership evidence.

## Candidate assessment

| Candidate | Licence / access observed | What it is useful for | Critical limitation | Decision |
|---|---|---|---|---|
| [Reep Register](https://www.reep.football/data/) | Dated offline release dedicated under CC0 1.0; current public release shown as 2026-10-25.1. Offline DuckDB bundle is approximately 1.17 GB. Hosted production API is a separate paid service; preview API requires an issued key. | Stable football entity identity, canonical names, provider-ID bridges, aliases and selected public relationship edges. Could be assessed as an optional crosswalk layer. | Public relationship edges include season/stage/team-season participation and affiliation, but the public documentation explicitly says squad, lineup and coach role-identity edges are not in the release; career histories and squad memberships are private matching evidence. CC0 applies only to rights Reep holds, not third-party source rights. | **Identity/crosswalk candidate only. Not a squad-membership feed.** No API or large download authorized in this phase. |
| [OpenFootball Players](https://github.com/openfootball/players) | Repository declares CC0-1.0. | Open player identity reference with name, nationality-country grouping, position, height, date/place of birth. | The published player list is grouped by country/nationality and does not establish current club, first-team status, registration, or 2026/27 squad membership. | **Identity reference only. Not a current-club source.** |
| [OpenFootball football.json / league datasets](https://github.com/openfootball/football.json) | Public-domain / CC0 repository. | Fixtures, results and competition data for several major leagues. | Match/competition datasets do not provide a complete current-season player roster or authoritative squad membership. | **Not eligible for player roster intake.** |
| [UOC Transfermarkt-derived player dataset](https://recerca.uoc.edu/documentos/69cfd56916de95024f74cf0f) | CC BY-NC-SA 4.0; dataset description says it was collected by scraping publicly accessible Transfermarkt pages for an academic project. | Research comparison for player attributes across La Liga, Premier League and Bundesliga. | Partial three-league dataset, not a complete 2026/27 squad feed; non-commercial/share-alike conditions; the dataset's licence does not independently establish rights to all underlying source material or authorize the app's intended use. | **Do not ingest into the app or Production.** Keep as research-only literature unless a separate rights review approves a specific use. |
| Official league sites (the sources already in the 25-row pilot) | Terms reviewed and recorded in the dataset; all currently marked `written_permission_required`. | Useful discovery and source links for manual verification. | Reuse restrictions prevent treating the pages as open bulk data feeds without permission or a separately reviewed legal basis. | **Blocked for bulk intake until written permission or qualified legal approval.** |

## Required evidence for a future squad-membership source

A candidate can be approved for a specific data field only after all applicable checks pass:

1. **Licence and rights**
   - Exact licence text and version, licence URL, licensor, effective date, and any attribution/share-alike/non-commercial obligations.
   - Confirm the licensor can grant the relevant rights; review third-party content and database rights separately.
   - Record whether commercial app distribution is allowed.
2. **Membership evidence**
   - Explicit player-to-club relationship, not merely nationality or player identity.
   - Season or effective date, competition, club identity, and whether the record means registered squad, first team, matchday squad, or appearance.
   - Evidence for loan, transfer, release, youth/academy status and registration cut-off where available.
3. **Coverage and freshness**
   - All five target leagues and all clubs, with measurable coverage counts.
   - Last-updated timestamp, update cadence, correction process and historical snapshots.
   - Missing, stale, conflicting and ambiguous records must remain unresolved, not be inferred.
4. **Identity and reconciliation**
   - Preserve source-native IDs and source record URLs.
   - Resolve to the project's canonical player/team IDs only through an auditable mapping process.
   - Do not create a provider-ID mapping from a name-only match.
5. **Separation of rights**
   - Player images, club/league logos, trademarks, and personality/publicity rights need independent review.
   - A data licence does not grant image or kit-photo rights.

## Project implementation rules

- Keep the existing 25 rows as a limited Research Only pilot; do not describe them as full league coverage.
- Keep the current official-source rows blocked by the rights gate introduced in the player intake validator.
- Reep may be evaluated as an optional identity crosswalk later, but do not call its hosted API or download its 1.17 GB database without a separate explicit cost/resource approval.
- OpenFootball Players may be evaluated as a CC0 identity reference, but must never be used alone to assign a current club or season membership.
- Do not scrape Transfermarkt, SofaScore, FBref, or official league websites as a workaround for the absence of an open roster feed.
- Do not import any candidate dataset into Supabase Production until licence, field-level provenance, coverage, reconciliation and user authorization are all satisfied.
- Target recurring provider cost remains 0 THB/month.

## Source links checked

- Reep data and CC0 scope: https://www.reep.football/data/
- Reep API documentation, including the statement that career histories and squad memberships are private matching evidence: https://www.reep.football/docs/
- OpenFootball Players repository and CC0 licence: https://github.com/openfootball/players
- OpenFootball football.json: https://github.com/openfootball/football.json
- UOC dataset metadata and CC BY-NC-SA 4.0 licence: https://recerca.uoc.edu/documentos/69cfd56916de95024f74cf0f

This assessment is an engineering intake decision, not legal advice or a final legal opinion. Re-review source terms and release metadata before each new ingestion.
