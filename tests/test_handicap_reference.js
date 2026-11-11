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
console.log("Automatic fresh Handicap reference selection tests: PASSED");
