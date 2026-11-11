const assert=require("node:assert/strict");
const {calculate,calculateFromDistribution,buildScoreDistribution}=require("../js/asian-handicap.js");
const balanced={home:1.2,away:1.2};
const matrix=buildScoreDistribution(balanced,10);
assert.equal(matrix.length,11);assert.equal(matrix[0].length,11);
assert.ok(Math.abs(matrix.flat().reduce((a,b)=>a+b,0)-1)<1e-12);
const dnb=calculateFromDistribution(matrix,0);
assert.ok(Math.abs(dnb.fullWin-dnb.fullLoss)<0.01);assert.ok(dnb.push>20&&dnb.push<30);
assert.ok(Math.abs(dnb.fullWin+dnb.push+dnb.fullLoss-100)<1e-8);
const half=calculateFromDistribution(matrix,-0.5);assert.ok(Math.abs(half.fullWin+half.fullLoss-100)<1e-8);assert.equal(half.push,0);
const quarter=calculateFromDistribution(matrix,-0.25);assert.ok(quarter.halfLoss>20);assert.equal(quarter.halfWin,0);
assert.ok(Math.abs(quarter.fullWin+quarter.halfLoss+quarter.fullLoss-100)<1e-8);
const threeQuarter=calculateFromDistribution(matrix,-0.75);assert.ok(threeQuarter.halfWin>0);assert.equal(threeQuarter.halfLoss,0);
assert.ok(calculate({home:2,away:.8},-.5).fullWin>50);
for(const line of [0,-0.25,-0.5,-0.75,-1,-1.25,-1.5,-1.75,0.5]){const result=calculateFromDistribution(matrix,line);assert.ok(Math.abs(Object.values(result).reduce((a,b)=>a+b,0)-100)<1e-8,"settlement categories sum to 100 for "+line);}
assert.throws(()=>calculate({home:0,away:1},-.5));assert.throws(()=>calculateFromDistribution([[1,-.1]],0));
console.log("Shared score distribution and Asian Handicap settlement tests passed.");
