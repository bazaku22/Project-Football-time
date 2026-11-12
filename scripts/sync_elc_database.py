import copy
import json
import os
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path


def merge_elc_payloads(database, teams_payload, matches_payload, standings_payload, now=None):
    """Replace only ELC's current provider-backed rows; preserve all other data/history."""
    now = now or datetime.now(timezone.utc).isoformat()
    teams = teams_payload.get("teams")
    matches = matches_payload.get("matches")
    groups = standings_payload.get("standings")
    if not isinstance(teams, list) or not teams:
        raise ValueError("ELC teams payload must contain a non-empty teams array.")
    if not isinstance(matches, list):
        raise ValueError("ELC matches payload must contain a matches array.")
    if not isinstance(groups, list):
        raise ValueError("ELC standings payload must contain a standings array.")

    season_info = teams_payload.get("season") or (teams_payload.get("competition") or {}).get("currentSeason") or {}
    start, end = season_info.get("startDate"), season_info.get("endDate")
    if not start or not end:
        raise ValueError("ELC season start/end dates are missing.")
    season = start[:4] + "-" + end[:4]
    competition_id = (teams_payload.get("competition") or {}).get("id")

    team_rows = {}
    for team in teams:
        provider_id = team.get("id")
        if provider_id is None:
            raise ValueError("ELC team is missing provider ID.")
        team_id = f"football-data:{provider_id}"
        team_rows[team_id] = {
            "id": team_id,
            "provider": "football-data.org",
            "providerTeamId": provider_id,
            "name": team.get("name"),
            "shortName": team.get("shortName"),
            "tla": team.get("tla"),
            "crest": team.get("crest"),
            "country": (team.get("area") or {}).get("name"),
        }

    total_groups = [group for group in groups if group.get("type") == "TOTAL"]
    if len(total_groups) != 1 or not isinstance(total_groups[0].get("table"), list) or not total_groups[0]["table"]:
        raise ValueError("ELC must provide exactly one non-empty TOTAL standings table.")

    new_standings = []
    for row in total_groups[0]["table"]:
        provider_id = (row.get("team") or {}).get("id")
        if provider_id is None:
            raise ValueError("ELC standings row is missing team ID.")
        new_standings.append({
            "leagueId": "ELC",
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
            "updatedAt": now,
        })

    new_matches = []
    for match in matches:
        provider_match_id = match.get("id")
        if provider_match_id is None:
            raise ValueError("ELC match is missing provider ID.")
        home, away = match.get("homeTeam") or {}, match.get("awayTeam") or {}
        full_time = (match.get("score") or {}).get("fullTime") or {}
        cancelled = match.get("status") == "CANCELLED"
        new_matches.append({
            "providerMatchId": provider_match_id,
            "leagueId": "ELC",
            "season": season,
            "utcDate": match.get("utcDate"),
            "status": match.get("status"),
            "homeTeamId": f"football-data:{home['id']}" if home.get("id") is not None else None,
            "awayTeamId": f"football-data:{away['id']}" if away.get("id") is not None else None,
            "homeTeamName": home.get("name"),
            "awayTeamName": away.get("name"),
            "homeScore": None if cancelled else full_time.get("home"),
            "awayScore": None if cancelled else full_time.get("away"),
        })

    if len({row["providerMatchId"] for row in new_matches}) != len(new_matches):
        raise ValueError("ELC matches payload contains duplicate match IDs.")
    if len({row["teamId"] for row in new_standings}) != len(new_standings):
        raise ValueError("ELC standings payload contains duplicate team rows.")
    known_elc_teams = set(team_rows)
    if any(row["teamId"] not in known_elc_teams for row in new_standings):
        raise ValueError("ELC standings references a team absent from the ELC teams payload.")

    result = copy.deepcopy(database)
    # Keep all existing team master records, including teams no longer in the current ELC squad.
    merged_teams = {row["id"]: row for row in result["teams"]}
    merged_teams.update(team_rows)
    result["teams"] = list(merged_teams.values())

    result["teamSeasons"] = [row for row in result["teamSeasons"] if row.get("leagueId") != "ELC"]
    result["teamSeasons"].extend({
        "teamId": team_id,
        "leagueId": "ELC",
        "season": season,
        "providerCompetitionId": competition_id,
        "seasonStart": start,
        "seasonEnd": end,
    } for team_id in team_rows)

    result["standings"] = [row for row in result["standings"] if row.get("leagueId") != "ELC"]
    result["standings"].extend(new_standings)
    result["matches"] = [row for row in result["matches"] if row.get("leagueId") != "ELC"]
    result["matches"].extend(new_matches)

    # Probability snapshots are immutable history and are deliberately untouched.
    result["generatedAt"] = now
    source = result.setdefault("source", {})
    league_sync = source.setdefault("leagueSync", {})
    league_sync["ELC"] = {"status": "fresh", "lastSuccessfulSync": now}
    return result


def update_database(database_path, payload_dir):
    database_path = Path(database_path)
    payload_dir = Path(payload_dir)
    with database_path.open(encoding="utf-8") as handle:
        original = json.load(handle)
    payloads = []
    for endpoint in ("teams", "matches", "standings"):
        with (payload_dir / f"ELC-{endpoint}.json").open(encoding="utf-8") as handle:
            payloads.append(json.load(handle))
    updated = merge_elc_payloads(original, *payloads)

    backup_path = database_path.with_name(database_path.name + ".elc-backup")
    if backup_path.exists():
        raise RuntimeError("Refusing to overwrite an existing ELC safety backup.")
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=database_path.parent,
                                         prefix=database_path.name + ".", suffix=".tmp", delete=False) as handle:
            json.dump(updated, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            temp_path = Path(handle.name)
        backup_path.write_bytes(database_path.read_bytes())
        os.replace(temp_path, database_path)
        subprocess.run(["python3", "scripts/validate_football_database.py"], check=True)
    except Exception:
        if backup_path.exists():
            os.replace(backup_path, database_path)
        raise
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()
    if backup_path.exists():
        backup_path.unlink()
    print("ELC-only database update validated; non-ELC rows and probability snapshots preserved.")


if __name__ == "__main__":
    runner_temp = os.environ.get("RUNNER_TEMP")
    if not runner_temp:
        raise SystemExit("RUNNER_TEMP is required.")
    update_database("data/football-database.json", Path(runner_temp) / "football-data")
