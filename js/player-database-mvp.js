"use strict";
(() => {
 const REGISTRY_URL="./data/player-team-name-registry-2026-27.json";
 const ROSTER_URL="./data/footballsquads-roster-intake-2026-27.json";
 const LEDGER_KEY="pft_player_match_event_ledger_2026_27_v1";
 const TEAM_ALIAS_KEY="pft_player_team_alias_decisions_2026_27_v1";
 const TEAM_ALIAS_URL="./data/player-team-alias-decisions-2026-27.json";
 const LEAGUES=[["PL","Premier League"],["PD","La Liga"],["BL1","Bundesliga"],["SA","Serie A"],["FL1","Ligue 1"]];
 const FT_ID=/^FT-P-[0-9]{6}$/;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let registry=null, rosterData=null, bundledTeamAliases={}, selectedLeague=null, selectedTeam=null, selectedPlayer=null, query="", playerQuery="";
 const root=document.createElement("section");root.id="dbtab-playerDatabase";root.className="db-panel";
 root.innerHTML='<div class="pdb-head"><div><div class="pdb-eyebrow">FOOTBALL TIME · PLAYER DATABASE</div><h2>หมวดข้อมูลผู้เล่น</h2><p>เลือกลีกและทีมเพื่อดูรายชื่อผู้เล่นฤดูกาล 2026/27</p></div><span class="pdb-season">2026/27</span></div><div id="pdb-content"><div class="pdb-empty">กำลังโหลดทะเบียนทีม…</div></div>';
 const fixtures=document.querySelector("#fixtures"),databaseNav=document.querySelector(".db-subnav");
 if(fixtures&&databaseNav){fixtures.appendChild(root);const tab=document.createElement("button");tab.type="button";tab.dataset.dbTab="playerDatabase";tab.textContent="ข้อมูลผู้เล่น";databaseNav.appendChild(tab);}
 else{root.id="playerDatabasePage";root.className="page";document.querySelector("#main")?.appendChild(root);}
 const content=()=>root.querySelector("#pdb-content");
 function loadLedger(){
  try{
   const api=window.FootballTimePlayerMatchEventEntry;
   const data=api?.loadStored?.();
   if(data&&data.dataset_id==="player-match-event-ledger-2026-27"&&Array.isArray(data.records))return data;
   const raw=JSON.parse(localStorage.getItem(LEDGER_KEY)||"null");
   if(raw&&raw.dataset_id==="player-match-event-ledger-2026-27"&&Array.isArray(raw.records))return raw;
  }catch(_){}
  return {dataset_id:"player-match-event-ledger-2026-27",season:"2026/27",records:[],expected_finished_match_ids:[]};
 }
 function loadTeamAliases(){try{const value=JSON.parse(localStorage.getItem(TEAM_ALIAS_KEY)||"{}");return {...(value&&typeof value==="object"&&!Array.isArray(value)?value:{}),...bundledTeamAliases}}catch(_){return {...bundledTeamAliases};}}
 function recordVerified(record){
  if(!record||record.season!=="2026/27"||record.review_status!=="verified"||record.lineup_coverage!=="complete"||record.event_coverage!=="complete")return false;
  const sources=Array.isArray(record.sources)?record.sources:[];
  const authoritative=sources.some(s=>s&&["official_competition","federation","licensed_provider"].includes(s.source_type));
  return sources.length>=2&&authoritative&&sources.every(s=>s&&s.reuse_rights==="confirmed"&&typeof s.permission_basis==="string"&&s.permission_basis.trim());
 }
 function validPlayer(player){return !!player&&player.identity_status==="verified"&&typeof player.ft_player_id==="string"&&FT_ID.test(player.ft_player_id)&&typeof player.observed_name==="string"&&player.observed_name.trim().length>0;}
 function teamLedger(teamId){
  const data=loadLedger(),verified=new Map(),pending=new Map(),provisional=new Map();let verifiedMatches=0,pendingMatches=0;
  const aliasKey=[selectedLeague?.[0]||"",String(teamId)].join("|"),decision=loadTeamAliases()[aliasKey];
  const canonicalTeamId=decision?.status==="approved"&&typeof decision.canonical_team_id==="string"&&decision.canonical_team_id.startsWith("football-data:")?decision.canonical_team_id:null;
  if(!canonicalTeamId)return {verified:[],pending:[],provisional:[],verifiedMatches:0,pendingMatches:0,season:data.season||"2026/27",teamMappingPending:true};
  const pendingAdd=(player,tid,reason)=>{
   if(!player||!tid||String(tid)!==String(canonicalTeamId))return;
   const name=typeof player.observed_name==="string"&&player.observed_name.trim()?player.observed_name.trim():"ไม่ระบุชื่อ";
   const key=validPlayer(player)?player.ft_player_id:"pending:"+String(tid)+":"+normalizePlayerName(name);
   if(verified.has(key))return;
   if(!pending.has(key))pending.set(key,{id:validPlayer(player)?player.ft_player_id:null,name,team_id:String(tid),reason});
  };
  const getVerified=(player,tid)=>{
   if(!validPlayer(player)){pendingAdd(player,tid,"ยังไม่ยืนยัน FT Player ID");return null;}
   if(String(tid)!==String(canonicalTeamId))return null;
   const id=player.ft_player_id;
   if(!verified.has(id))verified.set(id,{id,name:player.observed_name,team_id:String(tid),appearances:0,goals:0,assists:0,_apps:new Set()});
   return verified.get(id);
  };
  const markAppearance=(player,tid,matchId)=>{
   const item=getVerified(player,tid);if(!item)return;
   const key=String(matchId)+":"+item.id;if(!item._apps.has(key)){item._apps.add(key);item.appearances+=1;}
  };
  const getProvisional=(player,tid)=>{
   if(!player||String(tid)!==String(canonicalTeamId)||player.identity_status!=="unresolved"||player.ft_player_id!=null)return null;
   const name=typeof player.observed_name==="string"?player.observed_name.trim():"",key=normalizePlayerName(name);
   if(!name||!key)return null;
   if(!provisional.has(key))provisional.set(key,{id:null,name,team_id:String(tid),appearances:0,goals:0,assists:0,_apps:new Set()});
   return provisional.get(key);
  };
  const markProvisionalAppearance=(player,tid,matchId)=>{
   const item=getProvisional(player,tid);if(!item)return;
   const key=String(matchId)+":"+normalizePlayerName(item.name);if(!item._apps.has(key)){item._apps.add(key);item.appearances+=1;}
  };
  (Array.isArray(data.records)?data.records:[]).forEach(record=>{
   if(!record||record.season!=="2026/27"||record.competition_code!==selectedLeague?.[0]||!Array.isArray(record.lineups)||!Array.isArray(record.events))return;
   const trusted=recordVerified(record),researchPreview=!trusted&&record.review_status==="needs_review"&&record.lineup_coverage==="complete";
   if(trusted)verifiedMatches++;else pendingMatches++;
   const home=record.home_team?.team_id,away=record.away_team?.team_id,matchId=String(record.match_id??"");
   const lineupTeamById=new Map(),lineupTeamByName=new Map();
   record.lineups.forEach(lineup=>{
    const player=lineup?.player,tid=lineup?.team_id;
    if(!player||!tid)return;
    const nameKey=normalizePlayerName(player.observed_name);
    if(validPlayer(player))lineupTeamById.set(player.ft_player_id,String(tid));
    if(nameKey)lineupTeamByName.set(nameKey,String(tid));
    if(String(tid)===String(canonicalTeamId)){
     if(!trusted)pendingAdd(player,tid,"แมตช์หรือหลักฐานยังไม่ผ่านการตรวจสอบ");
     else if(!validPlayer(player))pendingAdd(player,tid,"ยังไม่ยืนยัน FT Player ID");
     else getVerified(player,tid);
    }
    if(trusted&&lineup.role==="starting_xi")markAppearance(player,tid,matchId);
    if(researchPreview&&String(tid)===String(canonicalTeamId)&&lineup.role==="starting_xi")markProvisionalAppearance(player,tid,matchId);
   });
   if(trusted){
    record.events.forEach(event=>{
     if(!event||!event.type)return;
     const addEventPlayer=(player,tid,kind)=>{
      if(!player||!tid)return;
      const targetTeam=lineupTeamById.get(player.ft_player_id)||String(tid);
      if(kind==="appearance")markAppearance(player,targetTeam,matchId);
      else{const item=getVerified(player,targetTeam);if(item){if(kind==="goal")item.goals+=1;if(kind==="assist")item.assists+=1;markAppearance(player,targetTeam,matchId);}}
     };
     if(event.type==="substitution"){addEventPlayer(event.player_off,event.team_id,"appearance");addEventPlayer(event.player_on,event.team_id,"appearance");}
     if(event.type==="goal"){
      if(event.goal_type==="normal"||event.goal_type==="penalty")addEventPlayer(event.scorer,event.team_id,"goal");
      if(event.goal_type==="own_goal"){const ownTeam=String(event.team_id)===String(home)?away:home;addEventPlayer(event.own_goal_player,ownTeam,"appearance");}
      if(event.assist_status==="explicit")addEventPlayer(event.assist_player,event.team_id,"assist");
     }
    });
   }else if(researchPreview){
    record.events.forEach(event=>{
     if(!event||!event.type)return;
     const teamFor=(player,fallback)=>lineupTeamByName.get(normalizePlayerName(player?.observed_name))||String(fallback||"");
     if(event.type==="substitution"){
      markProvisionalAppearance(event.player_off,teamFor(event.player_off,event.team_id),matchId);
      markProvisionalAppearance(event.player_on,teamFor(event.player_on,event.team_id),matchId);
     }
     if(event.type==="goal"){
      if(event.goal_type==="normal"||event.goal_type==="penalty"){
       const tid=teamFor(event.scorer,event.team_id),item=getProvisional(event.scorer,tid);
       if(item){item.goals+=1;markProvisionalAppearance(event.scorer,tid,matchId);}
      }else if(event.goal_type==="own_goal"){
       const ownTeam=String(event.team_id)===String(home)?away:home;
       markProvisionalAppearance(event.own_goal_player,ownTeam,matchId);
      }
      if(event.assist_status==="explicit"){
       const tid=teamFor(event.assist_player,event.team_id),item=getProvisional(event.assist_player,tid);
       if(item){item.assists+=1;markProvisionalAppearance(event.assist_player,tid,matchId);}
      }
     }
    });
   }
  });
  const verifiedRows=Array.from(verified.values()).map(p=>({...p})).sort((a,b)=>a.name.localeCompare(b.name));
  const verifiedIds=new Set(verifiedRows.map(p=>p.id));
  const pendingRows=Array.from(pending.values()).filter(p=>!p.id||!verifiedIds.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name));
  const provisionalRows=Array.from(provisional.values()).map(p=>({...p,source_status:"needs_review_name_only"})).sort((a,b)=>a.name.localeCompare(b.name));
  verifiedRows.forEach(p=>delete p._apps);provisionalRows.forEach(p=>delete p._apps);
  return {verified:verifiedRows,pending:pendingRows,provisional:provisionalRows,verifiedMatches,pendingMatches,season:data.season||"2026/27",teamMappingPending:false,canonicalTeamId};
 }
 function normalizePlayerName(value){
  return String(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("en")
   .replace(/[ø]/g,"o").replace(/[ł]/g,"l").replace(/[đ]/g,"d").replace(/[æ]/g,"ae").replace(/[œ]/g,"oe").replace(/[ß]/g,"ss")
   .replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
 }
 function provisionalNameStats(rosterPlayer,teamId){
  const ledger=teamLedger(teamId);
  if(ledger.teamMappingPending)return {status:"team_mapping_pending",stats:null};
  const target=normalizePlayerName(rosterPlayer?.name);
  if(!target)return {status:"no_match",stats:null};
  const verified=ledger.verified.filter(row=>normalizePlayerName(row.name)===target);
  if(verified.length===1)return {status:"provisional_name_match",stats:verified[0],verifiedMatches:ledger.verifiedMatches,scope:"recorded_verified_matches_only"};
  if(verified.length>1)return {status:"ambiguous_name_match",stats:null};
  const research=ledger.provisional.filter(row=>normalizePlayerName(row.name)===target);
  if(research.length===1)return {status:"provisional_research_match",stats:research[0],pendingMatches:ledger.pendingMatches,scope:"local_needs_review_records_only"};
  if(research.length>1)return {status:"ambiguous_name_match",stats:null};
  return {status:"no_match",stats:null};
 }
 function attributionMarkup(){return '<p class="pdb-attribution">Source of Material is <a href="https://www.footballsquads.com/" target="_blank" rel="noopener noreferrer">http://www.footballsquads.com</a>. Material: © FootballSquads.com, 1999 - , All Rights Reserved</p>';}
 function render(){
  if(!registry||!rosterData){content().innerHTML='<div class="pdb-empty">กำลังโหลดข้อมูลผู้เล่น…</div>';return;}
  if(selectedPlayer){
   const source=rosterData.sources.find(s=>s.league_id===selectedLeague?.[0]&&String(s.provider_team_id)===String(selectedTeam?.id));
   const player=rosterData.memberships.find(p=>p.id===selectedPlayer.id&&p.source_id===source?.id);
   if(!source||!player){selectedPlayer=null;render();return;}
   const provisional=provisionalNameStats(player,selectedTeam.id);
   const statMarkup=provisional.stats
    ? (provisional.status==="provisional_research_match"
      ? '<div class="pdb-profile-status"><b>จับคู่ด้วยชื่อเต็มตรงกัน · provisional research</b><span>ตัวเลขนี้คำนวณจากข้อมูลแมตช์ที่นำเข้าไว้ในอุปกรณ์และยังอยู่สถานะ needs_review; ผู้เล่นยังไม่มี FT Player ID และยังไม่ยืนยันตัวตนถาวร</span></div>'
      : '<div class="pdb-profile-status"><b>จับคู่ด้วยชื่อเต็มตรงกัน · provisional</b><span>ตัวเลขมาจาก Match Event Ledger ที่ผ่านการตรวจสอบ แต่การเชื่อมรายชื่อใช้ชื่อเต็มที่ Normalize แล้วเท่านั้น จึงยังไม่ใช่การยืนยันตัวตนถาวร</span></div>')
      + '<div class="pdb-stat-grid"><div><b>'+provisional.stats.appearances+'</b><span>ลงสนาม</span></div><div><b>'+provisional.stats.goals+'</b><span>ประตู</span></div><div><b>'+provisional.stats.assists+'</b><span>แอสซิสต์</span></div></div>'
      + (provisional.status==="provisional_research_match"
        ? '<p class="pdb-data-note">เป็นยอดขั้นต่ำจากรายการวิจัยที่ยังไม่ผ่านการตรวจสอบสิทธิ์แหล่งข้อมูลและตัวตนผู้เล่น แอสซิสต์ที่ไม่มีหลักฐานชัดเจนจะไม่นับ ตัวเลขนี้ใช้ทดสอบภายในเท่านั้น ไม่ใช่สถิติยืนยันหรือข้อมูลสำหรับ Production</p>'
        : '<p class="pdb-data-note">สถิติครอบคลุมเฉพาะแมตช์ที่บันทึกไว้และผ่านการตรวจสอบใน Match Event Ledger ฤดูกาล 2026/27 ของลีกนี้เท่านั้น ไม่ใช่ยอดรวมทุกการแข่งขันหรือทั้งฤดูกาล และชื่อที่ตรงกันยังอาจเป็นคนละบุคคลได้</p>')
    : '<div class="pdb-profile-status"><b>Source-listed · รอตรวจสอบ</b><span>ชื่อนี้ถอดจากหน้ารายชื่อสโมสร ยังไม่ยืนยันตัวตนหรือสถานะการลงทะเบียน</span></div><div class="pdb-stat-grid"><div><b>—</b><span>ลงสนาม</span></div><div><b>—</b><span>ประตู</span></div><div><b>—</b><span>แอสซิสต์</span></div></div><p class="pdb-data-note">'+(provisional.status==="ambiguous_name_match"?"พบผู้เล่นใน Ledger มากกว่าหนึ่งรายการที่ชื่อ Normalize ตรงกัน จึงไม่แสดงสถิติเพื่อป้องกันการจับคู่ผิด":provisional.status==="team_mapping_pending"?"ยังไม่มีการยืนยัน mapping ของทีมสำหรับเชื่อมสถิติ":"ยังไม่พบชื่อเต็มที่ตรงกันในสถิติที่ผ่านการตรวจสอบ หรือยังไม่มีข้อมูลแมตช์ที่ครอบคลุมผู้เล่นรายนี้ จึงไม่แสดงตัวเลขแทนค่าจริง")+'</p>';
   content().innerHTML='<button class="pdb-back" data-back="players">‹ กลับไปยังรายชื่อนักเตะ</button><div class="pdb-team-hero"><span class="pdb-team-mark">FT</span><div><h3>'+esc(player.name)+'</h3><p>'+esc(selectedTeam.name)+' · '+esc(selectedLeague[1])+' · '+esc(player.season)+'</p></div></div>'+statMarkup+'<div class="pdb-source-card"><b>แหล่งที่มาของรายชื่อ</b><a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">เปิดหน้ารายชื่อ '+esc(selectedTeam.name)+' บน FootballSquads ↗</a><small>ตรวจข้อมูลเมื่อ '+esc(source.observed_at)+' · '+esc(source.current_roster_boundary)+'</small></div>'+attributionMarkup();
   return;
  }
  if(selectedTeam){
   const source=rosterData.sources.find(s=>s.league_id===selectedLeague?.[0]&&String(s.provider_team_id)===String(selectedTeam.id));
   if(!source){content().innerHTML='<button class="pdb-back" data-back="teams">‹ กลับไปยังทีม</button><div class="pdb-empty">ยังไม่พบแหล่งรายชื่อของสโมสรนี้</div>'+attributionMarkup();return;}
   const allPlayers=rosterData.memberships.filter(p=>p.source_id===source.id).sort((a,b)=>a.name.localeCompare(b.name));
   const players=allPlayers.filter(p=>p.name.toLocaleLowerCase().includes(playerQuery.toLocaleLowerCase()));
   content().innerHTML='<button class="pdb-back" data-back="teams">‹ กลับไปยังทีม</button><div class="pdb-team-hero"><span class="pdb-team-mark">'+esc(selectedTeam.name.slice(0,2).toUpperCase())+'</span><div><h3>'+esc(selectedTeam.name)+'</h3><p>'+esc(selectedLeague[1])+' · ฤดูกาล 2026/27</p></div></div><div class="pdb-roster-summary"><b>'+allPlayers.length+'</b><span>รายชื่อที่พบในแหล่งข้อมูลของสโมสร</span><em>รอตรวจสอบอิสระ</em></div><label class="pdb-search"><span>ค้นหาผู้เล่น</span><input id="pdb-player-search" type="search" value="'+esc(playerQuery)+'" placeholder="พิมพ์ชื่อนักเตะ…" autocomplete="off"></label><div class="pdb-player-list">'+(players.length?players.map(p=>'<button class="pdb-player-row" data-roster-player="'+esc(p.id)+'"><span><b>'+esc(p.name)+'</b><small>Source-listed · รอตรวจสอบตัวบุคคลและสังกัด</small></span><span class="pdb-chevron">›</span></button>').join(""):'<div class="pdb-empty">ไม่พบผู้เล่นที่ตรงกับคำค้นหา</div>')+'</div><div class="pdb-source-card"><b>แหล่งข้อมูล</b><a href="'+esc(source.url)+'" target="_blank" rel="noopener noreferrer">FootballSquads · '+esc(selectedTeam.name)+' ↗</a><small>ตรวจข้อมูลเมื่อ '+esc(source.observed_at)+' · ไม่รวมส่วนผู้เล่นที่ย้ายออกแล้ว</small></div><p class="pdb-data-note">รายชื่อนี้เป็นข้อมูลที่ถอดจากแหล่งข้อมูล ไม่ได้ยืนยันว่าเป็นผู้เล่นที่ลงทะเบียนกับลีก มีสิทธิ์ลงแข่งขัน หรือได้ลงสนามแล้ว</p>'+attributionMarkup();
   const input=root.querySelector("#pdb-player-search");input?.addEventListener("input",e=>{playerQuery=e.target.value;const pos=e.target.selectionStart;render();const next=root.querySelector("#pdb-player-search");next?.focus();next?.setSelectionRange(pos,pos);});
   return;
  }
  if(selectedLeague){
   const teams=Object.entries(registry.lookup[selectedLeague[0]]||{}).map(([id,registryName])=>{const source=rosterData.sources.find(s=>s.league_id===selectedLeague[0]&&String(s.provider_team_id)===String(id));return {id,name:source?.provider_team_name||registryName};}).filter(t=>t.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
   content().innerHTML='<button class="pdb-back" data-back="leagues">‹ กลับไปยังลีก</button><div class="pdb-section-title"><div><h3>'+esc(selectedLeague[1])+'</h3><p>'+teams.length+' ทีมในรายการ</p></div><span class="pdb-count">'+Object.keys(registry.lookup[selectedLeague[0]]||{}).length+' ทีม</span></div><label class="pdb-search"><span>ค้นหาทีม</span><input id="pdb-team-search" type="search" value="'+esc(query)+'" placeholder="พิมพ์ชื่อทีม…" autocomplete="off"></label><div class="pdb-team-list">'+teams.map(t=>'<button class="pdb-team-row" data-team="'+esc(t.id)+'"><span class="pdb-team-mark">'+esc(t.name.slice(0,2).toUpperCase())+'</span><span><b>'+esc(t.name)+'</b><small>'+rosterData.memberships.filter(p=>p.league_id===selectedLeague[0]&&p.club_id==='provider-display:'+selectedLeague[0]+':'+t.id).length+' รายชื่อ · เปิดดูข้อมูลผู้เล่น</small></span><span class="pdb-chevron">›</span></button>').join("")+'</div>'+attributionMarkup();
   const input=root.querySelector("#pdb-team-search");input?.addEventListener("input",e=>{query=e.target.value;const pos=e.target.selectionStart;render();const next=root.querySelector("#pdb-team-search");next?.focus();next?.setSelectionRange(pos,pos);});
   return;
  }
  content().innerHTML='<div class="pdb-intro"><strong>เลือกลีก</strong><span>รายชื่อสโมสรฤดูกาล 2026/27</span></div><div class="pdb-league-grid">'+LEAGUES.map(([id,name])=>'<button class="pdb-league-card" data-league="'+id+'"><span class="pdb-league-symbol">'+id+'</span><span><b>'+name+'</b><small>'+Object.keys(registry.lookup[id]||{}).length+' ทีม</small></span><span class="pdb-chevron">›</span></button>').join("")+'</div><div class="pdb-total"><b>96</b><span>ทีมทั้งหมดใน 5 ลีกใหญ่ · '+rosterData.memberships.length+' source-listed names</span></div><p class="pdb-data-note">รายชื่อผู้เล่นทุกคนอยู่ในสถานะรอตรวจสอบอิสระ สถิติจะปรากฏเมื่อมีหลักฐานที่ตรวจสอบได้เท่านั้น</p>'+attributionMarkup();
 }
 root.addEventListener("click",e=>{
  const league=e.target.closest("[data-league]");if(league){selectedLeague=LEAGUES.find(x=>x[0]===league.dataset.league);selectedTeam=null;selectedPlayer=null;query="";playerQuery="";render();return;}
  const team=e.target.closest("[data-team]");if(team){const source=rosterData.sources.find(s=>s.league_id===selectedLeague[0]&&String(s.provider_team_id)===String(team.dataset.team));const name=source?.provider_team_name||registry.lookup[selectedLeague[0]][team.dataset.team];selectedTeam={id:team.dataset.team,name};selectedPlayer=null;playerQuery="";render();return;}
  const player=e.target.closest("[data-roster-player]");if(player){selectedPlayer={id:player.dataset.rosterPlayer};render();return;}
  if(e.target.closest("[data-refresh-ledger]")){render();return;}
  const back=e.target.closest("[data-back]");if(back){if(back.dataset.back==="leagues"){selectedLeague=null;selectedTeam=null;selectedPlayer=null;query="";playerQuery="";}else if(back.dataset.back==="teams"){selectedTeam=null;selectedPlayer=null;query="";playerQuery="";}else if(back.dataset.back==="players"){selectedPlayer=null;}render();}
 });
 Promise.all([
  fetch(REGISTRY_URL,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}),
  fetch(ROSTER_URL,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}),
  fetch(TEAM_ALIAS_URL,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json();}).catch(()=>null)
 ]).then(([data,roster,aliases])=>{
  const count=Object.values(data.lookup||{}).reduce((sum,league)=>sum+Object.keys(league).length,0);
  if(data.status!=="provider_display_names_verified"||data.production_import!==false||count!==96)throw Error("ทะเบียนทีมไม่ผ่านการตรวจสอบ");
  const sourceIds=new Set((roster.sources||[]).map(source=>source.id));
  if(roster.status!=="complete_research_only"||roster.season!=="2026/27"||roster.production_import!==false||roster.club_pages_reviewed!==96||roster.sources?.length!==96||roster.memberships?.length!==roster.roster_memberships_count||roster.memberships.some(row=>!sourceIds.has(row.source_id)||row.membership_status!=="source_listed_pending_independent_crosscheck"||row.identity_status!=="name_only_unverified"))throw Error("ชุดข้อมูลรายชื่อผู้เล่นไม่ผ่านการตรวจสอบ");
  if(aliases&&aliases.status==="reviewed_approved"&&aliases.production_import===false&&aliases.season==="2026/27"&&Array.isArray(aliases.decisions)){
   aliases.decisions.forEach(item=>{
    if(item&&item.status==="approved"&&item.review_required===false&&typeof item.league_id==="string"&&typeof item.provider_team_id==="string"&&/^football-data:[0-9]+$/.test(item.canonical_team_id||"")){
     const providerName=data.lookup?.[item.league_id]?.[item.provider_team_id];
     if(providerName===item.provider_team_name)bundledTeamAliases[[item.league_id,item.provider_team_id].join("|")]={status:"approved",canonical_team_id:item.canonical_team_id,source:"reviewed bundled crosswalk"};
    }
   });
  }
  registry=data;rosterData=roster;render();
 }).catch(error=>{content().innerHTML='<div class="pdb-empty">โหลดทะเบียนผู้เล่นไม่สำเร็จ ('+esc(error.message)+')</div>';});
 window.FootballTimePlayerDatabase={loadLedger,loadTeamAliases,recordVerified,teamLedger};
})();