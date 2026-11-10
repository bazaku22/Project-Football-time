# Phase 5.6 — API Ninjas private player sync

- Primary current roster source: API Ninjas `/v1/soccerplayers` for PL, PD, BL1, SA and FL1.
- The `player-data` Edge Function reads `API_NINJAS_API_KEY` from Supabase Edge Function Secrets and calls the provider server-side.
- The GitHub Actions Secret with the same name is separate; it is not automatically available to Supabase.
- Configure the secret at Supabase Dashboard → Edge Functions → Secrets: https://supabase.com/dashboard/project/igbprkdqtsxvlcgcrqkn/settings/functions
- The endpoint returns roster/profile information (name, team, position, nationality, birth date, jersey, height/weight, roster status). It does not supply player season performance statistics; stats remain empty rather than fabricated.
- Data is stored only in the authenticated user's Supabase rows. RLS remains enabled; INSERT/UPDATE grants are restricted to authenticated users and owner-only policies.
- Upsert uniqueness: owner + provider + player + league + team + season. Existing records are not deleted.
- After adding the Supabase Function Secret, sign in to Project Football Time and click **ซิงก์รายชื่อนักเตะจาก API Ninjas**.
