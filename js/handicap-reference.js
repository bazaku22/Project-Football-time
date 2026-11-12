/* Select an automatically referenced Asian Handicap line from fresh provider data. */
(function(root){
 "use strict";
 const MAX_AGE_MS=24*60*60*1000;
 const MATCH_WINDOW_MS=6*60*60*1000;
 // Explicit provider/database name pairs observed in the current 48-event odds snapshot.
 // Both spellings map to one canonical key. Unknown names remain exact-match only; no fuzzy matching.
 const TEAM_ALIAS_PAIRS=[["Bayern Munich","FC Bayern München"],["Troyes","ES Troyes AC"],["Le Havre","Le Havre AC"],["Athletic Bilbao","Athletic Club"],["Espanyol","RCD Espanyol de Barcelona"],["Manchester City","Manchester City FC"],["Fulham","Fulham FC"],["Alavés","Deportivo Alavés"],["Deportivo La Coruña","RC Deportivo La Coruña"],["Como","Como 1907"],["Cagliari","Cagliari Calcio"],["Lazio","SS Lazio"],["Lecce","US Lecce"],["Bayer Leverkusen","Bayer 04 Leverkusen"],["SC Paderborn","SC Paderborn 07"],["TSG Hoffenheim","TSG 1899 Hoffenheim"],["Elversberg","SV 07 Elversberg"],["Union Berlin","1. FC Union Berlin"],["Aston Villa","Aston Villa FC"],["Sunderland","Sunderland AFC"],["Bournemouth","AFC Bournemouth"],["Nottingham Forest","Nottingham Forest FC"],["Chelsea","Chelsea FC"],["Leeds United","Leeds United FC"],["Coventry City","Coventry City FC"],["Crystal Palace","Crystal Palace FC"],["Tottenham Hotspur","Tottenham Hotspur FC"],["Ipswich Town","Ipswich Town FC"],["Rayo Vallecano","Rayo Vallecano de Madrid"],["Valencia","Valencia CF"],["Nice","OGC Nice"],["Paris Saint Germain","Paris Saint-Germain FC"],["Parma","Parma Calcio 1913"],["Newcastle United","Newcastle United FC"],["Arsenal","Arsenal FC"],["Sevilla","Sevilla FC"],["Real Betis","Real Betis Balompié"],["Napoli","SSC Napoli"],["Torino","Torino FC"],["AS Monaco","AS Monaco FC"],["Auxerre","AJ Auxerre"],["Strasbourg","RC Strasbourg Alsace"],["Brest","Stade Brestois 29"],["Lille","Lille OSC"],["Lyon","Olympique Lyonnais"],["RC Lens","Racing Club de Lens"],["Toulouse","Toulouse FC"],["Real Madrid","Real Madrid CF"],["Celta Vigo","RC Celta de Vigo"],["Juventus","Juventus FC"],["Venezia","Venezia FC"],["Barcelona","FC Barcelona"],["Villarreal","Villarreal CF"],["Hull City","Hull City AFC"],["Brighton and Hove Albion","Brighton & Hove Albion FC"],["Bologna","Bologna FC 1909"],["Udinese","Udinese Calcio"],["Sassuolo","US Sassuolo Calcio"],["Genoa","Genoa CFC"],["Angers","Angers SCO"],["Augsburg","FC Augsburg"],["FSV Mainz 05","1. FSV Mainz 05"],["Real Sociedad","Real Sociedad de Fútbol"],["Lorient","FC Lorient"],["Rennes","Stade Rennais FC 1901"],["Werder Bremen","SV Werder Bremen"],["Frosinone","Frosinone Calcio"],["Málaga","Málaga CF"],["Inter Milan","FC Internazionale Milano"],["Marseille","Olympique de Marseille"],["Getafe","Getafe CF"],["Atlético Madrid","Club Atlético de Madrid"],["Monza","AC Monza"],["Fiorentina","ACF Fiorentina"],["Brentford","Brentford FC"],["Everton","Everton FC"],["Levante","Levante UD"],["Liverpool","Liverpool FC"],["Manchester United","Manchester United FC"]];
 function baseTeamName(value){
  return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
 }
 const TEAM_ALIASES=Object.create(null);
 TEAM_ALIAS_PAIRS.forEach(([providerName,databaseName])=>{
  const canonical=baseTeamName(providerName);
  TEAM_ALIASES[baseTeamName(providerName)]=canonical;
  TEAM_ALIASES[baseTeamName(databaseName)]=canonical;
 });
 function normalizeTeam(value){
  const normalized=baseTeamName(value);
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
