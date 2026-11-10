import json, os, re, time, unicodedata
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
FDB=ROOT/"data/football-database.json"
PDB=ROOT/"data/player-database.json"
API="https://v3.football.api-sports.io"
KEY=os.environ["API_KEY"]
LEAGUES={"PL":39,"PD":140,"BL1":78,"SA":135,"FL1":61}
API_SEASON=2024
MAX_TEAMS=80
MIN_REQUEST_INTERVAL=6.5
LAST_REQUEST=0.0
session=requests.Session()
session.headers.update({"x-apisports-key":KEY})

def norm(s):
 s=unicodedata.normalize("NFKD",str(s or "")).encode("ascii","ignore").decode().lower()
 s=re.sub(r"\b(fc|cf|afc|sc|sv|ac|as|ss|calcio|club|de|the)\b"," ",s)
 return re.sub(r"[^a-z0-9]","",s)

def get(path,params):
 global LAST_REQUEST
 for attempt in range(4):
  wait=MIN_REQUEST_INTERVAL-(time.monotonic()-LAST_REQUEST)
  if wait>0: time.sleep(wait)
  r=session.get(API+path,params=params,timeout=45)
  LAST_REQUEST=time.monotonic()
  if r.status_code==429:
   retry=r.headers.get("Retry-After")
   try: delay=max(65,int(retry)) if retry else 65
   except ValueError: delay=65
   if attempt==3: r.raise_for_status()
   print(f"Rate limited on {path}; waiting {delay}s before retry.",flush=True)
   time.sleep(delay)
   continue
  r.raise_for_status()
  d=r.json()
  if d.get("errors"):
   raise RuntimeError(f"API error {path} params={params}: {d['errors']}")
  return d
 raise RuntimeError(f"API rate limit retries exhausted for {path}")

def num(v):
 if v in (None,""): return None
 try: return float(v) if isinstance(v,str) and "." in v else int(v)
 except (ValueError,TypeError): return None

