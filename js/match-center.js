"use strict";
(() => {
  const CORE_LEAGUES = new Set(["PL","PD","BL1","SA","FL1"]);
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  let database = null;
  let databaseError = "";
  let activeFilter = "all";
  let activeLeagues = new Set();
  let activeCategory = "all";
  let activeSearch = "";
  let selectedDate = "";
  let calendarAnchorDate = "";
  let internationalFixtures = [];
  let internationalFixtureReference = [];
  let internationalLoadState = "กำลังโหลดโปรแกรมทีมชาติชุดทดลอง";
  let internationalLoadError = "";
  let internationalHandicapSnapshots = new Map();
  let internationalHandicapLoadState = "กำลังโหลดผลวิเคราะห์ทีมชาติ";
  let internationalHandicapLoadError = "";
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
  const MANUAL_RESEARCH_STORAGE_KEY = "pft_manual_match_research_2026_27_v1";
  function loadManualResearchRecords() {
    try {
      const stored = JSON.parse(localStorage.getItem(MANUAL_RESEARCH_STORAGE_KEY) || "null");
      return Array.isArray(stored?.records) ? stored.records : [];
    } catch (_) {
      return [];
    }
  }
  function applyManualResearchResults() {
    const records = new Map(loadManualResearchRecords()
      .filter((record) => record?.competition_code === "UNL" && record?.fixture_ref?.international_fixture_id)
      .map((record) => [String(record.fixture_ref.international_fixture_id),record]));
    internationalFixtures = internationalFixtureReference.map((fixture) =>
      toInternationalMatch(fixture,records.get(String(fixture.id)) || null)
    );
  }
  function toInternationalMatch(fixture, researchRecord = null) {
    const score = researchRecord?.score || null;
    return {
      id:fixture.id,isInternational:true,utcDate:fixture.kickoff_utc,localDate:fixture.local_date,
      homeTeamName:fixture.home_team,awayTeamName:fixture.away_team,
      homeCountryCode:fixture.home_country_code,awayCountryCode:fixture.away_country_code,
      homeScore:Number.isInteger(score?.home) ? score.home : null,
      awayScore:Number.isInteger(score?.away) ? score.away : null,
      status:String(researchRecord?.match_status || fixture.match_status || "scheduled").toUpperCase(),
      leagueId:"INTL",competitionName:fixture.competition,neutralVenue:fixture.neutral_venue,
      dataStatus:fixture.data_status,sourceNames:fixture.source_names || [],sourceUrls:fixture.source_urls || [],
      researchRecord
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
      internationalFixtureReference = payload.fixtures.filter((fixture) =>
        fixture.id && fixture.home_team && fixture.away_team && fixture.home_country_code &&
        fixture.away_country_code && fixture.local_date
      );
      applyManualResearchResults();
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


  async function loadInternationalHandicapSnapshots() {
    try {
      const response = await fetch("./data/international-handicap-snapshots-r1.json");
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (payload.dataset_status !== "experimental_isolated_pre_match_handicap_snapshots" ||
          !Array.isArray(payload.snapshots)) throw new Error("รูปแบบ Snapshot Handicap ทีมชาติไม่ถูกต้อง");
      internationalHandicapSnapshots = new Map(payload.snapshots.filter((snapshot) => {
        const kickoff = Date.parse(snapshot.kickoff_utc || "");
        const captured = Date.parse(snapshot.captured_at || "");
        return snapshot.fixture_id && snapshot.captured_before_kickoff === true &&
          snapshot.model_version === "intl-r1-handicap-0.1.0" &&
          Number.isFinite(kickoff) && Number.isFinite(captured) && captured < kickoff;
      }).map((snapshot) => [String(snapshot.fixture_id),snapshot]));
      internationalHandicapLoadState = "Snapshot วิเคราะห์ทีมชาติ " + internationalHandicapSnapshots.size + " นัด";
    } catch (error) {
      internationalHandicapSnapshots = new Map();
      internationalHandicapLoadState = "ยังโหลด Snapshot วิเคราะห์ทีมชาติไม่ได้";
      internationalHandicapLoadError = String(error?.message || error);
    }
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
    return Number.isNaN(date.getTime()) ? "" : bangkokDate(date);
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
  function matchDateKey(match) {
    return match.utcDate ? matchDate(match) :
      (match.isInternational && match.localDate ? String(match.localDate) : "");
  }
  function leagueFilterValues(match) {
    if (match.isInternational) return ["INTL","COMP:" + String(match.competitionName || "")];
    return [String(match.leagueId || "")];
  }
  function matchesForFilters() {
    const now = Date.now();
    const today = bangkokDate();
    const clubMatches = (database?.matches || []).filter((match) => CORE_LEAGUES.has(String(match.leagueId)));
    return [...clubMatches,...internationalFixtures].filter((match) => {
      const isInternational = match.isInternational === true;
      if (activeCategory === "club" && isInternational) return false;
      if (activeCategory === "international" && !isInternational) return false;
      if (activeLeagues.size && !leagueFilterValues(match).some((value) => activeLeagues.has(value))) return false;
      if (activeSearch) {
        const query = activeSearch.toLocaleLowerCase();
        if (![match.homeTeamName,match.awayTeamName].join(" ").toLocaleLowerCase().includes(query)) return false;
      }
      const kind = statusKind(match);
      const kickoff = new Date(match.utcDate).getTime();
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
    const chips = [
      ...leagues.map((league) => ({value:String(league.id),label:league.name})),
      {value:"INTL",label:"ทีมชาติทั้งหมด"},
      ...[...new Set(internationalFixtures.map((match) => String(match.competitionName || "")).filter(Boolean))]
        .map((name) => ({value:"COMP:" + name,label:name === "International friendly" ? "กระชับมิตร" : name}))
    ];
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
  function renderInternationalAnalysisSummary(match) {
    const snapshot = internationalHandicapSnapshots.get(String(match.id || ""));
    if (!snapshot) {
      return '<section class="mc-intl-analysis"><div class="mc-intl-analysis-title">International Match Analysis</div>' +
        '<div class="mc-intl-no-model">ยังไม่มี Snapshot ก่อนแข่งขันที่ตรวจสอบเวลาได้ · จึงไม่แสดงเปอร์เซ็นต์ย้อนหลัง</div>' +
        '<div class="mc-intl-disclaimer">ข้อมูลทีมชาติทดลองแยกจากโมเดลสโมสร · ไม่สร้างเส้น Handicap หรือผลคาดการณ์ขึ้นเอง</div></section>';
    }
    const p = snapshot.probabilities_1x2 || {};
    const pct = (value) => (Number(value) * 100).toFixed(1) + "%";
    const kpi = (label,value) => '<div class="mc-intl-kpi"><span>' + label + '</span><b>' + pct(value) + '</b></div>';
    const line = (snapshot.handicap_lines || []).find((row) => Number(row.home_line) === Number(snapshot.default_home_line));
    if (!line) return '<section class="mc-intl-analysis"><div class="mc-intl-no-model">Snapshot Handicap ไม่ครบถ้วน · งดแสดงผล</div></section>';
    const hp = line.probabilities || {};
    const outcomeLabels = [["full_win","เต็มชนะ"],["half_win","ครึ่งชนะ"],["push","คืนทุน"],["half_loss","ครึ่งแพ้"],["full_loss","แพ้เต็ม"]];
    const outcomeMarkup = outcomeLabels.map(([key,label]) =>
      '<div class="mc-intl-outcome"><span>' + label + '</span><b>' + pct(hp[key]) + '</b></div>'
    ).join("");
    const lineLabel = (value) => (Number(value) > 0 ? "+" : "") + Number(value).toFixed(2);
    const rows = (snapshot.handicap_lines || []).map((row) => {
      const values = row.probabilities || {};
      return '<tr><td>' + lineLabel(row.home_line) + '</td>' +
        outcomeLabels.map(([key]) => '<td>' + pct(values[key]) + '</td>').join("") + '</tr>';
    }).join("");
    return '<section class="mc-intl-analysis"><div class="mc-intl-analysis-title">International Match Analysis · โมเดลทดลอง</div>' +
      '<div class="mc-intl-1x2">' + kpi("เจ้าบ้าน",p.home_win) + kpi("เสมอ",p.draw) + kpi("ทีมเยือน",p.away_win) + '</div>' +
      '<div class="mc-intl-handicap"><span>Handicap จำลอง · เจ้าบ้าน <strong>' + lineLabel(snapshot.default_home_line) + '</strong></span>' +
      '<span>ฝั่งชนะรวม <strong>' + pct(Number(hp.full_win || 0) + Number(hp.half_win || 0)) + '</strong> · คืนทุน <strong>' + pct(hp.push) + '</strong></span></div>' +
      '<div class="mc-intl-outcome-grid">' + outcomeMarkup + '</div>' +
      '<details class="mc-intl-model-details"><summary>ดูความน่าจะเป็น Handicap ทุกเส้นทดลอง</summary>' +
      '<div style="overflow-x:auto"><table class="mc-intl-line-table"><thead><tr><th>เส้นเจ้าบ้าน</th><th>เต็มชนะ</th><th>ครึ่งชนะ</th><th>คืนทุน</th><th>ครึ่งแพ้</th><th>แพ้เต็ม</th></tr></thead><tbody>' + rows + '</tbody></table></div></details>' +
      '<div class="mc-intl-disclaimer">คำนวณจาก Score Matrix · เส้นจำลอง ไม่ใช่เส้นตลาดหรือราคาเดิมพัน · ข้อมูลย้อนหลังถึง 6 ต.ค. 2026 · แยกจากฐานข้อมูลและโมเดลสโมสร</div></section>';
  }

  function renderInternationalDetails(match) {
    const sources = (match.sourceUrls || []).map((url,index) =>
      '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
      esc((match.sourceNames || [])[index] || "แหล่งข้อมูลโปรแกรม") + '</a>'
    ).join(" · ");
    const record = match.researchRecord;
    const researchSources = (record?.sources || []).map((source) =>
      '<a href="' + esc(source.url) + '" target="_blank" rel="noopener noreferrer">' +
      esc(source.name || "แหล่งข้อมูลผลการแข่งขัน") + '</a>'
    ).join(" · ");
    const eventLabels = {goal:"ประตู",assist:"แอสซิสต์",yellow_card:"ใบเหลือง",red_card:"ใบแดง",own_goal:"ทำเข้าประตูตัวเอง",penalty_goal:"จุดโทษ"};
    const events = (record?.events || []).slice().sort((a,b) => Number(a.minute ?? 999)-Number(b.minute ?? 999));
    const eventMarkup = events.length
      ? '<div class="mc-research-events"><b>เหตุการณ์การแข่งขัน</b>' + events.map((item) => {
          const minute = item.minute !== undefined && item.minute !== null ? esc(item.minute) + "'" : "ไม่ระบุนาที";
          const player = item.player?.name || "ไม่ระบุผู้เล่น";
          const team = item.team || "";
          return '<div class="mc-research-event"><span>' + minute + '</span><span>' +
            esc(eventLabels[item.type] || item.type || "เหตุการณ์") + '</span><b>' +
            esc(player) + '</b><small>' + esc(team) + '</small></div>';
        }).join("") + '</div>'
      : '<p class="mc-research-muted">ยังไม่มีข้อมูลเหตุการณ์ที่นำเข้า</p>';
    const verification = record?.verification_status === "verified" ? "ตรวจสอบแล้ว" :
      record?.verification_status === "unverified" ? "ยังไม่ยืนยัน" : "รอตรวจสอบ";
    const rightsPending = (record?.sources || []).some((source) => source.reuse_rights === "pending");
    const venue = match.neutralVenue === true ? "สนามกลาง" :
      match.neutralVenue === false ? "ระบุเจ้าบ้านตามประกาศ" : "ยังไม่ยืนยันสนาม";
    const timeNote = match.utcDate ? "เวลาไทย " + formatThaiTime(match.utcDate) :
      "ยังไม่ประกาศเวลาแข่งขัน · แสดงวันที่ตามประกาศต้นทาง";
    const resultMarkup = record
      ? '<section class="mc-research-result"><div class="mc-research-heading">ผลการแข่งขันที่นำเข้าในเครื่อง <span class="mc-research-status">' + esc(verification) + '</span></div>' +
        '<div class="mc-research-score">' + esc(record.score?.home ?? "—") + ' – ' + esc(record.score?.away ?? "—") + '</div>' +
        eventMarkup + '<div class="mc-intl-source">แหล่งข้อมูลผลการแข่งขัน: ' + (researchSources || "ไม่ระบุ") + '</div>' +
        (rightsPending ? '<p class="mc-research-muted">สิทธิ์การนำข้อมูลต้นทางไปใช้ซ้ำยังรอยืนยัน · แสดงเป็นข้อมูลทดลองเฉพาะอุปกรณ์นี้</p>' : '') +
        '</section>'
      : '<p class="mc-research-muted">ยังไม่มีผลการแข่งขันที่นำเข้าในอุปกรณ์นี้</p>';
    return '<details class="mc-intl-details"><summary>' + (record ? "ดูรายละเอียดผลการแข่งขัน" : "รายละเอียดโปรแกรมทีมชาติ") + '</summary>' +
      '<div>รายการ: ' + esc(match.competitionName) + '</div><div>' + esc(venue) + '</div>' +
      '<div>' + esc(timeNote) + '</div>' + resultMarkup +
      '<div class="mc-intl-source">แหล่งข้อมูลโปรแกรม: ' + (sources || "ไม่ระบุ") + '</div>' +
      '<p>ข้อมูลวิจัยที่นำเข้าจะอ่านจาก Local Storage ของอุปกรณ์นี้เท่านั้น · ไม่เขียนลงฐานข้อมูลหลักหรือ Supabase</p></details>';
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
      '</div>' + (isInternational ? renderInternationalAnalysisSummary(match) : renderAnalysisSummary(match,cardAnalysis)) +
      '<div class="mc-match-bottom"><span>' + esc(time) + '</span><span>' +
      (isInternational && match.neutralVenue === true ? 'สนามกลาง' : esc(statusLabel(match))) +
      '</span>' + bottom + '</div></article>';
  }
  function render() {
    const root = $("matchCenterMatches");
    const count = $("matchCenterCount");
    const state = $("matchCenterDataState");
    if (!root || !count || !state) return;
    if (!database && !internationalFixtures.length) {
      count.textContent = "—";
      state.textContent = databaseError || internationalLoadState;
      root.innerHTML = databaseError
        ? '<div class="mc-empty"><b>ไม่สามารถโหลดฐานข้อมูลการแข่งขันได้</b><span>' + esc(databaseError) + ' · ' + esc(internationalLoadError || internationalLoadState) + '</span></div>'
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
    state.textContent = (database
      ? "แหล่งข้อมูลสโมสร: " + (database.source?.provider || "ไม่ระบุ") +
        " · ซิงก์ล่าสุด " + formatUpdated(sourceTime) +
        " · " + deliveryLabel + " · ความสดรายลีก " + freshness
      : "ฐานข้อมูลสโมสรไม่พร้อม · แสดงเฉพาะโปรแกรมทีมชาติชุดทดลอง") +
      " · " + internationalLoadState + " (แยกจากฐานข้อมูลสโมสร)";
    if (!rows.length) {
      root.innerHTML = '<div class="mc-empty"><b>ไม่พบการแข่งขันในตัวกรองนี้</b><span>ไม่มีข้อมูลที่ตรงกับช่วงเวลา ลีก หรือสถานะที่เลือก · ระบบจะไม่ใช้โปรแกรมทดลองแทนข้อมูลจริง</span></div>';
      return;
    }
    const groups = new Map();
    rows.forEach((match) => {
      const key = match.utcDate ? matchDate(match) :
        (match.isInternational && match.localDate ? "source-date:" + match.localDate : "unknown");
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
    document.querySelectorAll("[data-match-category]").forEach((button) =>
      button.addEventListener("click",() => {
        activeCategory = button.dataset.matchCategory || "all";
        document.querySelectorAll("[data-match-category]").forEach((item) => {
          const active = item.dataset.matchCategory === activeCategory;
          item.classList.toggle("active",active);
          item.setAttribute("aria-pressed",String(active));
        });
        renderLeagueFilters(); renderCalendar(); render();
      })
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
      const button = event.target.closest("[data-open-match]");
      if (button) openInDatabase(button);
    });
    window.addEventListener("pft-manual-match-research-updated",() => {
      applyManualResearchResults();
      renderLeagues();
      render();
    });
    const existing = window.FootballTimeAppContext?.getDatabase?.();
    if (existing) setDatabase(existing);
    else { renderCalendar(); render(); }
    loadInternationalFixtures();
    loadInternationalHandicapSnapshots();
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