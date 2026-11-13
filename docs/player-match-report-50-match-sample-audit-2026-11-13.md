# Phase 2 — 50-match public match-report sample audit (2026/27)

**Review date:** 2026-11-13  
**Scope:** 10 completed matches per league across opening, middle and latest available match windows; 50 matches total.  
**Database snapshot:** `data/football-database.json` on `main`, season 2026-2027, generated 2026-11-12T23:44:01Z.  
**Method:** Search for match-specific public reports and inspect surfaced report content. This is a discovery/feasibility screen, not permission to scrape or retain third-party data.

## 1. Executive summary

The 50-match sample shows that player-level match evidence can be found publicly, but access is uneven by league and match. Some pages provide lineups, substitutes, substitutions and goal events together; others provide only a narrative result, a fixture listing, or no match-specific report was located during this screen.

**Do not interpret “not located” as “no report exists”.** It means the current search did not establish a usable match-specific page for that fixture. Every match still needs direct verification before ingestion.

| League | Sampled | Match-specific page/data record located | Assessment |
|---|---:|---:|---|
| Premier League | 10 | 7 | Strongest discovery coverage; club reports and league match centre expose player details |
| La Liga | 10 | 8 | Strong structured match-centre coverage in surfaced sample |
| Bundesliga | 10 | 4 | Official live tickers can be highly detailed, but discovery was uneven |
| Serie A | 10 | 10 | Most matches surfaced some event/report source; official club pages and third-party sources are mixed |
| Ligue 1 | 10 | 3 | Weakest confirmed coverage in this sample; official league narrative reports and other match sources vary |
| **Total** | **50** | **32** | **64% discovery rate, not a completeness or rights-clearance rate** |

The count above is deliberately a *page-discovery* count. It does not mean 32 pages have all fields required for the three season statistics, and it does not mean that 32 sources are approved for reuse.

## 2. Sample selection

For each league, the sample contains:
- 3 matches from the opening period;
- 3 matches from a middle period;
- 4 matches from the latest completed match window.

Match IDs, dates, teams and scores below are taken from the repository database snapshot. A score or status discrepancy against a public report is recorded rather than silently corrected.

## 3. Match-by-match evidence register

Legend:
- **Detailed page** — surfaced match-specific report/page with lineup and/or event information.
- **Partial page** — a result/story/fixture page surfaced, but key player evidence is incomplete or not independently confirmed.
- **Not located** — no usable match-specific page was found in this discovery pass.
- **Conflict** — source snapshot conflicts with the repository match record or is not at a final state.

### Premier League (PL)

| Match ID | Date | Match | Evidence found | Field notes |
|---:|---|---|---|---|
| 560542 | 21 Aug | Arsenal 3-0 Coventry | Detailed page | Official Premier League match page exposes both XIs, substitutes, player change minutes, scorers and explicit assist labels. |
| 560544 | 22 Aug | Ipswich 2-1 Sunderland | Not located | Search did not surface a match-specific player report. |
| 560546 | 22 Aug | Everton 2-0 Crystal Palace | Not located | Search did not surface a match-specific player report. |
| 560585 | 20 Sep | Leeds 0-0 Crystal Palace | Detailed page | Leeds official report lists both XIs, substitutions and unused substitutes; no goals/assists in a 0-0 match. |
| 560590 | 20 Sep | Man City 5-3 Sunderland | Detailed page | Guardian report lists XIs, substitutions and all scorers; assist actions are described in prose, not consistently as structured credited-assist fields. |
| 560583 | 20 Sep | Fulham 1-1 Man United | Detailed page | Guardian report lists XIs, substitutions, an own goal and scorer; assist attribution is not consistently tabulated. |
| 560636 | 8 Nov | Sunderland 1-0 Chelsea | Detailed page | Chelsea official report and Guardian report expose XIs, substitutions and the penalty scorer; no credited assist for the penalty. |
| 560637 | 8 Nov | Ipswich 1-2 Bournemouth | Not located | Search did not surface a match-specific player report. |
| 560638 | 8 Nov | Brighton 2-0 Brentford | Detailed page | Brentford official report and Guardian report expose XIs, substitutions and scorers; penalty goal has no assist. |
| 560639 | 8 Nov | Man United 4-4 Aston Villa | Detailed page | Both clubs' official reports expose XIs, substitutions, scorers and penalty notation; assist credit is not provided as a structured field. |

