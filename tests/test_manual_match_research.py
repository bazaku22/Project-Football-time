import copy
import json
import unittest
from pathlib import Path

from scripts.validate_manual_match_research import validate

ROOT = Path(__file__).resolve().parents[1]
BASE = json.loads((ROOT / "data/manual-match-research-2026-27.json").read_text(encoding="utf-8"))


def valid_record():
    return {
        "record_id": "research-PL-123",
        "competition_code": "PL",
        "season": "2026/27",
        "fixture_ref": {"provider_match_id": 123, "home_team": "Arsenal", "away_team": "Chelsea"},
        "match_status": "FINISHED",
        "score": {"home": 2, "away": 1},
        "verification_status": "verified",
        "events": [{
            "event_id": "goal-1", "type": "goal", "minute": 27, "team": "Arsenal",
            "player": {"name": "Example Player"}, "source_urls": ["https://example.com/match", "https://example.org/report"]
        }],
        "ratings": [{
            "player": {"name": "Example Player"}, "provider": "Example Ratings", "value": 7.8,
            "scale_min": 0, "scale_max": 10, "source_url": "https://example.com/match",
            "checked_at": "2026-11-13T12:00:00Z", "reuse_rights": "confirmed"
        }],
        "sources": [
            {"name": "Competition", "url": "https://example.com/match", "source_type": "competition_organiser",
             "checked_at": "2026-11-13T12:00:00Z", "reuse_rights": "confirmed", "permission_basis": "Written permission"},
            {"name": "Federation", "url": "https://example.org/report", "source_type": "federation",
             "checked_at": "2026-11-13T12:01:00Z", "reuse_rights": "confirmed", "permission_basis": "Written permission"}
        ]
    }


class ManualMatchResearchTests(unittest.TestCase):
    def test_empty_starter_dataset_is_valid_and_has_no_data_claims(self):
        result = validate(copy.deepcopy(BASE))
        self.assertEqual(result["records"], 0)
        self.assertEqual(BASE["dataset_status"], "research_intake_empty")

    def test_valid_club_record_supports_events_and_provider_specific_ratings(self):
        data = copy.deepcopy(BASE)
        data["records"] = [valid_record()]
        data["dataset_status"] = "research_records_present"
        result = validate(data)
        self.assertEqual(result["records"], 1)

    def test_nations_league_uses_existing_international_fixture_id(self):
        data = copy.deepcopy(BASE)
        row = valid_record()
        row["record_id"] = "research-UNL-001"
        row["competition_code"] = "UNL"
        row["fixture_ref"] = {"international_fixture_id": "INT-R1-001", "home_team": "Türkiye", "away_team": "Belgium"}
        data["records"] = [row]
        data["dataset_status"] = "research_records_present"
        self.assertEqual(validate(data)["fixtures"], 1)

    def test_verified_record_requires_two_sources_and_authoritative_source(self):
        data = copy.deepcopy(BASE)
        row = valid_record()
        row["sources"] = row["sources"][:1]
        row["events"][0]["source_urls"] = ["https://example.com/match"]
        row["ratings"] = []
        data["records"] = [row]
        data["dataset_status"] = "research_records_present"
        with self.assertRaisesRegex(ValueError, "two direct sources"):
            validate(data)

    def test_unconfirmed_rights_cannot_be_marked_verified(self):
        data = copy.deepcopy(BASE)
        row = valid_record()
        row["sources"][1]["reuse_rights"] = "pending"
        data["records"] = [row]
        data["dataset_status"] = "research_records_present"
        with self.assertRaisesRegex(ValueError, "confirmed reuse rights"):
            validate(data)

    def test_google_search_reference_is_not_authoritative_by_itself(self):
        data = copy.deepcopy(BASE)
        row = valid_record()
        row["sources"] = [
            {"name": "Google Search", "url": "https://google.com/search?q=football", "source_type": "search_reference",
             "checked_at": "2026-11-13T12:00:00Z", "reuse_rights": "confirmed"},
            {"name": "Aggregator", "url": "https://example.org/report", "source_type": "aggregator",
             "checked_at": "2026-11-13T12:01:00Z", "reuse_rights": "confirmed"}
        ]
        row["events"][0]["source_urls"] = ["https://google.com/search?q=football", "https://example.org/report"]
        row["ratings"] = []
        data["records"] = [row]
        data["dataset_status"] = "research_records_present"
        with self.assertRaisesRegex(ValueError, "organiser, federation, or licensed provider"):
            validate(data)

    def test_friendlies_and_other_competitions_are_rejected(self):
        data = copy.deepcopy(BASE)
        row = valid_record()
        row["competition_code"] = "FRIENDLY"
        data["records"] = [row]
        data["dataset_status"] = "research_records_present"
        with self.assertRaisesRegex(ValueError, "out of scope"):
            validate(data)

    def test_duplicate_fixture_record_is_rejected(self):
        data = copy.deepcopy(BASE)
        first = valid_record()
        second = valid_record()
        second["record_id"] = "research-PL-124"
        data["records"] = [first, second]
        data["dataset_status"] = "research_records_present"
        with self.assertRaisesRegex(ValueError, "duplicate fixture"):
            validate(data)

    def test_rating_scale_is_validated_and_provider_is_preserved(self):
        data = copy.deepcopy(BASE)
        row = valid_record()
        row["ratings"][0]["value"] = 11
        data["records"] = [row]
        data["dataset_status"] = "research_records_present"
        with self.assertRaisesRegex(ValueError, "provider-specific scale"):
            validate(data)


if __name__ == "__main__":
    unittest.main()
