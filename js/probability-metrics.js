(function(root){"use strict";
const OUTCOMES=["home","draw","away"],BIN_COUNT=10;
function validVector(p){return !!p&&OUTCOMES.every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100)&&Math.abs(OUTCOMES.reduce((s,k)=>s+p[k],0)-100)<=1.1;}
function actualFromMatch(m){if(!m||m.status!=="FINISHED"||!Number.isInteger(m.homeScore)||!Number.isInteger(m.awayScore)||m.homeScore<0||m.awayScore<0)return null;return m.homeScore>m.awayScore?"home":m.homeScore===m.awayScore?"draw":"away";}
function brierFor(p,actual){return OUTCOMES.reduce((sum,k)=>sum+Math.pow(p[k]/100-(k===actual?1:0),2),0);}
function logLossFor(p,actual){return -Math.log(Math.max(.0001,p[actual]/100));}
function wilson(correct,n){if(!n)return null;const z=1.959963984540054,phat=correct/n,den=1+z*z/n,center=(phat+z*z/(2*n))/den,half=z*Math.sqrt(phat*(1-phat)/n+z*z/(4*n*n))/den;return {lower:center-half,upper:center+half,level:0.95};}
function summarize(rows){
 const topBins=Array.from({length:BIN_COUNT},(_,i)=>({min:i/BIN_COUNT,max:(i+1)/BIN_COUNT,count:0,expected:0,observed:0}));
 const classBins=Object.fromEntries(OUTCOMES.map(k=>[k,Array.from({length:BIN_COUNT},(_,i)=>({min:i/BIN_COUNT,max:(i+1)/BIN_COUNT,count:0,expected:0,observed:0}))]));
 let correct=0,brier=0,logLoss=0;
 rows.forEach(({snapshot,actualOutcome})=>{
  const p=snapshot.probabilities,chosen=OUTCOMES.reduce((best,k)=>p[k]>p[best]?k:best,"home"),hit=chosen===actualOutcome;
  if(hit)correct++;brier+=brierFor(p,actualOutcome);logLoss+=logLossFor(p,actualOutcome);
  const confidence=Math.max(...OUTCOMES.map(k=>p[k]))/100,top=topBins[Math.min(BIN_COUNT-1,Math.floor(confidence*BIN_COUNT))];
  top.count++;top.expected+=confidence;if(hit)top.observed++;
  OUTCOMES.forEach(k=>{const probability=p[k]/100,bin=classBins[k][Math.min(BIN_COUNT-1,Math.floor(probability*BIN_COUNT))];bin.count++;bin.expected+=probability;if(actualOutcome===k)bin.observed++;});
 });
 const n=rows.length,populated=topBins.filter(x=>x.count),topLabelEce=n?populated.reduce((s,x)=>s+x.count/n*Math.abs(x.expected/x.count-x.observed/x.count),0):null;
 const classwise=Object.fromEntries(OUTCOMES.map(k=>{const bins=classBins[k].filter(x=>x.count),ece=n?bins.reduce((s,x)=>s+x.count/n*Math.abs(x.expected/x.count-x.observed/x.count),0):null;return [k,{ece,bins:bins.map(x=>({min:x.min,max:x.max,count:x.count,meanProbability:x.expected/x.count,observedRate:x.observed/x.count}))}];}));
 const classwiseEce=n?OUTCOMES.reduce((s,k)=>s+classwise[k].ece,0)/OUTCOMES.length:null;
 return {count:n,correct,accuracy:n?correct/n:null,accuracy95:wilson(correct,n),brier:n?brier/n:null,logLoss:n?logLoss/n:null,ece:topLabelEce,topLabelEce,classwiseEce,bins:populated.map(x=>({min:x.min,max:x.max,count:x.count,meanProbability:x.expected/x.count,observedRate:x.observed/x.count})),classwise};
}
function calculateProbabilityMetrics(snapshots,matches,leagues){
 const all=Array.isArray(snapshots)?snapshots:[],matchRows=Array.isArray(matches)?matches:[],leagueRows=Array.isArray(leagues)?leagues:[];
 const byId=new Map(matchRows.filter(m=>m&&m.providerMatchId!==undefined).map(m=>[String(m.providerMatchId),m]));
 const names=new Map(leagueRows.map(l=>[l.id,l.name]));
 const valid=[],evaluated=[],seen=new Set();let excludedInvalid=0,excludedScope=0,excludedDuplicate=0,outcomeDisagreements=0;
 all.forEach(s=>{
  if(!s||typeof s.matchId!=="string"||!validVector(s.probabilities)){excludedInvalid++;return;}
  if(s.isInternational===true||s.scope==="international"||s.competitionType==="international"){excludedScope++;return;}
  const key=String(s.matchId)+"|"+String(s.modelVersion||"legacy/unknown");
  const kickoff=Date.parse(s.utcDate||""),created=Date.parse(s.createdAt||"");
  if(!Number.isFinite(kickoff)||!Number.isFinite(created)||created>=kickoff){excludedInvalid++;return;}
  if(seen.has(key)){excludedDuplicate++;return;}seen.add(key);
  valid.push(s);
  const match=byId.get(s.matchId),fromMatch=actualFromMatch(match),stored=["home","draw","away"].includes(s.actualOutcome)?s.actualOutcome:null;
  if(fromMatch&&stored&&fromMatch!==stored)outcomeDisagreements++;
  const actualOutcome=fromMatch||(!match?stored:null);
  if(actualOutcome)evaluated.push({snapshot:s,match:match||null,actualOutcome,outcomeSource:fromMatch?"finished_match_score":"stored_snapshot_outcome"});
 });
 const group=(rows,keyFn,labelFn)=>{const map=new Map();rows.forEach(row=>{const key=keyFn(row);if(!map.has(key))map.set(key,[]);map.get(key).push(row);});return [...map].map(([key,rows])=>({key,...labelFn(key,rows),...summarize(rows)}));};
 const byLeague=group(evaluated,r=>r.snapshot.leagueId||r.match?.leagueId||"unknown",id=>({id,name:names.get(id)||id})).sort((a,b)=>a.name.localeCompare(b.name));
 const byModel=group(evaluated,r=>r.snapshot.modelVersion||"legacy/unknown",version=>({version})).sort((a,b)=>a.version.localeCompare(b.version));
 const bySeason=group(evaluated,r=>r.snapshot.season||r.match?.season||"unknown",season=>({season})).sort((a,b)=>a.season.localeCompare(b.season));
 const byLeagueAndModel=group(evaluated,r=>(r.snapshot.leagueId||r.match?.leagueId||"unknown")+"|"+(r.snapshot.modelVersion||"legacy/unknown"),key=>{const [leagueId,version]=key.split("|");return {leagueId,leagueName:names.get(leagueId)||leagueId,version};}).sort((a,b)=>(a.leagueName+" "+a.version).localeCompare(b.leagueName+" "+b.version));
 const versions=[...new Set(evaluated.map(r=>r.snapshot.modelVersion||"legacy/unknown"))].sort(),comparisons=[];
 for(let i=0;i<versions.length;i++)for(let j=i+1;j<versions.length;j++){
  const left=versions[i],right=versions[j],leftMap=new Map(evaluated.filter(r=>(r.snapshot.modelVersion||"legacy/unknown")===left).map(r=>[r.snapshot.matchId,r]));
  const pairs=evaluated.filter(r=>(r.snapshot.modelVersion||"legacy/unknown")===right&&leftMap.has(r.snapshot.matchId)).map(r=>({a:leftMap.get(r.snapshot.matchId),b:r})).filter(p=>p.a.actualOutcome===p.b.actualOutcome);
  const avg=(rows,fn)=>rows.length?rows.reduce((sum,p)=>sum+fn(p),0)/rows.length:null;
  comparisons.push({modelA:left,modelB:right,pairedCount:pairs.length,brierDelta:avg(pairs,p=>brierFor(p.b.snapshot.probabilities,p.b.actualOutcome)-brierFor(p.a.snapshot.probabilities,p.a.actualOutcome)),logLossDelta:avg(pairs,p=>logLossFor(p.b.snapshot.probabilities,p.b.actualOutcome)-logLossFor(p.a.snapshot.probabilities,p.a.actualOutcome)),accuracyDelta:avg(pairs,p=>{const a=OUTCOMES.reduce((best,k)=>p.a.snapshot.probabilities[k]>p.a.snapshot.probabilities[best]?k:best,"home"),b=OUTCOMES.reduce((best,k)=>p.b.snapshot.probabilities[k]>p.b.snapshot.probabilities[best]?k:best,"home");return Number(b===p.b.actualOutcome)-Number(a===p.a.actualOutcome);})});
 }
 return {totalSnapshots:all.length,validPreMatch:valid.length,evaluated:evaluated.length,pending:Math.max(0,valid.length-evaluated.length),excluded:Math.max(0,all.length-valid.length),excludedInvalid,excludedScope,excludedDuplicate,outcomeDisagreements,overall:summarize(evaluated),byLeague,byModel,bySeason,byLeagueAndModel,modelComparisons:comparisons,evaluatedRows:evaluated};
}
root.FootballTimeMetrics={calculateProbabilityMetrics};
})(typeof window!=="undefined"?window:globalThis);
