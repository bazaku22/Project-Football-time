# Player Match Ledger — Android beta.9 test

This checklist is for the local-only pilot after PR #186 is merged and the GitHub Pages release is available.

## Before testing

1. Update/open Football Time and confirm the app version is **6.26.5-beta.9**.
2. Download the pilot JSON file to the Android device:
   [Premier League Matchweek 10 research intake](https://raw.githubusercontent.com/bazaku22/Project-Football-time/feat/player-match-ledger-json-restore/data/research-intake/premier-league-matchweek-10-2026-27.json)
3. The file contains 10 completed matches. Every record is `needs_review`; source reuse rights are pending and player identities are unresolved. This is a research-only lower-bound preview.

## Import

1. Open **Player Match Event Ledger**.
2. Find **นำเข้า / กู้คืน Ledger JSON**.
3. Choose the downloaded JSON file.
4. Tap **ตรวจสอบและนำเข้าไฟล์**.
5. Read the confirmation carefully. It replaces the Ledger stored on this device only; it does not write to Supabase or Production.
6. Confirm the import. The expected result is 10 matches imported, 0 VERIFIED records, and a notice that stats remain lower-bound.

## Check the Player Database

Open **ลีกและทีม → ข้อมูลผู้เล่น → Premier League** and inspect these exact-name provisional examples:

| Club | Player | Expected appearances | Goals | Assists |
|---|---|---:|---:|---:|
| Manchester United | Bruno Fernandes | 1 | 1 | 1 |
| Manchester United | Patrick Dorgu | 1 | 1 | 1 |
| Manchester United | Amad Diallo | 1 | 0 | 1 |
| Manchester United | Joshua Zirkzee | 1 | 1 | 0 |
| Nottingham Forest | Liam Delap | 1 | 2 | 1 |
| Nottingham Forest | Xaver Schlager | 1 | 0 | 1 |
| Nottingham Forest | Jair Cunha | 1 | 1 | 0 |

The exact-name preview is available only for the two pilot clubs with already approved team crosswalks: Manchester United and Nottingham Forest. Other clubs in the 10-match intake remain blocked by the team-mapping gate.

## Expected safety behavior

- Profiles label the figures **provisional research**, not verified stats.
- Missing or ambiguous names show dashes, not fabricated zeroes.
- No player canonical IDs are created.
- No source rights are upgraded; all 10 records remain `needs_review`.
- The imported Ledger is device-local. Export a backup before replacing or clearing it.
- If a profile does not match an expected example, capture the club, player name, and displayed status for follow-up. Do not manually edit the JSON to force a match.

## Rollback

Use **ล้างข้อมูลในอุปกรณ์นี้** in Player Match Event Ledger to clear the local pilot after exporting a backup if needed. This affects only the current device.
