import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "scripts" / "preview_player_stats_import.py"
FIELDS = [
    "canonical_player_key", "provider", "provider_player_id", "player_name",
    "team_code", "season", "competition_code", "squad_level",
    "statistics_scope", "match_id", "stat_date", "appearances", "starts",
    "minutes", "goals", "assists", "shots", "shots_on_target", "xg", "xa",
    "yellow_cards", "red_cards", "saves", "clean_sheets", "source_url",
    "source_record_id", "collected_at", "rights_status", "permission_reference",
    "notes",
]


def stat_row(**overrides):
    row = {key: "" for key in FIELDS}
    row.update({
        "provider": "source_a", "provider_player_id": "p-100",
        "player_name": "Alex Example", "team_code": "ARS",
        "season": "2026/27", "competition_code": "PL",
        "squad_level": "first_team", "statistics_scope": "season",
        "collected_at": "2026-11-11T12:00:00Z",
        "rights_status": "approved", "permission_reference": "permission-record-1",
        "appearances": "4", "goals": "2",
    })
    row.update(overrides)
    return row


class PreviewTests(unittest.TestCase):
    def run_preview(self, source_rows, mapping_rows, source_extra_values=False, empty_source=False):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source, mapping = root / "stats.csv", root / "mapping.csv"
            output, csv_output = root / "preview.json", root / "preview.csv"
            with source.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=FIELDS)
                writer.writeheader()
                if not empty_source:
                    writer.writerows(source_rows)
            if source_extra_values and source_rows:
                content = source.read_text(encoding="utf-8").splitlines()
                content[-1] += ",EXTRA"
                source.write_text("\n".join(content) + "\n", encoding="utf-8")
            with mapping.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=[
                    "provider", "provider_player_id", "canonical_player_key",
                    "player_name", "team_code", "season",
                ])
                writer.writeheader()
                writer.writerows(mapping_rows)
            result = subprocess.run(
                [sys.executable, str(PREVIEW), str(source), str(mapping),
                 "--out", str(output), "--csv-out", str(csv_output)],
                capture_output=True, text=True, check=False,
            )
            manifest = json.loads(output.read_text(encoding="utf-8")) if output.exists() else None
            return result, manifest

    def test_exact_provider_id_mapping_resolves_identity(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["canonical_player_key"], "ft-ars-001")
        self.assertEqual(manifest["rows"][0]["status"], "structurally_valid_pending_human_review")

    def test_unmatched_identity_is_quarantined(self):
        result, manifest = self.run_preview([stat_row(canonical_player_key="")], [])
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "needs_identity_review")

    def test_name_does_not_auto_match(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="", provider_player_id="unknown")],
            [{"provider": "source_a", "provider_player_id": "different",
              "canonical_player_key": "ft-ars-001", "player_name": "Alex Example"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "needs_identity_review")


    def test_mapping_with_different_team_is_rejected_for_review(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001", "team_code": "CHE",
              "season": "2026/27"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "rejected_or_needs_review")
        self.assertTrue(any("team_code" in issue for issue in manifest["rows"][0]["issues"]))


    def test_source_canonical_key_without_provider_mapping_is_unverified(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="ft-ars-001")], [],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["identity_resolution"], "unverified_canonical_key")
        self.assertEqual(manifest["rows"][0]["status"], "needs_identity_review")

    def test_duplicate_mapping_key_fails_closed(self):
        duplicate = [
            {"provider": "source_a", "provider_player_id": "p-100", "canonical_player_key": "a"},
            {"provider": "source_a", "provider_player_id": "p-100", "canonical_player_key": "b"},
        ]
        result, manifest = self.run_preview([stat_row(canonical_player_key="")], duplicate)
        self.assertEqual(result.returncode, 2)
        self.assertIsNone(manifest)


    def test_provider_matching_is_case_insensitive_but_id_is_exact(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="")],
            [{"provider": "SOURCE_A", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["identity_resolution"], "exact_provider_id_match")

    def test_conflicting_source_canonical_key_is_quarantined(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="ft-other-player")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "rejected_or_needs_review")
        self.assertTrue(any("conflicts" in issue for issue in manifest["rows"][0]["issues"]))

    def test_mapping_season_mismatch_is_quarantined(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001", "season": "2025/26"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "rejected_or_needs_review")
        self.assertTrue(any("season" in issue for issue in manifest["rows"][0]["issues"]))

    def test_manual_review_rights_status_is_quarantined(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="", rights_status="manual_review")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "rejected_or_needs_review")
        self.assertTrue(any("not approved" in issue for issue in manifest["rows"][0]["issues"]))

    def test_invalid_metric_is_quarantined(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="", goals="-2")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001"}],
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "rejected_or_needs_review")
        self.assertTrue(any("goals must be" in issue for issue in manifest["rows"][0]["issues"]))

    def test_extra_source_values_are_quarantined_not_dropped(self):
        result, manifest = self.run_preview(
            [stat_row(canonical_player_key="")],
            [{"provider": "source_a", "provider_player_id": "p-100",
              "canonical_player_key": "ft-ars-001"}],
            source_extra_values=True,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(manifest["rows"][0]["status"], "rejected_or_needs_review")
        self.assertTrue(any("more values than the header" in issue for issue in manifest["rows"][0]["issues"]))

    def test_empty_source_csv_fails_closed(self):
        result, manifest = self.run_preview([], [], empty_source=True)
        self.assertEqual(result.returncode, 2)
        self.assertIsNone(manifest)
        self.assertIn("no data rows", result.stderr)


if __name__ == "__main__":
    unittest.main()
