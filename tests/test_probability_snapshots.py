#!/usr/bin/env python3
"""Integration test for immutable pre-match probability snapshots."""
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "build_probability_snapshots.py"


def match(match_id, home, away, home_score, away_score, when, status="FINISHED"):
    return {
        "providerMatchId": match_id,
        "leagueId": "PL",
        "season": "2026-2027",
        "utcDate": when.isoformat(),
        "status": status,
        "homeTeamId": home,
        "awayTeamId": away,
        "homeTeamName": home,
        "awayTeamName": away,
        "homeScore": home_score,
        "awayScore": away_score,
    }


def run_builder(directory):
    subprocess.run([sys.executable, str(SCRIPT)], cwd=directory, check=True)
    with open(Path(directory) / "data" / "football-database.json", encoding="utf-8") as handle:
        return json.load(handle)


def main():
    now = datetime.now(timezone.utc)
    past = now - timedelta(days=2)
    fixtures = [
        match(1, "H", "X1", 2, 0, past),
        match(2, "X2", "A", 0, 1, past),
        match(3, "H", "X3", 1, 1, past),
        match(4, "X4", "A", 2, 2, past),
        match(5, "H", "X5", 3, 1, past),
        match(6, "X6", "A", 0, 2, past),
        match(7, "H", "A", 1, 0, past),
    ]
    kickoff = now + timedelta(days=7)
    upcoming = match(999, "H", "A", None, None, kickoff, "TIMED")
    fixtures.append(upcoming)
    database = {
        "schemaVersion": "1.1.0",
        "leagues": [{"id": "PL"}],
        "teams": [],
        "teamSeasons": [],
        "standings": [
            {"leagueId": "PL", "season": "2026-2027", "teamId": "H", "played": 4, "points": 9},
            {"leagueId": "PL", "season": "2026-2027", "teamId": "A", "played": 4, "points": 7},
        ],
        "matches": fixtures,
        "probabilitySnapshots": [],
    }

    with tempfile.TemporaryDirectory() as directory:
        data_dir = Path(directory) / "data"
        data_dir.mkdir()
        db_path = data_dir / "football-database.json"
        db_path.write_text(json.dumps(database), encoding="utf-8")

        first = run_builder(directory)
        assert len(first["probabilitySnapshots"]) == 1, "Expected one future snapshot."
        snapshot = first["probabilitySnapshots"][0]
        assert snapshot["matchId"] == "999"
        assert abs(sum(snapshot["probabilities"].values()) - 100) <= 0.11
        assert all(0 <= value <= 100 for value in snapshot["probabilities"].values())
        assert datetime.fromisoformat(snapshot["createdAt"]) < kickoff
        original_probabilities = dict(snapshot["probabilities"])
        original_created_at = snapshot["createdAt"]

        for row in first["matches"]:
            if row["providerMatchId"] == 999:
                row["status"] = "FINISHED"
                row["homeScore"] = 2
                row["awayScore"] = 1
        db_path.write_text(json.dumps(first), encoding="utf-8")

        second = run_builder(directory)
        evaluated = second["probabilitySnapshots"][0]
        assert evaluated["actualOutcome"] == "home", "Finished match outcome was not recorded."
        assert evaluated["actualScore"] == "2-1"
        assert evaluated["probabilities"] == original_probabilities, "Original forecast was overwritten."
        assert evaluated["createdAt"] == original_created_at, "Original snapshot time was overwritten."

        second["matches"] = [row for row in second["matches"] if row["providerMatchId"] != 999]
        db_path.write_text(json.dumps(second), encoding="utf-8")
        third = run_builder(directory)
        assert len(third["probabilitySnapshots"]) == 1, "Historical snapshot was not preserved."
        assert third["probabilitySnapshots"][0]["actualOutcome"] == "home"

        # Retention must not silently prune immutable history at an arbitrary cap.
        archived = third["probabilitySnapshots"] + [
            {
                "matchId": f"archived-{index}",
                "leagueId": "PL",
                "season": "2025-2026",
                "utcDate": past.isoformat(),
                "createdAt": past.isoformat(),
                "probabilities": {"home": 40.0, "draw": 30.0, "away": 30.0},
            }
            for index in range(2501)
        ]
        third["probabilitySnapshots"] = archived
        db_path.write_text(json.dumps(third), encoding="utf-8")
        fourth = run_builder(directory)
        assert len(fourth["probabilitySnapshots"]) == 2502, (
            "Historical snapshots were pruned; all records must be retained."
        )

    print("Probability snapshot integration tests: PASSED")


if __name__ == "__main__":
    main()
