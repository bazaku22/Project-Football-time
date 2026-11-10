import json, os, re, time, unicodedata
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
PDB=ROOT/"data/player-database.json"
FDB=ROOT/"data/football-database.json"
BASE="https://mcp.strikerapi.com/v1"
KEY=os.environ["STRIKERAPI_API_KEY"]
LEAGUES={
 "PL":{"api":"soccer","name":"Premier League"},
 "PD":{"api":"laliga","name":"La Liga"},
 "BL1":{"api":"bundesliga","name":"Bundesliga"},
 "SA":{"api":"seriea","name":"Serie A"},
 "FL1":{"api":"ligue1","name":"Ligue 1"},
}
PROFILE_LIMIT=60
MIN_INTERVAL=6.5
last_call=0.0
session=requests.Session()
session.headers.update({"x-api-key":KEY,"Content-Type":"application/json"})

def norm(value):
 value=unicodedata.normalize("NFKD",str(value or "")).encode("ascii","ignore").decode().lower()
 value=re.sub(r"\b(fc|cf|afc|sc|sv|ac|as|ss|calcio|club|de|the)\b"," ",value)
 return re.sub(r"[^a-z0-9]","",value)

def call(endpoint,payload):
 global last_call
 wait=MIN_INTERVAL-(time.monotonic()-last_call)
 if wait>0: time.sleep(wait)
 response=session.post(BASE+"/"+endpoint,json=payload,timeout=60)
 last_call=time.monotonic()
 if response.status_code==402:
  raise RuntimeError("STRIKERAPI_CREDITS_EXHAUSTED")
 if response.status_code==429:
  raise RuntimeError("STRIKERAPI_RATE_LIMITED")
 response.raise_for_status()
 body=response.json()
 if isinstance(body,dict) and body.get("error"):
  message=str(body.get("message") or body["error"])
  if "credit" in message.lower(): raise RuntimeError("STRIKERAPI_CREDITS_EXHAUSTED: "+message)
  raise RuntimeError("StrikerAPI "+endpoint+" error: "+message)
 return body.get("data",body) if isinstance(body,dict) else body

def number(value):
 if value in (None,""): return None
 try: return float(value) if isinstance(value,float) else int(value)
 except (ValueError,TypeError): return None

