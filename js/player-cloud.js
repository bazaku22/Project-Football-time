import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";
import { runReepAliasPilot } from "./reep-alias-pilot.js";
const SUPABASE_URL="https://igbprkdqtsxvlcgcrqkn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_gJaIN-2d3EIovzLsP6T2Tg__tC41luO";
const SITE_URL="https://bazaku22.github.io/Project-Football-time/";
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const status=message=>{$("playerCloudStatus").textContent=message;window.dispatchEvent(new CustomEvent("pft-private-player-status",{detail:message}));};
const publishData=(records,latestSync)=>window.dispatchEvent(new CustomEvent("pft-private-player-data",{detail:{records,meta:{latestSync},status:"เข้าสู่ระบบแล้ว"}}));
let previewId=null;
let currentSession=null;
let privateRecords=[];
function clearPreview(){$("playerCloudPreviewPanel").hidden=true;$("playerCloudPreviewSummary").textContent="";previewId=null;}
async function loadPlayerStatistics(){
 try{
  if(!currentSession?.access_token){window.dispatchEvent(new CustomEvent("pft-player-stats-data",{detail:{rows:[],status:"กรุณาเข้าสู่ระบบเพื่อดูสถิติส่วนตัว"}}));return;}
  const [statsRes,playersRes,idsRes,membersRes,sourcesRes]=await Promise.all([
   supabase.from("ft_player_stats_current").select("id,player_id,season,competition_id,team_id,squad_level,statistics_scope,match_id,stat_date,stats,selected_source_record_id,verification_status,updated_at").order("updated_at",{ascending:false}).limit(5000),
   supabase.from("ft_players").select("id,display_name,position,nationality").limit(5000),
   supabase.from("ft_player_source_ids").select("player_id,source_name,provider_player_id,verification_status").limit(10000),
   supabase.from("ft_player_memberships").select("player_id,team_id,season,squad_level,valid_from,valid_to,source_name").limit(10000),
   supabase.from("ft_player_stat_source_records").select("id,source_name,source_url,source_updated_at,collected_at,rights_status,permission_reference,season,competition_id,team_id,squad_level,statistics_scope,match_id,stat_date").limit(10000)
  ]);
  const error=statsRes.error||playersRes.error||idsRes.error||membersRes.error||sourcesRes.error;if(error)throw error;
  const players=new Map((playersRes.data||[]).map(x=>[x.id,x]));
  const directory=(playersRes.data||[]).map(p=>{
   const membership=(membersRes.data||[]).filter(m=>m.player_id===p.id).sort((a,b)=>String(b.season).localeCompare(String(a.season)))[0]||null;
   const stat=(statsRes.data||[]).find(x=>x.player_id===p.id)||null;
   return {id:p.id,display_name:p.display_name,position:p.position,nationality:p.nationality,team_id:membership?.team_id||null,season:membership?.season||null,squad_level:membership?.squad_level||null,statistics:stat?.stats||{},verificationStatus:stat?.verification_status||"identity_only"};
  });
  window.dispatchEvent(new CustomEvent("pft-player-directory-data",{detail:{players:directory,status:"อ่านรายชื่อนักเตะ Canonical จาก ft_players ตามสิทธิ์บัญชีแล้ว"}}));
  const ids=new Map(),memberships=new Map(),sources=new Map();
  for(const x of idsRes.data||[]){if(!ids.has(x.player_id))ids.set(x.player_id,[]);ids.get(x.player_id).push(x);}
  for(const x of membersRes.data||[]){if(!memberships.has(x.player_id))memberships.set(x.player_id,[]);memberships.get(x.player_id).push(x);}
  for(const x of sourcesRes.data||[])sources.set(x.id,x);
  const rows=(statsRes.data||[]).map(x=>{
   const player=players.get(x.player_id)||{},member=(memberships.get(x.player_id)||[]).find(m=>m.season===x.season&&m.team_id===x.team_id&&m.squad_level===x.squad_level)||null;
   return {id:x.id,player,sourceIds:ids.get(x.player_id)||[],membership:member,source:sources.get(x.selected_source_record_id)||null,season:x.season,competition:x.competition_id,teamId:x.team_id,squadLevel:x.squad_level,statisticsScope:x.statistics_scope,matchId:x.match_id,statDate:x.stat_date,stats:x.stats||{},verificationStatus:x.verification_status,updatedAt:x.updated_at};
  });
  window.dispatchEvent(new CustomEvent("pft-player-stats-data",{detail:{rows,status:"อ่านสถิตินักเตะทุกลีกและฤดูกาลจาก Supabase ตามสิทธิ์บัญชีแล้ว"}}));
 }catch(error){window.dispatchEvent(new CustomEvent("pft-player-stats-data",{detail:{rows:[],status:"โหลดสถิติไม่สำเร็จ: "+(error?.message||"เกิดข้อผิดพลาด")}}));}
}
async function loadPrivateData(session){
 currentSession=session||null;privateRecords=[];
 if(!session?.access_token){privateRecords=[];publishData([],null);await loadPlayerStatistics();$("playerCloudLogin").hidden=false;$("playerCloudSignedIn").hidden=true;clearPreview();status("ยังไม่ได้เข้าสู่ระบบ · ข้อมูล Cloud ส่วนตัวถูกซ่อนไว้");return;}
 $("playerCloudLogin").hidden=true;$("playerCloudSignedIn").hidden=false;$("playerCloudUser").textContent="บัญชี: "+(session.user?.email||"เข้าสู่ระบบแล้ว");status("กำลังโหลดข้อมูลส่วนตัวจาก Cloud…");
 // The canonical ft_players directory must load independently of the legacy player-data Edge Function.
 await loadPlayerStatistics();
 const {data,error}=await supabase.functions.invoke("player-data",{body:{}});
 if(error||data?.error){publishData([],null);status("เข้าสู่ระบบแล้ว แต่โหลดข้อมูล Cloud ไม่สำเร็จ: "+(data?.error||error.message));return;}
 privateRecords=Array.isArray(data?.records)?data.records:[];
 publishData(privateRecords,data?.latestSync||null);status("เชื่อมต่อ Cloud ส่วนตัวแล้ว · "+privateRecords.length+" รายการ");
}
$("playerCloudSendLink").addEventListener("click",async()=>{
 const button=$("playerCloudSendLink"),email=$("playerCloudEmail").value.trim();if(!email){status("กรุณากรอกอีเมลก่อน");return;}button.disabled=true;status("กำลังส่งลิงก์เข้าสู่ระบบ…");
 try{const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:SITE_URL,shouldCreateUser:true}});if(error)throw error;status("ส่งคำขอลิงก์แล้ว · กรุณาตรวจสอบกล่องจดหมายและ Spam");}
 catch(error){status("ส่งลิงก์ไม่สำเร็จ: "+(error instanceof Error?error.message:"เกิดข้อผิดพลาด"));}finally{button.disabled=false;}
});
$("playerCloudSavePreview").addEventListener("click",async()=>{
 if(!previewId)return;if(!confirm("ยืนยันบันทึกข้อมูลนักเตะจาก Preview นี้ลงคลังส่วนตัวหรือไม่?"))return;
 const button=$("playerCloudSavePreview");button.disabled=true;status("กำลังตรวจสอบและบันทึกข้อมูล Preview…");
 try{
  const {data,error}=await supabase.functions.invoke("player-data",{body:{action:"save_preview",previewId}});
  if(error||data?.error)throw new Error(data?.error||error.message);
  clearPreview();await refresh();status("บันทึกสำเร็จ "+data.saved+" รายการ · ข้อมูลสถิติที่ไม่มีจาก Squad API จะยังว่าง");
 }catch(error){status("บันทึกไม่สำเร็จ: "+(error instanceof Error?error.message:"เกิดข้อผิดพลาด"));}
 finally{button.disabled=false;}
});
$("playerCloudCancelPreview").addEventListener("click",()=>{clearPreview();status("ยกเลิก Preview แล้ว · ไม่มีการบันทึกข้อมูล");});
$("playerCloudReepPilot").addEventListener("click",async()=>{
 const button=$("playerCloudReepPilot"),panel=$("playerCloudReepPanel"),summary=$("playerCloudReepSummary"),list=$("playerCloudReepResults");
 if(!currentSession?.access_token){status("กรุณาเข้าสู่ระบบก่อน");return;}
 if(!privateRecords.length){status("ไม่พบข้อมูลนักเตะในคลังส่วนตัวสำหรับทดสอบ");return;}
 button.disabled=true;panel.hidden=false;summary.textContent="กำลังเริ่มทดสอบ…";list.replaceChildren();
 try{
  const result=await runReepAliasPilot({session:currentSession,records:privateRecords,onProgress:status});
  summary.textContent="Reep รุ่น "+result.release+" · ตรวจ alias "+result.rowsScanned.toLocaleString("en-US")+" แถว · พบแถวที่ตรงชื่อ "+result.matchedAliasRows.toLocaleString("en-US")+" แถว · นักเตะที่มี candidate "+result.matchedPlayers+"/"+result.totalPlayers+" · ไม่พบ "+result.unmatchedPlayers+" · ชื่อที่มีหลาย Reep ID "+result.ambiguousPlayers+".\nผลเป็น candidate จากชื่อเท่านั้น ยังไม่ได้ยืนยัน entity type หรือเชื่อม ID อัตโนมัติ";
  const matched=result.results.filter(x=>x.candidates.length>0);
  const unmatched=result.results.filter(x=>x.candidates.length===0);
  const makeGroup=(title,rows)=>{
   const details=document.createElement("details");const summaryEl=document.createElement("summary");summaryEl.textContent=title+" ("+rows.length+")";details.append(summaryEl);
   rows.forEach(row=>{
    const item=document.createElement("div");item.className="p5-row";
    const left=document.createElement("span");left.textContent=row.playerName+" · "+row.league+" · "+row.team;
    const right=document.createElement("b");right.textContent=row.candidates.map(c=>c.reepId+" ["+c.alias+"]").join(" | ");
    item.append(left,right);details.append(item);
   });
   list.append(details);
  };
  makeGroup("พบชื่อที่ตรงกัน",matched);
  makeGroup("ไม่พบชื่อแฝงที่ตรงกัน",unmatched);
  status("ทดสอบ Reep เสร็จแล้ว · ผลอยู่ในหน้านี้เท่านั้น ไม่มีการบันทึกหรือเปลี่ยนข้อมูล");
 }catch(error){
  summary.textContent="ทดสอบไม่สำเร็จ: "+(error instanceof Error?error.message:"เกิดข้อผิดพลาด");
  status("ทดสอบ Reep ไม่สำเร็จ");
 }finally{button.disabled=false;}
});
async function refresh(){const {data}=await supabase.auth.getSession();await loadPrivateData(data.session);}
$("playerCloudRefresh").addEventListener("click",refresh);
$("playerCloudSignOut").addEventListener("click",async()=>{const {error}=await supabase.auth.signOut();if(error)status("ออกจากระบบไม่สำเร็จ: "+error.message);else await loadPrivateData(null);});
supabase.auth.onAuthStateChange((_event,session)=>{queueMicrotask(()=>loadPrivateData(session));});
const {data:initialSession}=await supabase.auth.getSession();await loadPrivateData(initialSession.session);
