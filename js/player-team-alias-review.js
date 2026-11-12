"use strict";
(() => {
 const KEY="pft_player_team_alias_decisions_2026_27_v1";
 const $=id=>document.getElementById(id);
 const state={rows:[],filter:"pending",decisions:read()};
 function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||"{}");return x&&typeof x==="object"&&!Array.isArray(x)?x:{}}catch{return {};}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(state.decisions));return true}catch(e){status("บันทึกในอุปกรณ์ไม่สำเร็จ: "+e.message);return false;}}
 function key(r){return [r.league_id,r.provider_team_id].join("|");}
 function status(v){$("playerTeamAliasReviewStatus").textContent=v;}
 function parse(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(cell);cell="";}else if(c==="\n"){row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}else if(c!=="\r")cell+=c;}
  if(quoted)throw Error("CSV มีอัญประกาศไม่ปิด");row.push(cell);if(row.some(x=>x!==""))rows.push(row);
  if(!rows.length)throw Error("CSV ว่าง");
  const h=rows.shift().map((v,i)=>i===0?v.replace(/^\uFEFF/,"").trim():v.trim());
  const required=["league_id","provider_team_id","provider_team_name","candidate_team_ids","candidate_team_names","candidate_count","status","canonical_team_id"];
  const missing=required.filter(x=>!h.includes(x));if(missing.length)throw Error("ขาดคอลัมน์ "+missing.join(", "));
  return rows.map((values,i)=>{const r={};h.forEach((k,n)=>r[k]=(values[n]||"").trim());if(!r.league_id||!r.provider_team_id)throw Error("แถว "+(i+2)+" ขาด league/team ID");return r;});
 }
 function decision(r){return state.decisions[key(r)]||null;}
 function csvCell(v){const s=String(v??"");return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
 function download(name,headers,rows){const body="\uFEFF"+[headers,...rows.map(r=>headers.map(h=>r[h]??""))].map(a=>a.map(csvCell).join(",")).join("\r\n");const u=URL.createObjectURL(new Blob([body],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 function render(){
  const root=$("playerTeamAliasReviewRows");if(!root)return;root.replaceChildren();
  const counts={pending:0,approved:0,rejected:0,followup:0};state.rows.forEach(r=>{const d=decision(r);counts[d?.status||"pending"]++;});
  $("playerTeamAliasReviewSummary").innerHTML=[["ทั้งหมด",state.rows.length],["รอตรวจ",counts.pending],["ยืนยันในเครื่อง",counts.approved],["ไม่ตรงกัน",counts.rejected],["ขอตรวจเพิ่ม",counts.followup]].map(([a,b])=>'<div class="db-kpi"><b>'+b+'</b><span>'+a+'</span></div>').join("");
  const rows=state.rows.filter(r=>state.filter==="all"?(true):(state.filter===(decision(r)?.status||"pending")));
  if(!rows.length){root.append(Object.assign(document.createElement("div"),{className:"empty",textContent:state.rows.length?"ไม่มีรายการในตัวกรองนี้":"เลือกไฟล์ team-mapping-review-2026-27.csv เพื่อเริ่มตรวจสอบ"}));return;}
  rows.forEach(r=>{
   const d=decision(r),card=document.createElement("article");card.className="identity-review-card";
   const title=document.createElement("div");title.className="identity-review-heading";const b=document.createElement("b");b.textContent=r.provider_team_official_name||r.provider_team_name||r.provider_team_id;const tag=document.createElement("span");tag.className="tag";tag.textContent=d?.status==="approved"?"ยืนยันในเครื่อง":d?.status==="rejected"?"ไม่ใช่ทีมเดียวกัน":d?.status==="followup"?"ขอตรวจเพิ่ม":r.status;title.append(b,tag);card.append(title);
   const meta=document.createElement("div");meta.className="identity-review-meta";meta.textContent=r.league_id+" · Provider Team ID "+r.provider_team_id+" · "+r.provider_team_name;card.append(meta);
   const ids=(r.alias_candidate_team_id||r.candidate_team_ids||"").split(";").filter(Boolean),names=(r.alias_candidate_team_name||r.candidate_team_names||"").split(";").filter(Boolean);
   if(ids.length){const suggestion=document.createElement("div");suggestion.className="identity-review-confirm";suggestion.textContent="ทีมที่เสนอ: "+names.join(" / ")+" · "+ids.join(" / ");card.append(suggestion);}
   else{const issue=document.createElement("div");issue.className="identity-review-issue";issue.textContent="ไม่พบทีมที่เสนออย่างปลอดภัย ต้องตรวจสอบชื่อ/ลีกเพิ่มเติม";card.append(issue);}
   if(d){const note=document.createElement("div");note.className="small";note.textContent="ผู้ตรวจ: "+d.reviewer+" · "+d.reviewed_at;card.append(note);}
   const actions=document.createElement("div");actions.className="identity-review-actions";
   [["approved","ยืนยัน Candidate"],["rejected","ไม่ใช่ทีมเดียวกัน"],["followup","ขอตรวจเพิ่ม"]].forEach(([value,label])=>{const button=document.createElement("button");button.type="button";button.className=value==="approved"?"identity-review-approve":"secondary";button.textContent=label;button.dataset.teamAliasAction=value;button.dataset.teamAliasKey=key(r);button.disabled=value==="approved"&&ids.length!==1;actions.append(button);});
   card.append(actions);root.append(card);
  });
 }
 function load(file){if(!file)return;if(file.size>5*1024*1024){status("ไฟล์เกิน 5 MB");return;}const reader=new FileReader();reader.onload=()=>{try{state.rows=parse(String(reader.result||""));render();status("โหลด "+file.name+" สำเร็จ · "+state.rows.length+" ทีม · ผลตรวจแยกเก็บในอุปกรณ์");}catch(e){state.rows=[];render();status("อ่านไฟล์ไม่สำเร็จ: "+e.message);}};reader.onerror=()=>status("อ่านไฟล์ไม่สำเร็จ");reader.readAsText(file,"utf-8");}
 $("playerTeamAliasReviewFile")?.addEventListener("change",e=>load(e.target.files?.[0]));
 $("playerTeamAliasReviewFilter")?.addEventListener("change",e=>{state.filter=e.target.value;render();});
 $("playerTeamAliasReviewRows")?.addEventListener("click",e=>{const b=e.target.closest("[data-team-alias-action]");if(!b)return;const reviewer=$("playerTeamAliasReviewer").value.trim();if(!reviewer){status("กรุณาระบุผู้ตรวจสอบก่อนบันทึกผล");$("playerTeamAliasReviewer").focus();return;}const row=state.rows.find(r=>key(r)===b.dataset.teamAliasKey);if(!row)return;const action=b.dataset.teamAliasAction,ids=(row.alias_candidate_team_id||row.candidate_team_ids||"").split(";").filter(Boolean);if(action==="approved"&&ids.length!==1){status("ยืนยันไม่ได้: ต้องมี Candidate เพียงหนึ่งทีม");return;}state.decisions[key(row)]={status:action,canonical_team_id:action==="approved"?ids[0]:"",reviewer,reviewed_at:new Date().toISOString()};if(save()){render();status("บันทึกผลตรวจในอุปกรณ์แล้ว · ยังไม่แก้ฐานข้อมูล");}});
 $("playerTeamAliasExport")?.addEventListener("click",()=>{const rows=state.rows.filter(r=>decision(r)?.status==="approved").map(r=>({league_id:r.league_id,season:"2026/27",provider:"strikerapi",provider_team_id:r.provider_team_id,provider_team_name:r.provider_team_name,candidate_team_id:r.alias_candidate_team_id||r.candidate_team_ids,canonical_team_id:decision(r).canonical_team_id,review_status:"verified",reviewer:decision(r).reviewer,reviewed_at:decision(r).reviewed_at}));if(!rows.length){status("ยังไม่มี Alias ที่ยืนยัน");return;}download("player-team-alias-mapping-reviewed.csv",Object.keys(rows[0]),rows);status("ส่งออก Alias ที่ผู้ตรวจยืนยันแล้ว "+rows.length+" รายการ · local only");});
 $("playerTeamAliasExportDecisions")?.addEventListener("click",()=>{const rows=state.rows.map(r=>{const d=decision(r)||{};return {league_id:r.league_id,provider_team_id:r.provider_team_id,provider_team_name:r.provider_team_name,decision:d.status||"pending",canonical_team_id:d.canonical_team_id||"",reviewer:d.reviewer||"",reviewed_at:d.reviewed_at||"",source_status:r.status};});if(!rows.length){status("ยังไม่มีคิวตรวจสอบ");return;}download("player-team-alias-review-decisions.csv",Object.keys(rows[0]),rows);status("ส่งออกรายงานตรวจสอบ "+rows.length+" รายการ");});
 render();
})();
