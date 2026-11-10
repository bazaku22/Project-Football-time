import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

os.environ.setdefault("API_NINJAS_API_KEY", "test-key")
MODULE = Path(__file__).resolve().parents[1] / "scripts" / "update_player_database_api_ninjas.py"
spec = importlib.util.spec_from_file_location("player_importer", MODULE)
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)

class ImporterTests(unittest.TestCase):
    def test_five_league_snapshot_and_null_stats(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            importer.PDB = root / "player-database.json"
            importer.FDB = root / "football-database.json"
            importer.FDB.write_text(json.dumps({"teams": []}), encoding="utf-8")
            calls = []
            def fake_page(league, offset):
                calls.append((league, offset))
                return [{
                    "player_id": "player-" + league, "name": "Example Player " + league,
                    "league": league, "team": {"team_id": "team-" + league, "name": "Example FC"},
                    "position": "M", "jersey_number": "8", "height_cm": 180, "weight_kg": 75,
                    "birth_date": "2000-01-01", "nationality": "Example", "roster_status": "active"
                }]
            with patch.object(importer, "get_page", side_effect=fake_page):
                importer.main()
            data = json.loads(importer.PDB.read_text(encoding="utf-8"))
            self.assertEqual(len(calls), 5)
            self.assertEqual(len(data["records"]), 5)
            self.assertEqual(data["source"]["provider"], "API Ninjas")
            self.assertTrue(all(r["statistics"]["goals"] is None for r in data["records"]))
            self.assertTrue(all(r["profileStatus"] == "current_roster" for r in data["records"]))

    def test_failed_source_does_not_overwrite_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            importer.PDB = root / "player-database.json"
            importer.FDB = root / "football-database.json"
            importer.FDB.write_text(json.dumps({"teams": []}), encoding="utf-8")
            original = json.dumps({"schemaVersion": 1, "records": [{"id": "keep"}]})
            importer.PDB.write_text(original, encoding="utf-8")
            with patch.object(importer, "get_page", side_effect=RuntimeError("provider unavailable")):
                with self.assertRaises(RuntimeError):
                    importer.main()
            self.assertEqual(importer.PDB.read_text(encoding="utf-8"), original)

if __name__ == "__main__":
    unittest.main()
