# Player Database Read-only Audit — 2026-11-12

## Scope and safety

This is a read-only snapshot of the connected Football Time Supabase project, performed on 2026-11-12. It is an audit aid, not an instruction to delete or rewrite data. No rows, policies, schemas, migrations, snapshots, or history were modified. No provider API or credits were used.

## Live database observations

| Dataset | Observed rows | Interpretation |
|---|---:|---|
| `ft_players` | 29 | Canonical player identities currently present |
| `ft_player_memberships` | 29 | All 29 memberships are Arsenal, season 2025/26, squad level `first_team` |
| `ft_player_stats_current` | 29 | One current-stat row per canonical player, scoped to the matching membership |
| `ft_player_stat_source_records` | 29 | All selected source records report `rights_status=approved` |
| `ft_player_source_ids` | 29 | Every canonical player has exactly one provider ID mapping |
| legacy `player_records` | 189 | Six provider team IDs; these are provider identifiers and need a reviewed team mapping before assigning club names |

The 29 canonical source IDs are from OpenPlay. The exact provider IDs are unique in the canonical table. The legacy table contains 0 rows whose `team_id` literal equals `arsenal`; because legacy team IDs are provider-specific numeric identifiers, this does **not** prove that the legacy table contains no Arsenal data. A provider/team mapping is required before classifying those 189 rows.

## Canonical Arsenal 2025/26 membership

All 29 current canonical records belong in the prior-season Archive view, not the 2026/27 current-season view. This is not evidence that they are junk or duplicates. They have provider identity mappings, linked statistics, and source records marked approved.

Names with no position currently set:
- Andre Harriman-Annous
- Brando Bailey-Joseph
- Ife Ibrahim
- Marli Salmon

All 29 memberships are currently marked `first_team`. The four missing positions and squad-level classification should be reviewed against the original source evidence before any correction. No player should be removed solely because a position is missing or the season is prior.

## Recommended disposition

1. Keep the 29 Arsenal 2025/26 canonical records in Archive until a reviewer explicitly confirms any corrections.
2. Review the four missing positions and the first-team classification against the source evidence.
3. Resolve the six legacy provider team IDs to canonical club IDs before calling any legacy rows Arsenal or proposing cleanup.
4. Compare legacy and canonical records only by exact provider identity `(provider, provider_player_id)`; ambiguous matches stay quarantined.
5. Prepare a reviewed cleanup manifest with row IDs, reason, source evidence, proposed action, and backup reference. No Production delete or update is authorized by this audit.

## Portrait attribution — Research Only pilot

Five player portraits are linked from Wikimedia Commons. The pilot JSON stores the image URL, source page, author, license, license URL, capture date, and a separate personality-rights review status for each image.

| Player | Author / attribution | License | Capture date |
|---|---|---|---|
| Bruno Fernandes | Bryan Berlin / WikiPortraits | CC BY-SA 4.0 | 2026-07-02 |
| Matheus Cunha | Bryan Berlin / WikiPortraits | CC BY-SA 4.0 | 2026-06-13 |
| Bryan Mbeumo | AFC Bournemouth | CC BY 3.0 | 2025-12-15 |
| Kobbie Mainoo | Bryan Berlin / WikiPortraits | CC BY-SA 4.0 | 2026-06-27 |
| Harry Maguire | Kirill Venediktov | CC BY-SA 3.0 (also GFDL 1.2+) | 2018-06-13 |

The Commons copyright license and attribution requirements are recorded, but Wikimedia file pages warn that personality/publicity rights may separately restrict reuse. Those rights have not been independently cleared. Therefore the portraits remain confined to the Research Only pilot and must not be treated as blanket legal clearance for commercial or wider reuse. The UI shows the author, license, source link, and a notice about this distinction.

## Validation requirements for the next stage

- Verify each image loads and its crop is appropriate on Android.
- Keep monogram fallback for missing or failed images.
- Do not copy or bundle Commons image binaries without reviewing license compatibility and attribution requirements.
- Do not import Research Only records or portraits into Production player tables.
- Do not delete or update legacy or canonical Production records without a separate explicit approval.
