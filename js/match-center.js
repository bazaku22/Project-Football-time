"use strict";
(() => {
  const CORE_LEAGUES = new Set(["PL","PD","BL1","SA","FL1"]);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  let database = null;
  let activeFilter = "upcoming";
  let activeLeague = "ALL";

  function bangkokDate(value = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"
    }).formatToParts(value);
    const part = Object.fromEntries(parts.map((x) => [x.type,x.value]));
    return part.year + "-" + part.month + "-" + part.day;
  }
  function formatThaiDate(dateKey) {
    const date = new Date(dateKey + "T12:00:00+07:00");
    return Number.isNaN(date.getTime()) ? dateKey : date.toLocaleDateString("th-TH", {
      timeZone:"Asia/Bangkok",weekday:"long",day:"numeric",month:"long",year:"numeric"
    });
  }
  function formatThaiTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "ไม่ระบุเวลา" : date.toLocaleTimeString("th-TH", {
      timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit",hour12:false
    }) + " น.";
  }
  function formatUpdated(value) {
    if (!value) return "ไม่ระบุเวลาซิงก์ล่าสุด";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "ไม่ระบุเวลาซิงก์ล่าสุด" : date.toLocaleString("th-TH", {
      timeZone:"Asia/Bangkok",dateStyle:"medium",timeStyle:"short"
    });
  }
  function statusKind(match) {
    const status = String(match.status || "").toUpperCase();
    if (["IN_PLAY","LIVE","PAUSED","HALFTIME","EXTRA_TIME","PENALTY_SHOOTOUT"].includes(status)) return "live";
    if (status === "FINISHED") return "finished";
    if (["POSTPONED","CANCELLED","SUSPENDED","AWARDED"].includes(status)) return "other";
    return "upcoming";
  }
  function statusLabel(match) {
    const status = String(match.status || "").toUpperCase();
    return ({
      SCHEDULED:"รอแข่งขัน",TIMED:"กำหนดเวลาแล้ว",IN_PLAY:"กำลังแข่งขัน",
      LIVE:"กำลังแข่งขัน",PAUSED:"พักการแข่งขัน",HALFTIME:"พักครึ่ง",
      EXTRA_TIME:"ต่อเวลาพิเศษ",PENALTY_SHOOTOUT:"ดวลจุดโทษ",
      FINISHED:"จบการแข่งขัน",POSTPONED:"เลื่อนการแข่งขัน",
      CANCELLED:"ยกเลิก",SUSPENDED:"หยุดการแข่งขันชั่วคราว",AWARDED:"ตัดสินผล"
    })[status] || (match.status || "ไม่ระบุสถานะ");
  }
  function matchDate(match) {
    const date = new Date(match.utcDate);
    return Number.isNaN(date.getTime()) ? "" : bangkokDate(date);
  }
  function teamFor(id) {
    return (database?.teams || []).find((team) => String(team.id) === String(id)) || null;
  }
  function crest(team) {
    const initials = String(team?.shortName || team?.tla || team?.name || "⚽").trim().slice(0,3);
    if (team?.crest) {
      return '<span class="mc-crest-wrap"><img src="' + esc(team.crest) + '" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden class="mc-crest-fallback">' + esc(initials) + '</span></span>';
    }
    return '<span class="mc-crest-fallback">' + esc(initials || "⚽") + '</span>';
  }
  function matchId(match) {
    return String(match.id || [match.leagueId,match.utcDate,match.homeTeamId,match.awayTeamId].join("|"));
  }
  function filteredMatches() {
    const now = Date.now();
    const today = bangkokDate();
    return (database?.matches || []).filter((match) => {
      if (!CORE_LEAGUES.has(String(match.leagueId))) return false;
      if (activeLeague !== "ALL" && match.leagueId !== activeLeague) return false;
      const kind = statusKind(match);
      const kickoff = new Date(match.utcDate).getTime();
      if (activeFilter === "today") return matchDate(match) === today;
      if (activeFilter === "upcoming") return kind === "upcoming" && Number.isFinite(kickoff) && kickoff >= now;
      if (activeFilter === "live") return kind === "live";
      if (activeFilter === "finished") return kind === "finished";
      return true;
    }).sort((a,b) => {
      const aTime = new Date(a.utcDate).getTime(), bTime = new Date(b.utcDate).getTime();
      if (activeFilter === "finished") return bTime-aTime;
      return aTime-bTime;
    });
  }
  function renderCard(match) {
    const home = teamFor(match.homeTeamId), away = teamFor(match.awayTeamId);
    const kind = statusKind(match);
    const scoreReady = match.homeScore !== null && match.homeScore !== undefined &&
      match.awayScore !== null && match.awayScore !== undefined &&
      (kind === "finished" || kind === "live");
    const score = scoreReady ? esc(match.homeScore) + " - " + esc(match.awayScore) : "VS";
    const league = (database?.leagues || []).find((item) => item.id === match.leagueId);
    const date = matchDate(match);
    const time = formatThaiTime(match.utcDate);
    return '<article class="mc-match-card">' +
      '<div class="mc-match-top"><span class="mc-league-name">' + esc(league?.name || match.leagueId) + '</span>' +
      '<span class="mc-status mc-status-' + kind + '">' + esc(statusLabel(match)) + '</span></div>' +
      '<div class="mc-match-main">' +
      '<div class="mc-team">' + crest(home) + '<span>' + esc(match.homeTeamName || home?.name || "เจ้าบ้าน") + '</span></div>' +
      '<div class="mc-score">' + score + '</div>' +
      '<div class="mc-team mc-team-away">' + crest(away) + '<span>' + esc(match.awayTeamName || away?.name || "ทีมเยือน") + '</span></div>' +
      '</div><div class="mc-match-bottom"><span>' + esc(time) + '</span><span>' + esc(statusLabel(match)) + '</span>' +
      '<button type="button" class="mc-open-match" data-open-match="' + esc(matchId(match)) + '" data-match-date="' + esc(date) + '" data-match-league="' + esc(match.leagueId) + '">ดูรายละเอียดข้อมูล</button></div></article>';
  }
  function render() {
    const root = $("matchCenterMatches");
    const count = $("matchCenterCount");
    const state = $("matchCenterDataState");
    if (!root || !count || !state) return;
    if (!database) {
      count.textContent = "—";
      state.textContent = "กำลังรอฐานข้อมูลฟุตบอล";
      root.innerHTML = '<div class="mc-empty">กำลังโหลดข้อมูลการแข่งขันจากฐานข้อมูลหลัก…</div>';
      return;
    }
    const rows = filteredMatches();
    count.textContent = rows.length + " นัด";
    const sourceTime = database.source?.lastSuccessfulSync || database.generatedAt;
    state.textContent = "แหล่งข้อมูล: " + (database.source?.provider || "ไม่ระบุ") +
      " · อัปเดตล่าสุด " + formatUpdated(sourceTime);
    if (!rows.length) {
      root.innerHTML = '<div class="mc-empty"><b>ไม่พบการแข่งขันในตัวกรองนี้</b><span>ไม่มีข้อมูลที่ตรงกับช่วงเวลา ลีก หรือสถานะที่เลือก · ระบบจะไม่ใช้โปรแกรมทดลองแทนข้อมูลจริง</span></div>';
      return;
    }
    const groups = new Map();
    rows.forEach((match) => {
      const key = matchDate(match) || "unknown";
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(match);
    });
    root.innerHTML = [...groups.entries()].map(([date,matches]) =>
      '<section class="mc-day-group"><h3>' + esc(date === "unknown" ? "ไม่ระบุวันแข่งขัน" : formatThaiDate(date)) +
      '<span>' + matches.length + ' นัด</span></h3><div class="mc-day-matches">' +
      matches.map(renderCard).join("") + '</div></section>'
    ).join("");
  }
  function renderLeagues() {
    const select = $("matchCenterLeague");
    if (!select || !database) return;
    const leagues = (database.leagues || []).filter((league) => CORE_LEAGUES.has(String(league.id)));
    select.innerHTML = '<option value="ALL">ทุกลีกหลัก</option>' + leagues.map((league) =>
      '<option value="' + esc(league.id) + '">' + esc(league.name) + '</option>'
    ).join("");
    select.value = activeLeague;
  }
  function setFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll("[data-match-filter]").forEach((button) => {
      const active = button.dataset.matchFilter === filter;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",String(active));
    });
    render();
  }
  function openInDatabase(button) {
    const page = document.querySelector('[data-page="fixtures"]');
    page?.click();
    document.querySelector('[data-db-tab="overview"]')?.click();
    const from = $("discoveryDateFrom"), to = $("discoveryDateTo"), league = $("discoveryDateLeague");
    if (from) { from.value = button.dataset.matchDate || ""; from.dispatchEvent(new Event("input",{bubbles:true})); }
    if (to) { to.value = button.dataset.matchDate || ""; to.dispatchEvent(new Event("input",{bubbles:true})); }
    if (league) { league.value = button.dataset.matchLeague || "ALL"; league.dispatchEvent(new Event("change",{bubbles:true})); }
    $("discoveryDateCard")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function mount() {
    document.querySelectorAll("[data-match-filter]").forEach((button) =>
      button.addEventListener("click",() => setFilter(button.dataset.matchFilter))
    );
    $("matchCenterLeague")?.addEventListener("change",(event) => {
      activeLeague = event.target.value || "ALL";
      render();
    });
    $("matchCenterMatches")?.addEventListener("click",(event) => {
      const button = event.target.closest("[data-open-match]");
      if (button) openInDatabase(button);
    });
    const existing = window.FootballTimeAppContext?.getDatabase?.();
    if (existing) setDatabase(existing);
    else render();
  }
  function setDatabase(data) {
    database = data && Array.isArray(data.matches) ? data : null;
    renderLeagues();
    render();
  }
  window.addEventListener("pft-football-database-ready",() => {
    setDatabase(window.FootballTimeAppContext?.getDatabase?.() || null);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();