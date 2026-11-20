# Premier League 2026/27 — club membership and roster freshness review

Review date: 2026-11-20  
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


## 17. Further official PL registration reconciliation — 19 Nov 2026

Candidate rows were compared with the Premier League's official 3 Sep 2026 2026/27 squad-list publication: https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists

Only clear candidate-name matches were promoted; senior 25-player registrations and U21 contract/scholar registrations were classified separately. This reconciliation batch confirmed 213 additional candidate identities:

| Clubs | First-team registrations | U21 registrations | Newly confirmed |
|---|---:|---:|---:|
| Aston Villa, Bournemouth, Brentford, Brighton, Chelsea, Crystal Palace | included in aggregate | included in aggregate | included in aggregate |
| Leeds United, Liverpool, Manchester United | included in aggregate | included in aggregate | included in aggregate |
| Fulham, Tottenham Hotspur | included in aggregate | included in aggregate | included in aggregate |
| **Aggregate total** | **5** | **208** | **213** |

The latest combined intake now has **1,047 identity-confirmed rows out of 1,091 (95.97%)**. Membership status totals are 233 first-team confirmed, 502 U21 registration confirmed, 7 academy confirmed, 1 Everton player recorded as loaned out, and 348 candidates still marked as `listed_current_roster` pending additional membership evidence. These categories describe the dated PL registration snapshot, not a guarantee of current squad availability today.

Forty-four candidate identities remain pending. Ambiguous or non-matching names were deliberately not promoted, including Arsenal's short name Gabriel, Hull City's Lewis Coyle / official Lewie Coyle spelling difference, and other unmatched candidate rows. No absence from the 3 Sep registration list is treated as proof of departure.

All rosters remain one combined club list; U21 is internal registration metadata only. No Player IDs or appearances/goals/assists were added. This is still staging-only and has not been imported into the app database.
## 18. Additional official club-source identity reconciliation — 19 Nov 2026

A further review checked the remaining identity-pending rows against official club pages, squad pages and current-season match reports. Thirty-nine additional candidate identities were confirmed and evidence URLs were added to their CSV notes. The resulting identity audit is:

- **1,086 identity-confirmed candidates out of 1,091 (99.54%)**
- **5 identity-pending candidates:** Arsenal — Mylor Bernard; Hull City — Tilen Golič; Ipswich Town — Tom Taylor; Liverpool — Bailey Hall-MacDonald; Sunderland — Juan Riquelme Angulo.
- Jay Spearing's identity is confirmed, but Liverpool's official records identify him as academy staff/player-coach rather than a current registered player. His membership remains pending and he must not be imported as a player without current registration evidence.
- Charlie Scorer's identity is confirmed by Sunderland's official 2026/27 U18 report, which identifies him as an under-16 player. His precise current membership classification remains pending.
- Other confirmed identity evidence was added for Arsenal academy candidates, Brentford B, Brighton, Crystal Palace, Fulham, Hull City, Leeds United, Manchester United, Newcastle United and Sunderland candidates. Only exact or otherwise corroborated matches were promoted; no fuzzy-name assumptions were used.

**Important distinction:** identity confirmation is not the same as confirmation of current player membership. The CSV audit still shows **348 candidates** with `listed_current_roster` status pending further individual membership evidence. The membership counts in `manifest.json` remain unchanged by identity-only confirmations.

No permanent Player IDs were assigned, no appearances/goals/assists were populated, and no production import occurred. All 1,091 candidate rows remain staged in PR #217.
## 19. Final follow-up reconciliation — authoritative totals — 19 Nov 2026

Further official-source checks resolved three more identity rows after section 18:
- Arsenal: the candidate transcribed as Mylor Bernard is corrected to **Mylo Bernard**. UEFA's 2026/27 Youth League profile confirms Arsenal, forward, shirt 65 and England nationality, matching the candidate's other attributes: https://www.uefa.com/uefayouthleague/clubs/players/250217166--mylo-bernard/
- Sunderland: **Juan Riquelme Angulo** is confirmed by Sunderland's official men's team page (shirt 50, striker) and official international roundup (Ecuador), matching the candidate's number, position and nationality. Membership status is now `first_team_member_confirmed`: https://www.safc.com/teams/Men and https://www.safc.com/news/2026/november/18/hume-leads-nation-to-historic-win---sunderland-international-round/

The authoritative identity audit is now **1,088 confirmed of 1,091 (99.73%)**, with **3 pending**: Hull City — Tilen Golič; Ipswich Town — Tom Taylor; Liverpool — Bailey Hall-MacDonald. The candidate Tom Taylor was not matched to Ipswich's official Tommy Taylor profile because the official player's position and other details do not match the staged candidate; no fuzzy-name substitution was made.

Membership totals were updated only for Juan Riquelme Angulo and are now: 234 first-team confirmed; 502 U21 registration confirmed; 7 academy member confirmed; 1 Everton player loaned out; **347 candidates still pending further membership evidence**. The total remains 1,091.

Jay Spearing remains an identity-confirmed but non-player/staff-role warning: Liverpool's official records identify him as an academy coach/player-coach, not a current registered player. Do not import him as a player without current player-registration evidence. Charlie Scorer is identity-confirmed from Sunderland's current-season U18 report; exact membership classification remains pending.

