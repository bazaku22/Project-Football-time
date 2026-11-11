# International Match Experimental Lab — Round 1 Manifest & Team Data Sheet

**Status:** Draft for review  
**Cut-off:** 2026-11-12 (Asia/Bangkok)  
**Scope:** 15 selected senior men's international fixtures (10 UEFA Nations League + 5 friendlies)  
**Purpose:** Isolated experimental dataset only. This document does not authorize app changes, ingestion, API calls, scheduled jobs, database writes, or production changes.

## 1. Data handling rules

- Use senior men's national-team matches only. Do not mix youth, women's, club, or unofficial matches.
- Use only information that is publicly accessible and whose use is permitted. Prefer official competition/federation sources.
- No scraping, automated extraction, reverse-engineered endpoints, or copying protected assets/content without permission.
- Keep the original source URL, source name, retrieval timestamp, timezone, and usage basis for every imported record.
- A fixture or result being publicly visible does not automatically grant permission for bulk storage, redistribution, or commercial reuse.
- Missing fields remain null/unknown. Never infer venue, neutral status, lineups, injuries, or kickoff time.
- Results listed below are the four 2026/27 UEFA Nations League matches published by UEFA before the Round 1 cutoff. They are not claimed to be each team's four most recent senior internationals across all competitions.
- Do not use any Round 1 fixture result or post-kickoff information as a pre-match feature.
- Keep international data, predictions, and evaluation separate from the stable club dataset and club model.

## 2. Round 1 fixture manifest

Kickoff times are shown in the source timezone when available. UEFA times are CET; Thailand time (ICT, UTC+7) is also shown. Friendly kickoffs are left pending when the official source reviewed did not publish a time.

| ID | Competition | Date (local) | Fixture | Kickoff / venue | Source status |
|---|---|---:|---|---|---|
| INT-R1-001 | UEFA Nations League | 2026-11-12 | Türkiye vs Belgium | 18:00 CET / 00:00 ICT on Nov 13 | Official UEFA fixture |
| INT-R1-002 | UEFA Nations League | 2026-11-12 | Italy vs France | 20:45 CET / 02:45 ICT on Nov 13 | Official UEFA fixture |
| INT-R1-003 | UEFA Nations League | 2026-11-12 | Czechia vs Spain | 20:45 CET / 02:45 ICT on Nov 13 | Official UEFA fixture |
| INT-R1-004 | UEFA Nations League | 2026-11-12 | England vs Croatia | 20:45 CET / 02:45 ICT on Nov 13 | Official UEFA fixture |
| INT-R1-005 | UEFA Nations League | 2026-11-13 | Netherlands vs Greece | 20:45 CET / 02:45 ICT on Nov 14 | Official UEFA fixture |
| INT-R1-006 | UEFA Nations League | 2026-11-13 | Serbia vs Germany | 20:45 CET / 02:45 ICT on Nov 14 | Official UEFA fixture |
| INT-R1-007 | UEFA Nations League | 2026-11-14 | Norway vs Wales | 18:00 CET / 00:00 ICT on Nov 15 | Official UEFA fixture |
| INT-R1-008 | UEFA Nations League | 2026-11-14 | Portugal vs Denmark | 20:45 CET / 02:45 ICT on Nov 15 | Official UEFA fixture |
| INT-R1-009 | UEFA Nations League | 2026-11-15 | Belgium vs Italy | 20:45 CET / 02:45 ICT on Nov 16 | Official UEFA fixture |
| INT-R1-010 | UEFA Nations League | 2026-11-15 | Spain vs England | 20:45 CET / 02:45 ICT on Nov 16 | Official UEFA fixture |
| INT-R1-011 | International friendly | 2026-11-13 | Argentina vs Uruguay | Kickoff/venue pending verification | AFA official match ticket notice |
| INT-R1-012 | International friendly | 2026-11-13 | Saudi Arabia vs South Korea | Kickoff/venue pending verification | SAFF official training-camp notice |
| INT-R1-013 | International friendly | 2026-11-13 | Qatar vs Australia | 17:45 Qatar local; Jassim bin Hamad Stadium, Doha | Football Australia official notice |
| INT-R1-014 | International friendly | 2026-11-14 | Brazil vs Japan | 07:15 Brasília; National Stadium, Singapore | CBF official notice |
| INT-R1-015 | International friendly | 2026-11-17 | Singapore vs Brazil | 07:00 Brasília; National Stadium, Singapore | CBF official notice |

### Fixture sources

