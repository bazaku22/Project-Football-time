import json
import subprocess
from datetime import datetime
from pathlib import Path

subprocess.run(
    ["python3", "-m", "json.tool", "data/football-database.json"],
    check=True,
    stdout=subprocess.DEVNULL,
)

with open("data/football-database.json", encoding="utf-8") as file:
    db = json.load(file)

expected_all = {"PL", "PD", "BL1", "SA", "FL1", "ELC", "J1", "J2"}
expected_data = {"PL", "PD", "BL1", "SA", "FL1", "ELC"}
expected_pending = {"J1", "J2"}

leagues = db["leagues"]
teams = db["teams"]
team_seasons = db["teamSeasons"]
standings = db["standings"]
matches = db["matches"]
probability_snapshots = db.get("probabilitySnapshots", [])

assert isinstance(probability_snapshots, list), "Invalid probability snapshots."
league_by_id = {league["id"]: league for league in leagues}
assert set(league_by_id) == expected_all, "Eight-league catalogue is incomplete."
assert len(leagues) == len(expected_all), "Duplicate league IDs."

for league_id in expected_data:
    assert league_by_id[league_id].get("dataStatus") == "available",         f"Provider-backed league is not marked available: {league_id}"
    assert league_by_id[league_id].get("providerCompetitionCode"),         f"Provider competition code missing: {league_id}"

for league_id in expected_pending:
    row = league_by_id[league_id]
    assert row.get("providerCompetitionCode") is None,         f"Pending league must not make provider requests: {league_id}"
    assert row.get("dataStatus") == "not_available_on_current_free_tier",         f"Pending league status is incorrect: {league_id}"

snapshot_ids = [str(row["matchId"]) for row in probability_snapshots]
assert len(snapshot_ids) == len(set(snapshot_ids)), "Duplicate probability snapshots."
matches_by_id = {str(match["providerMatchId"]): match for match in matches}
for snapshot in probability_snapshots:
    # Historical snapshots are self-contained records. Their source match may
    # legitimately disappear from the provider's current-season fixture feed.
    assert isinstance(snapshot.get("matchId"), (str, int)), "Snapshot match ID is missing."
    probabilities = snapshot["probabilities"]
    assert set(probabilities) == {"home", "draw", "away"}, "Invalid 1X2 probability fields."
    assert all(isinstance(v, (int, float)) and 0 <= v <= 100 for v in probabilities.values()), "Invalid probability value."
    assert abs(sum(probabilities.values()) - 100) <= 0.11, "1X2 probabilities must total 100%."
    match_date = datetime.fromisoformat(snapshot["utcDate"].replace("Z", "+00:00"))
    created_at = datetime.fromisoformat(snapshot["createdAt"].replace("Z", "+00:00"))
    assert created_at < match_date, "Prediction snapshot must be recorded before kickoff."
    if snapshot.get("actualOutcome") is not None:
        assert snapshot["actualOutcome"] in {"home", "draw", "away"}, "Invalid evaluated outcome."

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
assert len(membership_keys) == len(set(membership_keys)), "Duplicate team season memberships."

for item in team_seasons:
    assert item["teamId"] in known_teams, "Unknown team in teamSeasons."
    assert item["leagueId"] in expected_data, "Unknown or unavailable league in teamSeasons."

standing_keys = [
    (item["leagueId"], item["season"], item["teamId"])
    for item in standings
]
assert len(standing_keys) == len(set(standing_keys)), "Duplicate standings rows."

for item in standings:
    assert item["leagueId"] in expected_data, "Unknown or unavailable standings league."
    assert item["teamId"] in known_teams, "Unknown standings team."
    values = [
        item["played"], item["won"], item["draw"], item["lost"],
        item["goalsFor"], item["goalsAgainst"], item["points"],
    ]
    assert all(isinstance(value, int) for value in values), "Invalid numeric standings value."
    assert item["played"] == item["won"] + item["draw"] + item["lost"], "Played games mismatch."
    assert item["goalDifference"] == item["goalsFor"] - item["goalsAgainst"], "Goal difference mismatch."
    assert item["points"] == item["won"] * 3 + item["draw"], "Points mismatch."

match_ids = [match["providerMatchId"] for match in matches]
assert all(match_id is not None for match_id in match_ids), "Match ID missing."
assert len(match_ids) == len(set(match_ids)), "Duplicate match IDs."

for match in matches:
    assert match["leagueId"] in expected_data, "Unknown or unavailable match league."
    for field in ("homeTeamId", "awayTeamId"):
        team_id = match[field]
        if team_id is not None:
            assert team_id in known_teams, f"Unknown team reference: {team_id}"
    if match["status"] == "CANCELLED":
        assert match["homeScore"] is None, "Cancelled match has a home score."
        assert match["awayScore"] is None, "Cancelled match has an away score."

for league_id in expected_data:
    assert any(row["leagueId"] == league_id for row in standings), f"Missing standings: {league_id}"
    assert any(row["leagueId"] == league_id for row in matches), f"Missing matches: {league_id}"

for league_id in expected_pending:
    assert not any(row["leagueId"] == league_id for row in team_seasons + standings + matches),         f"Unavailable league unexpectedly contains data: {league_id}"

print("JSON validation: PASSED")
print("League catalogue count:", len(leagues))
print("Provider-backed leagues:", len(expected_data))
print("Pending leagues:", len(expected_pending))
print("Team count:", len(teams))
print("Team season count:", len(team_seasons))
print("Standings count:", len(standings))
print("Match count:", len(matches))
print("All reference and consistency checks passed.")
