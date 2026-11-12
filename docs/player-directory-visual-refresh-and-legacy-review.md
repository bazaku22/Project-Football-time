# Player Directory Visual Refresh and Legacy Review

**Release target:** V6.14.0-beta.1 / Service Worker V64  
**Branch:** feature/player-database-visual-refresh-2026-11

## Scope

- Separate the primary directory into three explicit views: current season (2026/27), prior/unassigned seasons (Archive), and Research Only.
- Exclude prior-season and unassigned membership rows from the default current-season view. These rows remain visible in Archive and are not deleted.
- Preserve canonical player identity and every season/team membership as separate directory rows. Attach a statistics record only when player ID, season, team ID, and squad level match exactly.
- Redesign the player workspace for small screens with a clearer header, compact view tabs, search/filter panel, readable cards, position/team/season labels, and compact season statistics.
- Support optional player portrait URLs with a monogram fallback and image-load fallback. A portrait is displayed only when its URL and usage rights have been reviewed; no unlicensed photos are bundled in this change.
- Keep CSV preview, identity review, local JSON import/export, and legacy private-cloud tools in the advanced section.

## Legacy Arsenal / old-season records

The screenshot showed a canonical Arsenal membership from 2025/26. This release classifies any canonical membership other than 2026/27 (including missing-season memberships) under Archive. It does not infer that a player is invalid, does not delete the player identity, and does not alter any Supabase row. A future cleanup manifest must be reviewed against actual provider IDs, membership evidence, source rights, and user approval before any Production mutation.

## Data safety

- No provider API calls or credits.
- No Supabase Production writes, migrations, or deletes.
- No legacy record deletion, truncation, automatic merge, or name-only identity reconciliation.
- Existing immutable source records and history remain unchanged.
- Current-season directory entries remain visible even when their statistics are empty.

## Photo rights

The UI accepts an optional reviewed `photo_url` / `photoUrl` field and displays a monogram when absent or broken. This change intentionally does not hotlink official-club or stock-photo assets without an explicit reusable license and attribution record. Future photo records should retain source URL, author, license, attribution text, and review status.

## Validation

Regression tests cover current/archive/research separation, exact season/team/squad statistics matching, Research Only status, image fallback, preserved legacy tools, and stylesheet caching.
