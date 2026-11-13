# Phase 4 — FT Player Identity & Rights Feasibility Audit (2026-11-13)

**Status:** Read-only feasibility assessment; design recommendation only.  
**Scope:** Football Time-owned canonical player identity for the five 2026/27 leagues (PL, PD, BL1, SA, FL1).  
**Boundary:** No application code, schema, staging data, Supabase Production, provider calls/credits, bulk extraction, merge or deployment changes.

## 1. Executive decision

**Technically feasible: yes. Rights-cleared end-to-end player database: not yet.**

Football Time can generate and own its own immutable canonical player identifiers without depending on StrikerAPI or another provider's player ID. A provider ID is an optional source cross-reference, not the identity key.

However, creating an internal ID does not grant permission to copy player names, squad lists, match reports, event data, statistics, images or third-party database contents. Rights must be assessed separately for every source and field. A public page, manually typed record, derived total, or private/non-revenue use does not automatically bypass contractual terms or database rights.

The correct decision is therefore:
- Adopt an internal FT identity namespace as the target architecture.
- Keep all external/provider IDs optional and source-scoped.
- Assign a canonical ID only after a human has established that two observations refer to the same real player using adequate evidence.
- Do not bulk-populate the 96 clubs until a lawful source path and roster coverage are established.

## 2. Existing project evidence and limitations

The current staging intake implementation already separates provider identity from Football Time identity:
- `provider` + `provider_player_id` form a source identity key (for example, `strikerapi:12345`).
- `canonical_player_id` is currently null in staging output; the intake script does not assign canonical IDs.
- Provider team IDs and Football Time team IDs are separate; exact team mapping requires review.
- Repeated provider IDs across league payloads are preserved as membership observations and flagged; conflicting names/team IDs require manual review.
- Squad level remains unknown unless independently evidenced.
- Missing fields remain null; rights status remains `manual_review`.

The earlier 2026/27 match-report audits found:
- Five representative match reports can technically evidence appearances, goals and assists, with differing quality.
- No tested report exposed a stable player provider ID.
- Shirt number changes and can be reused; names can collide or vary through transliteration/diacritics.
- The 50-match discovery sample found a match-specific report/event record for 32/50 fixtures (64% discovery only), not full event completeness.
- Current player-roster coverage is not complete: 96 clubs are catalogued, but no rights-cleared roster source or verified 2026/27 membership set has been established for all 96.

This means an internal ID solves the canonical-key dependency, but not the initial identity-proof or roster-source problem.

## 3. Recommended FT identity design

### 3.1 Identifier format

Use two levels:
- **Database primary key:** generated UUID, immutable and never derived from a name, date of birth, shirt number, club or provider.
- **Human-readable Football Time ID:** `FT-P-000001`, `FT-P-000002`, etc., assigned once from a database sequence when an identity is approved.

The FT code is a stable internal alias for the UUID. It must never be reused, renumbered or changed after a transfer, name change or correction. Use a database sequence/transactional allocator rather than calculating the next number in application code, so concurrent imports cannot create duplicates.

Do not embed league, club, season, nationality or position in the identifier. Those attributes change and belong in separate records.

### 3.2 Minimal logical records

| Record | Purpose | Minimum useful fields |
|---|---|---|
| Player Master | One canonical real-world player | internal UUID, FT code, display name, identity status, created/verified timestamps |
| Player Name/Alias | Resolve source spelling variants | player UUID, exact observed name, normalized search form, language/script if known, source/evidence reference |
| Player Membership | Time-bounded squad/team association | player UUID, canonical team ID, season, membership level/status, valid-from/to or observation date, evidence reference |
| Source Identity Link | Optional bridge to an external identity | player UUID, source/provider, source player ID, verification status, evidence reference |
| Match Player Evidence | Establish appearances and event facts | match ID, player UUID or unresolved observation, evidence type, source, source URL, observed time, completeness status |
| Review Queue | Prevent unsafe auto-merges | candidate observations, reason, reviewer decision, decision timestamp |

Keep the first release minimal. Do not add DOB, nationality, personal profile fields or portraits merely to improve matching; add only fields with a demonstrated need and a permitted source.

### 3.3 ID assignment and matching rules

