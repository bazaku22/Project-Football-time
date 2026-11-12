import unittest
from scripts.player_reconciliation_pipeline import run


def fixtures():
    staging = {
        "season": "2026/27", "status": "staging_only", "production_import": False,
        "players": [
            {"provider": "strikerapi", "provider_player_id": "p1", "full_name": "Alex One",
             "league_id": "PL", "season": "2026/27", "provider_team_id": "st1",
             "provider_team_name": "Arsenal FC"},
            {"provider": "strikerapi", "provider_player_id": "p1", "full_name": "Alex One",
             "league_id": "PD", "season": "2026/27", "provider_team_id": "st2",
             "provider_team_name": "Barcelona"},
            {"provider": "strikerapi", "provider_player_id": "p2", "full_name": "Sam Two",
             "league_id": "PL", "season": "2026/27", "provider_team_id": "st1",
             "provider_team_name": "Arsenal FC"},
        ]
    }
    football_db = {
        "teams": [
            {"id": "ft-ars", "name": "Arsenal FC", "shortName": "Arsenal", "tla": "ARS"},
            {"id": "ft-bar", "name": "FC Barcelona", "shortName": "Barça", "tla": "FCB"},
            {"id": "ft-other", "name": "Arsenal FC", "shortName": "Arsenal"}
        ],
        "teamSeasons": [
            {"teamId": "ft-ars", "leagueId": "PL", "season": "2026-2027"},
            {"teamId": "ft-bar", "leagueId": "PD", "season": "2026-2027"},
            {"teamId": "ft-other", "leagueId": "PD", "season": "2026-2027"}
        ]
    }
    return staging, football_db


class PlayerReconciliationPipelineTests(unittest.TestCase):
    def test_generates_review_candidates_without_assigning_ids(self):
        staging, db = fixtures()
        result = run(staging, db)
        self.assertEqual(result["input_memberships"], 3)
        self.assertEqual(result["unique_provider_players"], 2)
        self.assertEqual(result["team_observations"], 2)
        self.assertEqual(result["canonical_player_ids_assigned"], 0)
        self.assertEqual(result["canonical_team_ids_assigned"], 0)
        self.assertEqual(result["supabase_writes"], 0)
        teams = result["_team_rows"]
        arsenal = next(row for row in teams if row["provider_team_name"] == "Arsenal FC")
        self.assertEqual(arsenal["candidate_team_ids"], "ft-ars")
        self.assertEqual(arsenal["status"], "exact_name_candidate_needs_review")
        barcelona = next(row for row in teams if row["provider_team_name"] == "Barcelona")
        self.assertEqual(barcelona["candidate_count"], 0)
        players = result["_player_rows"]
        repeated = next(row for row in players if row["provider_player_id"] == "p1")
        self.assertEqual(repeated["status"], "conflicting_identity_observations")
        self.assertEqual(repeated["membership_observations"], 2)

    def test_provider_tla_matches_only_same_league(self):
        staging, db = fixtures()
        staging["players"][0]["provider_team_name"] = "ARS"
        result = run(staging, db)
        arsenal = next(row for row in result["_team_rows"] if row["provider_team_name"] == "ARS")
        self.assertEqual(arsenal["candidate_team_ids"], "ft-ars")
        self.assertEqual(arsenal["status"], "exact_name_candidate_needs_review")

    def test_rejects_non_staging_input(self):
        staging, db = fixtures()
        staging["production_import"] = True
        with self.assertRaisesRegex(ValueError, "staging-only"):
            run(staging, db)

    def test_rejects_wrong_season(self):
        staging, db = fixtures()
        staging["season"] = "2025/26"
        with self.assertRaisesRegex(ValueError, "season"):
            run(staging, db)

    def test_exact_name_match_is_scoped_to_league_and_season(self):
        staging, db = fixtures()
        result = run(staging, db)
        arsenal = next(row for row in result["_team_rows"] if row["provider_team_name"] == "Arsenal FC")
        self.assertEqual(arsenal["candidate_count"], 1)
        self.assertEqual(arsenal["canonical_team_id"], "")


if __name__ == "__main__":
    unittest.main()
