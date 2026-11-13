# Player Match-Report Coverage Audit — 2026/27

**Review date:** 2026-11-13  
**Scope:** Premier League (PL), La Liga (PD), Bundesliga (BL1), Serie A (SA), Ligue 1 (FL1)  
**Season window checked:** opening match in the current catalogue season through the latest completed match dated 2026-11-08  
**Status:** Phase 1 — database coverage and public-source feasibility; not yet a 500-match event-by-event verification.

## 1. Executive result

The current football database contains all five league season catalogues and 500 completed 2026/27 results through 2026-11-08. It is suitable as the match spine for a new player-statistics system, but it is **not a player-event database**.

The current match rows contain only:
- provider match ID, league and season
- UTC date and match status
- home/away team IDs and historical names
- home/away full-time scores

They contain no starting XI, bench, substitutions, goal events, own-goal/penalty type, scorer IDs, assists or player minutes. The old match database therefore cannot produce appearances, goals or assists on its own.

Public match-report sources exist in all five leagues, with different levels of structure. Serie A currently has the strongest verified example: an official match-report PDF includes starting XI, bench, substitution timeline, goal/own-goal markers and per-player minutes, goals and assists. Other leagues also expose useful match-centre or club-report data, but completeness and assist attribution must be checked per match.

## 2. Current-season match database

Source file: `data/football-database.json`  
Database generated: `2026-11-12T23:44:01Z`  
Provider attribution: football-data.org API v4

| League | Season fixtures in database | Finished through 8 Nov | First completed match date | Latest completed match date |
|---|---:|---:|---|---|
| Premier League | 380 | 100 | 2026-08-21 | 2026-11-08 |
| La Liga | 380 | 119 | 2026-08-15 | 2026-11-08 |
| Bundesliga | 306 | 81 | 2026-08-28 | 2026-11-08 |
| Serie A | 380 | 110 | 2026-08-22 | 2026-11-08 |
| Ligue 1 | 306 | 90 | 2026-08-21 | 2026-11-08 |
| **Total** | **1,752** | **500** | | |

The first completed fixture in each league is present in the database. The counts align with the completed matchweeks through the latest date: 10 Premier League matchweeks, 9 Bundesliga matchdays, 11 Serie A matchdays and 10 Ligue 1 matchdays. La Liga has 119 completed matches through Matchday 12 because one fixture was rescheduled.

### La Liga status mismatch requiring correction

The database stores Rayo Vallecano vs Athletic Club (provider match ID `564698`) with status `CANCELLED` and date `2026-12-09T19:00:00Z`. The official LALIGA Matchday 8 results page lists this fixture for 9 December, i.e. it is rescheduled rather than permanently cancelled. Do not count this as a completed match or a permanently abandoned fixture. The provider status needs reconciliation against the official schedule before downstream coverage calculations.

## 3. Does the current match schema contain player evidence?

No. A representative 2026/27 match object has exactly these fields:

```json
{
  "providerMatchId": 560542,
  "leagueId": "PL",
  "season": "2026-2027",
  "utcDate": "2026-08-21T19:00:00Z",
  "status": "FINISHED",
  "homeTeamId": "football-data:57",
  "awayTeamId": "football-data:1076",
  "homeTeamName": "Arsenal FC",
  "awayTeamName": "Coventry City FC",
  "homeScore": 3,
  "awayScore": 0
}
```

No player facts can be derived from those fields. The new system needs a separate evidence layer based on match reports and lineups.

## 4. Public match-report source feasibility

This is a source-level sample review, not proof that every match in the season has a complete report.

| League | Public source evidence found | Starting XI / bench | Substitutions | Goals / goal type | Assists | Assessment |
|---|---|---|---|---|---|---|
| Premier League | Official Premier League match lineups page and club match reports | Confirmed in sampled match pages | Confirmed in club report / lineup pages | Scorers and minutes available; penalties and own goals can be represented | Explicit assist labels appear in sampled league match page | Strong candidate; test coverage across all 20 clubs |
| La Liga | Official LALIGA match centre and matchday results pages | Starters and substitutes exposed in sampled match page | Match-centre event/change timeline is advertised; verify per match | Scorers and minutes available | Not established consistently by the sample; require explicit event evidence | Promising, but assist completeness needs a dedicated audit |
| Bundesliga | Official Bundesliga matchday live tickers and team-news reports | Starting XI and substitutes exposed | Substitution times/names exposed | Goals and minutes exposed | Explicit assist attribution present in sampled matchday report | Strong candidate; test all 18 clubs and archived reports |
| Serie A | Official Lega Serie A match-report PDFs | Full XI and bench | Timeline includes player in/out and minute | Goal, own goal and penalty markers are defined | Assist markers and per-player assist column are present | Best structured pilot source found |
| Ligue 1 | Official Ligue 1 match reports plus official club lineup/match reports | Confirmed in sampled club reports | Sampled club report includes substitution minutes | Goal scorers and match timeline available | Some reports identify assists, but no complete league-wide sample was established | Feasible as a mixed league/club source; verify coverage club by club |

