"use strict";
(function (root) {
  const LEAGUE_IDS = ["PL", "PD", "BL1", "SA", "FL1"];
  const SEASON_ID = "2026-2027";
  const STORAGE_KEY = "pft_football_ecosystem_result_revisions_v1";
  const MATCH_ID_PATTERN = /^FT-M-FOOTBALLDATA-[A-Za-z0-9_-]+$/;
  const isDateTime = value => typeof value === "string" &&
    /(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(value) && Number.isFinite(Date.parse(value));
  function makeExportId(now) {
    return "FT-RESULTS-" + now.replace(/[-:]/g, "").replace(".000Z", "Z") +
      "-" + Math.random().toString(36).slice(2,10).padEnd(8,"0");
  }
  function loadRevisionLedger(storage) {
    const store = storage || root.localStorage;
    let raw;
    try { raw = store.getItem(STORAGE_KEY); }
    catch (_) { throw new Error("อ่านประวัติ Revision ในอุปกรณ์ไม่ได้ จึงหยุดส่งออกเพื่อป้องกันข้อมูลสูญหาย"); }
    if (raw == null || raw === "") return {};
    let ledger;
    try { ledger = JSON.parse(raw); }
    catch (_) { throw new Error("ประวัติ Revision เสียหายหรืออ่านไม่ได้ กรุณาสำรองข้อมูลก่อนแก้ไข"); }
    if (!ledger || typeof ledger !== "object" || Array.isArray(ledger)) throw new Error("โครงสร้างประวัติ Revision ไม่ถูกต้อง");
    for (const [id,row] of Object.entries(ledger)) {
      if (!MATCH_ID_PATTERN.test(id) || !row || row.match_id !== id ||
          !Number.isInteger(row.revision) || row.revision < 1 ||
          !Array.isArray(row.history) || !row.history.length) throw new Error("พบรายการ Revision ที่ไม่สมบูรณ์ จึงหยุดส่งออก");
    }
    return ledger;
  }
  function assertEnvelope(envelope) {
    const keys = ["schema_version","export_id","exported_by","exported_at","data_type","scope","records"];
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
        Object.keys(envelope).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(envelope,k))) {
      throw new Error("โครงสร้าง Envelope ผลการแข่งขันไม่ตรงกับ Data Contract v1.0");
    }
    if (envelope.schema_version !== "1.0.0" || envelope.exported_by !== "football-time" ||
        envelope.data_type !== "match_results" || !envelope.export_id || !isDateTime(envelope.exported_at)) {
      throw new Error("ส่วนหัวไฟล์ผลการแข่งขันไม่ผ่านการตรวจสอบ");
    }
    const scope = envelope.scope;
    if (!scope || !Array.isArray(scope.league_ids) || LEAGUE_IDS.some(id => !scope.league_ids.includes(id)) ||
        scope.league_ids.length !== LEAGUE_IDS.length || !Array.isArray(scope.season_ids) ||
        scope.season_ids.length !== 1 || scope.season_ids[0] !== SEASON_ID) {
      throw new Error("ไฟล์ผลการแข่งขันต้องอยู่ในขอบเขต 5 ลีกหลัก ฤดูกาล 2026-2027");
    }
    if (!Array.isArray(envelope.records)) throw new Error("ไม่พบรายการผลการแข่งขัน");
    const seen = new Set(), counts = Object.fromEntries(LEAGUE_IDS.map(id => [id,0]));
    for (const row of envelope.records) {
      if (!row || !MATCH_ID_PATTERN.test(row.match_id || "") || seen.has(row.match_id) ||
          !Number.isInteger(row.home_score) || row.home_score < 0 ||
          !Number.isInteger(row.away_score) || row.away_score < 0 ||
          row.status !== "FINISHED" || !Number.isInteger(row.result_revision) || row.result_revision < 1 ||
          !isDateTime(row.updated_at) || !row.source || typeof row.source.provider !== "string" ||
          !row.source.provider.trim() || !isDateTime(row.source.verified_at)) {
        throw new Error("พบผลการแข่งขันที่ขาดข้อมูล คะแนนหรือ Revision ไม่ถูกต้อง หรือมี Match ID ซ้ำ");
      }
      seen.add(row.match_id);
      if (!LEAGUE_IDS.includes(row.league_id) || row.season_id !== SEASON_ID) throw new Error("พบผลการแข่งขันนอกขอบเขต");
      counts[row.league_id] += 1;
    }
    return {total:envelope.records.length,counts};
  }
  function buildExport(database, options) {
    const opts = options || {};
    if (!database || !Array.isArray(database.matches)) throw new Error("ฐานข้อมูล Football Time ยังไม่พร้อม");
    const now = opts.now || new Date().toISOString();
    if (!isDateTime(now)) throw new Error("เวลา Export ไม่ถูกต้อง");
    const previous = opts.ledger || {}, nextLedger = JSON.parse(JSON.stringify(previous));
    const sourceMeta = database.source || {}, leagueSync = sourceMeta.leagueSync || {};
    const records = [];
    let newResults = 0, revisedResults = 0;
    for (const match of database.matches) {
      if (!match || !LEAGUE_IDS.includes(match.leagueId) || match.season !== SEASON_ID ||
          String(match.status || "").toUpperCase() !== "FINISHED") continue;
      if (!Number.isInteger(match.homeScore) || match.homeScore < 0 ||
          !Number.isInteger(match.awayScore) || match.awayScore < 0) continue;
      if (match.providerMatchId == null || String(match.providerMatchId).trim() === "") {
        throw new Error("พบแมตช์จบแล้วที่ไม่มี Provider Match ID · หยุดทั้งไฟล์เพื่อไม่ให้ผลตกหล่น");
      }
      const matchId = "FT-M-FOOTBALLDATA-" + String(match.providerMatchId);
      if (!MATCH_ID_PATTERN.test(matchId)) throw new Error("Provider Match ID ไม่สามารถสร้าง Shared Match ID ที่ปลอดภัยได้");
      const fingerprint = JSON.stringify([match.homeScore,match.awayScore,"FINISHED"]);
      const old = previous[matchId], changed = !!old && old.fingerprint !== fingerprint;
      const revision = old ? old.revision + (changed ? 1 : 0) : 1;
      const sync = leagueSync[match.leagueId] || {};
      const verifiedAt = match.resultVerifiedAt || match.updatedAt || sync.lastSuccessfulSync ||
        sourceMeta.lastSuccessfulSync || database.generatedAt || now;
      if (!isDateTime(verifiedAt)) throw new Error("เวลาแหล่งข้อมูลของผลการแข่งขันไม่ถูกต้อง · " + matchId);
      const updatedAt = old && !changed ? old.updated_at : verifiedAt;
      const history = old ? old.history.slice() : [];
      if (!old || changed) {
        history.push({revision,home_score:match.homeScore,away_score:match.awayScore,status:"FINISHED",
          updated_at:updatedAt,previous_score:old?{home_score:old.home_score,away_score:old.away_score}:null});
        if (old) revisedResults += 1; else newResults += 1;
      }
      nextLedger[matchId] = {match_id:matchId,revision,fingerprint,home_score:match.homeScore,
        away_score:match.awayScore,updated_at:updatedAt,history};
      records.push({match_id:matchId,league_id:match.leagueId,season_id:match.season,
        home_score:match.homeScore,away_score:match.awayScore,status:"FINISHED",
        result_revision:revision,updated_at:updatedAt,
        source:{provider:match.resultSource || sourceMeta.provider || "football-data.org",verified_at:verifiedAt}});
    }
    records.sort((a,b)=>a.updated_at.localeCompare(b.updated_at)||a.match_id.localeCompare(b.match_id));
    const envelope = {schema_version:"1.0.0",export_id:opts.exportId||makeExportId(now),
      exported_by:"football-time",exported_at:now,data_type:"match_results",
      scope:{league_ids:LEAGUE_IDS.slice(),season_ids:[SEASON_ID]},records};
    const summary = assertEnvelope(envelope);
    return {envelope,summary,nextLedger,newResults,revisedResults};
  }
  function downloadExport(prepared, storage) {
    const store = storage || root.localStorage;
    try { store.setItem(STORAGE_KEY,JSON.stringify(prepared.nextLedger)); }
    catch (_) { throw new Error("บันทึกประวัติ Revision ไม่สำเร็จ จึงยังไม่ดาวน์โหลดไฟล์"); }
    const blob = new Blob([JSON.stringify(prepared.envelope,null,2) + "\n"],{type:"application/json;charset=utf-8"});
    const url = URL.createObjectURL(blob), anchor = root.document.createElement("a");
    anchor.href=url; anchor.download="football-time-match-results-2026-27-"+new Date().toISOString().slice(0,10)+".json";
    root.document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function init() {
    if (!root.document || root.document.documentElement.dataset.ftResultExportBound === "true") return;
    root.document.documentElement.dataset.ftResultExportBound = "true";
    let prepared = null;
    root.document.addEventListener("click",event=>{
      const previewButton=event.target.closest("#ftResultExportPreviewButton");
      const downloadButton=event.target.closest("#ftResultExportDownloadButton");
      if (!previewButton && !downloadButton) return;
      const status=root.document.getElementById("ftResultExportStatus");
      const preview=root.document.getElementById("ftResultExportSummary");
      const download=root.document.getElementById("ftResultExportDownloadButton");
      if (previewButton) {
        try {
          const database=root.FootballTimeAppContext?.getDatabase?.();
          if (!database) throw new Error("กำลังโหลดฐานข้อมูลหลัก กรุณารอสักครู่แล้วลองใหม่");
          prepared=buildExport(database,{ledger:loadRevisionLedger()});
          const c=prepared.summary.counts;
          preview.textContent="พร้อมส่งออก "+prepared.summary.total.toLocaleString("th-TH")+" ผล · ใหม่ "+prepared.newResults+
            " · Revision ใหม่ "+prepared.revisedResults+" · PL "+c.PL+" · PD "+c.PD+" · BL1 "+c.BL1+" · SA "+c.SA+" · FL1 "+c.FL1;
          download.disabled=prepared.summary.total===0;
          status.textContent=prepared.summary.total?"ตรวจสอบผ่าน · ดาวน์โหลดเพื่อบันทึก Revision และส่งไป Football rich":"ยังไม่มีผลการแข่งขันที่จบและมีคะแนนในขอบเขตที่กำหนด";
        } catch(error) {
          prepared=null; preview.textContent="ยังไม่มีไฟล์ที่พร้อมดาวน์โหลด"; download.disabled=true;
          status.textContent=error.message||"ตรวจสอบผลการแข่งขันไม่สำเร็จ";
        }
      } else if (downloadButton && prepared) {
        try { downloadExport(prepared); status.textContent="ดาวน์โหลดไฟล์ผลการแข่งขันแล้ว · Export ID: "+prepared.envelope.export_id; }
        catch(error) { status.textContent=error.message||"ดาวน์โหลดไม่สำเร็จ"; }
      }
    });
  }
  root.FootballTimeEcosystemResultsExport={buildExport,assertEnvelope,loadRevisionLedger,downloadExport,init,
    leagueIds:LEAGUE_IDS.slice(),seasonId:SEASON_ID,storageKey:STORAGE_KEY};
  if (root.document) {
    if (root.document.readyState==="loading") root.document.addEventListener("DOMContentLoaded",init,{once:true});
    else init();
  }
})(typeof globalThis!=="undefined"?globalThis:window);
