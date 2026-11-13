import copy
import unittest

from scripts.validate_player_match_event_ledger import derive_player_statistics, validate


def player(name, player_id):
    return {"observed_name": name, "identity_status": "verified" if player_id else "unresolved", "ft_player_id": player_id}


def valid_match():
    sources = [
        {"source_id": "official", "name": "Competition report", "url": "https://example.com/match",
         "source_type": "official_competition", "checked_at": "2026-11-13T12:00:00Z",
         "reuse_rights": "confirmed", "permission_basis": "Written permission"},
        {"source_id": "licensed", "name": "Licensed report", "url": "https://example.org/match",
         "source_type": "licensed_provider", "checked_at": "2026-11-13T12:01:00Z",
         "reuse_rights": "confirmed", "permission_basis": "Contract reference"}
    ]
    return {
        "match_id": 123, "competition_code": "PL", "season": "2026/27", "match_status": "FINISHED",
        "home_team": {"team_id": "ARS", "name": "Arsenal"}, "away_team": {"team_id": "CHE", "name": "Chelsea"},
        "lineup_coverage": "complete", "event_coverage": "complete", "review_status": "verified",
        "sources": sources,
        "lineups": [
            {"team_id": "ARS", "role": "starting_xi", "player": player("Starter", "FT-P-000001"), "source_ids": ["official"]},
            {"team_id": "ARS", "role": "substitute", "player": player("Bench only", "FT-P-000002"), "source_ids": ["official"]},
            {"team_id": "CHE", "role": "starting_xi", "player": player("Starter away", "FT-P-000004"), "source_ids": ["official"]},
            {"team_id": "CHE", "role": "substitute", "player": player("Sub in", "FT-P-000003"), "source_ids": ["official"]}
        ],
        "events": [
            {"event_id": "sub-1", "type": "substitution", "minute": "60", "team_id": "CHE",
             "player_on": player("Sub in", "FT-P-000003"), "player_off": player("Starter away", "FT-P-000004"), "source_ids": ["official"]},
            {"event_id": "goal-1", "type": "goal", "minute": "70", "team_id": "ARS", "goal_type": "penalty",
             "scorer": player("Starter", "FT-P-000001"), "assist_status": "none_confirmed", "assist_player": None, "source_ids": ["official"]},
            {"event_id": "goal-2", "type": "goal", "minute": "80+2", "team_id": "ARS", "goal_type": "own_goal",
             "scorer": None, "own_goal_player": player("Defender", "FT-P-000005"), "assist_status": "unknown",
             "assist_player": None, "source_ids": ["licensed"]}
        ]
    }


def dataset():
    return {
        "schema_version": "1.0.0", "dataset_id": "player-match-event-ledger-2026-27",
        "season": "2026/27", "dataset_status": "research_records_present",
        "scope": {"competitions": ["PL", "PD", "BL1", "SA", "FL1"]},
        "expected_finished_match_ids": [123], "records": [valid_match()]
    }


class PlayerMatchEventLedgerTests(unittest.TestCase):
    def test_valid_ledger_passes(self):
        self.assertEqual(validate(dataset()), {"records": 1, "events": 3})

    def test_starting_xi_and_substitute_on_count_as_appearances_but_bench_does_not(self):
        result = derive_player_statistics(dataset())
        players = {row["ft_player_id"]: row for row in result["players"]}
        self.assertEqual(players["FT-P-000001"]["appearances"], 1)
        self.assertEqual(players["FT-P-000002"]["appearances"], 0)
        self.assertEqual(players["FT-P-000003"]["appearances"], 1)
        self.assertEqual(players["FT-P-000004"]["appearances"], 1)

    def test_penalty_counts_as_goal_but_own_goal_does_not_credit_player(self):
        result = derive_player_statistics(dataset())
        players = {row["ft_player_id"]: row for row in result["players"]}
        self.assertEqual(players["FT-P-000001"]["goals"], 1)
        self.assertEqual(players["FT-P-000005"]["goals"], 0)

    def test_only_explicit_assist_is_counted(self):
        data = dataset()
        event = data["records"][0]["events"][1]
        event["assist_status"] = "explicit"
        event["assist_player"] = player("Assister", "FT-P-000006")
        result = derive_player_statistics(data)
        players = {row["ft_player_id"]: row for row in result["players"]}
        self.assertEqual(players["FT-P-000006"]["assists"], 1)

    def test_unresolved_identity_is_not_given_an_ft_id_or_merged_by_name(self):
        data = dataset()
        data["records"][0]["events"][1]["scorer"] = player("Unknown scorer", None)
        result = derive_player_statistics(data)
        self.assertNotIn("Unknown scorer", {p["display_name"] for p in result["players"]})

    def test_pending_rights_cannot_be_marked_verified(self):
        data = dataset()
        data["records"][0]["sources"][1]["reuse_rights"] = "pending"
        with self.assertRaisesRegex(ValueError, "confirmed reuse rights"):
            validate(data)

    def test_partial_lineups_or_events_cannot_be_marked_verified(self):
        data = dataset()
        data["records"][0]["lineup_coverage"] = "partial"
        with self.assertRaisesRegex(ValueError, "complete lineup and event coverage"):
            validate(data)

    def test_duplicate_match_is_rejected(self):
        data = dataset()
        data["records"].append(copy.deepcopy(data["records"][0]))
        with self.assertRaisesRegex(ValueError, "match_id is empty or duplicated"):
            validate(data)

    def test_incomplete_expected_match_coverage_is_reported_as_lower_bound(self):
        data = dataset()
        data["expected_finished_match_ids"] = [123, 124]
        result = derive_player_statistics(data)
        self.assertTrue(result["totals_are_lower_bounds"])
        self.assertEqual(result["coverage"]["missing_match_ids"], ["124"])


if __name__ == "__main__":
    unittest.main()