1. Ingest a source observation into a staging/review record first; do not immediately create a canonical player.
2. Match an observation only when the evidence supports the same individual. Use a combination of direct roster evidence, team and season context, shirt number as supporting (not unique) evidence, and a stable source ID where legitimately available.
3. A name match alone is never sufficient. Neither are name + shirt number alone.
4. A source ID is unique only within its provider namespace. Never compare raw IDs across providers without an explicit crosswalk.
5. If evidence conflicts, the observation remains unresolved and is sent to human review. Do not auto-merge based on name, age, position, nationality or shirt number.
6. When identity is approved, create one UUID and one FT code. Future observations attach to that same player.
7. Transfers create a new membership period, not a new player.
8. If two canonical records are later proven to be the same person, use a reviewed merge/redirect with a permanent audit trail; never silently delete or recycle an ID.
9. Preserve all source observations and provenance. A provider ID may be absent; the internal identity can still exist if there is sufficient independent evidence.
10. Keep unresolved report names out of season totals until resolved. Do not guess.

### 3.4 Existing provider IDs and legacy tables

- Keep existing `ft_player_source_ids`-style provider mappings as optional source links; do not promote them to the canonical primary key.
- Do not delete or wholesale replace existing player tables or records.
- Do not treat existing `unverified` mappings as canonical identity proof.
- Existing StrikerAPI staging rows remain staging-only and rights-pending until separately approved.
- The legacy `player_records` data must not be bulk-deleted as part of adopting the FT namespace.
- A future migration must be additive, preserve old IDs/mappings and provide rollback/reconciliation. This audit does not authorize that migration.

## 4. Rights feasibility by source family

The following is an operational engineering screen of published terms, not legal advice. Terms can change; review the live version and exact intended use before any data capture or ingestion.

| Source family | Published restriction/evidence | FT decision for retained structured database |
|---|---|---|
| Premier League official website | Terms reserve copyright/database rights and prohibit reuse/re-utilisation/redistribution, including creating a database from downloaded or obtained website material, without prior written approval. | **Blocked pending written approval or separately documented legal basis.** Private viewing/download allowance is not database-building permission. |
| LALIGA official website | Legal notice limits use to personal/private use and restricts reproduction, distribution and exploitation of site content. | **Blocked pending specific review/permission.** Do not assume that private app use permits structured copying or retention. |
| Bundesliga official website | Legal notice reserves rights over reproduction, processing, storage and database repetition; it expressly reserves text/data-mining rights and prohibits automated programmes/bots accessing, analysing or downloading site content. | **Blocked. Do not automate extraction.** Obtain written permission or an independently reviewed lawful source. |
| Lega Serie A official website | Terms state that extracting and/or using content, including data compilations, requires express written consent and prohibit data mining/robots or similar extraction tools. | **Blocked pending express written consent.** A public PDF is not an ingestion licence. |
| Ligue 1/LFP official website | Existing project rights register records restrictions on reproduction/reuse and requires permission or specific legal review before official-content extraction. | **Blocked pending live-terms verification and permission/legal review.** |
| StrikerAPI | Existing project register says provider terms permit use of individual data points in an app while the account remains open, but prohibit raw dataset/feed/API redistribution and do not grant upstream league rights. | **Conditional only.** This is a provider-ID option, not a rights-cleared escape route. API calls/credits still require separate explicit authorization. |
| OpenFootball Players / Reep / Wikidata | Open/CC0 terms may cover the rights those datasets actually hold; current memberships and third-party source material are not automatically cleared. | **Identity discovery/cross-check only, conditional on provenance and exact licence scope.** Not proof of 2026/27 squad membership. |
| FootballSquads | Existing register records limited non-commercial use with attribution; no blanket permission for automated scraping or republishing structured tables/graphics. | **Manual cross-check only unless exact local-retention scope is confirmed.** |
| TeleStats / DataMB / Open Matchday | Existing register found no sufficiently clear blanket permission for local database extraction; Open Matchday also disclaims upstream rights. | **Research/discovery only.** Obtain source-level permission and provenance before retention. |

### 4.1 Why self-generated IDs do not solve source rights

The FT code itself is created by Football Time and can be internally controlled. But a record such as:

`FT-P-000001 | Player Name | Club | 2026/27`

