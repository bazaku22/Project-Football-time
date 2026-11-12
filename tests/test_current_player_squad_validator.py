import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "current-player-squads-2026-27.json"
VALIDATOR = ROOT / "scripts" / "validate_current_player_squads.py"


class CurrentPlayerSquadValidatorTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(DATA.read_text(encoding="utf-8"))

    def run_validator(self, payload):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "dataset.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(VALIDATOR), str(path)],
                capture_output=True, text=True, check=False,
            )

    def test_current_season_pilot_covers_all_five_leagues(self):
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), str(DATA)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(len(self.data["players"]), 25)
        self.assertEqual(
            {row["league_id"] for row in self.data["players"]},
            {"PL", "PD", "BL1", "SA", "FL1"},
        )
        self.assertFalse(self.data["production_import"])

    def test_official_sources_are_blocked_until_written_permission_or_verified_open_license(self):
        for source in self.data["sources"]:
            self.assertEqual(source["reuse_status"], "written_permission_required")
            self.assertTrue(source["terms_url"].startswith("https://"))
            self.assertEqual(source["terms_reviewed_at"], "2026-11-12")
            self.assertTrue(source["reuse_basis"])

    def test_rejects_source_marked_reusable_without_permission_review(self):
        payload = copy.deepcopy(self.data)
        payload["sources"][0]["reuse_status"] = "approved"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("blocked pending written permission", result.stderr)

    def test_open_data_source_assessment_preserves_roster_eligibility_gates(self):
        doc = (ROOT / "docs/player-open-data-source-assessment-2026-11.md").read_text()
        self.assertIn("Identity/crosswalk candidate only. Not a squad-membership feed.", doc)
        self.assertIn("Identity reference only. Not a current-club source.", doc)
        self.assertIn("written permission", doc.lower())
        self.assertIn("Do not scrape", doc)
        self.assertIn("Target recurring provider cost remains 0 THB/month.", doc)

    def test_rejects_prior_season_membership(self):
        payload = copy.deepcopy(self.data)
        payload["players"][0]["season"] = "2025/26"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("non-current season", result.stderr)

    def test_rejects_production_import_flag(self):
        payload = copy.deepcopy(self.data)
        payload["production_import"] = True
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("production_import must be false", result.stderr)

    def test_rejects_photo_without_rights_review(self):
        payload = copy.deepcopy(self.data)
        payload["players"][0]["photo"] = "https://example.invalid/player.jpg"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("photo without completed rights review", result.stderr)

    def test_rejects_unmapped_provider_id_or_statistics(self):
        payload = copy.deepcopy(self.data)
        payload["players"][0]["provider_ids"] = [{"provider": "x", "id": "1"}]
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("provider ids require exact mapping review", result.stderr)


if __name__ == "__main__":
    unittest.main()
