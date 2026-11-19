# Premier League 2026/27 — official registration cross-check queue

Review date: 2026-11-19  
Dataset: `data/intake/2026-27/PL/`  
Status: REVIEW QUEUE ONLY — NOT A REMOVAL LIST; NOT IMPORTED

## Official baseline

The Premier League publication dated 3 September 2026 provides each club's submitted first-team squad and a separate list of registered U21 players (contract and scholars). It is a dated registration snapshot, not a live club academy directory and not proof that a name absent from that publication has left the club.

Official source: https://www.premierleague.com/en/news/4706139/see-all-the-202627-premier-league-squad-lists

The official 22 September 2026 squad-number publication is a useful additional check for players included in its numbering list, but it is not a complete academy roster:
https://www.premierleague.com/en/news/4725682

## Candidate rows requiring a second source check

The following names appear in the staged FootballSquads transcription but were not located by name in the corresponding club section of the 3 September Premier League registration publication. This is a review queue only. It does NOT mean these players are no longer attached to the club. Check the club's current official men's/academy page and any subsequent official transfer/loan announcement before changing membership.

| Club | Candidate name as staged | Why held |
|---|---|---|
| Manchester City | Josh Wilson-Esbrand | Not present on the current official men's first-team or EDS squad pages, nor in the 2026/27 PL registration list; latest official loan coverage found relates to 2025/26 only. Current 2026/27 club/academy status remains unresolved; do not assume departure |

## Candidate checks resolved by current official club evidence

These five candidates were absent from the 3 September PL registration snapshot, but subsequent/current official club evidence confirms their club association. They are removed from the *hold queue*, not promoted to fully reconciled player identity records; their staged CSV identity status remains pending and no permanent Player IDs are assigned.

| Club | Candidate | Official evidence | Review outcome |
| Nottingham Forest | John → John Victor | First-team identity confirmed: official Forest and PL squad pages list John Victor as shirt 12 Brazilian goalkeeper; staged row matched shirt 12, BRA and goalkeeper. CSV canonical name updated to John Victor. |
|---|---|---|---|
| Chelsea | Leo Black | Chelsea announced his signing through 2028 on 29 Sep 2026: https://www.chelseafc.com/en/news/article/leo-black-signs-for-chelsea | Chelsea affiliation confirmed; academy/Next Gen context |
| Chelsea | Jacob Dako | Chelsea U18 match reports list him in the team and record his goals on 17 and 24 Oct 2026: https://www.chelseafc.com/en/news/article/under-18-premier-league-report-west-bromwich-albion-3-5-chelsea and https://www.chelseafc.com/en/news/article/under-18-premier-league-report-chelsea-4-1-ipswich-town | Chelsea U18 participation confirmed |
| Chelsea | Josh Henry | Chelsea's 12 Nov international call-up article identifies him in England U17; Chelsea's 7 Nov U18 match report also lists him: https://www.chelseafc.com/en/news/article/chelsea-international-call-ups-and-schedules-for-november-2026 and https://www.chelseafc.com/en/match/chelsea-u18-vs-charlton-athletic-u18-english-u18-premier-league-cup-2026-11-07 | Chelsea academy affiliation confirmed |
| Everton | Tyrique George | Everton's current 2026/27 Premier League squad page lists him in the first-team forwards: https://www.premierleague.com/en/clubs/11/news/squad | Current Everton first-team listing confirmed |
| Newcastle United | Scott Bailey | Newcastle's official U21 squad page lists him; official profile confirms DOB 22 Jan 2006 and academy history: https://www.newcastleunited.com/en/teams/U21 and https://www.newcastleunited.com/en/teams/U21/scott-bailey | Newcastle U21 affiliation confirmed |


## Resolved by official club/competition evidence — 2026-11-19

These records are removed from the hold queue, not from the dataset. CSV rows now carry evidence links and a more precise membership status:

| Club | Player | Reconciled status | Evidence |
|---|---|---|---|
| Chelsea | Leo Black | Academy member confirmed (Cobham Next Gen) | Chelsea signing announcement, 29 Sep 2026; Chelsea PL2 team sheet |
| Chelsea | Jacob Dako | Academy member confirmed (U18) | Chelsea U18 match reports, 17 and 24 Oct 2026 |
| Chelsea | Josh Henry | Academy member confirmed (UEFA Youth League squad) | UEFA Chelsea Youth League squad |
| Everton | Luca Davis | Everton player, loaned to Morecambe until Jan 2027 | Morecambe loan announcement, 15 Oct 2026 |
| Everton | Tyrique George | First-team member confirmed | Everton men's team page and 2 Nov 2026 team sheet |
| Newcastle United | Scott Bailey | Academy/U21 member confirmed | Newcastle U21 profile and current U21 squad page |
| Nottingham Forest | Jaxon Tomak | Academy/U21 member confirmed | Newcastle U21 match report identifies him in Forest U21 team and records his goal |
| Nottingham Forest | Azae Bonnick | Academy/B team member confirmed | Forest academy announcement, 22 Oct 2026 |

The statuses distinguish club attachment from registration in the Premier League's dated senior/U21 list. Luca Davis remains an Everton player on loan; do not count him as currently available to Everton's first team.

## Interpretation and safe handling

1. Keep all rows in the intake as candidates until a club source resolves them. Do not delete, merge, or reassign a club based only on absence from the dated PL list.
2. Where a name is ambiguous (for example, Forest's `John`), do not match it to a similarly named player without corroborating details such as full name, date of birth, position, or official profile.
3. Record official club evidence and the observation date on each resolved row. Keep the original FootballSquads source and attribution intact.
4. Distinguish first-team registration, U21 registration, broader academy membership, loan, and former-club status. Do not create a separate U21 display category in the app; this is an internal evidence/status distinction only.
5. Do not assign permanent Player IDs or populate appearances, goals, or assists in this review.
6. Do not import the 1,091 staged candidates into `data/player-database-v2.json` until the row-level review and validation gates are complete.

## Scope limitation

This pass establishes the official PL registration baseline, resolves five initial hold-queue entries using current official club evidence, and leaves five entries in the explicit hold queue (Everton's Luca Davis; Manchester City's Josh Wilson-Esbrand; Nottingham Forest's John, Jaxon Tomak and Azae Bonnick). Only one explicit hold remains: Manchester City's Josh Wilson-Esbrand. Nottingham Forest's short-name row `John` was reconciled to John Victor using the exact shirt number, nationality, position and current official club/PL squad listings. It does not claim that all 1,091 candidate identities and memberships have been individually verified. All other candidates continue to carry their existing pending review status.

FootballSquads attribution remains:
`Source of Material is http://www.footballsquads.com. Material: © FootballSquads.com, 1999 - , All Rights Reserved`
