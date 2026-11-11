/* Poisson score-matrix Asian Handicap settlement probabilities. */
(function(root){
 "use strict";
 function poisson(lambda,k){let p=Math.exp(-lambda);for(let i=1;i<=k;i++)p*=lambda/i;return p;}
 function splitLine(line){
  const quarter=Math.abs(line*4-Math.round(line*4))<1e-8&&Math.abs(Math.round(line*4))%2===1;
  return quarter?[line-0.25,line+0.25]:[line];
 }
 function settle(margin,line){const value=margin+line;if(Math.abs(value)<1e-9)return "push";return value>0?"win":"loss";}
 function calculate(expectedGoals,line,maxGoals){
  const limit=Number.isInteger(maxGoals)?maxGoals:12,h=Number(expectedGoals&&expectedGoals.home),a=Number(expectedGoals&&expectedGoals.away);
  if(!Number.isFinite(h)||!Number.isFinite(a)||h<=0||a<=0||!Number.isFinite(Number(line)))throw new Error("Invalid expected goals or handicap line");
  const parts=splitLine(Number(line)),out={fullWin:0,halfWin:0,push:0,halfLoss:0,fullLoss:0};let total=0;
  for(let hg=0;hg<=limit;hg++){const ph=poisson(h,hg);for(let ag=0;ag<=limit;ag++){
   const p=ph*poisson(a,ag),states=parts.map(x=>settle(hg-ag,x));total+=p;
   let key;if(states.every(x=>x==="win"))key="fullWin";else if(states.every(x=>x==="loss"))key="fullLoss";else if(states.every(x=>x==="push"))key="push";else if(states.includes("win"))key="halfWin";else if(states.includes("loss"))key="halfLoss";else key="push";
   out[key]+=p;
  }}
  Object.keys(out).forEach(key=>out[key]=out[key]/total*100);return out;
 }
 const api={calculate:calculate,splitLine:splitLine};root.FootballTimeAsianHandicap=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
