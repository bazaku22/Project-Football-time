"use strict";
(() => {
 const $=id=>document.getElementById(id),panel=$("playerStatsImportPanel");
 if(!panel)return;
 const state={preview:null},required=["provider","provider_player_id","player_name","team_code","season","competition_code","squad_level","statistics_scope","collected_at","rights_status","permission_reference"];
 const metrics=["appearances","starts","minutes","goals","assists","shots","shots_on_target","xg","xa","yellow_cards","red_cards","saves","clean_sheets"];
 const integerMetrics=new Set(metrics.filter(x=>x!=="xg"&&x!=="xa"));
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function parseCsv(input){
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<input.length;i++){const c=input[i],n=input[i+1];
   if(quoted){if(c==='"'&&n==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;}
   else if(c==='"'&&field==="")quoted=true;
   else if(c===","){row.push(field);field="";}
   else if(c==="\n"||c==="\r"){if(c==="\r"&&n==="\n")i++;row.push(field);field="";if(row.some(v=>v.trim()))rows.push(row);row=[];}
   else field+=c;
  }
  if(quoted)throw Error("พบอัญประกาศที่ไม่ปิด");
  if(field!==""||row.length){row.push(field);if(row.some(v=>v.trim()))rows.push(row);}
  if(!rows.length)throw Error("CSV ว่าง");
  const headers=rows.shift().map(v=>v.trim().replace(/^\uFEFF/,""));
  if(headers.some(v=>!v)||new Set(headers).size!==headers.length)throw Error("พบชื่อคอลัมน์ว่างหรือซ้ำ");
  return rows.map((values,i)=>{const r={_line:i+2};if(values.length!==headers.length){r._row_issue=values.length>headers.length?"จำนวนช่องเกินหัวตาราง":"จำนวนช่องไม่ครบหัวตาราง";return r;}headers.forEach((h,j)=>r[h]=(values[j]??"").trim());return r;}).filter(r=>Object.keys(r).some(k=>k.startsWith("_")?k==="_row_issue":r[k]));
 }
 async function read(file){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||""));r.onerror=()=>no(Error("อ่านไฟล์ไม่ได้"));r.readAsText(file,"UTF-8");});}
 async function hash(file){if(!crypto?.subtle)return "unavailable";const b=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
 function validate(row,map,seen){
  const issues=[];if(row._row_issue)issues.push(row._row_issue);
  for(const k of required)if(!row[k])issues.push("ขาด "+k);
  if(row.season&&row.season!=="2026/27")issues.push("อยู่นอกฤดูกาล 2026/27");
  if(row.squad_level&&!["first_team","u21","u18","other_youth"].includes(row.squad_level))issues.push("squad_level ไม่ถูกต้อง");
  if(row.statistics_scope&&!["season","competition","match"].includes(row.statistics_scope))issues.push("statistics_scope ไม่ถูกต้อง");
  if(row.collected_at&&!(/^\d{4}-\d\d-\d\dT/.test(row.collected_at)&&!Number.isNaN(Date.parse(row.collected_at))))issues.push("collected_at ต้องเป็น ISO 8601");
  if(row.statistics_scope==="match"){if(!row.match_id)issues.push("match scope ต้องมี match_id");if(!row.stat_date||!/^\d{4}-\d\d-\d\d$/.test(row.stat_date)||Number.isNaN(Date.parse(row.stat_date+"T00:00:00Z")))issues.push("match scope ต้องมี stat_date ที่ถูกต้อง");}
  else if(row.match_id||row.stat_date)issues.push("match_id/stat_date ต้องว่างนอก match scope");
  const values={};for(const k of metrics){if(!row[k])continue;const n=Number(row[k]);if(!Number.isFinite(n)||n<0||(integerMetrics.has(k)&&!Number.isInteger(n)))issues.push(k+" ต้องเป็นตัวเลขไม่ติดลบ"+(integerMetrics.has(k)?"และเป็นจำนวนเต็ม":""));else values[k]=n;}
  if(values.starts!=null&&values.appearances!=null&&values.starts>values.appearances)issues.push("starts มากกว่า appearances");
  if(values.shots_on_target!=null&&values.shots!=null&&values.shots_on_target>values.shots)issues.push("shots_on_target มากกว่า shots");
  if(row.rights_status!=="approved")issues.push("สิทธิ์ข้อมูลยังไม่ approved");
  const key=(row.provider||"").toLowerCase()+"|"+(row.provider_player_id||""),mapped=map.get(key);
  if(!mapped)issues.push("ไม่พบ exact provider/player ID mapping");
  else{if(row.canonical_player_key&&row.canonical_player_key!==mapped.canonical_player_key)issues.push("canonical_player_key ขัดแย้งกับ mapping");if(mapped.team_code&&mapped.team_code!==row.team_code)issues.push("team_code ไม่ตรง mapping");if(mapped.season&&mapped.season!==row.season)issues.push("season ไม่ตรง mapping");row.canonical_player_key=mapped.canonical_player_key;}
  const natural=[row.canonical_player_key,row.provider,row.season,row.competition_code,row.team_code,row.squad_level,row.statistics_scope,row.statistics_scope==="match"?row.match_id:""].join("|");
  if(seen.has(natural))issues.push("ซ้ำกับแถว "+seen.get(natural));else seen.set(natural,row._line);
  return issues;
 }
 function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 function csv(rows,headers){const q=v=>{const s=String(v??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};return [headers.map(q).join(","),...rows.map(r=>headers.map(h=>q(r[h])).join(","))].join("\r\n");}
 function render(){
  const p=state.preview;if(!p)return;const pass=p.rows.filter(r=>!r.issues.length).length;
  $("playerStatsImportSummary").innerHTML='<div class="db-kpis"><div class="db-kpi"><b>'+p.rows.length+'</b><span>แถวทั้งหมด</span></div><div class="db-kpi"><b>'+pass+'</b><span>ผ่าน preflight</span></div><div class="db-kpi"><b>'+(p.rows.length-pass)+'</b><span>กักกัน / ต้องตรวจสอบ</span></div></div><div class="small">SHA-256 สถิติ: '+esc(p.statsHash.slice(0,16))+'… · Mapping: '+esc(p.mapHash.slice(0,16))+'…</div>';
  $("playerStatsImportRows").innerHTML=p.rows.map(r=>'<article class="match-row"><div class="topline"><b>'+esc(r.player_name||"ไม่ระบุชื่อ")+'</b><span class="tag">'+(r.issues.length?"กักกัน":"ผ่าน preflight")+'</span></div><div class="small">แถว '+r.line+' · '+esc(r.provider||"—")+':'+esc(r.provider_player_id||"—")+' · '+esc(r.team_code||"—")+' · '+esc(r.season||"—")+'</div><div class="small">Canonical: '+esc(r.canonical_player_key||"ไม่พบ")+' · '+esc(r.competition_code||"—")+'</div>'+(r.issues.length?'<div class="small p5-warn">'+r.issues.map(esc).join(" · ")+'</div>':'<div class="small p5-good">ผ่านโครงสร้างและ exact provider ID mapping · ยังต้องตรวจสิทธิ์โดยมนุษย์</div>')+'</article>').join("")||'<div class="empty">ไม่มีแถวข้อมูล</div>';
  $("playerStatsImportDownloads").hidden=false;
 }
 async function build(){
  const sf=$("playerStatsCsv").files?.[0],mf=$("playerStatsMappingCsv").files?.[0];
  if(!sf||!mf){$("playerStatsImportStatus").textContent="กรุณาเลือกไฟล์ทั้งสองรายการ";return;}
  if(sf.size>5*1024*1024||mf.size>2*1024*1024){$("playerStatsImportStatus").textContent="ไฟล์เกินขนาดที่กำหนด (5 MB / 2 MB)";return;}
  $("playerStatsImportStatus").textContent="กำลังตรวจสอบ CSV ในอุปกรณ์นี้…";$("playerStatsImportDownloads").hidden=true;
  try{
   const [st,mt,sh,mh]=await Promise.all([read(sf),read(mf),hash(sf),hash(mf)]),source=parseCsv(st),mapRows=parseCsv(mt);
   if(!source.length||!mapRows.length)throw Error("ไม่พบแถวข้อมูล");
   const missing=required.filter(k=>!Object.hasOwn(source[0],k)).concat(Object.hasOwn(source[0],"provider_player_id")?[]:["provider_player_id"]);
   if(missing.length)throw Error("CSV สถิติขาดคอลัมน์: "+missing.join(", "));
   const mm=["provider","provider_player_id","canonical_player_key"].filter(k=>!Object.hasOwn(mapRows[0],k));if(mm.length)throw Error("Mapping CSV ขาดคอลัมน์: "+mm.join(", "));
   const map=new Map();for(const r of mapRows){if(r._row_issue||!r.provider||!r.provider_player_id||!r.canonical_player_key)throw Error("Mapping แถว "+r._line+" ไม่สมบูรณ์");const k=r.provider.toLowerCase()+"|"+r.provider_player_id;if(map.has(k))throw Error("Mapping ซ้ำ: "+k);map.set(k,{canonical_player_key:r.canonical_player_key,team_code:r.team_code||"",season:r.season||""});}
   const seen=new Map(),rows=source.map(r=>({line:r._line,player_name:r.player_name,provider:r.provider,provider_player_id:r.provider_player_id,team_code:r.team_code,season:r.season,competition_code:r.competition_code,statistics_scope:r.statistics_scope,canonical_player_key:r.canonical_player_key||"",issues:validate(r,map,seen),raw:r}));
   state.preview={rows,statsHash:sh,mapHash:mh,sourceName:sf.name,mapName:mf.name};render();$("playerStatsImportStatus").textContent="Preview สำเร็จ · ไม่ส่งไฟล์ออกจากอุปกรณ์และไม่มีการเขียนฐานข้อมูล";
  }catch(e){state.preview=null;$("playerStatsImportSummary").innerHTML="";$("playerStatsImportRows").innerHTML="";$("playerStatsImportStatus").textContent="ตรวจสอบไม่สำเร็จ: "+e.message;}
 }
 $("playerStatsBuildPreview").addEventListener("click",build);
 $("playerStatsDownloadJson").addEventListener("click",()=>{const p=state.preview;if(!p)return;download("football-time-player-stats-preview.json",JSON.stringify({app:"Project Football Time",type:"player-statistics-import-preview",preview_only:true,season_scope:"2026/27",source_file:p.sourceName,source_sha256:p.statsHash,mapping_file:p.mapName,mapping_sha256:p.mapHash,rows:p.rows.map(({raw,...r})=>({...r,status:r.issues.length?"quarantined":"structurally_valid_pending_human_review"})),notice:"Preview only. No database writes. Passing rows require human rights review and an authorized transactional import endpoint."},null,2),"application/json");});
 $("playerStatsDownloadCsv").addEventListener("click",()=>{const p=state.preview;if(!p)return;const rows=p.rows.map(r=>({line:r.line,player_name:r.player_name,provider:r.provider,provider_player_id:r.provider_player_id,canonical_player_key:r.canonical_player_key,team_code:r.team_code,season:r.season,competition_code:r.competition_code,statistics_scope:r.statistics_scope,status:r.issues.length?"quarantined":"structurally_valid_pending_human_review",issues:r.issues.join(" | ")}));download("football-time-player-stats-preview.csv",csv(rows,Object.keys(rows[0]||{line:""})),"text/csv;charset=utf-8");});
 $("playerStatsReset").addEventListener("click",()=>{$("playerStatsCsv").value="";$("playerStatsMappingCsv").value="";state.preview=null;$("playerStatsImportSummary").innerHTML="";$("playerStatsImportRows").innerHTML="";$("playerStatsImportDownloads").hidden=true;$("playerStatsImportStatus").textContent="ล้างไฟล์และ Preview แล้ว · ข้อมูลเดิมไม่เปลี่ยนแปลง";});
})();