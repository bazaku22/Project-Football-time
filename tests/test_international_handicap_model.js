"use strict";
const assert=require("node:assert/strict");
const model=require("../js/international-handicap-model.js");
assert.deepEqual(model.splitLine(-0.75),[-1,-0.5]);
assert.deepEqual(model.splitLine(0.25),[0,0.5]);
assert.equal(model.classify(2,-1),"full_win");
assert.equal(model.classify(1,-1),"push");
assert.equal(model.classify(1,-0.75),"half_win");
assert.equal(model.classify(0,-0.75),"full_loss");
assert.equal(model.classify(0,-0.25),"half_loss");
assert.equal(model.classify(0,0.25),"half_win");
assert.equal(model.classify(0,0),"push");
assert.throws(()=>model.splitLine(-0.3),/quarter-goal/);
const matrix=model.buildScoreMatrix(1.45,0.95,20);
assert.ok(matrix.omittedTailMass<=0.001);
const lines=[-1.5,-1,-0.75,-0.5,0,0.5,0.75,1,1.5];
for(const row of model.calculateHandicapGrid(1.45,0.95,lines).lines){
 const p=row.probabilities;
 assert.ok(model.OUTCOMES.every(key=>p[key]>=0&&p[key]<=1));
 assert.ok(Math.abs(model.OUTCOMES.reduce((sum,key)=>sum+p[key],0)-1)<1e-9);
}
assert.equal(model.canCapturePreMatch("2026-11-13T17:00:00Z","2026-11-12T02:00:00+07:00"),true);
assert.equal(model.canCapturePreMatch("2026-11-12T17:00:00Z","2026-11-12T17:00:00Z"),false);
assert.equal(model.canCapturePreMatch(null,"2026-11-12T02:00:00+07:00"),false);
console.log("International Handicap Poisson model tests: PASSED");
