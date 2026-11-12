"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const context={};vm.runInNewContext(fs.readFileSync("js/probability-metrics.js","utf8"),context);
const calculate=context.FootballTimeMetrics.calculateProbabilityMetrics,kickoff="2026-11-10T18:00:00Z";
const matches=[
 {providerMatchId:"1",leagueId:"PL",season:"2026-2027",status:"FINISHED",homeScore:2,awayScore:1},
 {providerMatchId:"2",leagueId:"PD",season:"2026-2027",status:"FINISHED",homeScore:0,awayScore:0},
 {providerMatchId:"3",leagueId:"PL",season:"2026-2027",status:"SCHEDULED"}
];
const snap=(id,version,p,extra={})=>({matchId:id,leagueId:id==="2"?"PD":"PL",season:"2026-2027",modelVersion:version,utcDate:kickoff,createdAt:"2026-11-10T17:00:00Z",probabilities:p,...extra});
const v1=snap("1","pft-poisson-1.0",{home:60,draw:25,away:15});
const v2=snap("1","pft-poisson-2.0",{home:70,draw:20,away:10});
const rows=[
 v1,v2,
 snap("2","pft-poisson-1.0",{home:20,draw:15,away:65}),
 snap("3","pft-poisson-1.0",{home:45,draw:30,away:25},{actualOutcome:"home"}),
 snap("4","bad",{home:60,draw:20,away:20},{createdAt:"2026-11-10T19:00:00Z"}),
 snap("5","bad",{home:60,draw:20,away:30}),
 snap("6","intl",{home:40,draw:30,away:30},{scope:"international"}),
 v1
];
const result=calculate(rows,matches,[{id:"PL",name:"Premier League"},{id:"PD",name:"La Liga"}]);
assert.equal(result.totalSnapshots,8);
assert.equal(result.validPreMatch,4);
assert.equal(result.evaluated,3);
assert.equal(result.pending,1);
assert.equal(result.excludedInvalid,2);
assert.equal(result.excludedScope,1);
assert.equal(result.excludedDuplicate,1);
assert.equal(result.outcomeDisagreements,0);
assert.equal(result.overall.accuracy,2/3);
assert.ok(result.overall.accuracy95.lower<result.overall.accuracy&&result.overall.accuracy95.upper>result.overall.accuracy);
assert.ok(Math.abs(result.overall.brier-(0.245+1.185+0.14)/3)<1e-12);
assert.ok(result.overall.logLoss>0);
assert.ok(result.overall.topLabelEce>=0&&result.overall.topLabelEce<=1);
assert.ok(result.overall.classwiseEce>=0&&result.overall.classwiseEce<=1);
assert.deepEqual(Object.keys(result.overall.classwise).sort(),["away","draw","home"]);
assert.equal(result.byLeague.length,2);
assert.equal(result.byModel.length,2);
assert.equal(result.bySeason[0].season,"2026-2027");
assert.equal(result.byLeagueAndModel.length,3);
assert.equal(result.modelComparisons.length,1);
assert.equal(result.modelComparisons[0].pairedCount,1);
assert.ok(result.modelComparisons[0].brierDelta<0,"v2 lower Brier should produce a negative paired delta");
const disagreement=calculate([{...v1,actualOutcome:"away"}],matches,[{id:"PL",name:"Premier League"}]);
assert.equal(disagreement.outcomeDisagreements,1);
assert.equal(disagreement.evaluatedRows[0].actualOutcome,"home","Finished match score must override a conflicting stored annotation");
assert.equal(disagreement.evaluatedRows[0].outcomeSource,"finished_match_score");
const storedFallback=calculate([{...v1,matchId:"missing",actualOutcome:"home"}],[],[]);
assert.equal(storedFallback.evaluated,1);
assert.equal(storedFallback.evaluatedRows[0].outcomeSource,"stored_snapshot_outcome");
const unfinishedWithAnnotation=calculate([{...v1,matchId:"3",actualOutcome:"home"}],matches,[]);
assert.equal(unfinishedWithAnnotation.evaluated,0,"An unfinished match record must not be evaluated from a stored annotation");
assert.equal(unfinishedWithAnnotation.pending,1);
const empty=calculate([],[],[]);
assert.equal(empty.overall.accuracy,null);
assert.equal(empty.overall.brier,null);
assert.equal(empty.overall.classwiseEce,null);
console.log("Probability metrics tests: PASSED");
