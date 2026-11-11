# International Match Experimental Lab — Round 1 Specification

**Status:** Planning specification — pending user review  
**Scope:** 15 senior men's international fixtures (10 UEFA Nations League, 5 international friendlies)  
**Target window:** 12–17 November 2026  
**Change boundary:** Documentation only. No app code, database writes, API connection, scheduled workflow, polling, or production changes are authorized by this document.

## 1. Goals

1. Build a small, auditable experimental dataset for international football.
2. Compare a baseline model with experimental approaches without contaminating the stable club-football dataset or its accuracy history.
3. Research public sources and app-based sources (AiScore and LiveScore) while checking usage rights before any copying, automated extraction, storage, or redistribution.
4. Present international fixtures in the existing Match Center chronology alongside club fixtures, while keeping storage and model evaluation isolated.
5. Display national flags beside national-team names; retain club crests for club teams.

## 2. Non-goals and hard boundaries

- Do not write international data into `data/football-database.json` or existing club-league tables/snapshots.
- Do not change the existing five major leagues + Championship ingestion workflow, schedules, API quota, or service worker.
- Do not add paid APIs, providers, credentials, recurring costs, polling, push triggers, or extra network calls without separate explicit approval.
- Do not scrape AiScore, LiveScore, or other websites/apps; do not automate browser/app interaction or reverse engineer private endpoints.
- Do not copy or redistribute protected app content, graphics, commentary, or datasets without permission/licence.
- Do not merge experimental evaluation metrics into the stable model's accuracy/calibration.
- No betting features, odds prices, bookmaker links, or wagering recommendations.

## 3. Round 1 fixture shortlist

This is a **candidate list**, not a locked ingestion manifest. Verify each fixture's existence, senior-team status, competition, kickoff timestamp, venue, neutral-ground status, and current status immediately before creating a snapshot. Store source-local kickoff and normalized UTC timestamp; render in the user's configured/local timezone.

### 3.1 UEFA Nations League — 10 candidates

| Date (2026) | Fixture | Competition |
|---|---|---|
| Nov 12 | Türkiye vs Belgium | 2026/27 UEFA Nations League, League A |
| Nov 12 | Italy vs France | 2026/27 UEFA Nations League, League A |
| Nov 12 | Czechia vs Spain | 2026/27 UEFA Nations League, League A |
| Nov 12 | England vs Croatia | 2026/27 UEFA Nations League, League A |
| Nov 13 | Netherlands vs Greece | 2026/27 UEFA Nations League, League A |
| Nov 13 | Serbia vs Germany | 2026/27 UEFA Nations League, League A |
| Nov 14 | Norway vs Wales | 2026/27 UEFA Nations League, League A |
| Nov 14 | Portugal vs Denmark | 2026/27 UEFA Nations League, League A |
| Nov 15 | Belgium vs Italy | 2026/27 UEFA Nations League, League A |
| Nov 15 | Spain vs England | 2026/27 UEFA Nations League, League A |

UEFA's official 2026/27 fixture announcement lists the league-phase schedule and states that all times are CET unless otherwise noted. Reconfirm kickoff times against the official match page before use.

### 3.2 International friendlies — 5 candidates

| Date (2026) | Fixture | Candidate source |
|---|---|---|
| Nov 13 | Saudi Arabia vs South Korea | Football Web Pages / cross-check official federation |
| Nov 13 | Qatar vs Australia | Football Web Pages / cross-check official federation |
| Nov 13 | Argentina vs Uruguay | Football Web Pages / cross-check official federation |
| Nov 14 | Japan vs Brazil | Football Web Pages; club international-call-up schedules |
| Nov 17 | Singapore vs Brazil | Club international-call-up schedules; cross-check host/federation |

Friendly fixtures are more prone to changes and neutral-venue arrangements. The above five remain provisional until cross-checked against the participating federations or host venue. Do not infer a home advantage merely from the first-listed team.

### 3.3 Fixture source references

- FIFA International Match Calendar: https://inside.fifa.com/tournament-organisation/international-match-calendars
- UEFA 2026/27 Nations League fixtures: https://www.uefa.com/uefanationsleague/news/02a2-1fea18abbcbc-456e846509e7-1000/
- Football Web Pages international friendlies: https://www.footballwebpages.co.uk/international-friendly/international-friendly/fixtures-results
- Manchester City November 2026 international schedule: https://www.mancity.com/news/mens/international-break-explainer-november-2026-63929738
- Chelsea November 2026 international schedule: https://www.chelseafc.com/en/news/article/chelsea-international-call-ups-and-schedules-for-november-2026

