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
    "statistics_scope", "match_id", "stat_date", "appearances", "starts",
    "minutes", "goals", "assists", "shots", "shots_on_target", "xg", "xa",
    "yellow_cards", "red_cards", "saves", "clean_sheets", "source_url",
    "source_record_id", "collected_at", "rights_status", "permission_reference",
    "notes",
]


def make_row(**overrides):
    row = {field: "" for field in FIELDS}
    row.update({
        "canonical_player_key": "ft-player-001",
        "provider": "manual_source_a",
        "player_name": "Example Player",
        "team_code": "ARS",
        "season": "2026/27",
        "competition_code": "PL",
        "squad_level": "first_team",
        "statistics_scope": "season",
        "collected_at": "2026-11-11T12:00:00Z",
        "rights_status": "approved",
        "permission_reference": "reviewed-permission-record",
    })
    row.update(overrides)
    return row


class CsvValidatorTests(unittest.TestCase):
    def run_csv(self, rows):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "input.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=FIELDS)
                writer.writeheader()
                writer.writerows(rows)
            return subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                capture_output=True, text=True, check=False,
            )

    def test_valid_row_with_blank_unknown_stats_passes(self):
        result = self.run_csv([make_row()])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Rows passing all structural and rights-status checks: 1", result.stdout)

    def test_unapproved_rights_and_invalid_timestamp_fail(self):
        result = self.run_csv([make_row(
            rights_status="manual_review",
            permission_reference="",
            collected_at="2026-11-11T12:00:00",
        )])
        self.assertEqual(result.returncode, 1)
        self.assertIn("not approved", result.stdout)
        self.assertIn("ISO 8601 with timezone", result.stdout)
        self.assertIn("Rows passing all structural and rights-status checks: 0", result.stdout)

    def test_different_providers_can_keep_independent_observations(self):
        result = self.run_csv([
            make_row(provider="source_a"),
            make_row(provider="source_b"),
        ])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_duplicate_from_same_provider_fails(self):
        result = self.run_csv([make_row(), make_row()])
        self.assertEqual(result.returncode, 1)
        self.assertIn("duplicate same-provider natural key", result.stdout)

    def test_nan_statistic_fails(self):
        result = self.run_csv([make_row(xg="NaN")])
        self.assertEqual(result.returncode, 1)
        self.assertIn("finite non-negative number", result.stdout)


if __name__ == "__main__":
    unittest.main()
