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


  function assertResultEnvelope(envelope) {
    if (!envelope || envelope.schema_version !== "1.0.0" ||
        envelope.exported_by !== "football-time" ||
        envelope.data_type !== "match_results" ||
        !isDateTime(envelope.exported_at) ||
        !Array.isArray(envelope.records) || !envelope.records.length) {
      throw new Error("โครงสร้างไฟล์ผลการแข่งขันไม่ถูกต้องหรือไม่มีผลที่พร้อมส่งออก");
    }
    const seen = new Set();
    for (const row of envelope.records) {
      if (!row || !MATCH_ID_PATTERN.test(row.match_id || "") || !LEAGUE_IDS.includes(row.league_id) || row.season_id !== SEASON_ID || seen.has(row.match_id) ||
          !Number.isInteger(row.home_score) || row.home_score < 0 ||
          !Number.isInteger(row.away_score) || row.away_score < 0 ||
          row.status !== "FINISHED" ||
          !Number.isInteger(row.result_revision) || row.result_revision < 1 ||
          !isDateTime(row.updated_at) ||
          !row.source || typeof row.source.provider !== "string" ||
          !row.source.provider || !isDateTime(row.source.verified_at) ||
          !Array.isArray(row.revision_history) || !row.revision_history.length) {
        throw new Error("พบผลการแข่งขันที่ขาดข้อมูล Revision หรือแหล่งที่มา");
      }
      seen.add(row.match_id);
      const revisions = row.revision_history.slice().sort((a,b) => a.result_revision-b.result_revision);
      if (revisions.length !== row.result_revision ||
          revisions.some((item,index) => item.result_revision !== index+1 ||
            !Number.isInteger(item.home_score) || item.home_score < 0 ||
            !Number.isInteger(item.away_score) || item.away_score < 0 ||
            item.status !== "FINISHED" || !isDateTime(item.recorded_at) ||
            !item.source || !item.source.provider || !isDateTime(item.source.verified_at))) {
        throw new Error("ประวัติ Revision ไม่ต่อเนื่องหรือมีข้อมูลไม่ครบ");
      }
      const latest = revisions[revisions.length-1];
      if (latest.result_revision !== row.result_revision ||
          latest.home_score !== row.home_score || latest.away_score !== row.away_score) {
        throw new Error("ผลล่าสุดไม่ตรงกับ Revision ล่าสุดในประวัติ");
      }
    }
    return { total: envelope.records.length };
  }

  function buildResultExport(database, options) {
    const opts = options || {};
    if (!database || !Array.isArray(database.matches) ||
        !Array.isArray(database.resultRevisionHistory)) {
      throw new Error("ฐานข้อมูลยังไม่มี Result Revision History ที่เชื่อถือได้");
    }
    const now = opts.now || new Date().toISOString();
    if (!isDateTime(now)) throw new Error("เวลา Export ไม่ถูกต้อง");
    const historyByMatch = new Map();
    for (const entry of database.resultRevisionHistory) {
      if (!entry || typeof entry.matchId !== "string" ||
          !Number.isInteger(entry.resultRevision) || entry.resultRevision < 1) {
        throw new Error("พบรายการ Result Revision History ที่ไม่ถูกต้อง");
      }
      const list = historyByMatch.get(entry.matchId) || [];
      list.push(entry);
      historyByMatch.set(entry.matchId, list);
    }
    const matches = database.matches.filter(match =>
      match && LEAGUE_IDS.includes(match.leagueId) && match.season === SEASON_ID &&
      match.status === "FINISHED"
    );
    const records = matches.map(match => {
      const providerId = match.providerMatchId;
      if (providerId === null || providerId === undefined || String(providerId).trim() === "") {
        throw new Error("พบผลจริงที่ไม่มี Provider Match ID؛ ยกเลิกส่งออกเพื่อไม่สร้าง Shared Match ID ใหม่");
      }
      const matchId = "FT-M-FOOTBALLDATA-" + String(providerId);
      if (!MATCH_ID_PATTERN.test(matchId) ||
          !Number.isInteger(match.homeScore) || match.homeScore < 0 ||
          !Number.isInteger(match.awayScore) || match.awayScore < 0 ||
          !Number.isInteger(match.resultRevision) || match.resultRevision < 1 ||
          !isDateTime(match.resultUpdatedAt) ||
          !match.resultSource || !match.resultSource.provider ||
          !isDateTime(match.resultSource.verifiedAt)) {
        throw new Error("ผลจริงของ " + matchId + " ไม่มี Revision, Score หรือ Provenance ที่ครบถ้วน");
      }
      const history = (historyByMatch.get(matchId) || []).slice()
        .sort((a,b) => a.resultRevision-b.resultRevision);
      if (!history.length || history.length !== match.resultRevision) {
        throw new Error("ประวัติ Revision ของ " + matchId + " ไม่ครบ จึงไม่ส่งออกผลจริง");
      }
      const revisionHistory = history.map(entry => {
        if (!Number.isInteger(entry.homeScore) || entry.homeScore < 0 ||
            !Number.isInteger(entry.awayScore) || entry.awayScore < 0 ||
            entry.status !== "FINISHED" || !isDateTime(entry.recordedAt) ||
            !entry.source || !entry.source.provider || !isDateTime(entry.source.verifiedAt)) {
          throw new Error("ประวัติ Revision ของ " + matchId + " มีรายการไม่สมบูรณ์");
        }
        return {
          result_revision: entry.resultRevision,
          home_score: entry.homeScore,
          away_score: entry.awayScore,
          status: "FINISHED",
          change_type: entry.changeType || "baseline",
          reason: entry.reason || "",
          recorded_at: entry.recordedAt,
          source: { provider: entry.source.provider, verified_at: entry.source.verifiedAt }
        };
      });
      const latest = revisionHistory[revisionHistory.length-1];
      if (latest.result_revision !== match.resultRevision ||
          latest.home_score !== match.homeScore || latest.away_score !== match.awayScore) {
        throw new Error("ผลปัจจุบันไม่ตรงกับประวัติ Revision ล่าสุดของ " + matchId);
      }
      return {
        match_id: matchId,
        league_id: match.leagueId,
        season_id: match.season,
        home_score: match.homeScore,
        away_score: match.awayScore,
        status: "FINISHED",
        result_revision: match.resultRevision,
        updated_at: match.resultUpdatedAt,
        correction_reason: latest.reason,
        source: {
          provider: match.resultSource.provider,
          verified_at: match.resultSource.verifiedAt
        },
        revision_history: revisionHistory
      };
    }).sort((a,b) => a.match_id.localeCompare(b.match_id));
    const envelope = {
      schema_version: "1.0.0",
      export_id: opts.exportId || makeExportId(now),
      exported_by: "football-time",
      exported_at: now,
      data_type: "match_results",
      scope: { league_ids: LEAGUE_IDS.slice(), season_ids: [SEASON_ID] },
      records
    };
    return { envelope, summary: assertResultEnvelope(envelope) };
  }

  function downloadResultExport(envelope) {
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = root.document.createElement("a");
    anchor.href = url;
    anchor.download = "football-time-results-2026-27-" + new Date().toISOString().slice(0,10) + ".json";
    root.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }



  function buildLegacyResultSnapshot(database, options) {
    const opts = options || {};
    if (!database || !Array.isArray(database.matches)) {
      throw new Error("ฐานข้อมูลหลักยังไม่พร้อมหรือไม่มีรายการแข่งขัน");
    }
    const now = opts.now || new Date().toISOString();
    if (!isDateTime(now)) throw new Error("เวลา Export ไม่ถูกต้อง");
    const sourceMeta = database.source || {};
    const observedAt = isDateTime(database.generatedAt) ? database.generatedAt : null;
    const sourceProvider = typeof sourceMeta.provider === "string" && sourceMeta.provider.trim()
      ? sourceMeta.provider.trim() : "unknown";
    const leagueCounts = Object.fromEntries(LEAGUE_IDS.map(id => [id, 0]));
    const excluded = { missingProviderId: 0, invalidScore: 0, invalidMatchId: 0 };
    const seen = new Set();
    const records = [];
    database.matches.filter(match =>
      match && LEAGUE_IDS.includes(match.leagueId) &&
      match.season === SEASON_ID && match.status === "FINISHED"
    ).forEach(match => {
      const rawProviderId = match.providerMatchId;
      if (rawProviderId === null || rawProviderId === undefined || String(rawProviderId).trim() === "") {
        excluded.missingProviderId++;
        return;
      }
      const providerMatchId = String(rawProviderId);
      const matchId = "FT-M-FOOTBALLDATA-" + providerMatchId;
      if (!MATCH_ID_PATTERN.test(matchId) || seen.has(matchId)) {
        excluded.invalidMatchId++;
        return;
      }
      if (!Number.isInteger(match.homeScore) || match.homeScore < 0 ||
          !Number.isInteger(match.awayScore) || match.awayScore < 0) {
        excluded.invalidScore++;
        return;
      }
      seen.add(matchId);
      const record = {
        match_id: matchId,
        provider: "football-data",
        provider_match_id: providerMatchId,
        league_id: match.leagueId,
        season_id: match.season,
        home_team_id: match.homeTeamId || null,
        away_team_id: match.awayTeamId || null,
        home_team_name: match.homeTeamName || null,
        away_team_name: match.awayTeamName || null,
        kickoff_at: isDateTime(match.utcDate) ? match.utcDate : null,
        home_score: match.homeScore,
        away_score: match.awayScore,
        status: "FINISHED",
        evidence: {
          classification: "legacy_database_snapshot",
          source_provider: sourceProvider,
          database_generated_at: observedAt,
          verification_status: "not_independently_verified",
          revision_history_available: false
        }
      };
      records.push(record);
      leagueCounts[match.leagueId]++;
    });
    if (!records.length) throw new Error("ไม่มีผลเก่าที่มี Match ID และสกอร์ถูกต้องสำหรับส่งออก");
    records.sort((a,b) => a.match_id.localeCompare(b.match_id));
    const envelope = {
      schema_version: "1.0.0",
      export_id: opts.exportId || makeExportId(now),
      exported_by: "football-time",
      exported_at: now,
      data_type: "legacy_match_result_snapshots",
      snapshot_policy: "non_revision_legacy",
      scope: { league_ids: LEAGUE_IDS.slice(), season_ids: [SEASON_ID] },
      records
    };
    return {
      envelope,
      summary: {
        total: records.length,
        leagueCounts,
        excluded,
        databaseGeneratedAt: observedAt,
        sourceProvider
      }
    };
  }

  function downloadLegacyResultSnapshot(envelope) {
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = root.document.createElement("a");
    anchor.href = url;
    anchor.download = "football-time-legacy-result-snapshots-2026-27-" + new Date().toISOString().slice(0,10) + ".json";
    root.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function auditResultReadiness(database) {
    if (!database || !Array.isArray(database.matches)) throw new Error('ฐานข้อมูลหลักยังไม่พร้อมหรือไม่มีรายการแข่งขัน');
    const historyRows = Array.isArray(database.resultRevisionHistory) ? database.resultRevisionHistory : [];
    const historyByMatch = new Map();
    historyRows.forEach(entry => { if (!entry || typeof entry.matchId !== 'string') return; const list = historyByMatch.get(entry.matchId) || []; list.push(entry); historyByMatch.set(entry.matchId, list); });
    const leagues = Object.fromEntries(LEAGUE_IDS.map(id => [id, {currentSeasonFinished:0,ready:0,missingProviderId:0,missingScore:0,missingRevision:0,missingProvenance:0,missingHistory:0,invalidHistory:0,otherSeasonFinished:0}]));
    database.matches.filter(m => m && LEAGUE_IDS.includes(m.leagueId) && m.status === 'FINISHED').forEach(match => {
      const row = leagues[match.leagueId];
      if (match.season !== SEASON_ID) { row.otherSeasonFinished++; return; }
      row.currentSeasonFinished++;
      const rawId = match.providerMatchId;
      const matchId = rawId === null || rawId === undefined || String(rawId).trim() === '' ? null : 'FT-M-FOOTBALLDATA-' + String(rawId);
      let issues = 0;
      if (!matchId || !MATCH_ID_PATTERN.test(matchId)) { row.missingProviderId++; issues++; }
      if (!Number.isInteger(match.homeScore) || match.homeScore < 0 || !Number.isInteger(match.awayScore) || match.awayScore < 0) { row.missingScore++; issues++; }
      if (!Number.isInteger(match.resultRevision) || match.resultRevision < 1 || !isDateTime(match.resultUpdatedAt)) { row.missingRevision++; issues++; }
      if (!match.resultSource || !match.resultSource.provider || !isDateTime(match.resultSource.verifiedAt)) { row.missingProvenance++; issues++; }
      const history = matchId ? (historyByMatch.get(matchId) || []).slice().sort((a,b) => a.resultRevision-b.resultRevision) : [];
      if (!history.length || !Number.isInteger(match.resultRevision) || history.length !== match.resultRevision) { row.missingHistory++; issues++; }
      else {
        const valid = history.every((entry,index) => entry.resultRevision === index+1 && Number.isInteger(entry.homeScore) && entry.homeScore >= 0 && Number.isInteger(entry.awayScore) && entry.awayScore >= 0 && entry.status === 'FINISHED' && isDateTime(entry.recordedAt) && entry.source && entry.source.provider && isDateTime(entry.source.verifiedAt));
        const latest = history[history.length-1];
        if (!valid || latest.homeScore !== match.homeScore || latest.awayScore !== match.awayScore || latest.resultRevision !== match.resultRevision) { row.invalidHistory++; issues++; }
      }
      if (!issues) row.ready++;
    });
    const totals = Object.keys(leagues).reduce((sum,id) => { Object.keys(sum).forEach(key => { sum[key] += leagues[id][key]; }); return sum; }, {currentSeasonFinished:0,ready:0,missingProviderId:0,missingScore:0,missingRevision:0,missingProvenance:0,missingHistory:0,invalidHistory:0,otherSeasonFinished:0});
    // Legacy eligibility is intentionally independent of revision/provenance requirements.
    const legacySnapshot = { total: 0, leagueCounts: Object.fromEntries(LEAGUE_IDS.map(id => [id, 0])), excluded: { missingProviderId: 0, invalidScore: 0, invalidMatchId: 0 } };
    const legacySeen = new Set();
    database.matches.filter(match => match && LEAGUE_IDS.includes(match.leagueId) && match.season === SEASON_ID && match.status === 'FINISHED').forEach(match => {
      const rawId = match.providerMatchId;
      if (rawId === null || rawId === undefined || String(rawId).trim() === '') { legacySnapshot.excluded.missingProviderId++; return; }
      const matchId = 'FT-M-FOOTBALLDATA-' + String(rawId);
      if (!MATCH_ID_PATTERN.test(matchId) || legacySeen.has(matchId)) { legacySnapshot.excluded.invalidMatchId++; return; }
      if (!Number.isInteger(match.homeScore) || match.homeScore < 0 || !Number.isInteger(match.awayScore) || match.awayScore < 0) { legacySnapshot.excluded.invalidScore++; return; }
      legacySeen.add(matchId);
      legacySnapshot.total++;
      legacySnapshot.leagueCounts[match.leagueId]++;
    });
    return {leagues,totals,legacySnapshot,historyRows:historyRows.length};
  }
  function initResultExport() {
    if (!root.document || root.document.documentElement.dataset.ftResultExportBound === "true") return;
    root.document.documentElement.dataset.ftResultExportBound = "true";
    let prepared = null;
    let preparedLegacy = null;
    root.document.addEventListener("click", event => {
      const previewButton = event.target.closest("#ftEcosystemResultPreviewButton");
      const downloadButton = event.target.closest("#ftEcosystemResultDownloadButton");
      const auditButton = event.target.closest("#ftEcosystemResultAuditButton");
      const legacyPreviewButton = event.target.closest("#ftEcosystemLegacyResultPreviewButton");
      const legacyDownloadButton = event.target.closest("#ftEcosystemLegacyResultDownloadButton");
      if (!previewButton && !downloadButton && !auditButton && !legacyPreviewButton && !legacyDownloadButton) return;
      const status = root.document.getElementById("ftEcosystemResultStatus");
      const summary = root.document.getElementById("ftEcosystemResultSummary");
      const legacySummary = root.document.getElementById("ftEcosystemLegacyResultSummary");
      const download = root.document.getElementById("ftEcosystemResultDownloadButton");
      const legacyDownload = root.document.getElementById("ftEcosystemLegacyResultDownloadButton");
      if (legacyPreviewButton) {
        try {
          const database = root.FootballTimeAppContext?.getDatabase();
          if (!database) throw new Error("กำลังโหลดฐานข้อมูลหลัก กรุณารอสักครู่แล้วลองใหม่");
          preparedLegacy = buildLegacyResultSnapshot(database);
          const c = preparedLegacy.summary.leagueCounts;
          const x = preparedLegacy.summary.excluded;
          legacySummary.textContent = "Legacy Snapshot พร้อมส่งออก " + preparedLegacy.summary.total.toLocaleString("th-TH") +
            " นัด · PL " + c.PL + " · PD " + c.PD + " · BL1 " + c.BL1 +
            " · SA " + c.SA + " · FL1 " + c.FL1 +
            " · ข้ามรายการ: ไม่มี Match ID " + x.missingProviderId +
            " · สกอร์ไม่ถูกต้อง " + x.invalidScore + " · ID ซ้ำ/ผิดรูปแบบ " + x.invalidMatchId;
          legacyDownload.disabled = false;
          status.textContent = "พร้อมดาวน์โหลด Legacy Snapshot · ไม่มีการสร้าง Revision หรืออ้างว่าเป็นผลที่ตรวจสอบอิสระแล้ว";
        } catch (error) {
          preparedLegacy = null;
          legacySummary.textContent = "ยังไม่มี Legacy Snapshot ที่พร้อมดาวน์โหลด";
          legacyDownload.disabled = true;
          status.textContent = error.message || "เตรียม Legacy Snapshot ไม่สำเร็จ";
        }
      } else if (legacyDownloadButton) {
        if (!preparedLegacy) return;
        downloadLegacyResultSnapshot(preparedLegacy.envelope);
        if (status) status.textContent = "สร้างไฟล์ Legacy Snapshot แล้ว · Export ID: " + preparedLegacy.envelope.export_id;
      } else if (auditButton) {
        try {
          const database = root.FootballTimeAppContext?.getDatabase();
          const report = auditResultReadiness(database), t = report.totals;
          const lines = ["รายงานตรวจสอบแบบอ่านอย่างเดียว · 5 ลีกหลัก",
            "ฤดูกาล 2026/27: จบแล้ว " + t.currentSeasonFinished + " นัด",
            "พร้อมส่งออกตามเงื่อนไขปัจจุบัน: " + t.ready + " นัด",
            "ยังไม่ผ่านเงื่อนไข: " + (t.currentSeasonFinished-t.ready) + " นัด",
            "ขาด Provider Match ID: " + t.missingProviderId,
            "ขาด/ผิดรูปแบบสกอร์: " + t.missingScore,
            "ขาด Revision/เวลาอัปเดต: " + t.missingRevision,
            "ขาด Provenance: " + t.missingProvenance,
            "ไม่มีประวัติ Revision ครบ: " + t.missingHistory,
            "ประวัติไม่ต่อเนื่อง/ไม่ตรงผลล่าสุด: " + t.invalidHistory,
            "ผลจบแล้วจากฤดูกาลอื่น (นอกขอบเขตส่งออก): " + t.otherSeasonFinished,
            "", "Legacy Snapshot (ใช้ Match ID + สกอร์ ไม่บังคับ Revision/Provenance): " + report.legacySnapshot.total + " นัด พร้อมส่งออก",
            "Legacy ที่ข้าม: ไม่มี Match ID " + report.legacySnapshot.excluded.missingProviderId +
              " · สกอร์ไม่ถูกต้อง " + report.legacySnapshot.excluded.invalidScore +
              " · ID ซ้ำ/ผิดรูปแบบ " + report.legacySnapshot.excluded.invalidMatchId,
            "", "แยกตามลีก (จบแล้ว / Verified พร้อมส่งออก / Legacy พร้อมส่งออก / ฤดูกาลอื่น)"];
          LEAGUE_IDS.forEach(id => { const row = report.leagues[id]; lines.push(id + ": " + row.currentSeasonFinished + " / " + row.ready + " / " + report.legacySnapshot.leagueCounts[id] + " / " + row.otherSeasonFinished); });
          summary.textContent = lines.join(String.fromCharCode(10));
          status.textContent = "ตรวจสอบเสร็จแล้ว · อ่านข้อมูลเท่านั้น ไม่มีการแก้ไขหรือบันทึกฐานข้อมูล";
        } catch (error) { summary.textContent = "ตรวจสอบไม่สำเร็จ"; status.textContent = error.message || "อ่านฐานข้อมูลไม่สำเร็จ"; }
      } else if (previewButton) {
        try {
          const database = root.FootballTimeAppContext?.getDatabase();
          if (!database) throw new Error("กำลังโหลดฐานข้อมูลหลัก กรุณารอสักครู่แล้วลองใหม่");
          prepared = buildResultExport(database);
          summary.textContent = "พร้อมส่งออกผลจริง " + prepared.summary.total.toLocaleString("th-TH") +
            " นัด · รวม Revision และประวัติการแก้ไขทุกเวอร์ชัน · 5 ลีกหลัก · 2026/27";
          download.disabled = false;
          status.textContent = "ตรวจสอบผลจริงและประวัติ Revision ผ่านแล้ว";
        } catch (error) {
          prepared = null;
          summary.textContent = "ยังไม่มีไฟล์ผลจริงที่พร้อมดาวน์โหลด";
          download.disabled = true;
          status.textContent = error.message || "ตรวจสอบผลจริงไม่สำเร็จ";
        }
      } else if (downloadButton) {
        if (!prepared) return;
        downloadResultExport(prepared.envelope);
        if (status) status.textContent = "สร้างไฟล์ผลจริงแล้ว · Export ID: " + prepared.envelope.export_id;
      }
    });
  }

  root.FootballTimeEcosystemExport = {
    buildExport, assertEnvelope, buildResultExport, assertResultEnvelope, buildLegacyResultSnapshot, auditResultReadiness,
    init, initResultExport, leagueIds: LEAGUE_IDS.slice(), seasonId: SEASON_ID
  };
  if (root.document) {
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", initResultExport, { once: true });
    else initResultExport();
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
