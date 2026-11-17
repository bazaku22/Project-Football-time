"use strict";
(() => {
  const CORE_LEAGUES = new Set(["PL","PD","BL1","SA","FL1","INTL"]);
  const INTERNATIONAL_DATA_URL = "./data/international-matches.json";
  let baseDatabase = null;
  let internationalData = null;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  let database = null;
  let databaseError = "";
  let activeFilter = "all";
  let activeLeagues = new Set();
  let activeSearch = "";
  let selectedDate = "";
  let calendarAnchorDate = "";
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
  function matchSortTime(match) {
    const date = new Date(match.utcDate);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    return Number.POSITIVE_INFINITY;
  }
  function teamFor(id) {
    return (database?.teams || []).find((team) => String(team.id) === String(id)) || null;
  }
  function crest(team) {
    if (team?.flagEmoji) return "<span class=\"mc-national-flag\" role=\"img\" aria-label=\"ธงชาติ " + esc(team.name || "") + "\">" + esc(team.flagEmoji) + "</span>";
    const initials = String(team?.shortName || team?.tla || team?.name || "⚽").trim().slice(0,3);
    if (team?.crest) {
      return '<span class="mc-crest-wrap"><img src="' + esc(team.crest) + '" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden class="mc-crest-fallback">' + esc(initials) + '</span></span>';
    }
    return '<span class="mc-crest-fallback">' + esc(initials || "⚽") + '</span>';
  }
  function matchId(match) {
    return String(match.id || [match.leagueId,match.utcDate,match.homeTeamId,match.awayTeamId].join("|"));
  }
  function matchDateKey(match) { return matchDate(match); }
  function matchesForFilters() {
    const now = Date.now();
    return (database?.matches || []).filter((match) => CORE_LEAGUES.has(String(match.leagueId))).filter((match) => {
      if (activeLeagues.size && !activeLeagues.has(String(match.leagueId))) return false;
      if (activeSearch) {
        const query = activeSearch.toLocaleLowerCase();
        if (![match.homeTeamName,match.awayTeamName].join(" ").toLocaleLowerCase().includes(query)) return false;
      }
      const kind = statusKind(match);
      const kickoff = new Date(match.utcDate).getTime();
      if (activeFilter === "upcoming") {
        if (kind !== "upcoming") return false;
        return Number.isFinite(kickoff) && kickoff >= now;
      }
      if (activeFilter === "live") return kind === "live";
      if (activeFilter === "finished") return kind === "finished";
      return true;
    }).sort((a,b) => {
      const aTime = matchSortTime(a), bTime = matchSortTime(b);
      if (activeFilter === "finished") return bTime-aTime;
      return aTime-bTime;
    });
  }
  function filteredMatches() {
    return matchesForFilters().filter((match) => matchDateKey(match) === selectedDate);
  }
  function shiftDateKey(dateKey, days) {
    const date = new Date(String(dateKey) + "T12:00:00Z");
    if (Number.isNaN(date.getTime())) return bangkokDate();
    date.setUTCDate(date.getUTCDate() + Number(days));
    return date.toISOString().slice(0,10);
  }
  function isDateKey(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const date = new Date(value + "T12:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  }
  function setSelectedDate(value) {
    if (!isDateKey(value)) return;
    selectedDate = value;
    calendarAnchorDate = value;
    renderCalendar();
    render();
  }
  function renderCalendar() {
    const strip = $("matchCenterDateStrip");
    const picker = $("matchCenterDate");
    if (picker && selectedDate) picker.value = selectedDate;
    if (!strip || !calendarAnchorDate) return;
    const counts = new Map();
    matchesForFilters().forEach((match) => {
      const key = matchDateKey(match);
      if (key) counts.set(key,(counts.get(key) || 0) + 1);
    });
    const today = bangkokDate();
    const days = Array.from({length:7},(_,index) => shiftDateKey(calendarAnchorDate,index));
    strip.innerHTML = days.map((key) => {
      const date = new Date(key + "T12:00:00+07:00");
      const weekday = date.toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok",weekday:"short"});
      const day = date.toLocaleDateString("th-TH",{timeZone:"Asia/Bangkok",day:"numeric"});
      const count = counts.get(key) || 0;
      const active = key === selectedDate;
      const label = weekday + " " + day + (key === today ? " วันนี้" : "");
      return '<button type="button" class="mc-date-chip' + (active ? ' active' : '') +
        (count ? ' has-matches' : '') + '" data-calendar-date="' + key +
        '" aria-pressed="' + String(active) + '" aria-label="' + esc(label + " มี " + count + " นัด") + '">' +
        '<span>' + esc(weekday) + '</span><b>' + esc(day) + '</b><small>' + count + ' นัด</small></button>';
    }).join("");
  }
  function renderLeagueFilters() {
    const root = $("matchCenterLeagueFilters");
    if (!root) return;
    const leagues = (database?.leagues || []).filter((league) => CORE_LEAGUES.has(String(league.id)));
    const chips = leagues.map((league) => ({value:String(league.id),label:league.name}));
    const allActive = activeLeagues.size === 0;
    root.innerHTML = '<button type="button" class="mc-league-chip' + (allActive ? ' active' : '') +
      '" data-league-filter="ALL" aria-pressed="' + String(allActive) + '">ทุกลีก / รายการ</button>' +
      chips.map((chip) => {
        const active = activeLeagues.has(chip.value);
        return '<button type="button" class="mc-league-chip' + (active ? ' active' : '') +
          '" data-league-filter="' + esc(chip.value) + '" aria-pressed="' + String(active) + '">' +
          esc(chip.label) + '</button>';
      }).join("");
  }
  function probabilityBand(value) {
    return value >= 65 ? "สูง" : value >= 40 ? "กลาง" : "ต่ำ";
  }
  function renderAnalysisSummary(match,analysis) {
    if (!analysis) return "";
    if (!analysis.probabilities) {
      const line = analysis.handicap?.status === "ready"
        ? '<div class="mc-analysis-handicap">เส้นอ้างอิงเจ้าบ้าน <b>' + esc(String(Number(analysis.handicap.line))) + '</b> · ยังไม่มีข้อมูลสถิติพอคำนวณเปอร์เซ็นต์</div>'
        : '<div class="mc-analysis-handicap">ยังไม่มีข้อมูลสถิติพอคำนวณความน่าจะเป็น</div>';
      return '<section class="mc-analysis-summary"><div class="mc-analysis-title">คาดการณ์ก่อนแข่ง</div>' + line + '</section>';
    }
    const p=analysis.probabilities;
    const outcome=(label,value)=>'<div class="mc-analysis-outcome"><span>'+label+'</span><b>'+Number(value).toFixed(1)+'%</b><small>'+probabilityBand(Number(value))+'</small></div>';
    const h=analysis.handicap||{};
    let handicapMarkup="";
    if(h.status==="ready"&&Number.isFinite(Number(h.winSide))){
      const line=Number(h.line),lineLabel=(line>0?"+":"")+String(Number(line.toFixed(2)));
      handicapMarkup='<div class="mc-analysis-handicap"><div><span>Asian Handicap · เจ้าบ้าน</span><b>'+esc(lineLabel)+'</b></div><div class="mc-analysis-cover"><b>'+Number(h.winSide).toFixed(1)+'%</b><small>'+probabilityBand(Number(h.winSide))+' · โอกาสฝั่งเจ้าบ้านผ่าน</small></div><span class="mc-analysis-push">คืนทุน '+Number(h.push||0).toFixed(1)+'%</span></div>';
    }else if(h.status==="stale"){
      handicapMarkup='<div class="mc-analysis-handicap mc-analysis-muted">ข้อมูล Handicap เกิน 24 ชม. · งดคำนวณ</div>';
    }else if(h.status==="missing"){
      handicapMarkup='<div class="mc-analysis-handicap mc-analysis-muted">ยังไม่มีเส้น Handicap อ้างอิงจาก API</div>';
    }else{
      handicapMarkup='<div class="mc-analysis-handicap mc-analysis-muted">เส้น Handicap ยังไม่พร้อมคำนวณ</div>';
    }
    return '<section class="mc-analysis-summary"><div class="mc-analysis-title">คาดการณ์ก่อนแข่ง</div><div class="mc-analysis-1x2">'+outcome("เจ้าบ้าน",p.home)+outcome("เสมอ",p.draw)+outcome("ทีมเยือน",p.away)+'</div>'+handicapMarkup+'<div class="mc-analysis-source">ความน่าจะเป็นจากโมเดล Football Time · เส้นอ้างอิงจาก The Odds API</div></section>';
  }
  function renderMatchStats(match) {
    const stats = match?.statistics || match?.stats || null;
    if (!stats || typeof stats !== "object") return "";
    const definitions = [
      ["ครองบอล", ["possession", "ballPossession"], "%"],
      ["ยิงทั้งหมด", ["shots", "totalShots"], ""],
      ["ยิงเข้ากรอบ", ["shotsOnTarget", "shots_on_target"], ""],
      ["เตะมุม", ["corners", "cornerKicks"], ""]
    ];
    const readPair = (value) => {
      if (Array.isArray(value) && value.length >= 2) return [value[0], value[1]];
      if (value && typeof value === "object") {
        const home = value.home ?? value.homeTeam ?? value.host;
        const away = value.away ?? value.awayTeam ?? value.guest;
        if (home !== undefined && away !== undefined) return [home, away];
      }
      return null;
    };
    const rows = definitions.map(([label, keys, suffix]) => {
      const key = keys.find((candidate) => stats[candidate] !== undefined);
      if (!key) return "";
      const pair = readPair(stats[key]);
      if (!pair || pair.some((value) => value === null || value === "" || !Number.isFinite(Number(value)))) return "";
      return '<div class="mc-match-stat"><span>' + label + '</span><b>' +
        esc(String(pair[0]) + suffix) + '</b><i aria-hidden="true"></i><b>' +
        esc(String(pair[1]) + suffix) + '</b></div>';
    }).filter(Boolean);
    if (!rows.length) return "";
    return '<section class="mc-match-stats" aria-label="สถิติการแข่งขัน"><div class="mc-match-stats-heading">สถิติการแข่งขัน</div><div class="mc-match-stats-grid">' +
      rows.join("") + '</div></section>';
  }

  function renderCard(match) {
    const home = teamFor(match.homeTeamId);
    const away = teamFor(match.awayTeamId);
    const kind = statusKind(match);
    const scoreReady = match.homeScore !== null && match.homeScore !== undefined &&
      match.awayScore !== null && match.awayScore !== undefined &&
      (kind === "finished" || kind === "live");
    const score = scoreReady ? esc(match.homeScore) + " - " + esc(match.awayScore) : "VS";
    const league = (database?.leagues || []).find((item) => item.id === match.leagueId);
    const time = match.utcDate ? formatThaiTime(match.utcDate) : "ไม่ประกาศเวลา";
    const providerMatchId = match.providerMatchId == null ? "" : String(match.providerMatchId);
    const analysisStatus = ["SCHEDULED","TIMED"].includes(String(match.status || "").toUpperCase());
    const canOpenAnalysis = kind === "upcoming" && analysisStatus &&
      Number.isFinite(new Date(match.utcDate).getTime()) &&
      new Date(match.utcDate).getTime() > Date.now() && providerMatchId !== "";
    const actionLabel = canOpenAnalysis ? "วิเคราะห์คู่นี้" : "ดูรายละเอียดข้อมูล";
    const cardAnalysis = canOpenAnalysis ? window.FootballTimeAppContext?.getMatchCardAnalysis?.(match) : null;
    const homeMark = crest(home);
    const awayMark = crest(away);
    const topLabel = league?.name || match.leagueId;
    const bottom = '<button type="button" class="mc-open-match" data-unified-match="' + esc(matchId(match)) + '" data-match-date="' + esc(String(match.utcDate || "").slice(0,10)) +
        '" data-match-league="' + esc(match.leagueId) +
        '" data-provider-match-id="' + esc(providerMatchId) +
        '" data-match-action="' + (canOpenAnalysis ? "analysis" : "overview") + '">' + actionLabel + '</button>';
    return '<article class="mc-match-card">' +
      '<div class="mc-match-top"><span class="mc-league-name">' + esc(topLabel) + '</span>' +
      '<span class="mc-status mc-status-' + kind + '">' + esc(statusLabel(match)) + '</span></div>' +
      '<div class="mc-match-main">' +
      '<div class="mc-team">' + homeMark + '<span>' + esc(match.homeTeamName || home?.name || "เจ้าบ้าน") + '</span></div>' +
      '<div class="mc-score">' + score + '</div>' +
      '<div class="mc-team mc-team-away">' + awayMark + '<span>' + esc(match.awayTeamName || away?.name || "ทีมเยือน") + '</span></div>' +
      '</div>' + renderAnalysisSummary(match,cardAnalysis) +
      '<div class="mc-match-bottom"><span>' + esc(time) + '</span><span>' +
      esc(statusLabel(match)) +
      '</span>' + bottom + '</div></article>';
  }
  function render() {
    const root = $("matchCenterMatches");
    const count = $("matchCenterCount");
    const state = $("matchCenterDataState");
    if (!root || !count || !state) return;
    if (!database) {
      count.textContent = "—";
      state.textContent = databaseError || "กำลังโหลดข้อมูลการแข่งขัน…";
      root.innerHTML = databaseError
        ? '<div class="mc-empty"><b>ไม่สามารถโหลดฐานข้อมูลการแข่งขันได้</b><span>' + esc(databaseError) + '</span></div>'
        : '<div class="mc-empty">กำลังโหลดข้อมูลการแข่งขัน…</div>';
      return;
    }
    renderCalendar();
    const rows = filteredMatches();
    count.textContent = rows.length + " นัด";
    const sourceTime = database?.source?.lastSuccessfulSync || database?.generatedAt;
    const leagueSync = database?.source?.leagueSync || {};
    const freshness = ["PL","PD","BL1","SA","FL1","ELC"].map((code) => {
      const row = leagueSync[code];
      const label = row?.status === "fresh" ? "ใหม่" : row?.status === "stale" ? "ข้อมูลเดิม" : "ไม่ทราบ";
      return code + ": " + label;
    }).join(" · ");
    const delivery = window.FootballTimeAppContext?.getDataDelivery?.();
    const deliveryLabel = delivery === "cache" ? "แหล่งส่งข้อมูล: แคช" :
      delivery === "network" ? "แหล่งส่งข้อมูล: เครือข่าย" : "แหล่งส่งข้อมูล: ไม่ทราบ";
    state.textContent = database
      ? "แหล่งข้อมูล: " + (database.source?.provider || "ไม่ระบุ") +
        " · ซิงก์ล่าสุด " + formatUpdated(sourceTime) +
        " · " + deliveryLabel + " · ความสดรายลีก " + freshness
      : "ฐานข้อมูล 5 ลีกใหญ่ไม่พร้อม";
    if (!rows.length) {
      root.innerHTML = '<div class="mc-empty"><b>ไม่พบการแข่งขันในตัวกรองนี้</b><span>ไม่มีข้อมูลที่ตรงกับช่วงเวลา ลีก หรือสถานะที่เลือก · ระบบจะไม่ใช้โปรแกรมทดลองแทนข้อมูลจริง</span></div>';
      return;
    }
    const groups = new Map();
    rows.forEach((match) => {
      const key = match.utcDate ? matchDate(match) : "unknown";
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(match);
    });
    root.innerHTML = [...groups.entries()].map(([date,matches]) => {
      const heading = date.startsWith("source-date:")
        ? "วันที่ตามประกาศต้นทาง · " + formatThaiDate(date.slice("source-date:".length))
        : date === "unknown" ? "ไม่ระบุวันแข่งขัน" : formatThaiDate(date);
      return '<section class="mc-day-group"><h3>' + esc(heading) +
      '<span>' + matches.length + ' นัด</span></h3><div class="mc-day-matches">' +
      matches.map(renderCard).join("") + '</div></section>';
    }).join("");
  }
  function renderLeagues() { renderLeagueFilters(); renderCalendar(); }
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
    const route = button.dataset.matchAction === "analysis" ? "analyze" : "leagues";
    const primaryRoute = document.querySelector('[data-primary-route="' + route + '"]');
    if (primaryRoute) primaryRoute.click();
    else document.querySelector('[data-page="fixtures"]')?.click();
    const providerMatchId = button.dataset.providerMatchId || "";
    if (button.dataset.matchAction === "analysis" && providerMatchId) {
      document.querySelector('[data-db-tab="probability"]')?.click();
      const leagueSelect = $("probLeagueSelect");
      const matchSelect = $("probMatchSelect");
      if (leagueSelect && matchSelect) {
        leagueSelect.value = button.dataset.matchLeague || "";
        leagueSelect.dispatchEvent(new Event("change",{bubbles:true}));
        const hasMatch = [...matchSelect.options].some((option) => option.value === providerMatchId);
        if (hasMatch) {
          matchSelect.value = providerMatchId;
          matchSelect.dispatchEvent(new Event("change",{bubbles:true}));
          $("probabilityOutput")?.scrollIntoView({behavior:"smooth",block:"start"});
          return;
        }
      }
    }
    document.querySelector('[data-db-tab="overview"]')?.click();
    const from = $("discoveryDateFrom"), to = $("discoveryDateTo"), league = $("discoveryDateLeague");
    if (from) { from.value = button.dataset.matchDate || ""; from.dispatchEvent(new Event("input",{bubbles:true})); }
    if (to) { to.value = button.dataset.matchDate || ""; to.dispatchEvent(new Event("input",{bubbles:true})); }
    if (league) { league.value = button.dataset.matchLeague || "ALL"; league.dispatchEvent(new Event("change",{bubbles:true})); }
    $("discoveryDateCard")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function mount() {
    selectedDate = bangkokDate();
    calendarAnchorDate = selectedDate;
    document.querySelectorAll("[data-match-filter]").forEach((button) =>
      button.addEventListener("click",() => setFilter(button.dataset.matchFilter))
    );
    $("matchCenterDate")?.addEventListener("change",(event) => setSelectedDate(event.target.value));
    $("matchCenterDateStrip")?.addEventListener("click",(event) => {
      const button = event.target.closest("[data-calendar-date]");
      if (button) setSelectedDate(button.dataset.calendarDate);
    });
    document.querySelectorAll("[data-calendar-shift]").forEach((button) =>
      button.addEventListener("click",() => {
        const days = Number(button.dataset.calendarShift || 0);
        selectedDate = shiftDateKey(selectedDate,days);
        calendarAnchorDate = shiftDateKey(calendarAnchorDate,days);
        renderCalendar(); render();
      })
    );
    $(".mc-calendar-today")?.addEventListener("click",() => setSelectedDate(bangkokDate()));
    $(".mc-calendar-yesterday")?.addEventListener("click",() => setSelectedDate(shiftDateKey(bangkokDate(),-1)));
    $("matchCenterLeagueFilters")?.addEventListener("click",(event) => {
      const button = event.target.closest("[data-league-filter]");
      if (!button) return;
      const value = button.dataset.leagueFilter;
      if (value === "ALL") activeLeagues.clear();
      else if (activeLeagues.has(value)) activeLeagues.delete(value);
      else activeLeagues.add(value);
      renderLeagueFilters(); renderCalendar(); render();
    });
    $("matchCenterSearch")?.addEventListener("input",(event) => {
      activeSearch = String(event.target.value || "").trim();
      renderCalendar(); render();
    });
    $("matchCenterMatches")?.addEventListener("click",(event) => {
      const button = event.target.closest("[data-unified-match]");
      if (button) openInDatabase(button);
    });
    const existing = window.FootballTimeAppContext?.getDatabase?.();
    if (existing) setDatabase(existing);
    else { renderCalendar(); render(); }
    loadInternationalData();
  }
  function mergeInternationalData(data) {
    if (!data || !Array.isArray(data.matches) || !Array.isArray(data.teams) || !Array.isArray(data.leagues)) return data;
    const merged = {
      ...data,
      leagues: [...(data.leagues || [])],
      teams: [...(data.teams || [])],
      matches: [...(data.matches || [])]
    };
    const addUnique = (target, incoming, key) => {
      const ids = new Set(target.map((row) => String(row?.[key])));
      incoming.forEach((row) => {
        const id = String(row?.[key] ?? "");
        if (id && !ids.has(id)) { target.push(row); ids.add(id); }
      });
    };
    addUnique(merged.leagues, internationalData.leagues || [], "id");
    addUnique(merged.teams, internationalData.teams || [], "id");
    addUnique(merged.matches, internationalData.matches || [], "id");
    return merged;
  }
  async function loadInternationalData() {
    try {
      const response = await fetch(INTERNATIONAL_DATA_URL, {cache:"no-store"});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (payload.schemaVersion !== 1 || !Array.isArray(payload.matches) ||
          !Array.isArray(payload.teams) || !Array.isArray(payload.leagues) ||
          payload.matches.some((match) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(match.id || "")))) {
        throw new Error("รูปแบบข้อมูลแมตช์ทีมชาติไม่ถูกต้อง");
      }
      internationalData = payload;
      if (baseDatabase) setDatabase(baseDatabase);
    } catch (error) {
      console.error("International match data load failed", error);
    }
  }
  function setDatabase(data) {
    baseDatabase = data && Array.isArray(data.matches) ? data : null;
    database = baseDatabase ? mergeInternationalData(baseDatabase) : null;
    databaseError = "";
    renderLeagues();
    render();
    window.dispatchEvent(new CustomEvent("pft-match-center-data-ready"));
  }
  window.FootballTimeMatchCenter = {
    getMatchById(id) {
      return (database?.matches || []).find((match) => matchId(match) === String(id)) || null;
    },
    getCompetitionName(match) {
      return (database?.leagues || []).find((league) => String(league.id) === String(match?.leagueId))?.name || match?.leagueId || "ไม่ระบุรายการ";
    },
    getTeamName(id) { return teamFor(id)?.name || ""; },
    getTodaySummary() {
      const today = bangkokDate();
      const matches = (database?.matches || [])
        .filter((match) => CORE_LEAGUES.has(String(match.leagueId)) && matchDateKey(match) === today && statusKind(match) !== "other");
      const summary = {live:0,upcoming:0,finished:0,total:matches.length};
      matches.forEach((match) => {
        const kind = statusKind(match);
        if (kind === "live") summary.live++;
        else if (kind === "finished") summary.finished++;
        else summary.upcoming++;
      });
      return database ? summary : null;
    }
  };
  window.addEventListener("pft-football-database-error",(event) => {
    database = null;
    databaseError = String(event.detail?.message || "ไม่ทราบสาเหตุ");
    render();
  });
  window.addEventListener("pft-handicap-reference-ready",render);
  window.addEventListener("pft-football-database-ready",() => {
    setDatabase(window.FootballTimeAppContext?.getDatabase?.() || null);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();