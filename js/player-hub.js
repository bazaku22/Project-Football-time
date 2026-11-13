"use strict";
(() => {
 const STORAGE_KEY="pft_provisional_player_directory_2026_27_v1";
 const LEAGUES={PL:"Premier League",PD:"La Liga",BL1:"Bundesliga",SA:"Serie A",FL1:"Ligue 1"};
 const $=id=>document.getElementById(id);
 const state={rows:[],teamNames:{},teamCrests:{},league:"ALL",team:"ALL",position:"ALL",query:"",selected:null,tab:"overview",page:0,pageSize:50};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const first=(r,keys)=>{for(const k of keys)if(r[k]!==undefined&&r[k]!==null&&String(r[k]).trim()!=="")return r[k];return "";};
 const leagueOf=r=>String(first(r,["league_ids","league_id","leagueId","league"])||"").split(";")[0].trim();
 const teamIdOf=r=>String(first(r,["provider_team_ids","provider_team_id","team_id","teamId"])||"").split(";")[0].trim();
 const rawTeamNameOf=r=>String(first(r,["provider_team_names","provider_team_name","team_name","teamName","team"])||"").split(";")[0].trim();
 const teamNameOf=r=>state.teamNames[leagueOf(r)]?.[teamIdOf(r)]||rawTeamNameOf(r)||("ทีม Provider #"+teamIdOf(r));
 const normTeamName=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]/g,"");
 function teamCrestOf(league,providerTeamId,name){
  const db=window.FootballTimeAppContext?.getDatabase?.(),teams=db?.teams||[],target=normTeamName(name);if(!target)return "";
  const hits=teams.filter(t=>[t.name,t.shortName,t.tla].some(v=>normTeamName(v)===target)&&t.crest);
  return hits.length===1?String(hits[0].crest):"";
 }
 function teamMark(league,providerTeamId,name){
  const initials=String(name||"⚽").trim().slice(0,3)||"⚽",src=teamCrestOf(league,providerTeamId,name);
  return src?'<span class="player-hub-team-crest"><img src="'+esc(src)+'" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>'+esc(initials)+'</span></span>':'<span class="player-hub-team-crest player-hub-team-fallback">'+esc(initials)+'</span>';
 }
 function refreshTeamCrests(){render();}
 const positionOf=r=>String(first(r,["position_group","positionGroup","position"])||"").toUpperCase();
 const positionLabel=p=>({GK:"ผู้รักษาประตู",GOALKEEPER:"ผู้รักษาประตู",DF:"กองหลัง",DEFENDER:"กองหลัง",MF:"กองกลาง",MIDFIELDER:"กองกลาง",FW:"กองหน้า",FORWARD:"กองหน้า",ATTACKER:"กองหน้า"}[p]||p||"ยังไม่ระบุ");
 const normPosition=p=>({GK:"GOALKEEPER",DF:"DEFENDER",MF:"MIDFIELDER",FW:"FORWARD"}[p]||p||"UNKNOWN");
 function status(s){const el=$("playerHubStatus");if(el)el.textContent=s;}
 function teamsForLeague(){const map=new Map();state.rows.filter(r=>state.league==="ALL"||leagueOf(r)===state.league).forEach(r=>{const id=teamIdOf(r)||"unknown",key=leagueOf(r)+"|"+id,name=teamNameOf(r)||("ทีม Provider #"+id);if(!map.has(key))map.set(key,{id,key,league:leagueOf(r),name,count:0});map.get(key).count++;});return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));}
 function teamsAll(){return new Set(state.rows.map(teamIdOf).filter(Boolean));}
 function filtered(){const q=state.query.toLocaleLowerCase();return state.rows.filter(r=>{const l=leagueOf(r),t=teamIdOf(r),p=normPosition(positionOf(r)),hay=[r.player_name,r.provider_player_id,t,teamNameOf(r),l].join(" ").toLocaleLowerCase();return(state.league==="ALL"||l===state.league)&&(state.team==="ALL"||(leagueOf(r)+"|"+t)===state.team)&&(state.position==="ALL"||p===state.position)&&(!q||hay.includes(q));});}
 function render(){
  if(!$("playerHubRoster"))return;
  const allRows=filtered(),start=state.page*state.pageSize,rows=allRows.slice(start,start+state.pageSize),teams=teamsForLeague(),leagues=[...new Set(state.rows.map(leagueOf).filter(Boolean))],selectedTeam=teams.find(t=>t.key===state.team);
  $("playerHubSummary").innerHTML=[["นักเตะ",state.rows.length],["ลีก",leagues.length],["ทีม",teamsAll().size],["สถิติยืนยัน",0]].map(([k,v])=>'<div class="player-hub-kpi"><b>'+esc(v)+'</b><span>'+esc(k)+'</span></div>').join("");
  $("playerHubLeagues").innerHTML='<button type="button" data-hub-league="ALL" class="'+(state.league==="ALL"?"active":"")+'">ทุกลีก <small>'+state.rows.length+'</small></button>'+leagues.map(l=>'<button type="button" data-hub-league="'+esc(l)+'" class="'+(state.league===l?"active":"")+'">'+esc(LEAGUES[l]||l)+' <small>'+state.rows.filter(r=>leagueOf(r)===l).length+'</small></button>').join("");
  $("playerHubTeams").innerHTML=teams.length?teams.map(t=>'<button type="button" data-hub-team="'+esc(t.key)+'" class="player-hub-team '+(state.team===t.key?"active":"")+'">'+teamMark(t.league,t.id,t.name)+'<span class="player-hub-team-name">'+esc(t.name)+'</span><small>'+t.count+' คน</small></button>').join(""):'<div class="empty">ไม่พบทีมในลีกนี้</div>';
  $("playerHubPosition").value=state.position;$("playerHubSearch").value=state.query;
  $("playerHubRosterTitle").innerHTML=selectedTeam?teamMark(selectedTeam.league,selectedTeam.id,selectedTeam.name)+'<span>'+esc(selectedTeam.name)+'</span>':"รายชื่อนักเตะ"+(state.league==="ALL"?"ทุกลีก":" · "+esc(LEAGUES[state.league]||state.league));
  $("playerHubRosterCount").textContent=allRows.length.toLocaleString()+" คน";
  $("playerHubRoster").innerHTML=rows.length?rows.map(r=>{const name=first(r,["player_name","name"])||"ไม่ระบุชื่อ",p=positionLabel(positionOf(r)),age=first(r,["age"]),shirt=first(r,["shirt_number","number","shirt_no"]);return '<button type="button" class="player-hub-player" data-hub-player="'+esc(r.provider_player_id)+'"><span class="player-hub-avatar">'+esc(name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase())+'</span><span class="player-hub-player-main"><b>'+esc(name)+'</b><small>'+esc(p)+' · '+(age?esc(age)+" ปี":"อายุไม่ระบุ")+' · '+(shirt?"เบอร์ "+esc(shirt):"ไม่ระบุเบอร์")+'</small></span><span class="player-hub-chevron">›</span></button>';}).join(""):'<div class="empty">ไม่พบรายชื่อนักเตะ ลองเปลี่ยนลีก ทีม หรือตัวกรอง</div>';
  $("playerHubPager").textContent=allRows.length?(start+1)+"–"+Math.min(start+rows.length,allRows.length)+" จาก "+allRows.length+" รายการ":"0 รายการ";$("playerHubPrev").disabled=state.page===0;$("playerHubNext").disabled=start+state.pageSize>=allRows.length;
  if(state.selected){const player=state.rows.find(r=>String(r.provider_player_id)===state.selected);if(player)renderProfile(player);else $("playerHubProfile").hidden=true;}else $("playerHubProfile").hidden=true;
 }
 function renderProfile(r){
  const root=$("playerHubProfile");root.hidden=false;const name=first(r,["player_name","name"])||"ไม่ระบุชื่อ",league=LEAGUES[leagueOf(r)]||leagueOf(r),team=teamNameOf(r)||("Provider Team #"+teamIdOf(r)),mark=teamMark(leagueOf(r),teamIdOf(r),team),age=first(r,["age"]),nationality=first(r,["nationality","country"]),shirt=first(r,["shirt_number","number","shirt_no"]),position=positionLabel(positionOf(r));
  root.innerHTML='<div class="player-hub-profile-head"><button type="button" id="playerHubClose" aria-label="ปิดโปรไฟล์">×</button><div class="player-hub-avatar large">'+esc(name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase())+'</div><div><h3>'+esc(name)+'</h3><p>'+mark+esc(team)+' · '+esc(league)+'</p><span class="player-hub-provisional">PROVISIONAL · รอตรวจสอบ</span></div></div><div class="player-hub-profile-meta"><div><b>'+esc(position)+'</b><small>ตำแหน่ง</small></div><div><b>'+esc(age||"—")+'</b><small>อายุ</small></div><div><b>'+esc(shirt||"—")+'</b><small>หมายเลข</small></div><div><b>'+esc(nationality||"—")+'</b><small>สัญชาติ</small></div></div><div class="player-hub-tabs"><button type="button" data-profile-tab="overview" class="'+(state.tab==="overview"?"active":"")+'">ภาพรวม</button><button type="button" data-profile-tab="season" class="'+(state.tab==="season"?"active":"")+'">สถิติฤดูกาล</button><button type="button" data-profile-tab="matches" class="'+(state.tab==="matches"?"active":"")+'">ประวัตินัด</button><button type="button" data-profile-tab="performance" class="'+(state.tab==="performance"?"active":"")+'">ผลงาน</button></div><div class="player-hub-profile-body">'+profileTab(r)+'</div>';
  $("playerHubClose").addEventListener("click",()=>{state.selected=null;root.hidden=true;});root.querySelectorAll("[data-profile-tab]").forEach(b=>b.addEventListener("click",()=>{state.tab=b.dataset.profileTab;renderProfile(r);}));
 }
 function profileTab(r){
  if(state.tab==="overview")return '<div class="player-hub-section"><h4>ข้อมูลนักเตะ</h4><p>Provider: StrikerAPI · Player ID: '+esc(r.provider_player_id)+'</p><p>Team ID: '+esc(teamIdOf(r)||"ไม่ระบุ")+' · ฤดูกาล 2026/27</p><p>Provisional key: '+esc(r.provisional_player_key)+'</p><div class="player-hub-note">ตัวตนและการจับคู่ทีมยังไม่ผ่านการยืนยัน ข้อมูลนี้ใช้สำหรับเรียกดูและจัดกลุ่มเท่านั้น</div></div>';
  if(state.tab==="season")return '<div class="player-hub-section"><h4>สถิติฤดูกาล 2026/27</h4><div class="player-hub-stat-grid">'+[["ลงสนาม"],["ตัวจริง"],["นาที"],["ประตู"],["แอสซิสต์"],["ยิงตรงกรอบ"],["xG"],["xA"]].map(([label])=>'<div><b>—</b><small>'+label+'</small></div>').join("")+'</div><div class="player-hub-note">ยังไม่มีสถิติฤดูกาลที่ผ่านการตรวจสอบสำหรับนักเตะรายนี้ ระบบจะไม่แสดงตัวเลขประมาณหรือข้อมูลสมมติ</div></div>';
  if(state.tab==="matches")return '<div class="player-hub-section"><h4>ประวัติการแข่งขัน</h4><div class="player-hub-empty">ยังไม่มีข้อมูลสถิติรายนัดที่เชื่อมกับตัวตนนักเตะที่ยืนยันแล้ว</div></div>';
  return '<div class="player-hub-section"><h4>แนวโน้มผลงาน</h4><div class="player-hub-empty">กราฟผลงานจะแสดงเมื่อมีข้อมูลรายนัดที่ตรวจสอบแหล่งที่มาและตัวตนนักเตะแล้ว</div></div>';
 }

 const canonicalState={players:[],rows:[],selected:null,tab:"overall",query:""};
 const COMPETITION_NAMES={PL:"Premier League",PD:"La Liga",BL1:"Bundesliga",SA:"Serie A",FL1:"Ligue 1",UNL:"UEFA Nations League"};
 const CLUB_COMPETITIONS=new Set(["PL","PD","BL1","SA","FL1"]);
 const NATIONAL_COMPETITIONS=new Set(["UNL","WC","EURO","EC"]);
 const canonicalEsc=esc;
 function canonicalCategory(code){if(CLUB_COMPETITIONS.has(String(code)))return "club";if(NATIONAL_COMPETITIONS.has(String(code)))return "national";return "unclassified";}
 function canonicalStatRows(playerId){return canonicalState.rows.filter(row=>String(row.player?.id||"")===String(playerId));}
 function canonicalMetricEntries(stats){return Object.entries(stats||{}).filter(([,value])=>value!==null&&value!==undefined&&typeof value!=="object");}
 function canonicalRosterRender(){
  const root=$("playerCanonicalRoster"),profile=$("playerCanonicalProfile"),statusEl=$("playerCanonicalStatus");
  if(!root||!statusEl)return;
  const q=canonicalState.query.trim().toLocaleLowerCase();
  const players=canonicalState.players.filter(p=>!q||[p.display_name,p.id,p.canonical_player_key].join(" ").toLocaleLowerCase().includes(q));
  statusEl.textContent=canonicalState.players.length
   ? "Canonical players "+canonicalState.players.length+" ราย · สถิติ "+canonicalState.rows.length+" แถวที่อ่านได้จากบัญชีนี้"
   : "ไม่พบ Canonical Player ในบัญชีนี้ หรือยังไม่ได้เข้าสู่ระบบ";
  root.innerHTML=players.length?players.map(p=>{
   const rows=canonicalStatRows(p.id),competitions=new Set(rows.filter(r=>r.source?.rights_status==="approved").map(r=>r.competition));
   return '<button type="button" class="player-canonical-player" data-canonical-player="'+canonicalEsc(p.id)+'"><span class="player-hub-avatar">'+canonicalEsc(String(p.display_name||"?").trim().split(/\\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase())+'</span><span class="player-canonical-player-main"><b>'+canonicalEsc(p.display_name||"ไม่ระบุชื่อ")+'</b><small>'+canonicalEsc(p.position||"ไม่ระบุตำแหน่ง")+' · '+canonicalEsc(p.nationality||"ไม่ระบุสัญชาติ")+' · '+competitions.size+' รายการแข่งขัน</small><span class="player-canonical-id">Canonical ID: '+canonicalEsc(p.id)+'</span></span><span class="player-hub-chevron">›</span></button>';
  }).join(""):'<div class="player-hub-empty">'+(canonicalState.players.length?"ไม่พบนักเตะที่ตรงกับคำค้น":"ยังไม่มีข้อมูล Canonical ที่แสดงได้")+'</div>';
  root.querySelectorAll("[data-canonical-player]").forEach(button=>button.addEventListener("click",()=>{canonicalState.selected=button.dataset.canonicalPlayer;canonicalState.tab="overall";canonicalProfileRender();profile.scrollIntoView({behavior:"smooth",block:"start"});}));
  if(canonicalState.selected)canonicalProfileRender();else profile.hidden=true;
 }
 function canonicalProfileRender(){
  const root=$("playerCanonicalProfile"),player=canonicalState.players.find(p=>String(p.id)===String(canonicalState.selected));
  if(!root||!player){if(root)root.hidden=true;return;}
  root.hidden=false;
  const rows=canonicalStatRows(player.id),eligible=rows.filter(r=>r.source?.rights_status==="approved");
  const grouped=eligible.filter(r=>r.statisticsScope==="competition"||r.statisticsScope==="season"||r.statisticsScope==="match");
  const categoryRows=canonicalState.tab==="club"?grouped.filter(r=>canonicalCategory(r.competition)==="club"):canonicalState.tab==="national"?grouped.filter(r=>canonicalCategory(r.competition)==="national"):grouped.filter(r=>canonicalCategory(r.competition)!=="unclassified");
  const sorted=categoryRows.slice().sort((a,b)=>String(b.season||"").localeCompare(String(a.season||""))||String(a.competition||"").localeCompare(String(b.competition||""))||String(a.statisticsScope||"").localeCompare(String(b.statisticsScope||"")));
  const labels={overall:"ภาพรวม",club:"สโมสร",national:"ทีมชาติ"};
  const statusLabel={verified:"ตรวจสอบแล้ว",pending:"รอตรวจสอบ",disputed:"มีข้อโต้แย้ง"};
  const metricLabel={appearances:"ลงเล่น",matches_played:"ลงเล่น",starts:"ตัวจริง",minutes:"นาที",goals:"ประตู",assists:"แอสซิสต์",yellow_cards:"ใบเหลือง",red_cards:"ใบแดง",shots:"ยิง",shots_on_target:"ยิงตรงกรอบ",xg:"xG",xa:"xA"};
  const records=sorted.map(row=>{
   const metrics=canonicalMetricEntries(row.stats),source=row.source||{},metricHtml=metrics.length?'<div class="player-canonical-metrics">'+metrics.map(([key,value])=>'<div><b>'+canonicalEsc(metricLabel[key]||key)+':</b> '+canonicalEsc(value)+'</div>').join("")+'</div>':'<p>ไม่มีข้อมูลสถิติในรายการนี้</p>';
   const link=source.source_url?'<a class="player-canonical-link" href="'+canonicalEsc(source.source_url)+'" target="_blank" rel="noopener noreferrer">เปิดแหล่งข้อมูล · '+canonicalEsc(source.source_name||"Source")+'</a>':'<span class="player-canonical-link">ไม่มี URL แหล่งข้อมูล</span>';
   return '<article class="player-canonical-record"><h5>'+canonicalEsc(COMPETITION_NAMES[row.competition]||row.competition||"รายการไม่ระบุ")+' · '+canonicalEsc(row.season||"ไม่ระบุฤดูกาล")+'</h5><p>ทีม: '+canonicalEsc(row.teamId||"ไม่ระบุ")+' · ระดับ: '+canonicalEsc(row.squadLevel||"ไม่ระบุ")+' · Scope: '+canonicalEsc(row.statisticsScope)+'</p><p class="player-canonical-status '+(row.verificationStatus==="verified"?"verified":"")+'">สถานะข้อมูล: '+canonicalEsc(statusLabel[row.verificationStatus]||row.verificationStatus||"ไม่ระบุ")+' · สิทธิ์: approved</p>'+metricHtml+'<p>'+link+'</p><p>ตรวจแหล่งข้อมูลล่าสุด: '+canonicalEsc(source.source_updated_at||source.collected_at||"ไม่ระบุ")+'</p></article>';
  }).join("");
  const unclassified=eligible.filter(r=>canonicalCategory(r.competition)==="unclassified").length;
  const overallSummary='<div class="player-hub-section"><h4>ภาพรวมข้อมูลที่มี</h4><div class="player-hub-stat-grid"><div><b>'+eligible.length+'</b><small>แถวที่สิทธิ์อนุญาต</small></div><div><b>'+new Set(eligible.map(r=>r.competition)).size+'</b><small>รายการแข่งขัน</small></div><div><b>'+new Set(eligible.map(r=>r.season)).size+'</b><small>ฤดูกาล</small></div><div><b>'+unclassified+'</b><small>รายการรอจัดหมวด</small></div></div><p>ภาพรวมนี้เป็นจำนวนชุดข้อมูล ไม่ใช่ผลรวมสถิติการแข่งขัน เพื่อป้องกันการบวกข้อมูลซ้ำระหว่างระดับฤดูกาล รายการแข่งขัน และรายนัด</p></div>';
  root.innerHTML='<div class="player-hub-profile-head"><button type="button" id="playerCanonicalClose" aria-label="ปิดโปรไฟล์">×</button><div class="player-hub-avatar large">'+canonicalEsc(String(player.display_name||"?").trim().split(/\\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase())+'</div><div><h3>'+canonicalEsc(player.display_name||"ไม่ระบุชื่อ")+'</h3><p>'+canonicalEsc(player.position||"ไม่ระบุตำแหน่ง")+' · '+canonicalEsc(player.nationality||"ไม่ระบุสัญชาติ")+'</p><span class="player-canonical-id">Canonical Player ID: '+canonicalEsc(player.id)+'</span></div></div><div class="player-canonical-tabs"><button type="button" data-canonical-tab="overall" class="'+(canonicalState.tab==="overall"?"active":"")+'">ภาพรวม</button><button type="button" data-canonical-tab="club" class="'+(canonicalState.tab==="club"?"active":"")+'">สโมสร</button><button type="button" data-canonical-tab="national" class="'+(canonicalState.tab==="national"?"active":"")+'">ทีมชาติ</button></div><div class="player-hub-profile-body">'+(canonicalState.tab==="overall"?overallSummary:'<h4>'+labels[canonicalState.tab]+'</h4>')+(records||'<div class="player-hub-empty">No data · ยังไม่มีข้อมูลที่ได้รับอนุญาตในหมวดนี้</div>')+'</div>';
  $("playerCanonicalClose").addEventListener("click",()=>{canonicalState.selected=null;root.hidden=true;});
  root.querySelectorAll("[data-canonical-tab]").forEach(button=>button.addEventListener("click",()=>{canonicalState.tab=button.dataset.canonicalTab;canonicalProfileRender();}));
 }
 window.addEventListener("pft-player-directory-data",event=>{
  const list=Array.isArray(event.detail?.players)?event.detail.players:[];
  const map=new Map();list.forEach(row=>{if(row?.id&&!map.has(row.id))map.set(row.id,{id:row.id,display_name:row.display_name,position:row.position,nationality:row.nationality});});
  canonicalState.players=[...map.values()];canonicalRosterRender();
 });
 window.addEventListener("pft-player-stats-data",event=>{
  canonicalState.rows=Array.isArray(event.detail?.rows)?event.detail.rows:[];
  if(event.detail?.status)$("playerCanonicalStatus").textContent=event.detail.status;
  canonicalRosterRender();
 });
 $("playerCanonicalSearch")?.addEventListener("input",event=>{canonicalState.query=event.target.value||"";canonicalRosterRender();});
 $("playerHubLeagues")?.addEventListener("click",e=>{const b=e.target.closest("[data-hub-league]");if(!b)return;state.league=b.dataset.hubLeague;state.team="ALL";state.selected=null;state.page=0;render();});
 $("playerHubTeams")?.addEventListener("click",e=>{const b=e.target.closest("[data-hub-team]");if(!b)return;state.team=state.team===b.dataset.hubTeam?"ALL":b.dataset.hubTeam;state.selected=null;state.page=0;render();});
 $("playerHubRoster")?.addEventListener("click",e=>{const b=e.target.closest("[data-hub-player]");if(!b)return;state.selected=b.dataset.hubPlayer;state.tab="overview";render();$("playerHubProfile").scrollIntoView({behavior:"smooth",block:"start"});});
 $("playerHubPosition")?.addEventListener("change",e=>{state.position=e.target.value;state.page=0;render();});
 $("playerHubSearch")?.addEventListener("input",e=>{state.query=e.target.value;state.selected=null;state.page=0;render();});
 $("playerHubPrev")?.addEventListener("click",()=>{state.page=Math.max(0,state.page-1);render();});$("playerHubNext")?.addEventListener("click",()=>{state.page++;render();});
 async function load(){try{const refResponse=await fetch("./data/player-team-name-registry-2026-27.json?v=1",{cache:"no-store"});if(refResponse.ok){const refData=await refResponse.json();if(refData.provider==="strikerapi"&&refData.season==="2026/27"&&refData.status==="provider_display_names_verified")state.teamNames=refData.lookup||{};}const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");if(saved?.schemaVersion===1&&saved.season==="2026/27"&&Array.isArray(saved.records))state.rows=saved.records.filter(r=>r&&r.provider==="strikerapi"&&r.season==="2026/27"&&r.review_status==="provisional_needs_manual_verification");}catch(e){status("อ่านข้อมูลในเครื่องไม่ได้: "+e.message);return;}if(!state.rows.length){status("ยังไม่พบข้อมูล Provisional ในอุปกรณ์นี้ · นำเข้า CSV จากส่วนเครื่องมือขั้นสูง");render();return;}status("ข้อมูลจากอุปกรณ์นี้ "+state.rows.length.toLocaleString()+" รายการ · ฤดูกาล 2026/27 · สถานะรอตรวจสอบทั้งหมด");render();}
 window.addEventListener("storage",e=>{if(e.key===STORAGE_KEY)load();});window.addEventListener("pft-football-database-ready",refreshTeamCrests);load();
})();