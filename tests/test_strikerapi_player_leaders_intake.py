import json
import tempfile
import unittest
from pathlib import Path

from scripts.strikerapi_player_leaders_intake import LEAGUES, STAT_CATEGORIES, TARGET_SEASON, normalize


def fixture():
    return {
        league: {
            stat: {
                "season": 2026, "stage": "league",
                "leaders": [{
                    "rank": 1, "player_id": f"player-{league}",
                    "name": f"Example Player {league}", "position": "Forward",
                    "team": f"{league} FC", "games": 10, "minutes": 800,
                    "value": 7, "per90": 0.78,
                }]
            }
            for stat in STAT_CATEGORIES
        }
        for league in LEAGUES
    }


class StrikerApiPlayerLeadersIntakeTests(unittest.TestCase):
    def test_normalizes_all_five_leagues_for_2026_27(self):
        result = normalize(fixture(), collected_at="2026-11-13T00:00:00Z")
        self.assertEqual(result["status"], "staging_only")
        self.assertEqual(result["season"], TARGET_SEASON)
        self.assertEqual(result["provider_api_calls"], 0)
        self.assertEqual(result["estimated_credits"], 0)
        self.assertEqual(result["coverage"]["total_leader_rows"], 50)
        self.assertEqual(result["coverage"]["unique_provider_players"], 5)
        self.assertTrue(result["coverage"]["all_five_leagues_present"])
        self.assertEqual(len(result["players"]), 5)
        self.assertTrue(all(p["canonical_player_id"] is None for p in result["players"]))

    def test_merges_stat_categories_by_provider_player_and_league(self):
        data = fixture()
        data["PL"]["assists"]["leaders"][0]["player_id"] = "shared-player"
        data["PL"]["goals"]["leaders"][0]["player_id"] = "shared-player"
        result = normalize(data)
        player = next(p for p in result["players"] if p["provider_player_id"] == "shared-player")
        self.assertIn("goals", player["stats"]["PL"])
        self.assertIn("assists", player["stats"]["PL"])
        self.assertEqual(player["identity_review_status"], "pending_canonical_identity_review")

    def test_flags_conflicting_names_or_cross_league_identity(self):
        data = fixture()
        data["PD"]["goals"]["leaders"][0]["player_id"] = "shared-player"
        data["PL"]["goals"]["leaders"][0]["player_id"] = "shared-player"
        data["PD"]["goals"]["leaders"][0]["name"] = "Different Name"
        result = normalize(data)
        player = next(p for p in result["players"] if p["provider_player_id"] == "shared-player")
        self.assertEqual(player["identity_review_status"], "needs_manual_review")
        self.assertEqual(len(player["name_variants"]), 2)

    def test_rejects_missing_league_or_stat_category(self):
        data = fixture()
        data.pop("PL")
        with self.assertRaisesRegex(ValueError, "missing five-league"):
            normalize(data)
        data = fixture()
        data["PD"].pop("xg")
        with self.assertRaisesRegex(ValueError, "missing PD/xg"):
            normalize(data)

    def test_rejects_wrong_season(self):
        data = fixture()
        data["SA"]["goals"]["season"] = 2025
        with self.assertRaisesRegex(ValueError, "expected 2026/27"):
            normalize(data)

    def test_rejects_missing_player_identity(self):
        data = fixture()
        data["FL1"]["goals"]["leaders"][0]["player_id"] = ""
        with self.assertRaisesRegex(ValueError, "missing player_id or name"):
            normalize(data)

    def test_missing_stat_values_are_not_filled_with_zero(self):
        data = fixture()
        data["PL"]["goals"]["leaders"][0]["value"] = None
        result = normalize(data)
        player = next(p for p in result["players"] if p["provider_player_id"] == "player-PL")
        self.assertIsNone(player["stats"]["PL"]["goals"]["value"])

    def test_output_round_trips(self):
        result = normalize(fixture())
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "stage.json"
            path.write_text(json.dumps(result), encoding="utf-8")
            loaded = json.loads(path.read_text(encoding="utf-8"))
        self.assertFalse(loaded["production_import"])
        self.assertEqual(loaded["supabase_writes"], 0)
        self.assertEqual(loaded["season"], "2026/27")


if __name__ == "__main__":
    unittest.main()
