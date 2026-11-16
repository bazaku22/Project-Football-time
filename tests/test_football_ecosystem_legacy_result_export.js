"use strict";
const assert = require("node:assert/strict");
require("../js/football-ecosystem-export.js");
const api = globalThis.FootballTimeEcosystemExport;
assert.ok(api && typeof api.buildLegacyResultSnapshot === "function");

const db = {
  generatedAt: "2026-11-16T10:00:00.000Z",
  source: { provider: "football-data.org", lastSuccessfulSync: "2026-11-16T09:55:00.000Z" },
  matches: [
    { providerMatchId: 560643, leagueId: "PL", season: "2026-2027", status: "FINISHED",
      homeScore: 2, awayScore: 1, homeTeamId: "football-data:65", awayTeamId: "football-data:63",
      homeTeamName: "Manchester City FC", awayTeamName: "Fulham FC", utcDate: "2026-11-15T15:00:00.000Z" },
    { providerMatchId: 560644, leagueId: "PD", season: "2026-2027", status: "FINISHED",
      homeScore: 1, awayScore: 1 },
    { providerMatchId: null, leagueId: "BL1", season: "2026-2027", status: "FINISHED", homeScore: 1, awayScore: 0 },
    { providerMatchId: 560645, leagueId: "SA", season: "2026-2027", status: "FINISHED", homeScore: null, awayScore: 0 },
    { providerMatchId: 560646, leagueId: "FL1", season: "2025-2026", status: "FINISHED", homeScore: 1, awayScore: 0 }
  ]
};
const built = api.buildLegacyResultSnapshot(db, {
  now: "2026-11-17T00:00:00.000Z", exportId: "FT-LEGACY-TEST-1"
});
assert.equal(built.envelope.data_type, "legacy_match_result_snapshots");
assert.equal(built.envelope.snapshot_policy, "non_revision_legacy");
assert.equal(built.envelope.records.length, 2);
assert.equal(built.summary.total, 2);
assert.equal(built.summary.excluded.missingProviderId, 1);
assert.equal(built.summary.excluded.invalidScore, 1);
assert.equal(built.envelope.records[0].evidence.classification, "legacy_database_snapshot");
assert.equal(built.envelope.records[0].evidence.verification_status, "not_independently_verified");
assert.equal(built.envelope.records[0].evidence.database_generated_at, db.generatedAt);
for (const row of built.envelope.records) {
  assert.equal("result_revision" in row, false);
  assert.equal("revision_history" in row, false);
  assert.equal("updated_at" in row, false);
}
assert.throws(() => api.buildLegacyResultSnapshot({matches:[]}), /ไม่มีผลเก่า/);
const readiness = api.auditResultReadiness(db);
assert.equal(readiness.legacySnapshot.total, 2);
assert.equal(readiness.legacySnapshot.leagueCounts.PL, 1);
assert.equal(readiness.legacySnapshot.leagueCounts.PD, 1);
assert.equal(readiness.legacySnapshot.excluded.missingProviderId, 1);
assert.equal(readiness.legacySnapshot.excluded.invalidScore, 1);
assert.equal(readiness.totals.ready, 0, "legacy eligibility must not be mixed into verified readiness");
console.log("Legacy result snapshot export tests passed: exact IDs, valid scores, explicit unverified provenance, separate legacy readiness, no fabricated revisions.");
