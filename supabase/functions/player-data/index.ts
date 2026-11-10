import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bazaku22.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const LEAGUES = [
  { id: "PL", name: "Premier League", api: "epl" },
  { id: "PD", name: "La Liga", api: "laliga" },
  { id: "BL1", name: "Bundesliga", api: "bundesliga" },
  { id: "SA", name: "Serie A", api: "seriea" },
  { id: "FL1", name: "Ligue 1", api: "ligue1" },
];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) return json({ error: "ต้องเข้าสู่ระบบก่อน" }, 401);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const publishableMap = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const key = publishableMap.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!url || !key) throw new Error("Supabase client configuration is missing");
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "เซสชันไม่ถูกต้องหรือหมดอายุ" }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.action !== "sync") {
      const [playersResult, syncResult] = await Promise.all([
        supabase.from("player_records").select("id,provider,provider_player_id,player_name,league_id,team_id,season,position,profile,stats,source_metadata,updated_at").eq("user_id", authData.user.id).order("player_name").limit(5000),
        supabase.from("player_sync_runs").select("provider,status,started_at,finished_at,records_seen,records_upserted,error_summary").eq("user_id", authData.user.id).order("started_at", { ascending: false }).limit(1),
      ]);
      if (playersResult.error) throw playersResult.error;
      if (syncResult.error) throw syncResult.error;
      return json({ records: playersResult.data || [], latestSync: syncResult.data?.[0] || null, user: { id: authData.user.id, email: authData.user.email || null } });
    }

    const apiKey = Deno.env.get("API_NINJAS_API_KEY") || "";
    if (!apiKey) return json({ error: "ยังไม่ได้ตั้งค่า API_NINJAS_API_KEY ใน Supabase Edge Function Secrets" }, 503);
    const userId = authData.user.id;
    const { data: syncRun, error: runError } = await supabase.from("player_sync_runs")
      .insert({ user_id: userId, provider: "API Ninjas", status: "running", metadata: { leagues: LEAGUES.map(x => x.api) } })
      .select("id").single();
    if (runError) throw runError;

    const season = "2026";
    const allRows: Record<string, unknown>[] = [];
    const leagueCounts: Record<string, number> = {};
    const failures: string[] = [];
    for (const league of LEAGUES) {
      try {
        const players: any[] = [];
        // Free-tier endpoint defaults to 50 rows; offset is supported for paging.
        for (let offset = 0, page = 0; page < 10; offset += 50, page++) {
          const endpoint = new URL("https://api.api-ninjas.com/v1/soccerplayers");
          endpoint.searchParams.set("league", league.api);
          if (offset) endpoint.searchParams.set("offset", String(offset));
          const response = await fetch(endpoint, { headers: { "X-Api-Key": apiKey } });
          if (!response.ok) {
            const detail = await response.text();
            throw new Error("API Ninjas HTTP " + response.status + (detail ? ": " + detail.slice(0, 180) : ""));
          }
          const pageRows = await response.json();
          if (!Array.isArray(pageRows)) throw new Error("รูปแบบข้อมูลจาก API Ninjas ไม่ถูกต้อง");
          players.push(...pageRows);
          if (pageRows.length < 50) break;
        }
        leagueCounts[league.id] = players.length;
        for (const p of players) {
          if (!p?.player_id || !p?.name) continue;
          const team = p.team || {};
          allRows.push({
            user_id: userId,
            provider: "api-ninjas",
            provider_player_id: String(p.player_id),
            player_name: String(p.name),
            league_id: league.id,
            team_id: String(team.team_id || ""),
            season,
            position: p.position ? String(p.position) : null,
            profile: {
              firstName: p.first_name || null, lastName: p.last_name || null,
              teamName: team.name || null, teamAbbreviation: team.abbreviation || null,
              leagueName: league.name, nationality: p.nationality || null,
              birthDate: p.birth_date || null, jerseyNumber: p.jersey_number ?? null,
              heightCm: p.height_cm ?? null, weightKg: p.weight_kg ?? null,
              rosterStatus: p.roster_status || null,
            },
            stats: {},
            source_metadata: { provider: "API Ninjas", endpoint: "/v1/soccerplayers", fetchedAt: new Date().toISOString(), seasonLabel: "2026-27" },
          });
        }
      } catch (error) {
        failures.push(league.id + ": " + (error instanceof Error ? error.message : "request failed"));
      }
    }

    if (!allRows.length) {
      const message = failures.join("; ") || "API Ninjas ไม่ส่งข้อมูลนักเตะกลับมา";
      await supabase.from("player_sync_runs").update({ status: "failed", finished_at: new Date().toISOString(), error_summary: message }).eq("id", syncRun.id).eq("user_id", userId);
      return json({ error: message }, 502);
    }

    const { error: upsertError } = await supabase.from("player_records").upsert(allRows, {
      onConflict: "user_id,provider,provider_player_id,league_id,team_id,season",
      ignoreDuplicates: false,
    });
    if (upsertError) throw upsertError;
    const status = failures.length ? "partial" : "success";
    const { error: finishError } = await supabase.from("player_sync_runs").update({
      status, finished_at: new Date().toISOString(), records_seen: allRows.length,
      records_upserted: allRows.length, error_summary: failures.length ? failures.join("; ").slice(0, 1500) : null,
      metadata: { leagueCounts, failedLeagues: failures },
    }).eq("id", syncRun.id).eq("user_id", userId);
    if (finishError) throw finishError;

    const { data: records, error: readError } = await supabase.from("player_records")
      .select("id,provider,provider_player_id,player_name,league_id,team_id,season,position,profile,stats,source_metadata,updated_at")
      .eq("user_id", userId).order("player_name").limit(5000);
    if (readError) throw readError;
    return json({ records: records || [], latestSync: { provider: "API Ninjas", status, records_seen: allRows.length, records_upserted: allRows.length, error_summary: failures.join("; ") || null }, sync: { leagueCounts, failures } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return json({ error: message }, 500);
  }
});
