# Phase 3 — Five-league source-contract test (2026/27)

**Review date:** 2026-11-13  
**Scope:** One representative match/report contract per league. Read-only inspection of public report pages and PDFs.  
**Purpose:** Determine whether the source can evidence appearances, goals and assists at match level. This is not a data-ingestion or rights approval.

## Executive result

| League | Source contract | XI + bench | Substitution in/out + minute | Goal / type | Explicit assist | Player minutes | Player IDs | Technical verdict |
|---|---|---|---|---|---|---|---|---|
| Premier League | Official Premier League match lineups page — Arsenal 3-0 Coventry, 21 Aug 2026 | Yes | Yes | Yes | Yes, credited assists shown | Derivable from XI + substitutions; not separately verified as a player-minutes table | No stable player ID surfaced; shirt number + name | **Pass for the 3 target stats** |
| La Liga | Official LALIGA match centre — Villarreal 2-0 Getafe, 8 Nov 2026 | Yes | Yes | Yes | Yes, Ayoze Pérez credited for C. Romero goal | Derivable from XI + substitutions; no minutes total field confirmed | No stable player ID surfaced; shirt number + name | **Pass for the 3 target stats** |
| Bundesliga | Official DFB Datencenter + Bundesliga match report — Freiburg 2-0 Union Berlin, 8 Nov 2026 | Yes, lineup and substitutes available across official pages | Yes | Yes, including own goal | Yes, Scherhant credited for Suzuki goal | Derivable from XI + substitutions; no minutes total field confirmed | No stable player ID surfaced; shirt number + name | **Pass for the 3 target stats** |
| Serie A | Official Lega Serie A match report PDF — Udinese 0-3 Lecce, 18 Oct 2026 | Yes | Yes | Yes, goal and own-goal legend | Yes, Gallo explicitly credited for Gaspar goal | Yes, individual player MIN field | No stable player ID surfaced; shirt number + name | **Strongest pass; all requested match facts evidenced** |
| Ligue 1 | Sky Sports team sheet + Guardian match page + Scoretable event page — Marseille 4-0 Strasbourg, 21 Aug 2026 | Yes | Yes | Yes, including penalty goal | Yes, Scoretable explicitly credits A. Gomes for Gouiri goal | Derivable from XI + substitutions; no minutes total field confirmed | No stable player ID surfaced; shirt number + name | **Conditional technical pass; relies on multiple non-official publishers** |

**Overall:** The three target statistics are technically derivable for all five representative matches. Serie A is the only tested contract that directly exposes individual minutes in a structured player-stat table. The other four can derive appearances and minutes from starting XI plus substitution events, provided the source's substitution records are complete and the competition's added-time conventions are handled consistently.

A technical pass is not a legal/rights pass. No source in this test is approved for bulk retention or redistribution.

## Match-by-match source contract

### 1. Premier League — Arsenal 3-0 Coventry (21 Aug 2026)