- UEFA 2026/27 Nations League fixtures/results by team: https://www.uefa.com/uefanationsleague/news/02a2-1fea7079900a-801b2c5f6c9e-1000--2026-uefa-nations-league-league-phase-fixtures-and-resul/
- AFA Argentina–Uruguay, 13 Nov 2026: https://www.afa.com.ar/es/posts/venta-de-entradas-para-el-encuentro-entre-argentina-y-uruguay
- SAFF November senior-team camp; South Korea on 13 Nov and Uzbekistan on 17 Nov: https://www.saff.com.sa/en/news.php?id=4448
- Football Australia: Qatar v Australia on 13 Nov and Jordan v Australia on 17 Nov: https://footballaustralia.com.au/news/commbank-socceroos-face-qatar-and-jordan-ahead-afc-asian-cup-2027tm
- CBF Brazil v Japan (14 Nov) and Singapore v Brazil (17 Nov): https://www.cbf.com.br/selecao-brasileira/noticias/noticias/a/credenciamento-aberto-para-amistosos-da-selecao-brasileira-contra-japao-e-singapura

**Correction to earlier candidate notes:** Australia’s official November opponents are Qatar (13 Nov) and Jordan (17 Nov), not Qatar on 14 Nov as previously noted. CBF confirms Brazil–Japan on 14 Nov and Singapore–Brazil on 17 Nov. Saudi Arabia’s official notice confirms South Korea on 13 Nov and Uzbekistan on 17 Nov. The Round 1 selection includes only the five listed friendly fixtures; the additional matches are not part of the 15-fixture sample.

## 3. UEFA team data sheet — corrected from the official UEFA match list

Source: UEFA's official 2026/27 Nations League league-phase fixtures and results, last updated 11 November 2026 (URL below). The following are each selected UEFA team's four completed Nations League matches from Matchdays 1–4. Dates use day/month; scores are full-time scores shown by UEFA.

| Team | Date | Match | Score |
|---|---:|---|---:|
| Türkiye | 25/09 | Türkiye vs France | 0–1 |
| Türkiye | 28/09 | Türkiye vs Italy | 1–4 |
| Türkiye | 02/10 | Belgium vs Türkiye | 3–0 |
| Türkiye | 05/10 | Italy vs Türkiye | 3–1 |
| Belgium | 25/09 | Italy vs Belgium | 0–2 |
| Belgium | 28/09 | Belgium vs France | 0–1 |
| Belgium | 02/10 | Belgium vs Türkiye | 3–0 |
| Belgium | 05/10 | France vs Belgium | 4–1 |
| Italy | 25/09 | Italy vs Belgium | 0–2 |
| Italy | 28/09 | Türkiye vs Italy | 1–4 |
| Italy | 02/10 | France vs Italy | 1–1 |
| Italy | 05/10 | Italy vs Türkiye | 3–1 |
| France | 25/09 | Türkiye vs France | 0–1 |
| France | 28/09 | Belgium vs France | 0–1 |
| France | 02/10 | France vs Italy | 1–1 |
| France | 05/10 | France vs Belgium | 4–1 |
| Czechia | 26/09 | Czechia vs Croatia | 1–2 |
| Czechia | 29/09 | Czechia vs England | 0–2 |
| Czechia | 03/10 | Spain vs Czechia | 3–1 |
| Czechia | 06/10 | England vs Czechia | 3–0 |
| Spain | 26/09 | England vs Spain | 2–3 |
| Spain | 29/09 | Spain vs Croatia | 4–1 |
| Spain | 03/10 | Spain vs Czechia | 3–1 |
| Spain | 06/10 | Croatia vs Spain | 1–2 |
| England | 26/09 | England vs Spain | 2–3 |
| England | 29/09 | Czechia vs England | 0–2 |
| England | 03/10 | Croatia vs England | 0–7 |
| England | 06/10 | England vs Czechia | 3–0 |
| Croatia | 26/09 | Czechia vs Croatia | 1–2 |
| Croatia | 29/09 | Spain vs Croatia | 4–1 |
| Croatia | 03/10 | Croatia vs England | 0–7 |
| Croatia | 06/10 | Croatia vs Spain | 1–2 |
| Netherlands | 24/09 | Netherlands vs Germany | 1–1 |
| Netherlands | 27/09 | Serbia vs Netherlands | 1–2 |
| Netherlands | 01/10 | Greece vs Netherlands | 2–2 |
| Netherlands | 04/10 | Netherlands vs Serbia | 2–1 |
| Greece | 24/09 | Serbia vs Greece | 1–2 |
| Greece | 27/09 | Germany vs Greece | 0–1 |
| Greece | 01/10 | Greece vs Netherlands | 2–2 |
| Greece | 04/10 | Greece vs Germany | 0–0 |
| Serbia | 24/09 | Serbia vs Greece | 1–2 |
| Serbia | 27/09 | Serbia vs Netherlands | 1–2 |
| Serbia | 01/10 | Germany vs Serbia | 2–0 |
| Serbia | 04/10 | Netherlands vs Serbia | 2–1 |
| Germany | 24/09 | Netherlands vs Germany | 1–1 |
| Germany | 27/09 | Germany vs Greece | 0–1 |
| Germany | 01/10 | Germany vs Serbia | 2–0 |
| Germany | 04/10 | Greece vs Germany | 0–0 |
| Norway | 24/09 | Norway vs Denmark | 3–2 |
| Norway | 27/09 | Norway vs Portugal | 1–2 |
| Norway | 01/10 | Wales vs Norway | 2–1 |
| Norway | 04/10 | Portugal vs Norway | 2–1 |
| Wales | 24/09 | Portugal vs Wales | 1–0 |
| Wales | 27/09 | Denmark vs Wales | 2–0 |
| Wales | 01/10 | Wales vs Norway | 2–1 |
| Wales | 04/10 | Wales vs Denmark | 0–1 |
| Portugal | 24/09 | Portugal vs Wales | 1–0 |
| Portugal | 27/09 | Norway vs Portugal | 1–2 |
| Portugal | 01/10 | Denmark vs Portugal | 2–4 |
| Portugal | 04/10 | Portugal vs Norway | 2–1 |
| Denmark | 24/09 | Norway vs Denmark | 3–2 |
| Denmark | 27/09 | Denmark vs Wales | 2–0 |
| Denmark | 01/10 | Denmark vs Portugal | 2–4 |
| Denmark | 04/10 | Wales vs Denmark | 0–1 |

