import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://bazaku22.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token || token === authorization) {
    return new Response(JSON.stringify({ error: "ต้องเข้าสู่ระบบก่อน" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "เซสชันไม่ถูกต้องหรือหมดอายุ" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const [playersResult, syncResult] = await Promise.all([
      supabase.from("player_records")
        .select("id,provider,provider_player_id,player_name,league_id,team_id,season,position,profile,stats,source_metadata,updated_at")
        .eq("user_id", userId)
        .order("player_name", { ascending: true })
        .limit(5000),
      supabase.from("player_sync_runs")
        .select("provider,status,started_at,finished_at,records_seen,records_upserted,error_summary")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(1),
    ]);
    if (playersResult.error) throw playersResult.error;
    if (syncResult.error) throw syncResult.error;

    return new Response(JSON.stringify({
      records: playersResult.data || [],
      latestSync: syncResult.data?.[0] || null,
      user: { id: userId, email: authData.user.email || null },
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});