Primary source: [Premier League official lineups and match page](https://www.premierleague.com/en/match/2645195/essenal-vs-coventry-city/lineups)

Observed:
- Both starting XIs and team formations.
- Named substitutes for both teams.
- Substitution markers with minutes (including 62', 68', 70', 76', 81', 82').
- Goals and minute markers.
- Explicit assist credits shown alongside goals (e.g. Calafiori and Ben White).
- No stable provider player ID was visible in the inspected page; names and shirt numbers are visible.

Assessment:
- Appearances: starting XI plus confirmed players entering as substitutes.
- Goals: scorer and minute are visible; goal type needs explicit event marker where penalty/own goal occurs.
- Assists: explicit credit is available in this sample; do not infer from prose.
- Minutes: calculate from starting status and on/off timestamps; added-time handling must be validated.

### 2. La Liga — Villarreal 2-0 Getafe (8 Nov 2026)

Primary source: [LALIGA official match centre](https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-villarreal-cf-getafe-cf-12)

Observed:
- Full starting XI lists for both teams.
- Substitute lists.
- Minute-by-minute match timeline and substitution events.
- Final score and goal minutes (Buchanan 80', C. Romero 91').
- Explicit assist attribution: Ayoze Pérez assisted Carlos Romero's 90th-minute goal.
- No stable provider player ID surfaced; player names and shirt numbers are shown.

Assessment:
- Appearances: derive from starters and confirmed substitution-on events.
- Goals: scorer and minute available.
- Assists: explicit assist is present in the sample.
- Minutes: derive from substitution events; check that the event list captures every substitution and added time.
- The LALIGA page is the strongest single-page source contract in this sample.

### 3. Bundesliga — Freiburg 2-0 Union Berlin (8 Nov 2026)

Primary sources:
- [DFB Datencenter — English match centre](https://datencenter.dfb.de/en/data-center/bundesliga/2026-2027/9/2419392)
- [Bundesliga official match report](https://www.bundesliga.com/en/bundesliga/news/sport-club-freiburg-union-berlin-match-report-highlights-matchday-9-39948)
- [Bundesliga official live ticker](https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/9/sport-club-freiburg-vs-1-fc-union-berlin/liveticker/)

Observed:
- Official DFB lineup data, including starting players and substitution timeline.
- Named substitute players and player-in/player-out with minutes.
- Goal events include Rani Khedira own goal at 55' and Yuito Suzuki at 67'.
- Bundesliga official match report explicitly credits Derry Scherhant with the assist for Suzuki.
- No stable provider player ID surfaced; names and shirt numbers are available across the official match pages.

Assessment:
- Appearances: derive from official lineup and confirmed substitutions.
- Goals: own goal is explicitly marked and must not count as Khedira's player goal.
- Assists: explicit assist is present in the official report.
- Minutes: derive from starting status and substitutions.
- Combining two official pages is required to establish the complete event contract in the inspected view.

### 4. Serie A — Udinese 0-3 Lecce (18 Oct 2026)

Primary source: [Official Lega Serie A match report PDF](https://images.legaseriea.it/image/private/fl_attachment/prd/j7ao9b2qi7buzi4ggpvb.pdf)

Observed:
- Starting XI for both teams, with shirt numbers.
- Full named bench lists for both teams.
- Match timeline lists substitutions with minute and incoming/outgoing players.
- Goal events list Gaspar, N'Dri and Siebert.
- Explicit assist event: Antonino Gallo assists Kialonda Gaspar at 11'.
- Event legend distinguishes normal goal, own goal, penalty and assist.
- Individual player-stat tables include MIN, G, AUT (own goals) and AS (assists); sample shows actual minutes and an assist value.
- No stable provider player ID surfaced; shirt number and name are provided.

Assessment:
- This is the strongest contract for the proposed player statistics.
- It can directly support appearances, minutes, goals, own goals and assists.
- Use the player-stat table as a reconciliation source, not as a replacement for event-level evidence.
- The report's printed date and match identity are explicit, enabling match reconciliation.
- This PDF is publicly accessible, but public access alone does not grant bulk extraction or storage rights.

### 5. Ligue 1 — Marseille 4-0 Strasbourg (21 Aug 2026)

Sources:
- [Sky Sports starting lineups and squads](https://www.skysports.com/football/marseille-vs-strasbourg/teams/557001)
- [The Guardian match page](https://www.theguardian.com/football/match/2026/aug/21/marseille-v-strasbourg)
- [Scoretable match events](https://www.scoretable.live/football/match/1552733-marseille-vs-strasbourg)

Observed across the three pages:
- Starting XI and named substitute lists for both teams.
- Substitution events and minute markers.
- Goal events, including Amine Gouiri's penalty at 68'.
- Scoretable explicitly credits A. Gomes with the assist for Gouiri's 46' goal.
- No stable provider player ID surfaced; names and shirt numbers are available.

Assessment:
- The target statistics can be assembled technically, but only by reconciling multiple publishers.
- This is weaker than the official single-source contracts in the other leagues.
- Do not use fan forums or narrative descriptions as assist evidence.
- Rights and permitted reuse of all three publishers' data must be reviewed before retention or ingestion.

## Identity and data-quality limitations common to all five leagues

1. The inspected reports did not expose a stable player provider ID that can safely become the canonical identity key.
2. Shirt number is not a player ID: it changes by season/team and can be reused.
3. Names alone are not safe identity keys due to duplicates, transliteration, diacritics and name variants.
4. The minimum safe identity workflow is to map each report player to an existing canonical player only when corroborated by team, season, shirt number and an independently verified provider ID or authoritative roster record. Unmatched players remain unresolved; do not auto-merge by name.
5. Match report completeness must be checked per fixture. A page that lists the starting XI does not necessarily list the entire bench or every substitution.
6. Appearances should be counted from starting XI or confirmed substitution-on evidence, never from being named on the bench.
7. If the source provides player minutes, use them to reconcile calculated minutes. If not, derive minutes from start/substitution times and record the method.
8. A blank field is not automatically zero. Only treat a blank assist count as zero if the source contract establishes that the match's assist data is complete and the field is explicitly represented as zero/empty by the publisher's defined convention. Otherwise mark unknown.

## Rights and operational decision

- **Rights status: not cleared for all five source families.** This review checked the existence and content of public pages, not the full terms, database rights, licences, attribution obligations or permission for automated extraction and long-term storage.
- **No bulk scraping or extraction was performed.**
- **No provider APIs/credits were used.**
- **No Supabase Production writes, schema changes or imports were performed.**
- **No app code or deployment changes were made.**

Before any ingestion, review the terms/licence of Premier League, LALIGA, DFB/Bundesliga, Lega Serie A and each Ligue 1 publisher. Obtain written permission where required. Rights review must cover the actual intended use: player-level facts, derived season totals, caching, display, attribution, retention and redistribution.

## Recommendation

Proceed to a tightly controlled **manual, offline pilot design** only after rights clearance and identity mapping are solved. The data model can remain minimal:
- match-player appearance evidence;
- goal events with normal/penalty/own-goal type;
- explicitly credited assist events;
- source and confidence/completeness metadata.

Do not implement a production importer or write to Supabase yet. The source-contract test establishes technical feasibility for the three requested statistics, but roster completeness and legal reuse remain independent blockers.
