"use strict";
(() => {
 const DB_URL="./data/player-database.json", STORAGE_KEY="pft_players_v1";
 let central=[],local=[],all=[],meta={},privateStatus="ยังไม่ได้เชื่อมต่อ";
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const valid=r=>r&&typeof r==="object"&&["id","playerId","name","teamId","leagueId","season"].every(k=>typeof r[k]==="string")&&r.statistics&&typeof r.statistics==="object";
 const merge=()=>{const m=new Map();central.forEach(r=>{if(valid(r))m.set(r.id,r)});local.forEach(r=>{if(valid(r))m.set(r.id,r)});all=[...m.values()]};
 const fmt=v=>v===null||v===undefined||v===""?"—":esc(v);
 const POSITION_LABELS={FORWARD:"แนวรุก",MIDFIELDER:"กองกลาง",DEFENDER:"กองหลัง",GOALKEEPER:"ผู้รักษาประตู",MULTI:"หลายกลุ่มตำแหน่ง",UNKNOWN:"ยังไม่ระบุตำแหน่ง"};
 function positionGroup(record){
  const explicit=String(record.positionGroup||"").toUpperCase();
  if(Object.prototype.hasOwnProperty.call(POSITION_LABELS,explicit))return explicit;
  const raw=String(record.position||"").toUpperCase().trim();
  if(!raw)return "UNKNOWN";
  const tokens=raw.split(/[\\/,;|+]+/).map(x=>x.trim()).filter(Boolean);
  const groups=new Set();
  for(const token of tokens){
   if(["GK","GOALKEEPER"].includes(token))groups.add("GOALKEEPER");
   else if(["DF","DEF","DEFENDER","CB","LCB","RCB","LB","RB","LWB","RWB"].includes(token))groups.add("DEFENDER");
   else if(["MF","MID","MIDFIELDER","DM","CDM","CM","LCM","RCM","AM","CAM","LAM","RAM","LM","RM"].includes(token))groups.add("MIDFIELDER");
   else if(["FW","FWD","FORWARD","ST","CF","LW","RW","SS","LF","RF"].includes(token))groups.add("FORWARD");
  }
  if(groups.size===1)return [...groups][0];
  if(groups.size>1)return "MULTI";
  return "UNKNOWN";
 }
 function renderCloudStats(payload){
  const root=$("playerStatsCloudList"),summary=$("playerStatsCloudSummary"),status=$("playerStatsCloudStatus");
  if(!root||!summary||!status)return;
  const rows=Array.isArray(payload?.rows)?payload.rows:[];
  status.textContent=payload?.status||"ยังไม่ได้โหลดสถิติ";
  summary.innerHTML='<div class="db-kpi"><b>'+rows.length+'</b><span>ชุดสถิติจาก Cloud</span></div><div class="db-kpi"><b>'+rows.filter(r=>r.verificationStatus==="verified").length+'</b><span>ชุดที่ยืนยันแล้ว</span></div><div class="db-kpi"><b>'+new Set(rows.map(r=>r.player?.id).filter(Boolean)).size+'</b><span>นักเตะไม่ซ้ำ</span></div>';
  if(!rows.length){root.innerHTML='<div class="empty">ยังไม่มีสถิติที่แสดงได้ หรือกรุณาเข้าสู่ระบบ</div>';return;}
  root.innerHTML=rows.map(r=>{
   const s=r.stats||{},p=r.player||{},source=r.source||{},ids=Array.isArray(r.sourceIds)?r.sourceIds:[];
   const items=[["ลงเล่น",s.appearances],["ตัวจริง",s.starts],["นาที",s.minutes??s.minutes_played],["ประตู",s.goals],["แอสซิสต์",s.assists],["xG",s.xg],["xA",s.xa],["ยิง",s.shots],["ยิงเข้ากรอบ",s.shots_on_target],["Key passes",s.key_passes],["Tackles",s.tackles],["Interceptions",s.interceptions],["ใบเหลือง",s.yellow_cards],["ใบแดง",s.red_cards]];
   const identity=ids.map(x=>esc(x.source_name)+':'+esc(x.provider_player_id)+' ['+esc(x.verification_status)+']').join(' · ')||'ยังไม่มี Provider ID';
   const collected=source.collected_at?new Date(source.collected_at).toLocaleString():"ไม่ระบุ";
   return '<article class="card"><div class="topline"><b>'+esc(p.display_name||"ไม่ระบุชื่อ")+'</b><span class="tag">'+(r.verificationStatus==="verified"?"ยืนยันแล้ว":r.verificationStatus==="disputed"?"ข้อมูลขัดแย้ง":"รอตรวจสอบ")+'</span></div><div class="small">'+esc(r.teamId||"ไม่ระบุทีม")+' · '+esc(r.competition||"ไม่ระบุรายการ")+' · '+esc(r.season||"ไม่ระบุฤดูกาล")+'</div><div class="small">'+esc(r.squadLevel||"ไม่ระบุระดับทีม")+' · '+esc(r.statisticsScope||"ไม่ระบุขอบเขต")+(r.matchId?" · Match "+esc(r.matchId):"")+'</div><div class="p5-score">'+items.map(([label,value])=>'<div class="p5-metric"><b>'+fmt(value)+'</b><span>'+label+'</span></div>').join("")+'</div><div class="small">Provider IDs: '+identity+'</div><div class="small">แหล่งสถิติ: '+esc(source.source_name||"ไม่ระบุ")+' · สิทธิ์: '+esc(source.rights_status||"ไม่ระบุ")+' · เก็บข้อมูล: '+esc(collected)+'</div><div class="small">อัปเดตชุดข้อมูล: '+esc(r.updatedAt||"ไม่ระบุ")+' · Permission: '+esc(source.permission_reference||"ไม่ระบุ")+'</div></article>';
  }).join("");
 }
 window.addEventListener("pft-player-stats-data",event=>renderCloudStats(event.detail||{}));
 function render(){
  const lf=$("playerLeagueFilter"),tf=$("playerTeamFilter"),pf=$("playerPositionFilter"),q=$("playerSearch").value.trim().toLocaleLowerCase(),oldL=lf.value||"ALL",oldT=tf.value||"ALL",oldP=pf?.value||"ALL";
  const leagues=[...new Map(all.map(r=>[r.leagueId,r.leagueName||r.leagueId])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  lf.innerHTML='<option value="ALL">ทุกลีก</option>'+leagues.map(([id,n])=>'<option value="'+esc(id)+'">'+esc(n)+'</option>').join("");lf.value=leagues.some(x=>x[0]===oldL)?oldL:"ALL";
  const league=lf.value,teams=[...new Map(all.filter(r=>league==="ALL"||r.leagueId===league).map(r=>[r.teamId,r.teamName||r.teamId])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  tf.innerHTML='<option value="ALL">ทุกทีม</option>'+teams.map(([id,n])=>'<option value="'+esc(id)+'">'+esc(n)+'</option>').join("");tf.value=teams.some(x=>x[0]===oldT)?oldT:"ALL";
  const team=tf.value;if(pf)pf.value=oldP;const rows=all.filter(r=>(league==="ALL"||r.leagueId===league)&&(team==="ALL"||r.teamId===team)&&(!pf||pf.value==="ALL"||positionGroup(r)===pf.value)&&(!q||r.name.toLocaleLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
  $("playerDbSummary").innerHTML='<div class="db-kpi"><b>'+new Set(all.map(r=>r.playerId)).size+'</b><span>รหัสนักเตะไม่ซ้ำ</span></div><div class="db-kpi"><b>'+all.length+'</b><span>รายการนักเตะ / ทีม / ฤดูกาล</span></div>';
  const profiled=central.filter(r=>r.profileStatus==="profiled").length;
  $("playerDbStatus").textContent="ข้อมูล Cloud ส่วนตัว "+central.length+" รายการ · โปรไฟล์ "+profiled+" รายการ · ในอุปกรณ์ "+local.length+" รายการ · แสดง "+rows.length+" รายการ · "+privateStatus;
  $("playerList").innerHTML=rows.length?rows.map(r=>{
   const s=r.statistics||{},src=r.source||{},metrics=[["ลงสนาม",s.appearances],["ตัวจริง",s.lineups],["นาที",s.minutes],["ประตู",s.goals],["แอสซิสต์",s.assists],["เรตติ้ง",s.rating],["ยิงเข้ากรอบ",s.shotsOnTarget],["xG",s.xg],["xG/90",s.xgPer90],["ประตู/90",s.goalsPer90],["คีย์พาส",s.keyPasses],["ผ่านบอลสำเร็จ",s.passAccuracy===null||s.passAccuracy===undefined?null:s.passAccuracy+"%"],["เข้าสกัด",s.tackles],["ใบเหลือง",s.yellowCards],["ใบแดง",s.redCards]];
   return '<article class="card"><div class="profile-hero">'+(r.photo?'<img class="team-crest" src="'+esc(r.photo)+'" alt="" loading="lazy" onerror="this.hidden=true">':"")+'<div><b>'+esc(r.name)+'</b><div class="small">'+esc(r.teamName||"ไม่ระบุทีม")+' · '+esc(r.leagueName||r.leagueId)+' · '+esc(r.season)+'</div><div class="small">'+esc((POSITION_LABELS[positionGroup(r)]||"ไม่ระบุตำแหน่ง")+(r.position?" · "+r.position:""))+' · เบอร์ '+fmt(r.number)+' · อายุ '+fmt(r.age)+'</div></div></div><div class="p5-score">'+metrics.map(([k,v])=>'<div class="p5-metric"><b>'+fmt(v)+'</b><span>'+k+'</span></div>').join("")+'</div><div class="small">แหล่งข้อมูล: '+esc(src.provider||"ผู้ใช้นำเข้า")+' · ตรวจข้อมูล: '+esc(src.fetchedAt||"ไม่ระบุวันที่")+'</div></article>';
  }).join(""):'<div class="empty">ไม่พบข้อมูลนักเตะตามตัวกรอง หรือยังไม่มีข้อมูลจากแหล่งข้อมูล</div>';
 }
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(local));return true}catch(e){alert("บันทึกข้อมูลไม่สำเร็จ: "+e.message);return false}}
 function mapCloudRecord(r){
  const p=r.profile||{},s=r.stats||{};
  return {id:"cloud:"+String(r.id),playerId:String(r.provider_player_id||r.id),name:String(r.player_name||"ไม่ระบุชื่อ"),teamId:String(r.team_id||""),teamName:String(p.teamName||p.team_name||r.team_id||"ไม่ระบุทีม"),leagueId:String(r.league_id||""),leagueName:String(p.leagueName||p.league_name||r.league_id||"ไม่ระบุลีก"),season:String(r.season||""),position:r.position||p.position||null,number:p.number??null,age:p.age??null,photo:p.photo||p.image||p.photo_url||null,statistics:s,profileStatus:Object.keys(p).length?"profiled":"unavailable",source:{provider:r.provider||"Supabase Private Cloud",fetchedAt:r.updated_at||null}};
 }
 window.addEventListener("pft-private-player-data",event=>{
  const payload=event.detail||{};
  central=Array.isArray(payload.records)?payload.records.map(mapCloudRecord).filter(valid):[];
  meta=payload.meta||{};
  privateStatus=payload.status||"เชื่อมต่อแล้ว";
  merge();render();
 });
 window.addEventListener("pft-private-player-status",event=>{privateStatus=String(event.detail||"");render();});
 async function load(){
  try{const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");local=Array.isArray(d)?d.filter(valid):[]}catch(e){local=[]}
  central=[];merge();render();
 }
 function exportData(){const blob=new Blob([JSON.stringify({app:"Project Football Time",type:"player-database",schemaVersion:1,exportedAt:new Date().toISOString(),records:local},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pft-player-database-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function importData(event){
  const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();
  reader.onload=()=>{try{const d=JSON.parse(String(reader.result||""));if(d.type!=="player-database"||d.schemaVersion!==1||!Array.isArray(d.records)||!d.records.every(valid))throw Error("ไฟล์หรือข้อมูลนักเตะไม่ถูกต้อง");
   if(!confirm("นำเข้าข้อมูลนักเตะ "+d.records.length+" รายการ และรวมกับข้อมูลในอุปกรณ์หรือไม่?"))return;
   const map=new Map(local.map(r=>[r.id,r]));d.records.forEach(r=>map.set(r.id,r));const old=local;local=[...map.values()];if(!persist()){local=old;return}merge();render();alert("นำเข้าสำเร็จ รวม "+local.length+" รายการ");
  }catch(e){alert("นำเข้าไม่สำเร็จ: "+e.message)}finally{event.target.value=""}};
  reader.onerror=()=>alert("อ่านไฟล์ไม่ได้");reader.readAsText(file);
 }
 $("playerLeagueFilter").addEventListener("change",render);$("playerTeamFilter").addEventListener("change",render);$("playerPositionFilter")?.addEventListener("change",render);$("playerSearch").addEventListener("input",render);
 $("playerExportButton").addEventListener("click",exportData);$("playerImportButton").addEventListener("click",()=>$("playerImportFile").click());$("playerImportFile").addEventListener("change",importData);
 load();
})();