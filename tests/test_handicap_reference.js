"use strict";
const assert=require("node:assert/strict");
const reference=require("../js/handicap-reference.js");
const {findEvent,selectReference}=reference;
const kickoff="2026-11-20T19:30:00Z";
const match={leagueId:"BL1",homeTeamName:"Bayern Munich",awayTeamName:"1. FC Koln",utcDate:kickoff};
const event={leagueId:"BL1",homeTeam:"Bayern Munich",awayTeam:"1. FC Köln",commenceTime:kickoff,provider:"The Odds API",bookmakers:[
 {bookmaker:"Source A",homeLine:-2.5,lastUpdate:"2026-11-11T15:00:00Z"},
 {bookmaker:"Source B",homeLine:-2.75,lastUpdate:"2026-11-11T16:00:00Z"},
 {bookmaker:"Source C",homeLine:-3,lastUpdate:"2026-11-11T14:00:00Z"},
 {bookmaker:"Old Source",homeLine:-4,lastUpdate:"2026-11-09T00:00:00Z"},
 {bookmaker:"Future Source",homeLine:-2,lastUpdate:"2026-11-11T18:00:00Z"}
]};
assert.equal(findEvent(match,[event]),event);
assert.equal(findEvent({...match,leagueId:"PL"},[event]),null);
assert.equal(findEvent({...match,awayTeamName:"Dortmund"},[event]),null);
assert.equal(findEvent({...match,utcDate:"2026-11-21T02:00:00Z"},[event]),null);

// Provider aliases must resolve the exact Troyes vs Le Havre fixture without fuzzy matching.
const troyesMatch={leagueId:"FL1",homeTeamName:"ES Troyes AC",awayTeamName:"Le Havre AC",utcDate:"2026-11-20T19:45:00Z"};
const troyesEvent={leagueId:"FL1",homeTeam:"Troyes",awayTeam:"Le Havre",commenceTime:"2026-11-20T19:45:00Z",bookmakers:[]};
assert.equal(findEvent(troyesMatch,[troyesEvent]),troyesEvent);
assert.equal(findEvent({...troyesMatch,awayTeamName:"Le Havre United"},[troyesEvent]),null);
assert.equal(findEvent({...troyesMatch,leagueId:"PL"},[troyesEvent]),null);

const selected=selectReference(event,Date.parse("2026-11-11T17:00:00Z"));
assert.equal(selected.status,"ready");
assert.equal(selected.freshSourceCount,3);
assert.equal(selected.selected.line,-2.75);
assert.deepEqual(selected.selected.items.map(x=>x.bookmaker),["Source B"]);
assert.equal(selected.selected.latest,Date.parse("2026-11-11T16:00:00Z"));
const stale=selectReference({bookmakers:[{homeLine:-0.5,lastUpdate:"2026-11-09T00:00:00Z"}]},Date.parse("2026-11-11T17:00:00Z"));
assert.equal(stale.status,"stale");
const missing=selectReference({bookmakers:[]},Date.now());
assert.equal(missing.status,"missing");
const actualOffered=[-3,-2.75,-2.5];
assert.ok(actualOffered.includes(selected.selected.line),"reference line must be an actually offered fresh line");

 // Integration contract: every current provider event must resolve to exactly one fixture
 // in the club database using explicit aliases, competition identity, home/away order and kickoff.
 const fs=require("node:fs");
 const path=require("node:path");
 const database=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/football-database.json"),"utf8"));
 const oddsData=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/asian-handicap-odds.json"),"utf8"));
 assert.ok(oddsData.events.length>0,"provider snapshot must contain events for integration coverage");
 const matchedFixtureIds=[];
 for(const providerEvent of oddsData.events){
  const fixtures=database.matches.filter(candidate=>findEvent(candidate,[providerEvent])===providerEvent);
  assert.equal(fixtures.length,1, "expected one unique DB fixture for "+providerEvent.leagueId+": "+providerEvent.homeTeam+" vs "+providerEvent.awayTeam);
  matchedFixtureIds.push(fixtures[0].providerMatchId ?? fixtures[0].id);
 }
 assert.equal(new Set(matchedFixtureIds).size,matchedFixtureIds.length,"provider events must not resolve to the same DB fixture");

console.log("Automatic fresh Handicap reference selection and live-snapshot integration tests: PASSED");
