import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/football-ecosystem-results-export.js", import.meta.url), "utf8");
const sandbox = {};
vm.runInNewContext(source, sandbox, { filename: "football-ecosystem-results-export.js" });
const api = sandbox.FootballTimeEcosystemResultsExport;
const now = "2026-11-16T10:00:00.000Z";
const makeMatch = (leagueId, providerMatchId, homeScore, awayScore) => ({
  leagueId, season: "2026-2027", providerMatchId, status: "FINISHED",
  homeScore, awayScore, homeTeamId: "home", awayTeamId: "away",
  updatedAt: now
});
const database = matches => ({
  matches,
  source: { provider: "football-data.org", lastSuccessfulSync: now },
  generatedAt: now
});

test("exports only completed scored matches in the five approved leagues", () => {
  const rows = [
    makeMatch("PL","101",2,1), makeMatch("PD","102",0,0),
    makeMatch("BL1","103",1,1), makeMatch("SA","104",3,0),
    makeMatch("FL1","105",0,2), makeMatch("PL","106",null,null),
    {...makeMatch("PL","107",1,0),status:"SCHEDULED"},
    {...makeMatch("UNL","108",2,0)}
  ];
  const result = api.buildExport(database(rows), { now, exportId:"test-export-1", ledger:{} });
  assert.equal(result.summary.total,5);
  assert.deepEqual(Array.from(result.envelope.scope.league_ids),["PL","PD","BL1","SA","FL1"]);
  assert.equal(result.envelope.data_type,"match_results");
  assert.equal(result.envelope.records.every(r=>r.result_revision===1),true);
  assert.equal(result.envelope.records.some(r=>"events" in r || "homeTeamName" in r),false);
});

test("same result replay keeps the same revision and does not append history", () => {
  const first=api.buildExport(database([makeMatch("PL","201",2,0)]),{now,ledger:{}});
  const second=api.buildExport(database([makeMatch("PL","201",2,0)]),{now,ledger:first.nextLedger});
  const row=second.envelope.records[0];
  assert.equal(row.result_revision,1);
  assert.equal(second.newResults,0);
  assert.equal(second.revisedResults,0);
  assert.equal(second.nextLedger[row.match_id].history.length,1);
});

test("corrected score creates a new monotonic revision and preserves prior score", () => {
  const first=api.buildExport(database([makeMatch("PL","202",2,0)]),{now,ledger:{}});
  const corrected=api.buildExport(database([makeMatch("PL","202",2,1)]),{now:"2026-11-17T10:00:00.000Z",ledger:first.nextLedger});
  const row=corrected.envelope.records[0];
  assert.equal(row.result_revision,2);
  assert.equal(corrected.revisedResults,1);
  assert.equal(corrected.nextLedger[row.match_id].history.length,2);
  assert.equal(corrected.nextLedger[row.match_id].history[1].previous_score.home_score,2);
  assert.equal(corrected.nextLedger[row.match_id].history[1].previous_score.away_score,0);
});

test("missing provider ID blocks the whole export instead of silently dropping a result", () => {
  assert.throws(()=>api.buildExport(database([makeMatch("PL",null,1,0)]),{now,ledger:{}}),/ไม่มี Provider Match ID/);
});

test("duplicate shared IDs are rejected", () => {
  assert.throws(()=>api.buildExport(database([
    makeMatch("PL","301",1,0),makeMatch("PL","301",2,0)
  ]),{now,ledger:{}}),/Match ID ซ้ำ/);
});

test("invalid or corrupt revision ledger is rejected without resetting it", () => {
  const storage={getItem:()=>"{bad json"};
  assert.throws(()=>api.loadRevisionLedger(storage),/เสียหาย/);
});
