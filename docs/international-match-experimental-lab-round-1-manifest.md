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
| INT-R1-011 | International friendly | 2026-11-13 | Argentina vs Uruguay | Estadio Boca Juniors; kickoff time not published in notice | AFA official match ticket notice |
| INT-R1-012 | International friendly | 2026-11-13 | Saudi Arabia vs South Korea | 17:30 Doha; Jassim Bin Hamad Stadium | SAFF official senior-team fixture list |
| INT-R1-013 | International friendly | 2026-11-13 | Qatar vs Australia | 17:45 Doha; Abdullah bin Khalifa Stadium, Doha | QFA official notice |
| INT-R1-014 | International friendly | 2026-11-14 | Japan vs Brazil | 18:15 Singapore (19:15 Japan / 07:15 Brasília); National Stadium, Singapore | JFA and CBF official notices; neutral venue |
| INT-R1-015 | International friendly | 2026-11-17 | Singapore vs Brazil | 18:00 Singapore (07:00 Brasília); National Stadium, Singapore | CBF official notice; neutral venue |

### Fixture sources

- UEFA 2026/27 Nations League fixtures/results by team: https://www.uefa.com/uefanationsleague/news/02a2-1fea7079900a-801b2c5f6c9e-1000--2026-uefa-nations-league-league-phase-fixtures-and-resul/
- AFA Argentina–Uruguay, 13 Nov 2026: https://www.afa.com.ar/es/posts/venta-de-entradas-para-el-encuentro-entre-argentina-y-uruguay
- SAFF senior-team fixtures (Saudi Arabia vs Korea Republic, 13 Nov at 17:30, Jassim Bin Hamad Stadium): https://www.saff.com.sa/en/nationalteams.php?id=1&type=2
- Qatar Football Association: Qatar vs Australia, 13 Nov at 17:45, Abdullah Bin Khalifa Stadium; Qatar vs Korea Republic, 17 Nov: https://www.qfa.qa/news/%D9%85%D9%86%D8%AA%D8%AE%D8%A8%D9%86%D8%A7-%D8%A7%D9%84%D9%88%D8%B7%D9%86%D9%8A-%D9%8A%D8%B9%D8%B2%D8%B2-%D8%AA%D8%AD%D8%B6%D9%8A%D8%B1%D8%A7%D8%AA%D9%87-%D9%84%D9%84%D9%83%D8%A3%D8%B3-%D8%A7%D9%84%D8%A7%D8%B3%D9%8A%D9%88%D9%8A%D8%A9-%D8%A8%D8%AB%D9%84%D8%A7%D8%AB-%D9%85%D8%A8%D8%A7%D8%B1%D9%8A%D8%A7%D8%AA-%D9%88%D8%AF%D9%8A%D8%A9
- Football Australia fixture/results page (Qatar v Australia is displayed as 14 Nov in AEDT, equivalent to 13 Nov in Doha): https://socceroos.com.au/fixtures
- CBF Brazil v Japan (14 Nov, 07:15 Brasília) and Singapore v Brazil (17 Nov, 07:00 Brasília): https://www.cbf.com.br/selecao-brasileira/noticias/selecao-brasileira/noticias/credenciamento-aberto-para-amistosos-da-selecao-brasileira-contra-japao-e-singapura
- JFA Japan national team fixture/results page (Japan v Brazil, 14 Nov, 19:15 Japan time; National Stadium, Singapore): https://jfa.jp/samuraiblue/
- AFA Argentina v Uruguay ticket notice (13 Nov, Estadio Boca Juniors): https://www.afa.com.ar/es/posts/venta-de-entradas-para-el-encuentro-entre-argentina-y-uruguay

**Correction to earlier candidate notes:** QFA confirms Qatar–Australia on 13 Nov at Abdullah Bin Khalifa Stadium (not Jassim Bin Hamad). SAFF independently confirms Saudi Arabia–Korea Republic on 13 Nov at Jassim Bin Hamad Stadium. The JFA lists Japan–Brazil on 14 Nov at 19:15 Japan time (18:15 Singapore), while CBF confirms Singapore–Brazil on 17 Nov at 18:00 Singapore. Australia’s official fixture page displays Qatar–Australia as 14 Nov in AEDT; that is still 13 Nov in Doha. The 15-fixture sample uses the local date at the venue.

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