## 4. Source and rights audit

### 4.1 Official federation / competition sources

Preferred for fixture identity, competition, kickoff, venue, match status, official results, and lineups. A public webpage is not automatically a licence to bulk-copy, republish, or build a permanent database. Record source URL, access date, attribution requirements, and any relevant terms. If terms are unclear, use the page only for human verification and seek permission before systematic reuse.

### 4.2 AiScore

AiScore publicly advertises broad fixture, live-score, lineup, H2H, team/player-statistics, and match-statistics coverage. The reviewed public privacy policy describes personal-data processing; it does **not** establish permission to scrape, bulk-export, store, or redistribute football data. No verified public data/API licence was identified in this review.

**Decision:** research/visual cross-check only for now. No scraping, automated requests, private endpoint use, or persistent copying. Request written permission/licensing or locate official terms/API documentation before any ingestion.

References:
- Product coverage: https://www.aiscore.com/en/
- Privacy policy (not a data licence): https://www.aiscore.com/id/policy

### 4.3 LiveScore

The reviewed LiveScore terms state that platform material is protected, use is limited to domestic/private purposes, reproduction for commercial/business purposes requires a licence, and data mining/robots/similar extraction methods are prohibited. This is not permission for automated collection or republication.

**Decision:** do not scrape or automate LiveScore. Use only as a manually viewed secondary cross-check where permitted by the applicable terms; obtain written permission/licence before copying or storing its content.

References:
- Terms: https://www.livescore.com/en/about-us/terms-and-conditions.html
- Alternative terms page: https://www.livescores.com/terms/?tz=-3

### 4.4 Source policy

Each field must carry provenance:
- `source_name`, `source_url`, `retrieved_at`, `source_timezone`
- `usage_basis`: `official_public_reference`, `licensed`, `user_supplied`, or `manual_research_unverified`
- `permission_status`: `approved`, `pending`, `restricted`, or `not_reviewed`
- `field_confidence` and notes for conflicts

Only `approved` or clearly permitted `user_supplied` records may enter a persistent dataset. Pending/restricted sources can inform a research checklist but must not be copied into stored records.

## 5. Data architecture — isolated storage, shared fixture presentation

### 5.1 Separate datasets

Use a distinct experimental namespace/storage file/table set, e.g. `international_experimental_matches`, `international_source_records`, `international_prediction_snapshots`, and `international_actual_results`. Final physical storage choice is deferred until implementation is separately approved.

Use namespaced identifiers such as `intl:uefa-nations-league:2026:...`; never reuse or collide with club match IDs. Preserve the raw source identifier separately when available and permitted.

### 5.2 Shared Match Center read model

The Match Center may combine **read-only fixture summaries** from the stable club dataset and the experimental international dataset into one chronological display. This is a presentation/read-model join only; it must not merge their underlying records, histories, model outputs, or evaluation metrics.

Requirements:
- Sort all matches by normalized kickoff timestamp and display date/time in the user's local timezone.
- Keep competition and type labels visible (e.g. Club / Premier League; International / UEFA Nations League; International Friendly).
- Preserve existing club cards and their crest behavior.
- National-team cards show the relevant national flag beside the country/team name, not a club crest.
- Use a stable country/team code mapping (FIFA/ISO mapping with explicit aliases where needed); do not infer flags from display names at render time.
- Provide accessible text labels/alt text for flags. If a flag asset is missing, use a neutral fallback icon and retain the team name.
- Distinguish senior national teams from U21/U20/youth, women's, Olympic, and regional representative teams; Round 1 includes senior men's national teams only.
- A combined Match Center must not imply that international matches are part of the five-league + Championship statistical database.
- Opening an international match routes to its experimental detail/analysis context; opening a club match continues to use the existing stable detail/analysis path.
- Do not show handicap reference or model percentages for an international match until a separately approved international model and valid source coverage exist.

### 5.3 National team identity and flags

Store a canonical team record with:
- `team_id` (namespaced internal ID)
- `team_name` (canonical)
- `display_name`
- `team_type = national_senior_men`
- `fifa_code` (where applicable)
- `iso_alpha2` (where applicable)
- `flag_asset_key` (local/approved asset mapping, implementation decision deferred)
- `aliases[]`