References:
- https://www.premierleague.com/en/match/2645195/essenal-vs-coventry-city/lineups
- https://www.leedsunited.com/en/matches/mens/leeds-united-fc-v-crystal-palace-fc-premier-league-20260920
- https://www.theguardian.com/football/2026/sep/20/manchester-city-sunderland-premier-league-match-report
- https://www.theguardian.com/football/2026/sep/20/fulham-manchester-united-premier-league-match-report
- https://www.chelseafc.com/en/news/article/match-report-sunderland-1-0-chelsea
- https://www.brentfordfc.com/en/news/match-reports-brighton-and-hove-albion-2-brentford-0-premier-league-08-11-2026
- https://www.manutd.com/en/news/manchester-united-4-aston-villa-4-match-report-8-nov-2026

### La Liga (PD)

| Match ID | Date | Match | Evidence found | Field notes |
|---:|---|---|---|---|
| 564634 | 15 Aug | Alavés 3-0 Getafe | Partial page | Official matchday results page confirms fixture/result; individual lineup/event page not located in this pass. |
| 564629 | 16 Aug | Racing Santander 2-2 Villarreal | Partial page | Official matchday results page confirms fixture/result; individual lineup/event page not located in this pass. |
| 564635 | 17 Aug | Deportivo 1-1 Elche | Detailed page | Official LALIGA match page exposes starters, substitutes, goal events and substitution timeline. |
| 564686 | 17 Sep | Betis 1-0 Getafe | Detailed page | Official LALIGA match page exposes starters, substitutes, minute-by-minute events and substitutions. |
| 564683 | 17 Sep | Málaga 1-3 Villarreal | Detailed page | Official LALIGA match page exposes starters, substitutes, scorer minutes and penalty notation. |
| 564692 | 18 Sep | Espanyol 1-3 Elche | Detailed page | Official LALIGA match page exposes starters, substitutes, scorer minutes, own-goal marker and event timeline. |
| 564743 | 8 Nov | Real Sociedad 1-0 Rayo | Detailed page | Official LALIGA match page exposes starters, substitutes, scorer minute and substitution timeline. |
| 564742 | 8 Nov | Celta 0-0 Levante | Detailed page | Official LALIGA match page exposes starters, substitutes and substitutions; no goals/assists in a 0-0 match. |
| 564747 | 8 Nov | Villarreal 2-0 Getafe | Detailed page | Official LALIGA match page exposes starters, substitutes, goals and an explicitly credited assist on the second goal. |
| 564746 | 8 Nov | Atlético 1-2 Barcelona | Conflict | Official page search snapshot surfaced a live/partial 1-1 state, while the repository record says 1-2. Final report/score must be reconciled before use. |

References:
- https://www.laliga.com/en-GB/laliga-easports/results/2026-27/gameweek-1
- https://www.laliga.com/partido/temporada-2026-2027-laliga-ea-sports-rc-deportivo-elche-cf-1
- https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-real-betis-getafe-cf-6
- https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-malaga-cf-villarreal-cf-6
- https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-rcd-espanyol-de-barcelona-elche-cf-7
- https://www.laliga.com/es-GB/partido/temporada-2026-2027-laliga-ea-sports-real-sociedad-rayo-vallecano-12
- https://iaas-public-front-pro.laliga.com/partido/temporada-2026-2027-laliga-ea-sports-rc-celta-levante-ud-12
- https://www.laliga.com/en-US/match/temporada-2026-2027-laliga-ea-sports-villarreal-cf-getafe-cf-12
- https://www.laliga.com/en-ES/match/temporada-2026-2027-laliga-ea-sports-atletico-de-madrid-fc-barcelona-12

### Bundesliga (BL1)

| Match ID | Date | Match | Evidence found | Field notes |
|---:|---|---|---|---|
| 565776 | 28 Aug | Bayern 5-1 Stuttgart | Partial page | Official live ticker and lineup navigation found; archived lineup endpoint did not return a populated lineup at inspection time. |
| 565778 | 29 Aug | Mainz 0-0 Paderborn | Not located | No match-specific detailed page surfaced. |
| 565780 | 29 Aug | Elversberg 3-2 Leverkusen | Not located | No match-specific detailed page surfaced. |
| 565813 | 10 Oct | Paderborn 0-2 Stuttgart | Not located | No match-specific detailed page surfaced. |
| 565817 | 10 Oct | Union Berlin 1-0 Elversberg | Not located | No match-specific detailed page surfaced. |
| 565818 | 10 Oct | Hoffenheim 2-3 Hamburg | Not located | No match-specific detailed page surfaced. |
| 565849 | 7 Nov | Stuttgart 1-0 Werder Bremen | Detailed page | Official Bundesliga ticker exposes starting XIs, substitutes, minute-stamped substitutions, scorer and goal build-up. |
| 565855 | 8 Nov | Köln 1-2 Leverkusen | Not located | No match-specific detailed page surfaced. |
| 565854 | 8 Nov | Freiburg 2-0 Union Berlin | Detailed page | Official Bundesliga ticker exposes starting XIs, substitutes, substitutions, own goal, scorer and explicit assist. |
| 565856 | 8 Nov | Hoffenheim 2-1 Schalke | Detailed page | Official Bundesliga ticker exposes starting XIs, substitutes, substitutions and scorer events. |

