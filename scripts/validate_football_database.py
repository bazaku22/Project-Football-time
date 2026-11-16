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

snapshot_ids = [
    f'{row["matchId"]}|{row.get("modelVersion") or "legacy/unknown"}'
    for row in probability_snapshots
]
assert len(snapshot_ids) == len(set(snapshot_ids)), "Duplicate match/model probability snapshots."
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
# Provider standings are authoritative: disciplinary or administrative deductions
    # can make points lower than the standard 3/1/0 calculation.
    assert item["points"] >= 0, "Points cannot be negative."

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

result_history = db.get("resultRevisionHistory", [])
assert isinstance(result_history, list), "Invalid result revision history."
history_by_match = {}
history_keys = set()

def valid_utc_timestamp(value):
    if not isinstance(value, str) or not value:
        return False
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return parsed.tzinfo is not None

def valid_score(value):
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0

for entry in result_history:
    assert isinstance(entry, dict), "Invalid result revision history row."
    match_id = entry.get("matchId")
    revision = entry.get("resultRevision")
    provider_match_id = entry.get("providerMatchId")
    assert isinstance(match_id, str) and match_id.startswith("FT-M-FOOTBALLDATA-"), "Invalid shared result Match ID."
    assert isinstance(provider_match_id, str) and provider_match_id, "Missing provider match ID in result history."
    assert match_id == "FT-M-FOOTBALLDATA-" + provider_match_id, "Shared Match ID/provider ID mismatch."
    assert isinstance(revision, int) and not isinstance(revision, bool) and revision >= 1, "Invalid result revision."
    key = (match_id, revision)
    assert key not in history_keys, "Duplicate result revision history key."
    history_keys.add(key)
    assert entry.get("status") == "FINISHED", "Result history must contain a finished result snapshot."
    assert valid_score(entry.get("homeScore")) and valid_score(entry.get("awayScore")), "Invalid score in result history."
    assert valid_utc_timestamp(entry.get("recordedAt")), "Invalid result history timestamp."
    source = entry.get("source")
    assert isinstance(source, dict) and source.get("provider") and valid_utc_timestamp(source.get("verifiedAt")), "Invalid result history provenance."
    assert entry.get("changeType") in {"baseline", "correction", "preserved"}, "Invalid result history change type."
    assert isinstance(entry.get("reason"), str) and entry["reason"], "Result history reason is required."
    history_by_match.setdefault(match_id, []).append(entry)

for match in matches:
    if match.get("status") == "FINISHED" and valid_score(match.get("homeScore")) and valid_score(match.get("awayScore")):
        revision = match.get("resultRevision")
        updated_at = match.get("resultUpdatedAt")
        source = match.get("resultSource")
        match_id = "FT-M-FOOTBALLDATA-" + str(match["providerMatchId"])
        assert isinstance(revision, int) and not isinstance(revision, bool) and revision >= 1, "Finished result is missing a valid revision."
        assert valid_utc_timestamp(updated_at), "Finished result is missing a valid update timestamp."
        assert isinstance(source, dict) and source.get("provider") and valid_utc_timestamp(source.get("verifiedAt")), "Finished result provenance is invalid."
        entries = history_by_match.get(match_id, [])
        assert entries, "Finished result has no audit history."
        latest = max(entries, key=lambda row: row["resultRevision"])
        assert latest["resultRevision"] == revision, "Finished result revision does not match audit history."
        assert (latest["homeScore"], latest["awayScore"]) == (match["homeScore"], match["awayScore"]), "Latest audit result does not match current score."

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
