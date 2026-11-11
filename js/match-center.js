"use strict";
(() => {
  const CORE_LEAGUES = new Set(["PL","PD","BL1","SA","FL1"]);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  let database = null;
  let databaseError = "";
  let activeFilter = "upcoming";
  let activeLeague = "ALL";
  let activeSearch = "";
  let internationalFixtures = [];
  let internationalLoadState = "กำลังโหลดโปรแกรมทีมชาติชุดทดลอง";
  let internationalLoadError = "";
  const COUNTRY_NAMES = {
    "Türkiye":"ตุรกี","Belgium":"เบลเยียม","Italy":"อิตาลี","France":"ฝรั่งเศส","Czechia":"เช็กเกีย",
    "Spain":"สเปน","England":"อังกฤษ","Croatia":"โครเอเชีย","Netherlands":"เนเธอร์แลนด์","Greece":"กรีซ",
    "Serbia":"เซอร์เบีย","Germany":"เยอรมนี","Norway":"นอร์เวย์","Wales":"เวลส์","Portugal":"โปรตุเกส",
    "Denmark":"เดนมาร์ก","Argentina":"อาร์เจนตินา","Uruguay":"อุรุกวัย","Saudi Arabia":"ซาอุดีอาระเบีย",
    "South Korea":"เกาหลีใต้","Qatar":"กาตาร์","Australia":"ออสเตรเลีย","Japan":"ญี่ปุ่น","Brazil":"บราซิล","Singapore":"สิงคโปร์"
  };
  function countryFlag(code) {
    if (code === "GB-ENG" || code === "GB-WLS") {
      const suffix = code === "GB-ENG" ? "eng" : "wls";
      return String.fromCodePoint(0x1F3F4,...[...suffix].map((char) => 0xE0000 + char.charCodeAt(0)),0xE007F);
    }
    return [...String(code || "").slice(0,2).toUpperCase()]
      .map((char) => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65)).join("");
  }
  function internationalTeamFlag(name, code) {
    const label = COUNTRY_NAMES[name] || name || "ทีมชาติ";
    return '<span class="mc-flag" role="img" aria-label="ธงชาติ' + esc(label) + '"><span aria-hidden="true">' +
      esc(countryFlag(code)) + '</span><small>' + esc(code) + '</small></span>';
  }
  function toInternationalMatch(fixture) {
    return {
      id:fixture.id,isInternational:true,utcDate:fixture.kickoff_utc,localDate:fixture.local_date,
      homeTeamName:fixture.home_team,awayTeamName:fixture.away_team,
      homeCountryCode:fixture.home_country_code,awayCountryCode:fixture.away_country_code,
      homeScore:null,awayScore:null,status:String(fixture.match_status || "scheduled").toUpperCase(),
      leagueId:"INTL",competitionName:fixture.competition,neutralVenue:fixture.neutral_venue,
      dataStatus:fixture.data_status,sourceNames:fixture.source_names || [],sourceUrls:fixture.source_urls || []
    };
  }
  async function loadInternationalFixtures() {
    try {
      const response = await fetch("./data/international-match-fixtures-r1.json");
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (payload.dataset_status !== "experimental_fixture_reference" || !Array.isArray(payload.fixtures)) {
        throw new Error("รูปแบบชุดข้อมูลไม่ถูกต้อง");
      }
      internationalFixtures = payload.fixtures.filter((fixture) =>
        fixture.id && fixture.home_team && fixture.away_team && fixture.home_country_code &&
        fixture.away_country_code && fixture.local_date
      ).map(toInternationalMatch);
      internationalLoadState = "โปรแกรมทีมชาติชุดทดลอง " + internationalFixtures.length + " นัด";
      internationalLoadError = "";
    } catch (error) {
      internationalFixtures = [];
      internationalLoadState = "ไม่สามารถโหลดโปรแกรมทีมชาติชุดทดลอง";
      internationalLoadError = String(error?.message || error);
    }
    renderLeagues();
    render();
  }


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
    if (!Number.isNaN(date.getTime())) return bangkokDate(date);
    return match.isInternational ? String(match.localDate || "") : "";
  }
  function matchSortTime(match) {
    const date = new Date(match.utcDate);
    if (!Number.isNaN(date.getTime())) return date.getTime();
    if (match.isInternational && match.localDate) return new Date(match.localDate + "T23:59:59+07:00").getTime();
    return Number.POSITIVE_INFINITY;
  }
  function teamFor(id) {
    return (database?.teams || []).find((team) => String(team.id) === String(id)) || null;
  }
  function crest(team, countryCode, countryName) {
    if (countryCode) return internationalTeamFlag(countryName, countryCode);
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
    const clubMatches = (database?.matches || []).filter((match) => CORE_LEAGUES.has(String(match.leagueId)));
    return [...clubMatches,...internationalFixtures].filter((match) => {
      const isInternational = match.isInternational === true;
      if (activeLeague === "INTL" && !isInternational) return false;
      if (activeLeague !== "ALL" && activeLeague !== "INTL" && match.leagueId !== activeLeague) return false;
      if (activeSearch) {
        const query = activeSearch.toLocaleLowerCase();
        if (![match.homeTeamName,match.awayTeamName].join(" ").toLocaleLowerCase().includes(query)) return false;
      }
      const kind = statusKind(match);
      const kickoff = new Date(match.utcDate).getTime();
      if (activeFilter === "today") return matchDate(match) === today;
      if (activeFilter === "upcoming") {
        if (kind !== "upcoming") return false;
        return Number.isFinite(kickoff) ? kickoff >= now : isInternational && String(match.localDate || "") >= today;
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
  function probabilityBand(value) {
    return value >= 65 ? "สูง" : value >= 40 ? "กลาง" : "ต่ำ";
  }
  function renderAnalysisSummary(match,analysis) {
    if (!analysis) return "";
    if (!analysis.probabilities) {
      const line = analysis.handicap?.status === "ready"
        ? '<div class="mc-analysis-handicap">เส้นอ้างอิงเจ้าบ้าน <b>' + esc(String(Number(analysis.handicap.line))) + '</b> · ยังไม่มีข้อมูลสถิติพอคำนวณเปอร์เซ็นต์</div>'
        : '<div class="mc-analysis-handicap">ยังไม่มีข้อมูลสถิติพอคำนวณความน่าจะเป็น</div>';
      return '<section class="mc-analysis-summary"><div class="mc-analysis-title">สรุปการวิเคราะห์ก่อนแข่ง</div>' + line + '</section>';
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
    return '<section class="mc-analysis-summary"><div class="mc-analysis-title">สรุปการวิเคราะห์ก่อนแข่ง</div><div class="mc-analysis-1x2">'+outcome("เจ้าบ้าน",p.home)+outcome("เสมอ",p.draw)+outcome("ทีมเยือน",p.away)+'</div>'+handicapMarkup+'<div class="mc-analysis-source">ความน่าจะเป็นจากโมเดล Football Time · เส้นอ้างอิงจาก The Odds API</div></section>';
  }
  function renderInternationalDetails(match) {
    const sources = (match.sourceUrls || []).map((url,index) =>
      '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
      esc((match.sourceNames || [])[index] || "แหล่งข้อมูลทางการ") + '</a>'
    ).join(" · ");
    const venue = match.neutralVenue === true ? "สนามกลาง" :
      match.neutralVenue === false ? "ระบุเจ้าบ้านตามประกาศ" : "ยังไม่ยืนยันสนาม";
    const timeNote = match.utcDate ? "เวลาไทย " + formatThaiTime(match.utcDate) :
      "ยังไม่ประกาศเวลาแข่งขัน · แสดงวันที่ตามประกาศต้นทาง";
    return '<details class="mc-intl-details"><summary>รายละเอียดโปรแกรมทีมชาติ</summary>' +
      '<div>รายการ: ' + esc(match.competitionName) + '</div><div>' + esc(venue) + '</div>' +
      '<div>' + esc(timeNote) + '</div><div class="mc-intl-source">แหล่งข้อมูล: ' + (sources || "ไม่ระบุ") + '</div>' +
      '<p>ชุดข้อมูลทดลองแบบอ่านอย่างเดียว · แยกจากฐานข้อมูลสโมสร · ยังไม่แสดงผลวิเคราะห์ทีมชาติ</p></details>';
  }
  function renderCard(match) {
    const isInternational = match.isInternational === true;
    const home = isInternational ? null : teamFor(match.homeTeamId);
    const away = isInternational ? null : teamFor(match.awayTeamId);
    const kind = statusKind(match);
    const scoreReady = match.homeScore !== null && match.homeScore !== undefined &&
      match.awayScore !== null && match.awayScore !== undefined &&
      (kind === "finished" || kind === "live");
    const score = scoreReady ? esc(match.homeScore) + " - " + esc(match.awayScore) : "VS";
    const league = (database?.leagues || []).find((item) => item.id === match.leagueId);
    const time = match.utcDate ? formatThaiTime(match.utcDate) : "ไม่ประกาศเวลา";
    const providerMatchId = match.providerMatchId == null ? "" : String(match.providerMatchId);
    const analysisStatus = ["SCHEDULED","TIMED"].includes(String(match.status || "").toUpperCase());
    const canOpenAnalysis = !isInternational && kind === "upcoming" && analysisStatus &&
      Number.isFinite(new Date(match.utcDate).getTime()) &&
      new Date(match.utcDate).getTime() > Date.now() && providerMatchId !== "";
    const actionLabel = canOpenAnalysis ? "วิเคราะห์คู่นี้" : "ดูรายละเอียดข้อมูล";
    const cardAnalysis = canOpenAnalysis ? window.FootballTimeAppContext?.getMatchCardAnalysis?.(match) : null;
    const homeMark = isInternational ? crest(null,match.homeCountryCode,match.homeTeamName) : crest(home);
    const awayMark = isInternational ? crest(null,match.awayCountryCode,match.awayTeamName) : crest(away);
    const topLabel = isInternational ? match.competitionName : (league?.name || match.leagueId);
    const bottom = isInternational
      ? '<span class="mc-intl-tag">ทีมชาติ · ชุดทดลอง</span>' + renderInternationalDetails(match)
      : '<button type="button" class="mc-open-match" data-open-match="' + esc(matchId(match)) +
        '" data-match-date="' + esc(String(match.utcDate || "").slice(0,10)) +
        '" data-match-league="' + esc(match.leagueId) +
        '" data-provider-match-id="' + esc(providerMatchId) +
        '" data-match-action="' + (canOpenAnalysis ? "analysis" : "overview") + '">' + actionLabel + '</button>';
    return '<article class="mc-match-card' + (isInternational ? ' mc-match-card-international' : '') + '">' +
      '<div class="mc-match-top"><span class="mc-league-name">' + esc(topLabel) + '</span>' +
      '<span class="mc-status mc-status-' + kind + '">' + esc(statusLabel(match)) + '</span></div>' +
      '<div class="mc-match-main">' +
      '<div class="mc-team">' + homeMark + '<span>' + esc(match.homeTeamName || home?.name || "เจ้าบ้าน") + '</span></div>' +
      '<div class="mc-score">' + score + '</div>' +
      '<div class="mc-team mc-team-away">' + awayMark + '<span>' + esc(match.awayTeamName || away?.name || "ทีมเยือน") + '</span></div>' +
      '</div>' + (isInternational ? '' : renderAnalysisSummary(match,cardAnalysis)) +
      '<div class="mc-match-bottom"><span>' + esc(time) + '</span><span>' +
      (isInternational && match.neutralVenue === true ? 'สนามกลาง' : esc(statusLabel(match))) +
      '</span>' + bottom + '</div></article>';
  }
  function render() {
    const root = $("matchCenterMatches");
    const count = $("matchCenterCount");
    const state = $("matchCenterDataState");
    if (!root || !count || !state) return;
    if (!database) {
      count.textContent = "—";
      state.textContent = databaseError || "กำลังรอฐานข้อมูลฟุตบอล";
      root.innerHTML = databaseError
        ? '<div class="mc-empty"><b>ไม่สามารถโหลดฐานข้อมูลการแข่งขันได้</b><span>' + esc(databaseError) + ' · ตรวจสอบการเชื่อมต่อแล้วลองใหม่ภายหลัง</span></div>'
        : '<div class="mc-empty">กำลังโหลดข้อมูลการแข่งขันจากฐานข้อมูลหลัก…</div>';
      return;
    }
    const rows = filteredMatches();
    count.textContent = rows.length + " นัด";
    const sourceTime = database.source?.lastSuccessfulSync || database.generatedAt;
    const leagueSync = database.source?.leagueSync || {};
    const freshness = ["PL","PD","BL1","SA","FL1","ELC"].map((code) => {
      const row = leagueSync[code];
      const label = row?.status === "fresh" ? "ใหม่" : row?.status === "stale" ? "ข้อมูลเดิม" : "ไม่ทราบ";
      return code + ": " + label;
    }).join(" · ");
    const delivery = window.FootballTimeAppContext?.getDataDelivery?.();
    const deliveryLabel = delivery === "cache" ? "แหล่งส่งข้อมูล: แคช" :
      delivery === "network" ? "แหล่งส่งข้อมูล: เครือข่าย" : "แหล่งส่งข้อมูล: ไม่ทราบ";
    state.textContent = "แหล่งข้อมูลสโมสร: " + (database.source?.provider || "ไม่ระบุ") +
      " · ซิงก์ล่าสุด " + formatUpdated(sourceTime) +
      " · " + deliveryLabel + " · ความสดรายลีก " + freshness +
      " · " + internationalLoadState + " (แยกจากฐานข้อมูลสโมสร)";
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
    select.innerHTML = '<option value="ALL">สโมสรและทีมชาติ</option>' +
      '<option value="INTL">ทีมชาติ · Nations League / กระชับมิตร</option>' +
      leagues.map((league) =>
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
    document.querySelectorAll("[data-match-filter]").forEach((button) =>
      button.addEventListener("click",() => setFilter(button.dataset.matchFilter))
    );
    $("matchCenterLeague")?.addEventListener("change",(event) => {
      activeLeague = event.target.value || "ALL";
      render();
    });
    $("matchCenterSearch")?.addEventListener("input",(event) => {
      activeSearch = String(event.target.value || "").trim();
      render();
    });
    $("matchCenterMatches")?.addEventListener("click",(event) => {
      const button = event.target.closest("[data-open-match]");
      if (button) openInDatabase(button);
    });
    const existing = window.FootballTimeAppContext?.getDatabase?.();
    if (existing) setDatabase(existing);
    else render();
    loadInternationalFixtures();
  }
  function setDatabase(data) {
    database = data && Array.isArray(data.matches) ? data : null;
    databaseError = "";
    renderLeagues();
    render();
  }
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