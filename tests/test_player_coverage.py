import json
import unittest
from pathlib import Path

from scripts.validate_player_coverage import validate

class PlayerCoverageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(Path("data/player-coverage-2026-27.json").read_text(encoding="utf-8"))

    def test_committed_register_is_valid(self):
        self.assertEqual(validate(self.data), [])

    def test_duplicate_club_id_is_rejected(self):
        data = json.loads(json.dumps(self.data))
        data["clubs"][1]["club_id"] = data["clubs"][0]["club_id"]
        self.assertTrue(any("duplicate club_id" in error for error in validate(data)))

    def test_roster_rights_cannot_be_promoted(self):
        data = json.loads(json.dumps(self.data))
        data["clubs"][0]["roster_source_reuse_status"] = "approved"
        self.assertTrue(any("must remain not_cleared" in error for error in validate(data)))

    def test_membership_cannot_be_claimed_complete(self):
        data = json.loads(json.dumps(self.data))
        data["clubs"][0]["membership_coverage_status"] = "complete"
        self.assertTrue(any("must remain not_assessed" in error for error in validate(data)))

    def test_production_import_is_blocked(self):
        data = json.loads(json.dumps(self.data))
        data["production_import"] = True
        self.assertIn("production_import must be false", validate(data))

    def test_provider_calls_are_blocked(self):
        data = json.loads(json.dumps(self.data))
        data["provider_api_calls"] = 1
        self.assertIn("provider_api_calls must equal 0", validate(data))

if __name__ == "__main__":
    unittest.main()
