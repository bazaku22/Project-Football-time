"use strict";
(() => {
  const CORE_LEAGUES = ["PL", "PD", "BL1", "SA", "FL1"];
  const SUPPORTED_STATUSES = new Set([
    "SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED",
    "POSTPONED", "SUSPENDED", "CANCELLED", "AWARDED"
  ]);
  const $ = (id) => document.getElementById(id);
  let database = null;

  function nowIso() {
    return new Date().toISOString();
  }
  function snapshotTimestamp(db) {
    const value = db?.source?.lastSuccessfulSync || db?.generatedAt;
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : nowIso();
  }
  function safeStatus(value) {
    const status = String(value || "").toUpperCase();
    if (status === "LIVE" || status === "IN_PLAY") return "IN_PLAY";
    if (status === "HALFTIME" || status === "PAUSED") return "PAUSED";
    return SUPPORTED_STATUSES.has(status) ? status : null;
  }
  function teamName(db, id, fallback) {
    const team = (db.teams || []).find((item) => String(item.id) === String(id));
    return fallback || team?.name || team?.shortName || "";
  }
  function checkedLeagues() {
    return [...document.querySelectorAll("[data-ec-league]:checked")]
      .map((node) => node.dataset.ecLeague)
      .filter((id) => CORE_LEAGUES.includes(id));
  }
  function buildFixtureEnvelope(db, leagueIds, seasonId) {
    const snapshotAt = snapshotTimestamp(db);
    const candidates = (db.matches || []).filter((match) =>
      leagueIds.includes(match.leagueId) && String(match.season) === seasonId
    );
    const byProviderId = new Map();
    const duplicateIds = new Set();
    candidates.forEach((match) => {
      const providerId = match.providerMatchId == null ? "" : String(match.providerMatchId).trim();
      if (!providerId) return;
      if (byProviderId.has(providerId)) duplicateIds.add(providerId);
      else byProviderId.set(providerId, match);
    });
    const records = [];
    const skipped = { missingProviderId: 0, duplicateProviderId: 0, invalidFields: 0 };
    const seen = new Set();
    candidates.forEach((match) => {
      const providerId = match.providerMatchId == null ? "" : String(match.providerMatchId).trim();
      if (!providerId) {
        skipped.missingProviderId++;
        return;
      }
      if (duplicateIds.has(providerId) || seen.has(providerId)) {
        skipped.duplicateProviderId++;
        return;
      }
      seen.add(providerId);
      const matchId = "FT-M-FOOTBALLDATA-" + providerId;
      const kickoff = match.utcDate ? new Date(match.utcDate) : null;
      const status = safeStatus(match.status);
      const homeTeamId = match.homeTeamId == null ? "" : String(match.homeTeamId);
      const awayTeamId = match.awayTeamId == null ? "" : String(match.awayTeamId);
      if (!/^[A-Za-z0-9_-]+$/.test(providerId) ||
          !homeTeamId || !awayTeamId || homeTeamId === awayTeamId ||
          !kickoff || Number.isNaN(kickoff.getTime()) || !status) {
        skipped.invalidFields++;
        return;
      }
      records.push({
        match_id: matchId,
        provider: "football-data",
        provider_match_id: providerId,
        league_id: match.leagueId,
        season_id: seasonId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team_name: teamName(db, homeTeamId, match.homeTeamName),
        away_team_name: teamName(db, awayTeamId, match.awayTeamName),
        kickoff_at: kickoff.toISOString(),
        status,
        source: {
          provider: db.source?.provider || "football-data.org",
          retrieved_at: snapshotAt
        },
        record_updated_at: snapshotAt
      });
    });
    return {
      envelope: {
        schema_version: "1.0.0",
        export_id: "FT-EXPORT-" + new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        exported_by: "football-time",
        exported_at: nowIso(),
        data_type: "fixtures",
        scope: { league_ids: leagueIds, season_ids: [seasonId] },
        records
      },
      total: candidates.length,
      skipped
    };
  }
  function downloadJson(payload, filename) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  function renderSummary() {
    const status = $("ecDatabaseStatus");
    const summary = $("ecExportSummary");
    const button = $("ecExportFixtures");
    if (!status || !summary || !button) return;
    if (!database) {
      status.textContent = "ยังไม่พบฐานข้อมูลฟุตบอลหลัก กรุณารอให้ Match Center โหลดข้อมูลสำเร็จ";
      summary.textContent = "ยังไม่พร้อมส่งออก";
      button.disabled = true;
      return;
    }
    const leagues = checkedLeagues();
    const seasonId = $("ecSeason")?.value || "2026-2027";
    const matches = (database.matches || []).filter((match) =>
      leagues.includes(match.leagueId) && String(match.season) === seasonId
    );
    const counts = CORE_LEAGUES.filter((id) => leagues.includes(id)).map((id) => {
      const count = matches.filter((match) => match.leagueId === id).length;
      return id + " " + count + " นัด";
    });
    const eligible = matches.filter((match) =>
      match.providerMatchId != null && String(match.providerMatchId).trim() &&
      match.homeTeamId != null && match.awayTeamId != null &&
      match.utcDate && !Number.isNaN(new Date(match.utcDate).getTime()) &&
      safeStatus(match.status)
    ).length;
    status.textContent = "ฐานข้อมูลพร้อม · " + (database.source?.provider || "ไม่ระบุแหล่งข้อมูล") +
      " · อัปเดต " + (database.source?.lastSuccessfulSync || database.generatedAt || "ไม่ระบุเวลา");
    summary.textContent = "พบ " + matches.length + " นัดในขอบเขตที่เลือก · คาดว่าส่งออกได้ " +
      eligible + " นัด · " + (counts.join(" / ") || "ยังไม่ได้เลือกลีก");
    button.disabled = leagues.length === 0 || matches.length === 0;
  }
  function mount() {
    const button = $("ecExportFixtures");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      if (!database) return;
      const leagueIds = checkedLeagues();
      const seasonId = $("ecSeason")?.value || "2026-2027";
      if (!leagueIds.length) {
        alert("กรุณาเลือกอย่างน้อย 1 ลีก");
        return;
      }
      const result = buildFixtureEnvelope(database, leagueIds, seasonId);
      if (!result.envelope.records.length) {
        alert("ไม่มีรายการที่ผ่านการตรวจสอบสำหรับส่งออก กรุณาตรวจสอบขอบเขตและข้อมูล Provider Match ID");
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(result.envelope, "football-time-fixtures-" + seasonId + "-" + date + ".json");
      const skipped = result.skipped;
      $("ecExportSummary").textContent =
        "ส่งออกแล้ว " + result.envelope.records.length + " นัด จาก " + result.total +
        " นัด · ข้ามเพราะไม่มี Provider ID " + skipped.missingProviderId +
        " · Provider ID ซ้ำ " + skipped.duplicateProviderId +
        " · ฟิลด์ไม่ครบ/ไม่รองรับ " + skipped.invalidFields +
        " · ไฟล์นี้เป็น fixtures เท่านั้น ยังไม่รวมผลจริง";
    });
    document.querySelectorAll("[data-ec-league]").forEach((node) =>
      node.addEventListener("change", renderSummary)
    );
    $("ecSeason")?.addEventListener("change", renderSummary);
    renderSummary();
  }
  function syncDatabase() {
    database = window.FootballTimeAppContext?.getDatabase?.() || null;
    renderSummary();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      mount();
      syncDatabase();
    }, { once: true });
  } else {
    mount();
    syncDatabase();
  }
  window.addEventListener("pft-football-database-ready", syncDatabase);
})();
