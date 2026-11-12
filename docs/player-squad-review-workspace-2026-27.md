# Player squad review workspace — 2026/27

## Purpose

The Player Database advanced workspace now includes a local-only review tool for the StrikerAPI reconciliation artifact. It allows a reviewer to inspect the 96 team observations and 2,953 provider player identity observations without publishing provider rows to the public repository or writing to Supabase.

## Load the artifact in the app

1. Download and extract `football-time-player-reconciliation-2026-27.zip` on the device.
2. Open Football Time → Database → Players → Advanced tools → **ตรวจสอบข้อมูลนักเตะฤดูกาล 2026/27**.
3. Select:
   - `team-mapping-review-2026-27.csv`
   - `player-identity-review-2026-27.csv`
4. Enter a reviewer label and press **โหลด CSV เพื่อทดสอบในเครื่อง**.

The browser validates the expected headers, 96 team rows, 2,953 player IDs and unique provider keys. Files are read locally in the browser. No upload request or API call is made.

## Team review

- 89 team observations have one same-league candidate from exact normalized provider/canonical names or abbreviations.
- Seven explicit alias suggestions are provided for manual review:
  - FL1 provider team 167 → `football-data:523` (Olympique Lyonnais)
  - PD 1068 → `football-data:78` (Atlético Madrid)
  - PD 83 → `football-data:81` (FC Barcelona)
  - PD 87 → `football-data:5335` (Racing Santander)
  - PL 360 → `football-data:66` (Manchester United)
  - PL 393 → `football-data:351` (Nottingham Forest)
  - SA 2572 → `football-data:7397` (Como 1907)
- These are suggestions, not pre-approved mappings. The reviewer must select and approve each mapping.
- Approvals remain in the device Local Storage and can be exported as `team-alias-mapping-reviewed-2026-27.csv`.
- Rejected/follow-up decisions can also be exported in a later enhancement; do not treat an absent exported mapping as an approval.

## Player identity observations

- The tool lists all 2,953 provider player IDs with league and provider team observations.
- The repeated ID 213535 (Moussa Diarra) is highlighted as a cross-league conflict. It can only be marked for follow-up; there is no identity merge or canonical player ID action.
- A single provider observation is not treated as proof of unique real-world identity.
- Player follow-up decisions remain local and can be exported separately.

## Safety

- No player names, provider IDs, squad data or decisions are bundled in the public app.
- No network fetch, API calls, Supabase reads/writes, migrations or deletes are made by this review module.
- Local review decisions are stored in browser Local Storage on the current device only. Export the CSV if the decisions must be transferred or preserved.
- This tool does not authorize third-party reuse or publication of StrikerAPI data. Rights status remains subject to separate review.
- No canonical player IDs are generated. Existing archives and legacy data are untouched.
