"use strict";
(() => {
  const DATA_URL = "./data/player-database-v2.json";
  const SEASON = "2026/27";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const safeImage = (value) => {
    try { const url = new URL(String(value || "")); return url.protocol === "https:" ? url.href : ""; }
    catch (_) { return ""; }
  };
  const image = (url, alt, cls) => {
    const src = safeImage(url);
    return src ? '<img class="'+cls+'" src="'+esc(src)+'" alt="'+esc(alt)+'" loading="lazy" referrerpolicy="no-referrer">' :
      '<div class="'+cls+' player-v2-image-placeholder" aria-label="'+esc(alt)+'">⚽</div>';
  };
  const stat = (value) => Number.isFinite(Number(value)) && value !== null && value !== "" ? String(Number(value)) : "—";
  const leagues = [
    {id:"PL",name:"Premier League",short:"PL"},
    {id:"PD",name:"LaLiga",short:"PD"},
    {id:"BL1",name:"Bundesliga",short:"BL1"},
    {id:"SA",name:"Serie A",short:"SA"},
    {id:"FL1",name:"Ligue 1",short:"FL1"},
    {id:"OTHER",name:"ลีกอื่น ๆ / ยังไม่จัดลีก",short:"อื่น ๆ"}
  ];
  let players = [];
  let selectedId = "";
  let query = "";
  let view = {level:"root",leagueId:"",club:"",teamId:""};
  const root = () => document.getElementById("playerV2Content");
  const leagueFor = (player) => player.currentClub?.leagueId || "OTHER";
  const countNationalPlayers = (teamId) => players.filter(p => (p.nationalTeams || []).some(t => t.teamId === teamId)).length;
  function statsBlock(title, stats, sourceLabel) {
    const value = stats || {};
    const asOf = value.asOf ? "ข้อมูล ณ "+value.asOf : sourceLabel;
    return '<section class="player-v2-stat-section"><div class="player-v2-section-head"><b>'+title+'</b><span>'+esc(asOf)+'</span></div><div class="player-v2-stat-grid">'+
      [['ลงสนาม','appearances'],['ประตู','goals'],['แอสซิสต์','assists']].map(([label,key]) =>
        '<div class="player-v2-stat"><b>'+stat(value[key])+'</b><span>'+label+'</span></div>'
      ).join("")+'</div></section>';
  }
  function navHeader(title, backAction, backLabel) {
    return '<div class="player-v2-toolbar"><button type="button" class="player-v2-back" data-nav="'+esc(backAction)+'">‹ '+esc(backLabel)+'</button><span class="player-v2-step">'+esc(title)+'</span></div>';
  }
  function renderRoot() {
    selectedId = ""; query = "";
    const nationalCount = countNationalPlayers("THA");
    const clubCount = new Set(players.map(p=>p.currentClub?.name).filter(Boolean)).size;
    root().innerHTML =
      '<div class="player-v2-home-grid">'+
        '<button type="button" class="player-v2-category" data-nav="clubs"><span class="player-v2-category-icon">🏟️</span><span><b>สโมสร</b><small>เลือกลีก → สโมสร → รายชื่อนักเตะ</small></span><strong>'+clubCount+' สโมสร</strong></button>'+
        '<button type="button" class="player-v2-category" data-nav="national"><span class="player-v2-category-icon">🌐</span><span><b>ทีมชาติ</b><small>เลือกทีมชาติ → รายชื่อนักเตะ</small></span><strong>'+nationalCount+' คน</strong></button>'+
      '</div>'+
      '<p class="player-v2-note">เลือกหมวดที่ต้องการก่อน รายชื่อนักเตะจะไม่แสดงรวมกันในหน้านี้ · Player ID เดียวกันใช้ร่วมกันได้ทั้งสโมสรและทีมชาติ</p>';
  }
  function renderLeagueList() {
    selectedId = ""; query = "";
    const cards = leagues.map(league => {
      const count = players.filter(p=>p.currentClub && leagueFor(p)===league.id).length;
      const clubCount = new Set(players.filter(p=>p.currentClub && leagueFor(p)===league.id).map(p=>p.currentClub.name)).size;
      return '<button type="button" class="player-v2-directory-card" data-league="'+esc(league.id)+'"><span class="player-v2-league-code">'+esc(league.short)+'</span><span><b>'+esc(league.name)+'</b><small>'+clubCount+' สโมสร · '+count+' นักเตะ</small></span><span class="player-v2-chevron">›</span></button>';
    }).join("");
    root().innerHTML = navHeader("เลือกลีก","root","กลับหน้าหมวด")+
      '<div class="player-v2-directory">'+cards+'</div>'+
      '<p class="player-v2-note">ลีกที่ยังไม่มีข้อมูลนักเตะจะแสดงเป็น 0 คน และจะเติมรายชื่อเมื่อมีข้อมูลสโมสรที่ตรวจสอบแล้ว</p>';
  }
  function renderClubList(leagueId) {
    selectedId = ""; query = "";
    view = {level:"clubs",leagueId,club:"",teamId:""};
    const league = leagues.find(x=>x.id===leagueId);
    const clubs = [...new Set(players.filter(p=>p.currentClub && leagueFor(p)===leagueId).map(p=>p.currentClub.name))].sort((a,b)=>a.localeCompare(b,"th"));
    const cards = clubs.map(club => {
      const count = players.filter(p=>p.currentClub?.name===club && leagueFor(p)===leagueId).length;
      return '<button type="button" class="player-v2-directory-card" data-club="'+esc(club)+'"><span class="player-v2-club-mark">⚽</span><span><b>'+esc(club)+'</b><small>'+count+' นักเตะ</small></span><span class="player-v2-chevron">›</span></button>';
    }).join("");
    root().innerHTML = navHeader(league?.name || "เลือกสโมสร","leagues","กลับไปเลือกลีค")+
      (cards ? '<div class="player-v2-directory">'+cards+'</div>' : '<div class="player-v2-empty">ยังไม่มีรายชื่อนักเตะในลีกนี้<br><small>จะเพิ่มเมื่อมีข้อมูลลีกและสโมสรที่ตรวจสอบได้</small></div>');
  }
  function renderNationalList() {
    selectedId = ""; query = "";
    const teams = new Map();
    players.forEach(p => (p.nationalTeams || []).forEach(t => teams.set(t.teamId,t)));
    const cards = [...teams.values()].sort((a,b)=>a.name.localeCompare(b.name,"th")).map(team =>
      '<button type="button" class="player-v2-directory-card" data-team="'+esc(team.teamId)+'"><span class="player-v2-team-flag">🇹🇭</span><span><b>'+esc(team.name)+'</b><small>'+countNationalPlayers(team.teamId)+' นักเตะ · '+(team.competition ? esc(team.competition) : "ทีมชาติชุดใหญ่")+'</small></span><span class="player-v2-chevron">›</span></button>'
    ).join("");
    root().innerHTML = navHeader("เลือกทีมชาติ","root","กลับหน้าหมวด")+
      (cards ? '<div class="player-v2-directory">'+cards+'</div>' : '<div class="player-v2-empty">ยังไม่มีรายชื่อทีมชาติที่ผ่านการตรวจสอบ</div>');
  }
  function renderPlayerList(kind, key) {
    selectedId = ""; query = "";
    if(kind==="club") view={level:"players",leagueId:view.leagueId,club:key,teamId:""};
    else view={level:"players",leagueId:"",club:"",teamId:key};
    const team = kind==="national" ? players.flatMap(p=>p.nationalTeams||[]).find(t=>t.teamId===key) : null;
    const title = kind==="club" ? key : (team?.name || "ทีมชาติ");
    const backAction = kind==="club" ? "clubs" : "national";
    const filtered = players.filter(p => kind==="club" ? p.currentClub?.name===key : (p.nationalTeams||[]).some(t=>t.teamId===key));
    const cards = filtered.filter(p=>[p.name,p.playerId,p.currentClub?.name,p.country?.name].join(" ").toLowerCase().includes(query.toLowerCase())).map(p =>
      '<button type="button" class="player-v2-card" data-player-id="'+esc(p.playerId || "")+'">'+image(p.photoUrl,p.name || "ภาพนักเตะ","player-v2-card-photo")+
      '<span class="player-v2-card-main"><b>'+esc(p.name || "ไม่ระบุชื่อ")+'</b><small>Player ID: '+esc(p.playerId || "ยังไม่กำหนด")+'</small>'+
      '<small>'+(p.country?.flag ? esc(p.country.flag)+" " : "")+esc(p.country?.name || "ไม่ระบุประเทศ")+' · '+esc(p.position || "ไม่ระบุตำแหน่ง")+'</small>'+
      '<span class="player-v2-club">'+image(p.currentClub?.logoUrl,"ตราสโมสร","player-v2-club-logo")+esc(p.currentClub?.name || "ยังไม่มีสโมสร")+'</span></span></button>'
    ).join("");
    root().innerHTML = navHeader(title,backAction,kind==="club"?"กลับรายชื่อสโมสร":"กลับรายชื่อทีมชาติ")+
      '<input id="playerV2Search" class="filter player-v2-search" type="search" placeholder="ค้นหาชื่อนักเตะ / Player ID" aria-label="ค้นหานักเตะในหมวดนี้">'+
      '<div class="player-v2-list" id="playerV2List">'+(cards || '<div class="player-v2-empty">ไม่พบรายชื่อนักเตะในหมวดนี้</div>')+'</div>'+
      '<p class="player-v2-note">มี '+filtered.length+' รายชื่อ · แตะนักเตะเพื่อดูข้อมูลและสถิติแยกหมวด</p>';
    document.getElementById("playerV2Search")?.addEventListener("input",event=>{
      query=event.target.value.trim();
      const current=players.filter(p=>kind==="club"?p.currentClub?.name===key:(p.nationalTeams||[]).some(t=>t.teamId===key))
        .filter(p=>[p.name,p.playerId,p.currentClub?.name,p.country?.name].join(" ").toLowerCase().includes(query.toLowerCase()));
      const list=document.getElementById("playerV2List");
      if(list) list.innerHTML=current.map(p=>'<button type="button" class="player-v2-card" data-player-id="'+esc(p.playerId||"")+'">'+image(p.photoUrl,p.name||"ภาพนักเตะ","player-v2-card-photo")+'<span class="player-v2-card-main"><b>'+esc(p.name||"ไม่ระบุชื่อ")+'</b><small>Player ID: '+esc(p.playerId||"ยังไม่กำหนด")+'</small><small>'+(p.country?.flag?esc(p.country.flag)+" ":"")+esc(p.country?.name||"ไม่ระบุประเทศ")+' · '+esc(p.position||"ไม่ระบุตำแหน่ง")+'</small><span class="player-v2-club">'+image(p.currentClub?.logoUrl,"ตราสโมสร","player-v2-club-logo")+esc(p.currentClub?.name||"ยังไม่มีสโมสร")+'</span></span></button>').join("") || '<div class="player-v2-empty">ไม่พบรายชื่อนักเตะที่ตรงกับคำค้น</div>';
    });
  }
  function renderProfile(player) {
    selectedId = player.playerId;
    const club = player.currentClub || {};
    const country = player.country ? ((player.country.flag ? esc(player.country.flag)+" " : "")+esc(player.country.name || "")) : "ยังไม่มีข้อมูล";
    const nationalTeams = (player.nationalTeams||[]).map(t=>esc(t.name)).join(" · ") || "ยังไม่มีรายชื่อทีมชาติ";
    root().innerHTML = '<button type="button" class="player-v2-back" data-nav="players">‹ กลับไปหน้ารายชื่อ</button>'+
      '<article class="player-v2-profile"><div class="player-v2-hero">'+image(player.photoUrl,"ภาพนักเตะ","player-v2-photo")+
      '<div class="player-v2-identity"><h3>'+esc(player.name || "ไม่ระบุชื่อ")+'</h3><small>Player ID: '+esc(player.playerId || "ยังไม่กำหนด")+'</small>'+
      '<div>'+country+'</div><span class="player-v2-position">'+esc(player.position || "ไม่ระบุตำแหน่ง")+'</span>'+
      '<div class="player-v2-club">'+image(club.logoUrl,"ตราสโมสร","player-v2-club-logo")+'<span>'+esc(club.name || "ยังไม่มีสโมสร")+'</span></div>'+
      '<small>ทีมชาติ: '+nationalTeams+'</small></div></div>'+
      '<div class="player-v2-season">สถิติแยกตามประเภทการแข่งขัน</div>'+
      statsBlock("สถิติสโมสร",player.statistics?.club,"ฤดูกาล "+(player.statistics?.club?.season || SEASON))+
      statsBlock("สถิติทีมชาติชุดใหญ่",player.statistics?.nationalTeam,"อาชีพ · FIFA International A Matches")+
      '<p class="player-v2-note">สถิติทีมชาติครอบคลุมเฉพาะทีมชาติชุดใหญ่ A Match เท่านั้น ไม่รวม U23/U21/U20/U17 และเกมที่ไม่รับรอง · สถิติสโมสรและทีมชาติแยกจากกัน ไม่รวมยอดเข้าด้วยกัน · เครื่องหมาย — หมายถึงยังไม่มีข้อมูลที่ยืนยันได้</p>'+
      '</article>';
  }
  function renderCurrent() {
    if(view.level==="root") return renderRoot();
    if(view.level==="leagues") return renderLeagueList();
    if(view.level==="clubs") return renderClubList(view.leagueId);
    if(view.level==="national") return renderNationalList();
    if(view.level==="players") return renderPlayerList(view.teamId?"national":"club",view.teamId||view.club);
    renderRoot();
  }
  async function init() {
    const fixtures = document.getElementById("fixtures");
    const subnav = fixtures?.querySelector(".db-subnav");
    if (!fixtures || !subnav || document.getElementById("dbtab-players")) return;
    const button = document.createElement("button");
    button.type = "button"; button.dataset.dbTab = "players"; button.textContent = "ฐานข้อมูลนักเตะ";
    subnav.appendChild(button);
    const panel = document.createElement("div");
    panel.className = "db-panel"; panel.id = "dbtab-players";
    panel.innerHTML = '<div class="sectionhead"><h2>ฐานข้อมูลนักฟุตบอล</h2><span class="small">PLAYER DATABASE V2</span></div>'+
      '<p class="player-v2-intro">เลือกหมวดข้อมูลก่อนค้นหารายชื่อนักเตะ พร้อมใช้ Player ID เดียวกันในทุกสังกัด</p>'+
      '<div id="playerV2Content"><div class="player-v2-empty">กำลังโหลดฐานข้อมูลนักเตะ…</div></div>'+
      '<p class="player-v2-note">แสดงเฉพาะข้อมูลที่ตรวจสอบได้ · ไม่เดาภาพนักเตะ ตราสโมสร หรือสถิติ</p>';
    fixtures.appendChild(panel);
    panel.addEventListener("click",event=>{
      const nav=event.target.closest("[data-nav]");
      if(nav){
        const action=nav.dataset.nav;
        if(action==="root"){view={level:"root",leagueId:"",club:"",teamId:""};renderRoot();}
        else if(action==="clubs"){if(view.leagueId)renderClubList(view.leagueId);else{view={level:"leagues",leagueId:"",club:"",teamId:""};renderLeagueList();}}
        else if(action==="leagues"){view={level:"leagues",leagueId:"",club:"",teamId:""};renderLeagueList();}
        else if(action==="national"){view={level:"national",leagueId:"",club:"",teamId:""};renderNationalList();}
        else if(action==="players")renderCurrent();
        return;
      }
      const league=event.target.closest("[data-league]");
      if(league){renderClubList(league.dataset.league);return;}
      const club=event.target.closest("[data-club]");
      if(club){renderPlayerList("club",club.dataset.club);return;}
      const team=event.target.closest("[data-team]");
      if(team){renderPlayerList("national",team.dataset.team);return;}
      const card=event.target.closest("[data-player-id]");
      if(card){const player=players.find(p=>String(p.playerId||"")===card.dataset.playerId);if(player)renderProfile(player);}
    });
    try {
      const response = await fetch(DATA_URL + "?v=3", {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP "+response.status);
      const data = await response.json();
      if (data.schemaVersion !== "2.0.0" || !Array.isArray(data.players)) throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
      players = data.players;
      renderRoot();
    } catch (error) {
      const content = document.getElementById("playerV2Content");
      if (content) content.innerHTML = '<div class="player-v2-empty">โหลดฐานข้อมูลนักเตะไม่สำเร็จ<br><small>'+esc(error.message)+'</small></div>';
    }
  }
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = "./css/player-database-v2.css?v=2";
  document.head.appendChild(link);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();