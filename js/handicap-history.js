/* Immutable local Handicap snapshots and independent outcome evaluation. */
(function(root){
 "use strict";
 const OUTCOMES=["fullWin","halfWin","push","halfLoss","fullLoss"];
 function splitLine(line){
  const quarter=Math.abs(line*4-Math.round(line*4))<1e-8&&Math.abs(Math.round(line*4))%2===1;
  return quarter?[line-0.25,line+0.25]:[line];
 }
 function settle(margin,line){
  const value=margin+line;
  if(Math.abs(value)<1e-9)return "push";
  return value>0?"win":"loss";
 }
 function settleMatch(homeScore,awayScore,line){
  if(!Number.isInteger(homeScore)||homeScore<0||!Number.isInteger(awayScore)||awayScore<0||typeof line!=="number"||!Number.isFinite(line))return null;
  const states=splitLine(Number(line)).map(part=>settle(homeScore-awayScore,part));
  if(states.every(x=>x==="win"))return "fullWin";
  if(states.every(x=>x==="loss"))return "fullLoss";
  if(states.every(x=>x==="push"))return "push";
  if(states.includes("win"))return "halfWin";
  if(states.includes("loss"))return "halfLoss";
  return "push";
 }
 function validProbabilities(p){
  return !!p&&OUTCOMES.every(k=>Number.isFinite(p[k])&&p[k]>=0&&p[k]<=100)&&Math.abs(OUTCOMES.reduce((n,k)=>n+p[k],0)-100)<=1.1;
 }
 function isValidSnapshot(s){
  return !!s&&typeof s.matchId==="string"&&s.matchId.length>0&&typeof s.homeLine==="number"&&Number.isFinite(s.homeLine)&&
   typeof s.createdAt==="string"&&Number.isFinite(Date.parse(s.createdAt))&&
   typeof s.utcDate==="string"&&Number.isFinite(Date.parse(s.utcDate))&&
   typeof s.source==="string"&&s.source.trim().length>0&&validProbabilities(s.probabilities);
 }
 function fingerprint(s){
  if(!s)return "";
  const sources=Array.isArray(s.sources)?s.sources.map(x=>[x.bookmaker,x.homeLine,x.updatedAt]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):[];
  return JSON.stringify([s.matchId,Number(s.homeLine),s.source,sources,s.modelVersion||""]);
 }
 function summarize(rows){
  const counts=Object.fromEntries(OUTCOMES.map(k=>[k,0]));
  let brier=0,logLoss=0,correct=0;
  rows.forEach(({snapshot,actualOutcome})=>{
   counts[actualOutcome]++;
   const predicted=OUTCOMES.reduce((best,k)=>snapshot.probabilities[k]>snapshot.probabilities[best]?k:best,OUTCOMES[0]);
   if(predicted===actualOutcome)correct++;
   OUTCOMES.forEach(k=>{brier+=Math.pow(snapshot.probabilities[k]/100-(k===actualOutcome?1:0),2);});
   logLoss-=Math.log(Math.max(0.0001,snapshot.probabilities[actualOutcome]/100));
  });
  const count=rows.length,rates=Object.fromEntries(OUTCOMES.map(k=>[k,count?counts[k]/count:null]));
  const calibration=OUTCOMES.map(k=>({outcome:k,meanProbability:count?rows.reduce((n,row)=>n+row.snapshot.probabilities[k]/100,0)/count:null,observedRate:count?counts[k]/count:null}));
  return {count,counts,rates,correct,accuracy:count?correct/count:null,winRate:count?(counts.fullWin+counts.halfWin)/count:null,brier:count?brier/count:null,logLoss:count?logLoss/count:null,calibration};
 }
 function calculateHandicapMetrics(snapshots,matches){
  const all=Array.isArray(snapshots)?snapshots:[];
  const byId=new Map((Array.isArray(matches)?matches:[]).filter(m=>m&&m.providerMatchId!==undefined).map(m=>[String(m.providerMatchId),m]));
  const valid=[],evaluatedRows=[];
  all.forEach(snapshot=>{
   if(!isValidSnapshot(snapshot))return;
   const kickoff=Date.parse(snapshot.utcDate),created=Date.parse(snapshot.createdAt);
   if(created>=kickoff)return;
   valid.push(snapshot);
   const match=byId.get(snapshot.matchId);
   if(!match||match.status!=="FINISHED"||!Number.isInteger(match.homeScore)||!Number.isInteger(match.awayScore)||match.homeScore<0||match.awayScore<0)return;
   const actualOutcome=settleMatch(match.homeScore,match.awayScore,Number(snapshot.homeLine));
   if(actualOutcome)evaluatedRows.push({snapshot,match,actualOutcome});
  });
  const byLeague=new Map();
  evaluatedRows.forEach(row=>{
   const id=row.snapshot.leagueId||row.match.leagueId||"unknown";
   if(!byLeague.has(id))byLeague.set(id,[]);
   byLeague.get(id).push(row);
  });
  return {
   totalSnapshots:all.length,
   validPreMatch:valid.length,
   evaluated:evaluatedRows.length,
   pending:Math.max(0,valid.length-evaluatedRows.length),
   excluded:Math.max(0,all.length-valid.length),
   overall:summarize(evaluatedRows),
   byLeague:[...byLeague].map(([leagueId,rows])=>({leagueId,...summarize(rows)})),
   evaluatedRows
  };
 }
 root.FootballTimeHandicapHistory={outcomes:OUTCOMES.slice(),splitLine,settleMatch,validProbabilities,isValidSnapshot,fingerprint,calculateHandicapMetrics};
 if(typeof module!=="undefined"&&module.exports)module.exports=root.FootballTimeHandicapHistory;
})(typeof window!=="undefined"?window:globalThis);
