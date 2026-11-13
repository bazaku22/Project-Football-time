"use strict";
(() => {
  const CORE_LEAGUES = new Set(["PL","PD","BL1","SA","FL1"]);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
  const bangkokDate = (value = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map((part) => [part.type,part.value]));
    return values.year + "-" + values.month + "-" + values.day;
  };
  const dateLabel = (key) => new Date(key + "T12:00:00+07:00").toLocaleDateString("th-TH", {
    timeZone:"Asia/Bangkok",weekday:"long",day:"numeric",month:"long",year:"numeric"
  });
  const timeLabel = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "ไม่ระบุเวลา" : date.toLocaleTimeString("th-TH", {
      timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit",hour12:false
    }) + " น.";
  };
  const kindOf = (match) => {
    const status = String(match.status || "").toUpperCase();
    if (["IN_PLAY","LIVE","PAUSED","HALFTIME","EXTRA_TIME","PENALTY_SHOOTOUT"].includes(status)) return "live";
    if (status === "FINISHED") return "finished";
    return "upcoming";
  };
  const labelOf = (kind) => ({live:"LIVE",upcoming:"UPCOMING",finished:"FT"})[kind];
  let database = null;
  function render() {
    const root = $("homeTodayMatches");
    if (!root) return;
    if (!database || !Array.isArray(database.matches) || !Array.isArray(database.teams)) {
      root.innerHTML = '<div class="home-dashboard-empty">ยังไม่มีข้อมูลการแข่งขันจากฐานข้อมูลหลัก</div>';
      $("homeLiveCount").textContent = $("homeUpcomingCount").textContent = $("homeFinishedCount").textContent = "—";
      $("homeTodayMatchTotal").textContent = "ข้อมูลไม่พร้อม";
      return;
    }
    const today = bangkokDate();
    $("homeTodayDate").textContent = dateLabel(today);
    const teams = new Map(database.teams.map((team) => [String(team.id),team]));
    const matches = database.matches.filter((match) =>
      CORE_LEAGUES.has(String(match.leagueId)) && match.utcDate &&
      bangkokDate(new Date(match.utcDate)) === today
    );
    const counts = {live:0,upcoming:0,finished:0};
    matches.forEach((match) => counts[kindOf(match)]++);
    $("homeLiveCount").textContent = String(counts.live);
    $("homeUpcomingCount").textContent = String(counts.upcoming);
    $("homeFinishedCount").textContent = String(counts.finished);
    $("homeTodayMatchTotal").textContent = matches.length + " นัด";
    const ordered = matches.slice().sort((a,b) => {
      const priority = {live:0,upcoming:1,finished:2};
      const delta = priority[kindOf(a)] - priority[kindOf(b)];
      return delta || new Date(a.utcDate) - new Date(b.utcDate);
    }).slice(0,5);
    if (!ordered.length) {
      root.innerHTML = '<div class="home-dashboard-empty"><b>วันนี้ยังไม่มีรายการแข่งขันในฐานข้อมูลหลัก</b><span>ลองเปิด Match Center เพื่อเลือกวันอื่นหรือดูโปรแกรมจากรายการที่มีข้อมูล</span></div>';
    } else {
      root.innerHTML = ordered.map((match) => {
        const home = teams.get(String(match.homeTeamId));
        const away = teams.get(String(match.awayTeamId));
        const kind = kindOf(match);
        const scoreReady = kind !== "upcoming" && match.homeScore != null && match.awayScore != null;
        const center = scoreReady ? esc(match.homeScore) + " – " + esc(match.awayScore) : "VS";
        const league = (database.leagues || []).find((item) => String(item.id) === String(match.leagueId));
        return '<article class="home-fixture-row">' +
          '<div class="home-fixture-meta"><span>' + esc(league?.name || match.leagueId || "การแข่งขัน") + '</span><span class="home-fixture-status home-fixture-' + kind + '">' + labelOf(kind) + '</span></div>' +
          '<div class="home-fixture-teams"><span>' + esc(home?.shortName || home?.name || "เจ้าบ้าน") + '</span><strong>' + center + '</strong><span>' + esc(away?.shortName || away?.name || "ทีมเยือน") + '</span></div>' +
          '<div class="home-fixture-time">' + (kind === "live" ? "กำลังแข่งขัน" : kind === "finished" ? "จบการแข่งขัน" : timeLabel(match.utcDate)) + '</div>' +
        '</article>';
      }).join("");
    }
    const updated = database.source?.lastSuccessfulSync || database.generatedAt;
    $("homeDataFreshness").textContent = updated
      ? "อัปเดตข้อมูล " + new Date(updated).toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"short",timeStyle:"short"})
      : "ข้อมูลจากฐานข้อมูลฟุตบอลหลัก";
  }
  function mount() {
    $("homeOpenMatchCenter")?.addEventListener("click",() => {
      $("matchCenterApp")?.scrollIntoView({behavior:"smooth",block:"start"});
    });
    database = window.FootballTimeAppContext?.getDatabase?.() || null;
    render();
    window.addEventListener("pft-football-database-ready",(event) => {
      database = window.FootballTimeAppContext?.getDatabase?.() || null;
      if (!database && event.detail) render();
      else render();
    });
    window.addEventListener("pft-football-database-error",() => {
      database = null;
      render();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
