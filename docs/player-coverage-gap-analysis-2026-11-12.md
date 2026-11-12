# Five-league 2026/27 player coverage gap register

**Review date:** 2026-11-12  
**Season:** 2026/27  
**Scope:** first-team club universe for Premier League, La Liga, Bundesliga, Serie A and Ligue 1.

## Decision

The club universe is now enumerated as **96 clubs across five leagues**. This is a club-catalogue baseline, not a player roster database.

- Club catalogue rows: 96/96 recorded against season-labelled league sources.
- Club roster-source reviews: 5/96 representative clubs reviewed (one per league), all **Research Only**.
- Clubs with rights-cleared roster source: 0/96.
- Clubs with verified 2026/27 player memberships in the approved intake manifest: 0/96.
- Production imports: 0; provider API calls: 0; recurring provider cost: 0 THB/month.

The 5 reviewed representative club pages are Arsenal, Real Madrid, FC Bayern München, Milan and Paris Saint-Germain. They establish that a season-labelled squad view exists for those clubs, but do not establish a complete registered squad or reuse rights. Do not generalize these pilots to the other 91 clubs.

## League coverage

| League | Expected clubs | Catalogue rows | Representative roster view | Roster rights | Membership data |
|---|---:|---:|---|---|---|
| Premier League | 20 | 20 | Arsenal — research only | Not cleared | 0 verified |
| La Liga | 20 | 20 | Real Madrid — research only | Not cleared | 0 verified |
| Bundesliga | 18 | 18 | FC Bayern München — research only | Not cleared | 0 verified |
| Serie A | 20 | 20 | Milan — research only | Not cleared | 0 verified |
| Ligue 1 | 18 | 18 | Paris Saint-Germain — research only | Not cleared | 0 verified |
| **Total** | **96** | **96** | **5/96** | **0/96 cleared** | **0/96 verified** |

The Ligue 1 club catalogue is currently a secondary-source cross-check (L’Équipe 2026/27 guide), not a league-owned catalogue. Re-verify it against an official LFP publication before treating the club universe as authoritative. The other four catalogues use official league sources.

## Club-level register

The machine-readable register is `data/player-coverage-2026-27.json`. Every club row intentionally starts with:
- `membership_coverage_status: not_assessed`
- `roster_source_reuse_status: not_cleared`
- `production_import_eligible: false`

The five representative clubs are marked `research_only_view_reviewed`; this is not a player-membership verification status. All other clubs remain `not_assessed`.

## Source evidence and limitations

- Premier League club universe: [Premier League 2026/27 club guide](https://www.premierleague.com/en/news/4365156).
- La Liga club universe: [LALIGA EA SPORTS 2026/27 clubs](https://www.laliga.com/en-US/laliga-easports/clubs).
- Bundesliga club universe: [Bundesliga 2026/27 clubs](https://www.bundesliga.com/en/bundesliga/clubs).
- Serie A club universe: [Lega Serie A 2026/27 club statistics](https://en.legaseriea.it/serie-a/statistiche/clubs).
- Ligue 1 club universe: [L’Équipe 2026/27 guide](https://www.lequipe.fr/collection/guide-ligue-1-2026-2027/), secondary cross-check only.

Club catalogue presence does not prove player identity, current membership, senior registration, loan status, matchday eligibility, or completeness of a club roster. A squad page may omit players, include academy players, or show only a first-team presentation view.

## Required completion gates

A club may move from `not_assessed` only when its roster evidence includes:
1. Season and observation date, exact club identity, player-native IDs and evidence URLs.
2. A clearly classified membership meaning: registered senior squad, first-team roster, academy, or appearance/matchday.
3. Loan, transfer, release and youth status checks where relevant.
4. Field-level licence and database-rights approval for commercial app use, redistribution and attribution.
5. Reconciliation to canonical player/team IDs with an auditable source-ID mapping; names alone are insufficient.
6. Coverage counts against the club's declared roster scope, including unresolved/conflicting records.

A club must not be marked complete just because its public roster page was found. Rights clearance is independent of factual verification. Player photographs, club badges, trademarks and personality/publicity rights require separate review.

## Operational guardrails

- Keep the existing 25-player pilot Research Only.
- Keep the rights-cleared intake manifest empty until source and record-level gates pass.
- Do not scrape or bulk-copy official league, club, Transfermarkt, SofaScore, FBref or FootballSquads pages as a workaround.
- Do not call provider APIs, request API keys, consume credits, or incur a subscription without separate explicit approval.
- Do not write, update, archive, delete or migrate Supabase Production records in this coverage phase.
- Preserve the 2025/26 canonical records as history and keep unclassified legacy records quarantined.
- Re-check promoted/relegated club membership and source freshness before each season refresh.

## Validation

Run:

```bash
python3 scripts/validate_player_coverage.py
python3 -m unittest tests/test_player_coverage.py
```

The validator checks league club counts, unique club IDs, HTTPS catalogue sources, safe default statuses, and the no-import/no-provider-call contract. It does not fetch sources or assert that player membership is complete.

This is an engineering coverage register, not legal advice or a legal opinion.
