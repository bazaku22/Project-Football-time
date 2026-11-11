"use strict";
const assert=require("node:assert/strict");
const history=require("../js/handicap-history.js");
const {settleMatch,calculateHandicapMetrics,isValidSnapshot,fingerprint}=history;
assert.equal(settleMatch(2,0,-1),"fullWin");
assert.equal(settleMatch(1,0,-1),"push");
assert.equal(settleMatch(0,0,-1),"fullLoss");
assert.equal(settleMatch(0,0,-0.25),"halfLoss");
assert.equal(settleMatch(0,0,0.25),"halfWin");
assert.equal(settleMatch(2,0,-0.75),"fullWin");
assert.equal(settleMatch(1,0,-0.75),"halfWin");
assert.equal(settleMatch(0,0,-0.75),"fullLoss");
const kickoff="2026-11-12T18:00:00Z";
const base={matchId:"m1",leagueId:"PL",season:"2026",utcDate:kickoff,createdAt:"2026-11-12T17:00:00Z",homeTeamName:"Home",awayTeamName:"Away",homeLine:-0.5,source:"The Odds API",sources:[{bookmaker:"Source A",homeLine:-0.5,updatedAt:"2026-11-12T16:30:00Z"}],modelVersion:"pft-poisson-1.0",probabilities:{fullWin:45,halfWin:0,push:0,halfLoss:0,fullLoss:55}};
assert.equal(isValidSnapshot(base),true);
assert.equal(isValidSnapshot({...base,homeLine:null}),false);
assert.equal(isValidSnapshot({...base,source:"   "}),false);
assert.equal(fingerprint(base),fingerprint({...base,createdAt:"2026-11-12T17:30:00Z"}));
const snapshots=[
 {...base,matchId:"m1",homeLine:-0.5,probabilities:{fullWin:45,halfWin:0,push:0,halfLoss:0,fullLoss:55}},
 {...base,matchId:"m2",leagueId:"PD",homeLine:-1,probabilities:{fullWin:20,halfWin:0,push:20,halfLoss:0,fullLoss:60}},
 {...base,matchId:"m3",createdAt:"2026-11-12T19:00:00Z"},
 {...base,matchId:"m4",probabilities:{fullWin:60,halfWin:0,push:0,halfLoss:0,fullLoss:30}}
];
const matches=[
 {providerMatchId:"m1",leagueId:"PL",status:"FINISHED",homeScore:2,awayScore:0},
 {providerMatchId:"m2",leagueId:"PD",status:"FINISHED",homeScore:1,awayScore:0},
 {providerMatchId:"m3",leagueId:"PL",status:"FINISHED",homeScore:3,awayScore:0}
];
const metrics=calculateHandicapMetrics(snapshots,matches);
assert.equal(metrics.totalSnapshots,4);
assert.equal(metrics.validPreMatch,2);
assert.equal(metrics.evaluated,2);
assert.equal(metrics.pending,0);
assert.equal(metrics.excluded,2);
assert.equal(metrics.overall.count,2);
assert.equal(metrics.overall.counts.fullWin,1);
assert.equal(metrics.overall.counts.push,1);
assert.equal(metrics.overall.winRate,0.5);
assert.ok(metrics.overall.brier>=0&&metrics.overall.brier<=2);
assert.ok(metrics.overall.logLoss>0);
const empty=calculateHandicapMetrics([],[]);
assert.equal(empty.overall.winRate,null);
assert.equal(settleMatch(-1,0,-0.5),null);
console.log("Handicap history and independent evaluation tests: PASSED");
