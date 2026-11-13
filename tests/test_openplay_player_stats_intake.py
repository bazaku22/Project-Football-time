import unittest

from scripts.openplay_player_stats_intake import transform_records


class OpenPlayPlayerStatsIntakeTests(unittest.TestCase):
    def test_normalizes_match_stats_and_quarantines_known_issue_matches(self):
        rows = [
            {
                "comp": "eng", "season": "2526", "match_id": 10, "date": "2025-08-15",
                "team_id": 1, "team": "Example FC", "player_id": 99, "player": "Player One",
                "is_starter": True, "played": True, "minutes_played": 95,
                "goals": 1, "assists": 0, "shots": 3, "shots_on_target": 2,
                "xg": 0.75, "xa": 0.1, "yellow_cards": 1, "second_yellows": 0,
                "red_cards": 0, "saves": 0,
            },
            {
                "comp": "eng", "season": "2526", "match_id": 11, "date": "2025-08-22",
                "team_id": 1, "team": "Example FC", "player_id": 99, "player": "Player One",
                "is_starter": False, "played": True, "minutes_played": 20,
                "goals": 0, "assists": 1, "shots": 1, "shots_on_target": 1,
                "xg": 0.2, "xa": 0.3, "yellow_cards": 0, "second_yellows": 1,
                "red_cards": 0, "saves": 0,
            },
            {
                "comp": "esp", "season": "2526", "match_id": 12, "date": "2025-08-23",
                "team_id": 2, "team": "Other FC", "player_id": 99, "player": "Player One",
                "is_starter": True, "played": True, "minutes_played": 90,
                "goals": 2, "assists": 0, "shots": 4, "shots_on_target": 3,
                "xg": 1.1, "xa": 0.0, "yellow_cards": 0, "second_yellows": 0,
                "red_cards": 0, "saves": 0,
            },
            {
                "comp": "eng", "season": "2425", "match_id": 13, "date": "2025-01-01",
                "team_id": 1, "team": "Example FC", "player_id": 99, "player": "Player One",
            },
        ]
        match_rows, season_rows, metadata = transform_records(rows, {"11"}, "2025/26")
        self.assertEqual(len(match_rows), 3)
        self.assertEqual(match_rows[1]["data_quality_status"], "known_issue_quarantined")
        self.assertEqual(len(season_rows), 2)  # one row per player/team/competition
        eng = next(x for x in season_rows if x["competition_code"] == "eng")
        self.assertEqual(eng["appearances"], 1)
        self.assertEqual(eng["minutes"], 95)
        self.assertEqual(eng["yellow_cards"], 1)
        self.assertEqual(eng["red_cards"], 0)
        self.assertEqual(eng["goals"], 1)
        self.assertEqual(metadata["report"]["known_issue_quarantined_match_rows"], 1)
        self.assertEqual(metadata["report"]["canonical_player_ids_assigned"], 0)

    def test_second_yellow_counts_as_yellow_and_dismissal(self):
        rows = [{
            "comp": "fra", "season": "2526", "match_id": 1, "date": "2025-09-01",
            "team_id": 3, "team": "Club", "player_id": 7, "player": "P",
            "is_starter": False, "played": True, "minutes_played": 30,
            "second_yellows": 1, "yellow_cards": 0, "red_cards": 0,
        }]
        matches, seasons, _ = transform_records(rows, set(), "2025/26")
        self.assertEqual(matches[0]["yellow_cards"], 1)
        self.assertEqual(matches[0]["red_cards"], 1)
        self.assertEqual(seasons[0]["appearances"], 1)

    def test_never_maps_by_name_and_preserves_distinct_source_ids(self):
        rows = []
        for player_id in (100, 101):
            rows.append({
                "comp": "ita", "season": "2526", "match_id": player_id,
                "team_id": 4, "team": "Club", "player_id": player_id, "player": "Same Name",
                "played": True, "is_starter": True, "minutes_played": 90,
            })
        _, seasons, metadata = transform_records(rows, set(), "2025/26")
        self.assertEqual({x["source_player_id"] for x in seasons}, {"100", "101"})
        self.assertEqual(len(metadata["players"]), 2)
        self.assertTrue(all(not x["canonical_player_key"] for x in metadata["players"]))

    def test_ignores_other_competitions_and_seasons(self):
        rows = [{
            "comp": "ucl", "season": "2526", "match_id": 1, "team_id": 1,
            "team": "Club", "player_id": 1, "player": "P", "played": True,
        }, {
            "comp": "eng", "season": "2425", "match_id": 2, "team_id": 1,
            "team": "Club", "player_id": 2, "player": "Q", "played": True,
        }]
        matches, seasons, _ = transform_records(rows, set(), "2025/26")
        self.assertEqual(matches, [])
        self.assertEqual(seasons, [])


if __name__ == "__main__":
    unittest.main()
