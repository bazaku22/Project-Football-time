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


## Follow-up source scan — 2026-11-12

A second discovery pass checked additional roster and open-data leads. None changes the approval decision above.

| Candidate | Current evidence | Limitation / rights position | Decision |
|---|---|---|---|
| [Wikidata structured data](https://www.wikidata.org/wiki/Wikidata:Licensing) | Structured data is released under CC0. Player-to-team statements can use property P54 (member of sports team), sometimes with start/end qualifiers. | CC0 addresses Wikidata's structured-data copyright status, not factual completeness or correctness. Statements may be missing, stale, unsourced, or lack season registration / first-team scope. Club relationships must be checked per player with qualifiers, references, and observation date; coverage across all five leagues has not been measured. | **Conditional discovery and cross-check source only.** A future field-level review may approve individually evidenced records; do not claim complete squad coverage or bulk import from a bare P54 statement. |
| [FootballSquads](https://www.footballsquads.co.uk/) | Public pages advertise current and historical squad details; the site reports 2026/27 updates for all five target leagues in August 2026. | No explicit open-data licence or permission for extraction, database reuse, or redistribution was established in this review. Public visibility is not a reuse licence. | **Not approved for ingestion.** May be used as a discovery lead only if terms and permission are resolved; do not scrape or copy. |
| [API Ninjas soccer players API](https://api-ninjas.com/api/football) | Product page advertises daily-refreshed current squads and endpoints for all five target leagues. | This is a provider API, not an open-data licence. Plan limits, commercial rights, attribution, redistribution and expected credits/cost need separate review and explicit user approval before any call. | **Not called and not approved.** Keep outside the 0 THB/month baseline unless separately approved. |
| [Transfermarkt datasets](https://github.com/dcaribou/transfermarkt-datasets) | Repository documents a large historical dataset and states updates are paused; current data stops at 2026-07-06 and 2026/27 squads are not covered. | Derived from Transfermarkt; current-season coverage is absent and source rights remain unsuitable for assuming reuse. | **Not eligible for 2026/27 intake.** Do not use as a workaround or scrape upstream. |
| [OpenFootball Players](https://github.com/openfootball/players) | CC0 player identity reference, already assessed above. | Still does not provide current club membership. | **No change: identity reference only.** |

### Operational conclusion

- Wikidata is the only newly identified zero-provider-cost lead with an explicit open structured-data licence worth further field-level evaluation. Its P54 statements are not a substitute for a complete registered-squad feed.
- If Wikidata is evaluated later, use only documented structured-data statements; preserve item IDs, statement references, rank, qualifiers, retrieved timestamp and source URLs. Reject deprecated statements, missing/contradictory qualifiers, and unsupported club-season assumptions. Measure coverage club-by-club before any intake decision.
- FootballSquads may help discover that a club roster exists, but no data may be copied until its reuse terms are affirmatively cleared.
- API Ninjas requires a separate provider/cost/rights decision and an explicit authorization before any API call. No trial, key request or API call was made.
- No new player rows were added to the pilot or manifest in this pass.


## Official roster discovery pass — 2026-11-12

A further public-web discovery pass tested whether a simpler, league-by-league source mix could replace a user-prepared Wikidata export. This is a source-discovery assessment only; no page scraping, bulk copying, API calls, or Production ingestion was performed.

| League | Candidate source found | What the page establishes | Current decision |
|---|---|---|---|
| Premier League | [Official 2026/27 squad lists](https://www.premierleague.com/ar/news/4706139/see-all-the-202627-premier-league-squad-lists) and [official squad numbers](https://www.premierleague.com/en/news/4725682) | Published 25-player squad lists and U21 contract/scholar groups; a separate September 2026 article lists squad numbers for all 20 clubs. This is the clearest official roster discovery lead found. | **Research reference only.** Existing official-source rights gate still applies; no bulk extraction or import without written permission or a separately reviewed legal basis. |
| La Liga | [Official 2026/27 clubs directory](https://www.laliga.com/en-US/laliga-easports/clubs) | Confirms the 2026/27 competition club list, not a player roster. | **Club catalogue cross-check only.** Still need a rights-cleared player-membership source. |
| Bundesliga | [DFB Data Center — example: VfB Stuttgart 2026/27](https://datencenter.dfb.de/en/competitions/12/seasons/2026-2027/teams/2076) | A season-specific squad page with player names, shirt numbers, birthdays and position groups. | **Strong verification lead, not approved for bulk reuse.** Review DFB terms, database rights and permitted reuse before extraction. |
| Serie A | [Lega Serie A player statistics](https://en.legaseriea.it/serie-a/statistiche/giocatori) | The page exposes a 2026/27 player-statistics view with club and role filters and player records. It is appearance/statistics-oriented, not necessarily a complete registered squad. | **Appearance/player discovery only.** Not a complete squad feed; terms and bulk reuse rights remain unapproved. |
| Ligue 1 | [Ligue 1 official news example](https://ligue1.com/fr/articles/l1_article_6057-) | Official editorial coverage can confirm selected players and clubs, but the page found is a national-team call-up article, not a complete squad list. | **Not a roster source.** A complete official 2026/27 squad endpoint/page and reuse basis remain unverified. |

### Easier workflow considered

1. Use league/association pages to identify clubs and candidate players, but do not bulk-copy protected roster content.
2. For every candidate, retain a source URL, observation date, exact club identity, and evidence type (registered squad, first-team squad, matchday squad, or appearance). Do not conflate these categories.
3. Resolve player identity with stable source-native IDs where available; names alone are insufficient.
4. Only send candidates into the existing rights-cleared intake manifest after the specific source and data fields pass reuse review. Unapproved pages remain manual research links, not ingestion inputs.
5. Keep unresolved coverage gaps visible. In particular, the current discovery pass does not establish a uniform, reusable source for all five leagues.

### Operational conclusion

A league-by-league official-source workflow is easier to verify than manually assembling a Wikidata export, especially for the Premier League and Bundesliga. However, it does not solve the project's rights constraint or provide complete, reusable coverage across all five leagues. The safest useful next step is to seek permission or identify an explicitly licensed feed for the missing roster fields; do not bypass the existing rights gate by scraping pages or treating public visibility as permission.

No data files, player records, app code, Supabase tables, or Production state were changed in this source-discovery pass.