These identity totals do not mean all club membership is complete. All 1,091 records remain staged and not imported. No permanent Player IDs or statistics were added.


## 20. CSV normalization and reconciled audit — 20 Nov 2026

A full integrity repair was completed after the prior audit identified malformed quote/newline handling in several staged CSVs. All 20 club CSVs have now been rewritten in a consistent RFC4180-compatible UTF-8 format: 23 columns per record, all fields quoted, embedded quotes escaped, and one physical line per record. The candidate rows and their evidence notes were preserved; no player was added or removed during normalization.

The normalized dataset reconciles to **1,091 candidate rows across 20 clubs**, with no duplicate player names within a club and no malformed records. The identity totals remain **1,088 identity-confirmed and 3 identity-pending** (Hull City — Tilen Golič; Ipswich Town — Tom Taylor; Liverpool — Bailey Hall-MacDonald).

The membership counts were recalculated from the 20 staged CSVs and supersede earlier counts in sections 17–19 and prior snapshots of this document:
- **509** first-team members confirmed
- **527** U21 registrations confirmed
- **10** academy members confirmed
- **1** Everton player loaned out
- **11** candidates still listed as listed_current_roster, pending individual membership evidence

The five membership categories sum to 1,091. Identity and membership remain separate evidence dimensions. Pending membership rows are not assumed to be former players or current registered players until evidence is reviewed. Appearances, goals and assists remain blank in all 1,091 rows; no permanent Player IDs have been assigned.

This remains **STAGING ONLY — NOT IMPORTED**. PR #217 remains Draft; no production data, existing PFT-000001 through PFT-000023 records, or app storage was changed. CI has not run for the latest draft head, so validation is limited to the completed data/schema audit until a PR-triggered workflow is available.


## 21. Official club membership reconciliation — 20 Nov 2026

A further official-source evidence pass confirmed 11 more candidates from the 22 membership-pending rows. The status changes are recorded in the corresponding CSV rows with official evidence URLs and an observation date of 2026-11-20:

- **First-team members (3):** Walter Benítez (Crystal Palace), Joelinton (Newcastle United), James Maddison (Tottenham Hotspur).
- **Academy members (19):** Harry Lee, Taha Majni, Nathanael Kalembo and Remi Ahazie-Shittu (Crystal Palace); Justin Clarke (Everton); Michael Allen, Marley Clarke and Cooper Covington (Fulham); Roman Egan-Riley and Robbie Cook (Leeds United); Patrik Farkas (Liverpool); Victor Musa, David Eze, Isaac Konde and Karim Cassim (Manchester United); Alfie Hutchinson (Newcastle United); Aaron Bott (Nottingham Forest); Charlie Scorer and James Barker (Sunderland).

For Newcastle, the official profiles identify Joelinton as a midfielder and Alfie Hutchinson as a forward; their position codes were corrected accordingly. No other candidate names or positions were changed in this batch.

The updated membership totals are **519 first-team confirmed; 528 U21 registration confirmed; 32 academy members confirmed; 11 listed_current_roster pending; and 1 Everton player loaned out**. These categories sum to 1,091. The 11 remaining pending candidates are not assumed to be former players or current registered players without individual evidence. The three identity-pending candidates remain unchanged: Hull City — Tilen Golič; Ipswich Town — Tom Taylor; Liverpool — Bailey Hall-MacDonald.

The evidence pass used current official club squad pages, academy profiles and 2026/27 match reports. It does not assign permanent Player IDs or populate appearances, goals or assists. All 1,091 rows remain staging-only and have not been imported.


## 22. Further official-source membership reconciliation — 20 Nov 2026

A further evidence pass confirmed 11 candidates and reduced the membership-pending queue from 22 to **11**:

- **First-team squad listings (7):** Kaine Kesler-Hayden (Coventry City); Ryan Giles, Elliot Stroud, Matt Crooks, Regan Slater and Tim Iroegbunam (Hull City); Fraser Barnsley (Everton). Exact names and shirt numbers were cross-checked against the Premier League's official 2026/27 squad-number publication.
- **U21 squad participation (1):** Ben Barclay, confirmed as Brighton's men's U21 overage player/mentor and appearing in the club's 2026/27 PL2 match coverage.
- **Academy membership (3):** Isaac Silva (Chelsea U18), Adler Nascimento (Crystal Palace U21) and Jayden Koussou (Newcastle U18). Newcastle's current official U18 squad page spells the name **Jayden Kouossu**; the staged name field was corrected to match the current club spelling.

**Identity caution:** Bailey Hall-MacDonald remains pending. Liverpool's official Academy sources confirm a goalkeeper named Bailey Hall, but do not establish that this is the same person as the candidate Bailey Hall-MacDonald. The two names have not been conflated, and the candidate remains pending identity review.

The updated totals are **519 first-team confirmed; 528 U21 registrations confirmed; 32 academy members confirmed; 11 listed_current_roster pending; and 1 Everton player loaned out** (1,091 total). Identity remains 1,088 confirmed and 3 pending. No permanent Player IDs or player statistics were added. All rows remain staging-only and are not imported.
