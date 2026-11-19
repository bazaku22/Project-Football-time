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
