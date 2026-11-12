import importlib.util
import unittest
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / "scripts" / "strikerapi_match_stats.py"
spec = importlib.util.spec_from_file_location("strikerapi_match_stats", MODULE)
collector = importlib.util.module_from_spec(spec)
spec.loader.exec_module(collector)


def fixture():
    return {
        "game": {
            "game_id": "match-001", "date": "2026-11-12", "status": "final",
            "season": 2026, "league": "soccer", "competition": "Premier League",
            "home": {"team_id": "359", "abbrev": "ARS", "name": "Arsenal", "score": 2},
            "away": {"team_id": "382", "abbrev": "MNC", "name": "Manchester City", "score": 1},
        },
        "players": [
            {"player_id": "p1", "name": "Player One", "team_id": "359", "starter": True,
             "minute_on": 0, "minute_off": 90, "goals": 1, "assists": 0,
             "shots": 3, "shots_on_target": 2, "yellow_cards": 0, "saves": None},
            {"player_id": "p2", "name": "Player Two", "team_id": "382", "starter": False,
             "minute_on": 70, "minute_off": 90, "goals": None, "assists": 1,
             "shots": 1, "shots_on_target": 0, "yellow_cards": 1},
        ],
    }


class StrikerApiMatchStatsTests(unittest.TestCase):
    def test_builds_match_scoped_rows_and_season_label(self):
        result = collector.normalize(fixture(), "2026-11-13T00:00:00Z")
        self.assertEqual(result["game"]["season"], "2026/27")
        self.assertEqual(len(result["statistics"]), 2)
        first = result["statistics"][0]
        self.assertEqual(first["statistics_scope"], "match")
        self.assertEqual(first["match_id"], "match-001")
        self.assertEqual(first["appearances"], 1)
        self.assertEqual(first["starts"], 1)
        self.assertEqual(first["minutes"], 90)
        self.assertEqual(first["goals"], 1)
        self.assertNotIn("saves", first)
        self.assertEqual(first["rights_status"], "manual_review")
        self.assertEqual(result["provider_api_calls"], 0)
        self.assertEqual(result["supabase_writes"], 0)

    def test_preserves_missing_metrics_instead_of_zero(self):
        result = collector.normalize(fixture())
        second = result["statistics"][1]
        self.assertNotIn("goals", second)
        self.assertEqual(second["assists"], 1)

    def test_rejects_non_final_match(self):
        data = fixture()
        data["game"]["status"] = "scheduled"
        with self.assertRaisesRegex(ValueError, "only final"):
            collector.normalize(data)

    def test_rejects_missing_provider_ids(self):
        data = fixture()
        data["players"] = [{"name": "No ID", "team_id": "359"}]
        with self.assertRaisesRegex(ValueError, "no players"):
            collector.normalize(data)

    def test_rejects_duplicate_provider_player_team(self):
        data = fixture()
        data["players"].append(dict(data["players"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            collector.normalize(data)

    def test_rejects_unsupported_league(self):
        data = fixture()
        data["game"]["league"] = "ucl"
        with self.assertRaisesRegex(ValueError, "unsupported"):
            collector.normalize(data)


if __name__ == "__main__":
    unittest.main()
