"use strict";
const assert = require("node:assert/strict");
require("../js/football-ecosystem-export.js");
const exporter = globalThis.FootballTimeEcosystemExport;
assert.ok(exporter, "export module must be available");

const leagueIds = ["PL", "PD", "BL1", "SA", "FL1"];
function fixture(leagueId, index, overrides) {
  return Object.assign({
    providerMatchId: 560000 + index,
    leagueId,
    season: "2026-2027",
    utcDate: "2026-11-20T12:00:00Z",
    status: index === 1 ? "FINISHED" : "SCHEDULED",
    homeTeamId: "football-data:" + (100 + index * 2),
    awayTeamId: "football-data:" + (101 + index * 2),
    homeTeamName: "Home " + leagueId,
    awayTeamName: "Away " + leagueId,
    homeScore: index === 1 ? 2 : null,
    awayScore: index === 1 ? 1 : null
  }, overrides || {});
}
function database() {
  const matches = leagueIds.map((id, index) => fixture(id, index + 1));
  const teams = [];
  const teamSeasons = [];
  for (const match of matches) {
    for (const [teamId, name] of [[match.homeTeamId, match.homeTeamName], [match.awayTeamId, match.awayTeamName]]) {
      teams.push({ id: teamId, name });
      teamSeasons.push({ teamId, leagueId: match.leagueId, season: "2026-2027" });
    }
  }
  matches.push(fixture("PL", 20, { season: "2025-2026" }));
  matches.push(fixture("ELC", 21));
  return {
    schemaVersion: "1.3.0",
    generatedAt: "2026-11-16T10:00:00Z",
    source: {
      provider: "football-data.org",
      lastSuccessfulSync: "2026-11-16T10:00:00Z",
      leagueSync: Object.fromEntries(leagueIds.map(id => [id, { lastSuccessfulSync: "2026-11-16T09:55:00Z" }]))
    },
    teams, teamSeasons, matches
  };
}

const db = database();
const before = JSON.stringify(db);
const first = exporter.buildExport(db, { now: "2026-11-16T10:30:00Z", exportId: "FT-EXPORT-TEST-1" });
const second = exporter.buildExport(db, { now: "2026-11-16T10:31:00Z", exportId: "FT-EXPORT-TEST-2" });
assert.equal(first.envelope.schema_version, "1.0.0");
assert.equal(first.envelope.exported_by, "football-time");
assert.equal(first.envelope.data_type, "fixtures");
assert.deepEqual(first.envelope.scope.league_ids, leagueIds);
assert.deepEqual(first.envelope.scope.season_ids, ["2026-2027"]);
assert.equal(first.summary.total, 5);
assert.deepEqual(first.summary.counts, { PL: 1, PD: 1, BL1: 1, SA: 1, FL1: 1 });
assert.equal(first.envelope.records[0].match_id, "FT-M-FOOTBALLDATA-560001");
assert.equal(first.envelope.records[0].provider_match_id, "560001");
assert.equal(first.envelope.records[0].source.provider, "football-data.org");
assert.equal(first.envelope.records[0].source.retrieved_at, "2026-11-16T09:55:00Z");
assert.ok(first.envelope.records.every(row => !("home_score" in row) && !("away_score" in row)));
assert.deepEqual(first.envelope.records.map(row => row.match_id), second.envelope.records.map(row => row.match_id));
assert.notEqual(first.envelope.export_id, second.envelope.export_id);
assert.equal(JSON.stringify(db), before, "export must not mutate the source database");
assert.equal(exporter.assertEnvelope(first.envelope).total, 5);

const missingId = database();
missingId.matches[0].providerMatchId = null;
assert.throws(() => exporter.buildExport(missingId), /ไม่มี Provider Match ID/);

const unknownStatus = database();
unknownStatus.matches[0].status = "UNKNOWN";
assert.throws(() => exporter.buildExport(unknownStatus), /ข้อมูลแมตช์ไม่ครบ/);

const duplicateId = database();
duplicateId.matches[1].providerMatchId = duplicateId.matches[0].providerMatchId;
assert.throws(() => exporter.buildExport(duplicateId), /Shared Match ID ซ้ำ/);

const missingLeague = database();
missingLeague.matches = missingLeague.matches.filter(row => row.leagueId !== "FL1");
assert.throws(() => exporter.buildExport(missingLeague), /ข้อมูลไม่ครบทั้ง 5 ลีก/);

const missingTeam = database();
missingTeam.matches[0].homeTeamId = "unknown-team";
assert.throws(() => exporter.buildExport(missingTeam), /สมาชิกภาพ/);

const invalidScope = JSON.parse(JSON.stringify(first.envelope));
invalidScope.scope.season_ids = ["2025-2026"];
assert.throws(() => exporter.assertEnvelope(invalidScope), /ขอบเขตไฟล์/);

const scoreLeak = JSON.parse(JSON.stringify(first.envelope));
scoreLeak.records[0].home_score = 2;
assert.throws(() => exporter.assertEnvelope(scoreLeak), /ฟิลด์ไม่รองรับ/);

console.log("Football Time fixture export checks passed: five-league 2026/27 scope, stable shared IDs, provenance, all statuses, score exclusion, idempotent entity IDs, duplicate/missing/conflict guards, and no source-data mutation.");