## 4. Non-UEFA team data sheet — verified records and remaining gaps

Only results with a clear senior men's match, date, and score are listed below. The official federation/association pages are preferred. The records are manual research references for this small internal pilot; before any bulk import or redistribution, review each source's terms and permission basis. Do not scrape or automate extraction.

### Accepted as official-source manual references

| Team | Date | Match | Score | Source |
|---|---:|---|---:|---|
| Saudi Arabia | 23/09/2026 | Saudi Arabia vs Kuwait | 1–0 | SAFF |
| Saudi Arabia | 26/09/2026 | Oman vs Saudi Arabia | 0–3 | SAFF |
| Saudi Arabia | 29/09/2026 | Saudi Arabia vs Iraq | 2–0 | SAFF |
| Saudi Arabia | 03/10/2026 | Saudi Arabia vs Qatar | 0–0 (won 3–2 pens) | SAFF |
| Saudi Arabia | 06/10/2026 | Saudi Arabia vs UAE | 2–0 | SAFF |
| Australia | 25/09/2026 | Australia vs Brazil | 1–1 | Football Australia |
| Australia | 29/09/2026 | Australia vs Brazil | 2–4 | Football Australia |
| Japan | 24/09/2026 | Japan vs Uruguay | 3–1 | JFA |
| Japan | 28/09/2026 | Japan vs Venezuela | 2–1 | JFA |
| Japan | 01/10/2026 | Japan vs Ecuador | 0–0 (won 5–4 pens) | JFA |
| Japan | 05/10/2026 | Japan vs New Zealand | 2–1 | JFA |
| Uruguay | 24/09/2026 | Japan vs Uruguay | 3–1 | AUF |
| Uruguay | 28/09/2026 | Korea Republic vs Uruguay | 1–4 | AUF |
| Brazil | 25/09/2026 | Australia vs Brazil | 1–1 | CBF / Football Australia |
| Brazil | 29/09/2026 | Australia vs Brazil | 2–4 | CBF |
| Brazil | 03/10/2026 | Brazil vs India | 4–0 | CBF |

Official result pages:
- SAFF senior national team match list: https://www.saff.com.sa/en/nationalteams.php?id=1&type=2
- Football Australia match centre, Australia 1–1 Brazil: https://socceroos.com.au/match/australia-v-brazil-friendlies-26-09-2026/22278825
- Football Australia match centre, Australia 2–4 Brazil: https://socceroos.com.au/match/australia-v-brazil-friendlies-29-09-2026/22278826
- JFA SAMURAI BLUE fixtures and results: https://jfa.jp/samuraiblue/
- AUF September–October 2026 senior team results: https://www.auf.org.uy/buscar/Fecha%2BFIFA/pag/2/
- CBF Brazil 2–4 Australia report: https://www.cbf.com.br/selecao-brasileira/noticias/jogos/jogos-selecao-masculina/brasil-vence-a-australia-por-4-a-2
- CBF Brazil 4–0 India report: https://www.cbf.com.br/selecao-brasileira/noticias/jogos-selecao-masculina/a/brasil-goleia-a-india-em-em-calcuta

### Pending official-result verification

| Team | Candidate fixture | Official historical result records accepted | Status |
|---|---|---:|---|
| South Korea | vs Saudi Arabia | 0 | KFA historical result page not yet verified; secondary result listings found but not promoted to accepted records |
| Qatar | vs Australia | 0 | QFA fixture notice verified; recent historical score list not yet verified |
| Argentina | vs Uruguay | 0 | AFA upcoming fixture notice verified; recent historical score list not yet verified |
| Singapore | vs Brazil | 0 | Secondary result listings found; official FAS result source not yet verified |

The official-source count is intentionally uneven: Saudi Arabia 5, Japan 4, Brazil 3 unique matches, Australia 2, Uruguay 2; four teams remain at 0 accepted results. Brazil and Australia share the same two Australia–Brazil matches; those are two match records, not four independent matches. The Brazil–India match is a third distinct record.

Secondary references were located for South Korea, Argentina, and Singapore, but are not accepted into the official-source sheet in this revision. If used later, retain a separate provenance class and permission review rather than silently merging them with official-source records.

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
