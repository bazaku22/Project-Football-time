# Phase 5.6 — StrikerAPI private player preview and import

- Private cloud storage is owner-scoped through Supabase Auth and RLS.
- The player UI now separates preview from explicit save confirmation.
- Preview requests one squad for each of five leagues (Arsenal, Real Madrid, Bayern Munich, Inter, PSG), maximum 10 StrikerAPI credits per preview.
- Preview payload is stored privately in `player_sync_previews`, expires after 30 minutes, and can be consumed once.
- Saving upserts records into `player_records` and logs the run in `player_sync_runs`.
- Player profile fields are preserved as provider-supplied JSON. Statistics are deliberately empty because the squad endpoint does not establish season statistics.
- No automatic or scheduled sync is enabled.
- Configure Supabase Edge Function secret `STRIKERAPI_API_KEY` before using Preview. Never put the key in client code or GitHub Pages.
- Existing match records and probability snapshots are untouched.
