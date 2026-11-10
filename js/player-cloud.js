import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const SUPABASE_URL = "https://igbprkdqtsxvlcgcrqkn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_gJaIN-2d3EIovzLsP6T2Tg__tC41luO";
const SITE_URL = "https://bazaku22.github.io/Project-Football-time/";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const status = (message) => {
  $("playerCloudStatus").textContent = message;
  window.dispatchEvent(new CustomEvent("pft-private-player-status", { detail: message }));
};
const publishData = (records, latestSync) => {
  window.dispatchEvent(new CustomEvent("pft-private-player-data", {
    detail: { records, meta: { latestSync }, status: "เข้าสู่ระบบแล้ว" }
  }));
};

async function loadPrivateData(session) {
  if (!session?.access_token) {
    publishData([], null);
    $("playerCloudLogin").hidden = false;
    $("playerCloudSignedIn").hidden = true;
    status("ยังไม่ได้เข้าสู่ระบบ · ข้อมูล Cloud ส่วนตัวถูกซ่อนไว้");
    return;
  }
  $("playerCloudLogin").hidden = true;
  $("playerCloudSignedIn").hidden = false;
  $("playerCloudUser").textContent = "บัญชี: " + (session.user?.email || "เข้าสู่ระบบแล้ว");
  status("กำลังโหลดข้อมูลส่วนตัวจาก Cloud…");
  const { data, error } = await supabase.functions.invoke("player-data", { body: {} });
  if (error) {
    publishData([], null);
    status("เข้าสู่ระบบแล้ว แต่โหลดข้อมูล Cloud ไม่สำเร็จ: " + error.message);
    return;
  }
  publishData(Array.isArray(data?.records) ? data.records : [], data?.latestSync || null);
  status("เชื่อมต่อ Cloud ส่วนตัวแล้ว · " + (data?.records?.length || 0) + " รายการ");
}

$("playerCloudSendLink").addEventListener("click", async () => {
  const email = $("playerCloudEmail").value.trim();
  if (!email) { status("กรุณากรอกอีเมลก่อน"); return; }
  status("กำลังส่งลิงก์เข้าสู่ระบบ…");
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: SITE_URL, shouldCreateUser: true }
  });
  status(error
    ? "ส่งลิงก์ไม่สำเร็จ: " + error.message
    : "ส่งลิงก์เข้าสู่ระบบแล้ว · กรุณาเปิดอีเมลบนอุปกรณ์นี้และกดลิงก์");
});
$("playerCloudSync").addEventListener("click", async () => {\n  $("playerCloudSync").disabled = true;\n  status("กำลังดึงรายชื่อนักเตะจาก API Ninjas…");\n  try {\n    const { data, error } = await supabase.functions.invoke("player-data", { body: { action: "sync" } });\n    if (error || data?.error) throw new Error(data?.error || error.message);\n    publishData(Array.isArray(data?.records) ? data.records : [], data?.latestSync || null);\n    status("ซิงก์ข้อมูลสำเร็จ · " + (data?.records?.length || 0) + " รายการ");\n  } catch (error) {\n    status("ซิงก์ไม่สำเร็จ: " + (error instanceof Error ? error.message : "เกิดข้อผิดพลาด"));\n  } finally { $("playerCloudSync").disabled = false; }\n});\n$("playerCloudRefresh").addEventListener("click", async () => {
  const { data } = await supabase.auth.getSession();
  await loadPrivateData(data.session);
});
$("playerCloudSignOut").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) status("ออกจากระบบไม่สำเร็จ: " + error.message);
  else await loadPrivateData(null);
});

supabase.auth.onAuthStateChange((_event, session) => {
  queueMicrotask(() => loadPrivateData(session));
});
const { data: initialSession } = await supabase.auth.getSession();
await loadPrivateData(initialSession.session);
