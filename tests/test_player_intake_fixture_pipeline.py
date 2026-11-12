import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "player-intake"
RECONCILER = ROOT / "scripts" / "reconcile_player_identity.py"
PREVIEW = ROOT / "scripts" / "preview_player_stats_import.py"


class PlayerIntakeFixturePipelineTests(unittest.TestCase):
    def test_synthetic_identity_review_to_import_preview_pipeline(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            queue = output / "identity-queue.csv"
            summary = output / "identity-summary.json"
            reconciled = subprocess.run(
                [
                    sys.executable, str(RECONCILER),
                    str(FIXTURES / "provider-roster.csv"),
                    str(FIXTURES / "canonical-players.csv"),
                    str(FIXTURES / "player-id-mapping-reviewed.csv"),
                    "--out", str(queue), "--summary", str(summary),
                ],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(reconciled.returncode, 0, reconciled.stdout + reconciled.stderr)
            with queue.open(encoding="utf-8-sig", newline="") as handle:
                identity_rows = {row["provider_player_id"]: row for row in csv.DictReader(handle)}
            self.assertEqual(identity_rows["SYN-001"]["status"], "exact_verified_mapping")
            self.assertEqual(identity_rows["SYN-001"]["reviewer"], "fixture-reviewer")
            self.assertEqual(identity_rows["SYN-002"]["status"], "needs_identity_review")
            self.assertEqual(identity_rows["SYN-003"]["status"], "exact_verified_mapping")

            source = FIXTURES / "player-statistics.csv"
            mapping = FIXTURES / "player-id-mapping-reviewed.csv"
            source_before = source.read_bytes()
            mapping_before = mapping.read_bytes()
            preview_json = output / "preview.json"
            preview_csv = output / "preview.csv"
            previewed = subprocess.run(
                [
                    sys.executable, str(PREVIEW), str(source), str(mapping),
                    "--out", str(preview_json), "--csv-out", str(preview_csv),
                ],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(previewed.returncode, 0, previewed.stdout + previewed.stderr)
            manifest = json.loads(preview_json.read_text(encoding="utf-8"))
            self.assertTrue(manifest["preview_only"])
            self.assertEqual(manifest["rows_seen"], 3)
            statuses = {row["row"]["provider_player_id"]: row["status"] for row in manifest["rows"]}
            self.assertEqual(statuses["SYN-001"], "structurally_valid_pending_human_review")
            self.assertEqual(statuses["SYN-002"], "needs_identity_review")
            self.assertEqual(statuses["SYN-003"], "rejected_or_needs_review")
            self.assertTrue(preview_csv.exists())
            self.assertEqual(source.read_bytes(), source_before)
            self.assertEqual(mapping.read_bytes(), mapping_before)
            self.assertEqual(len(manifest["source_sha256"]), 64)
            self.assertEqual(len(manifest["mapping_sha256"]), 64)
            self.assertIn("No database writes", manifest["notice"])


if __name__ == "__main__":
    unittest.main()
