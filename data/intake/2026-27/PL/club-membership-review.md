# Premier League 2026/27 — club membership and roster freshness review

Review date: 2026-11-19  
Dataset status: STAGING ONLY — NOT IMPORTED

## 1. Competition and club-set check

The Premier League's official 2026/27 squad-list publication (3 September 2026) lists the registered first-team squads and eligible U21 players for the season. The official Premier League 2026/27 table currently shows the 20 clubs represented in this intake. The 20 club names in `manifest.json` align with that official competition set:

Arsenal; Aston Villa; AFC Bournemouth; Brentford; Brighton & Hove Albion; Chelsea; Coventry City; Crystal Palace; Everton; Fulham; Hull City; Ipswich Town; Leeds United; Liverpool; Manchester City; Manchester United; Newcastle United; Nottingham Forest; Sunderland; Tottenham Hotspur.

This confirms the club set for the season. It does NOT certify every individual CSV row as a current first-team or academy member.

## 2. Player-level membership status

All 1,091 CSV rows remain candidate records. Individual identity and current-club membership are not promoted to verified solely because a name appears in a FootballSquads roster transcription. Reconcile each candidate against the official Premier League squad publication and/or the club's current official men's/academy squad page. Distinguish:
- registered senior squad members;
- U21/academy players attached to the club;
- players listed as out on loan;
- former players or historical entries;
- ambiguous or conflicting source records.

Do not remove a candidate or change club membership without a clear source record. Do not assign permanent Player IDs during this review.

## 3. Freshness

The intake manifest contains explicit FootballSquads page update dates for only 4 of 20 clubs (Arsenal, Aston Villa, AFC Bournemouth and Brentford). The other 16 dates are null because a reliable page-update date was not verified. Null means unknown, not current. Therefore the roster collection date (2026-11-19) must not be represented as the source's own update date.

Where an official club or Premier League source provides a later and clearer membership record, record the source and observation date separately rather than overwriting the FootballSquads provenance.

## 4. Chelsea shirt-number clarification — resolved

The user flagged that Chelsea's current No. 1 shirt belongs to Martínez. This is now independently confirmed by:
- Premier League's all-20-club 2026/27 squad-number list, published 22 September 2026, which lists Emiliano Martínez as Chelsea No. 1: https://www.premierleague.com/en/news/4725682
- Chelsea FC's official update, 4 September 2026, stating Emiliano Martínez switched to No. 1 after Robert Sánchez's loan move to Como: https://www.chelseafc.com/en/news/article/emi-martinez-changes-chelsea-squad-number

The older 19 August squad-number announcement naming Robert Sánchez is superseded for the current shirt-number field. Chelsea's candidate CSV now records the later official evidence. This resolves the shirt-number discrepancy; it does not certify every Chelsea candidate's identity or current membership.

## 5. Identity collision already resolved

Ben Wilson in Brentford and Ben Wilson in Coventry City are distinct people:
- Brentford B midfielder, born 2008-08-12.
- Coventry City goalkeeper, born 1992-08-09.

Both remain separate candidates. The CSV records carry the resolution evidence. This does not imply other identities have been reconciled.

## 6. Safe handling / next gate

- Preserve PFT-000001 through PFT-000023.
- No permanent Player IDs assigned to these candidates.
- Appearances, goals and assists remain blank.
- Do not import the 1,091 candidates into the production player database.
- Complete row-level identity and membership review, record evidence and source dates, then run schema/data validation and CI before asking for merge approval.

## Sources

- Premier League, "See all the 2026/27 Premier League squad lists", published 3 September 2026: https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists
- Premier League, all 20 clubs' 2026/27 squad numbers, published 22 September 2026: https://www.premierleague.com/en/news/4725682
- Chelsea FC, Emi Martinez changes Chelsea squad number, 4 September 2026: https://www.chelseafc.com/en/news/article/emi-martinez-changes-chelsea-squad-number
- Premier League, 2026/27 table: https://www.premierleague.com/en/tables/premier-league/2026-27?ha=H
- Chelsea FC, "Chelsea squad numbers confirmed for the 2026/27 season", 19 August 2026: https://www.chelseafc.com/en/news/article/chelsea-squad-numbers-confirmed-for-the-2026-27-season
- FootballSquads 2026/27 source index: https://www.footballsquads.co.uk/eng/2026-2027/engprem.htm

FootballSquads attribution remains as recorded in the manifest and intake documentation.

## 7. Official Premier League registration cross-check — review queue opened

The official 3 September 2026 PL registration publication has now been used as a dated baseline for the 20 club sections. A separate hold queue records candidate names not located in that publication and an ambiguous Nottingham Forest entry (`John`). These are **not removals**: the PL page lists submitted senior squads and registered U21 contract/scholar players, not every academy player. Each held name must be checked against the club's current official men's/academy source before membership is changed.

See [official-pl-registration-review-queue.md](official-pl-registration-review-queue.md) for the explicit candidates and safe-handling rules. This is a partial row-level check, not certification of all 1,091 candidates. All unreviewed rows remain pending; no Player IDs, statistics, or production imports were added.


## 8. Candidate-level official source reconciliation — 19 Nov 2026

