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
  let players = [];
  let selectedId = "";
  let query = "";
  function statsBlock(title, stats, sourceLabel) {
    const value = stats || {};
    return '<section class="player-v2-stat-section"><div class="player-v2-section-head"><b>'+title+'</b><span>'+sourceLabel+'</span></div><div class="player-v2-stat-grid">'+
      [['ลงสนาม','appearances'],['ประตู','goals'],['แอสซิสต์','assists']].map(([label,key]) =>
        '<div class="player-v2-stat"><b>'+stat(value[key])+'</b><span>'+label+'</span></div>'
      ).join("")+'</div></section>';
  }
  function renderProfile(player) {
    const root = document.getElementById("playerV2Content");
    if (!root) return;
    if (!player) {
      root.innerHTML = '<div class="player-v2-empty">เลือกนักเตะเพื่อดูรายละเอียด หรือรอเพิ่มข้อมูลนักเตะที่ผ่านการตรวจสอบ</div>';
      return;
    }
    const country = player.country ? ((player.country.flag ? esc(player.country.flag)+" " : "")+esc(player.country.name || "")) : "ยังไม่มีข้อมูล";
    const club = player.currentClub || {};
    root.innerHTML = '<button type="button" class="player-v2-back" id="playerV2Back">‹ กลับไปหน้ารายชื่อ</button>'+
      '<article class="player-v2-profile"><div class="player-v2-hero">'+image(player.photoUrl, "ภาพนักเตะ", "player-v2-photo")+
      '<div class="player-v2-identity"><h3>'+esc(player.name || "ไม่ระบุชื่อ")+'</h3><small>Player ID: '+esc(player.playerId || "ยังไม่กำหนด")+'</small>'+
      '<div>'+country+'</div><span class="player-v2-position">'+esc(player.position || "ไม่ระบุตำแหน่ง")+'</span>'+
      '<div class="player-v2-club">'+image(club.logoUrl, "ตราสโมสร", "player-v2-club-logo")+'<span>'+esc(club.name || "ยังไม่มีสโมสร")+'</span></div></div></div>'+
      '<div class="player-v2-season">สถิติฤดูกาล '+esc(player.season || SEASON)+'</div>'+
      statsBlock("สถิติสโมสร", player.statistics?.club, "ระดับสโมสร")+
      statsBlock("สถิติทีมชาติ", player.statistics?.nationalTeam, "ระดับทีมชาติ")+
      '<p class="player-v2-note">สถิติทั้งสองหมวดแยกจากกัน ไม่รวมยอดเข้าด้วยกัน · เครื่องหมาย — หมายถึงยังไม่มีข้อมูลที่ยืนยันได้</p>'+
      '</article>';
    document.getElementById("playerV2Back")?.addEventListener("click", renderList);
  }
  function renderList() {
    selectedId = "";
    const root = document.getElementById("playerV2Content");
    if (!root) return;
    const filtered = players.filter(p => [p.name,p.playerId,p.currentClub?.name,p.country?.name].join(" ").toLowerCase().includes(query.toLowerCase()));
    if (!filtered.length) {
      root.innerHTML = '<div class="player-v2-empty">'+(players.length ? "ไม่พบรายชื่อนักเตะที่ตรงกับคำค้น" : "ยังไม่มีข้อมูลนักเตะในฐานข้อมูล V2<br><small>ยังไม่มีการสร้าง Player ID หรือเติมสถิติ จนกว่าจะตรวจสอบตัวตนและแหล่งข้อมูลเรียบร้อย</small>")+'</div>';
      return;
    }
    root.innerHTML = '<div class="player-v2-list">'+filtered.map(p =>
      '<button type="button" class="player-v2-card" data-player-id="'+esc(p.playerId || "")+'">'+image(p.photoUrl,p.name || "ภาพนักเตะ","player-v2-card-photo")+
      '<span class="player-v2-card-main"><b>'+esc(p.name || "ไม่ระบุชื่อ")+'</b><small>'+esc(p.playerId || "ยังไม่กำหนด Player ID")+'</small>'+
      '<small>'+(p.country?.flag ? esc(p.country.flag)+" " : "")+esc(p.country?.name || "ไม่ระบุประเทศ")+' · '+esc(p.position || "ไม่ระบุตำแหน่ง")+'</small>'+
      '<span class="player-v2-club">'+image(p.currentClub?.logoUrl,"ตราสโมสร","player-v2-club-logo")+esc(p.currentClub?.name || "ยังไม่มีสโมสร")+'</span></span></button>'
    ).join("")+'</div>';
    root.querySelectorAll("[data-player-id]").forEach(button => button.addEventListener("click", () => {
      const player = players.find(p => String(p.playerId || "") === button.dataset.playerId);
      if (player) renderProfile(player);
    }));
  }
  async function init() {
    const fixtures = document.getElementById("fixtures");
    const subnav = fixtures?.querySelector(".db-subnav");
    if (!fixtures || !subnav || document.getElementById("dbtab-players")) return;
    const button = document.createElement("button");
    button.type = "button"; button.dataset.dbTab = "players"; button.textContent = "ฐานข้อมูลนักเตะ";
    subnav.appendChild(button);
    const panel = document.createElement("div");
    panel.className = "db-panel";
    panel.id = "dbtab-players";
    panel.innerHTML = '<div class="sectionhead"><h2>ฐานข้อมูลนักฟุตบอล</h2><span class="small">PLAYER DATABASE V2</span></div>'+
      '<p class="player-v2-intro">ข้อมูลนักเตะอย่างกระชับ พร้อมแยกสถิติสโมสรและทีมชาติอย่างชัดเจน</p>'+
      '<input id="playerV2Search" class="filter" type="search" placeholder="ค้นหาชื่อนักเตะ / สโมสร / Player ID" aria-label="ค้นหานักเตะ">'+
      '<div id="playerV2Content"><div class="player-v2-empty">กำลังโหลดฐานข้อมูลนักเตะ…</div></div>'+
      '<p class="player-v2-note">แสดงเฉพาะข้อมูลที่ตรวจสอบได้ · ไม่สร้าง Player ID อัตโนมัติ · ไม่เดาภาพนักเตะ ตราสโมสร หรือสถิติ</p>';
    fixtures.appendChild(panel);
    document.getElementById("playerV2Search")?.addEventListener("input", event => { query = event.target.value.trim(); renderList(); });
    try {
      const response = await fetch(DATA_URL + "?v=2", {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP "+response.status);
      const data = await response.json();
      if (data.schemaVersion !== "2.0.0" || !Array.isArray(data.players)) throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
      players = data.players;
      renderList();
    } catch (error) {
      const content = document.getElementById("playerV2Content");
      if (content) content.innerHTML = '<div class="player-v2-empty">โหลดฐานข้อมูลนักเตะไม่สำเร็จ<br><small>'+esc(error.message)+'</small></div>';
    }
  }
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = "./css/player-database-v2.css?v=1";
  document.head.appendChild(link);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