References:
- https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/1/fc-bayern-muenchen-vs-vfb-stuttgart/liveticker
- https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/9/vfb-stuttgart-vs-sv-werder-bremen/liveticker/
- https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/9/sport-club-freiburg-vs-1-fc-union-berlin/liveticker/
- https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/9/tsg-hoffenheim-vs-fc-schalke-04/liveticker/

### Serie A (SA)

| Match ID | Date | Match | Evidence found | Field notes |
|---:|---|---|---|---|
| 558629 | 22 Aug | Udinese 1-1 Como | Detailed page | Como official report lists both XIs, benches, substitution minutes and scorers; assist is not explicitly credited in the report text. |
| 558631 | 22 Aug | Genoa 0-2 Napoli | Detailed page | Napoli official report lists both XIs, benches, substitution minutes and scorers; narrative explains the goal build-up but is not a structured assist field. |
| 558635 | 23 Aug | Frosinone 0-1 Juventus | Partial page | Third-party match page lists goal, substitutions and an assist; not a rights-cleared source and full roster/bench completeness needs checking. |
| 558586 | 10 Oct | Napoli 3-0 Frosinone | Detailed page | Napoli official report confirms scorers and goal narratives; full XI/bench fields must be checked in the original report before intake. |
| 558585 | 11 Oct | Como 0-0 Roma | Detailed page | Como official report lists both XIs, benches and substitution minutes; no goals/assists in a 0-0 match. |
| 558581 | 11 Oct | Lecce 1-2 Bologna | Partial page | Third-party match pages expose XIs, substitutions, scorers and credited assists; rights and data provenance are not cleared. |
| 558536 | 8 Nov | Genoa 1-2 Milan | Partial page | Search surfaced event/goal reports, but not a verified complete XI and bench in the reviewed source. |
| 558538 | 8 Nov | Monza 0-1 Atalanta | Partial page | Third-party event report exposes scorer and substitutions; complete starting XI/bench not verified. |
| 558530 | 8 Nov | Inter 2-0 Como | Detailed page | Como official report lists both XIs, benches, substitution minutes and scorers; no explicit credited assist field. |
| 558529 | 8 Nov | Fiorentina 2-2 Juventus | Partial page | Official matchday program found, plus third-party event/lineup pages; official event report with complete player facts not confirmed. |

References:
- https://comofootball.com/udinese-como-1-1-match-report/
- https://sscnapoli.it/en/news/match-report-genoa-napoli-0-2
- https://ezco.gg/football/match/frosinone-vs-juventus-2026-08-23/
- https://sscnapoli.it/news/match-report-napoli-frosinone-3-0
- https://www.comofootball.com/como-1907-roma-0-0-match-report-serie-a/
- https://www.worldsoccerdata.com/stats/italy/seriea/matches/lecce-vs-bologna-11-10-2026
- https://www.comofootball.com/inter-como-1907-2-0-match-report/
- https://images.legaseriea.it/image/private/fl_attachment/prd/elpun6p9vavp24mpohx6.pdf

### Ligue 1 (FL1)

| Match ID | Date | Match | Evidence found | Field notes |
|---:|---|---|---|---|
| 559715 | 21 Aug | Marseille 4-0 Strasbourg | Detailed page | Official Ligue 1 article confirms result/scorers; third-party page provides XIs, substitutes, substitution minutes and one assist. Third-party rights not cleared. |
| 559711 | 22 Aug | Le Mans 2-2 Brest | Not located | No suitable match-specific player report surfaced. |
| 559716 | 22 Aug | Nice 0-0 Lorient | Not located | No suitable match-specific player report surfaced. |
| 559676 | 20 Sep | Auxerre 2-1 Brest | Not located | No suitable match-specific player report surfaced. |
| 559678 | 20 Sep | Nice 2-1 Lille | Partial page | Fan discussion surfaced, but no suitable match report/player evidence; do not use forum comments as source data. |
| 559675 | 20 Sep | Marseille 1-2 PSG | Not located | No suitable match-specific player report surfaced. |
| 559632 | 8 Nov | Brest 2-0 Lyon | Detailed page | Local sports live report lists XIs, substitutions, scorers and penalty; independent match page also surfaced. Not the official league report. |
| 559633 | 8 Nov | Le Havre 0-2 Lorient | Partial page | Live report confirms goals/events and substitutions; complete XI/bench was not confirmed in the reviewed source. |
| 559634 | 8 Nov | Angers 0-2 Nice | Not located | Search surfaced fan discussion but no suitable match report/player evidence. |
| 559630 | 8 Nov | Lens 1-2 Marseille | Not located | No suitable match-specific player report surfaced. |

