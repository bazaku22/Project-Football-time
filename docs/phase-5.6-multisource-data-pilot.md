# Phase 5.6 — Multi-source player statistics pilot

Date: 2026-11-10  
Status: Source-shape pilot completed; no production import approved.

## Goal

Evaluate whether StrikerAPI can remain the player master/identity source while independent datasets provide historical player statistics. This pilot is read-only. It does not change the 156 private StrikerAPI player records, Supabase, Local Storage, prediction records, or the app UI.

## Pilot results

### 1. Wyscout public event dataset (2017/18)

Source:
- Original Figshare collection: https://figshare.com/collections/Soccer_match_event_dataset/4415000
- Sample mirror used to inspect one event file: https://github.com/koenvo/wyscout-soccer-match-event-dataset/blob/main/processed-v2/files/2499841.json
- Sample match: Huddersfield Town vs Manchester City, 26 November 2017.

Observed in the sample file:
- 1,593 event rows.
- 28 distinct positive player IDs.
- 9 event categories: Pass (855), Duel (378), Interruption (67), Free Kick (93), Others on the ball (151), Shot (15), Foul (22), Offside (6), Save attempt (6).
- Event rows include provider player ID, team ID, event and sub-event names, match period/time, and tags. The processed match file inspected does not itself include player names; the collection has separate Players and Teams datasets that must be joined by their provider IDs.

License/usage:
- The Figshare collection describes the event data and lists separate Events, Matches, Players and Teams datasets.
- A public mirror reports CC BY 4.0 for the Figshare collection items, but the license must be checked on each original Figshare item/file before any import. Do not rely on a mirror's statement as the final legal check.
- Attribute the dataset and cite Pappalardo et al. (2019) and the PlayeRank paper when using the data.
- Do not commit raw dataset files to this repository. Download to a local analysis workspace only after confirming the item-level license and checksum.

What this source can provide:
- Event-derived counts and rates such as shots, passes, duels, fouls, and other actions, subject to event-tag definitions.
- It is historical 2017/18 data, not current squad membership.
- It is not a ready-made season-stat table. A robust importer must interpret tags, periods, own goals, substitutions/lineups, and event taxonomy before calculating totals.
- Player identity requires a separate player master file; an event player ID alone is not a name or a canonical Football Time ID.

Pilot verdict: **Promising for historical event-derived metrics**, pending item-level license confirmation and a proper event taxonomy/aggregation test.

### 2. Impect Open Data (Bundesliga 2023/24)

Official source:
- https://github.com/ImpectAPI/open-data
- License document in the official repository: https://github.com/ImpectAPI/open-data/blob/main/LICENSE.pdf

The official README confirms Bundesliga 2023/24 coverage and includes event data, event KPIs, player match aggregates, lineups/substitutions, match/player/squad information, and KPI definitions. It explicitly says use is subject to the repository's terms and asks users to credit Impect and use its logo.

Read-only sample inspection:
- Match ID 122840.
- Player KPI file contains 39 player-position rows but only 32 distinct player IDs.
- The same player can appear in multiple position segments in one match. Example: Yannick Gerhardt appears in three position rows. A naive row count would overcount players; the importer must group by match ID + player ID and preserve position segments separately.
- The season player master file contains 570 player entries.
- The KPI dictionary contains 103 KPI definitions.
- KPI values are not all conventional box-score statistics. They include Impect-specific measures such as bypassed opponents; values must retain the source KPI ID/name/definition and must not be relabelled as goals, assists, xG, or other common metrics.
- The match player-KPI rows expose Impect player IDs, position, play duration, match share and KPI ID/value pairs. Separate player and squad files provide names and team mapping.

License/usage:
- The official README makes the dataset subject to LICENSE.pdf. The full legal text has not yet been verified in this pilot.
- Therefore, **do not import, transform, redistribute, or persist Impect data in Football Time yet**. Treat it as a schema/metric research reference only until the terms are reviewed and any required permission is confirmed.
- Do not assume "free download" means unrestricted storage or reuse.

Pilot verdict: **Excellent schema/metric reference and structurally rich sample; blocked from production use pending full license review.**

## Recommended architecture

Keep StrikerAPI as the foundational provider for the existing player master data where available:
- StrikerAPI provider player ID
- player name
- current team/squad membership
- source profile fields

Create an internal Football Time canonical player ID that is independent of every provider. Keep provider IDs in a separate identity-link table. Do not assume IDs from StrikerAPI, Wyscout, Impect, Reep, or any other provider are interchangeable.

Store statistics as source-specific observations with at least:
- canonical player ID (only after verified identity match)
- provider and provider player ID
- competition and season
- team and match ID where applicable
- metric key, source metric ID, source metric name and definition/version
- value and unit
- aggregation level (event, match, season)
- source URL, source release/version, retrieval date
- license/permission status and attribution metadata

## Combining data safely

- Never add overlapping values from two providers.
- Keep raw/source observations separate from any selected normalized display value.
- Normalize only metrics with compatible definitions, units, competition scope and aggregation period.
- If definitions differ, retain separate metrics or mark them non-comparable.
- Use null for unavailable values; never convert missing data to zero.
- Preserve position stints and aggregate them only under explicit rules.
- Flag conflicting values and ambiguous identity matches for review.
- Never auto-link a player based on name alone.
- Do not import data until storage, modification, derived-data and redistribution rights are confirmed for the exact source asset.

## Next safe step

1. Confirm item-level CC BY 4.0 metadata for the original Wyscout Events, Players, Teams and Matches assets on Figshare.
2. Build a local-only Wyscout parser test against one match and the separate player/team master files; calculate a small set of clearly defined event-derived metrics and verify them against raw events.
3. Test identity matching against StrikerAPI records only inside the user's authenticated/private environment, using exact IDs or multi-field evidence and manual review. Do not send private player records to public services.
4. Review the complete Impect LICENSE.pdf before deciding whether it can be used even for derived statistics.
5. Keep all imports disabled until the user can review the preview and explicitly confirm the permitted source and fields.

## Safety checks

- No Supabase writes.
- No Local Storage writes.
- No StrikerAPI API calls or credits.
- No changes to the 156 existing player records.
- No changes to test records #001–#011, fixtures, results, prediction snapshots or calibration.
- No raw external datasets committed.
- No app UI or deployed version changes.
