"use strict";
const assert = require("node:assert/strict");
require("../js/football-ecosystem-export.js");
const api = globalThis.FootballTimeEcosystemExport;
assert.ok(api && typeof api.buildResultExport === "function");

const db = {
  matches: [{
    providerMatchId: 560643, leagueId: "PL", season: "2026-2027",
    status: "FINISHED", homeScore: 2, awayScore: 1, resultRevision: 2,
    resultUpdatedAt: "2026-11-20T15:05:00.000Z",
    resultSource: { provider: "football-data.org", verifiedAt: "2026-11-20T15:05:00.000Z" }
  }],
  resultRevisionHistory: [
    { matchId: "FT-M-FOOTBALLDATA-560643", providerMatchId: "560643", resultRevision: 1,
      homeScore: 1, awayScore: 1, status: "FINISHED", changeType: "baseline",
      reason: "Initial verified result.", recordedAt: "2026-11-20T15:00:00.000Z",
      source: { provider: "football-data.org", verifiedAt: "2026-11-20T15:00:00.000Z" } },
    { matchId: "FT-M-FOOTBALLDATA-560643", providerMatchId: "560643", resultRevision: 2,
      homeScore: 2, awayScore: 1, status: "FINISHED", changeType: "correction",
      reason: "Provider corrected score.", recordedAt: "2026-11-20T15:05:00.000Z",
      source: { provider: "football-data.org", verifiedAt: "2026-11-20T15:05:00.000Z" } }
  ]
};
const built = api.buildResultExport(db, { now: "2026-11-21T00:00:00.000Z", exportId: "FT-EXPORT-TEST-1" });
assert.equal(built.envelope.data_type, "match_results");
assert.equal(built.envelope.records.length, 1);
assert.equal(built.envelope.records[0].league_id, "PL");
assert.equal(built.envelope.records[0].season_id, "2026-2027");
assert.equal(built.envelope.records[0].result_revision, 2);
assert.equal(built.envelope.records[0].revision_history.length, 2);
assert.equal(built.envelope.records[0].revision_history[0].home_score, 1);
assert.equal(built.envelope.records[0].home_score, 2);

assert.throws(() => api.buildResultExport({
  matches: db.matches,
  resultRevisionHistory: db.resultRevisionHistory.slice(1)
}), /ประวัติ Revision/);

const mismatched = structuredClone(db);
mismatched.resultRevisionHistory[1].awayScore = 0;
assert.throws(() => api.buildResultExport(mismatched), /ไม่ตรงกับประวัติ Revision ล่าสุด/);

const noSource = structuredClone(db);
noSource.matches[0].resultSource = null;
assert.throws(() => api.buildResultExport(noSource), /ไม่มี Revision, Score หรือ Provenance/);

const noHistory = { matches: db.matches, resultRevisionHistory: [] };
assert.throws(() => api.buildResultExport(noHistory), /ประวัติ Revision/);

console.log("Football ecosystem result export tests passed.");
