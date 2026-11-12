"use strict";
(() => {
 const KEY="pft_provisional_player_directory_2026_27_v1";
 const LEAGUES={PL:"Premier League",PD:"La Liga",BL1:"Bundesliga",SA:"Serie A",FL1:"Ligue 1"};
 const $=id=>document.getElementById(id);
 const state={rows:[],filtered:[],page:0,pageSize:60,league:"ALL",query:""};
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 function parseCSV(source){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<source.length;i++){const c=source[i];if(quoted){if(c==='"'&&source[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(cell);cell="";}else if(c==="\n"){row.push(cell);if(row.some(v=>v!==""))rows.push(row);row=[];cell="";}else if(c!=="\r")cell+=c;}
  if(quoted)throw Error("CSV มีเครื่องหมายอัญประกาศไม่ปิด");row.push(cell);if(row.some(v=>v!==""))rows.push(row);
  if(rows.length<2)throw Error("ไม่พบข้อมูลนักเตะใน CSV");
  const headers=rows.shift().map((v,i)=>i===0?v.replace(/^\uFEFF/,"").trim():v.trim());
  if(new Set(headers).size!==headers.length)throw Error("Header มีชื่อคอลัมน์ซ้ำ");
  const required=["provisional_player_key","provider","provider_player_id","player_name","season","league_ids","provider_team_ids","review_status"];
  const missing=required.filter(x=>!headers.includes(x));if(missing.length)throw Error("ขาดคอลัมน์: "+missing.join(", "));
  const seen=new Set();
  return rows.map((values,i)=>{
   if(values.length>headers.length)throw Error("แถว "+(i+2)+" มีคอลัมน์เกิน Header");
   const r={};headers.forEach((h,n)=>r[h]=(values[n]||"").trim());
   if(r.provider!=="strikerapi"||r.season!=="2026/27"||r.review_status!=="provisional_needs_manual_verification")throw Error("แถว "+(i+2)+" ไม่ใช่ข้อมูล Provisional StrikerAPI 2026/27");
   if(!r.provider_player_id||!r.player_name||!r.provisional_player_key)throw Error("แถว "+(i+2)+" ขาด Player ID / ชื่อ / Provisional key");
   const key=r.provider+"|"+r.provider_player_id;if(seen.has(key))throw Error("พบ Provider Player ID ซ้ำ: "+r.provider_player_id);seen.add(key);
   r.leagues=r.league_ids.split(";").map(x=>x.trim()).filter(x=>LEAGUES[x]);
   r.teamIds=r.provider_team_ids.split(";").map(x=>x.trim()).filter(Boolean);
   return r;
  });
 }
 function setStatus(s){$("provisionalDirectoryStatus").textContent=s;}
 function apply(){
  const q=state.query.toLocaleLowerCase();
  state.filtered=state.rows.filter(r=>(state.league==="ALL"||r.leagues.includes(state.league))&&(!q||(r.player_name+" "+r.provider_player_id+" "+r.provider_team_ids+" "+r.league_ids).toLocaleLowerCase().includes(q)));
  state.page=0;render();
 }
 function render(){
  const root=$("provisionalDirectoryRows");if(!root)return;root.replaceChildren();
  const total=state.filtered.length,start=state.page*state.pageSize,items=state.filtered.slice(start,start+state.pageSize);
  $("provisionalDirectorySummary").innerHTML=[["ทั้งหมด",state.rows.length],["ผลค้นหา",total],["ลีก",new Set(state.rows.flatMap(r=>r.leagues)).size],["สถานะ","รอตรวจสอบ"]].map(([a,b])=>'<div class="db-kpi"><b>'+esc(b)+'</b><span>'+esc(a)+'</span></div>').join("");
  if(!items.length){root.append(Object.assign(document.createElement("div"),{className:"empty",textContent:state.rows.length?"ไม่พบรายชื่อตามตัวกรอง":"ยังไม่มีข้อมูล · นำเข้าไฟล์ provisional-player-review-2026-27.csv"}));$("provisionalDirectoryPager").textContent="0 รายการ";return;}
  const table=document.createElement("div");table.className="table-scroll";
  table.innerHTML='<table><thead><tr><th>นักเตะ</th><th>ลีก</th><th>Provider ID</th><th>Provider Team ID</th><th>สถานะ</th></tr></thead><tbody>'+items.map(r=>'<tr><td><b>'+esc(r.player_name)+'</b><div class="small">'+esc(r.provisional_player_key)+'</div></td><td>'+esc(r.leagues.map(x=>LEAGUES[x]).join(", ")||"ไม่ระบุ")+'</td><td>'+esc(r.provider_player_id)+'</td><td>'+esc(r.teamIds.join(", ")||"—")+'</td><td><span class="tag">PROVISIONAL · รอตรวจ</span></td></tr>').join("")+'</tbody></table>';
  root.append(table);
  $("provisionalDirectoryPager").textContent=(start+1)+"–"+Math.min(start+items.length,total)+" จาก "+total+" รายการ";
  $("provisionalDirectoryPrev").disabled=state.page===0;
  $("provisionalDirectoryNext").disabled=start+state.pageSize>=total;
 }
 function save(rows){
  try{localStorage.setItem(KEY,JSON.stringify({schemaVersion:1,season:"2026/27",provider:"strikerapi",reviewStatus:"provisional_needs_manual_verification",importedAt:new Date().toISOString(),records:rows}));return true;}
  catch(e){throw Error("พื้นที่จัดเก็บในอุปกรณ์ไม่พอ: "+e.message);}
 }
 function loadSaved(){
  try{const value=JSON.parse(localStorage.getItem(KEY)||"null");if(value?.schemaVersion===1&&value.season==="2026/27"&&Array.isArray(value.records)){state.rows=value.records;apply();setStatus("โหลดข้อมูลจากอุปกรณ์นี้ "+state.rows.length.toLocaleString()+" รายการ · "+new Date(value.importedAt).toLocaleString("th-TH"));}}
  catch(e){setStatus("อ่านข้อมูลที่บันทึกไว้ไม่ได้: "+e.message);}
 }
 $("provisionalDirectoryFile")?.addEventListener("change",event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(file.size>8*1024*1024){setStatus("ไฟล์ใหญ่เกิน 8 MB");return;}
  const reader=new FileReader();reader.onload=()=>{
   try{const rows=parseCSV(String(reader.result||""));if(!confirm("นำเข้ารายชื่อนักเตะ "+rows.length.toLocaleString()+" รายการไว้ในอุปกรณ์นี้ และแทนที่ชุด Provisional เดิมหรือไม่?"))return;save(rows);state.rows=rows;state.league="ALL";$("provisionalDirectoryLeague").value="ALL";$("provisionalDirectorySearch").value="";state.query="";apply();setStatus("นำเข้าสำเร็จ "+rows.length.toLocaleString()+" รายการ · เก็บในอุปกรณ์นี้เท่านั้น · ไม่ใช่ Canonical Player และไม่ส่งขึ้น Cloud");}
   catch(e){setStatus("นำเข้าไม่สำเร็จ: "+e.message);}
   finally{event.target.value="";}
  };reader.onerror=()=>setStatus("อ่านไฟล์ไม่สำเร็จ");reader.readAsText(file,"utf-8");
 });
 $("provisionalDirectoryLeague")?.addEventListener("change",e=>{state.league=e.target.value;apply();});
 $("provisionalDirectorySearch")?.addEventListener("input",e=>{state.query=e.target.value;apply();});
 $("provisionalDirectoryPrev")?.addEventListener("click",()=>{state.page=Math.max(0,state.page-1);render();});
 $("provisionalDirectoryNext")?.addEventListener("click",()=>{state.page++;render();});
 loadSaved();
})();