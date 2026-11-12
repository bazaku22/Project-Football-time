import copy
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_player_intake_manifest.py"
TEMPLATE = ROOT / "data" / "player-intake-manifest-2026-27.json"


def valid_manifest():
    return {
        "schemaVersion": 1, "season": "2026/27", "status": "research_only",
        "production_import": False, "provider_api_calls": 0, "records_count": 1,
        "sources": [{
            "id": "fixture-source", "publisher": "Test Publisher",
            "source_url": "https://example.test/roster",
            "source_scope": "2026/27 registered first-team squad",
            "licence_id": "CC0-1.0", "licence_url": "https://example.test/licence",
            "licence_reviewed_at": "2026-11-12", "rights_review_status": "approved",
            "commercial_use_allowed": True, "database_rights_reviewed": True,
            "redistribution_allowed": True, "attribution_required": False
        }],
        "memberships": [{
            "id": "research:PL:test-club:player-1", "player_name": "Test Player",
            "source_player_id": "source-player-1", "league_id": "PL",
            "club_id": "test-club", "club_name": "Test Club", "season": "2026/27",
            "squad_level": "first_team", "membership_type": "registered_squad",
            "membership_status": "current_verified", "source_id": "fixture-source",
            "evidence_url": "https://example.test/roster/player-1",
            "observed_at": "2026-11-12", "rights_status": "approved"
        }]
    }


class PlayerIntakeManifestTests(unittest.TestCase):
    def run_validator(self, payload):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "manifest.json"
            path.write_text(json.dumps(payload), encoding="utf-8")
            return subprocess.run([sys.executable, str(VALIDATOR), str(path)],
                                  capture_output=True, text=True, check=False)

    def test_empty_template_is_valid_but_not_importable(self):
        result = subprocess.run([sys.executable, str(VALIDATOR), str(TEMPLATE)],
                                capture_output=True, text=True, check=False)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        data = json.loads(TEMPLATE.read_text(encoding="utf-8"))
        self.assertEqual(data["memberships"], [])
        self.assertFalse(data["production_import"])

    def test_accepts_complete_rights_cleared_membership_fixture(self):
        result = self.run_validator(valid_manifest())
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_rejects_missing_commercial_or_database_rights(self):
        for field in ("commercial_use_allowed", "database_rights_reviewed", "redistribution_allowed"):
            payload = valid_manifest()
            payload["sources"][0][field] = False
            result = self.run_validator(payload)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn(field, result.stderr)

    def test_rejects_unreviewed_source(self):
        payload = valid_manifest()
        payload["sources"][0]["rights_review_status"] = "pending"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("rights review is not approved", result.stderr)

    def test_rejects_stale_season_and_unverified_membership(self):
        payload = valid_manifest()
        payload["memberships"][0]["season"] = "2025/26"
        payload["memberships"][0]["membership_status"] = "rumoured"
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("non-current season", result.stderr)
        self.assertIn("not current_verified", result.stderr)

    def test_rejects_duplicate_membership(self):
        payload = valid_manifest()
        duplicate = copy.deepcopy(payload["memberships"][0])
        duplicate["id"] = "research:PL:test-club:player-duplicate"
        payload["memberships"].append(duplicate)
        payload["records_count"] = 2
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("duplicate source player membership", result.stderr)

    def test_rejects_production_import_and_provider_calls(self):
        payload = valid_manifest()
        payload["production_import"] = True
        payload["provider_api_calls"] = 1
        result = self.run_validator(payload)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("production_import must be false", result.stderr)
        self.assertIn("provider_api_calls must equal 0", result.stderr)


if __name__ == "__main__":
    unittest.main()