def main():
 old=json.loads(PDB.read_text(encoding="utf-8")) if PDB.exists() else {"records":[]}
 football=json.loads(FDB.read_text(encoding="utf-8")) if FDB.exists() else {}
 old_records={r["id"]:r for r in old.get("records",[]) if isinstance(r,dict) and r.get("id")}
 teams=football.get("teams",[])
 team_lookup={}
 for team in teams:
  for name in (team.get("name"),team.get("shortName"),team.get("displayName")):
   if norm(name): team_lookup[norm(name)]=team
 records={}
 fetched=datetime.now(timezone.utc).isoformat()
 squad_counts={}
 latest_seasons={}
 # One whole-league squad call costs 10 credits; five calls cover all five leagues.
 for league_id,config in LEAGUES.items():
  data=call("get_squad",{"league":config["api"]})
  season=data.get("season")
  if season is not None: latest_seasons[league_id]=str(season)
  players=data.get("players") or []
  squad_counts[league_id]=len(players)
  for player in players:
   pid=str(player.get("player_id") or "")
   name=player.get("name")
   if not pid or not name: continue
   external_team_id=str(player.get("team_id") or data.get("team_id") or "")
   team_name=player.get("team_name") or player.get("team") or data.get("team_name") or "Unknown team"
   mapped=team_lookup.get(norm(team_name))
   pft_team_id=str(mapped.get("id")) if mapped and mapped.get("id") is not None else "strikerapi:"+external_team_id if external_team_id else "strikerapi:"+norm(team_name)
   pft_team_name=mapped.get("name") if mapped else team_name
   season_value=str(player.get("season") or season or "2026")
   player_key="strikerapi:"+pid
   rid=f"{player_key}:{pft_team_id}:{season_value}"
   previous=old_records.get(rid,{})
   stats=dict(previous.get("statistics") or {})
   stats.setdefault("appearances",number(player.get("appearances")))
   stats.setdefault("lineups",None); stats.setdefault("minutes",None)
   for key in ("rating","goals","assists","shotsTotal","shotsOnTarget","xg","yellowCards","redCards","saves","cleanSheets","goalsPer90","assistsPer90","xgPer90"):
    stats.setdefault(key,None)
   records[rid]={
    "id":rid,"playerId":player_key,"name":name,"age":number(player.get("age")),
    "nationality":player.get("citizenship"),"height":str(player.get("height_in"))+" in" if player.get("height_in") else None,
    "weight":str(player.get("weight_lb"))+" lb" if player.get("weight_lb") else None,
    "photo":None,"number":number(player.get("jersey")),"position":player.get("position"),
    "teamId":pft_team_id,"teamName":pft_team_name,"leagueId":league_id,
    "leagueName":config["name"],"season":season_value,"statistics":stats,
    "profileStatus":previous.get("profileStatus","roster_only"),
    "source":{"provider":"StrikerAPI","providerPlayerId":pid,"providerTeamId":external_team_id,
     "league":config["api"],"season":season_value,"endpoint":"get_squad","fetchedAt":fetched}
   }
 if not records:
  raise RuntimeError("StrikerAPI returned no squad records; existing player database was preserved.")
 # Rotate through the full roster. get_player costs 5 credits; reserve credits for future runs.
 roster=sorted(records.values(),key=lambda r:(r["leagueId"],r["teamName"],r["name"]))
 offset=int(old.get("nextProfileOffset",0))%len(roster)
 batch=roster[offset:offset+PROFILE_LIMIT]
 if len(batch)<PROFILE_LIMIT:
  batch+=roster[:PROFILE_LIMIT-len(batch)]
 profiles_done=0
 profile_errors=[]
 for record in batch:
  try:
   result=call("get_player",{"player_id":record["source"]["providerPlayerId"],"league":LEAGUES[record["leagueId"]]["api"]})
  except RuntimeError as error:
   message=str(error)
   profile_errors.append(message)
   print("Profile sync stopped:",message,flush=True)
   break
  player=result.get("player") or {}
  seasons=result.get("seasons") or []
  selected=next((s for s in seasons if str(s.get("season"))==record["season"] and (not s.get("team") or s.get("team")==player.get("team"))),None)
  if selected is None and seasons: selected=seasons[0]
  if selected:
   mapping={
    "appearances":"appearances","lineups":"starts","minutes":"minutes","goals":"goals",
    "assists":"assists","shotsTotal":"shots","shotsOnTarget":"shots_on_target","xg":"xg",
    "yellowCards":"yellow_cards","redCards":"red_cards","saves":"saves","cleanSheets":"clean_sheets",
    "goalsPer90":"goals_per90","assistsPer90":"assists_per90","xgPer90":"xg_per90"
   }
   for target,source in mapping.items(): record["statistics"][target]=selected.get(source)
   record["season"]=str(selected.get("season") or record["season"])
  record["position"]=player.get("position") or record.get("position")
  record["number"]=number(player.get("jersey")) if player.get("jersey") is not None else record.get("number")
  record["profileStatus"]="profiled"
  record["source"].update({"provider":"StrikerAPI","profileEndpoint":"get_player","profileFetchedAt":fetched})
  record["recentGames"]=result.get("recent_games") or []
  profiles_done+=1
 next_offset=(offset+profiles_done)%len(roster)
 # Merge roster with old data, retaining old records for players not in the current squad feed.
 merged=dict(old_records)
 merged.update(records)
 output={
  "schemaVersion":1,"generatedAt":fetched,
  "source":{"provider":"StrikerAPI","status":"current_squads_with_rotating_profiles",
   "leagues":{k:{"name":LEAGUES[k]["name"],"season":latest_seasons.get(k),"squadPlayers":squad_counts.get(k,0)} for k in LEAGUES},
   "profilesFetchedThisRun":profiles_done,"profileBatchLimit":PROFILE_LIMIT,
   "creditsPlanEstimate":"50 credits for five league squads + up to 300 credits for 60 player profiles; leaves an estimated 150-credit monthly buffer.",
   "note":"Current squad lists are refreshed from StrikerAPI. Detailed player profiles rotate through the roster to stay within the free monthly credit allowance. Unprofiled players show roster data and null statistics; missing values are never inferred.",
   "profileErrors":profile_errors},
  "nextProfileOffset":next_offset,
  "records":sorted(merged.values(),key=lambda r:(r.get("leagueId",""),r.get("teamName",""),r.get("name",""),r.get("season","")))
 }
 PDB.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("Squad records:",len(records),"profiles fetched:",profiles_done,"total stored:",len(merged),"next profile offset:",next_offset,flush=True)

if __name__=="__main__":
 main()
