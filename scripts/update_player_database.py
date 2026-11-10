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
MAX_TEAMS=90
session=requests.Session()
session.headers.update({"x-apisports-key":KEY})

def norm(s):
 s=unicodedata.normalize("NFKD",str(s or "")).encode("ascii","ignore").decode()
 return re.sub(r"[^a-z0-9]","",s.lower())

def get(path,params):
 r=session.get(API+path,params=params,timeout=35)
 r.raise_for_status()
 d=r.json()
 if d.get("errors"): raise RuntimeError(f"API error {path}: {d['errors']}")
 return d

def num(v):
 if v in (None,""): return None
 try: return float(v) if isinstance(v,str) and "." in v else int(v)
 except (ValueError,TypeError): return None

def main():
 football=json.loads(FDB.read_text(encoding="utf-8"))
 try: old=json.loads(PDB.read_text(encoding="utf-8"))
 except (OSError,json.JSONDecodeError): old={"records":[],"nextTeamOffset":0}
 records={r["id"]:r for r in old.get("records",[]) if isinstance(r,dict) and r.get("id")}
 league_names={x["id"]:x.get("name",x["id"]) for x in football.get("leagues",[])}
 api_teams={}; season_info={}
 for lid,api_lid in LEAGUES.items():
  memberships=[x for x in football.get("teamSeasons",[]) if x.get("leagueId")==lid]
  season=max((x.get("season","") for x in memberships),default="")
  year=int(season[:4]) if season[:4].isdigit() else datetime.now(timezone.utc).year
  season_info[lid]=(season,year)
  payload=get("/teams",{"league":api_lid,"season":year})
  api_teams[lid]={norm((x.get("team") or {}).get("name")):x for x in payload.get("response",[])}
  time.sleep(1)
 targets=[]
 teams_by_id={t["id"]:t for t in football.get("teams",[])}
 for m in football.get("teamSeasons",[]):
  lid=m.get("leagueId")
  if lid not in LEAGUES: continue
  team=teams_by_id.get(m.get("teamId"))
  if not team: continue
  hit=api_teams[lid].get(norm(team.get("name"))) or api_teams[lid].get(norm(team.get("shortName")))
  api_team=(hit or {}).get("team") or {}
  if api_team.get("id") is not None:
   season,year=season_info[lid]
   targets.append((lid,season,year,m,team,api_team))
 targets.sort(key=lambda x:(x[0],x[4].get("name","")))
 if not targets: raise RuntimeError("No exact team-name matches; existing player database was not changed.")
 offset=int(old.get("nextTeamOffset",0))%len(targets)
 batch=(targets[offset:]+targets[:offset])[:MAX_TEAMS]
 fetched=datetime.now(timezone.utc).isoformat()
 for lid,season,year,m,team,api_team in batch:
  payload=get("/players",{"team":api_team["id"],"league":LEAGUES[lid],"season":year,"page":1})
  for item in payload.get("response",[]):
   p=item.get("player") or {}
   if not p.get("id"): continue
   for row in item.get("statistics") or []:
    rt=row.get("team") or {}; rl=row.get("league") or {}
    if rt.get("id") not in (None,api_team["id"]) or rl.get("id") not in (None,LEAGUES[lid]): continue
    g=row.get("games") or {}; goals=row.get("goals") or {}; shots=row.get("shots") or {}; passes=row.get("passes") or {}
    tackles=row.get("tackles") or {}; duels=row.get("duels") or {}; drib=row.get("dribbles") or {}; fouls=row.get("fouls") or {}; cards=row.get("cards") or {}; pen=row.get("penalty") or {}
    pid="api-football:"+str(p["id"])
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
      "providerLeagueId":LEAGUES[lid],"season":year,"endpoint":"/players","fetchedAt":fetched}
    }
  time.sleep(1)
 next_offset=(offset+len(batch))%len(targets)
 output={"schemaVersion":1,"generatedAt":fetched,
  "source":{"provider":"API-Football","status":"synced","matchedTeams":len(targets),
   "processedTeams":len(batch),"requestsUsedApprox":5+len(batch),"freePlanNote":"Imports page 1 only per team; API free-plan pagination is limited."},
  "nextTeamOffset":next_offset,
  "records":sorted(records.values(),key=lambda x:(x.get("leagueId",""),x.get("teamName",""),x.get("name","")))}
 PDB.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"matched={len(targets)} processed={len(batch)} records={len(records)} next_offset={next_offset}")

if __name__=="__main__": main()
