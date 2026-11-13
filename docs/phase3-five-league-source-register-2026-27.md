# Phase 3 — Five-League Source Register (2026/27)

**Prepared:** 2026-11-13  
**Status:** research register; no source in this document is approved for Production import.  
**Scope:** Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), Ligue 1 (FL1).  
**Use case:** personal, non-public, non-revenue Football Time installation. Personal use does not automatically grant database, extraction, reproduction, or redistribution rights.

## 1. Decision vocabulary

| Status | Meaning | Intake rule |
|---|---|---|
| `approved_open_license` | A verifiable open licence covers the exact data and intended use | May be considered only for the covered fields, with attribution/share-alike conditions satisfied |
| `conditional_open_license` | Open licence exists, but coverage, provenance, database rights, or obligations remain to be checked | Research/preview only until checks are complete |
| `written_permission_required` | Publisher terms restrict the intended extraction, reuse, or database creation | Do not copy into the app dataset without written permission or a separately documented lawful basis |
| `research_only_upstream_unverified` | A third-party compilation is available, but upstream rights or source provenance are not cleared | Discovery and comparison only; do not promote rows |
| `not_verified` | No sufficiently reliable source/licence evidence found for the exact scope | Keep empty; do not infer or fabricate data |

These are operational project gates, not legal advice. Re-check the live terms before any future import.

## 2. Cross-league source register

| Source | Data scope | Licence / terms evidence | Assessment | Project decision |
|---|---|---|---|---|
| OpenFootball Players | Player identity reference (names, positions, biographical fields where present) | Repository identifies CC0-1.0 | `conditional_open_license` | Identity lookup/cross-check only. Not current squad proof, not current-season statistics, and not an authoritative source of current memberships. Preserve upstream record/version and independently verify identities. |
| Reep public register | Entity identity and provider-ID bridges | CC0 1.0 dedication applies only to rights Reep holds | `conditional_open_license` | Use for identity/provider-ID crosswalk research only. Do not infer current team membership or assume third-party rights are conveyed. |
| Wikidata | Structured identity facts and claims such as member-of-sports-team (P54) | Structured data under CC0; individual references/qualifiers still matter | `conditional_open_license` | Discovery/cross-check only. Preserve statement references, rank, qualifiers and retrieval date. P54 alone does not establish 2026/27 registration or first-team status. |
| OpenFootball football.json / upstream Football.TXT | Fixtures/results; exact 2026/27 files checked for all five target leagues | football.json repository applies CC0-1.0 to its data/schema/scripts; upstream text repositories also describe public-domain data | `conditional_open_license` | Five 2026/27 files exist with full-season fixture rows, but the checked result data are stale (latest scored match 2026-09-20 in every league). Suitable only as a fixture discovery/preview candidate until freshness and individual rows are re-verified. Not player stats or rosters. |
| OpenLigaDB | Community-entered fixtures/results for supported leagues | ODbL 1.0; API terms specify fair-use expectations; data are user-entered and not editorially reviewed | `conditional_open_license` | Candidate for fixtures/results only where the league-season is present. Must satisfy ODbL attribution and share-alike obligations; verify accuracy against an independent source. No logos/crests rights are granted. No API use in this research step. |
| Open Matchday | Aggregated 2026/27 results, fixtures and partial match statistics across all five leagues | Repository describes non-commercial informational use; explicitly says provider rights remain with upstream providers and lists multiple upstream sources | `research_only_upstream_unverified` | Discovery/cross-check only. Its repository terms do not clear ESPN, FotMob, Soccerway, football-data.co.uk, fixturedownload or OpenLigaDB rights. No wholesale copy/import. |
| football-data.co.uk | Results and selected match statistics; source may also contain betting odds | No clear blanket open database licence established in this review | `not_verified` for app intake | Do not import until terms and exact fields are reviewed. Exclude betting odds from Football Time regardless; the app is football analysis, not gambling. |
| StatsBomb Open Data | Detailed event/lineup data for selected competitions and seasons | StatsBomb describes the release as freely available for research and asks for attribution when publishing/sharing research | `conditional_open_license` | Useful for research methodology and selected historical competitions only. No evidence in this review that it provides complete 2026/27 player statistics for all five target leagues. Check competition/season coverage and terms before use. |

## 3. League-by-league coverage and rights matrix

The following matrix distinguishes official league sources from possible open/community alternatives. It does not assert that a candidate source currently contains complete or verified data for that league.

