"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let selectedMatch = null;
  let activeTab = "overview";
  const detail = () => $("unifiedMatchDetail");
  const root = () => $("matchCenterMatches");
  const competition = (match) => window.FootballTimeMatchCenter?.getCompetitionName?.(match) || match.competitionName || match.leagueId || "ไม่ระบุรายการ";
  const homeName = (match) => match.homeTeamName || window.FootballTimeMatchCenter?.getTeamName?.(match.homeTeamId) || "เจ้าบ้าน";
  const awayName = (match) => match.awayTeamName || window.FootballTimeMatchCenter?.getTeamName?.(match.awayTeamId) || "ทีมเยือน";
  const score = (match) => match.homeScore == null || match.awayScore == null ? "VS" : String(match.homeScore) + " – " + String(match.awayScore);
  const dateTime = (match) => {
    if (!match.utcDate) return match.localDate ? "วันที่ตามประกาศ " + match.localDate : "ยังไม่ประกาศเวลา";
    const date = new Date(match.utcDate);
    return Number.isNaN(date.getTime()) ? "ไม่ระบุเวลา" : date.toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"medium",timeStyle:"short"});
  };
  const status = (match) => ({FINISHED:"จบการแข่งขัน",IN_PLAY:"กำลังแข่งขัน",LIVE:"กำลังแข่งขัน",PAUSED:"พักการแข่งขัน",HALFTIME:"พักครึ่ง",SCHEDULED:"รอแข่งขัน",TIMED:"กำหนดเวลาแล้ว",POSTPONED:"เลื่อนการแข่งขัน",CANCELLED:"ยกเลิก",SUSPENDED:"หยุดชั่วคราว"})[String(match.status||"").toUpperCase()] || match.status || "ไม่ระบุสถานะ";
  const values = (obj) => obj && typeof obj === "object" ? obj : {};
  const list = (value) => Array.isArray(value) ? value : [];
  const eventMinute = (event) => {
    const minute = event.minute ?? event.time?.elapsed ?? event.time?.elapsedMinute;
    const extra = event.addedTime ?? event.minuteExtra ?? event.time?.extra;
    return minute == null ? "—" : String(minute) + (extra ? "+" + extra : "") + "′";
  };
  const eventPlayer = (event) => event.player?.name || event.playerName || event.scorer?.name || event.player || "ไม่ระบุผู้เล่น";
  const playerLink = (event) => esc(eventPlayer(event));
  const card = (heading, content) => '<section class="mc-detail-card"><h3>' + heading + '</h3>' + content + '</section>';
  const empty = (message) => '<div class="mc-detail-empty">' + message + '</div>';
  function summaryMarkup(match) {
    const home = homeName(match), away = awayName(match);
    return '<div class="mc-detail-scoreline"><div class="mc-detail-side"><b>' + esc(home) + '</b><small>เจ้าบ้าน</small></div><strong class="mc-detail-score">' + esc(score(match)) + '</strong><div class="mc-detail-side"><b>' + esc(away) + '</b><small>ทีมเยือน</small></div></div><div class="mc-detail-meta"><span>' + esc(status(match)) + '</span><span>' + esc(dateTime(match)) + '</span></div>';
  }
  function overview(match) {
    const events = list(match.events || match.goals || match.researchRecord?.events);
    const goals = events.filter((event) => ["goal","penalty_goal","own_goal"].includes(String(event.type||event.detail||"").toLowerCase()));
    const goalMarkup = goals.length ? '<div class="mc-detail-list">' + goals.slice(0,3).map((event) => '<div class="mc-detail-row"><span>' + esc(eventMinute(event)) + ' · ' + playerLink(event) + (event.assist?.name ? '<small> · แอสซิสต์ ' + esc(event.assist.name) + '</small>' : event.assister?.name ? '<small> · แอสซิสต์ ' + esc(event.assister.name) + '</small>' : '') + '</span><b>' + esc(event.type || "ประตู") + '</b></div>').join("") + '</div>' + (goals.length>3?'<p class="mc-detail-muted">มีเหตุการณ์ประตูทั้งหมด '+goals.length+' รายการ · ดูทั้งหมดในแท็บ Events</p>':"") : empty("ยังไม่มีข้อมูลผู้ทำประตูและผู้แอสซิสต์ที่ตรวจสอบได้");
    const lineups = match.lineups || match.teams?.lineups;
    const lineupMarkup = Array.isArray(lineups) && lineups.length ? '<div class="mc-detail-list">' + lineups.map((team) => '<div class="mc-detail-row"><b>' + esc(team.team?.name || team.teamName || team.name || "ทีม") + '</b><span>' + esc(team.formation || "ไม่ระบุแผน") + ' · ' + list(team.startXI || team.startingXI).length + ' ตัวจริง</span></div>').join("") + '</div>' : empty("ยังไม่มีข้อมูลไลน์อัปหรือแผนการเล่น");
    const context = match.competitionContext || match.standingsContext;
    const contextMarkup = context ? '<pre class="mc-detail-muted">' + esc(JSON.stringify(context,null,2)) + '</pre>' : empty("ยังไม่มีข้อมูลอันดับและบริบทของรายการ");
    return card("ผู้ทำประตูและแอสซิสต์",goalMarkup) + card("Lineups & Team Formation",lineupMarkup) + card("Competition Context",contextMarkup);
  }
  function eventsPanel(match) {
    const events = list(match.events || match.researchRecord?.events).slice().sort((a,b) => Number(a.minute ?? a.time?.elapsed ?? 999)-Number(b.minute ?? b.time?.elapsed ?? 999));
    if (!events.length) return card("Match Timeline",empty("ยังไม่มี Event Feed จากแหล่งข้อมูลที่ยืนยันได้"));
    const labels = {goal:"ประตู",assist:"แอสซิสต์",penalty_goal:"จุดโทษ (P)",own_goal:"ทำเข้าประตูตัวเอง (OG)",yellow_card:"ใบเหลือง",red_card:"ใบแดง",substitution:"เปลี่ยนตัว",var:"VAR"};
    return card("Match Timeline",'<div class="mc-detail-list">' + events.map((event) => '<div class="mc-detail-row"><span><b>' + esc(eventMinute(event)) + '</b> · ' + esc(labels[String(event.type||"").toLowerCase()] || event.type || "เหตุการณ์") + '<br>' + playerLink(event) + (event.assist?.name ? '<small> · แอสซิสต์ ' + esc(event.assist.name) + '</small>' : '') + '</span><small>' + esc(event.team?.name || event.team || "") + '</small></div>').join("") + '</div>');
  }
  function statistics(match) {
    const stats = values(match.statistics || match.stats || match.matchStatistics);
    const playerStats = list(match.playerStatistics || match.playersStats);
    const keys = Object.keys(stats);
    const statsMarkup = keys.length ? '<div class="mc-detail-list">' + keys.map((key) => '<div class="mc-detail-row"><span>' + esc(key.replace(/_/g," ")) + '</span><b>' + esc(typeof stats[key] === "object" ? JSON.stringify(stats[key]) : stats[key]) + '</b></div>').join("") + '</div>' : empty("ยังไม่มีสถิติการแข่งขันจากแหล่งข้อมูลที่ยืนยันได้ · xG/xA และ Match Momentum จะแสดงเมื่อมีข้อมูลรองรับ");
    const playersMarkup = playerStats.length ? '<div class="mc-detail-list">' + playerStats.map((row) => '<div class="mc-detail-row"><span>' + esc(row.player?.name || row.playerName || "ผู้เล่น") + '</span><b>' + esc(JSON.stringify(row.statistics || row.stats || {})) + '</b></div>').join("") + '</div>' : empty("ยังไม่มี Player Performance รายบุคคล");
    return card("Team Statistics · xG / xA · Match Momentum",statsMarkup) + card("Player Performance",playersMarkup);
  }
  function analysis(match) {
    const analysisData = match.analysis || window.FootballTimeAppContext?.getMatchCardAnalysis?.(match);
    const data = values(analysisData);
    const prob = values(data.probabilities || data.probability_1x2);
    const hasProb = ["home","draw","away"].some((key) => prob[key] != null);
    const probability = hasProb ? '<div class="mc-detail-kpis">' + [["เจ้าบ้าน",prob.home],["เสมอ",prob.draw],["ทีมเยือน",prob.away]].map(([name,value]) => '<div class="mc-detail-kpi"><b>' + (value == null ? "—" : esc(Number(value).toFixed(1)) + "%") + '</b><span>' + name + '</span></div>').join("") + '</div>' : empty("ยังไม่มีผลวิเคราะห์ก่อนแข่งขันที่ผูกกับคู่นี้");
    const handicap = values(data.handicap);
    const handicapReady = handicap.status === "ready" && Number.isFinite(Number(handicap.line));
    const lineLabel = handicapReady ? (Number(handicap.line) > 0 ? "+" : "") + Number(handicap.line).toFixed(2) : "ยังไม่มีเส้นอ้างอิง";
    const asPercent = (value) => value == null ? "—" : (Number(value) * (Number(value) <= 1 ? 100 : 1)).toFixed(1) + "%";
    const handicapRows = handicapReady ? [
      ["เส้น Handicap เจ้าบ้าน",lineLabel],
      ["โอกาสผ่านราคา (ชนะเต็ม + ครึ่ง)",asPercent(handicap.winSide)],
      ["โอกาสคืนทุน",asPercent(handicap.push)]
    ] : [["สถานะ Handicap",handicap.status === "stale" ? "ข้อมูลอ้างอิงเก่า · งดคำนวณ" : "ยังไม่มีข้อมูลที่พร้อมคำนวณ"]];
    const handicapMarkup = '<div class="mc-detail-list">' + handicapRows.map(([label,value]) => '<div class="mc-detail-row"><span>' + esc(label) + '</span><b>' + esc(value) + '</b></div>').join("") + '</div>';
    const scoreMatrix = data.scoreMatrix || data.score_matrix || data.scoreDistribution;
    const scoreMatrixMarkup = scoreMatrix ? '<pre class="mc-detail-muted mc-analysis-data">' + esc(JSON.stringify(scoreMatrix,null,2)) + '</pre>' : empty("ยังไม่มี Score Matrix ที่ตรวจสอบได้");
    const insight = data.insight || data.analysisInsight;
    const insightMarkup = insight ? '<p class="mc-detail-muted">' + esc(typeof insight === "string" ? insight : insight.summary || JSON.stringify(insight)) + '</p>' : empty("ยังไม่มี Analysis Insight ที่อ้างอิงหลักฐานของคู่นี้");
    const evaluation = data.evaluation || data.predictionVsActual;
    const evaluationMarkup = evaluation ? '<pre class="mc-detail-muted">' + esc(JSON.stringify(evaluation,null,2)) + '</pre>' : empty("Prediction vs Actual จะแสดงเมื่อมี Snapshot ก่อนแข่งและผลจริงที่ตรวจสอบได้");
    return card("1X2 Probability",probability) + card("Handicap Probability",handicapMarkup) + card("Score Matrix",scoreMatrixMarkup) + card("Tactical Analysis & Analysis Insight",insightMarkup) + card("Prediction vs Actual · Model Evaluation",evaluationMarkup);
  }
  function renderPanel() {
    if (!selectedMatch) return;
    const panel = $("mcDetailPanel");
    if (!panel) return;
    panel.innerHTML = activeTab === "overview" ? overview(selectedMatch) : activeTab === "events" ? eventsPanel(selectedMatch) : activeTab === "statistics" ? statistics(selectedMatch) : analysis(selectedMatch);
    document.querySelectorAll("[data-mc-detail-tab]").forEach((button) => {
      const active = button.dataset.mcDetailTab === activeTab;
      button.classList.toggle("active",active);
      button.setAttribute("aria-selected",String(active));
    });
  }
  function open(id) {
    selectedMatch = window.FootballTimeMatchCenter?.getMatchById?.(id);
    if (!selectedMatch) return;
    activeTab = "overview";
    $("mcDetailCompetition").textContent = competition(selectedMatch);
    $("mcDetailSummary").innerHTML = summaryMarkup(selectedMatch);
    if (root()) root().hidden = true;
    const app = $("matchCenterApp");
    app?.querySelectorAll(":scope > .mc-calendar,:scope > .mc-category-filters,:scope > .mc-league-filter-wrap,:scope > .mc-toolbar,:scope > .mc-filters,:scope > .mc-data-line").forEach((node) => node.hidden = true);
    detail().hidden = false;
    renderPanel();
    detail().scrollIntoView({behavior:"smooth",block:"start"});
  }
  function close() {
    detail().hidden = true;
    if (root()) root().hidden = false;
    $("matchCenterApp")?.querySelectorAll(":scope > .mc-calendar,:scope > .mc-category-filters,:scope > .mc-league-filter-wrap,:scope > .mc-toolbar,:scope > .mc-filters,:scope > .mc-data-line").forEach((node) => node.hidden = false);
    selectedMatch = null;
  }
  document.addEventListener("click",(event) => {
    const matchButton = event.target.closest("[data-unified-match]");
    if (matchButton) { event.preventDefault(); open(matchButton.dataset.unifiedMatch); return; }
    const tab = event.target.closest("[data-mc-detail-tab]");
    if (tab) { activeTab = tab.dataset.mcDetailTab; renderPanel(); }
    if (event.target.closest("#mcDetailBack")) close();
  });
  window.addEventListener("pft-manual-match-research-updated",() => {
    if (!selectedMatch) return;
    const fresh = window.FootballTimeMatchCenter?.getMatchById?.(selectedMatch.id);
    if (fresh) { selectedMatch = fresh; $("mcDetailSummary").innerHTML = summaryMarkup(fresh); renderPanel(); }
  });
})();
