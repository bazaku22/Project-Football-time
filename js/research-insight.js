"use strict";
(() => {
  const REPORT_URL = "./data/football-research-stats-2026-27.json";
  let report = null, loadState = "loading", database = null;
  const $ = selector => document.querySelector(selector);
  function node(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }
  function metric(label, value) {
    const item = node("div", "research-metric");
    item.append(node("span", "", label), node("b", "", value ?? "—"));
    return item;
  }
  function teamStats(team, venueLabel) {
    const block = node("div", "research-team-block");
    block.append(node("b", "", team?.teamName || "ไม่พบข้อมูลทีม"));
    if (!team) {
      block.append(node("p", "research-muted", "ไม่มีสถิติทีมในรายงานรอบนี้"));
      return block;
    }
    const form = team.last10 || {}, venue = venueLabel === "เหย้า" ? team.home : team.away;
    const formText = form.played ? (form.form || "—") + " · " + form.wins + "ช " + form.draws + "ส " + form.losses + "พ" : "ยังไม่มีผลแข่ง";
    const grid = node("div", "research-metrics");
    grid.append(metric("ฟอร์ม 10 นัด", formText), metric(venueLabel + " · เล่น", (venue?.played ?? 0) + " นัด"),
      metric("ยิงได้ / เสีย", (form.goalsFor ?? 0) + " / " + (form.goalsAgainst ?? 0)),
      metric(venueLabel + " · ยิง / เสีย", (venue?.goalsFor ?? 0) + " / " + (venue?.goalsAgainst ?? 0)));
    block.append(grid);
    if (form.played < 5 || (venue?.played ?? 0) < 3)
      block.append(node("p", "research-muted", "จำนวนตัวอย่างยังน้อย ควรใช้เป็นข้อมูลประกอบเท่านั้น"));
    return block;
  }
  function render() {
    const target = $("#analysisInsightOutput"), matchSelect = $("#probMatchSelect");
    if (!target || !matchSelect || !database) return;
    target.querySelector(".research-insight")?.remove();
    const matchId = String(matchSelect.value || "");
    const match = (database.matches || []).find(x => String(x.providerMatchId) === matchId);
    if (!match) return;
    const card = node("section", "analysis-insight research-insight");
    card.append(node("div", "insight-heading", "Research Statistics · ข้อมูลประกอบจากสถิติจริง"));
    if (loadState !== "ready" || !report) {
      card.append(node("p", "research-muted", loadState === "missing"
        ? "ยังไม่มีรายงาน Research รอบแรก ระบบจะแสดงเมื่อมีข้อมูลที่ผ่านการตรวจสอบ"
        : "กำลังโหลดข้อมูล Research หรือยังไม่สามารถเข้าถึงรายงานได้"));
      target.append(card); return;
    }
    const league = (report.leagues || []).find(x => x.leagueId === match.leagueId && (!match.season || x.season === match.season));
    if (!league) {
      card.append(node("p", "research-muted", "ไม่มีรายงานสำหรับลีกหรือฤดูกาลของคู่นี้"));
      target.append(card); return;
    }
    const home = (league.teams || []).find(x => String(x.teamId) === String(match.homeTeamId));
    const away = (league.teams || []).find(x => String(x.teamId) === String(match.awayTeamId));
    const baseline = league.goalBaseline || {};
    card.append(node("p", "research-muted", "ฤดูกาล " + (league.season || "ไม่ระบุ") + " · แข่งจบแล้ว " +
      (league.completedMatches ?? 0) + " นัด · ค่าเฉลี่ยประตู " + (baseline.goalsPerMatch ?? "—") + " ต่อเกม"));
    const teams = node("div", "research-team-columns");
    teams.append(teamStats(home, "เหย้า"), teamStats(away, "เยือน")); card.append(teams);
    const h2h = (league.upcomingHeadToHead || []).find(x => String(x.matchId) === matchId);
    card.append(node("p", "research-muted", h2h
      ? "พบกันในข้อมูลฤดูกาลนี้ " + h2h.sampleSize + " นัด" + (h2h.sampleSize < 3 ? " · ตัวอย่างน้อย" : "")
      : "ไม่มีข้อมูล H2H ในรายงานรอบนี้"));
    const source = report.source || {};
    card.append(node("p", "research-footnote", "รายงานคำนวณเมื่อ " + (report.generatedAt || "ไม่ระบุ") +
      " · ฐานข้อมูลต้นทางอัปเดต " + (source.databaseGeneratedAt || "ไม่ระบุ") + " · แหล่ง " + (source.provider || "ไม่ระบุ")));
    card.append(node("p", "research-footnote", "สถิตินี้ใช้ประกอบ Analysis Insight เท่านั้น ไม่เปลี่ยนสูตรหรือเปอร์เซ็นต์ความน่าจะเป็นเดิม และไม่ใช่ข้อมูลนักเตะหรือ xG"));
    target.append(card);
  }
  async function loadReport() {
    try {
      const response = await fetch(REPORT_URL + "?v=" + Date.now(), { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) { loadState = "missing"; render(); return; }
        throw new Error("HTTP " + response.status);
      }
      const data = await response.json();
      if (data?.schemaVersion !== 1 || !Array.isArray(data.leagues)) throw new Error("Invalid research report schema");
      report = data; loadState = "ready";
    } catch (error) {
      loadState = "error"; console.warn("Football research report unavailable", error);
    }
    render();
  }
  function observe() {
    const target = $("#analysisInsightOutput");
    if (!target) return;
    new MutationObserver(render).observe(target, { childList: true, subtree: true });
    $("#probMatchSelect")?.addEventListener("change", render);
    window.addEventListener("pft-football-database-ready", event => {
      database = event.detail?.database || window.FootballTimeAppContext?.getDatabase?.() || null; render();
    });
    database = window.FootballTimeAppContext?.getDatabase?.() || null;
    if (database) render();
    loadReport();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observe, { once: true });
  else observe();
})();
