"use strict";
(function (root) {
  const LEAGUE_IDS = ["PL", "PD", "BL1", "SA", "FL1"];
  const SEASON_ID = "2026-2027";
  const ALLOWED_STATUSES = new Set([
    "SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "FINISHED",
    "POSTPONED", "SUSPENDED", "CANCELLED", "AWARDED"
  ]);
  const MATCH_ID_PATTERN = /^FT-M-FOOTBALLDATA-[A-Za-z0-9_-]+$/;

  function isDateTime(value) {
    return typeof value === "string" &&
      /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(value) &&
      Number.isFinite(Date.parse(value));
  }

  function makeExportId(now) {
    const stamp = now.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const random = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
    return "FT-EXPORT-" + stamp + "-" + random;
  }

  function assertEnvelope(envelope) {
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
      throw new Error("รูปแบบไฟล์ส่งออกไม่ถูกต้อง");
    }
    const expectedKeys = ["schema_version", "export_id", "exported_by", "exported_at", "data_type", "scope", "records"];
    if (Object.keys(envelope).some(key => !expectedKeys.includes(key)) ||
        expectedKeys.some(key => !Object.prototype.hasOwnProperty.call(envelope, key))) {
      throw new Error("โครงสร้าง Envelope ไม่ตรงกับ Data Contract v1.0");
    }
    if (envelope.schema_version !== "1.0.0" || envelope.exported_by !== "football-time" ||
        envelope.data_type !== "fixtures" || typeof envelope.export_id !== "string" ||
        !envelope.export_id || !isDateTime(envelope.exported_at)) {
      throw new Error("ข้อมูลส่วนหัวของไฟล์ส่งออกไม่ผ่านการตรวจสอบ");
    }
    const scope = envelope.scope;
    if (!scope || Object.keys(scope).some(key => !["league_ids", "season_ids"].includes(key)) ||
        !Array.isArray(scope.league_ids) || !Array.isArray(scope.season_ids) ||
        LEAGUE_IDS.some(id => !scope.league_ids.includes(id)) ||
        scope.league_ids.length !== LEAGUE_IDS.length ||
        scope.season_ids.length !== 1 || scope.season_ids[0] !== SEASON_ID) {
      throw new Error("ขอบเขตไฟล์ต้องเป็น 5 ลีกหลักและฤดูกาล 2026-2027 เท่านั้น");
    }
    if (!Array.isArray(envelope.records) || !envelope.records.length) {
      throw new Error("ไม่พบโปรแกรมแข่งขันในขอบเขตที่กำหนด");
    }
    const seen = new Set();
    const counts = Object.fromEntries(LEAGUE_IDS.map(id => [id, 0]));
    const recordKeys = [
      "match_id", "provider", "provider_match_id", "league_id", "season_id",
      "home_team_id", "away_team_id", "home_team_name", "away_team_name",
      "kickoff_at", "status", "source", "record_updated_at"
    ];
    for (const row of envelope.records) {
      if (!row || typeof row !== "object" || Array.isArray(row) ||
          Object.keys(row).some(key => !recordKeys.includes(key))) {
        throw new Error("พบรายการแข่งขันที่มีฟิลด์ไม่รองรับ");
      }
      if (!MATCH_ID_PATTERN.test(row.match_id || "") ||
          seen.has(row.match_id) ||
          !row.provider_match_id ||
          row.provider !== "football-data" ||
          !LEAGUE_IDS.includes(row.league_id) ||
          row.season_id !== SEASON_ID ||
          !row.home_team_id || !row.away_team_id || row.home_team_id === row.away_team_id ||
          !row.home_team_name || !row.away_team_name ||
          !isDateTime(row.kickoff_at) ||
          !ALLOWED_STATUSES.has(row.status) ||
          !row.source || typeof row.source.provider !== "string" ||
          !row.source.provider || !isDateTime(row.source.retrieved_at) ||
          !isDateTime(row.record_updated_at)) {
        throw new Error("พบข้อมูลแมตช์ไม่ครบ ไม่ถูกต้อง หรือมี Shared Match ID ซ้ำ");
      }
      seen.add(row.match_id);
      counts[row.league_id] += 1;
      if ("home_score" in row || "away_score" in row || "score" in row) {
        throw new Error("Fixture export ต้องไม่รวมผลสกอร์จริง");
      }
    }
    if (LEAGUE_IDS.some(id => counts[id] === 0)) {
      throw new Error("ข้อมูลไม่ครบทั้ง 5 ลีก จึงยกเลิกการส่งออกเพื่อป้องกันไฟล์ไม่สมบูรณ์");
    }
    return { counts, total: envelope.records.length };
  }

  function buildExport(database, options) {
    const opts = options || {};
    if (!database || !Array.isArray(database.matches) ||
        !Array.isArray(database.teams) || !Array.isArray(database.teamSeasons)) {
      throw new Error("ฐานข้อมูลฟุตบอลยังไม่พร้อมหรือมีโครงสร้างไม่ถูกต้อง");
    }
    const now = opts.now || new Date().toISOString();
    if (!isDateTime(now)) throw new Error("เวลา Export ไม่ถูกต้อง");
    const teams = new Map(database.teams.map(team => [team.id, team]));
    const memberships = new Set(database.teamSeasons
      .filter(item => item && item.season === SEASON_ID)
      .map(item => item.teamId + "|" + item.leagueId + "|" + item.season));
    const sourceMeta = database.source || {};
    const leagueSync = sourceMeta.leagueSync || {};
    const records = database.matches
      .filter(match => match && LEAGUE_IDS.includes(match.leagueId) && match.season === SEASON_ID)
      .map(match => {
        const providerMatchId = match.providerMatchId;
        const home = teams.get(match.homeTeamId);
        const away = teams.get(match.awayTeamId);
        const sync = leagueSync[match.leagueId] || {};
        const retrievedAt = sync.lastSuccessfulSync || sourceMeta.lastSuccessfulSync || database.generatedAt;
        const recordUpdatedAt = match.updatedAt || sync.lastSuccessfulSync || sourceMeta.lastSuccessfulSync || database.generatedAt;
        if (providerMatchId === null || providerMatchId === undefined || String(providerMatchId).trim() === "") {
          throw new Error("พบแมตช์ที่ไม่มี Provider Match ID; ไม่สร้าง ID ใหม่ระหว่างส่งออก");
        }
        if (!memberships.has(match.homeTeamId + "|" + match.leagueId + "|" + SEASON_ID) ||
            !memberships.has(match.awayTeamId + "|" + match.leagueId + "|" + SEASON_ID)) {
          throw new Error("พบแมตช์ที่ทีมเจ้าบ้านหรือทีมเยือนไม่มีสมาชิกภาพในลีก/ฤดูกาลเดียวกัน");
        }
        return {
          match_id: "FT-M-FOOTBALLDATA-" + String(providerMatchId),
          provider: "football-data",
          provider_match_id: String(providerMatchId),
          league_id: match.leagueId,
          season_id: match.season,
          home_team_id: match.homeTeamId,
          away_team_id: match.awayTeamId,
          home_team_name: match.homeTeamName || home?.name || "",
          away_team_name: match.awayTeamName || away?.name || "",
          kickoff_at: match.utcDate,
          status: match.status,
          source: {
            provider: sourceMeta.provider || "football-data.org",
            retrieved_at: retrievedAt
          },
          record_updated_at: recordUpdatedAt
        };
      })
      .sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at) ||
        LEAGUE_IDS.indexOf(a.league_id) - LEAGUE_IDS.indexOf(b.league_id) ||
        a.match_id.localeCompare(b.match_id));

    const envelope = {
      schema_version: "1.0.0",
      export_id: opts.exportId || makeExportId(now),
      exported_by: "football-time",
      exported_at: now,
      data_type: "fixtures",
      scope: { league_ids: LEAGUE_IDS.slice(), season_ids: [SEASON_ID] },
      records
    };
    const summary = assertEnvelope(envelope);
    return { envelope, summary };
  }

  function downloadExport(envelope) {
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "football-time-fixtures-2026-27-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function init() {
    if (!root.document || root.document.documentElement.dataset.ftFixtureExportBound === "true") return;
    root.document.documentElement.dataset.ftFixtureExportBound = "true";
    let prepared = null;
    root.document.addEventListener("click", event => {
      const previewButton = event.target.closest("#ftEcosystemExportPreviewButton");
      const downloadButton = event.target.closest("#ftEcosystemExportDownloadButton");
      if (!previewButton && !downloadButton) return;
      if (previewButton) {
        const status = root.document.getElementById("ftEcosystemExportStatus");
        const preview = root.document.getElementById("ftEcosystemExportSummary");
        const download = root.document.getElementById("ftEcosystemExportDownloadButton");
        try {
          const database = root.FootballTimeAppContext?.getDatabase();
          if (!database) throw new Error("กำลังโหลดฐานข้อมูลหลัก กรุณารอสักครู่แล้วลองใหม่");
          prepared = buildExport(database);
          const counts = prepared.summary.counts;
          preview.textContent = "พร้อมส่งออก " + prepared.summary.total.toLocaleString("th-TH") +
            " นัด · PL " + counts.PL + " · PD " + counts.PD + " · BL1 " + counts.BL1 +
            " · SA " + counts.SA + " · FL1 " + counts.FL1 +
            " · ฤดูกาล 2026/27 · ไม่มีสกอร์หรือข้อมูลผลจริงในไฟล์นี้";
          download.disabled = false;
          status.textContent = "ตรวจสอบข้อมูลผ่านแล้ว · กดดาวน์โหลดไฟล์ JSON ได้";
        } catch (error) {
          prepared = null;
          preview.textContent = "ยังไม่มีไฟล์ที่พร้อมดาวน์โหลด";
          download.disabled = true;
          status.textContent = error.message || "ตรวจสอบข้อมูลไม่สำเร็จ";
        }
      } else if (downloadButton) {
        if (!prepared) return;
        downloadExport(prepared.envelope);
        const status = root.document.getElementById("ftEcosystemExportStatus");
        if (status) status.textContent = "สร้างไฟล์ดาวน์โหลดแล้ว · Export ID: " + prepared.envelope.export_id;
      }
    });
  }

  root.FootballTimeEcosystemExport = { buildExport, assertEnvelope, init, leagueIds: LEAGUE_IDS.slice(), seasonId: SEASON_ID };
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