def main():
 status=get("/status",{})
 status_data=status.get("response") or {}
 requests_data=status_data.get("requests") or {}
 daily_limit=int(requests_data.get("limit_day") or 100)
 daily_used=int(requests_data.get("current") or 0)
 daily_remaining=max(0,daily_limit-daily_used)
 print(f"API quota before sync: {daily_used}/{daily_limit} used; {daily_remaining} remaining.",flush=True)
 if daily_remaining<6:
  raise RuntimeError("Fewer than 6 daily API requests remain; sync safely skipped.")
 football=json.loads(FDB.read_text(encoding="utf-8"))
 try: old=json.loads(PDB.read_text(encoding="utf-8"))
 except (OSError,json.JSONDecodeError): old={"records":[],"nextTeamOffset":0}
 records={r["id"]:r for r in old.get("records",[]) if isinstance(r,dict) and r.get("id")}
 league_names={x["id"]:x.get("name",x["id"]) for x in football.get("leagues",[])}
 teams_by_id={t["id"]:t for t in football.get("teams",[])}
 memberships=football.get("teamSeasons",[])
 api_teams={}
 for lid,api_lid in LEAGUES.items():
  payload=get("/teams",{"league":api_lid,"season":API_SEASON})
  api_teams[lid]={}
  for entry in payload.get("response",[]):
   team=entry.get("team") or {}
   key=norm(team.get("name"))
   if key: api_teams[lid][key]=team
  if not api_teams[lid]:
   raise RuntimeError(f"No API-Football teams returned for {lid}, season {API_SEASON}")
 targets=[]
 for m in memberships:
  lid=m.get("leagueId")
  if lid not in LEAGUES: continue
  team=teams_by_id.get(m.get("teamId"))
  if not team: continue
  candidates=[norm(team.get("name")),norm(team.get("shortName"))]
  hits=[api_teams[lid][key] for key in candidates if key and key in api_teams[lid]]
  # Only accept an unambiguous normalized exact-name match.
  unique={x.get("id"):x for x in hits if x.get("id") is not None}
  if len(unique)==1:
   api_team=next(iter(unique.values()))
   targets.append((lid,m,team,api_team))
 targets_by_id={x[2]["id"]:x for x in targets}
 targets=list(targets_by_id.values())
 targets.sort(key=lambda x:(x[0],x[2].get("name","")))
 if not targets:
  raise RuntimeError("No unambiguous team-name matches in the free historical season 2024; database was not changed.")
 offset=int(old.get("nextTeamOffset",0))%len(targets)
 safe_team_budget=max(0,daily_remaining-5)
 batch_limit=min(MAX_TEAMS,len(targets),safe_team_budget)
 if batch_limit<1:
  raise RuntimeError("Insufficient daily API quota for a safe player sync batch.")
 batch=(targets[offset:]+targets[:offset])[:batch_limit]
 fetched=datetime.now(timezone.utc).isoformat()
 fetched_records=0
 for lid,m,team,api_team in batch:
  payload=get("/players",{"team":api_team["id"],"league":LEAGUES[lid],"season":API_SEASON,"page":1})
  for item in payload.get("response",[]):
   p=item.get("player") or {}
   if not p.get("id"): continue
   for row in item.get("statistics") or []:
    rt=row.get("team") or {}; rl=row.get("league") or {}
    if rt.get("id") not in (None,api_team["id"]) or rl.get("id") not in (None,LEAGUES[lid]): continue
    g=row.get("games") or {}; goals=row.get("goals") or {}; shots=row.get("shots") or {}; passes=row.get("passes") or {}
    tackles=row.get("tackles") or {}; duels=row.get("duels") or {}; drib=row.get("dribbles") or {}; fouls=row.get("fouls") or {}; cards=row.get("cards") or {}; pen=row.get("penalty") or {}
    pid="api-football:"+str(p["id"])
    season=str(API_SEASON)
    rid=f"{pid}:{m['teamId']}:{season}"
    records[rid]={
     "id":rid,"playerId":pid,"name":p.get("name") or "Unknown","age":num(p.get("age")),
     "nationality":p.get("nationality"),"height":p.get("height"),"weight":p.get("weight"),
     "photo":p.get("photo"),"number":num(p.get("number")),"position":g.get("position"),
     "teamId":m["teamId"],"teamName":team.get("name"),"leagueId":lid,
     "leagueName":league_names.get(lid,lid),"season":season,
     "statistics":{
      "appearances":num(g.get("appearences")),"lineups":num(g.get("lineups")),"minutes":num(g.get("minutes")),
      "rating":num(g.get("rating")),"goals":num(goals.get("total")),"assists":num(goals.get("assists")),
      "shotsTotal":num(shots.get("total")),"shotsOnTarget":num(shots.get("on")),
      "passesTotal":num(passes.get("total")),"keyPasses":num(passes.get("key")),"passAccuracy":num(passes.get("accuracy")),
      "tackles":num(tackles.get("total")),"blocks":num(tackles.get("blocks")),"interceptions":num(tackles.get("interceptions")),
      "duelsTotal":num(duels.get("total")),"duelsWon":num(duels.get("won")),
      "dribblesAttempts":num(drib.get("attempts")),"dribblesSuccess":num(drib.get("success")),
      "foulsDrawn":num(fouls.get("drawn")),"foulsCommitted":num(fouls.get("committed")),
      "yellowCards":num(cards.get("yellow")),"redCards":num(cards.get("red")),
      "penaltiesScored":num(pen.get("scored")),"penaltiesMissed":num(pen.get("missed"))
     },
     "source":{"provider":"API-Football","providerPlayerId":p["id"],"providerTeamId":api_team["id"],
      "providerLeagueId":LEAGUES[lid],"season":API_SEASON,"endpoint":"/players","fetchedAt":fetched}
    }
    fetched_records+=1
 if fetched_records==0:
  raise RuntimeError("API calls succeeded but returned no player statistics; existing database was preserved.")
 next_offset=(offset+len(batch))%len(targets)
 output={"schemaVersion":1,"generatedAt":fetched,
  "source":{"provider":"API-Football","status":"partial_historical_sync","season":API_SEASON,
   "matchedTeams":len(targets),"processedTeams":len(batch),"recordsFetchedThisRun":fetched_records,
   "requestsUsedApprox":6+len(batch),"dailyQuotaAtStart":{"used":daily_used,"limit":daily_limit,"remaining":daily_remaining},
   "coverageNote":"Free plan currently permits seasons 2022-2024. This dataset is historical 2024 season data, not current 2026-27 squad data. Only page 1 per team is imported; remaining teams rotate across runs. Requests are spaced to stay below the 10-per-minute free-plan limit."},
  "nextTeamOffset":next_offset,
  "records":sorted(records.values(),key=lambda x:(x.get("leagueId",""),x.get("teamName",""),x.get("name",""),x.get("season","")))}
 PDB.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"season={API_SEASON} matched={len(targets)} processed={len(batch)} fetched_this_run={fetched_records} total_records={len(records)} next_offset={next_offset}")

if __name__=="__main__": main()
