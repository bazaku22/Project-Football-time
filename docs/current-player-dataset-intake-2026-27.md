# Current Player Dataset Intake — 2026/27

## Goal

Build a clean, reviewable player dataset for the **2026/27 season only**. The current-season directory must not mix in prior-season memberships or unclassified legacy rows.

This document defines the intake and review contract. It does not claim that a 2026/27 dataset has already been populated.

## Safety boundary

- Preparation and validation may happen in a feature branch using offline, rights-reviewed source material.
- No provider API calls, API credits, Production Supabase writes, migrations, or deletes are authorized by this intake plan.
- Do not delete the existing 2025/26 canonical records or the 189 legacy `player_records` rows as part of this work.
- Prior-season canonical records are historical archive data; they are not current-season player memberships.
- Legacy rows remain quarantined until provider-specific team IDs and player identities are mapped with evidence.
- Do not import the five Research Only Manchester United pilot records into Production.

## Season and membership rules

- Target season: `2026/27`.
- A player appears in the current directory only when a source confirms membership with the relevant club for 2026/27.
- Do not infer current membership from a previous season, an old photograph, a transfer rumour, or a provider team ID that has not been mapped.
- Distinguish first-team, U21/reserve, and academy membership. Do not label every squad record `first_team` by default.
- A player may have multiple season memberships over time; preserve identity separately from season membership.
- Missing or conflicting position evidence remains explicitly unknown/pending review; never invent a position.

## Source and identity policy

- Use StrikerAPI as a foundational identity/master-data source where available (provider player ID, name, and current squad membership), subject to a documented permission and cost review.
- Do not treat any one provider as the sole source for every statistic. Link independently permitted statistical sources to a canonical internal player ID.
- Preserve provider name, provider player ID, source URL/reference, retrieval date, season, competition, team, metric definition, and rights status for every imported fact.
- Reconcile identities only on strong evidence. Ambiguous name-only matches stay in a review queue.
- Never scrape AiScore, LiveScore, or any source without permission.
- No API call is made until the user separately approves the provider, expected cost/credits, and scope.

## Initial official-source inventory

These are discovery references for checking current-season membership and player facts, not blanket permission to copy or republish their data. Terms, database rights, attribution, and intended use must be reviewed before ingestion.

