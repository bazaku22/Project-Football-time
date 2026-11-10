import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const cors = {
  "Access-Control-Allow-Origin": "https://bazaku22.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authorization = req.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\\s+/i, "");
  if (!token || token === authorization) return reply({ error: "กรุณาเข้าสู่ระบบก่อน" }, 401);
  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const key = keys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!url || !key) throw new Error("Supabase client configuration is missing");
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: auth, error: authError } = await sb.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: "เซสชันไม่ถูกต้องหรือหมดอายุ" }, 401);

    const latestResponse = await fetch("https://data.reep.football/releases/latest.json", {
      headers: { "User-Agent": "Project-Football-Time/1.0 (private alias pilot)" },
      signal: AbortSignal.timeout(15000)
    });
    if (!latestResponse.ok) throw new Error("Reep release pointer HTTP " + latestResponse.status);
    const latest = await latestResponse.json();
    const manifestUrl = latest.manifest_url || (latest.release?.key ? "https://data.reep.football/" + latest.release.key : "");
    if (!manifestUrl || typeof latest.stamp !== "string") throw new Error("Reep release pointer schema is not recognized");

    const manifestResponse = await fetch(manifestUrl, {
      headers: { "User-Agent": "Project-Football-Time/1.0 (private alias pilot)" },
      signal: AbortSignal.timeout(15000)
    });
    if (!manifestResponse.ok) throw new Error("Reep manifest HTTP " + manifestResponse.status);
    const manifest = await manifestResponse.json();
    const descriptor = manifest?.files?.["provider_aliases.csv.gz"];
    if (!descriptor || typeof descriptor.sha256 !== "string") throw new Error("Reep provider_aliases file descriptor is missing");
    const bytesExpected = Number(descriptor.bytes);
    if (!Number.isFinite(bytesExpected) || bytesExpected <= 0 || bytesExpected > 30 * 1024 * 1024) {
      throw new Error("Reep alias file size is outside the safe pilot limit");
    }
    const fileUrl = descriptor.url || (descriptor.key ? "https://data.reep.football/" + descriptor.key : "");
    if (!fileUrl || !fileUrl.startsWith("https://")) throw new Error("Reep alias file URL is invalid");

    const fileResponse = await fetch(fileUrl, {
      headers: { "User-Agent": "Project-Football-Time/1.0 (private alias pilot)" },
      signal: AbortSignal.timeout(90000)
    });
    if (!fileResponse.ok) throw new Error("Reep alias file HTTP " + fileResponse.status);
    const bytes = await fileResponse.arrayBuffer();
    if (bytes.byteLength !== bytesExpected) throw new Error("Reep alias file size did not match the manifest");
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const actualHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
    if (actualHash.toLowerCase() !== descriptor.sha256.toLowerCase()) throw new Error("Reep alias file checksum mismatch");

    return new Response(bytes, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/gzip",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
        "X-Reep-Release-Stamp": latest.stamp,
        "X-Reep-SHA256": actualHash
      }
    });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Reep alias proxy failed" }, 502);
  }
});