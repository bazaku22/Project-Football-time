"use strict";
(() => {
  const STORAGE_KEY = "pft_player_match_event_ledger_2026_27_v1";
  const COMPETITIONS = ["PL", "PD", "BL1", "SA", "FL1"];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  let matches = [], selectedMatch = null, draft = null;

  function emptyDataset() {
    return {schema_version:"1.0.0",dataset_id:"player-match-event-ledger-2026-27",season:"2026/27",dataset_status:"research_intake_empty",scope:{competitions:COMPETITIONS.slice()},expected_finished_match_ids:[],records:[]};
  }
  function loadStored() {
    try { const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null"); if(value&&value.dataset_id==="player-match-event-ledger-2026-27"&&Array.isArray(value.records)) return {...emptyDataset(),...value}; } catch (_) {}
    return emptyDataset();
  }
  function getMatches() {
    const db=window.FootballTimeAppContext?.getDatabase?.();
    return (Array.isArray(db?.matches)?db.matches:[]).filter(row=>COMPETITIONS.includes(row.leagueId)&&String(row.season)==="2026/27"&&String(row.status||"").toUpperCase()==="FINISHED"&&row.providerMatchId!=null)
      .sort((a,b)=>String(b.utcDate||"").localeCompare(String(a.utcDate||"")));
  }
  const competitionName=id=>({PL:"Premier League",PD:"La Liga",BL1:"Bundesliga",SA:"Serie A",FL1:"Ligue 1"})[id]||id;
  const matchLabel=m=>{const d=m.utcDate?new Date(m.utcDate).toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok"}):"ไม่ระบุวันที่";return d+" · "+(m.homeTeamName||m.homeTeamId)+" "+(m.homeScore??"—")+"–"+(m.awayScore??"—")+" "+(m.awayTeamName||m.awayTeamId)+" · "+competitionName(m.leagueId);};
  const expectedMatchIds=()=>matches.map(m=>String(m.providerMatchId));
  function newDraft(m){return {match_id:m.providerMatchId,competition_code:m.leagueId,season:"2026/27",match_status:"FINISHED",home_team:{team_id:String(m.homeTeamId),name:m.homeTeamName||String(m.homeTeamId)},away_team:{team_id:String(m.awayTeamId),name:m.awayTeamName||String(m.awayTeamId)},lineup_coverage:"unknown",event_coverage:"unknown",review_status:"unverified",sources:[],lineups:[],events:[]};}
  const currentRecord=()=>draft||(selectedMatch?newDraft(selectedMatch):null);
  function playerOptions(teamId){const row=currentRecord();return row?row.lineups.filter(x=>!teamId||x.team_id===teamId).map(x=>x.player):[];}
  function playerSelect(id,teamId,placeholder){return '<select id="'+id+'" class="pme-control"><option value="">'+esc(placeholder)+'</option>'+playerOptions(teamId).map(p=>{const key=p.ft_player_id||"name:"+p.observed_name;return '<option value="'+esc(key)+'">'+esc(p.observed_name)+(p.identity_status==="unresolved"?" · ยังไม่ยืนยัน ID":"")+'</option>';}).join("")+'</select>';}
  function findLineup(key){if(!key)return null;return currentRecord()?.lineups.find(x=>(x.player.ft_player_id||"name:"+x.player.observed_name)===key)||null;}
  function findPlayer(key){return findLineup(key)?.player||null;}

  function renderMatchOptions(){
    const comp=$("pmeCompetition").value||"all",visible=matches.filter(m=>comp==="all"||m.leagueId===comp);
    $("pmeMatch").innerHTML='<option value="">เลือกการแข่งขันที่จบแล้ว</option>'+visible.map(m=>'<option value="'+esc(m.providerMatchId)+'">'+esc(matchLabel(m))+'</option>').join("");
    if(selectedMatch&&visible.some(m=>String(m.providerMatchId)===String(selectedMatch.providerMatchId)))$("pmeMatch").value=String(selectedMatch.providerMatchId);
  }
  function renderHeader(){
    const row=currentRecord();
    $("pmeMatchSummary").innerHTML=row?'<b>'+esc(row.home_team.name)+' <span>'+esc(selectedMatch?.homeScore??"—")+'–'+esc(selectedMatch?.awayScore??"—")+'</span> '+esc(row.away_team.name)+'</b><small>'+esc(competitionName(row.competition_code))+' · Match ID '+esc(row.match_id)+' · ฤดูกาล '+esc(row.season)+'</small>':'<div class="pme-empty">เลือกแมตช์ที่จบแล้วจากฐานข้อมูลฟุตบอลหลัก</div>';
    $("pmeMatchCount").textContent=matches.length+" แมตช์ที่จบแล้วใน 5 ลีกหลัก";
  }
  function renderLineups(){
    const row=currentRecord(),root=$("pmeLineupList");
    root.innerHTML=!row||!row.lineups.length?'<div class="pme-empty">ยังไม่มีรายชื่อผู้เล่นในแมตช์นี้</div>':row.lineups.map((item,i)=>'<div class="pme-list-row"><div><b>'+esc(item.player.observed_name)+'</b><small>'+esc(item.team_id===row.home_team.team_id?row.home_team.name:row.away_team.name)+' · '+(item.role==="starting_xi"?"ตัวจริง":"ตัวสำรอง")+' · '+(item.player.ft_player_id?esc(item.player.ft_player_id):"Identity ยังไม่ยืนยัน")+'</small></div><button type="button" class="pme-remove" data-remove-lineup="'+i+'">ลบ</button></div>').join("");
  }
  function renderSources(){
    const row=currentRecord();
    $("pmeSourceList").innerHTML=row?.sources.length?row.sources.map((s,i)=>'<div class="pme-list-row"><div><b>'+esc(s.name)+'</b><small>'+esc(s.source_type)+' · สิทธิ์ '+esc(s.reuse_rights)+' · <a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">เปิดแหล่งข้อมูล</a></small></div><button type="button" class="pme-remove" data-remove-source="'+i+'">ลบ</button></div>').join(""):'<div class="pme-empty">ต้องเพิ่มแหล่งอ้างอิงก่อนบันทึกแมตช์</div>';
  }
  function renderEvents(){
    const row=currentRecord();
    $("pmeEventList").innerHTML=row?.events.length?row.events.map((e,i)=>{
      let detail=e.type==="substitution"?"เปลี่ยนตัว: "+e.player_off.observed_name+" → "+e.player_on.observed_name:e.goal_type==="own_goal"?"ทำเข้าประตูตัวเอง: "+e.own_goal_player.observed_name:"ประตู: "+e.scorer.observed_name+(e.goal_type==="penalty"?" (จุดโทษ)":"");
      if(e.type==="goal"&&e.assist_status==="explicit")detail+=" · แอสซิสต์ "+e.assist_player.observed_name;
      return '<div class="pme-list-row"><div><b>'+esc(e.minute)+'′ · '+esc(detail)+'</b><small>'+esc(e.team_id===row.home_team.team_id?row.home_team.name:row.away_team.name)+' · '+(e.type==="goal"?"Goal event":"Substitution")+'</small></div><button type="button" class="pme-remove" data-remove-event="'+i+'">ลบ</button></div>';
    }).join(""):'<div class="pme-empty">ยังไม่มีเหตุการณ์ในแมตช์นี้</div>';
  }
  function renderEventFields(){
    const type=$("pmeEventType").value,row=currentRecord();
    $("pmeSubFields").hidden=type!=="substitution";$("pmeGoalFields").hidden=type!=="goal";
    $("pmeSubFields").innerHTML='<div class="pme-grid"><label class="pme-field">ผู้เล่นที่ลงสนาม'+playerSelect("pmePlayerOn",null,"เลือกผู้เล่นที่ลง")+'</label><label class="pme-field">ผู้เล่นที่ออก'+playerSelect("pmePlayerOff",null,"เลือกผู้เล่นที่ออก")+'</label></div>';
    $("pmeGoalFields").innerHTML='<div class="pme-grid"><label class="pme-field">ประเภทประตู<select id="pmeGoalType" class="pme-control"><option value="normal">ประตูปกติ</option><option value="penalty">จุดโทษ</option><option value="own_goal">ทำเข้าประตูตัวเอง</option></select></label><label class="pme-field">ทีม<select id="pmeGoalTeam" class="pme-control"><option value="'+esc(row?.home_team.team_id||"")+'">'+esc(row?.home_team.name||"เจ้าบ้าน")+'</option><option value="'+esc(row?.away_team.team_id||"")+'">'+esc(row?.away_team.name||"ทีมเยือน")+'</option></select></label></div><div id="pmeScorerWrap" class="pme-field"><label>ผู้ทำประตู</label>'+playerSelect("pmeScorer",null,"เลือกผู้ทำประตู")+'</div><div id="pmeOwnGoalWrap" class="pme-field" hidden><label>ผู้เล่นที่ทำเข้าประตูตัวเอง</label>'+playerSelect("pmeOwnGoalPlayer",null,"เลือกผู้เล่น")+'</div><div class="pme-grid"><label class="pme-field">สถานะแอสซิสต์<select id="pmeAssistStatus" class="pme-control"><option value="unknown">ยังไม่ทราบ</option><option value="none_confirmed">ยืนยันว่าไม่มีแอสซิสต์</option><option value="explicit">มีผู้เล่นที่ได้รับเครดิตแอสซิสต์</option></select></label><label id="pmeAssistWrap" class="pme-field" hidden>ผู้แอสซิสต์'+playerSelect("pmeAssistPlayer",null,"เลือกผู้แอสซิสต์")+'</label></div>';
    $("pmeGoalType").addEventListener("change",syncGoalFields);$("pmeAssistStatus").addEventListener("change",syncGoalFields);syncGoalFields();
  }
  function syncGoalFields(){const own=$("pmeGoalType")?.value==="own_goal",explicit=$("pmeAssistStatus")?.value==="explicit";$("pmeScorerWrap").hidden=own;$("pmeOwnGoalWrap").hidden=!own;$("pmeAssistWrap").hidden=!explicit;if(own&&explicit)$("pmeAssistStatus").value="unknown";}
  function renderReviewState(){const r=currentRecord();$("pmeLineupCoverage").value=r?.lineup_coverage||"unknown";$("pmeEventCoverage").value=r?.event_coverage||"unknown";$("pmeReviewedConfirm").checked=r?.review_status==="verified";$("pmeReviewState").textContent=r?.review_status==="verified"?"ยืนยันตรวจสอบแล้ว":"ยังไม่ผ่านการยืนยัน";}
  function renderAll(){renderHeader();renderLineups();renderSources();renderEvents();renderReviewState();renderStoredSummary();}
  function renderStoredSummary(){
    const data=loadStored(),rows=data.records,events=rows.reduce((n,r)=>n+r.events.length,0),players=rows.reduce((n,r)=>n+r.lineups.length,0),expected=expectedMatchIds(),recorded=new Set(rows.map(r=>String(r.match_id)));
    $("pmeSummary").innerHTML='<div class="pme-kpis"><div><b>'+rows.length+'</b><span>แมตช์ที่บันทึก</span></div><div><b>'+players+'</b><span>รายการผู้เล่น</span></div><div><b>'+events+'</b><span>เหตุการณ์</span></div></div><p class="pme-note">แมตช์จบแล้วในฐานข้อมูล '+expected.length+' นัด · บันทึกแล้ว '+recorded.size+' นัด · ยังไม่บันทึก '+Math.max(0,expected.length-recorded.size)+' นัด</p><p class="pme-note">'+(expected.length&&expected.every(id=>recorded.has(id))?"ครอบคลุม Match ID ครบ แต่ยังต้องตรวจไลน์อัป เหตุการณ์ และสิทธิ์แหล่งข้อมูล":"สถิติฤดูกาลยังเป็น Lower bound เพราะยังมีแมตช์ที่ไม่ได้บันทึก")+'</p>';
    $("pmeSavedList").innerHTML=rows.length?rows.map(r=>'<div class="pme-list-row"><div><b>'+esc(r.home_team.name)+' vs '+esc(r.away_team.name)+'</b><small>'+esc(r.competition_code)+' · '+esc(r.review_status)+' · '+r.events.length+' เหตุการณ์</small></div><button type="button" class="pme-edit" data-edit-match="'+esc(r.match_id)+'">แก้ไข</button></div>').join(""):'<div class="pme-empty">ยังไม่มีข้อมูลที่บันทึกไว้ในอุปกรณ์นี้</div>';
  }
  function setStatus(message,kind){$("pmeStatus").className="pme-status pme-status-"+(kind||"info");$("pmeStatus").textContent=message;}
  function selectMatch(id){
    selectedMatch=matches.find(m=>String(m.providerMatchId)===String(id))||null;
    if(!selectedMatch){draft=null;renderAll();return;}
    const old=loadStored().records.find(r=>String(r.match_id)===String(id));
    draft=old?JSON.parse(JSON.stringify(old)):newDraft(selectedMatch);
    $("pmeLineupTeam").innerHTML='<option value="'+esc(draft.home_team.team_id)+'">'+esc(draft.home_team.name)+' (เหย้า)</option><option value="'+esc(draft.away_team.team_id)+'">'+esc(draft.away_team.name)+' (เยือน)</option>';
    renderAll();renderEventFields();setStatus(old?"เปิดข้อมูลที่บันทึกไว้เพื่อแก้ไข":"เลือกแมตช์แล้ว เริ่มเพิ่มแหล่งข้อมูล รายชื่อ และเหตุการณ์ได้","info");
  }
  function addLineup(){
    const r=currentRecord();if(!r)return setStatus("กรุณาเลือกแมตช์ก่อน","error");
    const name=$("pmePlayerName").value.trim(),team=$("pmeLineupTeam").value,role=$("pmePlayerRole").value,shirt=$("pmeShirtNumber").value.trim(),confirmed=$("pmeIdentityConfirmed").checked,id=$("pmePlayerId").value.trim();
    if(!name)return setStatus("กรุณากรอกชื่อผู้เล่น","error");
    if(confirmed&&!/^FT-P-[0-9]{6}$/.test(id))return setStatus("ยืนยันตัวตนแล้วต้องระบุ FT Player ID เช่น FT-P-000001","error");
    if(!confirmed&&id)return setStatus("หากยังไม่ยืนยันตัวตน กรุณาล้าง FT Player ID","error");
    const player={observed_name:name,identity_status:confirmed?"verified":"unresolved",ft_player_id:confirmed?id:null};
    if(r.lineups.some(x=>x.team_id===team&&(x.player.ft_player_id?x.player.ft_player_id===player.ft_player_id:x.player.observed_name.toLowerCase()===name.toLowerCase())))return setStatus("พบผู้เล่นซ้ำในรายชื่อทีมนี้แล้ว","error");
    r.lineups.push({team_id:team,role,player,shirt_number:shirt?Number(shirt):null,source_ids:r.sources.length?[r.sources[0].source_id]:[]});
    $("pmePlayerName").value="";$("pmeShirtNumber").value="";$("pmePlayerId").value="";$("pmeIdentityConfirmed").checked=false;renderAll();renderEventFields();
  }
  function addSource(){
    const r=currentRecord();if(!r)return setStatus("กรุณาเลือกแมตช์ก่อน","error");
    const name=$("pmeSourceName").value.trim(),url=$("pmeSourceUrl").value.trim();
    if(!name||!/^https:\/\//i.test(url))return setStatus("กรุณาระบุชื่อแหล่งข้อมูลและ URL แบบ HTTPS","error");
    if(r.sources.some(s=>s.url===url))return setStatus("URL แหล่งข้อมูลนี้ถูกเพิ่มแล้ว","error");
    r.sources.push({source_id:"source-"+Date.now()+"-"+(r.sources.length+1),name,url,source_type:$("pmeSourceType").value,checked_at:new Date().toISOString(),reuse_rights:$("pmeSourceRights").value,permission_basis:$("pmePermissionBasis").value.trim()||null});
    const first=r.sources[0].source_id;r.lineups.forEach(x=>{if(!x.source_ids.length)x.source_ids=[first];});r.events.forEach(x=>{if(!x.source_ids.length)x.source_ids=[first];});
    $("pmeSourceName").value="";$("pmeSourceUrl").value="";$("pmePermissionBasis").value="";renderAll();
  }
  function addEvent(){
    const r=currentRecord();if(!r)return setStatus("กรุณาเลือกแมตช์ก่อน","error");if(!r.sources.length)return setStatus("เพิ่มแหล่งอ้างอิงก่อนบันทึกเหตุการณ์","error");
    const type=$("pmeEventType").value,minute=$("pmeEventMinute").value.trim(),team=type==="goal"?$("pmeGoalTeam").value:$("pmeLineupTeam").value;
    if(!/^[0-9]{1,3}(\+[0-9]{1,2})?$/.test(minute))return setStatus("นาทีต้องเป็นตัวเลข เช่น 45 หรือ 90+3","error");
    const e={event_id:"event-"+Date.now()+"-"+(r.events.length+1),type,minute,team_id:team,source_ids:r.sources.length?[r.sources[0].source_id]:[]};
    if(type==="substitution"){
      const on=findLineup($("pmePlayerOn").value),off=findLineup($("pmePlayerOff").value);
      if(!on||!off||on.team_id!==team||off.team_id!==team||on.player.observed_name===off.player.observed_name)return setStatus("เลือกผู้เล่นที่ลงและออกจากทีมเดียวกันให้ครบ","error");
      e.player_on=on.player;e.player_off=off.player;
    }
    else{
      e.goal_type=$("pmeGoalType").value;e.assist_status=$("pmeAssistStatus").value;
      if(e.goal_type==="own_goal"){
        const own=findLineup($("pmeOwnGoalPlayer").value);
        if(!own||own.team_id===team)return setStatus("ผู้เล่น Own Goal ต้องอยู่ทีมตรงข้ามกับทีมที่ได้ประตู","error");
        e.own_goal_player=own.player;e.scorer=null;
        if(e.assist_status==="explicit")return setStatus("ไม่บันทึกแอสซิสต์ให้เหตุการณ์ Own Goal","error");
      } else {
        const scorer=findLineup($("pmeScorer").value);
        if(!scorer||scorer.team_id!==team)return setStatus("ผู้ทำประตูต้องอยู่ทีมที่ได้รับเครดิตประตู","error");
        e.scorer=scorer.player;
      }
      const assist=e.assist_status==="explicit"?findLineup($("pmeAssistPlayer").value):null;
      if(e.assist_status==="explicit"&&(!assist||assist.team_id!==team||(assist.player.ft_player_id&&assist.player.ft_player_id===e.scorer?.ft_player_id)||assist.player.observed_name===e.scorer?.observed_name))return setStatus("ผู้แอสซิสต์ต้องอยู่ทีมเดียวกับผู้ทำประตูและต้องไม่ใช่ผู้ทำประตูเอง","error");
      e.assist_player=assist?.player||null;
    }
    r.events.push(e);$("pmeEventMinute").value="";renderAll();renderEventFields();
  }
  function removeItem(key,index){
    const r=currentRecord();if(!r)return;r[key].splice(index,1);
    if(key==="sources"){const ids=new Set(r.sources.map(s=>s.source_id));r.lineups.forEach(x=>x.source_ids=x.source_ids.filter(id=>ids.has(id)));r.events.forEach(x=>x.source_ids=x.source_ids.filter(id=>ids.has(id)));}
    renderAll();if(key==="lineups")renderEventFields();
  }
  function saveRecord(){
    const r=currentRecord();if(!r)return setStatus("กรุณาเลือกแมตช์","error");if(!r.sources.length)return setStatus("ต้องมีแหล่งอ้างอิงอย่างน้อย 1 แหล่ง","error");
    const knownSources=new Set(r.sources.map(s=>s.source_id));
    if(r.lineups.some(x=>!x.source_ids.length||x.source_ids.some(id=>!knownSources.has(id)))||r.events.some(x=>!x.source_ids.length||x.source_ids.some(id=>!knownSources.has(id))))return setStatus("มีรายชื่อหรือเหตุการณ์ที่ยังไม่ได้ผูกกับแหล่งอ้างอิง กรุณาเพิ่มแหล่งข้อมูลก่อนบันทึก","error");
    r.lineup_coverage=$("pmeLineupCoverage").value;r.event_coverage=$("pmeEventCoverage").value;
    const people=[...r.lineups.map(x=>x.player),...r.events.flatMap(e=>e.type==="substitution"?[e.player_on,e.player_off]:[e.scorer,e.own_goal_player,e.assist_player].filter(Boolean))];
    const identities=people.every(p=>p.identity_status==="verified"&&/^FT-P-[0-9]{6}$/.test(p.ft_player_id||""));
    const startersHome=r.lineups.filter(x=>x.team_id===r.home_team.team_id&&x.role==="starting_xi").length;
    const startersAway=r.lineups.filter(x=>x.team_id===r.away_team.team_id&&x.role==="starting_xi").length;
    const verified=r.sources.length>=2&&r.sources.every(s=>s.reuse_rights==="confirmed"&&Boolean(s.permission_basis))&&r.lineup_coverage==="complete"&&r.event_coverage==="complete"&&startersHome===11&&startersAway===11&&identities&&$("pmeReviewedConfirm").checked;
    r.review_status=verified?"verified":"needs_review";
    const next=loadStored(),i=next.records.findIndex(x=>String(x.match_id)===String(r.match_id));if(i>=0)next.records[i]=r;else next.records.push(r);
    next.records.sort((a,b)=>String(a.match_id).localeCompare(String(b.match_id),undefined,{numeric:true}));next.expected_finished_match_ids=expectedMatchIds();next.dataset_status=next.records.length?"research_records_present":"research_intake_empty";next.updated_at=new Date().toISOString();
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(next));draft=JSON.parse(JSON.stringify(r));renderAll();renderStatsTable();setStatus(verified?"บันทึกแล้วและผ่านเงื่อนไขตรวจสอบครบ":"บันทึกในอุปกรณ์นี้แล้ว · สถานะ needs_review","success");}catch(_){setStatus("พื้นที่จัดเก็บไม่เพียงพอ จึงยังไม่ได้บันทึก","error");}
  }
  function exportData(){
    const data=loadStored();data.expected_finished_match_ids=expectedMatchIds();data.dataset_status=data.records.length?"research_records_present":"research_intake_empty";data.updated_at=new Date().toISOString();
    const blob=new Blob([JSON.stringify(data,null,2)+"\n"],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="football-time-player-match-event-ledger-2026-27.json";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  }
  function renderStatsTable(){
    const data=loadStored(),players=new Map(),appearances=new Set();let unresolved=false;
    const ensure=p=>{if(!p||p.identity_status!=="verified"||!p.ft_player_id){unresolved=true;return null;}if(!players.has(p.ft_player_id))players.set(p.ft_player_id,{id:p.ft_player_id,name:p.observed_name,apps:0,goals:0,assists:0});return players.get(p.ft_player_id);};
    const app=(matchId,p)=>{const x=ensure(p);if(x){const key=matchId+":"+p.ft_player_id;if(!appearances.has(key)){appearances.add(key);x.apps++;}}};
    data.records.forEach(r=>{r.lineups.forEach(x=>{if(x.role==="starting_xi")app(r.match_id,x.player);else ensure(x.player);});r.events.forEach(e=>{if(e.type==="substitution"){app(r.match_id,e.player_on);app(r.match_id,e.player_off);}else{if(e.goal_type==="own_goal")app(r.match_id,e.own_goal_player);else{const x=ensure(e.scorer);if(x){x.goals++;app(r.match_id,e.scorer);}}if(e.assist_status==="explicit"){const x=ensure(e.assist_player);if(x){x.assists++;app(r.match_id,e.assist_player);}}}});});
    const expected=new Set(expectedMatchIds()),recorded=new Set(data.records.map(r=>String(r.match_id)));
    const complete=expected.size>0&&[...expected].every(id=>recorded.has(id))&&data.records.every(r=>r.lineup_coverage==="complete"&&r.event_coverage==="complete"&&r.review_status==="verified")&&!unresolved;
    $("pmeStatsStatus").textContent=complete?"ข้อมูลครบตามแมตช์ที่อยู่ในฐานข้อมูลและผ่านการตรวจสอบ":"สถิติเป็น Lower bound: ข้อมูลแมตช์/ไลน์อัป/เหตุการณ์/ตัวตนยังไม่ครบ";
    const rows=[...players.values()].sort((a,b)=>a.name.localeCompare(b.name));
    $("pmeStatsTable").innerHTML=rows.length?'<div class="pme-table-wrap"><table><thead><tr><th>FT Player ID</th><th>ผู้เล่น</th><th>ลงสนาม</th><th>ประตู</th><th>แอสซิสต์</th></tr></thead><tbody>'+rows.map(p=>'<tr><td>'+esc(p.id)+'</td><td>'+esc(p.name)+'</td><td>'+p.apps+'</td><td>'+p.goals+'</td><td>'+p.assists+'</td></tr>').join("")+'</tbody></table></div>':'<div class="pme-empty">ยังไม่มีผู้เล่นที่ยืนยัน FT Player ID ให้คำนวณสถิติ</div>';
  }
  function mount(){
    if(!$("playerMatchEventEntryPage")||$("playerMatchEventEntryPage").dataset.mounted)return;$("playerMatchEventEntryPage").dataset.mounted="true";
    matches=getMatches();
    $("pmeCompetition").addEventListener("change",()=>{renderMatchOptions();const visible=matches.some(m=>String(m.providerMatchId)===String(selectedMatch?.providerMatchId)&&($("pmeCompetition").value==="all"||m.leagueId===$("pmeCompetition").value));if(!visible){selectedMatch=null;draft=null;renderAll();renderEventFields();}});
    $("pmeMatch").addEventListener("change",e=>selectMatch(e.target.value));
    $("pmeReloadMatches").addEventListener("click",()=>{matches=getMatches();renderMatchOptions();renderStoredSummary();setStatus("อ่านรายการแข่งขันล่าสุดแล้ว "+matches.length+" แมตช์","success");});
    $("pmeAddLineup").addEventListener("click",addLineup);$("pmeAddSource").addEventListener("click",addSource);$("pmeAddEvent").addEventListener("click",addEvent);
    $("pmeEventType").addEventListener("change",renderEventFields);$("pmeSave").addEventListener("click",saveRecord);$("pmeExport").addEventListener("click",exportData);
    $("pmeClear").addEventListener("click",()=>{if(!window.confirm("ลบข้อมูล Player Match Event Ledger ที่เก็บในอุปกรณ์นี้ทั้งหมดหรือไม่?"))return;localStorage.removeItem(STORAGE_KEY);draft=selectedMatch?newDraft(selectedMatch):null;renderAll();renderStatsTable();setStatus("ล้างข้อมูลในอุปกรณ์นี้แล้ว","success");});
    $("pmeSavedList").addEventListener("click",e=>{const b=e.target.closest("[data-edit-match]");if(!b)return;$("pmeMatch").value=b.dataset.editMatch;selectMatch(b.dataset.editMatch);$("pmeEditor").scrollIntoView({behavior:"smooth",block:"start"});});
    $("pmeLineupList").addEventListener("click",e=>{const b=e.target.closest("[data-remove-lineup]");if(b)removeItem("lineups",Number(b.dataset.removeLineup));});
    $("pmeSourceList").addEventListener("click",e=>{const b=e.target.closest("[data-remove-source]");if(b)removeItem("sources",Number(b.dataset.removeSource));});
    $("pmeEventList").addEventListener("click",e=>{const b=e.target.closest("[data-remove-event]");if(b)removeItem("events",Number(b.dataset.removeEvent));});
    $("pmeRenderStats").addEventListener("click",renderStatsTable);
    window.addEventListener("pft-football-database-ready",()=>{matches=getMatches();renderMatchOptions();renderHeader();renderStoredSummary();renderStatsTable();});
    renderMatchOptions();renderAll();renderEventFields();renderStatsTable();
    if(!matches.length)setStatus("ยังไม่พบแมตช์ FINISHED ฤดูกาล 2026/27 ในฐานข้อมูลที่โหลดอยู่ หน้านี้จะไม่สร้างแมตช์ปลอมให้","warning");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
  window.FootballTimePlayerMatchEventEntry={storageKey:STORAGE_KEY,loadStored,getMatches};
})();