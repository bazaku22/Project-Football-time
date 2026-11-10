"use strict";
(() => {
 const DB_URL="./data/player-database.json", STORAGE_KEY="pft_players_v1";
 let central=[],local=[],all=[],meta={};
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const valid=r=>r&&typeof r==="object"&&["id","playerId","name","teamId","leagueId","season"].every(k=>typeof r[k]==="string")&&r.statistics&&typeof r.statistics==="object";
 const merge=()=>{const m=new Map();central.forEach(r=>{if(valid(r))m.set(r.id,r)});local.forEach(r=>{if(valid(r))m.set(r.id,r)});all=[...m.values()]};
 const fmt=v=>v===null||v===undefined||v===""?"—":esc(v);
 function render(){
  const lf=$("playerLeagueFilter"),tf=$("playerTeamFilter"),q=$("playerSearch").value.trim().toLocaleLowerCase(),oldL=lf.value||"ALL",oldT=tf.value||"ALL";
  const leagues=[...new Map(all.map(r=>[r.leagueId,r.leagueName||r.leagueId])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  lf.innerHTML='<option value="ALL">ทุกลีก</option>'+leagues.map(([id,n])=>'<option value="'+esc(id)+'">'+esc(n)+'</option>').join("");lf.value=leagues.some(x=>x[0]===oldL)?oldL:"ALL";
  const league=lf.value,teams=[...new Map(all.filter(r=>league==="ALL"||r.leagueId===league).map(r=>[r.teamId,r.teamName||r.teamId])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  tf.innerHTML='<option value="ALL">ทุกทีม</option>'+teams.map(([id,n])=>'<option value="'+esc(id)+'">'+esc(n)+'</option>').join("");tf.value=teams.some(x=>x[0]===oldT)?oldT:"ALL";
  const team=tf.value,rows=all.filter(r=>(league==="ALL"||r.leagueId===league)&&(team==="ALL"||r.teamId===team)&&(!q||r.name.toLocaleLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));
  $("playerDbSummary").innerHTML='<div class="db-kpi"><b>'+new Set(all.map(r=>r.playerId)).size+'</b><span>รหัสนักเตะไม่ซ้ำ</span></div><div class="db-kpi"><b>'+all.length+'</b><span>รายการนักเตะ / ทีม / ฤดูกาล</span></div>';
  const profiled=central.filter(r=>r.profileStatus==="profiled").length;
  $("playerDbStatus").textContent="ข้อมูลส่วนกลาง "+central.length+" รายการ · โปรไฟล์สถิติ "+profiled+" รายการ · ในอุปกรณ์ "+local.length+" รายการ · แสดง "+rows.length+" รายการ";
  $("playerList").innerHTML=rows.length?rows.map(r=>{
   const s=r.statistics||{},src=r.source||{},metrics=[["ลงสนาม",s.appearances],["ตัวจริง",s.lineups],["นาที",s.minutes],["ประตู",s.goals],["แอสซิสต์",s.assists],["เรตติ้ง",s.rating],["ยิงเข้ากรอบ",s.shotsOnTarget],["xG",s.xg],["xG/90",s.xgPer90],["ประตู/90",s.goalsPer90],["คีย์พาส",s.keyPasses],["ผ่านบอลสำเร็จ",s.passAccuracy===null||s.passAccuracy===undefined?null:s.passAccuracy+"%"],["เข้าสกัด",s.tackles],["ใบเหลือง",s.yellowCards],["ใบแดง",s.redCards]];
   return '<article class="card"><div class="profile-hero">'+(r.photo?'<img class="team-crest" src="'+esc(r.photo)+'" alt="" loading="lazy" onerror="this.hidden=true">':"")+'<div><b>'+esc(r.name)+'</b><div class="small">'+esc(r.teamName||"ไม่ระบุทีม")+' · '+esc(r.leagueName||r.leagueId)+' · '+esc(r.season)+'</div><div class="small">'+esc(r.position||"ไม่ระบุตำแหน่ง")+' · เบอร์ '+fmt(r.number)+' · อายุ '+fmt(r.age)+'</div></div></div><div class="p5-score">'+metrics.map(([k,v])=>'<div class="p5-metric"><b>'+fmt(v)+'</b><span>'+k+'</span></div>').join("")+'</div><div class="small">แหล่งข้อมูล: '+esc(src.provider||"ผู้ใช้นำเข้า")+' · ตรวจข้อมูล: '+esc(src.fetchedAt||"ไม่ระบุวันที่")+'</div></article>';
  }).join(""):'<div class="empty">ไม่พบข้อมูลนักเตะตามตัวกรอง หรือยังไม่มีข้อมูลจากแหล่งข้อมูล</div>';
 }
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(local));return true}catch(e){alert("บันทึกข้อมูลไม่สำเร็จ: "+e.message);return false}}
 async function load(){
  try{const r=await fetch(DB_URL+"?v="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const d=await r.json();if(d.schemaVersion!==1||!Array.isArray(d.records))throw Error("schema ไม่ถูกต้อง");meta=d.source||{};central=d.records.filter(valid)}
  catch(e){central=[];$("playerDbStatus").textContent="ยังโหลดข้อมูลส่วนกลางไม่ได้: "+e.message}
  try{const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");local=Array.isArray(d)?d.filter(valid):[]}catch(e){local=[]}
  merge();render();
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
 $("playerLeagueFilter").addEventListener("change",render);$("playerTeamFilter").addEventListener("change",render);$("playerSearch").addEventListener("input",render);
 $("playerExportButton").addEventListener("click",exportData);$("playerImportButton").addEventListener("click",()=>$("playerImportFile").click());$("playerImportFile").addEventListener("change",importData);
 load();
})();