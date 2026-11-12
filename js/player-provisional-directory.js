"use strict";
(() => {
 const KEY="pft_provisional_player_directory_2026_27_v1";
 const $=id=>document.getElementById(id);
 const REQUIRED=["provisional_player_key","provider","provider_player_id","player_name","season","league_ids","provider_team_ids","review_status","reviewer","reviewed_at"];
 const LEAGUES={PL:"Premier League",PD:"La Liga",BL1:"Bundesliga",SA:"Serie A",FL1:"Ligue 1"};
 const state={rows:[],importedAt:null};
 function parseCSV(input){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<input.length;i++){
   const ch=input[i],next=input[i+1];
   if(quoted){if(ch==='"'&&next==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
   else if(ch==='"'&&cell==="")quoted=true;
   else if(ch===","){row.push(cell);cell="";}
   else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&next==="\n")i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell="";}
   else cell+=ch;
  }
  if(quoted)throw Error("CSV มีเครื่องหมายอัญประกาศที่ไม่ปิด");
  if(cell!==""||row.length){row.push(cell);if(row.some(x=>x.trim()))rows.push(row);}
  if(!rows.length)throw Error("CSV ไม่มีข้อมูล");
  const headers=rows.shift().map((x,i)=>i===0?x.replace(/^\uFEFF/,"").trim():x.trim());
  if(headers.some(x=>!x)||new Set(headers).size!==headers.length)throw Error("Header ว่างหรือซ้ำ");
  const missing=REQUIRED.filter(x=>!headers.includes(x));if(missing.length)throw Error("ขาดคอลัมน์: "+missing.join(", "));
  return rows.map((values,i)=>{
   if(values.length!==headers.length)throw Error("จำนวนคอลัมน์ผิดที่แถว "+(i+2));
   const item={};headers.forEach((h,j)=>item[h]=(values[j]||"").trim());return item;
  });
 }
 function validate(rows){
  if(!rows.length)throw Error("ไม่พบรายการนักเตะ");
  if(rows.length>10000)throw Error("จำนวนรายการเกินขีดจำกัด 10,000 คน");
  const seen=new Set();
  rows.forEach((r,i)=>{
   const line=i+2;
   for(const field of REQUIRED)if(!r[field])throw Error("แถว "+line+" ขาด "+field);
   if(r.provider!=="strikerapi")throw Error("แถว "+line+" ไม่ใช่ StrikerAPI");
   if(r.season!=="2026/27")throw Error("แถว "+line+" ไม่ใช่ฤดูกาล 2026/27");
   if(!Object.hasOwn(LEAGUES,r.league_ids))throw Error("แถว "+line+" มี League ID ที่ไม่รองรับ");
   if(r.review_status!=="provisional_needs_manual_verification")throw Error("แถว "+line+" ไม่ใช่ Provisional Review record");
   if(!/^\d+$/.test(r.provider_player_id)||!/^\d+$/.test(r.provider_team_ids))throw Error("แถว "+line+" มี Provider ID ไม่ถูกต้อง");
   if(r.provisional_player_key!=="provisional:strikerapi:"+r.provider_player_id)throw Error("แถว "+line+" มี provisional key ไม่ตรง Provider Player ID");
   if(Number.isNaN(Date.parse(r.reviewed_at)))throw Error("แถว "+line+" มี reviewed_at ไม่ถูกต้อง");
   if(seen.has(r.provider_player_id))throw Error("พบ Provider Player ID ซ้ำ: "+r.provider_player_id);
   seen.add(r.provider_player_id);
  });
 }
 function toPlayers(rows){
  return rows.map(r=>({
   id:r.provisional_player_key,name:r.player_name,display_name:r.player_name,
   provider:"strikerapi",providerPlayerId:r.provider_player_id,providerTeamId:r.provider_team_ids,
   teamId:"strikerapi-team:"+r.provider_team_ids,
   teamName:"รอยืนยันทีม · Provider ID "+r.provider_team_ids,
   leagueId:r.league_ids,leagueName:LEAGUES[r.league_ids],season:r.season,
   positionGroup:"UNKNOWN",position:null,number:null,age:null,nationality:null,
   verificationStatus:r.review_status,reviewer:r.reviewer,reviewedAt:r.reviewed_at,
   statistics:{},photoUrl:null
  }));
 }
 function publish(status){
  window.dispatchEvent(new CustomEvent("pft-provisional-player-directory-data",{detail:{players:toPlayers(state.rows),status}}));
  const label=$("provisionalPlayerImportStatus");if(label)label.textContent=status;
 }
 function load(){
  try{
   const saved=JSON.parse(localStorage.getItem(KEY)||"null");
   if(saved&&saved.schemaVersion===1&&Array.isArray(saved.rows)){
    validate(saved.rows);state.rows=saved.rows;state.importedAt=saved.importedAt||null;
    publish("โหลดรายชื่อนักเตะ Provisional "+state.rows.length.toLocaleString("en-US")+" คนจากอุปกรณ์นี้ · นำเข้าเมื่อ "+(state.importedAt||"ไม่ระบุ"));
   }else publish("ยังไม่มีรายการนักเตะที่นำเข้าในอุปกรณ์นี้");
  }catch(error){state.rows=[];publish("อ่านข้อมูล Provisional ที่บันทึกไว้ไม่สำเร็จ: "+error.message);}
 }
 async function importFile(){
  const file=$("provisionalPlayerCsv")?.files?.[0];if(!file){publish("กรุณาเลือกไฟล์ CSV ก่อน");return;}
  if(file.size>5*1024*1024){publish("ไฟล์ใหญ่เกิน 5 MB");return;}
  const button=$("provisionalPlayerImport");button.disabled=true;publish("กำลังตรวจสอบ CSV ในอุปกรณ์นี้…");
  try{
   const content=await file.text(),rows=parseCSV(content);validate(rows);
   const importedAt=new Date().toISOString();
   const payload={schemaVersion:1,season:"2026/27",provider:"strikerapi",importedAt,recordCount:rows.length,rows};
   localStorage.setItem(KEY,JSON.stringify(payload));
   state.rows=rows;state.importedAt=importedAt;
   publish("นำเข้าสำเร็จ "+rows.length.toLocaleString("en-US")+" คน · แสดงในแท็บ Provisional · บันทึกเฉพาะอุปกรณ์นี้");
  }catch(error){publish("นำเข้าไม่สำเร็จ: "+(error.message||"เกิดข้อผิดพลาด")+" · ข้อมูลเดิมไม่ถูกเปลี่ยน");}
  finally{button.disabled=false;}
 }
 function exportRows(){
  if(!state.rows.length){publish("ยังไม่มีข้อมูลสำหรับส่งออก");return;}
  const headers=REQUIRED,cell=v=>{const s=String(v??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const content="\uFEFF"+[headers.join(","),...state.rows.map(r=>headers.map(h=>cell(r[h])).join(","))].join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");
  a.href=url;a.download="provisional-player-review-2026-27-local.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 $("provisionalPlayerImport")?.addEventListener("click",importFile);
 $("provisionalPlayerExport")?.addEventListener("click",exportRows);
 load();
})();