A second-source review resolved eight of the earlier hold-queue entries without deleting any candidate:
- Chelsea academy: Leo Black, Jacob Dako and Josh Henry.
- Everton: Tyrique George is confirmed in the first-team group; Luca Davis is confirmed as an Everton player currently loaned to Morecambe until January 2027.
- Newcastle United: Scott Bailey is confirmed in the U21 squad.
- Nottingham Forest: Jaxon Tomak is identified in a Forest U21 match report; Azae Bonnick is confirmed by the club as a Forest B Team player.

The CSV rows now carry explicit membership statuses and official evidence URLs. At the time of this review, Manchester City's Josh Wilson-Esbrand and Nottingham Forest's short-name entry `John` remained unresolved; both were subsequently reconciled in sections 9 and 10 below.

This is still a partial review, not verification of all 1,091 candidates. The dated Premier League list remains a registration snapshot, not a full academy directory. No permanent Player IDs or player statistics were added; no production database import occurred.


## 9. Nottingham Forest short-name identity resolved — 19 Nov 2026

The staged candidate `John` (shirt 12, goalkeeper, Brazil) is reconciled to **John Victor**. Nottingham Forest's current official men's first-team page and the official 2026/27 Premier League squad page identify John Victor as the club's No.12 Brazilian goalkeeper. The shirt number, position and nationality match the staged candidate, so the canonical player-name field in the Forest CSV is now `John Victor`; the source-name field retains `John` for traceability.

Evidence:
- https://www.nottinghamforest.co.uk/teams/
- https://www.premierleague.com/en/clubs/17/nottingham-forest/squad
- https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists

At the time of this section's initial check, Josh Wilson-Esbrand's 2026/27 status remained unresolved. A subsequent current-season official EDS match report resolved this; see section 10 below.


## 10. Manchester City EDS membership resolved — 19 Nov 2026

The remaining Josh Wilson-Esbrand hold is resolved. Manchester City's official 2026/27 Vertu Trophy match report for the match at Mansfield identifies **Joshua Wilson-Esbrand** in City's EDS match squad. This is a current-season official club match report and matches the staged candidate's full identity. The Manchester City CSV row is now marked `academy_member_confirmed` and `identity_confirmed`.

Evidence:
- https://live.mancity.com/news/eds-academy/mansfield-v-manchester-city-vertu-trophy-match-report-63922753

The initial 10-entry official registration hold queue is now resolved. This does not mean all 1,091 roster candidates have been individually reconciled; the wider row-level review remains incomplete. No permanent Player IDs or player statistics were added, and no production import occurred.


## 11. Current official first-team roster cross-check — 19 Nov 2026

A further four-club batch was checked against current official club squad pages or the club's published 2026/27 first-team squad-number list. Candidate rows were promoted only where both the player name and shirt number matched the official source. This batch confirms **110 first-team entries**:

| Club | Candidate rows matched | Official source |
|---|---:|---|
| Aston Villa | 28 | https://www.avfc.co.uk/teams/ |
| AFC Bournemouth | 28 | https://www.afcb.co.uk/teams/ |
| Brentford | 28 | https://www.brentfordfc.com/en/teams/mens and https://www.brentfordfc.com/en/news/first-team-2026-27-premier-league-squad-numbers-confirmed |
| Brighton & Hove Albion | 26 | https://www.brightonandhovealbion.com/media-article/mft-news-kit-numbers-premier-league-2026-27-season-august-2026 |

The matching CSV rows now carry `first_team_member_confirmed` and `identity_confirmed`, with evidence URLs in the notes field. Rows that did not match both name and shirt number were left unchanged; non-matches are not automatically treated as former players or departures.

This is a targeted confirmation batch, not a complete review of each club's entire senior and academy population. It does not validate all remaining candidates, nor does it establish player statistics. No permanent Player IDs or appearances/goals/assists were added, and no production import occurred.


## 12. Three-club official men's squad / PL registration cross-check — 19 Nov 2026

A further batch was reconciled against official current club squad sources. Rows were updated only when the candidate name and shirt number matched the official page.

| Club | Rows confirmed | Evidence |
|---|---:|---|
| Chelsea | 30 | https://www.chelseafc.com/en/teams/mens-profiles |
| Liverpool | 32 | https://www.liverpoolfc.com/teams/mens-team |
| Manchester United | 23 first-team squad entries; 9 U21-registration entries | https://www.manutd.com/en/news/premier-league-squad-confirmed-for-2026-27 and https://www.manutd.com/en/news/confirmed-our-2026-27-squad-numbers |

For Manchester United, the official Premier League submission distinguishes the 25-man senior list from the U21 registration group. The nine candidates in the U21 registration group (Leny Yoro, Ayden Heaven, Harry Amass, Kobbie Mainoo, Jack Fletcher, Tyler Fletcher, Tynan Thompson, Shea Lacey and JJ Gabriel) now carry the internal status `u21_registration_confirmed`. This is only an evidence/status distinction; the app continues to use one combined club roster and no separate U21 display category.

The Chelsea and Liverpool official men's squad pages include the club's current men's squad listing; this check confirms club squad membership and name/number matching, not an assertion that every listed player is a regular senior first-team selection. Rows not matched on both name and number remain unchanged.