References:
- https://ligue1.com/en/articles/l1_article_5715-
- https://www.scoretable.live/football/match/1552733-marseille-vs-strasbourg
- https://www.leprogres.fr/sport/2026/11/08/suivez-stade-brestois-ol-les-lyonnais-veulent-rester-dans-le-peloton-de-tete
- https://www.sofascore.com/football/match/stade-brestois-olympique-lyonnais/ZHspJ
- https://www.football365.fr/le-havre-lorient-en-direct-commente-10326155.html

## 4. What the 50-match sample proves — and does not prove

### Proven in the sample
- Public match-specific player evidence exists for multiple clubs and multiple parts of the season.
- The strongest official match-centre examples (Premier League, LALIGA and Bundesliga) can expose XIs, benches, substitutions and goal events.
- Some sources explicitly mark assists; other sources only narrate the build-up, so narrative inference must not be converted into a credited assist.
- Own goals and penalties appear in event data and must be stored as goal types.
- Serie A club match reports are a practical source for lineups, bench and substitutions. Third-party pages can fill discovery gaps but are not automatically acceptable for reuse.

### Not proven
- Complete coverage of every match in the 500 completed-match catalogue.
- Complete XI, bench and substitution coverage for every match in the sample.
- A consistent, explicit assist definition across all five leagues.
- A complete current 2026/27 squad list for all 96 clubs.
- Rights to bulk-copy, retain or redistribute any source's report data.
- A stable machine-readable endpoint or export format for all five leagues.

## 5. Data quality and identity rules

1. Match ID must map to the repository's canonical match record; verify date, both teams and final score before accepting player facts.
2. Use provider player IDs where available. Do not merge players by name alone.
3. Record each source URL, source publisher, observation time, match ID and source revision/version if available.
4. Distinguish `starting_xi`, `bench_named`, `substitute_appeared` and `unused_substitute`. Being named on the bench is not an appearance.
5. An appearance is supported by a starting XI or a confirmed substitution onto the pitch. A substitution event must identify the player leaving and entering.
6. Store goals with scorer, minute, team, goal type (`normal`, `penalty`, `own_goal`) and source evidence. Own goals do not count as scorer goals for the player who scored into their own net.
7. Store an assist only where the source explicitly credits the assister. A narrative such as “cross found the scorer” is not enough unless the source explicitly identifies the credited assist.
8. Missing lineup, substitution or assist evidence remains `unknown` / `incomplete`, never zero.
9. A player roster is a separate source from match reports. A player with no appearance may still belong in the team squad list.

## 6. Recommended source strategy

- **Premier League:** use official Premier League match pages or club reports as the primary evidence candidate; keep Guardian/other publishers as cross-check only.
- **La Liga:** official LALIGA match centre is the strongest structured candidate in this sample.
- **Bundesliga:** official matchday live ticker appears rich when available; archive availability and historical lineup rendering need testing.
- **Serie A:** official club match reports are practical; official Lega Serie A PDFs should be evaluated for a standard report contract. Avoid assuming all matchday PDFs are equivalent.
- **Ligue 1:** do not assume league-wide coverage from the Marseille and Brest samples. A club-by-club source audit is needed.

## 7. Next decision

Do not start bulk ingestion or schema implementation yet. First run a focused source-contract test with one match per league using the strongest evidence page:
- verify full XI and full bench;
- verify substitution in/out and minute;
- verify scorer, minute and goal type;
- verify explicit assist field or mark assist unknown;
- verify player IDs or a safe canonical identity mapping;
- check publisher terms and intended retention/use rights.

If that contract passes, prepare a small offline, manual pilot only. Production import still requires separate explicit approval.

## 8. Safety boundary

This phase was a public-web discovery and repository read-only review:
- no provider API calls or credits;
- no paid subscriptions;
- no Supabase Production writes, schema changes, imports, updates or deletes;
- no application code changes or deployment;
- no bulk scraping or automated extraction from the report pages.

**Conclusion:** The 50-match sample supports technical feasibility but not complete coverage. La Liga and Premier League show strong report discovery, Bundesliga has several detailed official tickers, Serie A has broad match-report discovery with mixed source quality, and Ligue 1 remains the weakest. The next phase should validate one representative source contract per league and rights before any data ingestion.
