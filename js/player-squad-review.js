"use strict";
(() => {
 const $=id=>document.getElementById(id);
 const TEAM_KEY="pft_team_alias_review_2026_27_v1";
 const PLAYER_KEY="pft_player_observation_review_2026_27_v1";
 const aliasCandidates={
  "FL1|167":"football-data:523",
  "PD|1068":"football-data:78",
  "PD|83":"football-data:81",
  "PD|87":"football-data:5335",
  "PL|360":"football-data:66",
  "PL|393":"football-data:351",
  "SA|2572":"football-data:7397"
 };
 const state={teams:[],players:[],teamDecisions:read(TEAM_KEY),playerDecisions:read(PLAYER_KEY),teamFilter:"pending",playerFilter:"all",teamPage:0,playerPage:0,teamQuery:"",playerQuery:"",reviewer:""};
 const pageSize=30;
 function read(key){try{const v=JSON.parse(localStorage.getItem(key)||"{}");return v&&typeof v==="object"&&!Array.isArray(v)?v:{}}catch(_){return {};}}
 function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){status("บันทึกในอุปกรณ์ไม่สำเร็จ: "+e.message);return false;}}
 function status(message){const el=$("playerSquadReviewStatus");if(el)el.textContent=message;}
 function csv(text){
  const rows=[];let row=[],cell="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')quoted=false;else cell+=c;}else if(c==='"')quoted=true;else if(c===","){row.push(cell);cell="";}else if(c==="\n"){row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}else if(c!=="\r")cell+=c;}
  if(quoted)throw Error("CSV มีเครื่องหมาย quote ไม่ครบ");row.push(cell);if(row.some(x=>x!==""))rows.push(row);if(!rows.length)throw Error("CSV ว่าง");
  const headers=rows.shift().map((x,i)=>i===0?x.replace(/^\uFEFF/,"").trim():x.trim());if(new Set(headers).size!==headers.length)throw Error("CSV มี Header ซ้ำ");
  return rows.map((values,index)=>{if(values.length>headers.length)throw Error("CSV แถว "+(index+2)+" มีคอลัมน์เกิน");const o={};headers.forEach((h,i)=>o[h]=(values[i]||"").trim());return o;});
 }
 function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
 function cell(s){const v=String(s??"");return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
 function download(name,headers,rows){const body="\uFEFF"+[headers,...rows.map(r=>headers.map(h=>r[h]??""))].map(r=>r.map(cell).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([body],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function keyTeam(r){return r.league_id+"|"+r.provider_team_id;}
 function keyPlayer(r){return r.provider+"|"+r.provider_player_id;}
 function decisionTeam(r){return state.teamDecisions[keyTeam(r)]||null;}
 function decisionPlayer(r){return state.playerDecisions[keyPlayer(r)]||null;}
 function candidates(r){const ids=(r.candidate_team_ids||"").split(";").filter(Boolean);const alias=aliasCandidates[keyTeam(r)];if(!ids.length&&alias)return [alias];return ids;}
 function nameForCandidate(r,id){const ids=(r.candidate_team_ids||"").split(";"),names=(r.candidate_team_names||"").split(";");const at=ids.indexOf(id);if(at>=0)return names[at]||id;return ({ "football-data:523":"Olympique Lyonnais","football-data:78":"Club Atlético de Madrid","football-data:81":"FC Barcelona","football-data:5335":"Real Racing Club de Santander","football-data:66":"Manchester United FC","football-data:351":"Nottingham Forest FC","football-data:7397":"Como 1907"})[id]||id;}
 function counts(rows,getter){const c={pending:0,approved:0,rejected:0,followup:0};rows.forEach(r=>{const d=getter(r);const s=d?.status||"pending";c[s]=(c[s]||0)+1;});return c;}
 function renderSummary(){
  const tc=counts(state.teams,decisionTeam),pc=counts(state.players,decisionPlayer);
  $("playerSquadReviewSummary").innerHTML=[
   ["Memberships",state.players.reduce((n,r)=>n+(Number(r.membership_observations)||1),0)],
   ["Player IDs",state.players.length],["ทีม",state.teams.length],
   ["Team รอตรวจ",tc.pending],["Team ยืนยันในเครื่อง",tc.approved],
   ["Player ID ซ้ำ",state.players.filter(r=>r.status==="conflicting_identity_observations").length]
  ].map(([a,b])=>'<div class="db-kpi"><b>'+esc(b)+'</b><span>'+esc(a)+'</span></div>').join("");
 }
 function renderTeams(){
  const root=$("playerSquadTeamRows");root.replaceChildren();
  const q=state.teamQuery.toLocaleLowerCase();
  const rows=state.teams.filter(r=>{const d=decisionTeam(r),s=d?.status||"pending";return (state.teamFilter==="all"||state.teamFilter===s)&&(!q||[r.provider_team_name,r.provider_team_official_name,r.candidate_team_names,r.league_id].join(" ").toLocaleLowerCase().includes(q));});
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));state.teamPage=Math.min(state.teamPage,pages-1);
  rows.slice(state.teamPage*pageSize,(state.teamPage+1)*pageSize).forEach(r=>{
   const k=keyTeam(r),d=decisionTeam(r),opts=candidates(r),card=document.createElement("article");card.className="identity-review-card";
   const head=document.createElement("div");head.className="identity-review-heading";const b=document.createElement("b");b.textContent=(r.provider_team_official_name||r.provider_team_name)+" · "+r.league_id;const tag=document.createElement("span");tag.className="tag";tag.textContent=d?.status==="approved"?"ยืนยันในเครื่อง":d?.status==="rejected"?"ไม่ตรงกัน":d?.status==="followup"?"ตรวจเพิ่ม":opts.length?"Candidate รอตรวจ":"ไม่พบ Candidate";head.append(b,tag);card.append(head);
   const meta=document.createElement("div");meta.className="identity-review-meta";meta.textContent="StrikerAPI Team ID "+r.provider_team_id+" · รหัส "+r.provider_team_name+" · "+(r.provider_team_abbrev||"");card.append(meta);
   const select=document.createElement("select");select.className="filter";select.dataset.teamKey=k;select.append(new Option("เลือกทีม Canonical…",""));opts.forEach(id=>select.append(new Option(nameForCandidate(r,id)+" ("+id+")",id)));if(d?.canonical_team_id)select.value=d.canonical_team_id;else if(opts.length===1)select.value=opts[0];card.append(select);
   if(d){const detail=document.createElement("div");detail.className="identity-review-meta";detail.textContent="ผู้ตรวจ: "+d.reviewer+" · "+d.reviewed_at;card.append(detail);}
   const actions=document.createElement("div");actions.className="identity-review-actions";
   const approve=document.createElement("button");approve.type="button";approve.className="identity-review-approve";approve.textContent="ยืนยัน Alias ในเครื่อง";approve.dataset.teamAction="approve";approve.dataset.teamKey=k;approve.disabled=!opts.length||d?.status==="approved";actions.append(approve);
   for(const [action,label] of [["followup","ตรวจเพิ่ม"],["rejected","ไม่ใช่ทีมนี้"]]){const btn=document.createElement("button");btn.type="button";btn.className="secondary";btn.textContent=label;btn.dataset.teamAction=action;btn.dataset.teamKey=k;actions.append(btn);}
   card.append(actions);root.append(card);
  });
  $("playerSquadTeamPage").textContent="หน้า "+(state.teamPage+1)+" / "+pages+" · "+rows.length+" ทีม";
  $("playerSquadTeamPrev").disabled=state.teamPage===0;$("playerSquadTeamNext").disabled=state.teamPage>=pages-1;
 }
 function renderPlayers(){
  const root=$("playerSquadPlayerRows");root.replaceChildren();const q=state.playerQuery.toLocaleLowerCase();
  const rows=state.players.filter(r=>{const d=decisionPlayer(r),s=d?.status||"pending";return (state.playerFilter==="all"||state.playerFilter===s)&&(!q||[r.player_name_variants,r.provider_player_id,r.league_ids,r.provider_team_ids].join(" ").toLocaleLowerCase().includes(q));});
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));state.playerPage=Math.min(state.playerPage,pages-1);
  rows.slice(state.playerPage*pageSize,(state.playerPage+1)*pageSize).forEach(r=>{
   const d=decisionPlayer(r),card=document.createElement("article");card.className="identity-review-card";
   const head=document.createElement("div");head.className="identity-review-heading";const b=document.createElement("b");b.textContent=r.player_name_variants;const tag=document.createElement("span");tag.className="tag";tag.textContent=r.status==="conflicting_identity_observations"?"ID ซ้ำข้ามลีก":d?.status==="followup"?"ตรวจเพิ่ม":"ยังไม่มี Canonical ID";head.append(b,tag);card.append(head);
   const meta=document.createElement("div");meta.className="identity-review-meta";meta.textContent="Provider ID "+r.provider_player_id+" · ลีก "+r.league_ids+" · Team IDs "+r.provider_team_ids+" · "+r.membership_observations+" membership(s)";card.append(meta);
   const note=document.createElement("div");note.className=r.status==="conflicting_identity_observations"?"identity-review-issue":"identity-review-meta";note.textContent=r.status==="conflicting_identity_observations"?"ต้องตรวจสอบความสัมพันธ์ทีม/ประวัติการย้ายทีมก่อน ห้ามรวมเป็น Canonical Player":"ข้อมูลนี้เป็น observation จาก Provider ยังไม่ใช่การยืนยันตัวตนหรือ Canonical Player";card.append(note);
   if(d){const saved=document.createElement("div");saved.className="identity-review-confirm";saved.textContent="บันทึกในเครื่องโดย "+d.reviewer+" · "+d.reviewed_at;card.append(saved);}
   if(r.status==="conflicting_identity_observations"&&d?.status!=="followup"){const btn=document.createElement("button");btn.type="button";btn.className="secondary";btn.textContent="ทำเครื่องหมายตรวจเพิ่ม";btn.dataset.playerAction="followup";btn.dataset.playerKey=keyPlayer(r);card.append(btn);}
   root.append(card);
  });
  $("playerSquadPlayerPage").textContent="หน้า "+(state.playerPage+1)+" / "+pages+" · "+rows.length+" รายการ";
  $("playerSquadPlayerPrev").disabled=state.playerPage===0;$("playerSquadPlayerNext").disabled=state.playerPage>=pages-1;
 }
 function render(){if(!$("playerSquadReviewSummary"))return;renderSummary();renderTeams();renderPlayers();}
 function parseTeamFile(file){return file.text().then(text=>{const rows=csv(text),required=["league_id","provider_team_id","provider_team_name","provider_team_official_name","candidate_team_ids","candidate_team_names","candidate_count"];for(const h of required)if(!rows.length||!(h in rows[0]))throw Error("ไฟล์ Team Mapping ขาดคอลัมน์ "+h);if(rows.length!==96)throw Error("คาดหวัง Team Mapping 96 แถว แต่พบ "+rows.length);const keys=rows.map(keyTeam);if(new Set(keys).size!==keys.length)throw Error("Team Mapping มี key ซ้ำ");return rows;});}
 function parsePlayerFile(file){return file.text().then(text=>{const rows=csv(text),required=["provider","provider_player_id","player_name_variants","membership_observations","league_ids","provider_team_ids","status"];for(const h of required)if(!rows.length||!(h in rows[0]))throw Error("ไฟล์ Player Identity ขาดคอลัมน์ "+h);if(rows.length!==2953)throw Error("คาดหวัง Player Identity 2,953 แถว แต่พบ "+rows.length);const keys=rows.map(keyPlayer);if(new Set(keys).size!==keys.length)throw Error("Player Identity มี Provider ID ซ้ำ");return rows;});}
 async function loadFiles(){const tf=$("playerSquadTeamCsv").files[0],pf=$("playerSquadPlayerCsv").files[0];if(!tf||!pf){status("กรุณาเลือก CSV ทั้งสองไฟล์จาก ZIP ก่อน");return;}try{const [teams,players]=await Promise.all([parseTeamFile(tf),parsePlayerFile(pf)]);state.teams=teams;state.players=players;state.teamPage=state.playerPage=0;render();status("โหลดข้อมูลในอุปกรณ์สำเร็จ · 96 ทีม · 2,953 Player IDs · ไม่มีการส่งข้อมูลออกจากอุปกรณ์");}catch(e){state.teams=[];state.players=[];render();status("นำเข้าไม่สำเร็จ: "+e.message);}}
 function reviewer(){const value=$("playerSquadReviewer").value.trim();if(!value){status("กรุณาระบุผู้ตรวจสอบก่อนบันทึก");$("playerSquadReviewer").focus();return "";}return value;}
 function teamAction(e){const btn=e.target.closest("[data-team-action]");if(!btn)return;const row=state.teams.find(r=>keyTeam(r)===btn.dataset.teamKey);if(!row)return;const who=reviewer();if(!who)return;const action=btn.dataset.teamAction,select=[...document.querySelectorAll("[data-team-key]")].find(el=>el.dataset.teamKey===keyTeam(row)),candidate=select?.value||"";if(action==="approve"&&!candidates(row).includes(candidate)){status("เลือก Canonical Team Candidate ก่อนยืนยัน");return;}state.teamDecisions[keyTeam(row)]={status:action,canonical_team_id:action==="approve"?candidate:"",reviewer:who,reviewed_at:new Date().toISOString(),provider_team_name:row.provider_team_official_name||row.provider_team_name};if(save(TEAM_KEY,state.teamDecisions)){render();status("บันทึกผล Team Mapping ในอุปกรณ์แล้ว · ไม่มีการเขียน Cloud");}}
 function playerAction(e){const btn=e.target.closest("[data-player-action]");if(!btn)return;const row=state.players.find(r=>keyPlayer(r)===btn.dataset.playerKey);if(!row)return;const who=reviewer();if(!who)return;state.playerDecisions[keyPlayer(row)]={status:"followup",reviewer:who,reviewed_at:new Date().toISOString()};if(save(PLAYER_KEY,state.playerDecisions)){render();status("ทำเครื่องหมายตรวจเพิ่มในอุปกรณ์แล้ว · ไม่มีการกำหนด Canonical Player ID");}}
 function exportTeams(){const rows=state.teams.flatMap(r=>{const d=decisionTeam(r);return d?.status==="approved"?[{provider:"strikerapi",season:"2026/27",league_id:r.league_id,provider_team_id:r.provider_team_id,canonical_team_id:d.canonical_team_id,review_status:"verified",reviewer:d.reviewer,reviewed_at:d.reviewed_at}]:[];});if(!rows.length){status("ยังไม่มี Team Alias ที่ยืนยันในเครื่อง");return;}download("team-alias-mapping-reviewed-2026-27.csv",Object.keys(rows[0]),rows);status("ส่งออก "+rows.length+" Team Alias · เป็นไฟล์ review เท่านั้น");}
 function exportPlayerDecisions(){const rows=state.players.filter(r=>decisionPlayer(r)).map(r=>({provider:r.provider,provider_player_id:r.provider_player_id,player_name:r.player_name_variants,decision:decisionPlayer(r).status,reviewer:decisionPlayer(r).reviewer,reviewed_at:decisionPlayer(r).reviewed_at,source_status:r.status}));if(!rows.length){status("ยังไม่มีผลตรวจ Player Observation");return;}download("player-observation-decisions-2026-27.csv",Object.keys(rows[0]),rows);}
 $("playerSquadReviewLoad")?.addEventListener("click",loadFiles);
 $("playerSquadTeamRows")?.addEventListener("click",teamAction);
 $("playerSquadPlayerRows")?.addEventListener("click",playerAction);
 $("playerSquadTeamFilter")?.addEventListener("change",e=>{state.teamFilter=e.target.value;state.teamPage=0;renderTeams();});
 $("playerSquadPlayerFilter")?.addEventListener("change",e=>{state.playerFilter=e.target.value;state.playerPage=0;renderPlayers();});
 $("playerSquadTeamSearch")?.addEventListener("input",e=>{state.teamQuery=e.target.value;state.teamPage=0;renderTeams();});
 $("playerSquadPlayerSearch")?.addEventListener("input",e=>{state.playerQuery=e.target.value;state.playerPage=0;renderPlayers();});
 $("playerSquadTeamPrev")?.addEventListener("click",()=>{state.teamPage=Math.max(0,state.teamPage-1);renderTeams();});
 $("playerSquadTeamNext")?.addEventListener("click",()=>{state.teamPage++;renderTeams();});
 $("playerSquadPlayerPrev")?.addEventListener("click",()=>{state.playerPage=Math.max(0,state.playerPage-1);renderPlayers();});
 $("playerSquadPlayerNext")?.addEventListener("click",()=>{state.playerPage++;renderPlayers();});
 $("playerSquadExportTeams")?.addEventListener("click",exportTeams);
 $("playerSquadExportPlayers")?.addEventListener("click",exportPlayerDecisions);
 $("playerSquadReviewClear")?.addEventListener("click",()=>{state.teams=[];state.players=[];$("playerSquadTeamCsv").value="";$("playerSquadPlayerCsv").value="";render();status("ล้างเฉพาะข้อมูลที่เปิดในหน้านี้ · ผลตรวจในอุปกรณ์ยังคงอยู่");});
 render();
})();