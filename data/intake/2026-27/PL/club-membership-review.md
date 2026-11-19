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



## 13. Official Premier League squad-number identity cross-check — 19 Nov 2026

A further cross-check compared the staged candidate's player name and shirt number with the Premier League's official all-20-club 2026/27 squad-number publication (published 22 September 2026): https://www.premierleague.com/en/news/4725682

Where both the name and shirt number matched, the CSV row's `identity_status` was set to `identity_confirmed` and the official source was recorded in its notes. This added **326 evidence-backed identity matches across 13 clubs**:

| Club | Exact name + shirt-number matches |
|---|---:|
| Arsenal | 22 |
| Coventry City | 26 |
| Crystal Palace | 27 |
| Everton | 18 |
| Fulham | 27 |
| Hull City | 26 |
| Ipswich Town | 25 |
| Leeds United | 27 |
| Manchester City | 25 |
| Newcastle United | 26 |
| Nottingham Forest | 24 |
| Sunderland | 25 |
| Tottenham Hotspur | 28 |
| **Total** | **326** |

Important limitation: the Premier League article states that its number list includes players from the clubs' 25-man squads and academy players who have appeared or may appear in first-team squads during 2026/27. Therefore, an exact match confirms the candidate's identity against an official club-number record, but this cross-check alone does not distinguish senior registration from U21/academy registration. Accordingly, this batch changed `identity_status` only; it did not change `membership_status`. No-match rows were left untouched and are not treated as proof of departure or former-club status.

The wider row-level review remains incomplete. All 1,091 candidates remain staged and not imported. Permanent Player IDs and appearances/goals/assists remain blank. The 23 existing Thailand national-team records and PFT-000001–PFT-000023 remain untouched.


The Tottenham Hotspur comparison was checked once more against the source's printed player name: the staged `Andrew Robertson` #3 entry matches the Premier League's `Andrew Robertson` #3 listing exactly. It is now included in the identity-confirmed count; the candidate's name was not abbreviated or rewritten.


## 14. Arsenal official PL registration reconciliation — 19 Nov 2026

Arsenal candidate rows were compared with the Premier League's official 2026/27 submitted registration list published 3 September 2026: https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists

Only clear player-name matches were promoted. This adds **21 first-team squad confirmations** and **39 registered U21 contract/scholar confirmations** (60 total). The CSV records now include the PL source and registration classification in their notes, and the corresponding membership_status and identity_status fields were updated. Candidates not matched to the official list remain unchanged; absence from this dated registration snapshot is not proof of departure or lack of academy membership.

The app roster remains a single combined Arsenal roster. U21 is an internal registration status only and does not create a separate roster section. This batch does not add Player IDs or statistics and does not complete the remaining row-level review for Arsenal or the other 19 clubs.


## 15. Five-club official Premier League registration reconciliation — 19 Nov 2026

A further candidate-level comparison was completed against the Premier League's official 2026/27 submitted registration publication (3 September 2026): https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists

Only clear candidate-name matches were promoted, with the registration class taken from the official page. This batch updated 92 rows: **6 first-team registration rows** and **85 U21 contract/scholar registration rows**; one additional Coventry City row (Daniel Bentley) was already identity-confirmed from the earlier squad-number review. The new identity-confirmed total is therefore 669.

| Club | First-team registrations | U21 registrations | Rows updated |
|---|---:|---:|---:|
| Coventry City | 1 | 0 | 1 |
| Crystal Palace | 1 | 33 | 34 |
| Everton | 3 | 25 | 28 |
| Fulham | 1 | 24 | 25 |
| Hull City | 0 | 3 | 3 |
| **Total** | **6** | **85** | **91 new identity confirmations** |

A possible name discrepancy was deliberately left pending: the Hull City candidate Lewis Coyle was not promoted because the official PL registration page spells the registered player Lewie Coyle; no automatic name correction was made. Candidates absent from the PL registration snapshot remain unchanged and are not presumed to have left the club.

Current membership-status totals across all 1,091 staged rows are: 224 first-team confirmed, 133 U21 registration confirmed, 7 academy confirmed, 1 Everton player loaned out, and 726 still listed as candidates pending row-level membership verification. U21 remains an internal status only; the app roster remains one combined club list.

No permanent Player IDs or appearances/goals/assists were added. The 1,091-row intake remains staging-only and has not been imported into the production player database.


## 16. Eight-club official Premier League registration reconciliation — 19 Nov 2026

The next candidate-level batches were compared with the Premier League's 3 September 2026 submitted registration publication: https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists

Clear candidate-name matches were assigned the registration class shown by the official PL source. This added 165 identity-confirmed rows:

| Clubs | First-team registrations | U21 registrations | Rows confirmed |
|---|---:|---:|---:|
| Ipswich Town, Leeds United, Manchester City | 2 | 60 | 62 |
| Newcastle United, Sunderland, Tottenham Hotspur | 2 | 69 | 71 |
| Nottingham Forest, Arsenal | 0 | 32 | 32 |
| **Total** | **4** | **161** | **165** |

Candidates not matched to the published registration list remain pending; absence from this registration snapshot is not evidence that a player has left the club. The check does not add separate U21 app rosters: U21 remains an internal registration status within the combined club list.

After this batch, the 1,091 staged candidates have 834 identity-confirmed rows. Membership statuses are 228 first-team confirmed, 294 U21 registration confirmed, 7 academy confirmed, 1 Everton player loaned out, and 561 candidates still pending row-level membership review. No permanent Player IDs or statistics were added, and no production import occurred.