still contains facts or content collected from somewhere. The ID does not cleanse the provenance of the name, membership, event, or statistic. It also does not override website terms, database rights, copyright in report text/layout, image rights, or a provider's contract.

A safer route is to obtain data from a source whose licence expressly covers the exact fields and intended private/local storage, or to obtain written permission. Where lawful, Football Time may independently create its own minimal factual observations, but that requires a source-by-source legal basis; this audit does not declare manual transcription automatically lawful.

## 5. Can FT build a complete 2026/27 player directory without a provider ID?

**Technically yes, but not yet demonstrated with the available evidence.**

An FT-owned identity system can operate without provider IDs if the project has:
- a rights-cleared roster or registration source for each club;
- reliable evidence to distinguish players with similar names;
- dated membership observations for the 2026/27 season;
- a human review path for ambiguous cases;
- match-report evidence linked to the approved player identity.

The current evidence does not satisfy the first condition for all 96 clubs. Match reports alone cannot include every squad member because players with zero appearances will not appear in those reports. The 32/50 report-discovery result also does not prove complete match-event coverage.

Therefore, do not claim complete 96-club coverage or start automatic population yet.

## 6. Recommended implementation gate sequence

| Gate | Required result | Current status |
|---|---|---|
| A. Internal ID design | UUID + immutable FT code, no provider dependency | **Design feasible** |
| B. Identity proof | Documented match/review rules; no name-only matching | **Rules proposed; operational pilot pending** |
| C. Roster rights | At least one permitted 2026/27 roster source per club or an explicitly accepted coverage limitation | **Blocked: 0/96 rights-cleared roster sources in prior audit** |
| D. Match evidence rights | Permitted source for lineup, substitution, goal and explicit assist evidence | **Blocked: no five-league source family cleared for bulk retention** |
| E. Offline pilot | Small manually reviewed sample, no provider call or Production write | **Not started** |
| F. Schema/importer | Additive schema and deterministic ID allocator, tests and rollback plan | **Not authorized / not started** |
| G. Production intake | Explicit approval after rights and pilot pass | **Not authorized** |

## 7. Final recommendation

Adopt the FT-owned identity namespace as the target architecture, with a UUID primary key and immutable display code such as `FT-P-000001`. Keep provider IDs optional and source-scoped. Preserve the current provider staging and legacy tables; do not migrate or delete data yet.

The next safe technical step, after the user accepts the design, is a small **offline identity-resolution pilot** using only records whose source rights and provenance are documented. The pilot should test duplicate names, transliteration, transfers, same-provider ID conflicts, and unresolved match-report names. It should not call an API or write to Supabase.

## 8. Sources checked

### Official terms
- Premier League Terms of Use: https://www.premierleague.com/en/terms-and-conditions
- Premier League data contact guidance: https://www.premierleague.com/en/news/102426
- LALIGA Legal Notice and Conditions of Use: https://www.laliga.com/en-ES/legal/legal-web
- Bundesliga Legal Notice: https://www.bundesliga.com/en/bundesliga/info/legal-notices
- Lega Serie A Terms and Conditions: https://en.legaseriea.it/terms-and-conditions
- Ligue 1/LFP legal terms (listed in the existing project register; re-check live terms before use): https://ligue1.com/en/legal/cgu

### General database/copyright context
- UK Intellectual Property Office copyright guidance: https://www.gov.uk/guidance/copyright-notices
- The National Archives — copyright and database right overview: https://www.nationalarchives.gov.uk/terms-and-conditions/copyright/copyright-and-related-rights/

### Project evidence
- Five-league source register: `docs/phase3-five-league-source-register-2026-27.md` (PR #164)
- Match-report coverage audit: `docs/player-match-report-coverage-audit-2026-11-13.md` (PR #166)
- 50-match sample audit: `docs/player-match-report-50-match-sample-audit-2026-11-13.md` (PR #166)
- Five-league source contract test: `docs/player-source-contract-test-2026-11-13.md` (PR #166)
- Current-squad staging rules: `docs/strikerapi-current-squad-intake-2026-27.md`

## 9. Safety record

- Read-only repository and public-terms review.
- No app code or database schema changes.
- No provider API calls or credits.
- No scraping, bulk extraction or player-data import.
- No Supabase Production writes, migrations, updates or deletes.
- No merge or deployment.
