"use strict";
(() => {
 const $=id=>document.getElementById(id),panel=$("playerResearchIntakePanel");
 if(!panel)return;
 const state={membership:null,statistics:null,report:null};
 const leagues={PL:"Premier League",PD:"La Liga",BL1:"Bundesliga",SA:"Serie A",FL1:"Ligue 1"};
 const metricNames=new Set(["appearances","starts","minutes","goals","assists","yellow_cards","red_cards","clean_sheets","saves","goals_conceded","xg","xa","shots","shots_on_target","key_passes","tackles","interceptions","passes_completed","passes_attempted"]);
 const squadLevels=new Set(["first_team","u21","u18","reserve","unknown"]);
 const https=v=>typeof v==="string"&&/^https:\/\//i.test(v);
 const add=(a,m)=>a.push(m);
 function inspectSource(source,label,issues){
  if(!source||typeof source!=="object"||Array.isArray(source)){add(issues,label+": source ต้องเป็น object");return;}
  const id=source.id||"ไม่ระบุ ID";
  for(const field of ["publisher","source_scope","licence_id","licence_reviewed_at"])if(!source[field])add(issues,label+" "+id+": ขาด "+field);
  for(const field of ["source_url","licence_url"])if(!https(source[field]))add(issues,label+" "+id+": "+field+" ต้องเป็น HTTPS");
  if(source.rights_review_status!=="approved")add(issues,label+" "+id+": rights review ยังไม่ approved");
  for(const field of ["commercial_use_allowed","database_rights_reviewed","redistribution_allowed"])if(source[field]!==true)add(issues,label+" "+id+": "+field+" ไม่ได้รับอนุญาต/ยังไม่ยืนยัน");
  if(source.attribution_required===true&&!source.attribution_text)add(issues,label+" "+id+": ขาด attribution_text");
  if(label==="statistics"&&(!source.metric_definitions||typeof source.metric_definitions!=="object"||Array.isArray(source.metric_definitions)))add(issues,label+" "+id+": metric_definitions ต้องเป็น object");
 }
 function validateManifest(data,type){
  const issues=[],isMembership=type==="membership",rowsKey=isMembership?"memberships":"statistics";
  if(!data||typeof data!=="object"||Array.isArray(data))return {issues:["ไฟล์ต้องเป็น JSON object"],rows:[],sources:[],status:"BLOCKED"};
  if(data.schemaVersion!==1)add(issues,"schemaVersion ต้องเท่ากับ 1");
  if(data.season!=="2026/27")add(issues,"season ต้องเป็น 2026/27");
  if(!["draft","research_only"].includes(data.status))add(issues,"status ต้องเป็น draft หรือ research_only");
  if(data.production_import!==false)add(issues,"production_import ต้องเป็น false");
  if(data.provider_api_calls!==0)add(issues,"provider_api_calls ต้องเป็น 0");
  const sources=Array.isArray(data.sources)?data.sources:[];
  const rows=Array.isArray(data[rowsKey])?data[rowsKey]:[];
  if(!Array.isArray(data.sources))add(issues,"sources ต้องเป็น array");
  if(!Array.isArray(data[rowsKey]))add(issues,rowsKey+" ต้องเป็น array");
  const sourceMap=new Map(),seenRows=new Set(),seenPairs=new Set();
  sources.forEach(source=>{if(!source||!source.id||sourceMap.has(source.id))add(issues,"source ID ว่างหรือซ้ำ");else sourceMap.set(source.id,source);inspectSource(source,type,issues);});
  rows.forEach((row,i)=>{
   const tag=rowsKey+" แถว "+(i+1);
   if(!row||typeof row!=="object"||Array.isArray(row)){add(issues,tag+": ต้องเป็น object");return;}
   if(!row.id||seenRows.has(row.id))add(issues,tag+": ID ว่างหรือซ้ำ");
   seenRows.add(row.id);
   if(row.season!=="2026/27")add(issues,tag+": season ไม่ใช่ 2026/27");
   if(!Object.prototype.hasOwnProperty.call(leagues,row.league_id))add(issues,tag+": league_id ต้องเป็นหนึ่งใน PL, PD, BL1, SA, FL1");
   if(!row.source_id||!sourceMap.has(row.source_id))add(issues,tag+": source_id ไม่อยู่ใน source registry");
   if(row.rights_status!=="approved")add(issues,tag+": rights_status ไม่ approved");
   if(isMembership){
    for(const field of ["id","player_name","source_player_id","club_id","club_name","observed_at"])if(!row[field])add(issues,tag+": ขาด "+field);
    if(!squadLevels.has(row.squad_level))add(issues,tag+": squad_level ไม่ถูกต้อง");
    if(row.membership_status!=="current_verified")add(issues,tag+": membership_status ไม่ current_verified");
    const pair=JSON.stringify([row.league_id,row.club_id,row.season,row.source_player_id]);
    if(seenPairs.has(pair))add(issues,tag+": source player membership ซ้ำ");
    seenPairs.add(pair);
    if(!["registered_squad","first_team_roster","academy_roster"].includes(row.membership_type))add(issues,tag+": membership_type ไม่ถูกต้อง");
    if(!https(row.evidence_url))add(issues,tag+": evidence_url ต้องเป็น HTTPS");
   }else{
    for(const field of ["id","canonical_player_key","provider_player_id","club_id","club_name","competition_id","observed_at"])if(!row[field])add(issues,tag+": ขาด "+field);
    if(row.identity_match_status!=="exact")add(issues,tag+": identity_match_status ต้องเป็น exact");
    if(!https(row.evidence_url))add(issues,tag+": evidence_url ต้องเป็น HTTPS");
    if(!row.metrics||typeof row.metrics!=="object"||Array.isArray(row.metrics)||!Object.keys(row.metrics).length)add(issues,tag+": ต้องมี metrics");
    else Object.entries(row.metrics).forEach(([name,value])=>{
     if(!metricNames.has(name))add(issues,tag+": ไม่รองรับ metric "+name);
     if(typeof value!=="number"||!Number.isFinite(value)||value<0)add(issues,tag+": metric "+name+" ต้องเป็นตัวเลขไม่ติดลบ");
     const source=sourceMap.get(row.source_id);
     if(!source?.metric_definitions||!source.metric_definitions[name])add(issues,tag+": metric "+name+" ไม่มี source definition");
    });
    const metrics=row.metrics||{};
    if(Number.isFinite(metrics.starts)&&Number.isFinite(metrics.appearances)&&metrics.starts>metrics.appearances)add(issues,tag+": starts มากกว่า appearances");
    if(Number.isFinite(metrics.minutes)&&Number.isFinite(metrics.appearances)&&metrics.minutes>metrics.appearances*150)add(issues,tag+": minutes เกินขอบเขตตรวจสอบเบื้องต้น");
    if(Number.isFinite(metrics.shots_on_target)&&Number.isFinite(metrics.shots)&&metrics.shots_on_target>metrics.shots)add(issues,tag+": shots_on_target มากกว่า shots");
   }
  });
  if(data.records_count!==rows.length)add(issues,"records_count ไม่ตรงกับจำนวน "+rowsKey);
  if(!rows.length&&data.status!=="draft")add(issues,"manifest ว่างต้องมี status=draft");
  return {issues,rows,sources,status:issues.length?"BLOCKED":(rows.length?"LOCAL PREVIEW":"EMPTY DRAFT")};
 }
 function readFile(file){return new Promise((resolve,reject)=>{if(!file){resolve(null);return;}if(file.size>5*1024*1024){reject(Error("ไฟล์เกิน 5 MB"));return;}const reader=new FileReader();reader.onload=()=>{try{resolve(JSON.parse(String(reader.result||"")));}catch(e){reject(Error("JSON ไม่ถูกต้อง: "+e.message));}};reader.onerror=()=>reject(Error("อ่านไฟล์ไม่ได้"));reader.readAsText(file,"UTF-8");});}
 function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function render(){
  const m=state.membership,s=state.statistics,crossIssues=[],mRows=m?.rows?.length||0,sRows=s?.rows?.length||0;
  const mSources=new Map((m?.sources||[]).filter(x=>x&&x.id).map(x=>[x.id,x]));
  (s?.sources||[]).forEach(source=>{
   const other=mSources.get(source?.id);
   if(!other)return;
   for(const field of ["publisher","source_scope","source_url","licence_id","licence_url","licence_reviewed_at","rights_review_status","commercial_use_allowed","database_rights_reviewed","redistribution_allowed","attribution_required","attribution_text"])
    if(other[field]!==source[field])crossIssues.push("source "+source.id+": Membership/Statistics ไม่ตรงกันที่ "+field);
  });
  const all=[...(m?.issues||[]),...(s?.issues||[]),...crossIssues];
  const readyM=!!m&&!m.issues.length&&mRows>0,readyS=!!s&&!s.issues.length&&sRows>0,blocked=all.length>0||!readyM||!readyS;
  const sources=[...(m?.sources||[]),...(s?.sources||[])];
  $("playerResearchIntakeSummary").innerHTML=[["Membership",mRows],["Statistics",sRows],["แหล่งข้อมูล",new Set(sources.map(x=>x.id)).size]].map(([a,b])=>'<div class="db-kpi"><b>'+b+'</b><span>'+a+'</span></div>').join("");
  const findings=[];
  if(!m)findings.push("ยังไม่ได้เลือก Membership manifest");
  if(!s)findings.push("ยังไม่ได้เลือก Statistics manifest");
  if(m?.status==="EMPTY DRAFT")findings.push("Membership manifest ยังว่าง");
  if(s?.status==="EMPTY DRAFT")findings.push("Statistics manifest ยังว่าง");
  all.forEach(item=>findings.push(item));
  $("playerResearchIntakeFindings").innerHTML=findings.length?'<ul class="research-intake-findings">'+findings.map(item=>'<li>'+esc(item)+'</li>').join("")+'</ul>':'<div class="quality-note">ทั้งสอง manifest ผ่านการตรวจเบื้องต้นในเครื่อง · ยังต้องตรวจหลักฐานและสิทธิ์โดยผู้รับผิดชอบก่อนอนุมัติ Import</div>';
  $("playerResearchIntakeStatus").textContent=blocked?"BLOCKED · ยังไม่มีชุดข้อมูลที่ผ่านครบทั้ง Membership และ Statistics":"LOCAL PREVIEW · ผ่านการตรวจโครงสร้างเบื้องต้นเท่านั้น";
  $("playerResearchIntakeExport").disabled=!(m||s);
  const leagueCounts=Object.fromEntries(Object.entries(leagues).map(([id,name])=>[id,{name,memberships:0,statistics:0}]));
  (m?.rows||[]).forEach(row=>{if(leagueCounts[row.league_id])leagueCounts[row.league_id].memberships++;});
  (s?.rows||[]).forEach(row=>{if(leagueCounts[row.league_id])leagueCounts[row.league_id].statistics++;});
  state.report={type:"player-research-intake-validation",preview_only:true,supported_leagues:leagues,league_counts:leagueCounts,season:"2026/27",membership:{rows:mRows,status:m?.status||"not_selected",issues:m?.issues||[]},statistics:{rows:sRows,status:s?.status||"not_selected",issues:s?.issues||[]},cross_manifest_issues:crossIssues,production_import:false,provider_api_calls:0,notice:"Local validation only. Not legal approval and not a Production import."};
 }
 async function load(kind,file){
  if(!file)return;
  try{state[kind]=validateManifest(await readFile(file),kind);render();}
  catch(error){state[kind]={rows:[],sources:[],issues:[error.message],status:"BLOCKED"};render();}
 }
 $("playerResearchMembershipFile").addEventListener("change",event=>load("membership",event.target.files?.[0]));
 $("playerResearchStatsFile").addEventListener("change",event=>load("statistics",event.target.files?.[0]));
 $("playerResearchIntakeReset").addEventListener("click",()=>{state.membership=null;state.statistics=null;state.report=null;$("playerResearchMembershipFile").value="";$("playerResearchStatsFile").value="";$("playerResearchIntakeSummary").innerHTML="";$("playerResearchIntakeFindings").innerHTML="";$("playerResearchIntakeStatus").textContent="ล้างไฟล์แล้ว · ยังไม่มีการนำเข้าข้อมูล";$("playerResearchIntakeExport").disabled=true;});
 $("playerResearchIntakeExport").addEventListener("click",()=>{if(!state.report)return;const blob=new Blob([JSON.stringify(state.report,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="player-research-intake-validation.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
})();