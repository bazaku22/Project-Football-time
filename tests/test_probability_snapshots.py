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
        match(8, "H", "A", 2, 0, past - timedelta(days=1)),
        match(9, "A", "H", 1, 1, past - timedelta(days=2)),
        match(10, "H", "A", 0, 1, past - timedelta(days=3)),
        match(11, "A", "H", 0, 2, past - timedelta(days=4)),
    ]
    kickoff = now + timedelta(days=7)
    upcoming = match(999, "H", "A", None, None, kickoff, "TIMED")
    fixtures.append(upcoming)
    legacy_snapshot = {
        "matchId": "999",
        "leagueId": "PL",
        "season": "2026-2027",
        "utcDate": kickoff.isoformat(),
        "createdAt": (now - timedelta(days=1)).isoformat(),
        "probabilities": {"home": 50.0, "draw": 25.0, "away": 25.0},
        "modelVersion": "pft-poisson-1.0",
    }
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
        "probabilitySnapshots": [legacy_snapshot],
    }

    with tempfile.TemporaryDirectory() as directory:
        data_dir = Path(directory) / "data"
        data_dir.mkdir()
        db_path = data_dir / "football-database.json"
        db_path.write_text(json.dumps(database), encoding="utf-8")

        first = run_builder(directory)
        assert len(first["probabilitySnapshots"]) == 2, "Expected v1 history plus one v2 snapshot."
        legacy = next(row for row in first["probabilitySnapshots"] if row["modelVersion"] == "pft-poisson-1.0")
        snapshot = next(row for row in first["probabilitySnapshots"] if row["modelVersion"] == "pft-poisson-2.0")
        assert legacy["probabilities"] == legacy_snapshot["probabilities"], "Legacy forecast was overwritten."
        assert snapshot["matchId"] == "999"
        assert abs(sum(snapshot["probabilities"].values()) - 100) <= 0.11
        assert all(0 <= value <= 100 for value in snapshot["probabilities"].values())
        assert datetime.fromisoformat(snapshot["createdAt"]) < kickoff
        assert snapshot["modelVersion"] == "pft-poisson-2.0"
        assert snapshot["sample"]["homeForm5"] <= 5
        assert snapshot["sample"]["homeForm10"] <= 10
        assert snapshot["sample"]["awayForm5"] <= 5
        assert snapshot["sample"]["awayForm10"] <= 10
        assert snapshot["breakdown"]["h2h"]["minimumSample"] == 5
        assert snapshot["sample"]["h2h"] == 5
        assert snapshot["sample"]["homeOpponentStrength"] >= 3
        assert snapshot["sample"]["awayOpponentStrength"] >= 3
        assert snapshot["breakdown"]["h2h"]["applied"] is True
        original_probabilities = dict(snapshot["probabilities"])
        original_created_at = snapshot["createdAt"]

        for row in first["matches"]:
            if row["providerMatchId"] == 999:
                row["status"] = "FINISHED"
                row["homeScore"] = 2
                row["awayScore"] = 1
        db_path.write_text(json.dumps(first), encoding="utf-8")

        second = run_builder(directory)
        evaluated = next(row for row in second["probabilitySnapshots"] if row["modelVersion"] == "pft-poisson-2.0")
        legacy_evaluated = next(row for row in second["probabilitySnapshots"] if row["modelVersion"] == "pft-poisson-1.0")
        assert evaluated["actualOutcome"] == "home", "Finished match outcome was not recorded."
        assert legacy_evaluated["actualOutcome"] == "home", "Legacy snapshot result was not recorded."
        assert evaluated["actualScore"] == "2-1"
        assert evaluated["probabilities"] == original_probabilities, "Original v2 forecast was overwritten."
        assert legacy_evaluated["probabilities"] == legacy_snapshot["probabilities"], "Legacy forecast was overwritten."
        assert evaluated["createdAt"] == original_created_at, "Original snapshot time was overwritten."

        second["matches"] = [row for row in second["matches"] if row["providerMatchId"] != 999]
        db_path.write_text(json.dumps(second), encoding="utf-8")
        third = run_builder(directory)
        assert len(third["probabilitySnapshots"]) == 2, "Both model versions must be preserved."
        assert all(row["actualOutcome"] == "home" for row in third["probabilitySnapshots"])

        # Retention must not silently prune immutable history at an arbitrary cap.
        archived = third["probabilitySnapshots"] + [
            {
                "matchId": f"archived-{index}",
                "leagueId": "PL",
                "season": "2025-2026",
                "utcDate": past.isoformat(),
                "createdAt": (past - timedelta(days=1)).isoformat(),
                "probabilities": {"home": 40.0, "draw": 30.0, "away": 30.0},
            }
            for index in range(2501)
        ]
        third["probabilitySnapshots"] = archived
        db_path.write_text(json.dumps(third), encoding="utf-8")
        fourth = run_builder(directory)
        assert len(fourth["probabilitySnapshots"]) == 2503, (
            "Historical snapshots were pruned; all records must be retained."
        )

        # An unreadable existing database must fail closed rather than silently
        # replacing the historical snapshot archive with an empty list.
        db_path.write_text('{"probabilitySnapshots": [', encoding="utf-8")
        corrupt_content = db_path.read_text(encoding="utf-8")
        failed = subprocess.run(
            [sys.executable, str(SCRIPT)],
            cwd=directory,
            capture_output=True,
            text=True,
        )
        assert failed.returncode != 0, "Corrupt database must stop the rebuild."
        assert db_path.read_text(encoding="utf-8") == corrupt_content, (
            "Failed rebuild must not overwrite the corrupt source database."
        )

        # A structurally invalid history field must also stop the rebuild.
        invalid_database = dict(fourth)
        invalid_database["probabilitySnapshots"] = {"unexpected": "object"}
        db_path.write_text(json.dumps(invalid_database), encoding="utf-8")
        invalid_content = db_path.read_text(encoding="utf-8")
        failed = subprocess.run(
            [sys.executable, str(SCRIPT)],
            cwd=directory,
            capture_output=True,
            text=True,
        )
        assert failed.returncode != 0, (
            "Invalid probabilitySnapshots must stop the rebuild."
        )
        assert db_path.read_text(encoding="utf-8") == invalid_content, (
            "Invalid history must never be silently discarded."
        )

    print("Probability snapshot integration tests: PASSED")


if __name__ == "__main__":
    main()
