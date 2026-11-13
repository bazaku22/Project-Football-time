import unittest
from scripts.validate_player_statistics_intake import validate


def empty_manifest():
    return {
        "schemaVersion": 1, "season": "2026/27", "status": "draft",
        "production_import": False, "provider_api_calls": 0, "records_count": 0,
        "sources": [], "statistics": []
    }


class PlayerStatisticsIntakeTests(unittest.TestCase):
    def test_empty_starter_is_valid(self):
        self.assertEqual(validate(empty_manifest()), [])

    def test_rights_and_exact_identity_are_required(self):
        data = empty_manifest()
        data["status"] = "research_only"
        data["sources"] = [{
            "id": "source-a", "publisher": "Example", "source_scope": "PL 2026/27",
            "licence_id": "CC0-1.0", "source_url": "https://example.test/data",
            "licence_url": "https://example.test/licence", "licence_reviewed_at": "2026-11-13",
            "rights_review_status": "approved", "commercial_use_allowed": True,
            "database_rights_reviewed": True, "redistribution_allowed": True,
            "metric_definitions": {"appearances": "League appearances"}
        }]
        data["statistics"] = [{
            "id": "row-a", "season": "2026/27", "league_id": "PL",
            "canonical_player_key": "player:123", "provider_player_id": "123",
            "club_id": "club-a", "club_name": "Example FC", "competition_id": "PL",
            "identity_match_status": "exact", "rights_status": "approved",
            "source_id": "source-a", "observed_at": "2026-11-13",
            "evidence_url": "https://example.test/player/123/stats",
            "metrics": {"appearances": 3}
        }]
        data["records_count"] = 1
        self.assertEqual(validate(data), [])

        data["sources"][0]["commercial_use_allowed"] = False
        data["statistics"][0]["identity_match_status"] = "name_only"
        errors = validate(data)
        self.assertTrue(any("commercial_use_allowed" in e for e in errors))
        self.assertTrue(any("exact player identity" in e for e in errors))

    def test_invalid_metric_and_impossible_counts_are_rejected(self):
        data = empty_manifest()
        data["status"] = "research_only"
        data["sources"] = [{
            "id": "s", "publisher": "Example", "source_scope": "PL 2026/27",
            "licence_id": "CC0-1.0", "source_url": "https://example.test/data",
            "licence_url": "https://example.test/licence", "licence_reviewed_at": "2026-11-13",
            "rights_review_status": "approved", "commercial_use_allowed": True,
            "database_rights_reviewed": True, "redistribution_allowed": True,
            "metric_definitions": {"appearances": "Appearances", "starts": "Starts", "shots": "Shots", "shots_on_target": "Shots on target"}
        }]
        data["statistics"] = [{
            "id": "r", "season": "2026/27", "league_id": "PL",
            "canonical_player_key": "p", "provider_player_id": "p1",
            "club_id": "c", "club_name": "Club", "competition_id": "PL",
            "identity_match_status": "exact", "rights_status": "approved",
            "source_id": "s", "observed_at": "2026-11-13",
            "evidence_url": "https://example.test/player/p/stats",
            "metrics": {"appearances": 2, "starts": 3, "shots": 1, "shots_on_target": 2, "goals": -1}
        }]
        data["records_count"] = 1
        errors = validate(data)
        self.assertTrue(any("starts cannot exceed appearances" in e for e in errors))
        self.assertTrue(any("shots_on_target cannot exceed shots" in e for e in errors))
        self.assertTrue(any("non-negative" in e for e in errors))

    def test_provider_calls_and_production_import_are_blocked(self):
        data = empty_manifest()
        data["provider_api_calls"] = 1
        data["production_import"] = True
        errors = validate(data)
        self.assertTrue(any("provider_api_calls" in e for e in errors))
        self.assertTrue(any("production_import" in e for e in errors))


if __name__ == "__main__":
    unittest.main()