| League | Official organiser source | Identity source | Fixtures/results candidates | Player memberships (2026/27) | Player season/match statistics |
|---|---|---|---|---|---|
| Premier League (PL) | Premier League terms reserve rights and prohibit reuse/redistribution, including creating a database from website material, without prior written approval: [Terms](https://www.premierleague.com/en/terms-and-conditions) | OpenFootball Players / Reep / Wikidata (identity only) | OpenFootball Leagues / OpenLigaDB (verify season coverage); Open Matchday discovery only | `written_permission_required` for official-site material; no rights-cleared complete roster source verified | `not_verified`; no rights-cleared complete 2026/27 player-statistics source verified |
| La Liga (PD) | LALIGA grants a limited access/view licence and restricts exploitation/reproduction of content: [Legal notice](https://www.laliga.com/en-ES/legal/legal-web) | OpenFootball Players / Reep / Wikidata (identity only) | OpenFootball Leagues / OpenLigaDB (verify season coverage); Open Matchday discovery only | `written_permission_required` for official-site material; no rights-cleared complete roster source verified | `not_verified`; no rights-cleared complete 2026/27 player-statistics source verified |
| Bundesliga (BL1) | Bundesliga terms reserve IP rights and text/data mining; official legal terms must be reviewed for the exact proposed extraction: [Terms](https://www.bundesliga.com/en/bundesliga/info/terms-of-use-services) | OpenFootball Players / Reep / Wikidata (identity only) | OpenFootball Leagues / OpenLigaDB (verify season coverage); Open Matchday discovery only | `written_permission_required` pending permission/legal basis for copying official directory data | `not_verified`; no rights-cleared complete 2026/27 player-statistics source verified |
| Serie A (SA) | Lega Serie A terms updated 2025-12-01 prohibit extracting/using content, including data compilations, without express written consent and prohibit data-mining/robots: [Terms](https://en.legaseriea.it/terms-and-conditions) | OpenFootball Players / Reep / Wikidata (identity only) | OpenFootball Leagues / OpenLigaDB (verify season coverage); Open Matchday discovery only | `written_permission_required` for official-platform content | `not_verified`; no rights-cleared complete 2026/27 player-statistics source verified |
| Ligue 1 (FL1) | LFP/Ligue 1 site terms restrict reproduction and reuse; obtain permission or specific legal review before extracting official content: [Legal terms](https://ligue1.com/en/legal/cgu) | OpenFootball Players / Reep / Wikidata (identity only) | OpenFootball Leagues / OpenLigaDB (verify season coverage); Open Matchday discovery only | `written_permission_required` pending permission/legal basis | `not_verified`; no rights-cleared complete 2026/27 player-statistics source verified |


### Exact 2026/27 coverage verification (checked 2026-11-13)

#### OpenFootball football.json

The following exact files were fetched from the public \`openfootball/football.json\` repository. The repository README says the latest-season JSON is generated daily from upstream Football.TXT, but also warns that the upstream Football.TXT source repositories are not automatically updated daily. A daily JSON build therefore does not prove that the underlying match data are fresh.

| League | File | Match rows | Unique teams | Rows with full-time score | Latest scored match | Assessment |
|---|---|---:|---:|---:|---|---|
| Premier League | [2026-27/en.1.json](https://github.com/openfootball/football.json/blob/master/2026-27/en.1.json) | 380 | 20 | 45 | 2026-09-20 | Full fixture spine; results stale |
| La Liga | [2026-27/es.1.json](https://github.com/openfootball/football.json/blob/master/2026-27/es.1.json) | 380 | 20 | 64 | 2026-09-20 | Full fixture spine; results stale |
| Bundesliga | [2026-27/de.1.json](https://github.com/openfootball/football.json/blob/master/2026-27/de.1.json) | 306 | 18 | 33 | 2026-09-20 | Full fixture spine; results stale |
| Serie A | [2026-27/it.1.json](https://github.com/openfootball/football.json/blob/master/2026-27/it.1.json) | 380 | 20 | 50 | 2026-09-20 | Full fixture spine; results stale |
| Ligue 1 | [2026-27/fr.1.json](https://github.com/openfootball/football.json/blob/master/2026-27/fr.1.json) | 306 | 18 | 41 | 2026-09-20 | Full fixture spine; results stale |

These counts were calculated from the fetched JSON files. “Rows with full-time score” counts only records with a structured \`score.ft\` value; placeholder score arrays and unscored fixtures are not treated as completed results. On the 2026-11-13 review date, the last scored match was approximately eight weeks old in every league. Do not use these files as a current results feed, current standings source, or as evidence of current player membership/statistics. The CC0 repository licence does not make stale or inaccurate facts reliable.

#### OpenLigaDB

The official [2026-season league overview](https://www.openligadb.de/Leagues?season=2026) was inspected directly on 2026-11-13. It lists current 2026/27 entries for:
- Premier League — shortcut \`pl\`
- LaLiga EA Sports — shortcut \`la1\`
- 1. Fußball-Bundesliga — shortcut \`bl1\`

No 2026/27 Serie A or Ligue 1 entry appeared in that official season overview. An independent coverage review dated 2026-10-30 also confirmed match data for PL, LaLiga and Bundesliga, while marking Serie A and Ligue 1 as not confirmed. A separate 2026-11-13 coverage monitor showed results sourced from OpenLigaDB for PL/LaLiga/Bundesliga, but fixture-only coverage for Serie A and Ligue 1; this is corroboration, not provider evidence.

| League | 2026/27 OpenLigaDB presence | Current decision |
|---|---|---|
| Premier League | Listed as \`pl\` in official season 2026 overview | \`conditional_open_license\`; candidate for fixture/result cross-check, community quality and freshness checks required |
| La Liga | Listed as \`la1\` in official season 2026 overview | \`conditional_open_license\`; candidate for fixture/result cross-check, community quality and freshness checks required |
| Bundesliga | Listed as \`bl1\` in official season 2026 overview | \`conditional_open_license\`; candidate for fixture/result cross-check, community quality and freshness checks required |
| Serie A | No 2026/27 entry found in official overview; independent review also says not confirmed | \`not_verified\`; do not assume coverage |
| Ligue 1 | No 2026/27 entry found in official overview; independent review also says not confirmed | \`not_verified\`; do not assume coverage |

The OpenLigaDB official league page shows a community-maintained catalogue, not a completeness guarantee. Its quality index is provider metadata, not independent verification. The provider states that records are user-entered, not editorially reviewed, and that completeness/timeliness vary by league and season. No API endpoints were called as part of this review.

## 4. Direct source links and review notes

- Premier League terms: https://www.premierleague.com/en/terms-and-conditions
- LALIGA legal notice: https://www.laliga.com/en-ES/legal/legal-web
- Bundesliga terms: https://www.bundesliga.com/en/bundesliga/info/terms-of-use-services
- Lega Serie A terms (version dated 2025-12-01): https://en.legaseriea.it/terms-and-conditions
- Ligue 1/LFP legal terms: https://ligue1.com/en/legal/cgu
- OpenFootball Players (CC0-1.0): https://github.com/openfootball/players
- OpenFootball Leagues (public-domain competition metadata): https://github.com/openfootball/leagues
- OpenFootball football.json (CC0-1.0 fixtures/results; upstream freshness caveat): https://github.com/openfootball/football.json
- Reep register: https://github.com/reep-project/reep
- OpenLigaDB licence (ODbL 1.0): https://www.openligadb.de/en/license
- OpenLigaDB API terms: https://www.openligadb.de/en/terms-of-use
- Open Matchday (non-commercial compilation and upstream disclaimer): https://github.com/oladeeayo/open-matchday
- StatsBomb Open Data: https://github.com/hudl/open-data
- football-data.co.uk help/data context: https://football-data.co.uk/help_footballdata.php

### Important Open Matchday caveat

Open Matchday's README describes a daily-updated 2026/27 compilation and lists upstream sources including fixturedownload, OpenLigaDB, ESPN, football-data.co.uk, FotMob and Soccerway. It also states that upstream provider rights remain with those providers. Therefore:
- A non-commercial statement from the compilation author is not a licence from every upstream provider.
- A CSV being downloadable does not prove the right to reproduce its contents in a persistent app database.
- Use only as a lead to identify possible matches/coverage gaps; independently verify facts and rights before intake.

### OpenLigaDB caveat

OpenLigaDB states that its data are user-entered, coverage and completeness vary, there is no editorial review, and ODbL governs retrieved data. The ODbL obligations (including attribution and share-alike for a resulting database) must be evaluated before any import. Team-icon URLs do not grant image rights.

## 5. Field-level approval policy

| Field category | Default rule |
|---|---|
| Canonical identity / provider IDs | May be considered from CC0 sources within the rights the source actually holds; exact-ID mapping required |
| Player name / position / date of birth | Verify source licence and personal-data implications; do not treat a CC0 identity list as current roster evidence |
| Current club / season membership | Require dated, direct evidence and source permission covering the intended capture/use |
| Season competition statistics | Require direct evidence URL, metric definition, season/competition scope and explicit reuse basis |
| Match-level statistics/events | Require direct match evidence, source metric definition, provenance and reuse basis; never convert missing values to zero |
| Portraits, badges and crests | Separate image/trademark rights review; no automatic permission from data licences |
| Betting odds | Out of scope; do not ingest |

No source approval should be inherited across fields. A source can be acceptable for identity but blocked for memberships, statistics, images or redistribution.

## 6. Next research actions

1. Re-check OpenFootball and OpenLigaDB freshness/coverage before each use; do not rely on stale result rows or infer missing scores.
2. Verify whether any source offers 2026/27 player membership and statistics under an explicit licence suitable for a private local app.
3. For Open Matchday, map each league/field to the actual upstream provider, then review each provider's current terms before considering even local storage.
4. Keep the existing 25-row sample in `data/current-player-squads-2026-27.json` marked research-only and rights-pending; do not promote it or infer it is a cleared roster.
5. Add only rows that pass source rights, direct evidence, identity and metric checks to the existing offline intake manifests.

## 7. Safety and implementation boundary

- This register is documentation only; it does not change API sync, schemas, application UI, validators, or intake manifests.
- No provider API calls or API credits were used.
- No scraping or automated copying was performed.
- No Supabase Production access or writes were performed.
- No player records or statistics were added.
- Merge and deployment remain separate actions requiring explicit user approval.
