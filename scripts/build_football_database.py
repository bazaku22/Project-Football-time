import json
import os
from datetime import datetime, timezone

base = os.path.join(os.environ["RUNNER_TEMP"], "football-data")

leagues = [
    {"id": "PL", "name": "Premier League", "country": "England", "providerCompetitionCode": "PL"},
    {"id": "PD", "name": "La Liga", "country": "Spain", "providerCompetitionCode": "PD"},
    {"id": "BL1", "name": "Bundesliga", "country": "Germany", "providerCompetitionCode": "BL1"},
    {"id": "SA", "name": "Serie A", "country": "Italy", "providerCompetitionCode": "SA"},
    {"id": "FL1", "name": "Ligue 1", "country": "France", "providerCompetitionCode": "FL1"}
]

teams = {}
team_seasons = []
standings = []
matches = []

def read_json(code, endpoint):
    path = os.path.join(base, f"{code}-{endpoint}.json")
    with open(path, encoding="utf-8") as file:
        return json.load(file)

sync_time = datetime.now(timezone.utc).isoformat()

for league in leagues:
    code = league["id"]

    team_data = read_json(code, "teams")
    match_data = read_json(code, "matches")
    standing_data = read_json(code, "standings")

    season_info = (
        team_data.get("season")
        or (team_data.get("competition") or {}).get("currentSeason")
        or {}
    )

    start = season_info.get("startDate")
    end = season_info.get("endDate")

    if not start or not end:
        raise ValueError(f"Season dates missing for {code}")

    season = start[:4] + "-" + end[:4]

    competition = team_data.get("competition") or {}
    competition_id = competition.get("id")

    for team in team_data.get("teams", []):
        provider_id = team.get("id")

        if provider_id is None:
            raise ValueError(f"Team ID missing in {code}")

        team_id = f"football-data:{provider_id}"

        teams[team_id] = {
            "id": team_id,
            "provider": "football-data.org",
            "providerTeamId": provider_id,
            "name": team.get("name"),
            "shortName": team.get("shortName"),
            "tla": team.get("tla"),
            "crest": team.get("crest"),
            "country": (team.get("area") or {}).get("name")
        }

        team_seasons.append({
            "teamId": team_id,
            "leagueId": code,
            "season": season,
            "providerCompetitionId": competition_id,
            "seasonStart": start,
            "seasonEnd": end
        })

    total_groups = [
        group for group in standing_data.get("standings", [])
        if group.get("type") == "TOTAL"
    ]

    if not total_groups:
        raise ValueError(f"TOTAL standings missing for {code}")

    for group in total_groups:
        for row in group.get("table", []):
            provider_id = (row.get("team") or {}).get("id")

            if provider_id is None:
                raise ValueError(f"Standing team ID missing in {code}")

            standings.append({
                "leagueId": code,
                "season": season,
                "teamId": f"football-data:{provider_id}",
                "position": row.get("position"),
                "played": row.get("playedGames"),
                "won": row.get("won"),
                "draw": row.get("draw"),
                "lost": row.get("lost"),
                "goalsFor": row.get("goalsFor"),
                "goalsAgainst": row.get("goalsAgainst"),
                "goalDifference": row.get("goalDifference"),
                "points": row.get("points"),
                "updatedAt": sync_time
            })

    for match in match_data.get("matches", []):
        home = match.get("homeTeam") or {}
        away = match.get("awayTeam") or {}
        score = match.get("score") or {}
        full_time = score.get("fullTime") or {}

        status = match.get("status")

        # Cancelled matches must never be treated as real 0-0 results.
        if status == "CANCELLED":
            home_score = None
            away_score = None
        else:
            home_score = full_time.get("home")
            away_score = full_time.get("away")

        matches.append({
            "providerMatchId": match.get("id"),
            "leagueId": code,
            "season": season,
            "utcDate": match.get("utcDate"),
            "status": status,
            "homeTeamId": (
                f"football-data:{home['id']}"
                if home.get("id") is not None else None
            ),
            "awayTeamId": (
                f"football-data:{away['id']}"
                if away.get("id") is not None else None
            ),
            "homeTeamName": home.get("name"),
            "awayTeamName": away.get("name"),
            "homeScore": home_score,
            "awayScore": away_score
        })

    print(
        f"{code}: "
        f"teams={len(team_data.get('teams', []))}, "
        f"standings={sum(len(g.get('table', [])) for g in total_groups)}, "
        f"matches={len(match_data.get('matches', []))}"
    )

previous_probability_snapshots = []
previous_database_path = os.path.join("data", "football-database.json")
if os.path.exists(previous_database_path):
    try:
        with open(previous_database_path, encoding="utf-8") as previous_file:
            previous_database = json.load(previous_file)
        previous_probability_snapshots = previous_database.get("probabilitySnapshots", [])
        if not isinstance(previous_probability_snapshots, list):
            previous_probability_snapshots = []
    except (OSError, json.JSONDecodeError):
        previous_probability_snapshots = []

database = {
    "schemaVersion": "1.1.0",
    "generatedAt": sync_time,
    "source": {
        "provider": "football-data.org",
        "apiVersion": "v4",
        "attribution": "Data provided by football-data.org",
        "lastSuccessfulSync": sync_time
    },
    "leagues": leagues,
    "teams": list(teams.values()),
    "teamSeasons": team_seasons,
    "standings": standings,
    "matches": matches,
    "probabilitySnapshots": previous_probability_snapshots
}

os.makedirs("data", exist_ok=True)

with open("data/football-database.json", "w", encoding="utf-8") as file:
    json.dump(database, file, ensure_ascii=False, indent=2)

print("Database generated.")
print("Teams:", len(teams))
print("Team seasons:", len(team_seasons))
print("Standings:", len(standings))
print("Matches:", len(matches))