| Competition | Current-season source discovered | Intended use / limitation |
|---|---|---|
| Premier League | [2026/27 squad lists](https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists), [2026/27 squad numbers](https://www.premierleague.com/en/news/4725682/all-20-premier-league-clubs-squad-numbers-for-202627-season), [player directory](https://www.premierleague.com/en/players) | Official first-team and U21 squad evidence; distinguish the 25-player submitted list from eligible U21s |
| La Liga | [Official club squad pages](https://www.laliga.com/clubes/fc-barcelona/plantilla), [2026/27 player profile example](https://www.laliga.com/en-GB/player/jude-bellingham) | Club squad membership, position and player profile facts; verify each club's page and season |
| Bundesliga | [Official Bundesliga player directory](https://www.bundesliga.com/en/bundesliga/player/) | Current club grouping, position and shirt-number evidence; confirm each player record and season |
| Serie A | [Official 2026/27 player statistics](https://www.legaseriea.it/serie-a/statistiche/giocatori), [English player statistics](https://en.legaseriea.it/serie-a/statistiche/giocatori) | Current-season appearances and player list; statistics are competition-scoped and should not be mistaken for full squad membership |
| Ligue 1 | [Official Ligue 1 Data Zone](https://ligue1.com/en/data-zone/ligue1mcdonalds) | Current-season club and statistical discovery; obtain squad membership from official club evidence where the data zone does not establish full roster membership |

A discovered page may be incomplete, dynamically rendered, or scoped to registered first-team players only. Record the exact page, observed date, scope, and any uncertainty for each player. Do not use third-party aggregators as the sole identity or membership authority.

## Required player intake fields

| Field | Requirement |
|---|---|
| `canonical_player_id` | Stable internal ID; never reuse for another person |
| `full_name` | Source-backed name |
| `display_name` | Optional UI label |
| `date_of_birth` | Optional; retain source and rights status |
| `nationality` | Optional; retain source |
| `position` | Controlled taxonomy; nullable until verified |
| `club_id` | Canonical club ID, not a provider-specific ID |
| `season` | Must equal `2026/27` for this intake |
| `squad_level` | `first_team`, `u21`, `u18`, `reserve`, or `unknown` |
| `membership_evidence` | Source reference and observed date |
| `provider_ids` | Provider + exact provider player ID |
| `statistics` | Separate source-linked records with competition, season, metric definition, and sample scope |
| `rights_status` | Explicit approval/review state per source record |

## Photo policy

1. Prefer a photograph that verifiably shows the player in their **current club kit**.
2. Use it only when the file's copyright license, attribution requirements, source page, and applicable usage restrictions have been reviewed.
3. Record image URL, source page, author/photographer, license, license URL, capture date, and review status.
4. A copyright license does not by itself clear personality/publicity rights. Keep that review separate.
5. If no suitable, permitted current-kit photograph is available, use the existing initials/club-colour avatar fallback. Do not substitute an unlicensed official club image or mislabel a national-team/old-club photo as current.
6. Do not copy image binaries into the repository unless license compatibility and attribution obligations are reviewed.

## Import and release gates

A player membership is eligible for a future import only after all checks pass:

- season is exactly `2026/27`;
- canonical club mapping is verified;
- provider identity is exact and unique, or manually reviewed;
- squad level and position have source evidence or are explicitly unknown;
- source rights status permits the intended use;
- duplicate checks pass;
- statistics retain their source, competition, season, metric definition, and sample size;
- the complete import can be validated offline before any Production write.

Production import, update, archive, and deletion are separate operations and require separate explicit approval. A future import must be staged and checked before any cleanup of old records is considered.

## Initial audit baseline (2026-11-12)

- Canonical player identities: 29.
- Canonical memberships: 29, all Arsenal 2025/26.
- Canonical current-stat rows: 29.
- Legacy `player_records`: 189 across six provider-specific team IDs; club mapping unresolved.
- Canonical 2026/27 memberships observed: 0.

These observations mean the current-season dataset is **not populated yet**. The old canonical records are archive candidates, not junk; the legacy rows are unclassified and quarantined. Do not claim the current player directory is complete until a verified 2026/27 import has passed the gates above.

## Next implementation steps

1. Build an offline 2026/27 intake manifest and validation tests.
2. Gather club membership evidence from permitted, no-cost sources where available; do not make API calls.
3. Resolve team/player identities and squad levels, marking uncertainty rather than guessing.
4. Review club-kit photo availability and rights; fall back to club-colour avatars where needed.
5. Present the validated import manifest for approval before any Production write.


## Source-rights review — 2026-11-12

This is a product intake risk-control review, not legal advice or a final legal opinion. It records the published website terms observed on 2026-11-12. It does not determine whether individual names or isolated facts are independently protected in every jurisdiction.

| League/source | Terms reviewed | Observed restriction relevant to reuse | Intake decision |
|---|---|---|---|
| Premier League | [Official Terms of Use](https://www.premierleague.com/es/terms-and-conditions) | Reserves copyright and database rights; prohibits reuse/reproduction/redistribution, expressly including creating a database from website material, without prior written approval. | Written permission required before copying records into a distributed player database. |
| La Liga | [LALIGA Legal Notice](https://www.laliga.com/en-GB/legal/legal-web) | Restricts reproduction, distribution, commercialization and other exploitation of website content without authorization. Whether a limited set of independently verified factual fields is outside that restriction needs qualified review. | Do not treat the official directory/profile as an open data licence; permission or legal review required. |
| Bundesliga | [Official Legal Notice](https://www.bundesliga.com/en/bundesliga/info/legal-notices) | Reserves IP rights; says reproduction, storage and repetition in databases/electronic systems require prior written consent where not otherwise permitted by law. It also restricts automated access, analysis and downloads. | Do not scrape or bulk-copy; written permission or independently verified lawful basis required. |
| Serie A | [Official Terms and Conditions](https://en.legaseriea.it/terms-and-conditions) | States content including data compilations is protected and extraction/use in whole or part requires express written consent. | Written permission required; no data mining or extraction. |
| Ligue 1 / LFP | [Official Terms of Use](https://ligue1.com/en/legal/cgu) | Restricts reproduction, modification, transmission, redistribution, sale, commercial exploitation and reuse without prior written consent. | Written permission required before reusing site content. |

### Operational decision

- All seven official-source entries currently in the 2026/27 pilot are marked `reuse_status: written_permission_required`; the underlying player rows remain `rights_status: pending_review`.
- These sources may remain linked as research references in this isolated Research Only pilot, but they are **not approved data feeds** and must not be used to bulk-expand or republish the database.
- The validator now fails if one of these source records is marked reusable without changing the documented permission gate. A future open-data source must be reviewed separately and carry its exact licence, attribution obligations, scope, version/date and source URL before its status can be changed.
- Player photographs, club crests, league marks and player personality/publicity rights remain separate review items; a data-source permission does not grant image or trademark rights.
- No provider API calls, scraping, Production writes, migrations, imports or deletions were performed for this review.

### Next permitted data-discovery route

Prioritize independently licensed/open datasets (for example, a source with an explicit CC0 or compatible database licence) and verify its coverage, update cadence, season membership and attribution requirements before adding records. Wikidata may be investigated as a discovery lead, but its current-club membership statements must be checked for freshness and provenance; it is not assumed to provide complete or current squad coverage. Do not substitute another aggregator whose terms prohibit reuse.


## Updated roster intake scope and source decision — 2026-11-14

The project owner confirmed that the app is non-commercial and approved FootballSquads for manual roster transcription under its published non-commercial terms, with the required attribution. See the source assessment for the terms URL, exact attribution and limitations.

### Membership scope

- Season: 2026/27.
- Target: every club in the five major leagues (96 clubs in total: PL 20, La Liga 20, Bundesliga 18, Serie A 20, Ligue 1 18).
- Include every player name in the current club squad roster, regardless of age; do not split U21, U18, reserve or youth labels into separate user-facing categories.
- Exclude every entry in the source page's “Players no longer at this club” section and any player with clear source evidence of having left the club.
- Preserve source URL and observation date per club. Do not silently infer an identity, position, provider ID, eligibility, or statistic from a name-only match.
- Roster membership is not proof of league registration, match eligibility, or appearance. Statistics remain empty/unavailable until independently supported by verified match and competition evidence.

### Collection and release rules

- Manual transcription only. Do not scrape, crawl, automate extraction, call a provider API, or use credits.
- Display the publisher-required attribution in the app and keep it in the dataset documentation.
- One release only after all 96 club pages are reviewed and validated; no league-by-league partial release.
- Keep `production_import: false`. This repository/UI release does not authorize Production Supabase writes, migrations, or data imports.
- Do not reuse the old 25 research-only rows or the 29 Arsenal 2025/26 canonical records as current 2026/27 roster data without fresh source verification.
- Preserve all existing local app data and the Match Event Ledger; do not clear user cache/data.

## FootballSquads source-index verification — 2026-11-14

The current-season index pages were opened and checked as the manual collection entry points. They list the following club counts:

| League | Source index | Listed clubs | Target |
|---|---|---:|---:|
| Premier League | https://www.footballsquads.co.uk/eng/2026-2027/engprem.htm | 20 | 20 |
| La Liga | https://www.footballsquads.co.uk/spain/2026-2027/spalali.htm | 20 | 20 |
| Bundesliga | https://www.footballsquads.co.uk/ger/2026-2027/gerbun.htm | 18 | 18 |
| Serie A | https://www.footballsquads.co.uk/italy/2026-2027/seriea.htm | 20 | 20 |
| Ligue 1 | https://www.footballsquads.co.uk/france/2026-2027/fralig1.htm | 18 | 18 |
| **Total** | | **96** | **96** |

This verifies the index-level club count only. It does **not** mean that any of the 96 individual roster pages has passed player-by-player transcription or departure-section review. Individual pages must still be opened and checked; the current roster table ends before the explicit “Players no longer at this club” section. Empty shirt-number rows are not player records.

### First individual-page review observations

- Arsenal and Aston Villa 2026/27 pages were opened. Both show a current roster table followed by a separate “Players no longer at this club” section.
- The pages contain many academy-age entries, consistent with the approved scope to include every named player in the current roster regardless of age.
- Some displayed player/club combinations appear unusual. Preserve the page as the cited source, but flag any conflict for independent review rather than silently correcting or inferring.
- The FootballSquads site itself disclaims accuracy and completeness. Every club record therefore retains its exact page URL and observation date, and no claim of registration, eligibility or appearance may be inferred from roster presence.

### Current collection gate

- Index-level club coverage: 96/96 listed.
- Individual roster pages fully transcribed and checked: **not yet complete**.
- Verified player memberships added to the production app: **0**.
- Provider API calls: 0.
- Production Supabase writes/migrations: 0.

Required attribution for the eventual non-commercial app and documentation:

> Source of Material is http://www.footballsquads.com. Material: © FootballSquads.com, 1999 - , All Rights Reserved

Terms reference: https://footballsquads.co.uk/tou.htm (non-commercial use permitted with source credit; commercial use requires express permission). Re-check the terms before release and whenever the app's distribution or monetization model changes.

## Independent Premier League cross-check — 2026-11-14

A current official Premier League squad reference was located during review:

- [2026/27 submitted squad lists](https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists), published 2026-09-03. The page describes the submitted first-team squad lists and separately identifies eligible U21 players.
- [All 20 clubs' 2026/27 squad numbers](https://www.premierleague.com/en/news/4725682/all-20-premier-league-clubs-squad-numbers-for-202627-season), published 2026-09-22. The page includes first-team squad numbers and academy players who have appeared or may appear in first-team squads.

These pages independently corroborate several player/club combinations that initially looked unusual on the FootballSquads Arsenal and Aston Villa pages. Such entries must not be rejected based on intuition alone; record a conflict only when the source evidence actually disagrees.

This official Premier League material is a **cross-check reference only** for this intake. It does not replace the approved FootballSquads manual-transcription source, and it is not an authorization to copy or republish Premier League content. Continue to use the approved FootballSquads terms and required attribution for roster transcription. The official squad-list scope is also not identical to the project's agreed scope: the project includes every named player in the current FootballSquads club roster regardless of age and excludes its separate departed-player section.

No roster records were added or changed by this cross-check. Individual club-page transcription remains incomplete; the 96/96 index count must not be described as 96/96 completed rosters.

## Premier League club-page boundary audit — 2026-11-14

All 20 individual Premier League club pages linked from the 2026/27 FootballSquads index have now been opened in this review (Arsenal, Aston Villa, Bournemouth, Brentford, Brighton & Hove Albion, Chelsea, Coventry City, Crystal Palace, Everton, Fulham, Hull City, Ipswich Town, Leeds United, Liverpool, Manchester City, Manchester United, Newcastle United, Nottingham Forest, Sunderland and Tottenham Hotspur).

For the 18 pages newly opened in this pass, the explicit "Players no longer at this club" boundary was located and checked. The section is separate from the current roster table; examples include Bournemouth (page line 70), Brentford (line 82), Brighton (line 91), Chelsea (line 83), Crystal Palace (line 98), Liverpool (line 90), Manchester City (line 85), Manchester United (line 107), Newcastle United (line 87), and Tottenham Hotspur (line 80). Rows below that heading are not current-roster memberships and must be excluded.

This is a page-opening and section-boundary audit, **not** a completed player-by-player transcription. Empty shirt-number rows are still excluded. No roster dataset rows were added or changed in this pass. Individual roster transcription and conflict review remain outstanding for all 20 Premier League clubs; do not count these pages as completed roster records.

## Manual roster transcription progress — 2026-11-14

The current-season FootballSquads directory was reopened and its four remaining league indexes were checked directly:

- La Liga: 20 club links (index: https://www.footballsquads.co.uk/spain/2026-2027/spalali.htm).
- Bundesliga: 18 club links (index: https://www.footballsquads.co.uk/ger/2026-2027/gerbun.htm).
- Serie A: 20 club links (index: https://www.footballsquads.co.uk/italy/2026-2027/seriea.htm).
- Ligue 1: 18 club links (index: https://www.footballsquads.co.uk/france/2026-2027/fralig1.htm).

These confirm the 96-club target count at index level when combined with the Premier League's 20 clubs. They do not constitute roster transcription.

### Player rows manually transcribed

The separate file `data/footballsquads-roster-intake-2026-27.json` now contains source-listed name observations for four La Liga club pages:

| Club | Source current-roster boundary | Names transcribed |
|---|---|---:|
| Barcelona | Lines 18–58; departed section begins at line 59 | 37 |
| Atlético Madrid | Lines 16–72; departed section begins at line 73 | 47 |
| Celta Vigo | Lines 16–55; departed section begins at line 56 | 34 |
| Málaga | Lines 18–57; departed section begins at line 58 | 30 |
| **Total** | **4/96 club pages** | **148** |

The manual intake retains each club's source URL, observation date, roster/departed-section boundary and provider display-name lookup reference. All memberships remain `source_listed_pending_independent_crosscheck` and `name_only_unverified`; they have no provider player IDs, statistics or photographs. The provider team IDs are explicitly marked as display-name lookup keys, **not canonical team IDs**.

The Atlético Madrid, Celta Vigo and Málaga pages include entries whose club association or status warrants additional checking. They have been preserved as source observations rather than silently corrected or promoted to verified membership. The Real Madrid page was opened but not transcribed because the source page contains material requiring further review; it is not counted in the four completed transcriptions.

### Current completion gate

- League index club count confirmed: 96/96.
- Individual club pages manually transcribed: **4/96**.
- Source-listed player-name observations: **148**.
- Independent membership cross-check complete: **0/96**.
- App integration: **not started**.
- Production imports/writes: **0**.
- Provider API calls: **0**.

The roster intake validator is at `scripts/validate_footballsquads_roster_intake.py`. This partial research file is not wired into the app and cannot be marked complete or released. The release gate remains all 96 manually reviewed club pages, cross-check and canonical team mapping, plus passing validation and CI.

### Intake safeguards added

- `scripts/validate_footballsquads_roster_intake.py` validates source provenance, manual-only collection, observation/boundary metadata, required attribution, duplicate memberships, and the no-provider-ID/no-statistics/no-photo gates.
- `tests/test_footballsquads_roster_intake_validator.py` adds six regression tests, including rejection of premature complete status, Production import, automated extraction, invented provider IDs/statistics, and duplicate memberships.
- A structural check against the current JSON passed: 4 distinct source clubs, 148 memberships, unique membership IDs/keys, all rows still pending cross-check, and no provider IDs/statistics/photos. The Python test suite and repository CI have **not** yet been run; no PR has been opened because the 96-club completion gate is not met.