Do not hotlink flag images from third-party score apps. Flag artwork/source licensing must be checked; a code-to-flag mapping is not itself a licence to reuse proprietary assets.

## 6. Data collection specification

Collect only fields available from permitted sources, with explicit missing values rather than inferred values.

### Before kickoff
- Fixture identity, competition/stage, kickoff UTC, source-local kickoff/timezone, venue, neutral-ground flag, status
- Team identity and country codes
- Last 5–10 completed senior international matches (with opponent, date, competition, venue, score); clearly label sample size and avoid mixing youth/club matches
- Goals for/against and per-match rates, with competition/context labels
- Home/away/neutral splits only when sample sizes support them
- H2H records with sample size and date range; do not overweight tiny samples
- FIFA ranking and ranking date, if sourced
- Squad availability/lineups only if confirmed and sourced; distinguish confirmed absences from unverified reports
- Snapshot timestamp, model version, feature values, and probability outputs

### After kickoff
- Final result and status (including extra time/penalties separately where relevant)
- Match statistics only where licensed/permitted and definition is known
- Actual outcome labels and evaluation timestamp
- Corrections must be append-only/versioned; never silently overwrite the original pre-match snapshot

### Quality gates
- No pre-match snapshot after kickoff.
- Reject future-dated or contradictory source timestamps unless resolved.
- Require two independent sources for critical fixture facts where feasible; sources sharing the same upstream provider are not independent.
- Mark stale, incomplete, conflicting, or low-sample data explicitly.
- Preserve source attribution and data-definition metadata.

## 7. Model experiment design

- Baseline: current model as a reference only, with documented feature compatibility gaps.
- Experimental model: separately versioned; may adapt weighting/priors for national-team context after sufficient data review.
- Never tune on the same fixtures used for final evaluation without explicitly marking that as in-sample.
- Evaluate 1X2 probabilities with Brier Score, Log Loss, and calibration; report sample count and confidence intervals where practical.
- Segment results by Nations League vs friendly, and by neutral vs non-neutral venue where sample size allows.
- Do not use accuracy alone; do not claim model superiority from 15 fixtures.
- Do not merge experimental scores into stable club model reporting.

## 8. Proposed workflow and gates

1. **Fixture verification:** confirm all 15 fixtures, senior-team category, kickoff/venue/status and source links.
2. **Rights audit:** document the allowed usage basis for every intended source and field. AiScore remains pending; LiveScore automated extraction is prohibited under reviewed terms.
3. **Schema review:** approve isolated storage schema and namespaced IDs.
4. **Manual research pilot:** only use sources with approved usage basis; no automated collection.
5. **Pre-match freeze:** create immutable snapshots before kickoff.
6. **Post-match reconciliation:** record results and provenance.
7. **Evaluation report:** report metrics with limitations; do not alter the production model.

Each gate requires review before proceeding to the next. Any API, scraper, automation, database migration, or app-code work requires a separate explicit approval.

## 9. Acceptance criteria for the specification

- Exactly 15 provisional candidates are listed: 10 Nations League and 5 friendlies.
- Fixture candidates are explicitly marked provisional until reverified.
- No source is treated as licensed merely because it is publicly viewable.
- AiScore and LiveScore restrictions/pending status are documented.
- Experimental data, snapshots, and evaluation remain separate from the stable football database.
- Match Center can display both datasets chronologically without merging storage.
- National teams use flag identity; club teams retain crests.
- Local-time display, team-category labels, provenance, freshness, and missing-data states are specified.
- No API, scraping, code, production, or scheduled workflow changes are included.

## 10. Research references and audit notes

The research review on 12 November 2026 found:
- FIFA's 2026 men's international calendar lists the November playing window as 9–17 November, with up to two matches per team.
- UEFA's official 2026/27 Nations League schedule lists Matchdays 5 and 6 and notes CET as the default displayed timezone.
- LiveScore terms reviewed prohibit data mining/robots and restrict reuse/reproduction without appropriate licensing.
- AiScore product pages advertise broad match and statistics coverage, but the reviewed privacy policy is not a data-reuse licence; explicit ingestion permission remains unverified.

This document is a planning specification, not authorization to ingest data or modify the app.
