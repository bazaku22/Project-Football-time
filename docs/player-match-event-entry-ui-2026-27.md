# Local Player Match Event Entry — 2026/27

**App version:** V6.26.5-beta.1 / Service Worker V88  
**Storage:** Browser Local Storage only  
**Scope:** Finished 2026/27 matches in PL, PD, BL1, SA and FL1

## Purpose

This workspace is the first manual data-entry surface for the Player Match Event Ledger. It reads the already-loaded Football Time fixture database and lets a reviewer record match-level lineups and events without calling an external provider API or writing to Supabase.

Open it from Match Center → เครื่องมือเพิ่มเติม → บันทึกเหตุการณ์ผู้เล่น.

## Workflow

1. Select a finished match from the existing central football database. The page does not invent fixtures or accept scheduled matches.
2. Add one or more direct source URLs. Rights default to `pending`; select `confirmed` only when there is a documented basis. The permission-basis field is required before a match can be marked verified.
3. Add the Starting XI and substitute list for each team. Enter a FT Player ID only when identity has been reviewed and confirm the identity checkbox. Otherwise the player remains unresolved and is excluded from ID-based totals.
4. Add substitution events with both players, or goal events with normal/penalty/own-goal type. Explicit assist attribution is required before an assist is counted.
5. Set lineup/event coverage. A match can only be marked verified when both teams have exactly 11 recorded starters, both coverage flags are complete, all player identities are verified, at least two sources have confirmed reuse rights and a permission basis, and the reviewer explicitly confirms the review.
6. Save locally. Reopen a saved match to edit it. Export the JSON ledger regularly for backup.

## Calculation rules

- A Starting XI player has an appearance.
- A player evidenced as coming on or going off in a substitution has an appearance.
- A credited scorer, explicit assister, or own-goal player has an appearance evidenced by the event.
- Bench-only players do not receive an appearance.
- Normal and penalty goals count for the credited scorer. Own goals are retained as events but not credited as personal goals.
- Only an explicitly credited assist counts. Unknown and confirmed-no-assist remain separate states.
- Unresolved identities do not contribute to FT Player ID totals. Totals remain labelled as lower bounds while match, event or identity coverage is incomplete.

## Local data and limits

The browser stores records under `pft_player_match_event_ledger_2026_27_v1`. Data does not sync to another device, upload to a server, or change Match Center results. Export the JSON to move or back up the dataset. Clearing the local ledger is destructive for this device, so export first.

The match list is limited to the fixtures currently available in the app's central database. The page does not discover every registered squad member; non-appearing players still require a separate rights-cleared roster source. A match report or manual transcription is not itself a reuse licence. Do not mark source rights confirmed without a real basis.

This is a local data-entry pilot, not a public Player Database release. No Supabase schema/data changes, provider API calls/credits, automated scraping, merge or deployment are part of this implementation.
