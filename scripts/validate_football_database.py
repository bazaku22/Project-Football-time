import json
import subprocess
subprocess.run(["python3", "-m", "json.tool", "data/football-database.json"], check=True, stdout=subprocess.DEVNULL)

import json
from datetime import datetime

with open("data/football-database.json", encoding="utf-8") as file:
    db = json.load(file)

expected = {"PL", "PD", "BL1", "SA", "FL1"}
leagues = db["leagues"]
teams = db["teams"]
team_seasons = db["teamSeasons"]
standings = db["standings"]
matches = db["matches"]
probability_snapshots = db.get("probabilitySnapshots", [])
assert isinstance(probability_snapshots, list), "Invalid probability snapshots."
snapshot_ids = [str(row["matchId"]) for row in probability_snapshots]
assert len(snapshot_ids) == len(set(snapshot_ids)), "Duplicate probability snapshots."
matches_by_id = {str(match["providerMatchId"]): match for match in matches}
for snapshot in probability_snapshots:
    assert snapshot["matchId"] in matches_by_id, "Snapshot references an unknown match."
    probabilities = snapshot["probabilities"]
    assert set(probabilities) == {"home", "draw", "away"}, "Invalid 1X2 probability fields."
    assert all(isinstance(v, (int, float)) and 0 <= v <= 100 for v in probabilities.values()), "Invalid probability value."
    assert abs(sum(probabilities.values()) - 100) <= 0.11, "1X2 probabilities must total 100%."
    match_date = datetime.fromisoformat(snapshot["utcDate"].replace("Z", "+00:00"))
    created_at = datetime.fromisoformat(snapshot["createdAt"].replace("Z", "+00:00"))
    assert created_at < match_date, "Prediction snapshot must be recorded before kickoff."
    if snapshot.get("actualOutcome") is not None:
        assert snapshot["actualOutcome"] in {"home", "draw", "away"}, "Invalid evaluated outcome."

actual = {league["id"] for league in leagues}

assert actual == expected, "League list is incomplete."
assert len(leagues) == 5, "Duplicate league IDs."
assert teams, "No teams found."
assert standings, "No standings found."
assert matches, "No matches found."

team_ids = [team["id"] for team in teams]
assert len(team_ids) == len(set(team_ids)), "Duplicate team IDs."

known_teams = set(team_ids)

membership_keys = [
    (item["teamId"], item["leagueId"], item["season"])
    for item in team_seasons
]

assert len(membership_keys) == len(set(membership_keys)), \
    "Duplicate team season memberships."

for item in team_seasons:
    assert item["teamId"] in known_teams, "Unknown team in teamSeasons."
    assert item["leagueId"] in expected, "Unknown league in teamSeasons."

standing_keys = [
    (item["leagueId"], item["season"], item["teamId"])
    for item in standings
]

assert len(standing_keys) == len(set(standing_keys)), \
    "Duplicate standings rows."

for item in standings:
    assert item["leagueId"] in expected, "Unknown standings league."
    assert item["teamId"] in known_teams, "Unknown standings team."

    played = item["played"]
    won = item["won"]
    draw = item["draw"]
    lost = item["lost"]
    goals_for = item["goalsFor"]
    goals_against = item["goalsAgainst"]

    values = [played, won, draw, lost, goals_for, goals_against, item["points"]]
    assert all(isinstance(v, int) for v in values), \
        "Invalid numeric standings value."

    assert played == won + draw + lost, "Played games mismatch."
    assert item["goalDifference"] == goals_for - goals_against, \
        "Goal difference mismatch."
    assert item["points"] == won * 3 + draw, "Points mismatch."

match_ids = [match["providerMatchId"] for match in matches]

assert all(match_id is not None for match_id in match_ids), \
    "Match ID missing."
assert len(match_ids) == len(set(match_ids)), "Duplicate match IDs."

for match in matches:
    assert match["leagueId"] in expected, "Unknown match league."

    for field in ("homeTeamId", "awayTeamId"):
        team_id = match[field]
        if team_id is not None:
            assert team_id in known_teams, \
                f"Unknown team reference: {team_id}"

    if match["status"] == "CANCELLED":
        assert match["homeScore"] is None, \
            "Cancelled match has a home score."
        assert match["awayScore"] is None, \
            "Cancelled match has an away score."

for league_id in expected:
    assert any(s["leagueId"] == league_id for s in standings), \
        f"Missing standings: {league_id}"
    assert any(m["leagueId"] == league_id for m in matches), \
        f"Missing matches: {league_id}"

print("JSON validation: PASSED")
print("League count:", len(leagues))
print("Team count:", len(teams))
print("Team season count:", len(team_seasons))
print("Standings count:", len(standings))
print("Match count:", len(matches))
print("All reference and consistency checks passed.")
