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


    def test_match_scope_requires_valid_match_identity_and_date(self):
        result = self.run_csv([make_row(
            statistics_scope="match", match_id="", stat_date="2026-02-30",
        )])
        self.assertEqual(result.returncode, 1)
        self.assertIn("match_id is required", result.stdout)
        self.assertIn("not a valid calendar date", result.stdout)

    def test_non_match_scope_rejects_match_only_fields(self):
        result = self.run_csv([make_row(match_id="match-001", stat_date="2026-11-11")])
        self.assertEqual(result.returncode, 1)
        self.assertIn("must be blank unless scope=match", result.stdout)

    def test_statistical_relationships_and_integer_counts_are_enforced(self):
        result = self.run_csv([make_row(
            appearances="2", starts="3", shots="4",
            shots_on_target="5", minutes="90.5",
        )])
        self.assertEqual(result.returncode, 1)
        self.assertIn("starts cannot exceed appearances", result.stdout)
        self.assertIn("shots_on_target cannot exceed shots", result.stdout)
        self.assertIn("minutes must be a finite non-negative integer", result.stdout)

    def test_negative_and_infinite_metrics_fail(self):
        result = self.run_csv([make_row(goals="-1", xg="inf")])
        self.assertEqual(result.returncode, 1)
        self.assertIn("goals must be a finite non-negative integer", result.stdout)
        self.assertIn("xg must be a finite non-negative number", result.stdout)

    def test_extra_csv_values_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "extra.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=FIELDS)
                writer.writeheader()
                writer.writerow(make_row())
                handle.flush()
                content = path.read_text(encoding="utf-8").splitlines()
                content[-1] += ",unexpected-extra-cell"
                path.write_text("\n".join(content) + "\n", encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                capture_output=True, text=True, check=False,
            )
        self.assertEqual(result.returncode, 1)
        self.assertIn("more values than the header", result.stdout)

    def test_header_only_csv_is_not_ready(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "empty.csv"
            with path.open("w", newline="", encoding="utf-8") as handle:
                csv.writer(handle).writerow(FIELDS)
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(path)],
                capture_output=True, text=True, check=False,
            )
        self.assertEqual(result.returncode, 1)
        self.assertIn("no data rows", result.stdout)


if __name__ == "__main__":
    unittest.main()