### Sample references

- Premier League official lineups page: https://www.premierleague.com/en/match/2645195/essenal-vs-coventry-city/lineups
- Manchester United official match report (8 Nov): https://www.manutd.com/en/news/manchester-united-4-aston-villa-4-match-report-8-nov-2026
- LALIGA official match centre sample: https://www.laliga.com/en-GB/match/temporada-2026-2027-laliga-easports-real-sociedad-atletico-de-madrid-5
- Bundesliga official Matchday 9 team report: https://www.bundesliga.com/en/bundesliga/news/team-news-line-ups-2026-27-bayern-dortmund-fantasy-20707
- Bundesliga official Matchday 1 live ticker sample: https://www.bundesliga.com/en/bundesliga/matchday/2026-2027/1/fc-bayern-muenchen-vs-vfb-stuttgart/liveticker/
- Serie A official Torino–Lecce Matchday 11 report: https://images.legaseriea.it/image/private/fl_attachment/prd/d698bc1puseradibrxav.pdf
- Ligue 1 official Marseille–Strasbourg season-opener report: https://ligue1.com/en/articles/l1_article_5715-
- PSG official Ligue 1 match report sample: https://www.psg.fr/en/content/paris-beaten-by-monaco-in-first-home-outing-of-2026-2027-match-report-paris-saint-germain-as-monaco-ligue-1-matchday-3-2026-2027

### What is not yet proven

- That every one of the 500 completed matches has an accessible report.
- That every report includes the full starting XI and full bench.
- That every substitution is recorded with both incoming and outgoing player names and an exact minute.
- That assists are explicitly credited in every report and use a consistent definition across leagues.
- That a public report can be reused to build and retain a private database under the applicable terms.

Do not turn an unavailable field into zero. Missing evidence must remain unknown/incomplete.

## 5. Current player roster coverage is not complete

Existing files checked:
- `data/player-coverage-2026-27.json`
- `data/current-player-squads-2026-27.json`
- `data/player-statistics-intake-2026-27.json`
- `data/player-intake-manifest-2026-27.json`

Current baseline:
- 96 clubs enumerated across the five leagues.
- Only 5 representative club roster pages have been reviewed (Arsenal, Real Madrid, Bayern, Milan and PSG); all are Research Only.
- The sample squad file contains 25 player records, not complete rosters.
- Rights-cleared roster sources: 0/96.
- Verified 2026/27 player memberships in the approved intake manifest: 0/96.
- Player-statistics intake and membership manifest are empty templates.
- No production imports or provider API calls have been made.

The 96-club catalogue must not be mistaken for a 96-club player roster. A separate roster source is still required to include every player name for each team, including players who did not appear in a match.

## 6. API and reuse constraints

The existing football-data.org Free plan covers fixtures, schedules and league tables. Its published pricing lists line-ups, substitutions, goal scorers and squads under the €29/month Free + Deep Data tier, not the €0 Free tier. No paid tier was activated and no provider API calls or credits were used for this audit.

Official league/club pages are useful evidence for research, but this audit does not grant a right to bulk-copy their content or build a retained database from it. The existing project coverage register records zero rights-cleared roster sources. Do not scrape or bulk-copy pages as a workaround. Source/database rights and intended private-use treatment must be reviewed before any ingestion.

## 7. Recommended next steps

1. **Pilot Serie A first** using a small set of official Match Report PDFs because the sampled report provides XI, bench, substitutions, goals, own goals, player minutes and assist fields in one structured document.
2. Build a manual, offline sample set of 10 matches per league (opening, middle and latest matchweeks) and record field-level coverage: XI, bench, substitutions, goals, goal type, assist, player minutes, source URL and observation date.
3. Reconcile every sampled report against the corresponding match ID and both team IDs; never match players by name alone when a stable identity is available.
4. Measure report coverage by club, not only by league. A source that works for one club is not evidence that it works for every club.
5. Keep assists as evidence-backed facts only. If no assister is stated, store unknown rather than infer one.
6. Maintain roster membership separately from match appearances so all squad members can be listed even when they have zero verified appearances.
7. Complete rights review before retaining or importing source data.

## 8. Safety and implementation boundary

This audit was read-only:
- No provider API calls or credits.
- No paid subscription.
- No Supabase Production writes, schema changes, imports, updates or deletes.
- No app code changes or deployment.
- No player-statistics implementation started.

**Conclusion:** The current match database supplies the season fixture/result backbone. Public match reports make the proposed appearances/goals/assists model technically plausible, with Serie A the best first pilot. Full 500-match event coverage and complete 96-club roster coverage are not yet verified; do not start production ingestion until the sample audit and rights gates pass.
