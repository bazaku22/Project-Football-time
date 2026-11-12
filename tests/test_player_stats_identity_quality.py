import csv
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "validate_player_stats_csv.py"
FIELDS = [
    "canonical_player_key", "provider", "provider_player_id", "player_name",
    "team_code", "season", "competition_code", "squad_level",
    "statistics_scope", "collected_at", "rights_status", "permission_reference",
]


def run_validator(row):
    with tempfile.TemporaryDirectory() as temp_dir:
        path = Path(temp_dir) / "stats.csv"
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDS)
            writer.writeheader()
            writer.writerow(row)
        return subprocess.run(
            [sys.executable, str(SCRIPT), str(path)],
            capture_output=True, text=True, check=False,
        )


class PlayerStatsIdentityQualityTests(unittest.TestCase):
    def valid_row(self):
        return {
            "canonical_player_key": "ft-player-001",
            "provider": "source-a",
            "provider_player_id": "player-001",
            "player_name": "Example Player",
            "team_code": "ARS",
            "season": "2026/27",
            "competition_code": "PL",
            "squad_level": "first_team",
            "statistics_scope": "season",
            "collected_at": "2026-11-11T12:00:00Z",
            "rights_status": "approved",
            "permission_reference": "reviewed-permission-record",
        }

    def test_exact_provider_identity_is_required_even_with_canonical_key(self):
        row = self.valid_row()
        row["provider_player_id"] = ""
        result = run_validator(row)
        self.assertEqual(result.returncode, 1)
        self.assertIn("provider_player_id is required", result.stdout)

    def test_name_only_identity_is_not_accepted(self):
        row = self.valid_row()
        row["provider_player_id"] = ""
        row["canonical_player_key"] = ""
        result = run_validator(row)
        self.assertEqual(result.returncode, 1)
        self.assertIn("provider_player_id is required", result.stdout)
        self.assertIn("canonical_player_key unresolved", result.stdout)

    def test_exact_provider_identity_passes_structural_gate(self):
        result = run_validator(self.valid_row())
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("VALIDATION PASSED", result.stdout)


if __name__ == "__main__":
    unittest.main()
