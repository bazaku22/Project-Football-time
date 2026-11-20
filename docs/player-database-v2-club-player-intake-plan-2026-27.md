# Player Database V2 — 2026/27 Club Player Intake Plan

**Audit date:** 2026-11-19  
**Base:** `main` at merge commit `8290b5dd3e7d358964fd693f219a94f5dc55e34c`  
**Status:** Read-only audit and intake preparation; no player data import is authorized by this document.

## 1. Approved scope

- Season: `2026/27` only. Do not mix 2025/26 or earlier-season records into the current directory.
- Competitions: Premier League (`PL`), La Liga (`PD`), Bundesliga (`BL1`), Serie A (`SA`), Ligue 1 (`FL1`), and EFL Championship (`ELC`).
- Keep the five major leagues in the existing primary category. Keep EFL Championship under England in the additional-leagues-by-country category.
- Begin roster collection with Premier League, then expand to the remaining competitions.
- Capture real club-squad names. For Premier League, do not split the displayed squad into a separate U21 category.
- Club statistics are limited to appearances, goals, and assists. Keep national-team statistics separate from club statistics.
- Player IDs are permanent. Existing IDs must never be regenerated or reassigned. A player keeps the same ID when changing clubs.
- A name-only match may be used as an MVP review candidate, but it must not silently merge two people. Ambiguous identities remain pending review.

## 2. Read-only audit of current `main`

### Player data file

File: `data/player-database-v2.json`  
Schema: `2.1.0`  
Season: `2026/27`  
Dataset status: `TEST_DRAFT`

Observed records:

- 23 player records.
- 23 unique permanent IDs, `PFT-000001` through `PFT-000023`.
- All 23 records are linked to Thailand's senior national-team dataset.
- Their current-club fields are club-affiliation snapshots for those Thailand players, not a complete club-squad intake for the six target competitions.
- 22 records currently use league code `OTHER`; one has `BL1` as its club league. The single BL1 affiliation is not evidence of a complete Bundesliga roster.
- The existing records include separate `statistics.club` and `statistics.nationalTeam` objects. Preserve this separation and all existing values/history.

### App integration

- `js/player-database-v2.js` loads `data/player-database-v2.json` directly.
- Club and league counts are derived from the players' `currentClub` records. An empty league therefore has no player-derived club list yet.
- The five major league directory and the England → EFL Championship navigation are present.
- The ELC navigation entry is a directory registration only; it does not mean Championship clubs or players have been imported.

### Existing import foundation

- Existing CSV templates cover provider-ID mapping and a broad statistics schema.
- No separate current-season six-league club-roster intake file is present on `main`.
- The existing broad statistics template contains metrics outside this approved MVP (for example xG, shots and cards). Do not use those extra fields for this intake.

## 3. Collection and source rules

### Squad membership

- Use the previously approved manual FootballSquads roster-transcription route for this non-commercial personal app, with the publisher's required attribution.
- Manual transcription only: do not scrape, crawl, automate extraction, or call a provider API.
- Re-check the source terms and required attribution before release.
- Preserve the exact club page URL and observation date for every club roster.
- Exclude the source's separate departed-player section.
- A source-listed squad entry is a roster observation, not proof of league registration, match eligibility, or an appearance.
- If a source page has an unresolved club/identity conflict, hold that entry for review rather than guessing.

Required attribution recorded in the existing intake documentation:

> Source of Material is http://www.footballsquads.com. Material: © FootballSquads.com, 1999 - , All Rights Reserved

### Statistics

- Do not fill statistics from a roster page or infer them from appearances in a single match.
- Collect only appearances, goals and assists when a source clearly defines the season and scope as all club competitions.
- Do not relabel league-only totals as all-club-competition totals.
- Blank means unknown/not verified. Use numeric zero only when the source explicitly reports zero.
- Statistics remain empty until an eligible source and its reuse terms are reviewed. Roster collection can proceed independently.

### Identity and Player IDs

- Preserve all existing `PFT-000001`–`PFT-000023` records unchanged.
- Check exact duplicates and potential name collisions before assigning any new permanent ID.
- For an MVP name-only candidate, retain the source name and club evidence and set identity status to pending manual review. Do not merge automatically.
- Assign new `PFT-` IDs only after identity review, starting after the highest existing ID. Never reuse an ID.

## 4. Intake workflow

1. Start with the 20 Premier League clubs and manually record each current roster page.
2. Record the source page, observation date, club, season, names and any supplied shirt number/position. Leave unsupported fields blank.
3. Exclude departed-player rows and resolve source-page boundary issues.
4. Run duplicate, club mapping, season and required-provenance checks.
5. Review identity candidates; hold ambiguous name-only matches.
6. Keep appearances/goals/assists blank unless all-club-competition scope and source rights are verified.
7. Repeat for PD, BL1, SA, FL1 and then ELC under England.
8. Present counts, exceptions, source provenance and the exact staged data diff for review before any app-data update.

## 5. Explicit safety boundary

This phase is preparation only:

- No StrikerAPI or other provider API calls; no credits or paid services.
- No automated scraping or bulk extraction.
- No Supabase Production writes, migrations, updates, archives or deletes.
- No changes to `data/player-database-v2.json` or the existing 23 player records.
- No changes to Match IDs, match records, Match Event Ledger or user app storage.
- No player photos, club crests or league marks are added by this intake template.
- No 2025/26 or earlier-season data is imported into the 2026/27 directory.

Any future import into the app or Production database is a separate step. It requires a reviewed data diff, validation results, provenance/rights review and explicit approval.

## 6. Files prepared

- `data/import-templates/club-player-roster-template-2026-27.csv`: empty header-only template for the six-competition club roster intake. It is not an import payload and contains no player records.
