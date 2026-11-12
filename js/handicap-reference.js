/* Select an automatically referenced Asian Handicap line from fresh provider data. */
(function(root){
 "use strict";
 const MAX_AGE_MS=24*60*60*1000;
 const MATCH_WINDOW_MS=6*60*60*1000;
 // Explicit aliases bridge provider display names to the canonical club names in the football database.
 // Keep this list narrow: do not use fuzzy or token-subset matching for fixture identity.
 const TEAM_ALIASES={
  "es troyes ac":"troyes",
  "le havre ac":"le havre"
 };
 function normalizeTeam(value){
  const normalized=String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  return TEAM_ALIASES[normalized]||normalized;
 }
 function findEvent(match,events){
  if(!match||!Array.isArray(events))return null;
  const home=normalizeTeam(match.homeTeamName),away=normalizeTeam(match.awayTeamName),kickoff=Date.parse(match.utcDate||"");
  if(!home||!away||!Number.isFinite(kickoff))return null;
  return events.find(event=>{
   if(String(event?.leagueId||"")!==String(match.leagueId||""))return false;
   if(normalizeTeam(event.homeTeam)!==home||normalizeTeam(event.awayTeam)!==away)return false;
   const eventKickoff=Date.parse(event.commenceTime||"");
   return Number.isFinite(eventKickoff)&&Math.abs(eventKickoff-kickoff)<=MATCH_WINDOW_MS;
  })||null;
 }
 function selectReference(event,nowValue){
  if(!event||!Array.isArray(event.bookmakers)||!event.bookmakers.length)return {status:"missing",event:event||null,rows:[],freshRows:[],selected:null};
  const now=nowValue instanceof Date?nowValue.getTime():Number(nowValue??Date.now());
  const rows=event.bookmakers.filter(row=>row&&typeof row.homeLine==="number"&&Number.isFinite(row.homeLine)).map(row=>({...row,updatedAt:Date.parse(row.lastUpdate||"")}));
  const freshRows=rows.filter(row=>Number.isFinite(row.updatedAt)&&row.updatedAt<=now&&now-row.updatedAt<=MAX_AGE_MS);
  if(!freshRows.length)return {status:"stale",event,rows,freshRows,selected:null};
  const offered=[...new Set(freshRows.map(row=>Number(row.homeLine)))].sort((a,b)=>a-b);
  const line=offered[Math.floor((offered.length-1)/2)];
  const items=freshRows.filter(row=>Number(row.homeLine)===line).sort((a,b)=>b.updatedAt-a.updatedAt);
  const latest=Math.max(...items.map(row=>row.updatedAt));
  return {status:"ready",event,rows,freshRows,selected:{line,items,latest},freshSourceCount:freshRows.length};
 }
 const api={MAX_AGE_MS,MATCH_WINDOW_MS,normalizeTeam,findEvent,selectReference};
 root.FootballTimeHandicapReference=api;
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
