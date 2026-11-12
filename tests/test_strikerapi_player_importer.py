import importlib.util
import os
import unittest
from pathlib import Path

os.environ.setdefault("STRIKERAPI_API_KEY", "test-key")
MODULE = Path(__file__).resolve().parents[1] / "scripts" / "update_player_database.py"
spec = importlib.util.spec_from_file_location("strikerapi_player_importer", MODULE)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


class StrikerApiPlayerImporterTests(unittest.TestCase):
    def test_selects_only_exact_season(self):
        seasons = [
            {"season": "2025/26", "team": "Arsenal", "goals": 12},
            {"season": "2024/25", "team": "Arsenal", "goals": 9},
        ]
        self.assertIsNone(importer.select_season_stats(seasons, "2026/27", "Arsenal"))
        self.assertEqual(
            importer.select_season_stats(seasons, "2025/26", "Arsenal")["goals"],
            12,
        )

    def test_rejects_season_row_for_a_different_team(self):
        seasons = [{"season": "2026/27", "team": "Chelsea", "goals": 4}]
        self.assertIsNone(importer.select_season_stats(seasons, "2026/27", "Arsenal"))

    def test_missing_metrics_preserve_previous_values_and_zero_is_valid(self):
        previous = {"goals": 8, "assists": 3, "xg": 4.2}
        merged = importer.merge_non_null_stats(
            previous, {"goals": 0, "assists": None, "xg": ""}
        )
        self.assertEqual(merged, {"goals": 0, "assists": 3, "xg": 4.2})

    def test_empty_season_list_does_not_select_any_other_season(self):
        self.assertIsNone(importer.select_season_stats([], "2026/27", None))

    def test_ambiguous_team_names_are_not_mapped(self):
        teams = [
            {"id": 1, "name": "United FC"},
            {"id": 2, "name": "United"},
        ]
        lookup = importer.build_team_lookup(teams)
        self.assertNotIn(importer.norm("United"), lookup)

    def test_unique_team_name_maps_to_catalogue_team(self):
        teams = [{"id": 57, "name": "Arsenal", "shortName": "Arsenal"}]
        lookup = importer.build_team_lookup(teams)
        self.assertEqual(lookup[importer.norm("Arsenal")]["id"], 57)


if __name__ == "__main__":
    unittest.main()
