/* Shared score-distribution Asian Handicap settlement probabilities. */
(function(root){
 "use strict";
 function poisson(lambda,k){let p=Math.exp(-lambda);for(let i=1;i<=k;i++)p*=lambda/i;return p;}
 function buildScoreDistribution(expectedGoals,maxGoals){
  const limit=Number.isInteger(maxGoals)?maxGoals:10,h=Number(expectedGoals&&expectedGoals.home),a=Number(expectedGoals&&expectedGoals.away);
  if(!Number.isInteger(limit)||limit<1||limit>30||!Number.isFinite(h)||!Number.isFinite(a)||h<=0||a<=0)throw new Error("Invalid expected goals or score limit");
  const home=[],away=[];for(let k=0;k<=limit;k++){home.push(poisson(h,k));away.push(poisson(a,k));}
  const matrix=home.map(ph=>away.map(pa=>ph*pa));
  const total=matrix.reduce((sum,row)=>sum+row.reduce((n,p)=>n+p,0),0);
  if(!Number.isFinite(total)||total<=0)throw new Error("Invalid score distribution");
  matrix.forEach(row=>row.forEach((p,i)=>{row[i]=p/total;}));
  return matrix;
 }
 function splitLine(line){const quarter=Math.abs(line*4-Math.round(line*4))<1e-8&&Math.abs(Math.round(line*4))%2===1;return quarter?[line-0.25,line+0.25]:[line];}
 function settle(margin,line){const value=margin+line;if(Math.abs(value)<1e-9)return "push";return value>0?"win":"loss";}
 function calculateFromDistribution(matrix,line){
  if(!Array.isArray(matrix)||!matrix.length||!Number.isFinite(Number(line)))throw new Error("Invalid score distribution or handicap line");
  const width=matrix[0].length;if(!width||matrix.some(row=>!Array.isArray(row)||row.length!==width))throw new Error("Score distribution must be a rectangular matrix");
  const parts=splitLine(Number(line)),out={fullWin:0,halfWin:0,push:0,halfLoss:0,fullLoss:0};let total=0;
  for(let hg=0;hg<matrix.length;hg++)for(let ag=0;ag<width;ag++){
   const p=Number(matrix[hg][ag]);if(!Number.isFinite(p)||p<0)throw new Error("Score distribution contains invalid probability");if(!p)continue;total+=p;
   const states=parts.map(x=>settle(hg-ag,x));
   let key;if(states.every(x=>x==="win"))key="fullWin";else if(states.every(x=>x==="loss"))key="fullLoss";else if(states.every(x=>x==="push"))key="push";else if(states.includes("win"))key="halfWin";else if(states.includes("loss"))key="halfLoss";else key="push";
   out[key]+=p;
  }
  if(!Number.isFinite(total)||total<=0)throw new Error("Score distribution has no probability mass");
  Object.keys(out).forEach(key=>out[key]=out[key]/total*100);return out;
 }
 function calculate(expectedGoals,line,maxGoals){return calculateFromDistribution(buildScoreDistribution(expectedGoals,maxGoals),line);}
 const api={calculate,calculateFromDistribution,buildScoreDistribution,splitLine};
 root.FootballTimeAsianHandicap=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
