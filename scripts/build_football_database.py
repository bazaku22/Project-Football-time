import json
import os
from datetime import datetime, timezone
from phase6_league_catalog import LEAGUE_CATALOG, PROVIDER_LEAGUES

base = os.path.join(os.environ["RUNNER_TEMP"], "football-data")
os.makedirs("data", exist_ok=True)
db_path = "data/football-database.json"
previous = None
snapshots = []
if os.path.exists(db_path):
    try:
        with open(db_path, encoding="utf-8") as f: previous = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        raise RuntimeError("Refusing to rebuild: existing database is unreadable.") from e
    if not isinstance(previous, dict): raise ValueError("Existing database root must be an object.")
    snapshots = previous.get("probabilitySnapshots", [])
    if not isinstance(snapshots, list): raise ValueError("probabilitySnapshots is not a list.")

def read(code, endpoint):
    with open(os.path.join(base, f"{code}-{endpoint}.json"), encoding="utf-8") as f: return json.load(f)

def optional_elc():
    paths = [os.path.join(base, f"ELC-{e}.json") for e in ("teams","matches","standings")]
    if not all(os.path.isfile(p) for p in paths): return None
    try:
        payload = [read("ELC", e) for e in ("teams","matches","standings")]
        if not isinstance(payload[0].get("teams"), list) or not payload[0]["teams"]: return None
        if not isinstance(payload[1].get("matches"), list): return None
        groups = payload[2].get("standings")
        if not isinstance(groups, list) or not any(g.get("type")=="TOTAL" and isinstance(g.get("table"),list) and g["table"] for g in groups): return None
        return payload
    except (OSError, ValueError, TypeError, AttributeError, json.JSONDecodeError): return None

teams, team_seasons, standings, matches = {}, [], [], []
now = datetime.now(timezone.utc).isoformat()
league_sync = {}
elc = optional_elc()

def process(code, td, md, sd):
    season_info = td.get("season") or (td.get("competition") or {}).get("currentSeason") or {}
    start, end = season_info.get("startDate"), season_info.get("endDate")
    if not start or not end: raise ValueError(f"Season dates missing for {code}")
    season = start[:4] + "-" + end[:4]
    comp_id = (td.get("competition") or {}).get("id")
    for team in td.get("teams", []):
        pid = team.get("id")
        if pid is None: raise ValueError(f"Team ID missing in {code}")
        tid = f"football-data:{pid}"
        teams[tid] = {"id":tid,"provider":"football-data.org","providerTeamId":pid,
          "name":team.get("name"),"shortName":team.get("shortName"),"tla":team.get("tla"),
          "crest":team.get("crest"),"country":(team.get("area") or {}).get("name")}
        team_seasons.append({"teamId":tid,"leagueId":code,"season":season,
          "providerCompetitionId":comp_id,"seasonStart":start,"seasonEnd":end})
    total = [g for g in sd.get("standings",[]) if g.get("type")=="TOTAL"]
    if not total: raise ValueError(f"TOTAL standings missing for {code}")
    for group in total:
      for row in group.get("table",[]):
        pid=(row.get("team") or {}).get("id")
        if pid is None: raise ValueError(f"Standing team ID missing in {code}")
        standings.append({"leagueId":code,"season":season,"teamId":f"football-data:{pid}",
          "position":row.get("position"),"played":row.get("playedGames"),"won":row.get("won"),
          "draw":row.get("draw"),"lost":row.get("lost"),"goalsFor":row.get("goalsFor"),
          "goalsAgainst":row.get("goalsAgainst"),"goalDifference":row.get("goalDifference"),
          "points":row.get("points"),"updatedAt":now})
    for m in md.get("matches",[]):
      home,away=m.get("homeTeam") or {},m.get("awayTeam") or {}
      ft=(m.get("score") or {}).get("fullTime") or {}
      cancelled=m.get("status")=="CANCELLED"
      matches.append({"providerMatchId":m.get("id"),"leagueId":code,"season":season,
        "utcDate":m.get("utcDate"),"status":m.get("status"),
        "homeTeamId":f"football-data:{home['id']}" if home.get("id") is not None else None,
        "awayTeamId":f"football-data:{away['id']}" if away.get("id") is not None else None,
        "homeTeamName":home.get("name"),"awayTeamName":away.get("name"),
        "homeScore":None if cancelled else ft.get("home"),"awayScore":None if cancelled else ft.get("away")})
    print(f"{code}: teams={len(td.get('teams',[]))}, matches={len(md.get('matches',[]))}")

for league in PROVIDER_LEAGUES:
    code=league["id"]
    if code=="ELC" and elc is None:
        old=previous or {}
        old_ts=[x for x in old.get("teamSeasons",[]) if x.get("leagueId")=="ELC"]
        old_st=[x for x in old.get("standings",[]) if x.get("leagueId")=="ELC"]
        old_ms=[x for x in old.get("matches",[]) if x.get("leagueId")=="ELC"]
        if not old_ts or not old_st or not old_ms:
            raise RuntimeError("ELC unavailable and no complete previous ELC data; refusing incomplete publication.")
        refs={x.get("teamId") for x in old_ts+old_st}
        for m in old_ms: refs.update(x for x in (m.get("homeTeamId"),m.get("awayTeamId")) if x)
        for t in old.get("teams",[]):
            if t.get("id") in refs: teams.setdefault(t["id"],t)
        team_seasons.extend(old_ts); standings.extend(old_st); matches.extend(old_ms)
        src=old.get("source") or {}; old_sync=(src.get("leagueSync") or {}).get("ELC") or {}
        last=old_sync.get("lastSuccessfulSync") or src.get("lastSuccessfulSync") or old.get("generatedAt")
        league_sync["ELC"]={"status":"stale","lastSuccessfulSync":last}
        print("ELC unavailable/incomplete: previous ELC rows preserved atomically.")
        continue
    payload=elc if code=="ELC" else tuple(read(code,e) for e in ("teams","matches","standings"))
    process(code,*payload)
    league_sync[code]={"status":"fresh","lastSuccessfulSync":now}

database={"schemaVersion":"1.3.0","generatedAt":now,
 "source":{"provider":"football-data.org","apiVersion":"v4",
 "attribution":"Data provided by football-data.org","lastSuccessfulSync":now,"leagueSync":league_sync},
 "leagues":LEAGUE_CATALOG,"teams":list(teams.values()),"teamSeasons":team_seasons,
 "standings":standings,"matches":matches,"probabilitySnapshots":snapshots}
with open(db_path,"w",encoding="utf-8") as f: json.dump(database,f,ensure_ascii=False,indent=2)
print("Database generated; immutable snapshots retained:",len(snapshots))
