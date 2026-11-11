"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const context={};vm.runInNewContext(fs.readFileSync("js/probability-metrics.js","utf8"),context);
const calculate=context.FootballTimeMetrics.calculateProbabilityMetrics,kickoff="2026-11-10T18:00:00Z";
const matches=[{providerMatchId:"1",leagueId:"PL",status:"FINISHED",homeScore:2,awayScore:1},{providerMatchId:"2",leagueId:"PD",status:"FINISHED",homeScore:0,awayScore:0},{providerMatchId:"3",leagueId:"PL",status:"SCHEDULED"}];
const snapshots=[
{matchId:"1",leagueId:"PL",modelVersion:"pft-poisson-1.0",utcDate:kickoff,createdAt:"2026-11-10T17:00:00Z",probabilities:{home:60,draw:25,away:15}},
{matchId:"2",leagueId:"PD",modelVersion:"pft-poisson-1.0",utcDate:kickoff,createdAt:"2026-11-10T17:00:00Z",probabilities:{home:20,draw:15,away:65}},
{matchId:"3",leagueId:"PL",modelVersion:"pft-poisson-1.0",utcDate:"2026-11-12T18:00:00Z",createdAt:"2026-11-10T17:00:00Z",probabilities:{home:45,draw:30,away:25}},
{matchId:"4",leagueId:"PL",modelVersion:"bad",utcDate:kickoff,createdAt:"2026-11-10T19:00:00Z",probabilities:{home:60,draw:20,away:20}},
{matchId:"5",leagueId:"PL",modelVersion:"bad",utcDate:kickoff,createdAt:"2026-11-10T17:00:00Z",probabilities:{home:60,draw:20,away:30}}
];
const result=calculate(snapshots,matches,[{id:"PL",name:"Premier League"},{id:"PD",name:"La Liga"}]);
assert.equal(result.totalSnapshots,5);assert.equal(result.validPreMatch,3);assert.equal(result.evaluated,2);assert.equal(result.pending,1);assert.equal(result.excluded,2);assert.equal(result.overall.accuracy,.5);assert.equal(result.overall.count,2);
// Conventional multiclass Brier: (0.245 + 1.185) / 2 = 0.715, with a 0–2 range.
assert.ok(Math.abs(result.overall.brier-0.715)<1e-12);assert.ok(result.overall.brier>=0&&result.overall.brier<=2);assert.ok(result.overall.logLoss>0);assert.ok(result.overall.ece>=0&&result.overall.ece<=1);
const empty=calculate([],[],[]);assert.equal(empty.overall.accuracy,null);assert.equal(empty.overall.brier,null);
console.log("Probability metrics tests: PASSED");
