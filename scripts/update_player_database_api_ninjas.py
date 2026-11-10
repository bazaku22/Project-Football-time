import json, os, re, time, unicodedata
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
PDB = ROOT / "data/player-database.json"
FDB = ROOT / "data/football-database.json"
BASE = "https://api.api-ninjas.com/v1/soccerplayers"
KEY = os.environ["API_NINJAS_API_KEY"]
LEAGUES = {
    "PL": ("epl", "Premier League"),
    "PD": ("laliga", "La Liga"),
    "BL1": ("bundesliga", "Bundesliga"),
    "SA": ("seriea", "Serie A"),
    "FL1": ("ligue1", "Ligue 1"),
}
PAGE_SIZE = 50
MAX_PAGES_PER_LEAGUE = 20
session = requests.Session()
session.headers.update({"X-Api-Key": KEY, "Accept": "application/json"})

def norm(value):
    value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()
    value = re.sub(r"\b(fc|cf|afc|sc|sv|ac|as|ss|calcio|club|de|the)\b", " ", value)
    return re.sub(r"[^a-z0-9]", "", value)

def get_page(league, offset):
    response = session.get(BASE, params={"league": league, "offset": offset}, timeout=45)
    if response.status_code == 401:
        raise RuntimeError("API_NINJAS_API_KEY is invalid or unauthorized.")
    if response.status_code == 429:
        raise RuntimeError("API Ninjas rate limit reached; existing database was preserved.")
    response.raise_for_status()
    body = response.json()
    if not isinstance(body, list):
        raise RuntimeError("Unexpected API Ninjas response; expected a JSON array.")
    return body

def main():
    old = json.loads(PDB.read_text(encoding="utf-8")) if PDB.exists() else {"records": []}
    football = json.loads(FDB.read_text(encoding="utf-8")) if FDB.exists() else {}
    old_records = {r["id"]: r for r in old.get("records", []) if isinstance(r, dict) and r.get("id")}
    team_lookup = {}
    for team in football.get("teams", []):
        for name in (team.get("name"), team.get("shortName"), team.get("displayName")):
            if norm(name):
                team_lookup[norm(name)] = team

    fetched = datetime.now(timezone.utc).isoformat()
    imported = {}
    league_counts = {}
    request_count = 0
    for league_id, (api_league, league_name) in LEAGUES.items():
        offset = 0
        league_players = {}
        for page in range(MAX_PAGES_PER_LEAGUE):
            players = get_page(api_league, offset)
            request_count += 1
            for player in players:
                pid = str(player.get("player_id") or "")
                name = player.get("name")
                if pid and name:
                    league_players[pid] = player
            if len(players) < PAGE_SIZE:
                break
            offset += PAGE_SIZE
            time.sleep(0.25)
        else:
            raise RuntimeError(f"Pagination safety limit reached for {api_league}; database was not written.")
        league_counts[league_id] = len(league_players)
        for pid, player in league_players.items():
            team = player.get("team") or {}
            team_name = team.get("name") or "ไม่ระบุทีม"
            team_external_id = str(team.get("team_id") or "")
            mapped = team_lookup.get(norm(team_name))
            team_id = str(mapped.get("id")) if mapped and mapped.get("id") is not None else "api-ninjas:" + (team_external_id or norm(team_name))
            display_team = mapped.get("name") if mapped else team_name
            rid = f"api-ninjas:{pid}:{team_id}:2026-27"
            previous = old_records.get(rid, {})
            birth_date = player.get("birth_date")
            age = None
            if birth_date:
                try:
                    born = datetime.strptime(birth_date, "%Y-%m-%d").date()
                    today = datetime.now(timezone.utc).date()
                    age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))
                except ValueError:
                    pass
            stats = dict(previous.get("statistics") or {})
            for field in ("appearances", "lineups", "minutes", "goals", "assists", "rating",
                          "shotsTotal", "shotsOnTarget", "xg", "xgPer90", "goalsPer90",
                          "assistsPer90", "yellowCards", "redCards", "saves", "cleanSheets"):
                stats.setdefault(field, None)
            imported[rid] = {
                "id": rid,
                "playerId": "api-ninjas:" + pid,
                "name": name,
                "age": age,
                "nationality": player.get("nationality"),
                "height": f'{player.get("height_cm")} cm' if player.get("height_cm") else None,
                "weight": f'{player.get("weight_kg")} kg' if player.get("weight_kg") else None,
                "photo": None,
                "number": player.get("jersey_number"),
                "position": player.get("position"),
                "teamId": team_id,
                "teamName": display_team,
                "leagueId": league_id,
                "leagueName": league_name,
                "season": "2026-27",
                "statistics": stats,
                "profileStatus": "current_roster",
                "rosterStatus": player.get("roster_status"),
                "source": {
                    "provider": "API Ninjas",
                    "providerPlayerId": pid,
                    "providerTeamId": team_external_id,
                    "league": api_league,
                    "season": "2026-27",
                    "endpoint": "soccerplayers",
                    "fetchedAt": fetched,
                    "dataScope": "current squad and bio; season performance statistics are not supplied by this endpoint"
                }
            }

    if not imported:
        raise RuntimeError("No current player records returned; existing database was preserved.")

    merged = dict(old_records)
    # Replace previous API Ninjas current-squad snapshot while retaining other historical/provider records.
    for rid in list(merged):
        if rid.startswith("api-ninjas:"):
            del merged[rid]
    merged.update(imported)

    output = {
        "schemaVersion": 1,
        "generatedAt": fetched,
        "source": {
            "provider": "API Ninjas",
            "status": "current_squads_imported",
            "season": "2026-27",
            "leagues": {
                key: {"name": LEAGUES[key][1], "apiLeague": LEAGUES[key][0], "players": league_counts.get(key, 0)}
                for key in LEAGUES
            },
            "requestsUsed": request_count,
            "note": "Current squad and biographical data only. This endpoint does not provide season appearances, minutes, goals, assists, xG or other performance totals. Those fields remain null until a separately licensed statistics source is connected."
        },
        "nextProfileOffset": old.get("nextProfileOffset", 0),
        "records": sorted(merged.values(), key=lambda r: (r.get("leagueId", ""), r.get("teamName", ""), r.get("name", "")))
    }
    PDB.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("API Ninjas current squad import complete")
    print("Requests:", request_count)
    for league_id, count in league_counts.items():
        print(f"{league_id}: {count} players")
    print("Current roster records:", len(imported))
    print("Total stored records:", len(merged))

if __name__ == "__main__":
    main()