The matchday results are repeated under both participating teams for team-level lookup. A normalized match dataset must store each match once and link both team records to the same match ID.

**Important audit correction:** The prior draft contained several incorrect team/opponent/score pairings. This section supersedes that earlier table and is transcribed from UEFA's matchday list, not inferred from standings or secondary summaries.

## 4. Non-UEFA team data sheet — source audit status

The following nine teams form the five selected friendlies. At this document revision, their recent historical results have **not** been accepted into the dataset because a source-by-source result audit with clear match date, senior-team status, score, and permitted reuse basis has not yet been completed.

| Team | Candidate fixture | Historical result records accepted | Status |
|---|---|---:|---|
| Saudi Arabia | vs South Korea | 0 | Pending official historical-results audit |
| South Korea | vs Saudi Arabia | 0 | Pending official historical-results audit |
| Qatar | vs Australia | 0 | Pending official historical-results audit |
| Australia | vs Qatar | 0 | Pending official historical-results audit |
| Argentina | vs Uruguay | 0 | Pending official historical-results audit |
| Uruguay | vs Argentina | 0 | Pending official historical-results audit |
| Japan | vs Brazil | 0 | Pending official historical-results audit |
| Brazil | vs Japan; Singapore | 0 | Pending official historical-results audit |
| Singapore | vs Brazil | 0 | Pending official historical-results audit |

This is intentional. Do not carry forward unsourced score examples from earlier chat summaries. The previous informal list included results that were not adequately verified against the original sources and is superseded by this audit status.

## 5. Fields to collect when evidence is available

For each match record:
- Internal namespaced match ID
- Match date and kickoff timestamp (UTC plus source timezone)
- Competition / match type (Nations League, friendly, qualifier, tournament)
- Home team, away team, score, match status
- Venue and neutral-ground flag only when explicitly supported
- Regulation-time score and extra-time / penalty result stored separately
- Source name, source URL, retrieved timestamp, source timezone
- Usage basis and permission status
- Data confidence / notes

For each team-match pre-match feature:
- Last available senior international matches (do not force 5 or 10)
- Goals for / against and sample count
- Home / away / neutral split only where venue status is known
- H2H only where enough verified records exist
- FIFA ranking and ranking publication date only when a dated source is available
- Squad availability only from confirmed pre-match announcements

## 6. Readiness policy

- **Ready for basic form features:** at least one verified prior senior international result, with sample size displayed.
- **Limited:** sparse results, uncertain venue classification, or missing context. Use only supported features.
- **Insufficient:** no verified prior results or material source conflict. Do not generate a model prediction.
- Readiness is separate from probability confidence.
- Fifteen fixtures are a pilot sample, not enough to claim model superiority. Report Brier score, log loss, calibration, sample count, and uncertainty separately.
- Separate Nations League and friendly evaluations where sample size allows.
- Do not tune the model on the same small sample and then present the result as out-of-sample performance.

## 7. Explicitly out of scope

No app code, production database, Local Storage, Supabase, existing club model, existing club snapshots, API provider, API quota, scheduled workflow, polling, scraping, data ingestion, or new recurring cost is changed or authorized by this document.
