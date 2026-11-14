import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "footballsquads-roster-intake-2026-27.json"
VALIDATOR = ROOT / "scripts" / "validate_footballsquads_roster_intake.py"


class FootballSquadsRosterIntakeValidatorTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(DATA.read_text(encoding="utf-8"))

    def run_validator(self, payload):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "roster.json"
            path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(VALIDATOR), str(path)],
                capture_output=True, text=True, check=False,
            )

    def test_partial_manual_intake_is_valid_but_not_complete(self):
        result = subprocess.run(
            [sys.executable, str(VALIDATOR), str(DATA)],
            capture_output=True, text=True, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.data["club_pages_reviewed"], len(self.data["sources"]))
        self.assertEqual(self.data["roster_memberships_count"], len(self.data["memberships"]))
        self.assertLessEqual(self.data["club_pages_reviewed"], 96)
        self.assertEqual(self.data["status"], "partial_research_only")
        self.assertFalse(self.data["production_import"])

    def test_rejects_complete_status_before_all_96_club_pages(self):
        payload = copy.deepcopy(self.data)
        payload["status"] = "complete_research_only"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("complete status requires all 96 club pages", result.stderr)

    def test_rejects_production_import(self):
        payload = copy.deepcopy(self.data)
        payload["production_import"] = True
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("production_import must be false", result.stderr)

    def test_rejects_provider_ids_and_unverified_statistics(self):
        payload = copy.deepcopy(self.data)
        payload["memberships"][0]["provider_ids"] = [{"provider": "unknown", "id": "1"}]
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must not invent provider IDs", result.stderr)

        payload = copy.deepcopy(self.data)
        payload["memberships"][0]["statistics"] = {"goals": 1}
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("statistics must remain empty", result.stderr)

    def test_rejects_automated_source_extraction(self):
        payload = copy.deepcopy(self.data)
        payload["sources"][0]["automated_extraction"] = True
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must not use automated extraction", result.stderr)

    def test_rejects_duplicate_membership(self):
        payload = copy.deepcopy(self.data)
        payload["memberships"].append(copy.deepcopy(payload["memberships"][0]))
        payload["roster_memberships_count"] += 1
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("membership id missing or duplicated", result.stderr)


if __name__ == "__main__":
    unittest.main()
