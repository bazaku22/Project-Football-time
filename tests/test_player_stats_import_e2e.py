import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / "scripts" / "validate_player_stats_csv.py"
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


class PlayerStatisticsImportE2ETests(unittest.TestCase):
    def test_validate_then_preview_exact_mapping_and_quarantine(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "statistics.csv"
            mapping = root / "player-mapping.csv"
            preview_json = root / "preview.json"
            preview_csv = root / "preview.csv"

            rows = []
            for provider_id, player_name, canonical_key, goals in [
                ("provider-player-001", "Mapped Example", "ft-player-001", "2"),
                ("provider-player-unknown", "Unmatched Example", "ft-player-unverified", ""),
            ]:
                row = {field: "" for field in FIELDS}
                row.update({
                    "canonical_player_key": canonical_key,
                    "provider": "fixture-provider",
                    "provider_player_id": provider_id,
                    "player_name": player_name,
                    "team_code": "ARS",
                    "season": "2026/27",
                    "competition_code": "PL",
                    "squad_level": "first_team",
                    "statistics_scope": "season",
                    "appearances": "5",
                    "goals": goals,
                    "collected_at": "2026-11-11T12:00:00Z",
                    "rights_status": "approved",
                    "permission_reference": "test-only-reviewed-reference",
                })
                rows.append(row)

            with source.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=FIELDS)
                writer.writeheader()
                writer.writerows(rows)

            with mapping.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=[
                    "provider", "provider_player_id", "canonical_player_key",
                    "player_name", "team_code", "season",
                ])
                writer.writeheader()
                writer.writerow({
                    "provider": "fixture-provider",
                    "provider_player_id": "provider-player-001",
                    "canonical_player_key": "ft-player-001",
                    "player_name": "Mapped Example",
                    "team_code": "ARS",
                    "season": "2026/27",
                })

            validation = subprocess.run(
                [sys.executable, str(VALIDATOR), str(source)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(validation.returncode, 0, validation.stdout + validation.stderr)
            self.assertIn("Rows passing all structural and rights-status checks: 2", validation.stdout)

            preview = subprocess.run(
                [sys.executable, str(PREVIEW), str(source), str(mapping),
                 "--out", str(preview_json), "--csv-out", str(preview_csv)],
                capture_output=True, text=True, check=False,
            )
            self.assertEqual(preview.returncode, 0, preview.stdout + preview.stderr)
            manifest = json.loads(preview_json.read_text(encoding="utf-8"))

            self.assertEqual(manifest["rows_seen"], 2)
            self.assertEqual(
                manifest["rows"][0]["status"],
                "structurally_valid_pending_human_review",
            )
            self.assertEqual(
                manifest["rows"][0]["identity_resolution"],
                "exact_provider_id_match",
            )
            self.assertEqual(manifest["rows"][0]["row"]["assists"], "")
            self.assertEqual(
                manifest["rows"][1]["status"],
                "needs_identity_review",
            )
            self.assertEqual(
                manifest["rows"][1]["identity_resolution"],
                "unverified_canonical_key",
            )
            self.assertTrue(preview_csv.exists())
            self.assertEqual(len(manifest["source_sha256"]), 64)
            self.assertEqual(len(manifest["mapping_sha256"]), 64)


if __name__ == "__main__":
    unittest.main()
