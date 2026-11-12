"use strict";
(() => {
 const STORAGE_KEY="pft_player_identity_review_decisions_v1";
 const $=id=>document.getElementById(id);
 const state={rows:[],filter:"pending",decisions:readDecisions(),fileName:""};
 function readDecisions(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");return value&&typeof value==="object"&&!Array.isArray(value)?value:{}}catch(error){return {};}}
 function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.decisions));return true}catch(error){setStatus("บันทึกผลตรวจในอุปกรณ์ไม่สำเร็จ: "+error.message);return false;}}
 function key(row){return row.provider.toLowerCase()+"|"+row.provider_player_id;}
 function esc(value){return String(value??"");}
 function parseCSV(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
   else if(ch==='"')quoted=true;
   else if(ch===","){row.push(cell);cell="";}
   else if(ch==="\n"){row.push(cell);if(row.some(v=>v!==""))rows.push(row);row=[];cell="";}
   else if(ch!=="\r")cell+=ch;
  }
  if(quoted)throw new Error("พบเครื่องหมายอัญประกาศใน CSV ที่ไม่ปิด");
  row.push(cell);if(row.some(v=>v!==""))rows.push(row);
  if(rows.length<1)throw new Error("ไฟล์ CSV ไม่มีข้อมูล");
  const headers=rows.shift().map((v,i)=>i===0?v.replace(/^\uFEFF/,"").trim():v.trim());
  if(new Set(headers).size!==headers.length)throw new Error("ชื่อคอลัมน์ CSV ซ้ำกัน");
  const required=["provider","provider_player_id","player_name","status","canonical_player_key","candidate_keys","candidate_reasons","review_required"];
  const missing=required.filter(name=>!headers.includes(name));if(missing.length)throw new Error("ขาดคอลัมน์: "+missing.join(", "));
  return rows.map((values,index)=>{
   if(values.length>headers.length)throw new Error("แถว "+(index+2)+" มีจำนวนคอลัมน์เกิน Header");
   const item={};headers.forEach((name,i)=>item[name]=(values[i]||"").trim());
   if(!item.provider||!item.provider_player_id||!item.player_name)throw new Error("แถว "+(index+2)+" ไม่มี Provider / Player ID / ชื่อนักเตะ");
   return item;
  });
 }
 function setStatus(message){const el=$("playerIdentityReviewStatus");if(el)el.textContent=message;}
 function csvCell(value){const s=String(value??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
 function download(name,headers,rows){
  const content="\uFEFF"+[headers,...rows.map(row=>headers.map(h=>row[h]??""))].map(line=>line.map(csvCell).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([content],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function currentDecision(row){
  if(row.status==="exact_verified_mapping"&&row.canonical_player_key)return {status:"verified",canonical_player_key:row.canonical_player_key,reviewer:row.reviewer||"",reviewed_at:row.reviewed_at||""};
  return state.decisions[key(row)]||null;
 }
 function create(tag,className,text){
  const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;
 }
 function render(){
  const root=$("playerIdentityReviewRows");if(!root)return;root.replaceChildren();
  const counts={pending:0,provisional:0,approved:0,rejected:0,followup:0,verified:0};
  state.rows.forEach(row=>{const d=currentDecision(row);if(d?.status==="verified")counts.verified++;else if(d?.status==="provisional")counts.provisional++;else if(d?.status==="approved")counts.approved++;else if(d?.status==="rejected")counts.rejected++;else if(d?.status==="followup")counts.followup++;else counts.pending++;});
  $("playerIdentityReviewSummary").innerHTML=[
   ["ทั้งหมด",state.rows.length],["รอตรวจ",counts.pending],["สร้างรายการรอตรวจ",counts.provisional],["อนุมัติในเครื่อง",counts.approved],["ยืนยันเดิม",counts.verified],["ไม่ตรงกัน",counts.rejected],["ขอตรวจเพิ่ม",counts.followup]
  ].map(([label,value])=>'<div class="db-kpi"><b>'+value+'</b><span>'+label+'</span></div>').join("");
  const rows=state.rows.filter(row=>{
   const d=currentDecision(row),status=d?.status==="verified"?"verified":d?.status||"pending";
   return state.filter==="all"||state.filter===status;
  });
  if(!state.rows.length){root.append(create("div","empty","เลือกไฟล์ player-identity-review-queue.csv ที่ได้จากเครื่องมือ Reconciliation เพื่อเริ่มตรวจสอบ"));return;}
  if(!rows.length){root.append(create("div","empty","ไม่มีรายการในตัวกรองนี้"));return;}
  rows.forEach(row=>{
   const d=currentDecision(row),card=create("article","identity-review-card");
   const heading=create("div","identity-review-heading");
   heading.append(create("b","",row.player_name),create("span","tag",d?.status==="verified"?"ยืนยันแล้ว":d?.status==="approved"?"อนุมัติในเครื่อง":d?.status==="rejected"?"ไม่ใช่คนเดียวกัน":d?.status==="followup"?"ขอตรวจเพิ่ม":row.status));
   card.append(heading);
   card.append(create("div","small","Provider: "+row.provider+" · Provider Player ID: "+row.provider_player_id));
   if(row.canonical_player_key)card.append(create("div","identity-review-meta","Canonical ID: "+row.canonical_player_key));
   if(row.candidate_keys){
    const ids=row.candidate_keys.split(";").filter(Boolean);
    const reasonMap=new Map((row.candidate_reasons||"").split(";").map(part=>{const at=part.indexOf(":");return at<0?["",part]:[part.slice(0,at),part.slice(at+1)];}));
    card.append(create("div","identity-review-meta","Candidate: "+ids.map(id=>id+" ("+(reasonMap.get(id)||"รอตรวจสอบ")+")").join(" · ")));
   }
   if(row.issues)card.append(create("div","identity-review-issue",row.issues));
   if(d?.reviewer)card.append(create("div","small","ผู้ตรวจ: "+d.reviewer+" · เวลา: "+d.reviewed_at));
   if(d?.status==="provisional"){card.append(create("div","identity-review-confirm","สร้างรายการนักเตะชั่วคราวแล้ว · "+d.provisional_player_key+" · ยังไม่ใช่ Canonical ID และยังไม่ผ่านการยืนยัน"));root.append(card);return;}
   if(d?.status==="verified"||d?.status==="approved"){card.append(create("div","identity-review-confirm","ผลตรวจ: "+d.canonical_player_key+" · "+(d.status==="verified"?"ยืนยันมาจากไฟล์ Mapping":"อนุมัติในอุปกรณ์นี้")));root.append(card);return;}
   const choices=(row.candidate_keys||"").split(";").filter(Boolean);
   if(choices.length){
    const label=create("label","identity-review-label","เลือก Canonical Player ID ที่คิดว่าเป็นคนเดียวกัน");
    const select=create("select","filter");select.dataset.candidateFor=key(row);
    select.append(new Option("เลือก Candidate…",""));choices.forEach(id=>select.append(new Option(id,id)));
    card.append(label,select);
   }else card.append(create("div","identity-review-issue","ไม่มี Candidate · สร้างรายการนักเตะชั่วคราวเพื่อรอตรวจสอบได้ โดยยังไม่กำหนด Canonical ID"));
   const actions=create("div","identity-review-actions");
   if(choices.length){const approve=create("button","identity-review-approve","ยืนยันการจับคู่");approve.type="button";approve.dataset.identityAction="approve";approve.dataset.identityKey=key(row);actions.append(approve);}
   else if(row.status!=="conflicting_identity_observations"){const provisional=create("button","identity-review-approve","สร้างรายการนักเตะรอตรวจสอบ");provisional.type="button";provisional.dataset.identityAction="create-provisional";provisional.dataset.identityKey=key(row);actions.append(provisional);}
   const reject=create("button","secondary","ไม่ใช่คนเดียวกัน");reject.type="button";reject.dataset.identityAction="rejected";reject.dataset.identityKey=key(row);actions.append(reject);
   const follow=create("button","secondary","ขอตรวจสอบเพิ่ม");follow.type="button";follow.dataset.identityAction="followup";follow.dataset.identityKey=key(row);actions.append(follow);
   card.append(actions);root.append(card);
  });
 }
 function loadFile(file){
  if(!file)return;if(file.size>5*1024*1024){setStatus("ไฟล์เกิน 5 MB");return;}
  const reader=new FileReader();
  reader.onload=()=>{
   try{const rows=parseCSV(String(reader.result||""));state.rows=rows;state.fileName=file.name;render();setStatus("โหลด "+file.name+" สำเร็จ · "+rows.length+" รายการ · ประวัติการตรวจเก็บแยกในอุปกรณ์นี้");}
   catch(error){state.rows=[];render();setStatus("อ่านไฟล์ไม่สำเร็จ: "+error.message);}
  };
  reader.onerror=()=>setStatus("อ่านไฟล์ไม่สำเร็จ");reader.readAsText(file,"utf-8");
 }
 function onAction(event){
  const button=event.target.closest("[data-identity-action]");if(!button)return;
  const row=state.rows.find(item=>key(item)===button.dataset.identityKey);if(!row)return;
  const reviewer=$("playerIdentityReviewer").value.trim();
  if(!reviewer){setStatus("กรุณาระบุรหัสหรือชื่อผู้ตรวจสอบก่อนบันทึกผล");$("playerIdentityReviewer").focus();return;}
  const action=button.dataset.identityAction,select=document.querySelector('[data-candidate-for="'+CSS.escape(key(row))+'"]');
  const candidate=select?.value||"";
  if(action==="approve"&&(!candidate||(row.candidate_keys||"").split(";").indexOf(candidate)<0)){setStatus("กรุณาเลือก Candidate ที่มีอยู่ในรายการ");return;}
  if(action==="create-provisional"&&row.status==="conflicting_identity_observations"){setStatus("รายการนี้มีข้อมูลขัดแย้ง ต้องพักไว้ตรวจสอบ ห้ามสร้างรายการอัตโนมัติ");return;}
  const decision=action==="create-provisional"
   ? {status:"provisional",provisional_player_key:"provisional:"+row.provider.toLowerCase()+":"+row.provider_player_id,canonical_player_key:"",provider:row.provider,provider_player_id:row.provider_player_id,player_name:row.player_name,reviewer,reviewed_at:new Date().toISOString()}
   : {status:action,canonical_player_key:action==="approve"?candidate:"",reviewer,reviewed_at:new Date().toISOString()};
  state.decisions[key(row)]=decision;
  if(!persist())return;
  render();setStatus("บันทึกผลตรวจในอุปกรณ์นี้แล้ว · ยังไม่มีการเปลี่ยนฐานข้อมูล Cloud");
 }
 function exportMappings(){
  const headers=["provider","provider_player_id","canonical_player_key","review_status","reviewer","reviewed_at"];
  const rows=[];
  state.rows.forEach(row=>{const d=currentDecision(row);if(d&&(d.status==="verified"||d.status==="approved")&&d.canonical_player_key)rows.push({provider:row.provider,provider_player_id:row.provider_player_id,canonical_player_key:d.canonical_player_key,review_status:"verified",reviewer:d.reviewer||"",reviewed_at:d.reviewed_at||""});});
  if(!rows.length){setStatus("ยังไม่มี Mapping ที่ยืนยันแล้วให้ส่งออก");return;}
  download("player-id-mapping-reviewed.csv",headers,rows);setStatus("ส่งออก Mapping ที่มนุษย์ยืนยันแล้ว "+rows.length+" รายการ · ไม่ได้เขียนลงฐานข้อมูล");
 }
 function createAllProvisional(){
  const reviewer=$("playerIdentityReviewer").value.trim();
  if(!reviewer){setStatus("กรุณาระบุรหัสหรือชื่อผู้ตรวจสอบก่อนสร้างรายการ");$("playerIdentityReviewer").focus();return;}
  let created=0,held=0;
  state.rows.forEach(row=>{
   if(row.status==="conflicting_identity_observations"){held++;return;}
   const existing=currentDecision(row);
   if(existing?.status==="verified"||existing?.status==="approved"||existing?.status==="provisional")return;
   state.decisions[key(row)]={status:"provisional",provisional_player_key:"provisional:"+row.provider.toLowerCase()+":"+row.provider_player_id,canonical_player_key:"",provider:row.provider,provider_player_id:row.provider_player_id,player_name:row.player_name,reviewer,reviewed_at:new Date().toISOString()};
   created++;
  });
  if(!persist())return;
  render();setStatus("สร้างรายการนักเตะรอตรวจสอบ "+created+" รายการ · พักรายการขัดแย้ง "+held+" รายการ · ยังไม่มี Canonical ID และไม่เขียน Cloud");
 }
 function exportProvisional(){
  const headers=["provisional_player_key","provider","provider_player_id","player_name","season","league_ids","provider_team_ids","review_status","reviewer","reviewed_at"];
  const rows=state.rows.map(row=>({row,d:currentDecision(row)})).filter(x=>x.d?.status==="provisional").map(({row,d})=>({provisional_player_key:d.provisional_player_key,provider:row.provider,provider_player_id:row.provider_player_id,player_name:row.player_name,season:"2026/27",league_ids:row.league_ids||"",provider_team_ids:row.provider_team_ids||"",review_status:"provisional_needs_manual_verification",reviewer:d.reviewer||"",reviewed_at:d.reviewed_at||""}));
  if(!rows.length){setStatus("ยังไม่มีรายการนักเตะชั่วคราวให้ส่งออก");return;}
  download("provisional-player-review-2026-27.csv",headers,rows);setStatus("ส่งออกรายการนักเตะรอตรวจสอบ "+rows.length+" รายการ · ไม่มี Canonical ID");
 }
 function exportDecisions(){
  const headers=["provider","provider_player_id","player_name","decision","canonical_player_key","reviewer","reviewed_at","source_status"];
  const rows=state.rows.map(row=>{const d=currentDecision(row)||{};return {provider:row.provider,provider_player_id:row.provider_player_id,player_name:row.player_name,decision:d.status||"pending",canonical_player_key:d.canonical_player_key||"",reviewer:d.reviewer||"",reviewed_at:d.reviewed_at||"",source_status:row.status};});
  if(!rows.length){setStatus("ยังไม่มีคิวให้ส่งออกรายงาน");return;}
  download("player-identity-review-decisions.csv",headers,rows);setStatus("ส่งออกรายงานผลตรวจ "+rows.length+" รายการแล้ว");
 }
 $("playerIdentityReviewFile")?.addEventListener("change",event=>loadFile(event.target.files?.[0]));
 $("playerIdentityReviewRows")?.addEventListener("click",onAction);
 $("playerIdentityReviewFilter")?.addEventListener("change",event=>{state.filter=event.target.value;render();});
 $("playerIdentityExportMappings")?.addEventListener("click",exportMappings);
 $("playerIdentityExportDecisions")?.addEventListener("click",exportDecisions);
 $("playerIdentityCreateAllProvisional")?.addEventListener("click",createAllProvisional);
 $("playerIdentityExportProvisional")?.addEventListener("click",exportProvisional);
 $("playerIdentityReviewClear")?.addEventListener("click",()=>{state.rows=[];state.fileName="";$("playerIdentityReviewFile").value="";render();setStatus("ล้างเฉพาะคิวที่เปิดอยู่ · ประวัติการตรวจยังคงอยู่ในอุปกรณ์");});
 render();
})();
